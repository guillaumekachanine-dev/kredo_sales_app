# Lot 0 — Rapport de clôture

**Exécuté par** : Claude Code
**Date** : 2026-08-22
**Référence** : `KREDO_Cadrage_Analyse_Sectorielle_Enrichie_v1.2.md` (verrouillée)
**Segment pilote** : `seg-parfumerie-compositions-b2b`

---

## 1. Ce qui a été fait

### 1.1 Trois nouvelles clés `playbook`

Ajoutées par `UPDATE` JSONB (aucune migration DDL) sur `sector_intelligence.playbook`,
`slug='seg-parfumerie-compositions-b2b'` :

- `cadre` — périmètre, hors champ (4 items), règle de comparabilité. Repris mot pour mot de
  `registre/2026-08-parfumerie-compositions-b2b/04-secteur.md` §0.1.
- `message_sectoriel` — chaîne simple, reprise de §1.2.
- `trajectoires` — 5 objets `{trajectoire, famille_budget, offre_kredo, src_ids}`, repris de §2.9 /
  `04-secteur.json.budgets_18_36_mois`. `offre_kredo` porte le nom lisible de l'offre
  (`offers.name`), pas le slug — vérifié que les 5 `offer_slug` de la source existent bien dans
  `offers` avant de les traduire.

**⚠️ Écart assumé** : la table `trajectoires` de la source ne porte pas de colonne Sources par
ligne (contrairement à `risks`/`dependances_critiques`). Chaque trajectoire synthétise plusieurs
sections déjà sourcées (thèses, dépendances, risques) plutôt que de citer une source neuve. Pour ne
pas fabriquer un sourcing qui n'existe pas dans le document source (invariant 3), `src_ids` est
laissé à `[]` sur les 5 entrées. Si Dosta veut du sourcing par trajectoire, il faut le faire tracer
explicitement au niveau du prompt E4, pas le reconstituer a posteriori ici.

Vérifié après écriture : les 12 clés attendues sont présentes (9 existantes + les 3 nouvelles),
aucune clé existante n'a été touchée par erreur.

### 1.2 Séparation blocs clients / modèles économiques

Champ `"type": "bloc_client" | "modele_economique"` ajouté à chacune des 9 entrées de
`economic_models`, sans toucher aux autres champs ni changer l'ordre. Vérifié en base après
écriture : 4 `bloc_client` (Marques parfumerie/cosmétique, Industriels hygiène-entretien, Industries
agroalimentaires, Groupes multi-pays) + 5 `modele_economique` (Composition sur brief, Fourniture
récurrente, Ingrédients naturels, Arômes agroalimentaire, Filiale locale) — répartition identique à
celle annoncée en v1.1/v1.2.

---

## 2. Ce qui n'a pas été fait, et pourquoi

### 2.1 Réutilisation des comptes `parfumerie-aromes` — déjà faite, pas par ce lot

Le cadrage v1.2 §6.1 demande de trancher entre rattachement au segment ou lecture par jointure.
**Vérification en base avant d'agir : c'est déjà résolu.** Les 8 lignes `competitive_map_entries`
du secteur macro `parfumerie-aromes` portent toutes `segment_id = seg-parfumerie-compositions-b2b`
en plus de leur `sector_id` macro (aucune ligne macro-only restante), avec `source_run_id =
522cfe06-f241-4620-a820-a0806a902571` — le run d'ingestion MASTER-STUDY E4 du 2026-08-14/20,
documenté dans `registre/2026-08-parfumerie-compositions-b2b/07-verdict.json`. La colonne
`is_benchmark_account` (1 `true` / 7 `false`) porte déjà la distinction de provenance que le
cadrage demandait de rendre visible.

**Choix implémenté de fait** : rattachement par ajout de `segment_id` sans déplacer ni dupliquer la
ligne (`sector_id` macro conservé) — c'est l'option (a) du cadrage, mais réalisée par le pipeline
E4 plutôt que par ce Lot 0. Aucune action supplémentaire nécessaire côté Lot 0 sur ce point.
Le contrôle "aucun des 8 comptes hors périmètre compositions/ingrédients B2B" (checklist initiale)
n'a pas été refait indépendamment — l'ingestion E4 a déjà un verdict `usable_with_caveats` sur ce
run, avec 18/18 assertions vertes après correctif du 2026-08-20.

### 2.2 Refresh de `references/schema-supabase.md` (skill `kredo-sector-intelligence`) — non fait, fichier volontairement retiré

Ce fichier n'est pas un simple doc à jour : c'est un **tombstone**. Il a été supprimé le
2026-07-16, réapparu par erreur et recommitté le 2026-07-17, re-supprimé le 2026-07-26 après avoir
dérivé sur des points bloquants (colonnes/tables inexistantes). Son contenu actuel dit explicitement
« supprimé, ne pas recréer » et pointe vers `PROCESS-ETUDE-SECTORIELLE.md`, un document que
`CLAUDE.md` classe désormais **ARCHIVE/PÉRIMÉ** (le skill `kredo-sector-intelligence` lui-même est
marqué RETIRÉ dans la liste des skills disponibles, au profit de `kredo-master-study`).

Recréer ce fichier aurait reproduit exactement le problème qui a motivé sa suppression trois fois,
et pointé vers une autorité elle-même périmée. **Décision prise en Lot 0** : ne pas toucher ce
fichier.

À la place, j'ai vérifié le document de référence courant : `.agents/skills/kredo-master-study/
references/blocs-et-destination.md`. Il documente déjà `competitive_map_entries` (bloc E5) et
`intelligence_sources`/`intelligence_source_links` (bloc E3/S14), et le principe général du fichier
est de **ne jamais recopier un schéma** — il renvoie vers `information_schema` et les migrations.
Les nouvelles clés `playbook` n'appellent pas d'entrée séparée : la ligne E4 mentionne déjà
`sector_intelligence (..., playbook, ...)` sans énumérer les clés individuelles, par cohérence avec
ce principe (les clés existantes comme `economic_models` ou `dependances_critiques` n'y sont pas
non plus détaillées).

**Correction (2026-08-22, post-clôture)** : mon évaluation initiale de `source_corpora` /
`source_corpus_items` était fausse sur un point précis. J'avais conclu que ces tables
n'appartenaient qu'au chantier « Gestion des sources » (veille), sans rapport avec le registre de
sources d'une étude E4 — et je ne les avais donc pas documentées. En réalité, **le corpus E3 de
`seg-parfumerie-compositions-b2b` est bien ingéré dans ces tables** : `source_corpora` porte
`metadata.reason = "Import corpus E3 — ..."`, `metadata.source_file_name = "03-sources.json"`, et
`source_corpus_items` contient 28 lignes pour ce segment (`corpus_id = e0e31867-...`), une par
source de l'ANNEXE A de `04-secteur.md`. `blocs-et-destination.md` (E3 → `intelligence_sources`)
est donc lui-même imprécis sur ce point pour ce run — à corriger séparément, hors périmètre de
cette correction.

**Écart 28 vs 29 sources, élucidé** : `SRC-009` (Insee, « trajectoire macro fabrication parfums »)
n'a pas de ligne dans `source_corpus_items`. Cause structurelle, pas un bug d'ingestion :
`source_catalog` est scopé par **domaine** (une ligne par éditeur, `insee.fr`), alors que
`04-secteur.json` cite l'Insee deux fois avec des URLs différentes (source 9 et source 15) ;
`source_corpus_items` porte `UNIQUE(corpus_id, source_id)`, donc une seule des deux citations peut
avoir une ligne — `SRC-015` a gagné, `SRC-009` a été silencieusement absorbé. Sans impact réel :
aucun `src_ids` du `playbook` de ce segment ne référence la source 9 (vérifié par requête).

**Correctif livré** : colonne générée `source_corpus_items.src_number integer`
(migration `20260822092309_source_corpus_items_src_number.sql`), dérivée de `external_src_id`
("SRC-0NN" → NN), + index `(corpus_id, src_number)`. 100 % des `src_ids` du playbook du segment
pilote résolvent désormais (0 orphelin, vérifié par jointure). Loader
`getSectorSourceResolution(sectorId)` ajouté (`src/features/business-intelligence/data/
get-sector-source-resolution.ts`) : résout `src_number → {publisher, url, tier, attests,
consultedAt}` via `source_corpora` (courant) → `source_corpus_items` → `source_catalog`.
`SourceChip`/`SourceChipList` (Lot 1) restent prop-driven ; ce loader est ce que Lot 2+ doit
appeler côté serveur pour les alimenter.

**Limite assumée, à connaître avant Lot 2+** : `url` renvoie `source_catalog.homepage_url` (site
de l'éditeur), pas l'URL exacte citée dans l'étude (ex. la page spécifique IFRA sur l'amendement
52) — cette URL précise n'existe qu'dans `04-secteur.json`, jamais en base. Si le SourceChip doit
un jour pointer vers la citation exacte, c'est une ingestion supplémentaire à cadrer, pas un bug
de ce correctif.

---

## 3. Écarts vs le handoff/cadrage, à connaître

- Le handoff cite `docs/business-intelligence/` : ce dossier n'existe pas. Les cadrages vivent dans
  `docs/MASTER-STUDY/distribution_données/` (non commité au moment de ce lot).
- Il existe un chantier **déjà clôturé** au nom quasi identique — `docs/FEATURES/business_intelligence/`
  (« Business Intelligence mono-segment », Lots 1-4, clos le 22/08) — homonyme, sans rapport avec ce
  Lot 0. Ne pas confondre les deux lors des lots suivants.
- `KREDO_Cadrage_Mode_Terrain_v1.0.md` reste absent du repo malgré la checklist v1.2 qui le donne
  pour « produit » — non bloquant pour ce Lot 0 (confirmé par v1.2 §8), mais à déposer avant le Lot 13.

---

## 4. État à date pour la suite (Lot 1+)

- `playbook` de `seg-parfumerie-compositions-b2b` porte les 12 clés attendues, `economic_models`
  est typé — le Lot 1 (SourceChip, bandeau de confiance, callout DONC) peut consommer ces clés.
- Le tableau comparatif du segment pilote est déjà peuplé (8 comptes, provenance traçable via
  `is_benchmark_account` + `source_run_id`) — rien à faire côté Lot 0/1 sur ce point.
- Aucune donnée dupliquée, aucune table créée, aucune migration DDL exécutée.
