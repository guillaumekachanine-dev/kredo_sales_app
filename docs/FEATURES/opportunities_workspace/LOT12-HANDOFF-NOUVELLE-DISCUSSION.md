# HANDOFF — Opportunities Workspace — Lot 12

> **But :** reprendre le chantier dans une nouvelle discussion sans perdre le contexte ni réinterpréter les décisions déjà actées.
> **Date :** 2026-09-10
> **Branche unique :** `main`
> **Baseline fonctionnelle Opportunities :** `8e5250e5` (`docs(opportunities): record Lot 7.1 commit SHA`)
> **Décision Lot 12 ajoutée ensuite :** `961e1317` (`docs(opportunities): record Lot 12 mobile legacy removal decision`)
> **Document de décision obligatoire :** `docs/FEATURES/opportunities_workspace/LOT12-DECISION-SUPPRESSION-LEGACY-MOBILE.md`

## 1. État du chantier

Opportunities Workspace a déjà livré :

- Lots 1 → 11 ;
- Phase 7.1 — alignement fonctionnel final ;
- navigation Desktop cible stabilisée ;
- KANBAN-001 déjà appliqué globalement.

Le Lot 12 est `UNBLOCKED / READY` et constitue le lot de **nettoyage final / clôture technique**.

Cible Desktop actuelle :

### Chapitres

1. Vue d'ensemble
2. Besoins & Staffing
3. Avant-vente Projets
4. Planning & Échéances

### Modules

1. Matching profils
2. Simulation financière
3. Revue post-mortem

Clés techniques, routing et Data contracts déjà stabilisés. Ne pas les rouvrir.

## 2. Décision produit nouvelle et impérative

`NeedsStaffingWorkspace` doit être **supprimé**, pas déplacé ni transformé.

Il n'a qu'un consommateur applicatif direct identifié : la branche Mobile de `/missions/opps`.

La perte temporaire de la vue Opportunities Mobile actuelle est **acceptée explicitement**.

Il ne faut donc PAS créer `OpportunitiesMobileWorkspace` pour recopier l'ancien fonctionnement.

La future reconstruction est classée :

`Opportunities Mobile V2 — DEFERRED PRODUCT`

Pendant l'intervalle, `/missions/opps` Mobile doit rester techniquement sain avec un état minimal utilisant une primitive KREDO existante, sans fetch métier inutile et sans charger le Desktop.

## 3. Conséquences directes déjà auditées

Suppression sûre ou candidate forte après preuve finale :

- `src/components/needs-staffing/NeedsStaffingWorkspace.tsx` → REMOVE ;
- `NeedsListView.tsx` → candidat REMOVE ;
- `StaffingListWorkspaceView.tsx` → candidat REMOVE ;
- `UnifiedPlanningView.tsx` → candidat REMOVE ;
- `src/lib/needs-staffing/use-needs-staffing-url-state.ts` → candidat REMOVE ;
- `getMobileStaffingsList()` → candidat REMOVE si plus aucun consommateur après retrait Mobile ;
- `MobileStaffingRow` → candidat REMOVE si orphelin ;
- `OpportunitiesDesktopView.tsx` → legacy candidat REMOVE ;
- `OpportunitiesKpiSection.tsx` → legacy candidat REMOVE ;
- anciennes primitives Planning/Staffing uniquement reliées aux chaînes legacy → à supprimer après preuve.

## 4. Éléments protégés

Ne pas supprimer par association de dossier.

Conserver les briques encore actives :

- `getNeedsStaffingSharedData()` ;
- `src/lib/needs-staffing/model.ts` ;
- `src/lib/needs-staffing/url-state.ts` ;
- `StageQuickEditorDialog` ;
- `StageTimeline` ;
- `stage-timeline-config` ;
- `NewStaffingButton` ;
- `MatchingDialog` et `src/lib/staffing-matching/` ;
- `StaffingDrawer` ;
- `AssistanceCaseDrawer` ;
- route `/staffing` et `resolveLegacyStaffingRedirect` ;
- tout loader staffing encore réellement consommé ;
- routes `/missions/opps/[id]` et `/missions/opps/[id]/modifier` ;
- tous les contrats Desktop V2.

`src/components/staffing/` ne doit jamais être supprimé globalement.

## 5. Travail parallèle à préserver

Des chantiers parallèles ont récemment touché :

- `docs/performance-data-audit/`
- `src/lib/supabase/*`
- `src/lib/intelligence/*`

À chaque reprise :

```bash
git fetch origin
git status --short
git log -n 20 --oneline
git rev-parse HEAD
git rev-parse origin/main
```

Le code réel de `origin/main` prime toujours.

Ne jamais :

- `git reset --hard` ;
- `git stash` du travail d'autrui ;
- `git add .` / `git add -A` en présence de fichiers parallèles ;
- force push.

## 6. Architecture / stack à respecter

- Next.js App Router / React / Tailwind v4 ;
- Supabase PostgreSQL + RLS ;
- n8n pour les opérations longues ;
- aucun changement Data attendu dans Lot 12 (`DATA-0`) ;
- Adaptive Design : branche serveur Mobile distincte ;
- ne jamais charger une branche Desktop pour la masquer en CSS ;
- pas de nouvelle librairie UI/dataviz ;
- KANBAN-001 reste strictement en vigueur.

## 7. Méthode du Lot 12

Étape obligatoire avant suppression : établir le graphe réel des consommateurs avec `rg`.

Classifier chaque symbole :

- `ACTIVE OPPORTUNITIES V2`
- `ACTIVE SHARED`
- `MOBILE LEGACY ONLY`
- `COMPATIBILITY`
- `DEAD`
- `UNCERTAIN`

Traitement :

- `DEAD` → REMOVE ;
- `MOBILE LEGACY ONLY` → REMOVE selon la décision produit ;
- `ACTIVE SHARED` → KEEP ;
- `ACTIVE OPPORTUNITIES V2` → KEEP ou MOVE seulement si la frontière feature l'exige ;
- `UNCERTAIN` → ne pas supprimer avant preuve.

Le but est de supprimer la dette, pas de la relocaliser.

## 8. Mobile temporaire

Après suppression de `NeedsStaffingWorkspace` :

- conserver `getDashboardDevice()` ;
- arrêter de charger les datasets exclusivement destinés à l'ancienne UI Mobile ;
- rendre un état minimal KREDO sur Mobile ;
- aucun bouton mort ;
- aucun placeholder donnant l'illusion d'une fonctionnalité prête ;
- aucune copie de l'ancien workspace ;
- aucun impact Desktop.

## 9. Routing à préserver

Conserver :

```text
/missions/opps
/missions/opps/[id]
/missions/opps/[id]/modifier
?section=
?module=
?opp=
compat ?scope=
/staffing → redirect canonique vers Besoins & Staffing
```

Aucune migration de pathname dans Lot 12.

## 10. Data / Supabase / n8n

Lot 12 = `DATA-0`.

Ne modifier :

- aucune table ;
- aucune migration ;
- aucun RLS ;
- aucune RPC/view ;
- aucun workflow n8n ;
- aucun webhook ;
- aucun MissionSpec ;
- aucun calcul métier partagé.

## 11. QA

QA visuelle réservée à Guillaume.

L'agent ne lance pas :

- browser ;
- Playwright ;
- agent-browser ;
- screenshots ;
- visual regression.

Quality gates attendues avant clôture :

```bash
rm -rf .next
npm run typecheck
npm run check:server-boundary
# eslint sur fichiers touchés
npm run build
git diff --check
npm test
```

## 12. Documentation de clôture attendue

Créer au terme du lot :

`docs/FEATURES/opportunities_workspace/02-CLOSURE-AUDIT.md`

Le rapport doit inclure :

- architecture finale Desktop ;
- état Mobile temporaire ;
- matrice du code supprimé / conservé ;
- preuves de consommateurs ;
- loaders supprimés/conservés ;
- routing ;
- KANBAN-001 ;
- Data/Supabase/n8n ;
- tests/gates ;
- dettes `BLOCKING`, `NON-BLOCKING`, `DEFERRED PRODUCT`, `DEFERRED DATA` ;
- verdict.

Clôture permise uniquement si :

`BLOCKING = 0`

La dette `Opportunities Mobile V2 — DEFERRED PRODUCT` n'est pas bloquante.

## 13. Résultat attendu

```text
Opportunities Workspace → ✅ TECHNICALLY CLOSED
Opportunities Lot 12 → ✅ CLOSED
BLOCKING → 0
Opportunities Mobile V2 → DEFERRED PRODUCT
```

## 14. Prochaine étape après Lot 12

Faire un rebaseline global avant de choisir le lot suivant.

Le candidat historique est :

`Phase 7.3A — contrat Data commun de rentabilité missions`

mais le chantier parallèle `performance-data-audit` peut modifier les hypothèses Data. Ne pas démarrer 7.3A sans réaudit court de `origin/main`.
