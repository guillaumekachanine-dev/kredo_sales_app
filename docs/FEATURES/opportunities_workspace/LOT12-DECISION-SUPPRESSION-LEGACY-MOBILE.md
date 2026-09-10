# Opportunities Workspace — Lot 12 — Décision de suppression du legacy Mobile

> **Date :** 2026-09-10
> **Statut :** ACTÉ / exécutable
> **Portée :** Opportunities Workspace — Lot 12
> **Autorité :** cette décision supersède, pour le Lot 12, toute consigne historique demandant de préserver ou transformer `NeedsStaffingWorkspace` par simple recherche de parité Mobile.
> **Baseline de décision :** `8e5250e5` (`docs(opportunities): record Lot 7.1 commit SHA`)

## 1. Décision

`src/components/needs-staffing/NeedsStaffingWorkspace.tsx` doit être traité comme **REMOVE**, pas comme `TRANSFORM`.

La suppression est volontaire même si elle retire temporairement la vue Opportunities Mobile actuelle. Le Lot 12 ne doit pas recopier l'ancien comportement dans un nouveau composant uniquement pour préserver une parité avec une architecture désormais jugée obsolète.

Le futur Mobile Opportunities sera reconstruit ultérieurement comme une vraie implémentation **Mobile = Action**, indépendante, légère et optimisée.

Classification de la future reconstruction :

`Opportunities Mobile V2 — DEFERRED PRODUCT`

## 2. Preuve d'impact réelle

Audit du code sur `origin/main` :

- `NeedsStaffingWorkspace` n'a qu'un consommateur applicatif direct : la branche Mobile de `src/app/(app)/missions/opps/page.tsx`.
- Les autres occurrences sont des tests, commentaires ou documentation.
- Le Desktop Opportunities V2 n'en dépend plus : il utilise `SummaryDesktop`, `NeedsDesktop`, `PresalesDesktop`, `PlanningDesktop` et les modules Phase 7.1.
- La suppression du composant ne supprime aucune donnée en base, aucun contrat Supabase, aucune Server Action, aucun workflow n8n et aucun moteur partagé.

Conséquence produit assumée : tant qu'Opportunities Mobile V2 n'est pas reconstruite, `/missions/opps` en Mobile ne doit plus rendre l'ancien workspace.

## 3. Comportement Mobile temporaire

Le Lot 12 doit conserver une route Mobile techniquement saine sans recréer une feature.

Cible transitoire recommandée :

- détection serveur Mobile conservée via `getDashboardDevice()` ;
- aucun chargement des datasets exclusivement nécessaires à l'ancien workspace Mobile ;
- rendu d'un état minimal avec une primitive KREDO existante (`EmptyState` ou équivalent) indiquant que la vue Opportunities Mobile sera reconstruite ;
- aucun composant Desktop chargé puis caché en CSS ;
- aucune fausse capacité ou bouton non fonctionnel.

Cette surface transitoire n'est pas une nouvelle implémentation fonctionnelle Mobile.

## 4. Grappe legacy à réauditer pour suppression

La suppression de `NeedsStaffingWorkspace` rend plusieurs dépendances candidates à une suppression définitive. Chaque suppression reste conditionnée à une preuve `rg` de zéro consommateur applicatif réel après retrait du workspace.

Candidats forts :

- `src/components/needs-staffing/NeedsListView.tsx`
- `src/components/needs-staffing/StaffingListWorkspaceView.tsx`
- `src/components/needs-staffing/UnifiedPlanningView.tsx`
- `src/lib/needs-staffing/use-needs-staffing-url-state.ts`
- `getMobileStaffingsList()` dans `src/app/(app)/staffing/_data/get-staffings-list.ts`
- `MobileStaffingRow` si aucun autre consommateur réel ne subsiste
- anciennes primitives Planning uniquement consommées par les surfaces legacy supprimées

## 5. Éléments explicitement protégés

La suppression de l'ancien workspace ne doit pas entraîner un nettoyage par dossier.

Conserver tant qu'ils ont des consommateurs réels :

- `getNeedsStaffingSharedData()` — utilisé par le Desktop Opportunities V2 ;
- `src/lib/needs-staffing/model.ts` — notamment `filterNeedsRows`, utilisé par le builder V2 ;
- `src/lib/needs-staffing/url-state.ts` — encore utilisé par le parsing V2 et le redirect `/staffing` ;
- `StageQuickEditorDialog` — utilisé par `NeedsListPanel` Desktop V2 ;
- `StageTimeline` et `stage-timeline-config` — dépendances actives de l'édition d'étape ;
- `NewStaffingButton` — utilisé par `StaffingInProgressRail` Desktop V2 ;
- matching (`src/lib/staffing-matching/`, `MatchingDialog`) ;
- `StaffingDrawer`, `AssistanceCaseDrawer`, composants de détail et primitives partagées ;
- route de compatibilité `/staffing` et `resolveLegacyStaffingRedirect` ;
- loaders staffing encore consommés par d'autres surfaces.

## 6. Principe de nettoyage

Le Lot 12 vise l'élimination du code hérité, pas sa relocalisation cosmétique.

Règles :

1. `DEAD` → supprimer.
2. `ACTIVE SHARED` → conserver.
3. `ACTIVE OPPORTUNITIES V2` → conserver ou déplacer uniquement si la frontière feature l'exige réellement.
4. `MOBILE LEGACY ONLY` → supprimer, même sans remplacement immédiat, puisque la perte temporaire de la vue Mobile est une décision produit explicite.
5. `UNCERTAIN` → ne pas supprimer avant preuve.

Ne pas recréer `NeedsStaffingWorkspace` sous un autre nom.

## 7. Conséquences performance et architecture

La suppression est favorable à l'architecture cible :

- disparition d'un gros Client Component historique mêlant Mobile, Desktop, filtres, planning, simulation et anciennes vues ;
- réduction des imports Mobile inutiles ;
- possibilité de retirer les fetchs propres à l'ancien Mobile, notamment `getMobileStaffingsList()` si son orphelinat est confirmé ;
- suppression des dépendances Planning/Desktop tirées dans un composant utilisé uniquement côté Mobile ;
- meilleure conformité à l'Adaptive Design KREDO.

## 8. Routing

Conserver :

- `/missions/opps` ;
- `/missions/opps/[id]` ;
- `/missions/opps/[id]/modifier` ;
- `?section=` / `?module=` / `?opp=` ;
- compatibilité `?scope=` au parsing ;
- route `/staffing` comme redirection permanente vers le chapitre canonique Besoins & Staffing.

La suppression de l'ancienne UI Mobile ne justifie aucune migration de pathname.

## 9. Data / Supabase / n8n

Classification : `DATA-0`.

Interdictions :

- aucune migration ;
- aucun changement RLS/RPC/view ;
- aucun changement de schéma ;
- aucun nouveau contrat Data ;
- aucun workflow n8n ;
- aucun nouveau webhook ;
- aucun nouveau moteur métier.

## 10. Critère de clôture

Le Lot 12 peut conclure :

`Opportunities Workspace → TECHNICALLY CLOSED`

avec :

`BLOCKING = 0`

même si `Opportunities Mobile V2` reste `DEFERRED PRODUCT`, puisque l'absence temporaire de la vue Mobile est désormais une décision explicite et non une régression accidentelle.
