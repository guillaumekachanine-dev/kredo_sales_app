# Opportunities Workspace — Implementation Ledger

> Source de vérité **opérationnelle** du chantier. Le document canonique
> (`00-REFERENCE-CHANTIER-OPPORTUNITES.md`) porte le QUOI et le POURQUOI ; ce fichier porte
> l'ÉTAT RÉEL, lot par lot.

```
Chantier                      : Opportunities Workspace  (nom produit affiché : Opportunités)
Statut global                 : cadré
Branche                       : main   (branche unique — aucune feature branch)
Baseline initiale             : 61aba08ee1b35f848d223f96e08a1e1a624545ec
Dernier lot livré             : Lot 0 — Cadrage documentaire
Lot courant                   : Lot 1 — Socle Opportunities Workspace (🟡 en cours)
Prochain lot                  : Lot 2 — Primitive/layout 3 panneaux
Dernier SHA connu origin/main : b381cd2d   (2026-09-09, docs Lot 0 SHA)
```

## Table des lots

Statuts autorisés : `⬜ todo` · `🟡 en cours` · `✅ techniquement livré` · `⛔ bloqué`
(jamais `done` — ne jamais signifier qu'une QA visuelle a eu lieu).

| Lot | Objet | Statut | Commit | Notes |
|---|---|---|---|---|
| 0 | Cadrage documentaire | ✅ techniquement livré | `e7f0f79f` | Dossier `docs/FEATURES/opportunities_workspace/` + doc de référence + ledger + inventaire code/Data (§ 15) + roadmap 0→12 + DECISION LOG OPP-01→OPP-16 + OPEN QUESTIONS (DATA/PRODUCT/NAVIGATION/LEGACY/CROSS-FEATURE). **Aucun code applicatif.** |
| 1 | Socle Opportunities Workspace (`SectionRail` V2, `?section=`, 4 chapitres, header actif, compat `scope`, sortie de `(tabbed)`) | ⬜ todo | — | Root = `synthese` sans paramètre. `contextualModules: undefined`. Mobile inchangé. `missions/(tabbed)/layout.tsx` non modifié. |
| 2 | Primitive/layout 3 panneaux `OpportunitiesTriPanel` | ⬜ todo | — | Local à `src/features/opportunities/desktop/`. Pas de design system global (OPP-06). |
| 3 | Data Contract Synthèse (view-model serveur unique) | ⬜ todo | — | **Résout DATA-01 → OPP-17.** Réutilise `getNeedsStaffingSharedData` pour KPI 1 & 2. Aucune migration. |
| 4 | Synthèse Desktop | ⬜ todo | — | KPI + graphique pipe + compétences + processus + 5 échéances. SVG maison. |
| 5 | Data/detail Besoins & staffing | ⬜ todo | — | Réutilise loaders existants, évite les doubles queries. |
| 6 | Migration UI Besoins & staffing | ⬜ todo | — | Liste │ Détail │ « Staffing en cours ». **Résout PRODUCT-02/03/04, NAVIGATION-02, LEGACY-05.** Parité prouvée. |
| 7 | Avant-vente (structure + `EmptyState` V1) | ⬜ todo | — | Aucune fausse donnée. PRODUCT-05 reste ouverte. |
| 8 | Data Contract Planning (builder unique `OpportunityDeadline`) | ⬜ todo | — | **Résout DATA-03.** Partagé Synthèse + Planning (OPP-10). |
| 9 | Planning Desktop | ⬜ todo | — | Liste │ Planning mois/année │ Détails. Adapte le moteur existant. |
| 10 | Modules existants (Matching profil, Simulation devis, Post-Mortem) | ⬜ todo | — | Câblage vers capacités existantes. **Résout CROSS-01/02/03.** `Modélisation de CA` non affichée (OPP-11). |
| 11 | Legacy / compatibilité / navigation globale | ⬜ todo | — | Redirection `/staffing`, `main-menu` label « Opportunités », deep-links `scope`. **Coord. SHELL-0018 Phase 6.3.** |
| 12 | Nettoyage et clôture | ⬜ todo | — | Rapport `02-CLOSURE-AUDIT.md`. Statut global → « techniquement close ». |

## Décisions actées (miroir du DECISION LOG — détail dans le doc canonique § 16)

| ID | Décision | Lot |
|---|---|---|
| OPP-01 | « Besoins & staffing » devient « Opportunités » — workspace unique (pilotage opps + staffing + avant-vente + échéances + outils) | 0 |
| OPP-02 | `/missions/opps` reste la route canonique initiale (pas de migration de pathname) | 0 |
| OPP-03 | `SectionRail` V2 (SHELL-0018) est le standard Desktop | 0 |
| OPP-04 | `synthese` est le chapitre racine canonique, rendu sans paramètre `section` ; contrat `?section=synthese\|besoins\|avant-vente\|planning` | 0 |
| OPP-05 | Les 3 chapitres non-Synthèse suivent Liste/Main/Détails ; Synthèse est une exception (surface analytique pleine largeur) | 0 |
| OPP-06 | `/reports` (et `/missions` Engagements) = référence structurelle, pas source de code à dupliquer ; primitive locale `OpportunitiesTriPanel` (Lot 2), pas de design system global | 0 |
| OPP-07 | Mobile hors refonte ; branchement serveur `getDashboardDevice()` conservé ; jamais de composant Desktop lourd masqué en CSS | 0 |
| OPP-08 | Aucune nouvelle taxonomie d'étape ; contrat canonique = `src/lib/opportunities/stages.ts` (pas le tableau périmé de `CLAUDE.md`) | 0 |
| OPP-09 | `opportunities.stage` et `opportunity_candidates.status` jamais fusionnés ni mappés implicitement | 0 |
| OPP-10 | Synthèse et Planning partagent la même définition d'échéance ; un seul builder `OpportunityDeadline` | 0 |
| OPP-11 | `Modélisation de CA` n'est pas affichée avant implémentation (Future capability) | 0 |
| OPP-12 | Matching profil réutilise le module Consultants unique + moteur `src/lib/staffing-matching/` ; aucun composant copié, aucun recalcul de `match_scores` | 0 |
| OPP-13 | Simulation devis réutilise Financial Modeling (`FinancialModelingDesktopDialog`) ; aucune deuxième modale | 0 |
| OPP-14 | Post-Mortem réutilise `post-mortem-commercial` ; aucune nouvelle mission / workflow n8n / trigger | 0 |
| OPP-15 | Aucune capacité legacy supprimée sans preuve de parité ou décision produit inscrite au Decision Log | 0 |
| OPP-16 | Compat URLs legacy `scope` : `?scope=needs` et `?scope=staffing` → `section=besoins` (staffing = rail droit) ; résolution au parsing, redirection permanente pour les points d'entrée durs | 0 |

## Questions ouvertes en cours

Détail et classement (DATA / PRODUCT / NAVIGATION / LEGACY / CROSS-FEATURE) dans le doc
canonique § 17.

| ID | Résumé | Lot cible | Statut |
|---|---|---|---|
| DATA-01 | Source canonique du « CA du pipe » (A `weighted_gain` DB / B pipe pondéré UI / C brut / D restreint) | 3 | **ouverte** — bloque la Synthèse UI |
| DATA-02 | Population exacte du vivier alimentant le Top 5 compétences | 3 | **déléguée** au Consultants Workspace (C-16/C-26) |
| DATA-02b | Critère de classement du Top 5 compétences (nb profils / occurrences / pondéré / min_level) | 3 | **ouverte** |
| DATA-03 | Règle d'arbitrage `OpportunityDeadline` en cas de dates multiples | 8 | **ouverte** |
| ~~DATA-04~~ | Fusion `stage` + `opportunity_candidates.status` dans le graphique Processus ? | 0 | ✅ tranché (OPP-09) — non |
| ~~DATA-05~~ | Taxonomie d'étape commerciale | 0 | ✅ tranché (OPP-08) — `stages.ts` |
| PRODUCT-01 | Représentation unifiée `stage` + `status` (buckets de progression) | 3 | **ouverte** |
| PRODUCT-02 | Quelles capacités Kanban survivent après la refonte | 6 | **ouverte** |
| PRODUCT-03 | Sélection d'entité URL-addressable (`?opp=`) partagée Liste/Planning/Détails | 6 / 9 | **ouverte** — reco : oui |
| PRODUCT-04 | Forme du détail besoin (inline / drawer / `OpportunityDetailView`) | 6 | **ouverte** |
| PRODUCT-05 | Relation opportunité ↔ projet avant-vente ↔ mission/projet gagné | 7 / futur | **ouverte** — bloque le contenu métier Avant-vente |
| NAVIGATION-01 | Conversion des deep-links `scope` vers `?section=` | 1 / 11 | **partiellement tranchée (OPP-16)** |
| NAVIGATION-02 | Sort du contrat `?view=` / `?stage` / `?priority` / `?practice` | 6 | **ouverte** |
| ~~NAVIGATION-03~~ | `?section=` vs pathname | 0 | ✅ tranché (OPP-04) |
| LEGACY-01 | Consommateurs restants de `missions/(tabbed)` bloquant le retrait de `SectionNavBarSlot` | 11 | **partiellement audité** — `actives` + `projets` restent ; retrait global = Phase 6 |
| LEGACY-02 | `OpportunitiesDesktopView.tsx` orphelin — suppression | 12 | **ouverte** |
| LEGACY-03 | Composants `src/components/staffing/` encore montés après migration | 6 / 12 | **ouverte** |
| LEGACY-04 | `OpportunitiesKpiSection.tsx` (`getWeightedValue`) — réconcilier ou déprécier | 3 | **ouverte** — dépend de DATA-01 |
| LEGACY-05 | HEX en dur dans `NeedsStaffingWorkspace.tsx` → variables `@theme` | 6 | **ouverte** |
| CROSS-01 | Point d'entrée partagé propre pour « Matching profil » | 10 | **ouverte** |
| CROSS-02 | Launcher officiel de `post-mortem-commercial` depuis un module contextuel | 10 | **ouverte** |
| CROSS-03 | « Simulation devis » disponible sans contexte ou seulement avec contexte | 10 | **ouverte** — reco : toujours dispo |

## Baseline technique constatée (2026-09-09, `61aba08e`)

### Routes et fichiers

- `/missions/opps` — `src/app/(app)/missions/(tabbed)/opps/page.tsx`
  - garde serveur : redirige vers `?scope=needs` si `scope` absent (`buildNeedsStaffingUrl` +
    `parseNeedsStaffingUrlState`).
  - `getDashboardDevice()` → branche `mobile` (dataset léger) / `desktop` (5 loaders parallèles).
  - rend `<NeedsStaffingWorkspace>` (client, 895 lignes).
  - layout : `missions/(tabbed)/layout.tsx` → `SectionNavBarSlot` (**no-op** : l'entrée
    `main-menu` « Besoins & Staffing » n'a pas de `tabs`) + `MissionsTabbedShell`
    (`SectionTabBar` + onglets d'entités via `useMissionsTabStore` + `MissionsEntityPanel`).
- `/missions/opps/[id]` — `src/app/(app)/missions/opps/[id]/page.tsx` — **hors `(tabbed)`**
  (layout `missions/layout.tsx` seul) → `OpportunityDetailView`. Édition : `[id]/modifier/`.
- `/staffing` — `src/app/(app)/staffing/page.tsx` → `redirect(resolveLegacyStaffingRedirect(...))`
  → `/missions/opps?scope=staffing`.
- `/missions` (Engagements V2) — `src/app/(app)/missions/page.tsx` + `EngagementsDesktopView`
  (`SectionRail` inline, `?vue=`) — **modèle de référence du Lot 1**.

### Contrat URL actuel (`src/lib/needs-staffing/url-state.ts`)

`?scope=needs|staffing` (**obligatoire**) · `?view=list|kanban|planning` · `?stage` ·
`?priority` · `?practice` · `?sort=acv` · `?direction=asc|desc`.
État piloté **client-side** (`use-needs-staffing-url-state.ts`) ; le serveur ne lit que `scope`.

### Composants (lignes)

| Fichier | L. | Rôle |
|---|---|---|
| `src/components/needs-staffing/NeedsStaffingWorkspace.tsx` | 895 | shell client monolithique (scope/view/filtres/kanban/planning/édition étape/simulation/drawer). ⚠️ HEX en dur. |
| `src/components/needs-staffing/NeedsListView.tsx` | 434 | liste besoins Desktop |
| `src/components/needs-staffing/StaffingListWorkspaceView.tsx` | 153 | liste staffing (workspace) |
| `src/components/needs-staffing/UnifiedPlanningView.tsx` | 667 | planning unifié besoin+staffing, échelles mois/trim/année/semaine |
| `src/components/needs-staffing/StageQuickEditorDialog.tsx` | 242 | édition rapide d'étape |
| `src/components/needs-staffing/StageTimeline.tsx` | 248 | timeline d'étape |
| `src/components/needs-staffing/NewStaffingButton.tsx` | 270 | création staffing |
| `src/components/staffing/StaffingListView.tsx` | 195 | liste staffing |
| `src/components/staffing/StaffingKanbanView.tsx` | 230 | kanban staffing |
| `src/components/staffing/StaffingPlanningView.tsx` | 309 | planning staffing |
| `src/components/staffing/AssistanceCaseDrawer.tsx` | — | drawer unique (perspectives candidate/opportunity) |
| `src/components/missions/kanban/OpportunitiesKanbanView.tsx` | 189 | kanban besoins/opps |
| `src/components/missions/planning/OpportunitiesPlanningView.tsx` | 694 | planning opps |
| `src/components/missions/NewOpportunityButton.tsx` | 42 | création opportunité |
| `src/components/missions/OpportunitiesKpiSection.tsx` | — | KPI + `getWeightedValue` (= option B de DATA-01) |
| `src/components/missions/OpportunitiesDesktopView.tsx` | — | **orphelin** (0 import externe) |
| `src/components/missions/opportunity-detail/OpportunityDetailView.tsx` | — | fiche détail opportunité (route `[id]`) |

### Loaders

| Fichier | Produit |
|---|---|
| `_data/get-needs-staffing-shared.ts` | `NeedsStaffingSharedData` : `kpis {openNeedsCount, activePositioningsCount, coverageRate}`, `openNeeds[]`, `coverageByOpportunityId` |
| `_data/get-opportunities-list.ts` | `MissionsListRow[]` (opt. `onlyStaffingNeeds`) |
| `_data/get-opportunities-planning.ts` | `OpportunityPlanningData[]` (+ `candidates[]`, `interactions[]`) |
| `_data/get-opportunity-detail.ts` | détail opportunité |
| `_data/get-opportunity-skills-cloud.ts` | nuage de compétences |
| `staffing/_data/get-staffings-list.ts` | `StaffingListRow[]`, `MobileStaffingRow[]` |
| `staffing/_data/get-staffings-planning.ts` | `StaffingPlanningData[]` |

### Actions (`src/app/(app)/missions/_actions/`, lignes)

`create-opportunity` (121) · `update-opportunity` (303) · `opportunity-staffing` (270) ·
`update-staffing-stage` (46) · `opportunity-skills` (214) · `opportunity-contacts` (366) ·
`opportunity-events` (145) · `opportunity-interactions` (74) · `search-accounts` (58) ·
`search-contacts` (148) · `upsert-account` (100) · `mission-contacts` (197) ·
`update-mission` (102) · `update-mission-risk` (62) · `load-engagements-overview` (15).

### Lib

- `src/lib/needs-staffing/` : `url-state.ts`, `use-needs-staffing-url-state.ts`, `coverage.ts`
  (`COVERING_POSITIONING_STATUSES`, `NEGATIVE_TERMINAL_POSITIONING_STATUSES`,
  `STAFFING_NEED_OR_FILTER`, `calculateCoverageMetrics`), `model.ts` (`filterNeedsRows`,
  `filterStaffingRows`, `cycleAcvSort`), `create-actions.ts`.
- `src/lib/opportunities/stages.ts` — `SalesStage` = `qualification · recherche_profil ·
  cv_envoyes · entretien_client · contractualisation · gagne · perdu · abandonne · non_traitee`
  + alias legacy + helpers. **Contrat canonique (OPP-08).**
- `src/lib/staffing-matching/` — moteur unique besoin-centrique (`runOpportunityMatching`).
- `src/hooks/use-staffing-drawer-store.ts` — `useStaffingDrawerStore` (drawer unique).

### Data live (2026-09-09 — `information_schema` + comptages)

- `opportunities` : **32 lignes**, **5 ouvertes** (toutes besoins de staffing). `stage` live :
  `gagne`(15)·`perdu`(7)·`abandonne`(5)·`recherche_profil`(2)·`cv_envoyes`(1)·`qualification`(1)·`contractualisation`(1).
  `opportunity_type` : `staffing`(18)·`forfait`(4)·`null`(3)·`audit`(2)·`extension`(2)·`cross_sell`(2)·`conseil`(1).
  `requires_staffing` : `true`(26)/`false`(6).
  Générées : `weighted_gain = estimated_gain * conviction / 100` (NULL si `estimated_gain` NULL — 3/32) ;
  `acv = CASE WHEN duration_days & target_daily_rate NOT NULL THEN duration_days * target_daily_rate ELSE NULL`.
  Couverture : `estimated_gain` 29/32 · `acv` 31/32 · `target_daily_rate` 31/32 · `duration_days` 32/32 ·
  `target_close_date` 28/32 · `start_date` 32/32 · **`next_action_at` 2/32** · `company_id` 31/32.
  `practice` : **texte libre, 12 valeurs distinctes non normalisées, aucune FK, pas de `practice_id`.**
- `opportunity_candidates.status` live : `retenu`(12)·`identifie`(5)·`abandonne`(5)·`refuse_client`(4)·
  `preselectionne`(3)·`refuse_candidat`(3)·`entretien_realise`(2)·`envoye_client`(2)·`propose_interne`(2)·`entretien_planifie`(1).
  Colonnes : `next_action` (text), `status_changed_at`, `proposed_at`, `sent_to_client_at`.
- `opportunity_skills.importance` ∈ `{indispensable, souhaitee, bonus}` ; `min_level`, `min_years`, `weight` (NOT NULL).
- `person_skills` : `level`, `years`, `profile_rank`, `confidence`, `source`.
- `candidates.status` ∈ `{vivier, recrute, en_process, nouveau, qualifie, indisponible, ko_manager, propose, refuse, archive}`.
- `calendar_events` : `opportunity_id` **208 lignes (34 futures)** ; `opportunity_candidate_id`,
  `candidate_id`, `mission_id` ; `starts_at`, `ends_at`, `event_type`.
- `match_scores` : **644 lignes / 24 opportunités** (cache du moteur `staffing-matching`).

### Intersections chantier

- **SHELL-0018 Phase 6.3** — `/missions/opps` est dans `missions/(tabbed)` ; la sortie du
  shell `(tabbed)` et le retrait de `SectionNavBarSlot` sont coordonnés (Lot 11).
  `07-HANDOFF-PHASE-6-REPRISE-CHANTIER.md` § 13.4.A cite explicitement « unifier les anciennes
  sous-routes missions avec le nouveau shell /missions ».
- **Consultants Workspace** — définition vivier canonique (C-16/C-26), module
  `src/features/consultants/modules/profile-matching/`, moteur `src/lib/staffing-matching/`.
- **Financial Modeling** — `@/features/financial-modeling` (déjà importé dans le workspace).
- **Intelligence Missions** — mission `post-mortem-commercial` (`MISSION_CATALOG[5]`,
  `MISSION_COMPOSER_ACTION_CONFIGS.post_mortem_pipeline`, `use-mission-launcher`).

## Dettes connues (à traiter dans les lots indiqués)

- **HEX en dur** dans `NeedsStaffingWorkspace.tsx` (`#FFC107`, `#9C27B0`, `#607D8B`, `#FF5252`,
  `#D8A400`, `#455A64`) — LEGACY-05, Lot 6.
- **`OpportunitiesKpiSection.getWeightedValue`** = option B de DATA-01 ; à réconcilier avec le
  view-model Synthèse — LEGACY-04, Lot 3.
- **`OpportunitiesDesktopView.tsx`** orphelin — LEGACY-02, Lot 12.
- **`CLAUDE.md` périmé** sur `opportunities.stage` (liste `detection/besoin_confirme/negociation`
  absente des données live) et sur les comptages (24 opps / 18 `match_scores`). Le code
  (`stages.ts`) et la base font foi.
- **Compat `scope`** : le contrat est aujourd'hui obligatoire (redirection serveur) et porté
  par le Mobile (`getMobileTabsForPath`) — à préserver jusqu'à migration Mobile explicite.

## Divergences constatées avant code — Lot 1 (2026-09-09)

Consignées **avant** modification du code, conformément au protocole § 20.1.

1. **Routes parallèles Next.js interdites.** Conserver
   `src/app/(app)/missions/(tabbed)/opps/page.tsx` **et** créer
   `src/app/(app)/missions/opps/page.tsx` fait échouer `next build`
   (« two parallel pages resolve to the same path /missions/opps » — les route
   groups `(tabbed)` ne changent pas le pathname). Le retrait de l'ancienne route
   n'est donc **pas** reportable à un « Lot 1.1 » : il est fait **dans le Lot 1**.
   Parité assurée par montage **direct et inchangé** de `NeedsStaffingWorkspace`
   (mêmes loaders desktop, même branche mobile, même contrat de props) dans le
   chapitre `besoins`. Le doc canonique § 15 / fiche Lot 1 est ajusté en
   conséquence (le « peut rester un lot 1.1 si prudence » n'est pas applicable ici).

2. **`buildOpportunitiesSectionHref` — périmètre de nettoyage.** Au changement de
   chapitre, le builder supprime, en plus de `section`, les paramètres **métier
   legacy** `scope` · `view` · `stage` · `priority` · `practice` · `sort` ·
   `direction` (état du chapitre frère, non pertinent sur le chapitre cible). Tous
   les **autres** query params (réellement tiers) sont strictement préservés
   (`new URLSearchParams(searchParams.toString())`). → **OPP-17**.

3. **Shell alimenté par `searchParamsString` (prop), pas `useSearchParams()`.**
   L'orchestrateur serveur relit l'URL à chaque navigation et passe la query
   courante au shell, qui construit les `href` de chapitre via
   `buildOpportunitiesSectionHref`. Évite une Suspense boundary `useSearchParams`
   et rend `OpportunitiesDesktopShell` testable sans router. Navigation **100 %
   URL-driven** (aucun `useState` de navigation). → **OPP-18**.

4. **Mobile — sortie de `(tabbed)/layout.tsx`.** `/missions/opps` perd l'enveloppe
   `SectionNavBarSlot` + `MissionsTabbedShell`. **Aucun impact comportemental
   Mobile** : `SectionNavBarSlot` était un **no-op** sur l'entrée « Besoins &
   Staffing » (pas de `tabs`), et le Mobile Besoins (`NeedsMobileCards` via
   `NeedsStaffingWorkspace`) n'utilise **pas** `useMissionsTabStore` /
   `MissionsEntityPanel`. La barre d'onglets Mobile reste portée par
   `main-menu.config.ts` (`getMobileTabsForPath`) + `MobileNav` — **non modifiés**.
   Le chapitre `besoins` monte le même composant avec les mêmes données.

## Journal des lots

### Lot 0 — Cadrage documentaire — ✅ techniquement livré (2026-09-09)

- **Réalisé** : création de `docs/FEATURES/opportunities_workspace/` avec `README.md`,
  `00-REFERENCE-CHANTIER-OPPORTUNITES.md`, `01-IMPLEMENTATION-LEDGER.md`.
- **Audit code** : `/missions/opps` (shell `(tabbed)`, `NeedsStaffingWorkspace`, contrat
  `?scope=`), loaders `_data/`, lib `needs-staffing` / `opportunities` / `staffing-matching`,
  drawer store, `main-menu.config` (`getMobileTabsForPath`), page de référence `/reports` +
  `/missions` Engagements, primitive `SectionRail`, modules cross-feature (Consultants
  profile-matching, Financial Modeling, Intelligence Missions post-mortem).
- **Audit Data** (live 2026-09-09) : schéma et couverture de `opportunities`,
  `opportunity_candidates`, `opportunity_skills`, `person_skills`, `calendar_events`,
  `candidates`, `match_scores`.
- **Livrables** : inventaire code (§ 15), inventaire Data (§ 8), roadmap Lots 0→12 (§ 18),
  fiches de lot autonomes (§ 19), DECISION LOG OPP-01→OPP-16 (§ 16), OPEN QUESTIONS (§ 17,
  5 catégories), protocoles agent (§ 20).
- **Questions résolues immédiatement par l'audit** : DATA-04 (OPP-09), DATA-05 (OPP-08),
  NAVIGATION-03 (OPP-04), NAVIGATION-01 volet parsing (OPP-16), LEGACY-01 volet audit.
- **Questions restées ouvertes** (indécidables sans arbitrage produit ou Data) : DATA-01,
  DATA-02b, DATA-03, PRODUCT-01→05, NAVIGATION-02, LEGACY-02/03/04/05, CROSS-01/02/03.
- **Gates** : `git diff --check` (aucun code applicatif touché) ; relecture manuelle
  (numérotation, liens, cohérence main-only, absence de règle QA navigateur, `Modélisation de
  CA` non rendue comme disponible).
- **Code applicatif modifié** : **non**.
- **Commit** : `e7f0f79ffed19d8a33323f37024d063eb1148fd5` — `docs(opportunities): bootstrap Opportunities Workspace roadmap`.
- **NEXT LOT** : Lot 1 — Socle Opportunities Workspace.
