# HANDOFF — Enrichissement Business Intelligence (Accueil · Analyse sectorielle · Playbook)

**Destinataire** : Gemini
**Rédigé par** : Claude Code
**Date** : 2026-08-22
**Statut** : Lots 0 et 1 livrés et vérifiés en base + build. Prêt pour Lot 2.

---

## 0. Avant de commencer

Ce chantier vit dans le repo KREDO (`kredo_sales_app`). Lis d'abord `CLAUDE.md` à la racine —
il fait autorité sur la stack (Next.js 16 App Router, Tailwind v4 `@theme`, pas de shadcn,
composants maison sur `<dialog>` natif), les invariants Supabase (multi-tenant `workspace_id`,
RLS, fonctions `private.*` non exposées à PostgREST) et la méthode de travail attendue
(vérifier en base avant d'affirmer, trancher plutôt que présenter un menu, valider
`typecheck → test → check:server-boundary → lint → build` avant de déclarer un lot fini).

**Documents de ce chantier, dans l'ordre de lecture** :

1. `docs/MASTER-STUDY/distribution_données/KREDO_Cadrage_Analyse_Sectorielle_Enrichie_v1.2.md`
   — le cadrage qui fait foi, verrouillé. Les v1.0/v1.1 dans le même dossier sont l'historique
   des arbitrages, à consulter seulement en cas de doute sur le *pourquoi* d'une décision v1.2.
2. `docs/MASTER-STUDY/distribution_données/LOT-0-RAPPORT.md` — rapport de clôture du Lot 0,
   **avec une correction post-clôture datée du 22/08** en bas de fichier (§ sur
   `source_corpora`/`source_corpus_items`) : lis tout le fichier, pas seulement le corps
   principal, la correction change une conclusion du rapport initial.
3. Ce document — l'état d'avancement Lot 1 et le point de reprise Lot 2.

**Segment pilote** : `seg-parfumerie-compositions-b2b` (id `db34f8a0-9d9e-4585-acd6-2fbbdd1baad6`),
macro parent `parfumerie-aromes` (id `e3950aea-5e32-40df-8565-3366ec8a5cc6`). Étude source :
`docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/04-secteur.md` (+ `.json`).

---

## 1. Ce qui est livré et vérifié

### Lot 0 — fondations de schéma

- `sector_intelligence.playbook` de `seg-parfumerie-compositions-b2b` porte 12 clés : les 9
  existantes (`market_thesis`, `risks`, `personas`, `objections`, `tech_fronts`,
  `entry_points`, `roi_arguments`, `economic_models`, `dependances_critiques`) + 3 nouvelles
  ajoutées ce lot (`cadre`, `message_sectoriel`, `trajectoires`). Contenu repris mot pour mot
  de `04-secteur.md`.
- `economic_models` (9 entrées) porte un champ `type: "bloc_client" | "modele_economique"` (4/5).
- Réutilisation des 8 comptes `parfumerie-aromes` pour le pilote : **déjà faite**, par
  l'ingestion MASTER-STUDY E4 du 2026-08-20 (`competitive_map_entries.segment_id` posé sur les
  8 lignes macro, `source_run_id = 522cfe06-f241-4620-a820-a0806a902571`,
  `is_benchmark_account` porte la provenance). Rien à refaire sur ce point.
- `references/schema-supabase.md` du skill retiré `kredo-sector-intelligence` est un
  **tombstone volontaire** (supprimé 3 fois après avoir dérivé) — ne pas le recréer. Le skill
  courant est `kredo-master-study` (`.agents/skills/kredo-master-study/`).

### Correction Lot 0 (22/08, après clôture) — résolution des sources

Le rapport de clôture initial affirmait à tort que `source_corpora`/`source_corpus_items`
étaient sans rapport avec ce chantier. **C'est faux** : le corpus E3 du segment pilote y est
bien ingéré (28 sources sur les 29 de l'ANNEXE A de `04-secteur.md`, corpus
`id = e0e31867-7cb8-431b-812b-8b96163c96c0`). Correctifs livrés :

- Migration `supabase/migrations/20260822092309_source_corpus_items_src_number.sql` — colonne
  générée `source_corpus_items.src_number integer` (dérivée de `external_src_id`, format
  `SRC-0NN`), + index. **Appliquée en base**, types régénérés.
- `src/features/business-intelligence/data/get-sector-source-resolution.ts` —
  `getSectorSourceResolution(sectorId)` résout `src_number → {publisher, url, tier, attests,
  consultedAt}` via `source_corpora` (courant) → `source_corpus_items` → `source_catalog`.
  3 tests unitaires.
- **Limite assumée** : `url` renvoie `source_catalog.homepage_url` (site de l'éditeur), pas
  l'URL exacte citée dans l'étude (scope du registre = un éditeur = un domaine, pas une
  citation). L'URL précise n'existe qu'en JSON local (`04-secteur.json`), jamais en base.
- Écart 28 vs 29 sources élucidé : `SRC-009` (Insee) absorbé par `SRC-015` (même éditeur,
  `source_catalog` scopé par domaine + `UNIQUE(corpus_id, source_id)` sur
  `source_corpus_items`) — structurel, sans impact (aucun `src_ids` du playbook ne référence
  la source 9).
- **Dette non traitée, signalée mais pas corrigée** : `.agents/skills/kredo-master-study/
  references/blocs-et-destination.md` documente le bloc E3 comme atterrissant dans
  `intelligence_sources` — c'est faux pour ce run (c'est `source_corpora`/`source_corpus_items`).
  À corriger si tu touches ce fichier, sinon laisser tel quel.

### Lot 1 — fondation transverse UI

Trois composants dans `src/features/business-intelligence/shared/`, design system
`edito_bright_design` (lire `docs/DESIGN/design-systems/global_design/kredo_actual_design/
edito_bright_design.md` avant toute modif UI de cette zone — palette navy/brass/petrol,
typo, densité, tout y est cadré) :

- **`SourceChip.tsx`** — `SourceChip`/`SourceChipList`. Prop-driven (`source?: ResolvedSource
  | null` ou `resolve?: (id) => ResolvedSource | null`), popover au clic (pas hover-only,
  accessible tactile), état "non résolu" géré proprement. À alimenter avec
  `getSectorSourceResolution` côté serveur.
- **`DoncCallout.tsx`** — le callout "DONC, commercialement" qui clôt presque chaque item du
  playbook (`donc_commercialement` dans `market_thesis`, `tech_fronts`,
  `dependances_critiques`, `economic_models`). Retire automatiquement le préfixe déjà présent
  dans le texte source pour ne jamais le doubler avec le badge.
- **`CorpusConfidenceBanner.tsx`** — le bandeau de confiance persistant, branché sur de la
  vraie donnée (`source_corpora.quality_verdict`/`activation_state`/`snapshot_date`/`gaps`).
  Réutilise `CorpusQualityVerdict` de `src/features/source-management/domain/
  source-management-contracts.ts` plutôt que d'en recréer un.

Token CSS ajouté : `--color-edito-amber-soft: #FEF3C7` dans `src/app/globals.css` (manquait,
utilisé par `DoncCallout`).

**Boucle de validation passée sur ces deux lots** : `typecheck` → `test` (181 fichiers / 1740
tests) → `check:server-boundary` → `lint` (fichiers touchés) → `build` — tout vert à chaque
étape.

---

## 2. Ce qui n'est PAS fait

- Aucun composant de Lot 2+ n'existe encore. `SourceChip`/`DoncCallout`/`CorpusConfidenceBanner`
  sont prêts mais **non consommés** dans aucune page réelle pour l'instant.
- `SectorAnalysisChapterDesktop.tsx`/`SectorAnalysisChapterMobile.tsx` (déjà existants,
  `src/features/business-intelligence/chapters/`) ne lisent pas encore `cadre`,
  `message_sectoriel`, `trajectoires`, ni le `type` de `economic_models`.
- `KREDO_Cadrage_Mode_Terrain_v1.0.md` (Mode Terrain mobile, Lot 13) n'est toujours pas dans le
  repo — non bloquant pour les Lots 2-12 (confirmé par le cadrage v1.2 §8).

---

## 3. Prochaine étape — Lot 2

**Contenu (cadrage v1.2, table des lots)** : Onglet Accueil / « Synthèse & Conclusions » — les
5 thèses (`playbook->'market_thesis'`), le message sectoriel, le cadre (périmètre + hors
champ), les trajectoires 18-36 mois. Dépend de Lot 0 (fait) et Lot 1 (fait).

**Où lire la donnée** : `getSectorKnowledgeReadModel(segmentId)` /
`getSectorKnowledgeReadModels(segmentIds)` dans `src/features/master-study/data/
get-sector-knowledge-read-model.ts` — expose déjà `playbook: Record<string, unknown> | null`
en brut (lit `v_sector_knowledge_resolved`, **jamais** `sector_intelligence` en table brute :
règle non négociable documentée dans ce même fichier et testée dans son `.test.ts`). Les 3
nouvelles clés y sont donc déjà accessibles sans rien modifier côté data layer — à parser côté
composant, sur le même patron défensif que `parseKeyPlayers`/`parseCaveats` dans
`SectorAnalysisChapterDesktop.tsx`.

**Où construire** : probablement un nouveau fichier `src/features/business-intelligence/home/`
ou `chapters/` selon si l'onglet Accueil existant (`SegmentHomeDashboardDesktop.tsx`/
`SegmentHomeDashboardMobile.tsx` dans `home/`) doit être étendu ou si une nouvelle section y
est insérée — à trancher en lisant l'existant avant d'écrire.

**Rappel d'invariant** : Desktop et Mobile restent deux composants séparés distribués côté
serveur (jamais un composant caché en CSS), conforme à `edito_bright_design` §3 et §8 et à
ADR-0006.

---

## 4. Pièges déjà rencontrés sur ce chantier — ne pas les rejouer

- **Ne pas confondre** `docs/FEATURES/business_intelligence/` (chantier différent, déjà
  clôturé le 22/08 : "Business Intelligence mono-segment", Lots 1-4, route
  `/intelligence?segment=<uuid>&tab=<chapter>`) avec le chantier de ce handoff, qui porte le
  même nom de famille mais un découpage en lots différent (0-14) et vit dans
  `docs/MASTER-STUDY/distribution_données/`.
- **Ne jamais lire `sector_intelligence`/`sector_pain_points`/`sector_events`/`sector_news`/
  `sector_regulatory_items` en table brute** côté app — toujours `v_sector_knowledge_resolved`
  et `v_sector_knowledge_items`. Garde testée automatiquement (grep du code source dans
  `get-sector-knowledge-read-model.test.ts`).
- **`source_catalog` est scopé par domaine, pas par citation.** Ne pas supposer qu'une
  résolution de source donne l'URL exacte d'un fait — c'est le `homepage_url` de l'éditeur.
- Avant toute migration DDL : vérifier le schéma réel (`information_schema`, pas ce document ni
  CLAUDE.md qui sont des instantanés), écrire le fichier dans `supabase/migrations/`, appliquer
  via l'outil de migration (jamais `execute_sql` pour du DDL), puis `npm run db:types`.
- `.next/` périmé produit de faux `TS6200`/`TS2300` (fichiers dupliqués avec suffixe " 2" —
  dette connue et documentée dans `CLAUDE.md`) — ignorer ces deux erreurs précises si elles
  réapparaissent, ne pas les prendre pour une régression réelle.
