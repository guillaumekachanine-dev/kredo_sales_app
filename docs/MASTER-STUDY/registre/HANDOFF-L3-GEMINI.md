# Handoff L3 — ingestion réelle du pilote (pour Gemini)

**Tâche** : exécuter, pour la première fois, une écriture réelle (`--live`) de la RPC
`public.ingest_master_study_e4` contre le segment pilote `seg-parfumerie-compositions-b2b`, puis
vérifier le résultat en base et à l'écran. **Ce lot n'écrit aucun code de fond** — l'importeur
(`scripts/ingest-master-study.mts`, `src/features/master-study/`) a été livré et testé en L2, la
RPC est en base et vérifiée en `public` (pas `private`) depuis le correctif L2. Ce que ce lot
ajoute : deux corrections cosmétiques (§3), l'exécution elle-même (§5), et la preuve vérifiée que
ça a marché (§6).

**Ce lot ne fait PAS** : rebrancher BI ou le Cockpit sur le contenu ingéré (c'est L4/L5, plus
tard), matérialiser les 3 items réglementaires macro (hors périmètre, voir §2.3), réimporter les
`competitive_map_entries` existantes (optionnel, décision explicite requise, voir §6.3), corriger
le faux positif du script d'audit sur les sources IFRA (hors périmètre, à traiter séparément dans
`scripts/audit-master-study.py`).

**Avant de commencer, lire dans l'ordre** :
1. Ce fichier, en entier.
2. `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §3 et §4 — ce que L1/L2 ont livré et
   l'historique complet de la suspension puis de la reprise du 2026-08-20.
3. `docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/07-verdict.json` — le verdict
   G3 rendu par Guillaume, avec ses réserves. Il sera automatiquement embarqué dans
   `ai_intelligence_runs.input_snapshot` par le script (`ingest-master-study.mts` le lit déjà,
   ligne 46-54) — ne pas le dupliquer ailleurs.
4. `docs/MASTER-STUDY/registre/README.md` — la ligne de journal de ce run.
5. `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md` §7.3 (règles
   d'écriture de l'importeur) et §11 (plan de lots, ligne L3).

---

## 0. Le gate humain — non négociable, à vérifier avant `--live`

`07-verdict.json` documente que **le G3 complet (`10-ETAPE-E7…` §5 — confrontation compte
étalon, lecture à voix haute du message sectoriel, répétition de l'appel du compte n°1) n'a pas
été fait**. Seuls deux points de jugement plus étroits ont été tranchés (source IFRA, portée
macro) — ce n'est pas la recette métier complète.

**Avant de lancer `--live`, demander explicitement à Guillaume l'une des deux choses** :
- qu'il confirme avoir fait cette recette (5 minutes, §5 de `10-ETAPE-E7…`) et que le verdict
  tient, ou
- qu'il assume explicitement de lancer `--live` sans elle, en connaissance de cause.

**Ne pas lancer `--live` sur la seule base de ce prompt.** Un prompt écrit à l'avance n'est pas
une autorisation permanente — c'est le principe même qui a fait suspendre ce lot une première
fois le 2026-08-20 avant d'être repris avec un arbitrage explicite.

---

## 1. Pré-requis — déjà vérifiés en base le 2026-08-20, ne pas les re-découvrir

Vérifié par requête SQL directe contre le projet `jvzgmhvwirsbdkjpmvla`, pas par lecture de
rapport :

| Vérification | Résultat |
|---|---|
| Migrations `20260820200000/1/2` appliquées | Les 3 présentes dans `schema_migrations` |
| `ingest_master_study_e4` en schéma `public` (pas `private`) | Confirmé — le correctif L2 a tenu |
| `value_chain_nodes_maillon_check` | `CHECK (maillon >= 1)` — plafond à 5 bien retiré |
| `vcn_capture_si_chaine` | Absente (`DROP` appliqué) ; `vcn_capture_justifiee` présente (conservée) |
| Segment pilote (`db34f8a0-9d9e-4585-acd6-2fbbdd1baad6`) | `source_run_id IS NULL`, `resolution_locks = {}` — rien ingéré |
| `ai_intelligence_runs` avec `run_type='master_study'` | 0 ligne |
| `sector_intelligence` avec `source_run_id IS NOT NULL` | 0 ligne |
| `competitive_map_entries` sur les 8 comptes du segment | 8 lignes existantes, toutes `source_document_id IS NULL` et `source_run_id IS NULL` — orphelines, non rattachées (§6.3) |
| `npm run typecheck` | Vert |

**Ne pas relancer ces vérifications avant de commencer — elles datent d'il y a quelques heures au
plus.** Les revérifier seulement si vous suspectez qu'elles ont changé (ex : un autre agent a
touché la base entre-temps).

---

## 2. Ce que le run pilote porte comme réserves — à connaître avant d'ingérer

Toutes détaillées et sourcées dans `07-verdict.json`. Résumé :

### 2.1 E3 (sources) — traçabilité de collecte incomplète

`03-journal.md` n'existe pas, `03-sources.json > compteurs.requetes = 0`. Les 29 sources restent
valides et sourcées (URL, packs, éditeur — tous PASS). Ce qui manque, c'est la preuve que la
recherche a été rejouée avec un journal tenu. **Accepté tel quel** — ne rien fabriquer, ne rien
corriger dans le JSON avant `--live`.

### 2.2 Échéance pivot IFRA — source retenue comme officielle par arbitrage G3

`echeance_pivot` (notification amendement 52, 2026-11-30, `ifrafragrance.org`) sera ingérée telle
quelle. Le script d'audit la signale « non officielle » (il n'accepte que `.gouv.*`/`.europa.eu`)
— **faux positif accepté par Guillaume le 2026-08-20**, IFRA faisant autorité de fait dans la
filière. Ne pas retoucher cette valeur.

### 2.3 3 items réglementaires macro — hors périmètre de cette ingestion, par construction

`04-secteur.json > regulation[]` porte 3 items à `portee: "macro"` (IFRA 52e amendement, IFRA
régime permanent, REACH), confirmés transversaux le 14/08 et reconfirmés le 20/08.
`mapE4ToCanon()` les filtre déjà et les trace dans `meta.ignoredMacroRegulations` (§4.2 du prompt
L2, code déjà livré, ne pas y toucher). **Le `--dry-run` doit les lister dans sa sortie** — c'est
le signal que le filtrage fonctionne, pas une anomalie à corriger.

### 2.4 `revalides_le` — daté du 14/08, non revalidé au jour de ce run

Si `--live` est lancé un autre jour que le 2026-08-14, `revalides_le` restera visiblement périmé
dans `02-socle.json`. Ce champ **n'est pas lu par la RPC d'ingestion E4** (il concerne le socle
d'identité E2, hors périmètre de `ingest_master_study_e4`) — sans effet sur ce lot, mentionné ici
pour mémoire seulement.

---

## 3. Deux corrections cosmétiques — à faire en passant, zéro risque

Le code fonctionne déjà correctement (`supabase.rpc()` ne porte pas de préfixe de schéma, donc
l'appel réel n'a jamais été affecté), mais deux commentaires/logs mentent encore sur le schéma
réel de la fonction :

1. `src/features/master-study/data/ingest-master-study.ts` ligne 17 : le commentaire dit
   `` `private.ingest_master_study_e4` `` → corriger en `` `public.ingest_master_study_e4` ``.
2. `scripts/ingest-master-study.mts` ligne 165 : le log dit
   `"Appel de la RPC private.ingest_master_study_e4..."` → corriger en `public.ingest_master_study_e4`.

Optionnel mais cohérent : le bandeau du script (ligne 58, `"KREDO — Ingestion Master Study E4
(ADR-0021 L2)"`) peut devenir `(ADR-0021 L3)` puisque c'est ce lot qui l'exécute réellement — sans
enjeu fonctionnel, à ne pas bloquer dessus.

---

## 4. `--dry-run` — à rejouer avant `--live`, même si L2 l'a déjà fait

```bash
tsx --conditions=react-server --env-file=.env.local scripts/ingest-master-study.mts \
  docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/ --dry-run
```

**Attendu, à vérifier dans la sortie avant de continuer** :
- `Segment trouvé : Compositions & ingrédients B2B (id: db34f8a0-9d9e-4585-acd6-2fbbdd1baad6, level: segment)`
- `S8 Chaîne de valeur : 6 maillons amorcés (value_chain_nodes maillon 1..6, rang=1)` — **6, pas 5** (le piège §4.1 du prompt L2 : si vous voyez `rang=1..6` c'est l'inverse, arrêtez-vous)
- `S7 Calendrier réglementaire : ... (3 items macro ignorés)` — confirme §2.3 ci-dessus
- `✅ SIMULATION RÉUSSIE` et `🔒 Aucune écriture en base n'a été effectuée`

Si un seul de ces éléments diffère de l'attendu, **ne pas passer à `--live`** — remonter l'écart à
Guillaume plutôt que de le corriger seul : un dry-run qui diverge de ce que L2 a validé peut
signifier qu'autre chose a changé en base depuis (segment renommé, migration non prévue…).

---

## 5. `--live` — l'écriture réelle, une fois le gate §0 confirmé

```bash
tsx --conditions=react-server --env-file=.env.local scripts/ingest-master-study.mts \
  docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/ --live
```

Noter le `run_id` / `document_id` / `segment_id` retournés — ils sont nécessaires pour §6.

---

## 6. Vérification après `--live`

### 6.1 SQL — les compteurs avant/après, par bloc de `01-CARTE-DE-LA-CONNAISSANCE.md`

```sql
select id, name, source_run_id, study_snapshot_date, resolution_locks,
       market_size_eur_bn, market_growth_pct
from sector_intelligence where id = 'db34f8a0-9d9e-4585-acd6-2fbbdd1baad6';
-- attendu : source_run_id = <run_id retourné>, study_snapshot_date = 2026-08-14,
-- resolution_locks porte 'market_size_eur_bn' et 'market_growth_pct' (verrouillés not_published)

select count(*) from value_chain_nodes
where sector_id = 'db34f8a0-9d9e-4585-acd6-2fbbdd1baad6' and source_run_id = '<run_id>';
-- attendu : 6 (maillon 1 à 6, rang=1 partout, capture_valeur IS NULL)

select count(*) from sector_regulatory_items
where sector_id = 'db34f8a0-9d9e-4585-acd6-2fbbdd1baad6' and source_run_id = '<run_id>';
-- attendu : le compte du dry-run (§4), PAS +3 (les items macro restent exclus)

select count(*) from sector_pain_points where sector_id = 'db34f8a0-9d9e-4585-acd6-2fbbdd1baad6' and source_run_id = '<run_id>';
select count(*) from sector_events where sector_id = 'db34f8a0-9d9e-4585-acd6-2fbbdd1baad6' and source_run_id = '<run_id>';

select document_type, status, current_content_json -> 'meta' as meta
from intelligence_documents where id = '<document_id>';
-- attendu : document_type = 'master_study', status = 'ready'

select input_snapshot -> 'reserves' as reserves
from ai_intelligence_runs where id = '<run_id>';
-- attendu : les 7 réserves de 07-verdict.json, verbatim — preuve que le verdict est tracé en base
```

### 6.2 Non-régression — les 18 assertions L0/L1 ne doivent pas casser

```bash
# rejouer supabase/tests/069_sector_knowledge_resolution.assertions.sql contre la base live
```

### 6.3 `competitive_map_entries` orphelines — décision explicite requise, défaut = ne pas toucher

Les 8 lignes existantes (§1) n'ont pas de `source_document_id`. Rattacher rétroactivement
`source_run_id = '<run_id>'` sur ces 8 lignes est **possible** mais **pas automatique** : demander
à Guillaume avant de le faire. Si non demandé, ne pas y toucher — laisser L4/L5 en décider avec
plus de recul.

### 6.4 Recette écran (`10-ETAPE-E7…` §6.4)

Ouvrir `/intelligence`, fiche du segment `seg-parfumerie-compositions-b2b` :
1. Une description, un marché (ou son verrou `not_published` visible), un playbook non vide.
2. **Rien ne consomme encore ce contenu proprement côté BI/Cockpit** (L4/L5 le rebranchent) — ne
   pas s'inquiéter si l'affichage reste partiel, c'est le périmètre attendu de ce lot.

### 6.5 Rollback si besoin

`ai_intelligence_runs.id` (`run_id`) identifie tout ce que ce run a écrit
(`source_run_id = run_id` sur les 5 tables + le document). Un retrait supprime ces lignes et
remet `sector_intelligence` à son état antérieur — ne supprime jamais les comptes `mapped` de
`competitive_map_entries` (ils préexistaient à ce run).

---

## 7. Boucle de validation finale

```bash
npm run typecheck
npm run check:server-boundary
npx eslint src/features/master-study/data/ingest-master-study.ts scripts/ingest-master-study.mts
rm -rf .next && npm run build
```

Aucun de ces contrôles ne devrait bouger — §3 ne touche que des commentaires/logs.

---

## 8. Rendu attendu

- Les 2 corrections cosmétiques de §3 appliquées.
- Confirmation explicite (capture ou citation) que le gate §0 a été validé par Guillaume avant
  `--live`.
- Sortie complète du `--dry-run` (§4) puis du `--live` (§5), avec `run_id`/`document_id` notés.
- Résultats des requêtes SQL de vérification (§6.1), pas juste « ça a marché ».
- Décision explicite consignée sur le rattachement des `competitive_map_entries` (§6.3) — faite
  ou explicitement différée, jamais silencieuse.
- `docs/MASTER-STUDY/registre/README.md` mis à jour : ligne du run passée de
  « usable_with_caveats » à son état post-ingestion, `run_id` renseigné dans `07-verdict.json`.
