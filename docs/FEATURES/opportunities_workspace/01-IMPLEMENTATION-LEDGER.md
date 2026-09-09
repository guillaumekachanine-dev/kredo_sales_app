# Opportunities Workspace — Implementation Ledger

> Source de vérité **opérationnelle** du chantier. Le document canonique
> (`00-REFERENCE-CHANTIER-OPPORTUNITES.md`) porte le QUOI et le POURQUOI ; ce fichier porte
> l'ÉTAT RÉEL, lot par lot.

```
Chantier                      : Opportunities Workspace  (nom produit affiché : Opportunités)
Statut global                 : cadré
Branche                       : main   (branche unique — aucune feature branch)
Baseline initiale             : 61aba08ee1b35f848d223f96e08a1e1a624545ec
Dernier lot livré             : Lot 7 — Avant-vente (structure + EmptyState V1)
Lot courant                   : aucun
Prochain lot                  : Lot 8 — Data Contract Planning (builder OpportunityDeadline)
Dernier SHA connu origin/main : __LOT7_SHA__   (2026-09-09, commit Lot 7)
```

## Table des lots

Statuts autorisés : `⬜ todo` · `🟡 en cours` · `✅ techniquement livré` · `⛔ bloqué`
(jamais `done` — ne jamais signifier qu'une QA visuelle a eu lieu).

| Lot | Objet | Statut | Commit | Notes |
|---|---|---|---|---|
| 0 | Cadrage documentaire | ✅ techniquement livré | `e7f0f79f` | Dossier `docs/FEATURES/opportunities_workspace/` + doc de référence + ledger + inventaire code/Data (§ 15) + roadmap 0→12 + DECISION LOG OPP-01→OPP-16 + OPEN QUESTIONS (DATA/PRODUCT/NAVIGATION/LEGACY/CROSS-FEATURE). **Aucun code applicatif.** |
| 1 | Socle Opportunities Workspace (`SectionRail` V2, `?section=`, 4 chapitres, header actif, compat `scope`, sortie de `(tabbed)`) | ✅ techniquement livré | `2f106d70` + `570306a0` | Root = `synthese` sans paramètre. `contextualModules` absent. Mobile inchangé. `missions/(tabbed)/layout.tsx` non modifié. Ancienne route `(tabbed)/opps/page.tsx` retirée (OPP-18). `besoins` = `NeedsStaffingWorkspace` legacy tel quel. |
| 2 | Primitive/layout 3 panneaux `OpportunitiesTriPanel` | ✅ techniquement livré | `653eb736` | Local à `src/features/opportunities/desktop/`. Pas de design system global (OPP-06). Props `list` / `main` / `details?` / `detailsEmpty?` / `ariaLabel?` / `className?`. Rail droit → `<aside aria-hidden />` si `details` absent. **Aucun consommateur ce lot** (chapitres = Lots 6/7/9). |
| 3 | Data Contract Synthèse (view-model serveur unique) | ✅ techniquement livré | `606cbbb4` | Builder pur `buildOpportunitiesSynthese` + loader mince `getOpportunitiesSynthese` + types + 48 tests ciblés. **Résout DATA-01 (OPP-19), DATA-02b (OPP-20), PRODUCT-01 affichage (OPP-21), échéances provisoires (OPP-22).** KPI 1 & 2 repris de `getNeedsStaffingSharedData`. Aucune migration. Pas d'UI. |
| 4 | Synthèse Desktop | ✅ techniquement livré | `19f4ccad` | Surface analytique pleine largeur : 3 `KpiCard` + `PipeBreakdownChart` (client, toggle Clients/Practices) + `SkillsComparisonChart` + `ProcessFlowChart` + `DeadlinesTable` + footer `dataNotes`. SVG maison, tokens `@theme` only. `page.tsx` branche `synthese` → `getOpportunitiesSynthese()`. Mobile inchangé. 20 tests (2 fichiers). |
| 5 | Data/detail Besoins & staffing | ✅ techniquement livré | `bad25af3` | `src/features/opportunities/needs/data/` : types + `buildNeedsList`/`resolveSelectedNeedId` (purs) + `parseNeedsSelection` (`?opp=` + filtres via `parseNeedsStaffingUrlState`) + loader `getNeedsChapterData` composant 4 loaders existants — **détail chargé pour le seul besoin sélectionné** (OPP-23). 18 tests. Aucune UI, aucune migration. |
| 6 | Migration UI Besoins & staffing | ✅ techniquement livré | `b769623f` | Chapitre Besoins Desktop sur `OpportunitiesTriPanel` : `NeedsListPanel` (rail gauche, filtres + `?opp=` + `NewOpportunityButton` + `StageQuickEditorDialog`) │ `NeedsDetailPanel` (`OpportunityDetailView` inline) │ `StaffingInProgressRail` (positionnements actifs, drawer unique, `NewStaffingButton`, simulation par ligne). `page.tsx` `besoins` → `getNeedsChapterData` + `NeedsDesktop`. **Résout PRODUCT-02 (OPP-25), PRODUCT-04 (OPP-24), NAVIGATION-02 (OPP-26), LEGACY-05 (OPP-27).** `NeedsStaffingWorkspace` Desktop plus monté (Mobile inchangé). SVG/tokens `@theme`, aucun HEX. |
| 7 | Avant-vente (structure + `EmptyState` V1) | ✅ techniquement livré | `__LOT7_SHA__` | `PresalesDesktop` : `OpportunitiesTriPanel` + 3 `EmptyState` authentiques (liste / surface / détails). **Aucune donnée, aucun seed, aucun modèle Projet.** `page.tsx` `avant-vente` → `PresalesDesktop`. PRODUCT-05 reste **ouverte** et documentée. |
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
| OPP-17 | `buildOpportunitiesSectionHref` supprime, au changement de chapitre, `section` + les params métier legacy `scope/view/stage/priority/practice/sort/direction` ; les autres query params (tiers) sont préservés | 1 |
| OPP-18 | Retrait de `(tabbed)/opps/page.tsx` fait AU Lot 1 (Next.js interdit 2 `page.tsx` sur `/missions/opps`) ; parité = `NeedsStaffingWorkspace` monté tel quel ; shell alimenté par prop `searchParamsString`, pas `useSearchParams()` | 1 |
| OPP-19 | DATA-01 : « CA du pipe » = option B — `Σ ((acv ?? estimated_gain ?? 0) × conviction/100)` sur opps à étape non terminale. `getOpportunitiesSynthese` = contrat canonique. Réconcilie LEGACY-04. | 3 |
| OPP-20 | DATA-02b : Top compétences — demande classée par `Σ (weight × importance)` (×3/×2/×1), vivier par nb de profils distincts. Top 5 chacun. | 3 |
| OPP-21 | PRODUCT-01 (affichage) : 5 buckets `identifie/propose/envoye_client/entretien/retenu` superposés à `stages.ts`, jamais fusionnés (OPP-09) ; terminaux négatifs hors entonnoir. Aucune écriture DB. | 3 |
| OPP-22 | Échéances Synthèse provisoires : `next_action_at` sinon `target_close_date` (jamais `start_date`), futures, tri ASC, LIMIT 5. `calendar_events` + concept canonique `OpportunityDeadline` = Lot 8 (DATA-03). | 3 |
| OPP-23 | Chapitre Besoins : sélection d'entité `?opp=<id>` (PRODUCT-03) — parsée par `parseNeedsSelection`, résolue par `resolveSelectedNeedId` (id demandé s'il est dans la liste filtrée, sinon 1er, sinon `null`). Le **détail** (`getOpportunityDetail`) n'est chargé que pour le besoin sélectionné, jamais par ligne. Le contrat de href/navigation (`?view=`, strip de `opp` au changement de chapitre) reste au Lot 6 (NAVIGATION-02). | 5 |
| OPP-24 | PRODUCT-04 : détail besoin = `OpportunityDetailView` **inline** (réemploi tel quel `{data, device:"desktop"}`), aucun modèle dupliqué. Route `/missions/opps/[id]` conservée pour le deep-link. | 6 |
| OPP-25 | PRODUCT-02 : Kanban (`?view=kanban`) **non repris** dans le chapitre Besoins V2 ; changement d'étape conservé via `StageQuickEditorDialog` (action de ligne). Composants legacy retirés au Lot 12. | 6 |
| OPP-26 | NAVIGATION-02 : contrat URL Besoins = `?section=besoins&opp=&stage=&priority=&practice=&sort=&direction=` (builder pur `buildNeedsHref`). `?scope`/`?view` abandonnés (compat `scope` d'entrée conservée). `buildOpportunitiesSectionHref` strippe `opp`. | 6 |
| OPP-27 | LEGACY-05 : chapitre Besoins V2 **sans HEX** (`getOpportunityStageColor` = `var(--color-*)`, tokens `@theme`). Les HEX de `NeedsStaffingWorkspace.tsx` sont dans les toggles Kanban/Planning non repris → retirés au Lot 12. | 6 |

## Questions ouvertes en cours

Détail et classement (DATA / PRODUCT / NAVIGATION / LEGACY / CROSS-FEATURE) dans le doc
canonique § 17.

| ID | Résumé | Lot cible | Statut |
|---|---|---|---|
| DATA-01 | Source canonique du « CA du pipe » | 3 | ✅ **tranché (OPP-19)** — option B, opps non terminales |
| DATA-02 | Population exacte du vivier alimentant le Top compétences | 3 | ✅ **repris (Lot 3)** — contrat provisoire Consultants `candidates.status='vivier'` ; re-sync au Consultants Lot 7 |
| DATA-02b | Critère de classement du Top compétences | 3 | ✅ **tranché (OPP-20)** |
| DATA-03 | Règle d'arbitrage `OpportunityDeadline` en cas de dates multiples | 8 | **ouverte** |
| ~~DATA-04~~ | Fusion `stage` + `opportunity_candidates.status` dans le graphique Processus ? | 0 | ✅ tranché (OPP-09) — non |
| ~~DATA-05~~ | Taxonomie d'étape commerciale | 0 | ✅ tranché (OPP-08) — `stages.ts` |
| PRODUCT-01 | Représentation unifiée `stage` + `status` (buckets de progression) | 3 | ✅ **volet affichage tranché (OPP-21)** — 5 buckets ; unification *stockée* hors périmètre |
| PRODUCT-02 | Quelles capacités Kanban survivent après la refonte | 6 | ✅ **tranché (OPP-25)** — Kanban non repris ; changement d'étape conservé (`StageQuickEditorDialog`) |
| PRODUCT-03 | Sélection d'entité URL-addressable (`?opp=`) partagée Liste/Planning/Détails | 5 / 6 / 9 | ✅ **Lot 5 (OPP-23) + Lot 6 (OPP-26, `buildNeedsHref` + strip)** — reste au Lot 9 : partage avec Planning |
| PRODUCT-04 | Forme du détail besoin (inline / drawer / `OpportunityDetailView`) | 6 | ✅ **tranché (OPP-24)** — `OpportunityDetailView` inline |
| PRODUCT-05 | Relation opportunité ↔ projet avant-vente ↔ mission/projet gagné | futur | **ouverte** — structure Avant-vente livrée (Lot 7) ; contenu métier subordonné à l'arbitrage |
| NAVIGATION-01 | Conversion des deep-links `scope` vers `?section=` | 1 / 11 | ✅ **volet parsing résolu (Lot 1)** — `parseOpportunitiesSection` ; redirections dures `/staffing` + `main-menu` mobile → Lot 11 |
| NAVIGATION-02 | Sort du contrat `?view=` / `?stage` / `?priority` / `?practice` | 6 | ✅ **tranché (OPP-26)** — filtres gardés + `?opp=` ; `?scope`/`?view` abandonnés |
| ~~NAVIGATION-03~~ | `?section=` vs pathname | 0 | ✅ tranché (OPP-04) — **implémenté au Lot 1** (`?section=`, patron Engagements `?vue=`) |
| LEGACY-01 | Consommateurs restants de `missions/(tabbed)` bloquant le retrait de `SectionNavBarSlot` | 11 | **partiellement audité** — `actives` + `projets` restent ; retrait global = Phase 6 |
| LEGACY-02 | `OpportunitiesDesktopView.tsx` orphelin — suppression | 12 | **ouverte** |
| LEGACY-03 | Composants `src/components/staffing/` encore montés après migration | 6 / 12 | **ouverte** |
| LEGACY-04 | `OpportunitiesKpiSection.tsx` (`getWeightedValue`) — réconcilier ou déprécier | 3 | ✅ **réconcilié (OPP-19)** — sa formule devient le contrat canonique ; composant déprécié au Lot 6/12 |
| LEGACY-05 | HEX en dur dans `NeedsStaffingWorkspace.tsx` → variables `@theme` | 6 | ✅ **traité (OPP-27)** — chapitre V2 sans HEX ; HEX legacy dans les toggles non repris, retrait au Lot 12 |
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

### Lot 7 — Avant-vente (structure) — ✅ techniquement livré (2026-09-09)

- **Objectif** : créer le chapitre Avant-vente sur `OpportunitiesTriPanel` — **structure
  uniquement**. Aucun faux projet, aucun seed, aucun modèle métier inventé (§ 11).

- **Fichiers créés** :
  - `src/features/opportunities/presales/PresalesDesktop.tsx` — Server Component :
    `OpportunitiesTriPanel` (`ariaLabel="Avant-vente"`) avec 3 `EmptyState` maison —
    rail Liste (« Aucun projet avant-vente »), surface centrale (« Avant-vente à
    structurer », renvoie explicitement à la question produit ouverte), rail Détails
    visible (`<aside aria-label>` + « Aucune sélection »). Aucune `Data`, aucun bouton.
  - `src/features/opportunities/presales/__tests__/presales-desktop.test.ts` (3 cas) —
    grille 3 panneaux, 3 `EmptyState`, **aucune donnée fictive ni action**.

- **Fichiers modifiés** :
  - `src/app/(app)/missions/opps/page.tsx` — branche `avant-vente` → `<PresalesDesktop />`
    (avant le fallback `planning`).
  - `src/features/opportunities/desktop/OpportunitiesChapterPlaceholder.tsx` — resserré
    à `PlaceholderSection = "synthese" | "planning"` (l'entrée `avant-vente` n'est plus
    routée ici).
  - `src/features/opportunities/summary/__tests__/summary-route.test.ts` — libellé du cas
    `avant-vente`/`planning` ajusté (« structural chapter », aucune donnée chargée).

- **Décisions** : aucune. **PRODUCT-05** (relation opportunité ↔ projet avant-vente ↔
  mission/projet gagné, table `projects`) **reste ouverte** — le chapitre est structurel
  tant qu'elle n'est pas cadrée.

- **Dettes / suites** : contenu métier Avant-vente = lot futur, subordonné à PRODUCT-05.

- **Gates réellement exécutées** (toutes vertes) :
  - `npm run typecheck` — ✅.
  - `npm test` (**suite complète**) — ✅ **284 fichiers / 2832 tests**.
  - `npm run check:server-boundary` — ✅.
  - `npx eslint` sur les fichiers touchés — ✅ 0 problème.
  - `npm run build` — ✅ « Compiled successfully ».
- **QA visuelle** : réservée à Guillaume (structure 3 panneaux + wording des `EmptyState`).

- **Commit** : `__LOT7_SHA__` — `feat(opportunities): chapitre Avant-vente structurel (Lot 7)`.
- **NEXT LOT** : Lot 8 — Data Contract Planning (builder unique `OpportunityDeadline`, résout DATA-03).

### Lot 6 — Migration UI Besoins & staffing — ✅ techniquement livré (2026-09-09)

- **Objectif** : chapitre Besoins Desktop sur `OpportunitiesTriPanel` (Lot 2), alimenté
  par `getNeedsChapterData` (Lot 5). Parité des actions, sort explicite du Kanban / des
  contrats `?scope`/`?view` / des HEX legacy (OPP-15).

- **Fichiers créés** — `src/features/opportunities/needs/` :
  - `navigation/needs-url.ts` — **pur** : `buildNeedsHref(searchParamsString, patch)` →
    `?section=besoins` toujours posé, `?scope`/`?view` retirés, `?opp=` + filtres
    appliqués/retirés, params tiers préservés. + `__tests__/needs-url.test.ts` (4 cas).
  - `NeedsDesktop.tsx` — Server Component : compose `OpportunitiesTriPanel`
    (`list` / `main` / `details?`). `details` absent (→ `<aside aria-hidden />`) tant
    qu'aucun besoin n'est sélectionné. + `__tests__/needs-desktop.test.ts` (3 cas).
  - `NeedsListPanel.tsx` — `"use client"` : rail gauche. Toolbar (`NewOpportunityButton` +
    3 filtres select natifs + toggle tri ACV + reset), liste de cartes besoin (client +
    logo, étape colorée via `getOpportunityStageColor` = `var(--color-*)`, montant,
    barre de couverture), pencil « Étape » → `StageQuickEditorDialog`. Sélection &
    filtres → `router.replace(buildNeedsHref(...), {scroll:false})` / `<Link replace>`.
    **Pas de `useSearchParams`** (prop `searchParamsString`, patron OPP-18).
  - `NeedsDetailPanel.tsx` — Server Component : `OpportunityDetailView` **inline**
    (OPP-24) dans un conteneur scrollable, ou message centré (erreur / rien sélectionné).
  - `StaffingInProgressRail.tsx` — `"use client"` : rail droit « Staffing en cours ».
    `NewStaffingButton` (openNeeds), cartes des positionnements **actifs** du besoin
    (Lot 5) → `openStaffingDrawer(id)` (drawer unique), action « Simuler la marge » →
    `getFinancialModelForStaffingAction` + `FinancialModelingDesktopDialog` (OPP-13,
    aucune deuxième modale ; rationalisation module = Lot 10).

- **Fichiers modifiés** :
  - `src/app/(app)/missions/opps/page.tsx` — branche `besoins` (desktop) →
    `getNeedsChapterData(parseNeedsSelection(...))` + `<NeedsDesktop>`. Retrait des
    imports `get-opportunities-planning` / `get-staffings-planning` / `getStaffingsList`
    (plus utilisés). **Mobile inchangé** (`NeedsStaffingWorkspace` mobile).
  - `src/features/opportunities/navigation/opportunities-sections.ts` — `opp` ajouté à
    `LEGACY_NEEDS_STAFFING_QUERY_KEYS` (strip au changement de chapitre). Test mis à jour.
  - `src/features/opportunities/needs/data/opportunities-needs.types.ts` +
    `get-needs-chapter-data.ts` — `openNeeds: OpenNeedOption[]` ajouté à `NeedsChapterData`
    (déjà lu depuis `getNeedsStaffingSharedData`, alimente `NewStaffingButton`).
  - `src/features/opportunities/summary/__tests__/summary-route.test.ts` — réécrit pour
    le nouveau câblage `besoins` (mock `getNeedsChapterData` + `NeedsDesktop`).

- **Décisions** : **OPP-24** (PRODUCT-04 — détail inline), **OPP-25** (PRODUCT-02 — Kanban
  non repris), **OPP-26** (NAVIGATION-02 — contrat URL), **OPP-27** (LEGACY-05 — HEX).

- **Parité des capacités (OPP-15)** :
  - Création opportunité → `NewOpportunityButton` (toolbar rail Liste). ✅
  - Création staffing → `NewStaffingButton` (rail « Staffing en cours »). ✅
  - Édition rapide d'étape → `StageQuickEditorDialog` (action de ligne du rail Liste). ✅
  - Simulation financière par positionnement → action « Simuler la marge » (rail droit),
    même dialog que le legacy. ✅
  - Filtres étape/priorité/practice + tri ACV → conservés (`buildNeedsHref`). ✅
  - Détail besoin complet → `OpportunityDetailView` (header, pipeline, onglets
    overview/staffing/timeline/finance), drawer unique. ✅
  - **Non repris** : Kanban besoins/staffing (OPP-25), bascule `?scope=` (staffing = rail
    droit), vues Planning (chapitre dédié, Lot 9). Composants legacy conservés → Lot 12.

- **Dettes / suites** :
  - `NeedsStaffingWorkspace.tsx` : plus monté sur Desktop, **encore monté sur Mobile**
    (`page.tsx` branche `device==="mobile"`). Retrait complet (+ HEX, + `OpportunitiesKanbanView`
    / `StaffingKanbanView` / vues Planning legacy) = **Lot 12**, après migration Mobile.
  - `?scope=needs\|staffing` continue de résoudre `besoins` (OPP-16) — redirection dure de
    `/staffing` + liens `main-menu` mobiles = **Lot 11**.
  - Simulation par ligne : câblée pour la parité ; relocalisation dans le module
    « Simulation devis » = **Lot 10**.

- **Gates réellement exécutées** (toutes vertes) :
  - `npm run typecheck` — ✅.
  - `npm test` (**suite complète** — contrat partagé `opportunities-sections` touché) —
    ✅ **283 fichiers / 2829 tests**.
  - `npm run check:server-boundary` — ✅.
  - `npx eslint` sur les fichiers touchés — ✅ 0 problème.
  - `npm run build` — ✅ « Compiled successfully », route `ƒ /missions/opps` (pas de
    déopt `useSearchParams`).
- **QA visuelle** : réservée à Guillaume — **non réalisée**. Densité des rails,
  `OpportunityDetailView` dans un conteneur étroit, les 3 actions de ligne : à valider.

- **Commit** : `b769623f` — `feat(opportunities): chapitre Besoins & staffing Desktop (Lot 6)`.
- **NEXT LOT** : Lot 7 — Avant-vente (structure 3 panneaux + `EmptyState` V1).

### Lot 5 — Data/detail Besoins & staffing — ✅ techniquement livré (2026-09-09)

- **Objectif** : stabiliser les contrats de données du chapitre Besoins (liste des
  besoins ouverts, besoin sélectionné, détail, staffing actif) en **réutilisant les
  loaders existants** et **sans double query**. Data-only, aucune UI (Lot 6).

- **Fichiers créés** — `src/features/opportunities/needs/data/` :
  - `opportunities-needs.types.ts` — `NeedsFilterState`, `NeedsSelectionState`,
    `NeedsListItem` (projection mince de `MissionsListRow` + snapshot de couverture +
    `coverageRatio`), `NeedsChapterData`.
  - `needs-selection.ts` — `parseNeedsSelection` : `?opp=` + filtres
    (`stage`/`priority`/`practice`/`sort`/`direction`) **délégués à
    `parseNeedsStaffingUrlState`** (aucun parseur de filtre recréé). `scope`/`view`
    ignorés (arbitrage Lot 6).
  - `build-needs-list.ts` — **purs** : `buildNeedsList` (besoins ouverts via
    `!isTerminalOpportunityStage` — même prédicat que `getNeedsStaffingSharedData` —
    puis `filterNeedsRows` de `model.ts`, puis projection + couverture) ;
    `resolveSelectedNeedId` (id demandé s'il est dans la liste filtrée, sinon 1er,
    sinon `null`).
  - `get-needs-chapter-data.ts` — loader `server-only` : `Promise.all` de
    `getOpportunitiesList({onlyStaffingNeeds:true})` + `getNeedsStaffingSharedData()` +
    `getStaffingsList()`, puis `getOpportunityDetail(selectedNeedId)` **une seule fois**
    (jamais par ligne) et `groupActiveStaffingsByOpportunityId` (helper `model.ts`
    existant) pour le rail « Staffing en cours ». `dataNotes` : `?opp=` introuvable,
    liste vide sous filtre, erreur de détail.
  - `__tests__/build-needs-list.test.ts` (11) + `__tests__/get-needs-chapter-data.test.ts` (7)
    — filtres ouverts/partagés/tri, couverture, résolution de sélection, **un seul appel
    `getOpportunityDetail` avec l'id sélectionné**, staffing actif du seul besoin,
    `dataNotes`.

- **Décision** : **OPP-23** (sélection `?opp=` — volet parsing/résolution). Aucune migration,
  aucun loader forké, aucun composant.

- **Questions** : PRODUCT-03 ✅ volet parsing/résolution (OPP-23). NAVIGATION-02 (contrat
  `?view=` + strip de `opp`) et PRODUCT-04 (forme du détail) restent au **Lot 6**.

- **Dettes / suites** :
  - `getOpportunityDetail` porte `"use server"` + `"server-only"` : appelé depuis un loader
    `server-only` comme le fait déjà `/missions/opps/[id]/page.tsx` — pas de refacto.
  - `buildOpportunitiesSectionHref` ne strippe pas encore `opp` au changement de chapitre
    (Lot 6, avec le reste du contrat de navigation Besoins).

- **Gates réellement exécutées** (toutes vertes) :
  - `npm run typecheck` — ✅.
  - `npx vitest run src/features/opportunities/needs/` — ✅ (2 fichiers, 18 tests).
    Régression : `+ src/features/opportunities/ src/lib/needs-staffing/` — ✅ (11 fichiers, 103).
  - `npm run check:server-boundary` — ✅.
  - `npx eslint src/features/opportunities/needs/` — ✅ 0 problème.
  - `npm run build` — ✅ « Compiled successfully ».
- **QA visuelle** : sans objet (aucune UI). Réservée à Guillaume au Lot 6.

- **Commit** : `bad25af3` — `feat(opportunities): data contract Besoins & staffing (Lot 5)`.
- **NEXT LOT** : Lot 6 — Migration UI Besoins & staffing (`OpportunitiesTriPanel`).

### Lot 4 — Synthèse Desktop — ✅ techniquement livré (2026-09-09)

> Amorcé par Codex (non commité), **repris, validé et clôturé** dans cette session.
> Constats de reprise ci-dessous (« Reprise Lot 4 — constats avant code »).

- **Objectif** : chapitre Synthèse Desktop — surface analytique **pleine largeur**
  (exception au shell 3 panneaux) consommant le view-model du Lot 3. Aucun recalcul
  côté composant, SVG maison, `KpiCard`, Desktop seul.

- **Fichiers créés** — `src/features/opportunities/summary/` :
  - `SummaryDesktop.tsx` — Server Component : bande de 3 `KpiCard` (besoins ouverts ·
    positionnements actifs · CA du pipe) + 4 sections + footer « Périmètre & méthode »
    qui rend `vm.dataNotes`. `@container` + container queries pour la responsivité,
    `overflow-y-auto`, aucun overflow horizontal.
  - `PipeBreakdownChart.tsx` — **seul `"use client"`** : toggle `Clients | Practices`
    (`useState`, aucune URL / persistance / requête serveur). Strate proportionnelle
    SVG (largeurs = `weightedValue / total`), repères numérotés, liste détaillée par
    catégorie avec valeur exacte + part + nb d'opportunités. Clients : opacité
    dégradée par rang ; Practices : `var(--color-muted)` (voir dette couleur).
  - `SkillsComparisonChart.tsx` — miroir Top 5 demande ↔ Top 5 vivier, **deux échelles
    indépendantes**, rangs propres à chaque côté, mention explicite « hors Top 5 ≠ zéro ».
  - `ProcessFlowChart.tsx` — 5 stations staffing (OPP-21, statuts **actuels** — pas un
    taux de conversion), étape commerciale affichée séparément, `<details>` par
    opportunité (liens vers `/missions/opps/[id]`).
  - `DeadlinesTable.tsx` — tableau des échéances, dates relatives/absolues en calendrier
    Europe/Paris (DST géré), `<time datetime>`, liens opportunité.
  - `summary-formatters.ts` / `summary-geometry.ts` — helpers **purs** (euros FR compacts,
    `formatDeadline`, `buildRevenueStrata`, `alignSkillTopFives`, `scaleLength`).
  - `__tests__/summary.test.ts` + `__tests__/summary-route.test.ts` (20 cas) —
    `renderToStaticMarkup` sur composants purs, invariant somme pipe re-testé côté UI,
    formats FR + DST, EmptyState de chaque série, isolation route (desktop charge la
    Synthèse une fois ; mobile ne la charge jamais ; besoins/avant-vente/planning non plus).

- **Fichier modifié** : `src/app/(app)/missions/opps/page.tsx` — branche `synthese`
  (desktop) → `await getOpportunitiesSynthese()` + `<SummaryDesktop vm={vm} />`.
  Mobile et branches `besoins`/`avant-vente`/`planning` **inchangées**.

- **Décisions** : aucune nouvelle (tout a été acté au Lot 3 — OPP-19→22). Aucune divergence
  de contrat. Écart de nommage mineur : la fiche cite `ProcessFunnelChart`, le composant
  livré s'appelle `ProcessFlowChart` (sans impact).

- **Dettes** :
  - **Couleur des practices** : `PipeBucket` (Lot 3) ne porte pas de `color_hex` ; la
    répartition par practice s'affiche en `var(--color-muted)` uni (aucun HEX en dur).
    Enrichissement possible plus tard via `offer_practices.color_hex` (loader Lot 3 +
    `PipeBucket`), non requis par les critères d'acceptation.
  - Chapitre Synthèse **non exposé sur Mobile** (V1) — conforme à la fiche.

- **Gates réellement exécutées** (toutes vertes) :
  - `npm run typecheck` — ✅ (après `rm -rf .next`).
  - `npm test` (**suite complète**) — ✅ **279 fichiers / 2803 tests**.
  - `npm run check:server-boundary` — ✅.
  - `npx eslint src/features/opportunities/summary/ + page.tsx` — ✅ 0 problème
    (le `npm run lint` global reste rouge sur des fichiers **préexistants**, aucun du Lot 4).
  - `npm run build` — ✅ « Compiled successfully », route `ƒ /missions/opps`.

- **QA visuelle** : réservée à Guillaume — **non réalisée** par l'agent (§ 20.3).
  La densité, la lisibilité des 3 figures et le toggle restent à valider.

- **Commit** : `19f4ccad` — `feat(opportunities): Synthèse Desktop (Lot 4)`.
- **NEXT LOT** : Lot 5 — Data/detail Besoins & staffing.

### Reprise Lot 4 — constats avant code (2026-09-09)

- `git fetch origin` : `main` propre et identique à `origin/main` ; Lots 1–3 présents.
- Le `PipeBucket` réel ne porte **aucune couleur** (ni le loader Synthèse). Le fallback
  practice sera donc `var(--color-muted)`, sans enrichissement Data ni requête additionnelle.
- Les deux listes de compétences sont **déjà tronquées au Top 5 indépendamment**. Une
  compétence absente d'un côté signifie « hors Top 5 », **jamais zéro ni manque de profils**.
  Le miroir réunira les identités présentes (5 à 10 lignes), préservera les rangs de chaque
  côté et affichera deux maxima indépendants : score pondéré / profils distincts.
- `staffingFunnel` compte les **statuts actuels**, pas des passages cumulés ni des conversions.
  Le rail à cinq stations est schématique ; les nombres peuvent croître vers la droite.
- Le brief d'exécution fixe la composition et autorise sa réalisation complète. Il fait
  foi pour l'implémentation directe, Desktop seul et sans QA navigateur ni concept raster.
- Contrat graphique / passes locales : `data-visualization` + `data-analytics:visualize-data`
  pour les encodages ; `d3-data-visualization` pour la géométrie SVG native (aucun ajout D3) ;
  `react-and-nextjs-data-visualization` pour les frontières ;
  `typescript-data-visualization-engineering` pour les helpers ;
  `accessibility-and-inclusive-visualization` pour les alternatives textuelles.
- Composition : bande de trois `KpiCard`, strate proportionnelle dominante et repères
  numérotés attachés aux catégories, miroir fin, stations staffing, listing des dates.
  Les légendes HTML restent à taille lisible au redimensionnement ; petits segments reliés
  à leur détail numéroté. Valeurs exactes, notes et rangs visibles sans hover ni couleur.
- Architecture : `SummaryDesktop` serveur, seul `PipeBreakdownChart` porte l'état local
  Clients/Practices (aucune URL/persistance/requête). Trois figures principales ; géométrie
  linéaire dans le nombre de catégories, miroir limité à dix lignes, cinq stations.
  Pas de Canvas, animation, geste capturé, nouvelle dépendance ou modification Mobile.


### Lot 3 — Data Contract Synthèse — ✅ techniquement livré (2026-09-09)

- **Objectif** : view-model **serveur unique** du chapitre Synthèse — builder pur testé
  + loader mince `server-only` (patron `buildConsultantsSynthese`). Pas d'UI.

- **Audit Data live (2026-09-09, Supabase MCP)** : schéma `opportunities` /
  `opportunity_skills` / `opportunity_candidates` / `person_skills` / `candidates`
  conforme au § 8. `opportunities` = 32 lignes, **5 ouvertes** (étape ∉
  `gagne/perdu/abandonne/non_traitee`) : `recherche_profil` ×2, `cv_envoyes` ×1,
  `qualification` ×1, `contractualisation` ×1. **1 opp ouverte sans ACV ni gain
  estimé**, **3 sans practice**. `opportunity_candidates` sur opps ouvertes = 2
  positionnements seulement. `candidates.status='vivier'` = 11 (tous avec `person_skills`).
  `importance` ∈ {indispensable, souhaitee, bonus}. Aucune divergence de schéma.

- **Fichiers créés** :
  - `src/features/opportunities/data/opportunities-synthese.types.ts` — view-model
    (`OpportunitiesSyntheseViewModel`) : `kpis` (openNeedsCount, activePositioningsCount,
    pipeWeightedValue, openOpportunitiesCount), `pipeByStage` / `pipeByClient` /
    `pipeByPractice`, `skillsDemand` / `skillsSupply` (Top 5), `staffingFunnel` +
    `processByOpportunity`, `upcomingDeadlines`, `dataNotes`. + types de lignes brutes
    + `BuildOpportunitiesSyntheseInput`.
  - `src/features/opportunities/data/build-opportunities-synthese.ts` — builder PUR
    (aucune dépendance Supabase). Cascade practice C-17 (exact `offer_practices.name`
    normalisé → `getPracticeByName` → `null`). Invariant `Σ pipeByStage == Σ pipeByClient
    == Σ pipeByPractice == kpis.pipeWeightedValue`. Exporte `STAFFING_FUNNEL_LABELS` +
    `IMPORTANCE_WEIGHT` pour l'UT / l'UI Lot 4.
  - `src/features/opportunities/data/get-opportunities-synthese.ts` — loader `server-only` :
    `getOfferPracticesCatalog` (cache 1h) + `getNeedsStaffingSharedData` (KPI 1 & 2, **non
    recalculés**) + 1 lecture `opportunities` puis 3 lectures ciblées sur les IDs ouverts
    (`opportunity_candidates`, `opportunity_skills`) et sur les `person_id` vivier
    (`person_skills`). `resolveCurrentWorkspaceId` en garde.
  - `src/features/opportunities/data/__tests__/build-opportunities-synthese.test.ts` —
    ~18 cas : passthrough KPI 1 & 2, formule DATA-01/option B, **invariant somme pipe**,
    pipe par étape (0 inclus) / client (bucket non renseigné) / practice (exact +
    heuristique + « Autre » en dernier), Top compétences (pondération importance, Top 5,
    exclusion opps terminales, profils distincts vivier), buckets staffing (mapping,
    terminaux négatifs hors entonnoir, ordre canonique, 0 inclus), échéances (priorité
    `next_action_at`, exclusion passé, tri, LIMIT 5), `dataNotes`.

- **Décisions actées** : **OPP-19** (DATA-01 = option B), **OPP-20** (DATA-02b),
  **OPP-21** (PRODUCT-01 volet affichage — buckets staffing), **OPP-22** (échéances
  provisoires). Le doc canonique nommait « OPP-17 » pour DATA-01 ; OPP-17/18 ayant été
  pris au Lot 1, DATA-01 devient **OPP-19** (Decision Log + fiche corrigés).

- **Questions traitées** : DATA-01 ✅ (OPP-19), DATA-02b ✅ (OPP-20), PRODUCT-01 volet
  affichage ✅ (OPP-21), LEGACY-04 ✅ réconciliée. DATA-02 : reprise du contrat
  **provisoire** Consultants (`candidates.status='vivier'`), signalée dans `dataNotes`,
  à re-synchroniser au Consultants Lot 7.

- **Dettes / reports** :
  - Échéances : version provisoire (`opportunities` seul). `calendar_events` + concept
    canonique `OpportunityDeadline` partagé Synthèse/Planning = **Lot 8** (DATA-03).
  - `OpportunitiesKpiSection.tsx` non touché : reste monté par le workspace legacy,
    déprécié au Lot 6 puis retiré au Lot 12.
  - Aucune UI (Lot 4).
  - `.next/` : `rm -rf .next` avant `typecheck` (cache de types) — sans impact CI.

- **Gates réellement exécutées** (dans l'ordre, toutes vertes) :
  - `npm run typecheck` — ✅.
  - `npx vitest run src/features/opportunities/` — ✅ (3 fichiers, 48 tests). Régression :
    `+ src/features/consultants/data/ src/lib/needs-staffing/` — ✅ (8 fichiers, 78).
  - `npm run check:server-boundary` — ✅.
  - `npx eslint src/features/opportunities/data/` — ✅ (0 warning).
  - `npm run build` — ✅ « Compiled successfully ».
- **QA visuelle** : réservée à Guillaume (§ 20.3).

- **Commit** : `606cbbb4` — `feat(opportunities): data contract Synthèse (Lot 3)`.
- **NEXT LOT** : Lot 4 — Synthèse Desktop (KPI + graphiques SVG maison + tableau échéances).

### Lot 2 — Primitive/layout 3 panneaux — ✅ techniquement livré (2026-09-09)

- **Objectif** : `OpportunitiesTriPanel` — châssis « Liste │ Vue principale │ Détails »
  local à la feature, repris de `/reports` + `/missions` (Engagements). Pas de
  promotion en `src/components/layout/` (OPP-06).

- **Fichiers créés** :
  - `src/features/opportunities/desktop/OpportunitiesTriPanel.tsx` — composant
    présentationnel pur (aucun hook, aucune directive → RSC-compatible). Props :
    `list` · `main` · `details?` · `detailsEmpty?` · `ariaLabel?` · `className?`.
    Grille `grid min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)] overflow-hidden`.
    Chaque panneau : `flex min-h-0 min-w-0 flex-col overflow-hidden` (scroll interne
    au slot, jamais sur le body). Rail gauche `border-r`, rail droit `border-l` ;
    `details` absent → `detailsEmpty` sinon `<aside className="border-l border-border bg-surface" aria-hidden />` (patron Engagements).
  - `src/features/opportunities/desktop/OpportunitiesTriPanel.test.ts` — 7 cas
    (`renderToStaticMarkup`) : grille 3 colonnes, slots list/main, aucun
    `overflow-x` + `min-w-0`, dégradé `aria-hidden`, rail droit avec `details`,
    `detailsEmpty` custom, fusion `className` / `ariaLabel`.

- **Data** : aucune. **Mobile** : n/a (Desktop only, pas de `hidden` CSS).
- **Consommateurs** : aucun ce lot. Câblage aux chapitres Besoins (Lot 6),
  Avant-vente (Lot 7), Planning (Lot 9). Synthèse n'utilise PAS la primitive (OPP-05).
- **Décisions nouvelles** : aucune (OPP-06 déjà acté). Aucune divergence.
- **Dettes** : la primitive ne gère pas de rail droit rétractable ni de
  redimensionnement — non requis avant un consommateur réel (Lot 6+).

- **Gates réellement exécutées** (dans l'ordre, toutes vertes) :
  - `npm run typecheck` — ✅.
  - `npx vitest run src/features/opportunities/` — ✅ (2 fichiers, 34 tests).
  - `npm run check:server-boundary` — ✅.
  - `npx eslint OpportunitiesTriPanel.tsx + .test.ts` — ✅.
  - `npm run build` — ✅ « Compiled successfully ».
- **QA visuelle** : réservée à Guillaume — non réalisée par l'agent (§ 20.3).

- **Commit** : `653eb736` — `feat(opportunities): primitive layout 3 panneaux OpportunitiesTriPanel (Lot 2)`.
- **NEXT LOT** : Lot 3 — Data Contract Synthèse (view-model serveur unique, résout DATA-01).

### Lot 1 — Socle Opportunities Workspace — ✅ techniquement livré (2026-09-09)

- **Objectif** : nouveau shell `/missions/opps` aligné SHELL-0018 V2 — `SectionRail`
  inline, chapeau navy « Opportunités » → racine, header = chapitre actif, 4 chapitres
  (`synthese` racine sans paramètre · `besoins` · `avant-vente` · `planning`),
  navigation URL-driven `?section=`, compat `?scope=needs|staffing` → `besoins`,
  sortie du groupe `(tabbed)`, `contextualModules` absent. Aucun contenu métier refait.

- **Fichiers créés** :
  - `src/features/opportunities/navigation/opportunities-sections.ts` — `OpportunitiesSection`,
    `OPPORTUNITIES_SECTIONS`, `OPPORTUNITIES_SECTION_KEYS`, `HEADER_TITLE_BY_SECTION`,
    `OPPORTUNITIES_ROOT_SECTION="synthese"`, `OPPORTUNITIES_CANONICAL_PATH`,
    `LEGACY_NEEDS_STAFFING_QUERY_KEYS`, `parseOpportunitiesSection` (déterministe + compat
    `scope`), `buildOpportunitiesSectionHref` (préserve les params tiers, purge l'état du
    chapitre frère — OPP-17), `searchParamsToString`.
  - `src/features/opportunities/navigation/opportunities-icons.tsx` — 4 icônes Heroicons v2
    outline (patron `engagement-icons` / `consultants-icons`).
  - `src/features/opportunities/desktop/OpportunitiesDesktopShell.tsx` — `"use client"`,
    `SectionRail` **inline** + `useSidebarCollapse` + header ; hrefs de chapitre construits
    depuis la prop `searchParamsString` (OPP-18) ; `contextualModules` non passé.
  - `src/features/opportunities/desktop/OpportunitiesChapterPlaceholder.tsx` — EmptyState
    provisoire (synthese → Lot 4, avant-vente → Lot 7, planning → Lot 9). Aucun bouton mort.
  - `src/app/(app)/missions/opps/page.tsx` — **hors `(tabbed)`** — orchestrateur fin :
    `getDashboardDevice()` + `parseOpportunitiesSection(?section)` → Mobile legacy inchangé
    OU shell V2 + contenu. `besoins` = `NeedsStaffingWorkspace` legacy monté tel quel
    (mêmes loaders desktop, mêmes props). `import "server-only"`.
  - `src/features/opportunities/navigation/opportunities-sections.test.ts` — 25 cas :
    parse (`{}`/`null`/vide/valides/`synthese` explicite/param répété/inconnu/compat
    `scope`/scope inconnu/section explicite l'emporte), build (racine sans param, `?section=`,
    préservation params tiers, purge params legacy, href besoins depuis URL legacy),
    `searchParamsToString`, contrat des 4 chapitres, rendu `OpportunitiesDesktopShell`
    (chapeau navy 184px « Opportunités », header chapitre actif, 4 hrefs `?section=`,
    préservation params tiers dans les hrefs, `aria-current=page`, aucune section Modules),
    invariants d'orchestrateur (résout depuis l'URL pas `useState`, distribution device,
    montage `NeedsStaffingWorkspace`, pas de `redirect()`, hors `(tabbed)`).

- **Fichier retiré** : `src/app/(app)/missions/(tabbed)/opps/page.tsx` (OPP-18 — obligatoire,
  route parallèle Next.js interdite). Dossier `(tabbed)/opps/` supprimé.

- **Fichiers NON touchés** (hors périmètre respecté) : `src/app/(app)/missions/(tabbed)/layout.tsx`
  (reste pour `actives`/`projets`), `main-menu.config.ts`, `getMobileTabsForPath`,
  `NeedsStaffingWorkspace.tsx` et tout le contenu métier, `src/lib/needs-staffing/url-state.ts`,
  branche `device==="mobile"`. Aucune migration Supabase, aucun n8n.

- **Divergences** : voir la section « Divergences constatées avant code — Lot 1 » ci-dessus.
  Décisions nouvelles : **OPP-17**, **OPP-18**.

- **Compat legacy préservée (OPP-15)** : le chapitre `besoins` EST le `NeedsStaffingWorkspace`
  complet (liste/kanban/planning/staffing, bascule `?scope=`, filtres, drawer, simulation,
  édition d'étape) — aucune capacité retirée. `?scope=needs` / `?scope=staffing` /
  `/missions/opps?scope=needs` (lien `main-menu` mobile) continuent de résoudre `besoins`.

- **Dettes / suites** :
  - Contenu métier des chapitres `synthese` (Lot 4), `avant-vente` (Lot 7), `planning` (Lot 9)
    = EmptyState provisoire.
  - Le `NeedsStaffingWorkspace` réécrit l'historique via `window.history.replaceState`
    (`use-needs-staffing-url-state`) en repassant à `?scope=needs...` (perd `?section=besoins`).
    Sans conséquence : `parseOpportunitiesSection` reconstruit `besoins` depuis `scope`
    (compat OPP-16). Uniformisation `?section=` du workspace = Lot 6.
  - Redirections dures `/staffing` + liens `main-menu` mobiles vers `?section=` = Lot 11
    (NAVIGATION-01 volet redirections).
  - `.next/types/validator.ts` : `rm -rf .next` requis après le retrait de route avant
    `npm run typecheck` (cache de types périmé) — sans impact CI (`next build` régénère).

- **Gates réellement exécutées** (dans l'ordre, toutes vertes) :
  - `npm run typecheck` — ✅ (après `rm -rf .next`).
  - `npx vitest run src/features/opportunities/ src/components/layout/SectionRail.test.ts` —
    ✅ 32/32. Régression : `npx vitest run src/lib/navigation/ src/features/consultants/` —
    ✅ 154/154.
  - `npm run check:server-boundary` — ✅.
  - `npx eslint` sur les 6 fichiers touchés — ✅ (0 warning).
  - `npm run build` — ✅ « Compiled successfully » ; route `ƒ /missions/opps` présente.

- **QA visuelle** : réservée à Guillaume — non réalisée par l'agent (protocole § 20.3).

- **Commits** :
  - `2f106d70` — socle du Lot 1 (les 6 fichiers), bundlé par une automation parallèle
    avec du WIP cockpit (`git add -A` non souhaité — cf. § Divergences). Cet état était
    **rouge au `typecheck`** (TS2769 : `OpportunitiesDesktopShell` exigeait `children`
    alors que le test le passe en 3ᵉ argument de `React.createElement`).
  - `570306a0` — `feat(opportunities): finalize Lot 1 shell — typecheck fix + ledger` :
    `children?: ReactNode` (typecheck vert), finalisation ledger + doc canonique.
- **NEXT LOT** : Lot 2 — Primitive/layout 3 panneaux `OpportunitiesTriPanel`.

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
