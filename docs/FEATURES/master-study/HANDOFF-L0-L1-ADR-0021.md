# Handoff — ADR-0021, suite des lots

**Autoportant.** Si vous reprenez ce chantier à froid, ce fichier suffit — vous n'avez pas besoin
d'avoir lu la conversation qui a produit l'ADR. Commencez par la section 1.

- **ADR de référence** : `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md`
  (v2.0, **Accepté** le 2026-08-20). Toute décision normative (MS-1 → MS-20) citée ici y est
  définie en détail — ce handoff ne les reformule pas, il dit où en est leur mise en œuvre.
- **État au 2026-08-20, fin de journée** : **L0, L1, L2 et L3 livrés et vérifiés
  indépendamment** (build vert, migrations appliquées en base, assertions et RPC rejouées
  séparément, ingestion `--live` exécutée et vérifiée avec
  `run_id: 522cfe06-f241-4620-a820-a0806a902571`). **Un défaut réel trouvé à la vérification, absent
  du rapport de livraison, corrigé avant de clore le lot** — `sector_intelligence.status` restait
  `development` après ingestion, rendant le segment invisible à Prospection · Fenêtres ; voir §4.7.
  Gate G3 métier confirmé fait par Guillaume avant ingestion (déclaratif, non re-vérifiable
  autrement que par sa parole). 8 `competitive_map_entries` orphelines laissées intactes (décision
  différée L4/L5). **La promotion `status → 'active'` a été automatisée dans la RPC**
  (`supabase/migrations/20260820201853_master_study_e4_promote_segment_status.sql`, décision
  Guillaume) — voir §4.7. **L4 livré et vérifié indépendamment** (§4.8) — `SectorKnowledgeReadModel`,
  démontage du chargement global de BI, groupement corrigé macro→segment. **Aucun défaut bloquant
  trouvé**, contraste net avec L1/L2/L3. **L5 livré et vérifié indépendamment le 2026-08-20**
  (§4.9) — `AccountSectorPerspective(companyId)`, data layer pur, aucun consommateur UI. **Aucun
  défaut fonctionnel trouvé** — deuxième lot consécutif sans défaut bloquant, après L4. Un seul
  écart de méthode corrigé à la vérification (tests qui frappaient la prod dans `npm test`, voir
  §4.9). Correctif de provenance des 8 `competitive_map_entries` orphelines exécuté dans ce même
  lot (décision différée depuis L3/L4, close ici). Prochaine étape : **GATE B design** puis
  redesign de Cockpit > Secteur (hors périmètre de L5, volontairement).
- **Segment pilote** : `seg-parfumerie-compositions-b2b` (`db34f8a0-9d9e-4585-acd6-2fbbdd1baad6`).
  **Compte pilote** : ROBERTET (`67b346ff-68c8-4f36-a510-13024955856f`).

---

## 1. Ce qui est livré — L0 « vérité d'affichage »

### 1.1 Le problème corrigé

`ClientIntelligenceSectorTab.tsx` (onglet Cockpit > Secteur) affichait des chiffres hérités du
macro-secteur (attractivité, taille de marché, croissance) **sans aucun badge de provenance**,
alors que la description textuelle du même écran portait déjà ce badge
(`SectorLevelBadge`, composant `intelligence-parts.tsx`). Sur ROBERTET, l'écran affichait
« Taille marché KREDO : 80 Md€ » — un chiffre du macro « Parfumerie, Arômes & Cosmétique »,
**mondial toutes catégories** — comme s'il caractérisait le segment `seg-parfumerie-compositions-b2b`,
dont l'étude E4 déclare explicitement la taille **non publiée**.

### 1.2 Pourquoi ce n'était pas un simple oubli de badge

`v_sector_knowledge_resolved` (migration 069) ne porte de niveau de provenance (`description_level`)
que pour le champ `description`. Les trois scalaires `attractiveness_score`, `market_size_eur_bn`,
`market_growth_pct` sont résolus indépendamment par `COALESCE(s.x, m.x)`, **sans aucun témoin de
provenance par champ**. Il était donc impossible de savoir, à partir de la vue seule, si *ce*
chiffre précis venait du segment ou avait été hérité.

### 1.3 La solution retenue — sans migration, sans réécriture de vue

Ajout d'une **requête supplémentaire, en parallèle de la vue**, sur la table `sector_intelligence`
brute (pas la vue), filtrée sur le même `segment_id`, ne sélectionnant que les 3 colonnes
scalaires. La présence d'une valeur non nulle côté segment détermine `level = "segment"` ; son
absence, `level = "macro"`. Zéro schéma, zéro migration, exactement comme le prévoyait le plan de
lots de l'ADR (§11).

**Fichiers modifiés** :

| Fichier | Changement |
|---|---|
| `src/lib/intelligence/client-intelligence-sector.ts` | 3 nouveaux champs sur `SectorIntelligenceSource` et `ClientIntelligenceSectorView` : `attractivenessScoreLevel`, `marketSizeLevel`, `marketGrowthLevel` (type `SectorResolvedLevel`). Branchés dans `buildClientIntelligenceSectorView` et `buildFolioFallbackSectorView` |
| `src/lib/intelligence/sector-snapshot-data.ts` | Nouvelle requête parallèle sur `sector_intelligence` (colonnes `attractiveness_score,market_size_eur_bn,market_growth_pct`, `.eq("id", segmentId)`) ; nouvelle fonction `scalarLevel()` ; les 3 niveaux calculés et transmis au builder |
| `src/components/accounts-contacts/intelligence/ClientIntelligenceSectorTab.tsx` | `SectorIntroduction` : chaque stat (`Attractivité`, `Taille marché KREDO`, `Croissance KREDO`) porte désormais son `level` et affiche `<SectorLevelBadge>` à côté de son libellé, exactement comme la description |
| `src/lib/intelligence/client-intelligence-sector.test.ts` | Fixture `source()` étendue aux 3 nouveaux champs |
| `src/lib/intelligence/sector-snapshot-data.test.ts` | Mock Supabase étendu (branche `sector_intelligence` → `state.rawSegment`) ; nouveau `describe("getSectorSnapshot — provenance par chiffre (L0)")`, 3 tests : héritage total par défaut, provenance indépendante par champ (un segment peut avoir sa propre taille de marché sans avoir sa propre description, ou l'inverse — c'est le cas que le bug aurait laissé passer), `0` traité comme une valeur réelle et non comme une absence |

### 1.4 Ce qui n'a **pas** changé

- **Aucune migration.** Aucune colonne nouvelle, aucune vue touchée.
- **Aucun changement de comportement pour BI, `MasterStudyReader` (`SectorStudiesModal`),
  Prospection ou le Knowledge Hub.** Ce lot ne touche que le Cockpit > Secteur, qui est le seul
  endroit qui rendait ces trois chiffres sans provenance.
- `resolution_locks` (MS-12, la distinction ABSENT / EXPLICIT_UNKNOWN) **n'était pas livré ici**.
  C'était L1, livré dans la foulée le même jour — voir §2. Ce que L0 fait : dire *« ce chiffre
  vient du macro »*. Ce que L1 ajoute : dire *« ce chiffre a été explicitement déclaré non
  publiable au niveau du segment, ne jamais proposer le chiffre macro à sa place »*.

### 1.5 Preuve — boucle de validation complète, dans l'ordre CLAUDE.md

```
npm run typecheck            → vert
npm test                     → 167 fichiers, 1678 tests, tous verts (dont les 3 nouveaux du §1.3)
npm run check:server-boundary → vert
npx eslint <5 fichiers touchés> → aucune sortie (vert)
rm -rf .next && npm run build → exit 0, toutes les routes listées, aucune erreur réelle
```

Le build produit des messages `console.error` `DYNAMIC_SERVER_USAGE` sur `/missions`,
`/missions/projets`, etc. — **attendu**, ce sont des routes dynamiques qui lisent `cookies()`/
`headers()`, Next.js les logue même quand la génération réussit. Ne pas les confondre avec un
échec de build ; le `BUILD_EXIT` réel est `0`.

### 1.6 Non couvert par ce lot — QA visuelle

Aucun `npm run dev` n'a été lancé, aucun écran ouvert dans un navigateur. Conformément à
CLAUDE.md §8 (« la QA visuelle est faite par Guillaume »). **Si vous voulez vérifier
visuellement** : ouvrir le Cockpit du compte ROBERTET, onglet Secteur, et confirmer que les
libellés « Attractivité », « Taille marché KREDO », « Croissance KREDO » portent chacun le badge
gris « Macro-secteur » à côté de leur libellé (comme déjà le cas pour « Synthèse KREDO »).

---

## 2. Ce qui est livré — L1 « verrou et provenance en base »

Réalisé par un agent externe (Gemini) sur la base du prompt
`docs/MASTER-STUDY/registre/HANDOFF-L1-GEMINI.md`, puis **revérifié indépendamment** (migration
relue, assertions SQL rejouées séparément contre la base live, invariants recomptés, `typecheck`
/ `test` / `check:server-boundary` / `lint` / `build` relancés depuis zéro) — aucune des affirmations
ci-dessous ne repose sur le seul rapport de livraison.

### 2.1 Migration — appliquée, 8 colonnes

`supabase/migrations/20260820200000_master_study_provenance_columns.sql`, timestamp vérifié
identique à celui enregistré dans `supabase_migrations.schema_migrations`.

```sql
sector_intelligence       + source_run_id uuid (FK ai_intelligence_runs, ON DELETE SET NULL)
                          + study_snapshot_date date
                          + resolution_locks jsonb NOT NULL DEFAULT '{}'
sector_events             + source_run_id uuid
sector_pain_points        + source_run_id uuid
sector_regulatory_items   + source_run_id uuid
value_chain_nodes         + source_run_id uuid
competitive_map_entries   + source_run_id uuid      -- study_snapshot_date existait déjà
```

`resolution_locks` est **une colonne à part**, jamais mêlée à `caveats` — le piège du §1.4 est
évité (vérifié : le corps de la migration ne touche `caveats` nulle part).

### 2.2 Deux fonctions `private.*` + réécriture de `v_sector_knowledge_resolved`

`private.sector_resolve_scalar(segment, macro, locked)` et `private.sector_scalar_level(segment,
locked)` factorisent la logique de verrou — même patron que `private.merge_sector_playbook`
(migration 069), donc testable directement en assertion plutôt que noyée dans un `CASE` répété
trois fois dans la vue.

La vue a été **`DROP`+`CREATE`**, pas `CREATE OR REPLACE` (une colonne ne peut pas être insérée
ailleurs qu'en fin de liste avec `CREATE OR REPLACE VIEW`). `security_invoker = true` est
préservé — vérifié en base après coup (`pg_class.reloptions`), pas seulement supposé.

Trois nouvelles colonnes exposées : `attractiveness_score_level`, `market_size_eur_bn_level`,
`market_growth_pct_level` ∈ `'segment' | 'macro' | 'locked'`. `has_segment_knowledge` compte
désormais un verrou posé comme de la connaissance segment (une étude qui dit « non publié » a
produit un fait, pas un silence) — clause `OR s.resolution_locks ?| array[...]` vérifiée présente.

### 2.3 Assertions SQL — 14 → 18, rejouées deux fois

`supabase/tests/069_sector_knowledge_resolution.assertions.sql` porte désormais les assertions
15-18 (le verrou l'emporte même sur une valeur brute incohérente ; non-régression sans verrou ;
`resolution_locks` vide partout tant que L2/L3 n'ont rien écrit — ce dernier point est **attendu
comme temporaire**, il cessera d'être vrai après le premier import réel ; les 3 niveaux restent
dans le domaine `segment/macro/locked`). Rejouées par l'exécutant, puis **séparément recopiées et
rejouées** lors de la vérification indépendante — silence des deux côtés, aucune exception.

Invariants live confirmés à l'issue du lot, par requête directe (pas par lecture du rapport) :
`resolution_locks <> '{}'` → 0 ligne ; `source_run_id IS NOT NULL` → 0 ligne sur les 6 tables.
**L1 pose l'infrastructure sans rien ingérer — exactement le périmètre demandé.**

### 2.4 TypeScript — le pis-aller de L0 retiré comme prévu

Le §1.4 ci-dessus posait la question à trancher en L1 : une fois la vue capable de calculer la
vraie provenance (y compris `locked`, que L0 ne pouvait pas connaître), le mécanisme temporaire de
L0 — requête parallèle sur la table brute + `scalarLevel()` en TypeScript — devient une deuxième
vérité redondante avec le calcul SQL. **Il a été retiré, pas laissé à côté** :
`sector-snapshot-data.ts` ne fait plus qu'un seul `await` sur la vue, lit directement les 3
colonnes `*_level`, et une fonction `toScalarLevel()` remplace `scalarLevel()` (elle distingue
`"locked"` de `"macro"`, ce que l'ancienne `toResolvedLevel()` ne pouvait pas faire — vérifié : elle
n'a pas été réutilisée par erreur pour ces 3 champs).

`SectorResolvedLevel` passe à `"segment" | "macro" | "locked"`. `SectorLevelBadge`
(`intelligence-parts.tsx`) affiche un badge ambre distinct « Non publié » pour `locked`, avec un
`title` explicite. `ClientIntelligenceSectorTab.tsx` ne filtre plus les stats à valeur `null`
quand leur niveau est `locked` — sans ce correctif, le badge n'aurait jamais pu s'afficher (une
valeur verrouillée est justement forcée à `null` par la vue) et le lot n'aurait rien changé à
l'écran. Vérifié en lisant le code livré, pas seulement le rapport.

Aucun test `.tsx` n'a été ajouté pour `SectorLevelBadge` — correct : `vitest.config.ts` n'inclut
que `src/**/*.test.ts`, un tel fichier ne tournerait jamais sous `npm test`.

### 2.5 Validation — relancée indépendamment, résultats identiques au rapport

`typecheck` / `test` (167 fichiers, 1678 tests — même compte qu'après L0, les 3 tests L0 obsolètes
ont été remplacés 1:1 par 3 tests L1) / `check:server-boundary` / `lint` (0 erreur, 2 warnings
`<img>` **préexistants** dans `intelligence-parts.tsx`, sans rapport avec ce lot — localisation
vérifiée) / `rm -rf .next && npm run build` (exit 0) : tous relancés depuis zéro, tous verts.

### 2.6 Un gap réel trouvé à la vérification, corrigé dans cette même passe

Le rapport de livraison ne mentionnait pas la mise à jour du **tableau de suivi des lots** de
l'ADR (§11) ni de ce handoff : le rapport disait « entièrement implémenté » mais la ligne `L1` du
plan de lots restait sans ✅, et ce fichier affirmait encore « L1 non commencé » en tête. Les deux
ont été corrigés dans cette passe de vérification — pas fonctionnel, mais c'est exactement le
genre d'incohérence qui égare le prochain agent qui lit la doc avant le code.

### 2.7 Ce que L1 ne fait toujours pas

- Pas d'importeur (`scripts/ingest-master-study.mts`) — c'est L2.
- Pas d'ingestion réelle du segment pilote — c'est L3.
- `ingest-competitive-map.ts` non touché ; sa mise au régime RPC transactionnelle (MS-10) reste
  documentée pour L2.

---

## 3. Ce qui est livré — L2 « importeur E4 + RPC transactionnelle »

Réalisé par un agent externe (Gemini) sur la base du prompt
`docs/MASTER-STUDY/registre/HANDOFF-L2-GEMINI.md`, puis **revérifié indépendamment** (migration
relue, RPC rejouée en transaction annulée avec un payload réaliste, code TypeScript relu ligne à
ligne, assertions 069 rejouées une troisième fois). **Deux défauts bloquants trouvés à la
vérification, absents du rapport de livraison, corrigés avant tout `--live`** — voir §3.4.

### 3.1 Ce que Gemini a livré correctement, tel quel

- Migration `20260820200001_master_study_value_chain_amorce_fix_workspace_scoping.sql` (nom
  d'origine) : `value_chain_nodes.maillon` sans plafond, `vcn_capture_si_chaine` retirée — les
  deux vérifiées en base après coup, aucun impact sur les 7 lignes BTP existantes.
- `src/features/master-study/domain/map-e4-to-canon.ts` : le mapping E4 → canon est **exact et
  complet**, y compris le piège le plus dangereux du lot — `maillons[i].rang` (E4) devient
  `value_chain_nodes.maillon`, jamais `.rang` (toujours `1`, une ligne par maillon E4). Le
  commentaire du code cite explicitement « Piège §4.1 ». Vérifié par lecture, pas par confiance
  dans le nom de la fonction.
- `mapOfferPracticeToKredoPractice()` correctement rebranché sur `regulation[].kredo_practice`
  avant écriture — le vocabulaire `data-ai` (E4) devient `data_ai` (contrainte DB), vérifié en
  base sur un appel réel.
- Le filtrage `regulation[].portee === 'macro'` (item ignoré, tracé dans `meta.ignoredMacroRegulations`,
  jamais silencieusement perdu) est implémenté exactement comme demandé.
- `dependances_critiques` → `playbook.dependances_critiques` (décision prise en cours de route,
  voir §3.3) et non vers `value_chain_nodes`, qui n'a aucune colonne pour l'accueillir.
- `src/features/master-study/domain/map-e4-to-canon.test.ts` inclut un test contre le **fixture
  réel** du run pilote lu depuis le disque (pas un fixture synthétique qui dériverait sans qu'on
  s'en aperçoive) : les 6 maillons, les verrous `not_published`, le filtrage macro y sont
  vérifiés contre `04-secteur.json` tel qu'il existe réellement.
- `ingest-competitive-map.ts` : `console.error` ajouté sur l'échec d'archivage (auparavant
  totalement silencieux — c'est ce qui explique les 8 `competitive_map_entries` sans document du
  14/08) ; `p_source_run_id` optionnel ajouté à `ingest_competitive_map_batch` sans changer son
  comportement par défaut.
- Le `--dry-run` du script respecte la limite du lot : `isLive`/`isDryRun` avec `--dry-run` par
  défaut, aucune écriture avant le flag `--live` explicite.

### 3.2 Le corpus MASTER-STUDY, correctement amendé

`budgets_18_36_mois` retiré (schéma **et** prompt E4, `grep` vérifié : plus aucune occurrence).
`taille_statut`/`croissance_statut` ajoutés au schéma (ADR §13.2, jamais fait avant ce lot).
`09-ETAPE-E6-CHAINE-DE-VALEUR.md` §4.1 amendé (plafond retiré, articulation E4 amorce / E6
approfondit explicitée, citant MS-19). Le run pilote lui-même patché avec
`taille_statut: "not_published"` / `croissance_statut: "not_published"` — une transcription du
fait déjà établi en prose par `incertitudes[0]`, pas une invention.

### 3.3 Une décision d'architecture posée avant que Gemini ne commence

En préparant ce prompt, j'ai trouvé que `dependances_critiques[]` (criticité, risque, prestation
ouverte, practice) n'a **aucune colonne d'accueil** dans `value_chain_nodes` — le §9.1 de l'ADR
affirmait une correspondance qui ne tenait pas face aux colonnes réelles de la table. Soumis à
Guillaume avant d'écrire le prompt : **`playbook.dependances_critiques`**, zéro migration,
cohérent avec `playbook.risks` déjà existant. L'ADR §9.1 a été corrigé en conséquence (il ne dit
plus une chose que ce lot contredirait).

### 3.4 Deux défauts bloquants trouvés à la vérification — absents du rapport

Le rapport de livraison disait « intégralement implémenté et validé ». Les deux défauts suivants
n'auraient été détectés **qu'au premier `--live` réel** — c'est-à-dire en L3, sur la base de
production — puisque le périmètre du lot exclut explicitement d'exercer ce chemin. Trouvés en
lisant le code contre le schéma cible, pas en faisant confiance au rapport.

1. **La RPC vivait en schéma `private`.** `private.ingest_master_study_e4` n'est **jamais**
   exposée par PostgREST — `CLAUDE.md` le documente explicitement (« elles ne sont pas exposées
   par PostgREST, donc jamais appelables en `.rpc()` depuis le front »), et l'analogue fonctionnel
   (`ingest_competitive_map_batch`) est bien en `public`. Cette erreur de conception vient du
   **prompt**, pas de Gemini : `HANDOFF-L2-GEMINI.md` §5.2 spécifiait `private.*`, en confondant
   avec le patron des fonctions `private.sector_resolve_scalar`/`sector_scalar_level` de L1 —
   celles-là ne sont jamais appelées en `.rpc()`, seulement depuis SQL par la vue. Corrigé par
   migration `20260820200002_master_study_move_e4_rpc_to_public_schema.sql` : la fonction déplacée
   en `public`, testée à nouveau, `npm run db:types` régénéré, le point d'appel TypeScript nettoyé
   (il portait un contournement de typage `as unknown as …` pour compenser l'absence de la
   fonction dans les types générés — plus nécessaire une fois en `public`).
2. **`workspace_id` non résolvable sous service-role.** La RPC dérivait `workspace_id` de
   `private.current_workspace_id()` (lui-même basé sur `auth.uid()`). Le seul appelant réel de
   cette fonction est `scripts/ingest-master-study.mts`, qui se connecte avec
   `SUPABASE_SERVICE_ROLE_KEY` — sous ce rôle, `auth.uid()` ne résout à rien, donc
   `current_workspace_id()` renvoie `NULL`, et la garde `workspace_id = v_workspace_id` échoue
   sur **toute** ligne. Pire : les 4 tables d'items (`sector_events`, `sector_pain_points`,
   `sector_regulatory_items`, `value_chain_nodes`) ont `workspace_id NOT NULL` **sans aucun
   défaut** — la RPC ne le renseignait dans aucun de ses `INSERT`, ce qui aurait fait échouer
   l'ingestion dès le premier item, **quel que soit l'appelant**, session utilisateur incluse.
   Corrigé dans la même migration `20260820200001` (renommée dans son contenu, le fichier gardait
   son nom d'origine sur disque) : `workspace_id` lu depuis la ligne `sector_intelligence` cible
   elle-même (source de vérité robuste au contexte d'appel), puis passé explicitement à
   **chacun** des 7 `INSERT` de la fonction.

**Preuve, pas affirmation** : les deux corrections ont été rejouées en transaction `ROLLBACK`
avec un payload couvrant tous les points sensibles à la fois (`maillon=6`, verrou de résolution,
`kredo_practice` déjà traduit, `dependances_critiques`, `incertitudes`) — succès complet, `rollback`
confirmé sans résidu (`ai_intelligence_runs`/`value_chain_nodes` à 0 après coup).

**Un troisième problème, purement de registre** : les deux migrations correctives ont été
enregistrées par l'outil d'application avec des timestamps **antérieurs** à celui de L1
(`20260820190521` puis `20260820190811`, alors que L1 est `20260820200000`) — un décalage
d'horloge de l'outil, pas une erreur de ma part ni de Gemini. Un `db reset` les aurait rejouées
**avant** L1, dont elles dépendent (colonnes de provenance). Corrigé par `UPDATE` direct sur
`supabase_migrations.schema_migrations.version` (`200001`, `200002`) et renommage des fichiers
locaux pour correspondre exactement — même piège que celui documenté dans `CLAUDE.md` pour L1,
sous une forme différente (ici l'outil dérive, pas l'agent).

### 3.5 Validation — relancée indépendamment après corrections

`typecheck` / `test` (169 fichiers, 1686 tests — +2 fichiers/+8 tests vs L1, les nouveaux tests
`master-study`) / `check:server-boundary` / `lint` (0 erreur) / `rm -rf .next && npm run build`
(exit 0) : tous relancés depuis zéro **après** les deux corrections, tous verts. Les 18 assertions
`069_sector_knowledge_resolution.assertions.sql` rejouées une troisième fois (après L1, après ce
lot) : toujours vertes, aucune régression.

Invariants live confirmés à l'issue du lot : `ai_intelligence_runs` (`run_type='master_study'`),
`intelligence_documents` (`document_type='master_study'`) et toutes les lignes à `source_run_id`
non nul → **0** partout. **L2 pose l'outillage sans rien ingérer, comme L1 avait posé
l'infrastructure sans verrouiller.**

### 3.6 Ce que L2 ne fait toujours pas

- Aucune écriture en base de production — c'est **L3**.
- Pas de lecture/projection (`SectorKnowledgeReadModel`, `AccountSectorPerspective`) — **L4/L5**.
- `intelligence_source_links` non étendu (ADR MS-15, hors V1).

---

## 4. L3 « ingestion réelle du pilote » — **exécuté et vérifié indépendamment le 2026-08-20**

> ✅ **`--live` exécuté par un agent externe (Gemini) sur la base de
> `docs/MASTER-STUDY/registre/HANDOFF-L3-GEMINI.md`, puis revérifié indépendamment** (requêtes
> SQL rejouées séparément contre la base live, pas seulement le rapport de livraison lu) —
> **un défaut réel trouvé, absent du rapport, corrigé avant de clore le lot** : voir §4.7. Même
> doctrine qu'à L1 et L2 : « le producteur n'est jamais son propre jury ».
>
> `run_id: 522cfe06-f241-4620-a820-a0806a902571` · `document_id: c8e7aa8b-8ecd-4af4-9e9e-5b04884d1b35`
> · segment `db34f8a0-9d9e-4585-acd6-2fbbdd1baad6`.

### 4.7 Le défaut trouvé à la vérification — absent du rapport de Gemini

Les 18 assertions `supabase/tests/069_sector_knowledge_resolution.assertions.sql` ont été
rejouées une à une (pas en bloc, pour isoler un éventuel échec) : 17/18 vertes, **ASSERT 14 en
échec sur 10 comptes** — exactement les 10 comptes du segment pilote.

**Cause** : la RPC `ingest_master_study_e4` ne touche jamais `sector_intelligence.status`. Avant
l'ingestion, le segment (`status='development'`) résolvait son playbook au niveau macro
(`status='active'` du macro), donc passait. Après l'ingestion, le segment a désormais son propre
playbook (personas/objections/entry_points/roi_arguments réellement peuplés) — `playbook_level`
bascule à `'segment'`, et c'est alors `segment_status` qui est lu, resté `'development'`.

**Impact réel, pas seulement une assertion SQL** : `src/lib/prospection/get-playbook-sectors.ts`
filtre explicitement `.eq("status", "active")` (commentaire du fichier : « Ne renvoie QUE les
secteurs dont l'étude a réellement été produite »). Sans correction, **Prospection · Fenêtres
n'aurait montré aucun résultat pour ce segment**, malgré une étude réellement ingérée — exactement
le point 5 de la recette écran de `10-ETAPE-E7…` §6.4. Le Cockpit > Secteur (L0) n'était lui pas
affecté : rien n'y filtre sur ce `status`.

**Correction** : `UPDATE sector_intelligence SET status = 'active' WHERE id = 'db34f8a0-…'`,
décidée explicitement par Guillaume (pas un choix pris seul), appliquée sur ce seul segment — pas
un correctif de la RPC. Les 18 assertions sont vertes après ce correctif. Documenté dans
`07-verdict.json` (réserve ajoutée) et `registre/README.md`.

**Tranché le 2026-08-20** : automatiser, dans la RPC — pas un geste humain répété à chaque run.
`supabase/migrations/20260820201853_master_study_e4_promote_segment_status.sql` ajoute
`status = 'active'` à l'`UPDATE sector_intelligence` de `ingest_master_study_e4`, inconditionnel
(la fonction ne fait que promouvoir, jamais rétrograder). Vérifié en base : la fonction contient
désormais `status = 'active'` (`pg_get_functiondef`), et les 18 assertions restent vertes.

### 4.6 Historique de la reprise (2026-08-20, avant exécution)

> ✅ **Reprise autorisée le 2026-08-20**, après re-vérification à la source (pas de confiance dans
> le rapport périmé) et deux arbitrages G3 explicites de Guillaume. Séquence complète :
>
> 1. G1 rejoué (`--today 2026-08-20`) : **toujours FAIL, 38 PASS/5 FAIL**, à l'identique de l'état
>    qui avait motivé la suspension — rien n'avait changé entre-temps.
> 2. Guillaume a choisi, sur les 3 options posées, **« ingérer avec réserves documentées »**
>    plutôt que corriger d'abord ou re-suspendre.
> 3. Deux points de jugement G3 tranchés explicitement par Guillaume :
>    - **Source IFRA retenue comme officielle** pour `echeance_pivot`, malgré le domaine non
>      `.gouv.*` (IFRA fait autorité de fait dans la filière parfumerie) — le faux positif du
>      script reste à corriger séparément, hors périmètre de ce lot.
>    - **3 items réglementaires macro (IFRA 52e amendement, IFRA régime permanent, REACH)
>      reconfirmés transversaux** — décision déjà rendue le 14/08 (`registre/README.md`),
>      reconfirmée le 20/08. Ces 3 items ne sont **pas** ingérés par la RPC segment-scopée : ils
>      restent hors périmètre, un import macro séparé resterait à faire pour les matérialiser.
> 4. Un cinquième point (`03-journal.md` absent, `03-sources.json > compteurs.requetes = 0`) **n'a
>    pas été corrigé** — c'est une vraie lacune de matière (E3 jamais rejoué avec un journal de
>    requêtes tenu), pas un défaut de contrat ou un jugement G3 : le corriger exigerait de
>    refaire la recherche, pas d'éditer un JSON. Accepté comme réserve documentée, tel quel.
> 5. **`registre/2026-08-parfumerie-compositions-b2b/07-verdict.json` créé** (manquait
>    entièrement) — verdict `usable_with_caveats`, les 6 réserves ci-dessus y sont détaillées
>    littéralement, avec les taux et péremptions attendus par `10-ETAPE-E7…` §8.
>    `registre/README.md` mis à jour en cohérence (le tableau portait encore un compteur `28/5`
>    périmé).
> 6. **Vérifié en base avant d'écrire le prompt** (pas seulement dans les fichiers) : les 3
>    migrations L1/L2 sont bien appliquées (`20260820200000/1/2`), `ingest_master_study_e4` est
>    bien en schéma `public` (le correctif L2 a tenu), les 2 contraintes `value_chain_nodes` sont
>    bien relâchées, le segment pilote porte `source_run_id IS NULL` (rien ingéré), et les 8
>    `competitive_map_entries` du pilote sont bien orphelines de document (`source_document_id
>    IS NULL`) — confirmant le constat du §3.4.
>
> **Ce qui reste un vrai gate humain, non levé par cette reprise** : le G3 complet
> (`10-ETAPE-E7…` §5 — confrontation compte étalon, lecture à voix haute du message sectoriel,
> répétition de l'appel du compte n°1) **n'a pas été fait**. Les deux arbitrages ci-dessus ne
> couvrent que la portée réglementaire et la source IFRA, pas la recette métier complète. Le
> prompt L3 (`docs/MASTER-STUDY/registre/HANDOFF-L3-GEMINI.md`) en fait un pré-requis explicite
> avant `--live`, pas une case cochée d'office.

Résumé de ce que L3 fait (détail complet dans le prompt `HANDOFF-L3-GEMINI.md` et dans l'ADR §11
ligne L3, ne pas le reformuler avant de les avoir lus) :

- Exécuter `tsx --conditions=react-server --env-file=.env.local scripts/ingest-master-study.mts
  docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/ --live` — la première exécution
  réelle de la RPC `public.ingest_master_study_e4` contre le segment pilote.
- Vérifier après coup : `sector_intelligence.source_run_id`/`resolution_locks` peuplés pour
  `seg-parfumerie-compositions-b2b`, un document `master_study` archivé, les 6 `value_chain_nodes`
  créés avec `maillon` 1 à 6, les 8 `competitive_map_entries` existantes rattachées (E5, arbitrage
  humain déjà fait le 14/08) — sans les réimporter, seulement via un éventuel `p_source_run_id` si
  le rattachement rétroactif est jugé utile (à trancher, pas fait par défaut).
- Recette écran : ouvrir `/intelligence` et confirmer que la fiche du segment porte désormais une
  description, un marché (ou son verrou), un playbook non vide — même si **rien ne consomme
  encore ce contenu proprement** (c'est L4/L5 qui rebranchent BI et le Cockpit dessus).

**Ce que L3 ne fait pas** : rebrancher BI ou le Cockpit sur le nouveau contenu (L4/L5), étendre
`intelligence_source_links`.

---

## 4.8 Ce qui est livré — L4 « SectorKnowledgeReadModel + rebranchement BI »

Réalisé par un agent externe (Gemini) sur la base du prompt
`docs/MASTER-STUDY/registre/HANDOFF-L4-GEMINI.md`, puis **revérifié indépendamment** (code relu
fichier par fichier, `typecheck`/`test`/`check:server-boundary`/`eslint`/`build` relancés depuis
zéro par l'agent de vérification, pas seulement lus dans le rapport). **Aucun défaut bloquant
trouvé** — première fois dans ce chantier que la vérification indépendante ne trouve rien à
corriger (contraste avec L1 : RPC en mauvais schéma ; L2 : `workspace_id` non résolvable ; L3 :
`status` jamais promu).

**Livré, vérifié ligne par ligne** :
- `src/features/master-study/data/get-sector-knowledge-read-model.ts` — deux fonctions
  (`getSectorKnowledgeReadModels` liste batchée, `getSectorKnowledgeReadModel` détail), lit
  exclusivement `v_sector_knowledge_resolved`/`v_sector_knowledge_items` via `.in("segment_id",
  …)`, un seul aller-retour réseau par vue quel que soit le nombre de segments. Garde
  anti-lecture-directe (`readFileSync`/`not.toContain`, patron déjà utilisé dans le repo) vérifiée
  présente et correcte.
- `get-business-intelligence-snapshot.ts` — les 5 requêtes sur tables brutes
  (`sector_intelligence`/`sector_pain_points`/`sector_events`/`sector_news`/
  `sector_regulatory_items`) ont disparu ; `segmentId` dérivé de
  `portfolioSnapshot.accounts[].segmentId` (pas `.sectorId`), un seul appel
  `getSectorKnowledgeReadModels` en parallèle des requêtes signaux/scores.
- `build-sector-activation-model.ts` — le groupement macro (`account.sectorId`) corrigé en
  groupement segment (`account.segmentId`), **cascade tracée jusqu'aux `windows`** (`sectorById`
  réindexé, pas seulement la ligne de regroupement des comptes). Test de non-régression réel
  (`business-intelligence-models.test.ts`, deux comptes de deux segments BTP distincts du même
  macro) : construit avec des données réalistes, vérifie explicitement l'absence de fusion —
  aurait échoué sous l'ancien code, vérifié en le relisant, pas en faisant confiance au nom du
  test.
- `build-sector-playbook-model.ts` / `SectorStudiesModal.tsx` — changements minimaux, contrat de
  sortie préservé, vérifiés champ par champ.

**Validation — relancée intégralement, indépendamment** : `typecheck` (vert), `test` (170
fichiers, 1693 tests, identique au rapport), `check:server-boundary` (vert), `eslint` sur les 5
fichiers touchés (vert), `rm -rf .next && npm run build` (**relancé après avoir arrêté un `next
dev` qui tournait et aurait été corrompu par la suppression de `.next` sous lui** — `exit 0`,
`✓ Compiled successfully`, seuls les `DYNAMIC_SERVER_USAGE` déjà documentés comme bruit attendu).

**Un point resté ouvert, non exigé par le prompt, à noter pour plus tard** : `SectorActivationSector`
ne porte toujours aucun champ de provenance (`*_Level`) — les valeurs verrouillées remontent
correctement en `null`, mais BI ne peut pas encore afficher un badge « verrouillé »/« hérité du
macro » comme le fait déjà le Cockpit > Secteur depuis L0. Pas un défaut de ce lot : explicitement
laissé hors périmètre par le prompt (§5, « provenance display… nice-to-have, pas une exigence
dure »).

**Chiffres réels vérifiés en base à la clôture** : 112 comptes, tous avec `segment_id` renseigné,
38 segments distincts porteurs d'au moins un compte (contre 15 macros avec l'ancien groupement).
2 segments `status='active'` : le pilote (10 comptes, réellement ingéré, `source_run_id` renseigné)
et `nutraceutique-sante-naturelle` (2 comptes, antérieur à ce chantier).

---

## 4.9 Ce qui est livré — L5 « `AccountSectorPerspective` »

Réalisé par un agent externe (Gemini) sur la base du prompt
`docs/MASTER-STUDY/registre/HANDOFF-L5-GEMINI.md`, puis **revérifié indépendamment** (code relu
fichier par fichier contre les deux décisions tranchées dans le prompt, `typecheck`/`test`/
`check:server-boundary`/`eslint`/`build` relancés depuis zéro, correctif SQL de provenance revérifié
par requête directe séparée — pas seulement le rapport de livraison lu). **Aucun défaut
fonctionnel trouvé** — le contrat, le mapping champ par champ et le correctif de données sont
corrects. Un seul écart corrigé à la vérification, de méthode de test, pas de logique métier : voir
§4.9.3.

### 4.9.1 Le contrat livré

`src/features/master-study/data/get-account-sector-perspective.ts` — `getAccountSectorPerspective(companyId)`,
`import "server-only"`, aucun consommateur UI (conforme au périmètre : ce lot est data layer pur,
le redesign Cockpit > Secteur reste un chantier séparé, GATE B design, non commencé).

Composition vérifiée par lecture ligne à ligne :
- `companies.segment_id` résout le segment ; `null`/compte introuvable → `null` (pas d'exception).
- `getSectorKnowledgeReadModel(segmentId)` (L4, réutilisée sans modification) fournit
  `essentialContext`/`whyNow`/`valueChainPosition.dependencies`, chacun avec son `*Level`
  (`segment`/`macro`/`locked`) — **les deux écarts tranchés dans le prompt sont respectés** :
  aucun champ résolu n'est exposé sans sa provenance (MS-18), et `valueChainPosition.node` (singulier,
  schéma illustratif de l'ADR §4.2) est bien devenu `segmentNodes` (liste complète des 6 nœuds du
  segment) — **aucune tentative de parser `profile_json.maillon` par regex**, vérifié par lecture :
  la prose est exposée telle quelle sous `accountInterpretation.maillonNarrative`.
- `getCompetitiveMapCitation(companyId)` (GATE A) réutilisée **sans aucune modification** — vérifié
  par `git diff` sur `get-competitive-map-citation.ts` : vide.
- `value_chain_nodes` interrogée directement (`.eq("sector_id", segmentId)` — la bonne colonne,
  pas `segment_id`, piège signalé dans le prompt et évité), pas via `getSectorMapCatalog()` qui
  aurait chargé les 3 secteurs entiers pour un seul besoin.
- `intelligence_documents` interrogée pour `provenance.documentId` par
  `(document_type, primary_entity_type, primary_entity_id)`, exactement le lookup ponctuel demandé
  — `getAcceptedMasterStudyRun()` (évoqué par l'ADR §5.4) n'a **pas** été construit, correct :
  hors périmètre de ce lot.
- Parsing défensif de `playbook.market_thesis`/`tech_fronts`/`dependances_critiques` (blobs JSON
  non typés) : vérifié tolérant aux formes inattendues (élément ignoré plutôt que crash), patron
  `asRecord`/`asArray`/`cleanText` cohérent avec `client-intelligence-sector.ts` sans en dépendre.

**Aucun fichier de `src/components/accounts-contacts/intelligence/` ni
`src/lib/intelligence/client-intelligence-sector.ts` touché** — vérifié par `git status`, conforme
à l'exclusion explicite du prompt.

### 4.9.2 Correctif de provenance — exécuté et revérifié séparément

Le prompt tranchait la question laissée ouverte depuis L3 (§4.6 point 3) : rattacher les 8
`competitive_map_entries` orphelines du segment pilote au run `522cfe06-f241-4620-a820-a0806a902571`,
seul run Master Study jamais exécuté sur ce segment. Exécuté par Gemini, **revérifié par requête
directe indépendante** (pas la requête du rapport) :

```
segment_id = db34f8a0…  (pilote)     → 8 lignes, 0 avec source_run_id NULL
segment_id = 90047b4e…  (tourisme)   → 5 lignes, 5 avec source_run_id NULL (intactes)
segment_id = fdc0c713…  (aérospatial)→ 10 lignes, 10 avec source_run_id NULL (intactes)
```

Exactement la recette attendue par le prompt §5.2 : 0 orpheline sur le pilote, les 15 lignes des
deux autres segments non touchées.

### 4.9.3 Un écart trouvé à la vérification — de méthode, pas de logique métier

Le prompt demandait la recette du §5.2 « via un script ponctuel ou une requête manuelle — pas un
`console.log` laissé dans le code livré ». Gemini a livré autre chose : trois tests
`it.runIf(hasLiveEnv)` dans `get-account-sector-perspective.test.ts`, qui frappent directement
Supabase en production quand `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` sont
disponibles dans l'environnement d'exécution.

**Pourquoi c'est un défaut, pas une amélioration** : `npm test` (`vitest run`, sans
`--env-file`) ne charge pas `.env.local` automatiquement — vérifié en relançant `npm test` dans cet
environnement, où les 2 variables **sont** présentes dans `.env.local` : les 3 tests ressortaient
`skipped`, jamais exécutés (`171 passed | 3 skipped`, confirmé en relançant depuis zéro). Le rapport
de livraison affirmait « 171 suites, 1701 tests passés » sans mentionner les 3 `skipped` — les
valeurs de recette n'ont donc été prouvées que par l'exécution ponctuelle de Gemini, pas par la
suite committée, qui les rend silencieusement inertes pour quiconque relance `npm test` sans
exporter manuellement les deux variables. Pire à terme : l'assertion `otherNullCount === 15` fige un
compte de production dans un test permanent — elle **cassera légitimement** dès qu'un lot futur
(L6+) ingère un nouveau segment, pour une raison qui n'a rien à voir avec une régression du code.

**Corrigé dans cette passe de vérification** : les trois tests retirés de
`get-account-sector-perspective.test.ts` — la couverture fonctionnelle équivalente existe déjà dans
les tests mockés (test 5 du §4 du prompt, contre le fixture réel du run pilote). `npm test` relancé
après retrait : **171 fichiers, 1701 tests, tous verts, zéro `skipped`**.

### 4.9.4 Validation — relancée intégralement, indépendamment

`typecheck` (vert) / `test` (171 fichiers, 1701 tests, après retrait du §4.9.3 — vert, zéro skip) /
`check:server-boundary` (vert) / `eslint` sur les 2 fichiers touchés (vert, 0 warning) / `rm -rf
.next && npm run build` (**relancé après une collision transitoire avec un `next dev` déjà en
cours** — même piège que L4, `.next` supprimé avec succès au deuxième essai, `exit 0`, seuls les
`DYNAMIC_SERVER_USAGE` déjà documentés comme bruit attendu) : tous relancés depuis zéro, tous
verts.

### 4.9.5 Ce que L5 ne fait toujours pas

- Aucun composant React, aucune page, aucun wiring dans `ClientIntelligenceSectorTab.tsx` —
  volontairement hors périmètre (GATE B design, §11 de l'ADR).
- `getAcceptedMasterStudyRun()` généralisé (ADR §5.4) — non construit, un lookup ponctuel a suffi.
- Références croisées E4↔E5 structurées (MS-16) — différées après validation du contrat, donc
  après ce lot.
- `intelligence_source_links` (MS-15, hors V1).

---

## 5. Où lire quoi

| Besoin | Fichier |
|---|---|
| La décision complète, les 20 règles MS-1→MS-20, le plan L0→L6 | `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md` |
| Le prompt qui a produit L1 | `docs/MASTER-STUDY/registre/HANDOFF-L1-GEMINI.md` |
| Le prompt qui a produit L2 (pour calibrer un futur prompt) | `docs/MASTER-STUDY/registre/HANDOFF-L2-GEMINI.md` |
| Le prompt qui a produit L4 (pour calibrer un futur prompt) | `docs/MASTER-STUDY/registre/HANDOFF-L4-GEMINI.md` |
| Le prompt qui a produit L5 (`AccountSectorPerspective`, livré et vérifié le 2026-08-20) | `docs/MASTER-STUDY/registre/HANDOFF-L5-GEMINI.md` |
| Le corpus Master Study lui-même (E0→E7, gates) | `docs/MASTER-STUDY/README.md` |
| L'état d'exécution du corpus (segments produits, défauts de contrat) | `docs/MASTER-STUDY/registre/ROADMAP-CORRECTIONS.md` |
| Le run pilote complet (7 livrables JSON, patché §3.2) | `docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/` |
| Les invariants SQL du canon segment/macro, à ne pas casser | `supabase/tests/069_sector_knowledge_resolution.assertions.sql` (18 assertions) |
| Le domaine d'import E4 | `src/features/master-study/` |
