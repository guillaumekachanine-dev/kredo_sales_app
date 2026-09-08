# Consultants Workspace — hub du chantier

> **Statut global : en cours (Lots 0-7 livrés)**
> **Branche de travail unique : `main`**
> **Baseline de cadrage : `064b6c025fa24d0978b3c0959a3f640a5763f43b`**

Ce dossier est la **source documentaire unique** du mini-chantier *Consultants Workspace*.
Tout agent intervenant sur ce chantier commence par lire ce fichier, puis le document
canonique, puis le ledger.

## Intention

Fusionner l'actuelle page **« Équipe »** (`/consultants`) et l'actuel workspace
**« Recrutement »** (`/recruitment`) en un domaine métier unique **« Consultants »**,
couvrant le cycle de vie complet des ressources internes et candidates :
pilotage des collaborateurs, activité, congés, vivier candidats, recrutement,
compétences et matching.

La route canonique reste **`/consultants`**. `/recruitment` disparaît fonctionnellement
à terme et redirige vers `/consultants?section=candidats` (Lot 10, jamais avant parité prouvée).

## Documents

| Fichier | Rôle |
|---|---|
| [`README.md`](./README.md) | Ce fichier — point d'entrée, statut, prochain lot. |
| [`00-REFERENCE-CHANTIER-CONSULTANTS.md`](./00-REFERENCE-CHANTIER-CONSULTANTS.md) | Document fonctionnel et architectural canonique : cible finale, décisions, modèle Data, Desktop/Mobile, découpage complet en lots autonomes, protocoles de reprise. |
| [`01-IMPLEMENTATION-LEDGER.md`](./01-IMPLEMENTATION-LEDGER.md) | Source de vérité opérationnelle : statut de chaque lot, baseline, fichiers touchés, décisions, gates, commits, dettes, prochain lot. |

## Dépendances de chantier

- **Standard de navigation secondaire Desktop** : `docs/navigation_architecture/SHELL-0018/`
  (primitive `SectionRail`, largeur `11.5rem`, chapeau navy, header = chapitre actif,
  navigation URL-driven). Le chantier Consultants **réutilise** ce standard, il n'en crée pas un nouveau.
- **Intégration au menu principal `CRM`** = dépendance du chantier **SHELL-0018 Phase 6**
  (Lot 6.2 « Migration du module Consultants / Équipe »). Traitée dans le **Lot 14** de ce chantier,
  en coordination, jamais en avance de phase.

## Règle de vérité

En cas de divergence : (1) le code réel sur `origin/main` ; (2) le standard SHELL-0018 ;
(3) le document canonique ; (4) le ledger ; (5) tout autre document.
Toute divergence découverte est inscrite dans le ledger **avant** modification du code.

## QA

La QA visuelle est réalisée **uniquement par Guillaume**. Les agents exécutent les gates
techniques (`typecheck` → `test` → `check:server-boundary` → `lint` → `build`) et ne lancent
jamais de navigateur, Playwright, screenshots ou smoke visuel. Un lot n'est jamais bloqué
par l'absence de QA visuelle.

## Prochain lot

➡️ **Lot 8 — Page Candidats** (voir `00-REFERENCE-CHANTIER-CONSULTANTS.md` § Lot 8).

- Lot 1 : shell `/consultants` sur `SectionRail` V2, navigation `?section=`, `SectionNavBarSlot` descendu.
- Lot 2 : view-model unique `getConsultantsSynthese()` — DATA-1/2/3/7 résolus (C-16→C-20).
- Lot 3 : page Synthèse Desktop + Mobile — KPI, graphiques SVG/HTML maison (C-21/C-22).
- Lot 4 : chapitre Collaborateurs — statut ⇐ `collaborators.status` (C-23 / LEGACY-4).
- Lot 5 : chapitre Activités & congés internalisé (`?section=activite-conges`) — `src/features/consultants/activity/`, `<h1>` retiré, route legacy → `permanentRedirect` (C-24).
- Lot 6 : chapitre Pool de compétences internalisé (`?section=pool-competences`) — `git mv` → `src/features/consultants/skills/`, loader `data/get-consultants-skills.ts`, `<header>` retiré, route legacy → `permanentRedirect` (C-25). **NAV-2 résolu.**
- Lot 7 : contrat de données Candidats candidate-centric — `src/features/consultants/candidates/data/` (builder pur + loader + tests) + `src/lib/recruitment/candidate-lifecycle.ts` (C-26). **DATA-4/6 + PRODUCT-2/3 résolus.** Aucune UI.

> ⚠️ Travail parallèle non commité dans l'arbre (cockpit mobile, veille, `design-lab/`) : stager les chemins consultants explicitement, ne jamais `git add -A`.
