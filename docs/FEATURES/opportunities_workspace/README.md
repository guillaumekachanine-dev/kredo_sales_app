# Opportunities Workspace — hub du chantier

> **Nom canonique :** Opportunities Workspace
> **Nom produit affiché :** Opportunités
> **Statut global : en implémentation (Lots 1→11 + Phase 7.1 livrés ; Lot 12 UNBLOCKED / READY)**
> **Branche de travail unique : `main`** (aucune feature branch)
> **Baseline de cadrage : `61aba08ee1b35f848d223f96e08a1e1a624545ec`**

Ce dossier est la **source documentaire unique** du mini-chantier *Opportunities Workspace*.
Tout agent intervenant sur ce chantier commence par lire ce fichier, puis le document
canonique, puis le ledger. Il n'exécute jamais un lot sans avoir relu le **code réel de
`origin/main`**.

## Intention

Transformer l'ancien workspace **« Besoins & staffing »** (`/missions/opps`) en un espace unique
**« Opportunités »**, aligné sur le **Shell Desktop V2 de KREDO** (`SectionRail`, SHELL-0018).
Le workspace pilote :

- les **opportunités commerciales** et leur pipeline ;
- leur **staffing** (positionnements candidats/collaborateurs) ;
- l'**avant-vente** (projets/avant-vente — structure seulement en V1) ;
- leurs **échéances** ;
- leurs **outils contextuels** (Matching profils, Simulation financière, Revue post-mortem).

La route canonique reste **`/missions/opps`** (OPP-02).

## Structure cible de navigation

```
Chapeau : Opportunités                      → /missions/opps
Chapitres :
  1. Vue d'ensemble        (racine)          — surface analytique pleine largeur
  2. Besoins & Staffing    (?section=besoins)      — Liste / Détail besoin / Staffing en cours
  3. Avant-vente Projets   (?section=avant-vente)  — Liste / Vue principale / Détails (EmptyState V1)
  4. Planning & Échéances  (?section=planning)     — Liste opps / Planning / Détails opp
Modules :
  Matching profils · Simulation financière · Revue post-mortem
  (Modélisation de CA : Future capability — NON affichée — OPP-11)
```

## Documents

| Fichier | Rôle |
|---|---|
| [`README.md`](./README.md) | Ce fichier — point d'entrée, statut, prochain lot, règle de reprise. |
| [`00-REFERENCE-CHANTIER-OPPORTUNITES.md`](./00-REFERENCE-CHANTIER-OPPORTUNITES.md) | Document fonctionnel et architectural canonique historique : cible, architecture Data, Desktop, Mobile, navigation, composants, legacy, modules, décisions, roadmap. Le code réel et les décisions de supersession ci-dessous priment sur ses éléments devenus historiques. |
| [`01-IMPLEMENTATION-LEDGER.md`](./01-IMPLEMENTATION-LEDGER.md) | Source de vérité opérationnelle : lots livrés, baselines, décisions, tests, gates, commits, dettes, prochain lot. |
| [`LOT12-DECISION-SUPPRESSION-LEGACY-MOBILE.md`](./LOT12-DECISION-SUPPRESSION-LEGACY-MOBILE.md) | **Décision active Lot 12** : `NeedsStaffingWorkspace` = REMOVE, disparition temporaire de l'ancienne vue Mobile acceptée, reconstruction `Opportunities Mobile V2` différée. Supersède les anciennes consignes de parité Mobile. |
| [`LOT12-HANDOFF-NOUVELLE-DISCUSSION.md`](./LOT12-HANDOFF-NOUVELLE-DISCUSSION.md) | Handoff autonome pour reprendre le Lot 12 dans une nouvelle discussion. |

## Dépendances de chantier

- **SHELL-0018** (`docs/navigation_architecture/SHELL-0018/`) — primitive `SectionRail`, navigation URL-driven, modules contextuels uniquement lorsqu'ils sont réels. Le chantier réutilise ce standard.
- **Consultants Workspace** (`docs/FEATURES/consultants_workspace/`) — vivier candidats et moteur partagé de matching.
- **Financial Modeling** (`src/features/financial-modeling/`) — module Simulation financière.
- **Intelligence Missions** (`src/features/intelligence-missions/`) — mission `post-mortem-commercial` (module Revue post-mortem).

## Règle de vérité

En cas de divergence :

1. le **code réel** sur `origin/main` ;
2. les **standards SHELL-0018** ;
3. les **décisions de supersession explicites**, notamment `LOT12-DECISION-SUPPRESSION-LEGACY-MOBILE.md` ;
4. le document canonique (`00-REFERENCE-CHANTIER-OPPORTUNITES.md`) ;
5. le ledger (`01-IMPLEMENTATION-LEDGER.md`) ;
6. tout autre document historique.

Toute divergence découverte est inscrite dans la documentation courante avant modification du code concerné.

## Décision Lot 12 — suppression du legacy Mobile

La politique historique « Mobile protégé / ne pas supprimer `NeedsStaffingWorkspace` » est désormais **supersédée**.

Audit du code après Phase 7.1 : `NeedsStaffingWorkspace` n'a qu'un consommateur applicatif direct identifié, la branche Mobile de `/missions/opps`. Le Desktop Opportunities V2 n'en dépend plus.

Décision :

- `NeedsStaffingWorkspace` → **REMOVE**, pas `TRANSFORM` ;
- ne pas recréer un `OpportunitiesMobileWorkspace` qui recopierait l'ancien mécanisme ;
- accepter temporairement l'absence de la vue fonctionnelle Opportunities Mobile ;
- garder la route Mobile techniquement saine via un état minimal KREDO sans fetch métier inutile ;
- classer la reconstruction future `Opportunities Mobile V2 — DEFERRED PRODUCT` ;
- supprimer ensuite toute grappe exclusivement orpheline, mais conserver toutes les briques encore partagées ou utilisées par le Desktop V2.

Cette décision est détaillée dans `LOT12-DECISION-SUPPRESSION-LEGACY-MOBILE.md`.

## QA

La QA visuelle est réalisée **uniquement par Guillaume**. Les agents exécutent les gates techniques
(`typecheck` → `test` → `check:server-boundary` → `lint` fichiers touchés → `build`) et ne lancent
jamais navigateur, `agent-browser`, Playwright, screenshots ou smoke visuel.

Un lot n'est jamais bloqué par l'absence de QA visuelle ; il est techniquement livrable dès que les gates passent et qu'aucune régression technique connue ne subsiste.

## Règle de reprise

Un agent recevant « Exécute le Lot 12 du Opportunities Workspace » doit être autonome après lecture du dépôt :

1. `git fetch origin` ; vérifier `HEAD`, `origin/main` et le working tree sans écraser de travail parallèle ;
2. lire `CLAUDE.md`, `AGENTS.md` ;
3. lire ce `README.md` ;
4. lire `LOT12-DECISION-SUPPRESSION-LEGACY-MOBILE.md` ;
5. lire `LOT12-HANDOFF-NOUVELLE-DISCUSSION.md` ;
6. lire `00-REFERENCE-CHANTIER-OPPORTUNITES.md` et `01-IMPLEMENTATION-LEDGER.md` comme historique et état opérationnel ;
7. réauditer le graphe réel des consommateurs avec `rg` avant chaque suppression ;
8. protéger strictement tout chantier parallèle.

## Prochain lot

➡️ **Lot 12 — Nettoyage et clôture — `UNBLOCKED / READY`.**

Phase 7.1 est livrée. Le blocker historique lié à la Synthèse est levé.

Le Lot 12 doit maintenant :

- supprimer `NeedsStaffingWorkspace` volontairement ;
- retirer ses dépendances exclusivement orphelines après preuve ;
- supprimer les surfaces Desktop legacy réellement mortes (`OpportunitiesDesktopView`, `OpportunitiesKpiSection`, anciennes chaînes Staffing/Planning si orphelines) ;
- préserver `getNeedsStaffingSharedData`, `StageQuickEditorDialog`, `StageTimeline`, `NewStaffingButton`, `src/lib/needs-staffing/model.ts`, `src/lib/needs-staffing/url-state.ts`, matching, drawers, routes et loaders encore actifs ;
- conserver `/staffing` comme redirection de compatibilité ;
- ne créer aucune nouvelle feature Mobile dans ce lot ;
- créer `02-CLOSURE-AUDIT.md` ;
- atteindre `BLOCKING = 0`.

Résultat attendu :

```text
Opportunities Workspace → ✅ TECHNICALLY CLOSED
Opportunities Lot 12 → ✅ CLOSED
BLOCKING → 0
Opportunities Mobile V2 → DEFERRED PRODUCT
```

Après Lot 12, faire un rebaseline global avant de démarrer le chantier suivant, notamment avant Phase 7.3A car le chantier `performance-data-audit` peut avoir modifié les hypothèses Data.

> ⚠️ Travail parallèle possible dans l'arbre (`docs/performance-data-audit/`, `src/lib/supabase/*`, `src/lib/intelligence/*`, etc.). Stager les chemins explicitement, jamais `git add -A`.
