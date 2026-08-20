# Handoff — ADR-0021, suite des lots

**Autoportant.** Si vous reprenez ce chantier à froid, ce fichier suffit — vous n'avez pas besoin
d'avoir lu la conversation qui a produit l'ADR. Commencez par la section 1.

- **ADR de référence** : `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md`
  (v2.0, **Accepté** le 2026-08-20). Toute décision normative (MS-1 → MS-20) citée ici y est
  définie en détail — ce handoff ne les reformule pas, il dit où en est leur mise en œuvre.
- **État au 2026-08-20, fin de journée** : **L0 et L1 livrés et validés indépendamment**
  (build vert, migration appliquée en base, assertions rejouées deux fois — par l'exécutant et
  séparément par vérification indépendante). **L2 non commencé.**
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

## 3. Prochain lot — L2 « importeur E4 + RPC transactionnelles »

**Ne pas commencer avant d'avoir lu `docs/adr/ADR-0021-…` §7 (l'importeur) et §9.1/§9.2
(amendements E4/E6, dont `budgets_18_36_mois` retiré du contrat) en entier.**

Résumé du périmètre (le détail complet est dans l'ADR §7 et §11, ligne L2 — ne pas le reformuler
ici avant d'avoir lu ces sections) :

- `src/features/master-study/domain/` : contrats TypeScript dérivés de `docs/MASTER-STUDY/schemas/`.
- Mapping E4 (`04-secteur.json` du run pilote) → canon `sector_intelligence` / `sector_events` /
  `sector_pain_points` / `sector_regulatory_items` / `value_chain_nodes`, chacun estampillé du
  même `source_run_id` — **l'infrastructure de colonnes existe depuis L1**, ce lot est le premier
  écrivain.
- RPC `SECURITY DEFINER` transactionnelle par famille de blocs (MS-10) : le run, le document et les
  lignes canoniques entrent ensemble, ou rien n'entre. `ingest-competitive-map.ts` est amené au
  même régime dans le même lot — c'est lui qui a perdu son document d'archive en silence sur le
  segment pilote (ADR §1.3b), la preuve qu'une écriture non atomique n'est pas hypothétique ici.
- `scripts/ingest-master-study.mts`, `--dry-run` par défaut, calqué sur le patron
  `scripts/measure-hiring-intensity.mts`.
- Amendements de contrat déjà tranchés à appliquer dans ce lot : `budgets_18_36_mois` retiré de
  `docs/MASTER-STUDY/schemas/sector-knowledge.schema.json` et du prompt E4 ; E4 écrit désormais
  dans `value_chain_nodes` (amorce), `09-ETAPE-E6-CHAINE-DE-VALEUR.md` amendé en conséquence.

**Ce que L2 ne fait pas** : ingérer réellement le segment pilote (`--dry-run` seulement — c'est
L3), toucher aux read models de lecture (L4/L5).

---

## 4. Où lire quoi

| Besoin | Fichier |
|---|---|
| La décision complète, les 20 règles MS-1→MS-20, le plan L0→L6 | `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md` |
| Le prompt qui a produit L1 (pour calibrer un futur prompt L2) | `docs/MASTER-STUDY/registre/HANDOFF-L1-GEMINI.md` |
| Le corpus Master Study lui-même (E0→E7, gates) | `docs/MASTER-STUDY/README.md` |
| L'état d'exécution du corpus (segments produits, défauts de contrat) | `docs/MASTER-STUDY/registre/ROADMAP-CORRECTIONS.md` |
| Le run pilote complet (7 livrables JSON) | `docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/` |
| Les invariants SQL du canon segment/macro, à ne pas casser | `supabase/tests/069_sector_knowledge_resolution.assertions.sql` (18 assertions) |
