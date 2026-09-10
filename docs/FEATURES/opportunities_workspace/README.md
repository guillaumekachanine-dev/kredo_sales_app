# Opportunities Workspace — hub du chantier

> **Nom canonique :** Opportunities Workspace
> **Nom produit affiché :** Opportunités
> **Statut global : en implémentation (Lots 1→11 livrés le 2026-09-09)**
> **Branche de travail unique : `main`** (aucune feature branch)
> **Baseline de cadrage : `61aba08ee1b35f848d223f96e08a1e1a624545ec`**

Ce dossier est la **source documentaire unique** du mini-chantier *Opportunities Workspace*.
Tout agent intervenant sur ce chantier commence par lire ce fichier, puis le document
canonique, puis le ledger. Il n'exécute jamais un lot sans avoir relu le **code réel de
`origin/main`**.

## Intention

Transformer l'actuel workspace **« Besoins & staffing »** (`/missions/opps`, sous le shell
historique `missions/(tabbed)`) en un espace unique **« Opportunités »**, aligné sur le
**Shell Desktop V2 de KREDO** (`SectionRail`, SHELL-0018). Le workspace pilote :

- les **opportunités commerciales** et leur pipeline ;
- leur **staffing** (positionnements candidats/collaborateurs) ;
- l'**avant-vente** (projets/avant-vente — structure seulement en V1) ;
- leurs **échéances** (planning mensuel / annuel) ;
- leurs **outils contextuels** (Matching profil, Simulation devis, Post-Mortem).

C'est d'abord un **changement de workspace et de navigation**, pas une migration de
`pathname`. La route canonique reste **`/missions/opps`** (OPP-02).

## Structure cible de navigation

```
Chapeau : Opportunités                → /missions/opps
Chapitres :
  1. Vue d'ensemble     (racine, sans paramètre)   — surface analytique pleine largeur
  2. Besoins & Staffing (?section=besoins)          — Liste / Détail besoin / Staffing en cours
  3. Avant-vente Projets (?section=avant-vente)      — Liste / Vue principale / Détails (EmptyState V1)
  4. Planning & Échéances (?section=planning)       — Liste opps / Planning / Détails opp
Modules (bas du SectionRail, uniquement si réellement disponibles) :
  Matching profils · Simulation financière · Revue post-mortem
  (Modélisation de CA : Future capability — NON affichée — OPP-11)
```

## Documents

| Fichier | Rôle |
|---|---|
| [`README.md`](./README.md) | Ce fichier — point d'entrée, statut, prochain lot, règle de reprise. |
| [`00-REFERENCE-CHANTIER-OPPORTUNITES.md`](./00-REFERENCE-CHANTIER-OPPORTUNITES.md) | Document fonctionnel et architectural **canonique** : cible, architecture Data, Desktop, Mobile, navigation, composants, legacy, modules, décisions (OPP-01→OPP-16), questions ouvertes, roadmap Lots 0→12, protocoles agent, critères d'acceptation. |
| [`01-IMPLEMENTATION-LEDGER.md`](./01-IMPLEMENTATION-LEDGER.md) | Source de vérité **opérationnelle** : lot courant, lots livrés, baseline, décisions, fichiers touchés, tests, gates, commits, dettes, prochain lot. |

## Dépendances de chantier

- **SHELL-0018** (`docs/navigation_architecture/SHELL-0018/`) — primitive `SectionRail`
  (`src/lib/navigation/section-rail.ts` + `src/components/layout/SectionRail.tsx`), largeur
  `11.5rem`, chapeau navy, header = chapitre actif, navigation URL-driven, `contextualModules`
  contextuels uniquement. Le chantier **réutilise** ce standard, il n'en crée pas un nouveau (OPP-03).
- **SHELL-0018 Phase 6** — `/missions/opps` vit dans `missions/(tabbed)` (consommateur de
  `SectionNavBarSlot`). La sortie du shell `(tabbed)` et la suppression de `SectionNavBarSlot`
  sont coordonnées avec **Phase 6.3** (« Rationalisation des routes Missions historiques »).
  Traité au **Lot 11** de ce chantier, jamais en avance de phase.
- **Consultants Workspace** (`docs/FEATURES/consultants_workspace/`) — définition canonique
  du **vivier candidats** (C-16 / C-26), module **Matching profil**
  (`src/features/consultants/modules/profile-matching/`), moteur unique
  `src/lib/staffing-matching/`. Le chantier Opportunités **réutilise** ces contrats.
- **Financial Modeling** (`src/features/financial-modeling/`) — module Simulation devis.
- **Intelligence Missions** (`src/features/intelligence-missions/`) — mission
  `post-mortem-commercial` (module Post-Mortem).

## Règle de vérité

En cas de divergence :

1. le **code réel** sur `origin/main` ;
2. les **standards SHELL-0018** (`01-ADR-0018-*`, `02-SECONDARY-RAIL-STANDARD.md`) ;
3. le **document canonique** (`00-REFERENCE-CHANTIER-OPPORTUNITES.md`) ;
4. le **ledger** (`01-IMPLEMENTATION-LEDGER.md`) ;
5. tout autre document historique.

Toute divergence découverte est inscrite dans le ledger **avant** modification du code concerné.

## QA

La QA visuelle est réalisée **uniquement par Guillaume**. Les agents exécutent les gates
techniques (`typecheck` → `test` → `check:server-boundary` → `lint` (fichiers touchés) → `build`)
et ne lancent **jamais** de navigateur, `agent-browser`, Playwright, screenshots ou smoke visuel.
Ils ne demandent aucun renouvellement de `.codex/auth-state.json`. Un lot n'est **jamais** bloqué
par l'absence de QA visuelle ; il est *techniquement livrable* dès que les gates passent et
qu'aucune régression technique connue ne subsiste.

## Règle de reprise

Un agent recevant « Exécute le Lot N du Opportunities Workspace » doit être **autonome après
lecture du dépôt seul** :

1. `git fetch origin` ; se placer sur `main` ; synchroniser avec `origin/main` sans écraser de
   travail parallèle (jamais de `reset --hard`, `force push`, `git add -A` aveugle).
2. Lire `CLAUDE.md`, `AGENTS.md`.
3. Lire ce `README.md`, puis `00-REFERENCE-CHANTIER-OPPORTUNITES.md` (fiche du lot), puis
   `01-IMPLEMENTATION-LEDGER.md`.
4. Vérifier le **code réel** des fichiers cités par la fiche de lot (ils peuvent avoir bougé).
5. Vérifier les dépendances cross-feature (Consultants, Financial Modeling, Intelligence Missions,
   SHELL-0018) et Supabase si le lot est un lot Data.
6. Consigner toute divergence dans le ledger **avant** de coder.

## Prochain lot

➡️ **Lot 12 — Nettoyage et clôture — `DEFERRED UNTIL TARGET-ALIGNMENT` (reporté après Phase 7.1 Opportunités).**

> **Supersession / dépendance :** la cible de navigation canonique est désormais
> `docs/navigation_architecture/SHELL-0018/09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md`
> (décision SHELL 6.3R). Elle prévoit pour ce workspace des `RENAME` de chapitres
> (Synthèse → Vue d'ensemble, Avant-vente → Avant-vente Projets, Planning → Planning & Échéances)
> et de modules (Matching profils, Simulation financière, Revue post-mortem), traités en
> **Phase 7.1**. Le **Lot 12 n'est pas annulé** : il est **différé jusqu'après Phase 7.1**, car
> des composants aujourd'hui classés legacy (`OpportunitiesDesktopView.tsx`,
> `src/components/staffing/`, `src/components/needs-staffing/`) peuvent être réutilisés ou
> transformés par la cible. **Aucune suppression prématurée.**

Contenu inchangé du Lot 12 quand il s'exécutera : audit exhaustif, parité, code mort,
suppressions prouvées sûres, rapport `02-CLOSURE-AUDIT.md` ; voir
`00-REFERENCE-CHANTIER-OPPORTUNITES.md` § Lot 12.

- Lot 11 livré : Legacy / compatibilité / navigation globale (coordonné SHELL-0018 Lot 6.3) —
  renommage CRM « Opportunités », retrait tabs Desktop Engagements, redirection canonique
  `/staffing` vers `?section=besoins` sans scope/view, canonisation du lien mobile vers
  `?section=besoins`, retrait de `useSidebarCollapse` dans `OpportunitiesDesktopShell`,
  compatibilité `scope=needs|staffing` maintenue au parsing, migration de tous les deep-links
  utilisateur vers `/missions?vue=...`.
- Lot 1 livré : shell `/missions/opps` SHELL-0018 V2 (`SectionRail` inline, 4 chapitres
  `?section=`, compat `?scope=`, sortie de `(tabbed)`).
- Lot 2 livré : primitive `OpportunitiesTriPanel` (Liste │ Main │ Détails), locale à
  la feature, pas encore consommée (chapitres = Lots 6/7/9).
- Lot 3 livré : Data Contract Synthèse — `buildOpportunitiesSynthese` (pur) +
  `getOpportunitiesSynthese` (loader). DATA-01 → **OPP-19** (option B), DATA-02b →
  OPP-20, PRODUCT-01 affichage → OPP-21, échéances provisoires → OPP-22.
- Lot 4 livré : Synthèse Desktop (`src/features/opportunities/summary/`) — 3 KPI +
  pipe `Clients | Practices` + miroir compétences + entonnoir staffing + échéances,
  SVG maison. **QA visuelle Guillaume en attente.**
- Lot 5 livré : Data contract Besoins & staffing (`src/features/opportunities/needs/data/`)
  — `buildNeedsList` / `resolveSelectedNeedId` (purs) + `getNeedsChapterData` (loader,
  détail du seul besoin sélectionné). Sélection `?opp=` → **OPP-23**. Data-only.
- Lot 6 livré : chapitre Besoins Desktop (`NeedsDesktop` sur `OpportunitiesTriPanel`) —
  rail Liste + `OpportunityDetailView` inline + rail « Staffing en cours ». Kanban non
  repris (**OPP-25**), détail inline (**OPP-24**), contrat URL `?opp=`+filtres (**OPP-26**),
  chapitre sans HEX (**OPP-27**). `NeedsStaffingWorkspace` Desktop retiré (Mobile inchangé).
  **QA visuelle Guillaume en attente.**
- Lot 7 livré : chapitre Avant-vente (`PresalesDesktop`) — structure 3 panneaux + 3 vrais
  `EmptyState`, aucune donnée. PRODUCT-05 reste ouverte. **QA visuelle Guillaume en attente.**
- Lot 8 livré : Data Contract Planning — `src/features/opportunities/planning/data/` :
  `OpportunityDeadline` + builder pur **unique** `buildOpportunityDeadlines` + loader
  `getOpportunityDeadlines`. **DATA-03 → OPP-28** (arbitrage `next_action_at` > prochain
  `calendar_events` hors `cancelled` > `target_close_date` ; `start_date` jamais échéance).
  Synthèse refactorée pour consommer ce builder (remplace OPP-22). Data-only, aucune migration.
- Lot 9 livré : Planning Desktop sur `OpportunitiesTriPanel` — liste des opportunités ouvertes │
  milestone planning central `Mois | Année` │ détail contextuel. Une lane et au plus un jalon
  canonique par opportunité, source encodée par forme + couleur, ligne Aujourd’hui, navigation
  de période et sélection partagée `?opp=`. **OPP-29**. Mobile inchangé. **QA visuelle
  Guillaume en attente.**
- Lot 10 livré : modules contextuels (`src/features/opportunities/modules/`) — contrat
  `?module=matching|simulation|post-mortem` + 3 wrappers REUSE-only (`MatchingDialog` ·
  `FinancialModelingDesktopDialog` · `MissionComposerDesktop`/`post-mortem-commercial`) +
  `OpportunitiesModulesHost` (dialogs lazy). **Les 3 modules constamment visibles sur tous
  les chapitres** (indépendants de l'onglet) ; contexte `?opp=` transmis s'il existe.
  **CROSS-01/02/03 → OPP-30**. `Modélisation de CA` non affichée. Mobile inchangé.
  **QA visuelle Guillaume en attente.**

> ⚠️ Travail parallèle non commité possible dans l'arbre (cockpit mobile, veille, `design-lab/`,
> `docs/FEATURES/cockpit_intelligence_mobile_actions_contextuelles/07_HANDOFF_CLOTURE_LOTS_A_J.md`
> non suivi au moment du Lot 0). **Stager les chemins explicitement, jamais `git add -A`.**
