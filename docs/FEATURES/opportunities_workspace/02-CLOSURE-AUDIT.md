# Opportunities Workspace — Lot 12 — Closure Audit

> **Date :** 2026-09-10  
> **Auteur / Agent :** Lead Développeur Full-Stack Senior (Antigravity)  
> **Périmètre :** Opportunities Workspace — Lot 12 (Nettoyage final, suppression du legacy et clôture technique)  
> **Branche unique :** `main`  
> **Baseline d'entrée du lot :** `4fb31464`  
> **Statut :** ✅ **TECHNICALLY CLOSED (BLOCKING = 0)**

---

## 1. Synthèse exécutive

Le **Lot 12** parachève le chantier **Opportunities Workspace** (`/missions/opps`).  
Conformément à la décision produit actée dans `LOT12-DECISION-SUPPRESSION-LEGACY-MOBILE.md` (supersédant les anciennes exigences de parité Mobile sur composant historique), le monolithe `NeedsStaffingWorkspace.tsx` a été définitivement **supprimé** (REMOVE), sans recréation de wrapper ou de feature artificielle.

Toutes les dépendances et chaînes devenues orphelines en cascade (composants, vues, loaders, hooks) ont été auditées par analyse du graphe de dépendances (`ripgrep`) et intégralement supprimées. Les composants et loaders partagés avec le Desktop V2 ou d'autres domaines (Consultants, Cockpit, Overlays globaux, redirection `/staffing`) ont été rigoureusement préservés.

### Chiffres clés du nettoyage
- **Fichiers supprimés :** 23 fichiers
- **Lignes de code supprimées :** ~3 400 lignes (nettoyage net)
- **Fichiers modifiés / nettoyés :** 4 fichiers (`page.tsx`, `get-staffings-list.ts`, 2 fichiers de test)
- **Quality Gates :** 100 % PASS (`typecheck`, `check:server-boundary`, `eslint`, `build` 42/42 pages, `diff --check`, `vitest` 294 fichiers / 3 056 tests)
- **Dettes bloquantes :** **0 (BLOCKING = 0)**

---

## 2. Baseline & Travaux parallèles

### Baseline Git
- `HEAD` initial : `4fb31464` (`docs(opportunities): update Lot 12 cleanup strategy`)
- Travaux parallèles protégés (intacts, non perturbés) :
  - `docs/performance-data-audit/`
  - `src/lib/supabase/*`
  - `src/lib/intelligence/*`

---

## 3. Architecture Desktop finale (Phase 7.1 + Lot 12)

Le workspace Desktop `/missions/opps` est stabilisé sur le standard **SHELL-0018 V2** (`SectionRail` inline + `OpportunitiesDesktopShell`) :

### Chapitres canoniques (URL-driven via `?section=`)
1. **Vue d'ensemble** (racine `synthese`, sans paramètre) : surface analytique pleine largeur (`SummaryDesktop`), 3 KPI cards, graphiques de répartition, compétences, entonnoir process, table des échéances.
2. **Besoins & Staffing** (`?section=besoins`) : tri-panel (`OpportunitiesTriPanel`) avec liste des besoins filtrable (`NeedsListPanel`), sélection `?opp=`, détail inline (`NeedsDetailPanel` / `OpportunityDetailView`), rail « Staffing en cours » (`StaffingInProgressRail`), actions rapides d'étape (`StageQuickEditorDialog`).
3. **Avant-vente Projets** (`?section=avant-vente`) : tri-panel avec 3 `EmptyState` authentiques (`PresalesDesktop`).
4. **Planning & Échéances** (`?section=planning`) : tri-panel (`PlanningDesktop`) avec liste des opportunités ouvertes, milestone planning central Mois / Année (`OpportunityDeadline`), détail d'opportunité sélectionnée.

### Modules contextuels (toujours visibles sur tous les chapitres via `?module=`)
1. **Matching profils** (`?module=matching`) : `MatchingDialog` besoin-centrique réutilisant le moteur partagé `src/lib/staffing-matching/`.
2. **Simulation financière** (`?module=simulation`) : `FinancialModelingDesktopDialog` de `@/features/financial-modeling`.
3. **Revue post-mortem** (`?module=post-mortem`) : `MissionComposerDesktop` avec config `post_mortem_pipeline` dans `AppDialog` cockpit.

---

## 4. État Mobile temporaire

Conformément à la décision produit :
- `/missions/opps` sur Mobile maintient la détection serveur via `getDashboardDevice()`.
- La branche Mobile ne charge aucun dataset lourd inutile (`getNeedsStaffingSharedData`, `getOpportunitiesList`, `getMobileStaffingsList` retirés du fetch Mobile).
- Rendu : primitive existante `<EmptyState>` simple et explicite (« La vue Opportunités Mobile est en cours de reconstruction (Opportunities Mobile V2). »).
- Aucun composant Desktop n'est importé, monté ou masqué en CSS sur Mobile.
- Statut : **Opportunities Mobile V2 — DEFERRED PRODUCT**.

---

## 5. Matrice du code supprimé vs conservé

### Code supprimé (23 fichiers + 1 nettoyage in-file)

| Fichier / Élément | Classification | Justification / Preuve |
|---|---|---|
| `src/components/needs-staffing/NeedsStaffingWorkspace.tsx` | MOBILE LEGACY ONLY | Supprimé suite à la décision produit Lot 12. |
| `src/components/needs-staffing/NeedsListView.tsx` | DEAD | Uniquement consommé par `NeedsStaffingWorkspace`. 0 import restant. |
| `src/components/needs-staffing/StaffingListWorkspaceView.tsx` | DEAD | Uniquement consommé par `NeedsStaffingWorkspace`. 0 import restant. |
| `src/components/needs-staffing/UnifiedPlanningView.tsx` | DEAD | Uniquement consommé par `NeedsStaffingWorkspace`. 0 import restant. |
| `src/lib/needs-staffing/use-needs-staffing-url-state.ts` | DEAD | Uniquement consommé par `NeedsStaffingWorkspace`. 0 import restant. |
| `src/components/missions/OpportunitiesDesktopView.tsx` | DEAD | 0 import applicatif (orphelin historique). |
| `src/components/missions/OpportunitiesKpiSection.tsx` | DEAD | 0 import applicatif (formule KPI canonisée dans le builder V2). |
| `src/components/missions/OpportunitySkillsCloud.tsx` | DEAD | 0 import applicatif. |
| `src/components/missions/planning/OpportunitiesPlanningView.tsx` | DEAD | Uniquement importé par les vues legacy supprimées. 0 import restant. |
| `src/app/(app)/missions/_data/get-opportunities-planning.ts` | DEAD | 0 appel applicatif restant. Remplacé par `getPlanningChapterData`. |
| `src/app/(app)/missions/_data/get-opportunity-skills-cloud.ts` | DEAD | 0 appel applicatif restant. |
| `src/components/staffing/StaffingDesktopDashboard.tsx` | DEAD | 0 appel applicatif (/staffing redirige vers /missions/opps). |
| `src/components/staffing/StaffingMobileDashboard.tsx` | DEAD | 0 appel applicatif. |
| `src/components/staffing/StaffingDesktopView.tsx` | DEAD | Uniquement importé par `components/staffing/index.tsx`. |
| `src/components/staffing/StaffingMobileView.tsx` | DEAD | Uniquement importé par `components/staffing/index.tsx`. |
| `src/components/staffing/StaffingListView.tsx` | DEAD | Uniquement importé par `StaffingDesktopView.tsx`. |
| `src/components/staffing/StaffingPlanningView.tsx` | DEAD | Uniquement importé par `NeedsStaffingWorkspace` et `StaffingDesktopView`. |
| `src/components/staffing/StaffingTabbedShell.tsx` | DEAD | 0 appel applicatif. |
| `src/components/staffing/StaffingSectionTabBar.tsx` | DEAD | Uniquement importé par `StaffingTabbedShell.tsx`. |
| `src/components/staffing/StaffingEntityPanel.tsx` | DEAD | 0 appel applicatif. |
| `src/components/staffing/StaffingDrawer.tsx` | DEAD | Re-export inutile de 4 lignes. Drawer importé en `AssistanceCaseDrawer`. |
| `src/components/staffing/index.tsx` | DEAD | Barrel historique de `SyntheseStaffingSection`. 0 import applicatif. |
| `src/app/(app)/staffing/_data/get-staffings-planning.ts` | DEAD | 0 appel applicatif restant. |
| `getMobileStaffingsList()`, `MobileStaffingRow` (`get-staffings-list.ts`) | DEAD | Fonctions et types retirés du fichier `get-staffings-list.ts`. |

### Code conservé et protégé (Confirmé actif)

| Fichier / Composant | Classification | Rôle / Consommateurs réels |
|---|---|---|
| `StageQuickEditorDialog.tsx` | ACTIVE V2 | Action d'édition rapide d'étape sur `NeedsListPanel` Desktop. |
| `StageTimeline.tsx` & `stage-timeline-config.ts` | ACTIVE V2 | Timeline d'étape intégrée à `StageQuickEditorDialog`. |
| `NewStaffingButton.tsx` | ACTIVE V2 | Bouton de création de staffing sur `StaffingInProgressRail`. |
| `src/lib/needs-staffing/model.ts` | ACTIVE V2 | Fonctions de filtrage (`filterNeedsRows`) utilisées par `buildNeedsList`. |
| `src/lib/needs-staffing/coverage.ts` | ACTIVE SHARED | Calculs de couverture et filtres statut consommés par les loaders de besoins. |
| `src/lib/needs-staffing/url-state.ts` | ACTIVE SHARED | Parsing de tri/filtres et `resolveLegacyStaffingRedirect`. |
| `src/lib/needs-staffing/create-actions.ts` | ACTIVE SHARED | Types et actions de création. |
| `src/components/staffing/AssistanceCaseDrawer.tsx` + sous-composants | ACTIVE SHARED | Drawer unique de staffing / recrutement, monté globalement dans `AppOverlayHosts.tsx`. |
| `src/components/staffing/matching/*` | ACTIVE SHARED | Modale `MatchingDialog` et résultats partagés avec Consultants / Cockpit / Opportunités. |
| `src/lib/staffing-matching/` | ACTIVE SHARED | Moteur de matching besoin-centrique unique. |
| `src/app/(app)/missions/_data/get-needs-staffing-shared.ts` | ACTIVE V2 | KPI partagés et liste des besoins ouverts pour Synthèse et Besoins. |
| `src/app/(app)/missions/_data/get-opportunities-list.ts` | ACTIVE V2 | Liste des opportunités pour Besoins et Planning. |
| `src/app/(app)/missions/_data/get-opportunity-detail.ts` | ACTIVE V2 | Détail chargé à la demande pour l'opportunité sélectionnée (`?opp=`). |
| `src/app/(app)/staffing/_data/get-staffings-list.ts` (`getStaffingsList`) | ACTIVE V2 | Liste des positionnements pour `StaffingInProgressRail`. |
| `/missions/opps/[id]` & `/missions/opps/[id]/modifier` | ACTIVE V2 | Deep-link et page dédiée de consultation / modification. |
| `/staffing` (`src/app/(app)/staffing/page.tsx`) | COMPATIBILITY | Redirection permanente vers `/missions/opps?section=besoins`. |

---

## 6. Validation Data / Supabase / n8n / KANBAN-001

- **DATA-0 :** Aucune migration SQL, aucun changement de table, schéma, RLS, RPC, view, pgvector ou modèle de données.
- **n8n :** Aucun nouveau workflow, aucun webhook modifié, aucun trigger altéré.
- **KANBAN-001 :** Aucun composant ou mécanisme Kanban réintroduit. Les anciens composants Kanban ont été définitivement purgés.
- **Adaptive Design (ADR-0006) :** Respect strict. Desktop = analyse dense ; Mobile = état minimal léger ; aucun CSS masquant du Desktop sur Mobile.

---

## 7. Quality Gates & Résultats des tests

Exécutées dans l'ordre strict prescrit par `CLAUDE.md` :

1. `rm -rf .next` : ✅ Cache Next.js purgé.
2. `npm run typecheck` : ✅ `tsc --noEmit` — 0 erreur.
3. `npm run check:server-boundary` : ✅ Frontière serveur/client intègre (`import "server-only"` vérifié).
4. `npx eslint` sur fichiers touchés : ✅ 0 erreur, 0 avertissement.
5. `npm run build` : ✅ Next.js 16.2.7 Turbopack — 42/42 pages compilées, route `/missions/opps` dynamique.
6. `git diff --check` : ✅ 0 espace superflu, 0 conflit.
7. `npm test` : ✅ **294 fichiers de test / 3 056 tests passés (0 échec)**.

---

## 8. Registre des dettes

| Dette | Catégorie | Statut / Justification |
|---|---|---|
| **Opportunities Mobile V2** | `DEFERRED PRODUCT` | Reconstruction d'une expérience Mobile dédiée « Mobile = Action », légère et optimisée. Non bloquant pour la clôture technique Desktop. |
| **Avant-vente Projets — contenu métier (PRODUCT-05)** | `DEFERRED PRODUCT` | Structure 3 panneaux et `EmptyState` authentiques livrés au Lot 7 ; articulation métier liée aux projets forfait réservée aux arbitrages futurs. |
| **Contrat Data commun rentabilité missions (7.3A)** | `DEFERRED DATA` | Chantier transverse coordonné Engagements / Finance, à rebaseliner avec `performance-data-audit`. |

**Dettes bloquantes (BLOCKING) :** **0**.

---

## 9. Verdict final

- **Opportunities Workspace :** ✅ **TECHNICALLY CLOSED**
- **Opportunities Lot 12 :** ✅ **CLOSED**
- **BLOCKING :** **0**
- **Opportunities Mobile V2 :** **DEFERRED PRODUCT**
