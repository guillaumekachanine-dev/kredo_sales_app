# Consultants Workspace — 02-CLOSURE-AUDIT

> **Date :** 2026-09-10  
> **Chantier :** Consultants Workspace  
> **Lot :** Lot 15 — Suppression définitive du legacy Recruitment et clôture technique  
> **Branche :** `main`  
> **Verdict :** **`Consultants Workspace ✅ TECHNICALLY CLOSED`**  

---

## 1. Baseline

- **Baseline initiale du chantier :** `064b6c025fa24d0978b3c0959a3f640a5763f43b`
- **Baseline d'entrée Lot 15 :** `83861559b9ce37c9927d10d4c51ccae48a42b822` (`feat(agenda): refonte mobile de la modale « Créer un événement »`)
- **Derniers jalons livrés préalables :**
  - KANBAN-001 (`b2c22c21`) : suppression globale du système Kanban
  - Phase 7.2 (`bb2a3a4d`) : alignement cible navigation Consultants
  - Lot 14 (`50f1a31e`) : intégration Shell global / CRM (SHELL-0018 Phase 6.2)

---

## 2. Architecture finale Consultants

Le domaine métier unifié **Consultants** consolide le cycle de vie complet des collaborateurs et candidats sous la route canonique `/consultants`.

```
src/features/consultants/
├── __tests__/
├── activity/                                  # Chapitre Activité & Congés
├── candidates/                                # Chapitre Vivier Candidats
│   ├── actions/                               # Server Actions candidat
│   │   ├── create-candidate.ts
│   │   ├── update-candidate-profile.ts
│   │   ├── update-candidate-status.ts
│   │   └── update-hiring-step.ts
│   ├── components/                            # Composants candidat actifs
│   │   ├── CandidateDrawer.tsx
│   │   ├── CandidateProfileEditor.tsx
│   │   ├── CandidateReferenceProfile.tsx
│   │   ├── HiringProcessStepper.tsx
│   │   └── NewCandidateDrawer.tsx
│   ├── data/                                  # Data loader & builder candidate-centric
│   │   ├── build-consultants-candidates.ts
│   │   ├── consultants-candidates.types.ts
│   │   └── get-consultants-candidates.ts
│   ├── CandidateInlineControls.tsx
│   ├── CandidatesDesktop.tsx
│   ├── CandidatesMobile.tsx
│   ├── candidates-process.test.ts
│   ├── candidates-view.test.ts
│   └── candidates-view.ts
├── collaborators/                             # Chapitre Collaborateurs
├── data/                                      # Data Synthèse & loader global
│   ├── build-consultants-synthese.ts
│   ├── consultants-synthese.types.ts
│   ├── get-consultants-skills.ts
│   └── get-consultants-synthese.ts
├── desktop/                                   # Shell & vues Desktop
│   ├── synthese/
│   ├── ConsultantsDesktopHeader.tsx
│   └── ConsultantsDesktopShell.tsx
├── mobile/                                    # Shell & vues Mobile
│   ├── synthese/
│   └── ConsultantsMobileShell.tsx
├── modules/                                   # Modules contextuels Desktop / Mobile
│   ├── production-leave/
│   └── profile-matching/
├── navigation/                                # Définition des sections & routing
│   ├── consultants-sections.config.ts
│   └── consultants-sections.test.ts
├── skills/                                    # Module Desktop Pool de compétences
└── recruitment-deprecation.test.ts
```

---

## 3. Navigation Desktop

- **Shell :** `SectionRail` V2 (largeur `11.5rem`, chapeau navy, header = chapitre actif, URL-driven via `?section=`).
- **4 Chapitres Desktop :**
  1. **Vue d'ensemble** (`?section=synthese` ou racine `/consultants`)
  2. **Collaborateurs** (`?section=collaborateurs`)
  3. **Activité & Congés** (`?section=activite-conges`)
  4. **Vivier Candidats** (`?section=candidats`) — rendu en `StructuredList`
- **Modules Desktop (`?module=`) :**
  - **Pool de compétences** (`?module=pool-competences`) — composant `PoolCompetencesMap`
  - **Production & Congés** (`?module=production-conges`) — `IntelligenceSplitModalShell`
  - **Matching Profil** (`?module=matching-profil`) — `IntelligenceSplitModalShell`

---

## 4. Navigation Mobile

- **5 Accès canoniques Mobile :**
  1. `?section=synthese` : Vue d'ensemble (KPI, pipeline graphique, fins de mission)
  2. `?section=collaborateurs` : Liste des collaborateurs
  3. `?section=activite-conges` : Activité & congés (avec switch `ProductionLeaveMobile`)
  4. `?section=candidats` : Vivier candidats (cartes mobiles, filtres, drawer)
  5. `?section=pool-competences` : Pool de compétences (carte des compétences)
- **Résolution :** `getMobileTabsForPath("/consultants")` aligné via `CONSULTANTS_SECTIONS`.

---

## 5. Data contracts

- **Synthèse :** `getConsultantsSynthese()` — view-model unique agrégé pur.
- **Candidats :** `getConsultantsCandidates()` / `buildConsultantsCandidates()` — candidate-centric (`candidates` + `candidate_hiring_processes` + `opportunity_candidates`).
- **Skills :** `getConsultantsSkills()` / `buildPoolCompetencesDataset()` — compétences collaborateurs et candidats.
- **Production & Congés :** `getProductionLeaveData()` — granularité mensuelle `1 collab × 1 mois`.
- **Matching Profil :** `getProfileMatchingData()` — lecture seule sur le cache `match_scores`.

---

## 6. Absorption Recruitment

L'ancien domaine Recruitment a été intégralement absorbé sans aucune perte de capacité métier :
- Parité fonctionnelle 17/17 prouvée au Lot 9.
- Création de candidat : `NewCandidateDrawer` déplacé et actif.
- Fiche candidat & édition : `CandidateDrawer`, `CandidateProfileEditor`, `CandidateReferenceProfile` déplacés et actifs.
- Processus de recrutement : `HiringProcessStepper` déplacé et actif.
- Génération de rapport d'activité : bouton intégré dans `CandidatesDesktop`.
- Planification agenda : intégré dans `CandidateDrawer` via `AgendaEventDrawer`.
- Heuristiques de planning non fiables : formellement dépréciées (C-08 / C-28).

---

## 7. Code supprimé

Les composants et loaders orphelins suivants ont été définitivement supprimés (`git rm`) :

| Fichier supprimé | Raison |
|---|---|
| `src/app/(app)/recruitment/_data/get-recruitment-workspace.ts` | Loader legacy opportunity-centric remplacé par le loader candidate-centric |
| `src/app/(app)/recruitment/_actions/update-recruitment-status.ts` | Server Action orpheline (0 call-site applicatif) |
| `src/components/recruitment/RecruitmentWorkspace.tsx` | Workspace legacy remplacé par `/consultants?section=candidats` |
| `src/components/recruitment/RecruitmentListView.tsx` | Vue legacy remplacée par `CandidatesDesktop` (`StructuredList`) |
| `src/components/recruitment/RecruitmentPlanningView.tsx` | Vue planning heuristique dépréciée |
| `src/components/recruitment/dashboard/RecruitmentDesktopDashboard.tsx` | Dashboard orphelin (0 import externe) |
| `src/components/recruitment/dashboard/RecruitmentMobileDashboard.tsx` | Dashboard orphelin (0 import externe) |
| `src/components/recruitment/` | Répertoire entièrement supprimé |
| `src/app/(app)/recruitment/_actions/` | Répertoire entièrement supprimé |
| `src/app/(app)/recruitment/_data/` | Répertoire entièrement supprimé |

---

## 8. Code déplacé

Tous les composants candidat actifs ont été déplacés par `git mv` vers `src/features/consultants/candidates/components/` :

| Source | Destination |
|---|---|
| `src/components/recruitment/CandidateDrawer.tsx` | `src/features/consultants/candidates/components/CandidateDrawer.tsx` |
| `src/components/recruitment/CandidateProfileEditor.tsx` | `src/features/consultants/candidates/components/CandidateProfileEditor.tsx` |
| `src/components/recruitment/CandidateReferenceProfile.tsx` | `src/features/consultants/candidates/components/CandidateReferenceProfile.tsx` |
| `src/components/recruitment/HiringProcessStepper.tsx` | `src/features/consultants/candidates/components/HiringProcessStepper.tsx` |
| `src/components/recruitment/NewCandidateDrawer.tsx` | `src/features/consultants/candidates/components/NewCandidateDrawer.tsx` |

---

## 9. Server Actions

Les 4 Server Actions actives ont été déplacées par `git mv` vers `src/features/consultants/candidates/actions/` avec suppression de la revalidation obsolète `revalidatePath("/recruitment")` :

| Source | Destination | Revalidations actives |
|---|---|---|
| `src/app/(app)/recruitment/_actions/create-candidate.ts` | `src/features/consultants/candidates/actions/create-candidate.ts` | `/consultants`, `/missions/opps` |
| `src/app/(app)/recruitment/_actions/update-candidate-profile.ts` | `src/features/consultants/candidates/actions/update-candidate-profile.ts` | `/consultants`, `/missions/opps` |
| `src/app/(app)/recruitment/_actions/update-candidate-status.ts` | `src/features/consultants/candidates/actions/update-candidate-status.ts` | `/consultants` |
| `src/app/(app)/recruitment/_actions/update-hiring-step.ts` | `src/features/consultants/candidates/actions/update-hiring-step.ts` | `/consultants` |

---

## 10. Shared domain contracts

Les contrats métier transverses sont strictement préservés dans `src/lib/recruitment/` :
- `src/lib/recruitment/recruitment-stages.ts` : `HIRING_PROCESS_STAGES`, `RECRUITMENT_STAGES`, `RECRUITMENT_TERMINAL_STATUSES`, `getRecruitmentStatusLabel`, `normalizeRecruitmentKey`.
- `src/lib/recruitment/candidate-lifecycle.ts` : `CANDIDATE_LIFECYCLE_STATUSES`, `getCandidateLifecycleLabel`, `isTerminalCandidateLifecycle`.

Consommateurs actifs préservés : Reports, Cockpit Intelligence, Staffing, Consultants.

---

## 11. Compatibility routes

- `src/app/(app)/recruitment/page.tsx` : conservé strictement comme redirection permanente :
  ```tsx
  import { permanentRedirect } from "next/navigation"

  export default function RecruitmentPage() {
    permanentRedirect("/consultants?section=candidats")
  }
  ```
- `src/app/(app)/consultants/activite-conges/page.tsx` : `permanentRedirect("/consultants?section=activite-conges")`
- `src/app/(app)/consultants/pool-competences/page.tsx` : `permanentRedirect("/consultants?section=pool-competences")`

---

## 12. KANBAN-001 invariant

- Aucun symbole Kanban réintroduit (`EntityKanbanView`, `EntityKanbanCard`, `CandidatesKanbanDesktop`, `RecruitmentKanbanView`, `kanbanView`, `viewMode = "kanban"`, etc.).
- Les étapes recrutement portent exclusivement la nomenclature `HIRING_PROCESS_STAGES` / `HiringProcessStageKey`.
- Seules 2 occurrences textuelles de « kanban » subsistent dans tout `src` (strictement autorisées) :
  1. `src/lib/config/practices.ts` — Practice conseil « Agile Delivery, Scrum & Kanban »
  2. `src/lib/needs-staffing/url-state.test.ts` — Test de repli de compatibilité URL `view=kanban` → `list`

---

## 13. Static proofs

| Contrôle | Attendu | Résultat |
|---|---|---|
| `RecruitmentWorkspace \| RecruitmentListView \| RecruitmentPlanningView` | 0 actif | ✅ 0 (uniquement tests d'absence) |
| `RecruitmentDesktopDashboard \| RecruitmentMobileDashboard` | 0 actif | ✅ 0 (uniquement tests d'absence) |
| `getRecruitmentWorkspace` | 0 actif | ✅ 0 (uniquement test d'absence) |
| `@/app/(app)/recruitment/_actions \| @/app/(app)/recruitment/_data` | 0 occurrence | ✅ 0 occurrence |
| `@/components/recruitment/` | 0 occurrence | ✅ 0 occurrence |
| `updateRecruitmentStatus` | 0 occurrence | ✅ 0 occurrence |
| `kanban` (insensible à la casse dans `src`) | 2 exceptions autorisées | ✅ 2 occurrences exactes |

---

## 14. Tests / gates

| Gate | Commande | Résultat |
|---|---|---|
| Tests ciblés | `npm test -- src/features/consultants/recruitment-deprecation.test.ts src/features/consultants/navigation/consultants-sections.test.ts` | ✅ PASS (55 tests) |
| Tests candidats & domaine | `npm test -- src/features/consultants/candidates/ src/lib/recruitment/` | ✅ PASS (23 tests) |
| Typecheck | `npm run typecheck` (après purge `.next`) | ✅ PASS |
| Server boundary | `npm run check:server-boundary` | ✅ PASS |
| Lint | `npx eslint` sur fichiers touchés | ✅ PASS (0 erreur) |
| Suite complète Vitest | `npm test` | ✅ PASS (292 fichiers / 2 897 tests) |
| Build de production | `npm run build` | ✅ PASS (Turbopack, routes compilées) |

---

## 15. Dettes restantes

- **BLOCKING :** `0`
- **NON-BLOCKING :**
  - `CAND-4` : Édition inline du positionnement commercial (`opportunity_candidates.status`) dans le tableau candidats — déléguée à l'ouverture du drawer Staffing.
  - `SKILLS-1` : Mobile « Pool de compétences » maintenu comme section dédiée (`?section=pool-competences`) vs Module Desktop (`?module=pool-competences`).
- **DEFERRED :**
  - Aucune dette différée bloquante.

---

## 16. Verdict

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│            Consultants Workspace                       │
│        ✅ TECHNICALLY CLOSED                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```
