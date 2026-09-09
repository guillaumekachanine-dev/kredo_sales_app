# Consultants Workspace — hub du chantier

> **Statut global : en cours (Lots 0-14 livrés)**
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

La route canonique reste **`/consultants`**. `/recruitment` est désormais dépréciée et
redirige de façon permanente vers `/consultants?section=candidats` (Lot 10).

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

➡️ **Lot 15 — Nettoyage et clôture — `DEFERRED UNTIL TARGET-ALIGNMENT` (reporté après Phase 7.2 Consultants).**

> **Supersession / dépendance :** la cible de navigation canonique est désormais
> `docs/navigation_architecture/SHELL-0018/09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md`
> (décision SHELL 6.3R). Elle prévoit pour ce workspace : `RENAME` de chapitres
> (Synthèse → Vue d'ensemble, Candidats → Vivier Candidats), et surtout la **transformation
> structurelle** du chapitre **Pool de compétences → Module** (`TRANSFORM`), traitée en
> **Phase 7.2**. Le **Lot 15 n'est pas annulé** : il est **différé jusqu'après Phase 7.2**, car
> des composants aujourd'hui classés legacy (dashboards recrutement orphelins
> `src/components/recruitment/dashboard/*`, routes `(tabbed)` résiduelles) peuvent être
> réutilisés ou transformés par la cible. **Aucune suppression prématurée.**

Contenu inchangé du Lot 15 quand il s'exécutera : voir `00-REFERENCE-CHANTIER-CONSULTANTS.md` § Lot 15.

- Lot 1 : shell `/consultants` sur `SectionRail` V2, navigation `?section=`, `SectionNavBarSlot` descendu.
- Lot 2 : view-model unique `getConsultantsSynthese()` — DATA-1/2/3/7 résolus (C-16→C-20).
- Lot 3 : page Synthèse Desktop + Mobile — KPI, graphiques SVG/HTML maison (C-21/C-22).
- Lot 4 : chapitre Collaborateurs — statut ⇐ `collaborators.status` (C-23 / LEGACY-4).
- Lot 5 : chapitre Activités & congés internalisé (`?section=activite-conges`) — `src/features/consultants/activity/`, `<h1>` retiré, route legacy → `permanentRedirect` (C-24).
- Lot 6 : chapitre Pool de compétences internalisé (`?section=pool-competences`) — `git mv` → `src/features/consultants/skills/`, loader `data/get-consultants-skills.ts`, `<header>` retiré, route legacy → `permanentRedirect` (C-25). **NAV-2 résolu.**
- Lot 7 : contrat de données Candidats candidate-centric — `src/features/consultants/candidates/data/` (builder pur + loader + tests) + `src/lib/recruitment/candidate-lifecycle.ts` (C-26). **DATA-4/6 + PRODUCT-2/3 résolus.** Aucune UI.
- Lot 8 : chapitre Candidats in-shell (`?section=candidats`) — `CandidatesDesktop` (`StructuredList`), `CandidatesMobile` (cartes), édition inline lifecycle + étape process, drawers réutilisés (C-27). **5/5 chapitres in-shell.** `/recruitment` intact.
- Lot 9 : absorption fonctionnelle Recruitment — parité prouvée, Kanban candidate-centric Desktop (`CandidatesKanbanDesktop`, sélecteur Tableau/Kanban), bouton « Nouveau rapport », bouton « Planifier » (`AgendaEventDrawer` dans `CandidateDrawer`), CAND-3 résolu (labels lifecycle canoniques), CAND-4 tranché (Option 1 : positioning dans `StaffingDrawer`), LEGACY-2 confirmé orphelins (C-28). `/recruitment` intact.
- Lot 10 : dépréciation de la route legacy `/recruitment` via `permanentRedirect("/consultants?section=candidats")`, suppression de tout loader et rendu legacy de cette route, repointage du contrat mobile `getMobileTabsForPath()` (C-13 résolue), de l'entrée `mainMenuItems` sous Ressources et des call-sites UI actifs (`SyntheseMobile`, `TalentProfileDetail`, `entity-links`), tests d'invariants (C-29). Aucun nettoyage prématuré du code métier legacy (réservé Lot 15). NAV-3 partiellement résolue (retrait complet du menu réservé Lot 14).
- Lot 11 : contrat de données Production & Congés — granularité mensuelle `1 collaborateur × 1 mois` (C-30, DATA-5 résolu), CRA source du réalisé, ventilation absences datées sans planning journalier fictif (C-08), TACI non double-compté, RLS financière respectée, builder pur testé (22 tests + sentinelles) + loader `server-only` (`src/features/consultants/modules/production-leave/data/`). Aucune UI.
- Lot 12 : UI Module Production & Congés (Desktop + Mobile) — déclaration dans SectionRail (`contextualModules`), lazy-loading via `?module=production-conges`, résolution PRODUCT-4 via vue dédiée `ProductionLeaveMobile` sur `activite-conges` (C-31), dataviz SVG maison Desktop et barres HTML Mobile, masquage RLS `null` sans 0 €, distinction `hasActivityData` (zéro vs données absentes), aucun calendrier journalier.
- Lot 13 : Module Matching profil (Desktop + Mobile) — projection profil-centrique en lecture seule sur le cache `match_scores` du moteur existant (C-09 / C-32, PRODUCT-1 résolu), absence de score ≠ incompatibilité (couverture affichée), parsing défensif JSONB, modal Desktop `IntelligenceSplitModalShell` avec liste profils + filtres et détail C1-C6 (« Ouvrir le besoin » + « Relancer le matching de ce besoin »), branche Mobile contextuelle `ProfileMatchingMobile` accessible depuis les profils/drawers (touch target ≥ 44px), lazy-loading strict sous ADR-0006, 0 migration, 0 second moteur, 0 LLM/n8n.
- Lot 14 : intégration Shell global / CRM (SHELL 6.2) — rattachement Consultants sous CRM, suppression « Équipe », « Recrutement » et groupe « Ressources », suppression du dernier SectionNavBarSlot et du route group (tabbed), préservation des deep-links historiques par git mv, retrait useSidebarCollapse, résolution NAV-3 et NAV-4 (C-34).


> ⚠️ Travail parallèle non commité dans l'arbre (cockpit mobile, veille, `design-lab/`) : stager les chemins consultants explicitement, ne jamais `git add -A`.
