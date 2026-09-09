# ADR-0023 : Suppression globale du paradigme Kanban

**Statut :** Accepté (Livré — lot KANBAN-001)
**Date :** 2026-09-09
**Décideur :** Guillaume Kachanine
**Prolonge :** ADR-0018 › D-13 (« le mode Kanban est supprimé de toutes les pages »).

---

## Décision

> **KANBAN-001**
> Le paradigme Kanban est retiré globalement de KREDO.
> Les étapes métier restent indépendantes de toute représentation UI.

KREDO n'utilise plus de représentation Kanban. Le mécanisme sera remplacé
ultérieurement par une autre représentation ; **aucun placeholder ni composant
de remplacement n'est créé maintenant**. KANBAN-001 supprime, il ne remplace pas.

## Portée appliquée

- **Primitives génériques supprimées :** `EntityKanbanView`, `EntityKanbanCard`.
- **Vues métier supprimées :** `CandidatesKanbanDesktop` (Consultants), `RecruitmentKanbanView`
  (Recruitment legacy), `OpportunitiesKanbanView` (Opportunités), `StaffingKanbanView` (Staffing).
- **Contrats de vue :** `EntityWorkspaceViewMode` et les sélecteurs de vue passent de
  `list | kanban | planning` à `list | planning`. Le repli naturel est la Liste.
- **URL :** plus aucun `view=kanban` actif. Une URL héritée `?view=kanban` dégrade
  silencieusement vers `list` (aucun redirect dédié).
- **Drag & drop :** tout le code DnD (exclusivement porté par `EntityKanbanView`) est supprimé.
  L'avancement d'étape reste disponible via les contrôles inline (`CandidateInlineControls`, etc.).

## Étapes métier — conservées, renommées

Les six étapes du process de recrutement interne
(`prequalification`, `entretien_manager`, `tests_techniques`, `proposition`,
`signature`, `integration`) représentent `candidate_hiring_processes.current_step`
et **ne changent pas**. Seule la terminologie perd la référence au Kanban :

| Avant | Après |
|---|---|
| `HiringKanbanStageKey` | `HiringProcessStageKey` |
| `HiringKanbanStageConfig` | `HiringProcessStageConfig` |
| `HIRING_KANBAN_STAGES` | `HIRING_PROCESS_STAGES` |

Côté Opportunités, l'alias UI `OPPORTUNITY_KANBAN_STAGES` est supprimé ;
`OPPORTUNITY_STAGES` / `OPPORTUNITY_ACTIVE_STAGES` / `OPPORTUNITY_PIPELINE_STAGES`
sont inchangés. Le pipeline commercial n'est pas modifié.

## Non-portée

- **Aucun changement de données :** schéma Supabase, RLS, RPC, vues, workflows n8n intacts.
  `opportunity.stage`, `candidate_hiring_processes.current_step`, le lifecycle candidat et
  `opportunity_candidates.status` restent tels quels — aucune migration.
- **Aucune nouvelle représentation** (pas de pipeline board, swimlane, funnel interactif,
  matrix, timeline). Chantier ultérieur.
- La refonte parallèle `src/features/opportunities/summary/*` n'est pas concernée.

## Exceptions documentées au « zéro occurrence `kanban` dans `src` »

1. `src/lib/config/practices.ts` — la practice de conseil
   « Agile Delivery, Scrum & Kanban » est une **notion métier** (offre de mission),
   sans rapport avec la représentation UI. Conservée (ADR-0018 D-12, principe :
   ne pas supprimer une notion métier au motif que son nom contient « kanban »).
2. `src/lib/needs-staffing/url-state.test.ts` — un test de non-régression vérifie
   explicitement que l'URL héritée `view=kanban` dégrade vers `list` (critère
   d'acceptation KANBAN-001). Prouver ce comportement impose de nommer la valeur héritée.
