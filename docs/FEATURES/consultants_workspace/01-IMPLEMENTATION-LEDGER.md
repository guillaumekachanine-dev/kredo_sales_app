# Consultants Workspace — Implementation Ledger

> Source de vérité **opérationnelle** du chantier. Le document canonique
> (`00-REFERENCE-CHANTIER-CONSULTANTS.md`) porte le QUOI et le POURQUOI ; ce fichier porte
> l'ÉTAT RÉEL, lot par lot.

```
Chantier                 : Consultants Workspace
Statut global            : en cours
Branche                  : main (branche unique — aucune feature branch)
Baseline initiale        : 064b6c025fa24d0978b3c0959a3f640a5763f43b
Dernier lot livré        : Lot 3 — Synthèse Desktop + Mobile
Lot courant              : —
Prochain lot             : Lot 4 — Migration Collaborateurs
Dernier SHA connu origin/main : 61bbab04   (2026-09-08 ; SHA Lot 3 renseigné après push)
```

## Table des lots

Statuts autorisés : `⬜ todo` · `🟡 en cours` · `✅ techniquement livré` · `⛔ bloqué`
(jamais `done` — ne jamais signifier qu'une QA visuelle a eu lieu).

| Lot | Objet | Statut | Commit | Notes |
|---|---|---|---|---|
| 0 | Cadrage documentaire | ✅ techniquement livré | `4f9fbba1` | Dossier + doc de référence + ledger + inventaire + roadmap 0→15 + DECISION LOG C-01→C-13 + 20 OPEN QUESTIONS. Aucun code applicatif. |
| 1 | Socle Consultants Workspace (rail V2 `SectionRail`, `?section=`, header, 5 chapitres, `SectionNavBarSlot` descendu) | ✅ techniquement livré | `8e191c8b` | `src/features/consultants/{navigation,desktop,mobile,data}`. C-14 (2 sections in-shell), C-15 (`SectionNavBarSlot` → `(tabbed)/layout`). NAV-1 + LEGACY-1 résolues. `npm test` complet vert. |
| 2 | Data Contract Synthèse | ✅ techniquement livré | `61bbab04` | `src/features/consultants/data/` : builder pur + loader + 13 tests. DATA-1/2/3/7 résolus (C-16→C-20). **Aucune migration** (2.x non déclenché). `npm test` complet vert. |
| 3 | Synthèse Desktop + Mobile | ✅ techniquement livré | _(SHA après push)_ | `src/features/consultants/{desktop,mobile}/synthese/` : KPI + 2 graphiques (SVG maison / barres HTML) + 2 tableaux + `dataNotes`. C-21/C-22. `typecheck`+`test` complet+`server-boundary`+`eslint` verts ; **`npm run build` non joué** (dev server concurrent) → Guillaume. |
| 4 | Migration Collaborateurs (`?section=collaborateurs`) | ⬜ todo | — | MOVE + REUSE `ConsultantsSynthese{Desktop,Mobile}`. |
| 5 | Migration Activités & congés (`?section=activite-conges`) | ⬜ todo | — | REUSE `ConsultantsActivityDashboard`. Redirection route legacy. |
| 6 | Migration Pool de compétences (`?section=pool-competences`) | ⬜ todo | — | REUSE `PoolCompetencesMap`. Redirection route legacy. |
| 7 | Data Contract Candidats (candidate-centric) | ⬜ todo | — | Résoudre DATA-4/6, PRODUCT-2/3. Backfill → sous-lot 7.x. |
| 8 | Page Candidats (Desktop + Mobile, inline edit) | ⬜ todo | — | Réutiliser server actions recrutement (jamais dupliquer). |
| 9 | Absorption fonctionnelle Recruitment (audit parité) | ⬜ todo | — | Rapport de parité au ledger. Confirmer LEGACY-2. |
| 10 | Dépréciation `/recruitment` (redirect permanent) | ⬜ todo | — | Après parité Lot 9. Patron `prospection/page.tsx`. |
| 11 | Module Production & Congés — Data | ⬜ todo | — | Résoudre DATA-5. Aucun calendrier fictif (C-08). |
| 12 | Module Production & Congés — UI | ⬜ todo | — | Déclare le module dans `contextualModules`. |
| 13 | Module Matching profil (UI vers moteur existant) | ⬜ todo | — | Résoudre PRODUCT-1. Aucun second moteur (C-09). |
| 14 | Intégration Shell global / CRM | ⬜ todo | — | **Dépend de SHELL-0018 Phase 6 (Lot 6.2).** Résoudre NAV-3/4. |
| 15 | Nettoyage et clôture | ⬜ todo | — | Rapport `02-CLOSURE-AUDIT.md`. Statut global → techniquement close. |

## Décisions actées (miroir du DECISION LOG — détail dans le doc canonique)

| ID | Décision | Lot |
|---|---|---|
| C-01 | « Équipe » devient « Consultants » (domaine unique internes + candidates) | 0 |
| C-02 | Recruitment absorbé dans le chapitre Candidats | 0 |
| C-03 | `/consultants` reste canonique ; `/recruitment` → redirect `?section=candidats` (Lot 10) | 0 |
| C-04 | `SectionRail` V2 (SHELL-0018) = standard Desktop | 0 |
| C-05 | Navigation URL-driven `?section=` (`synthese` racine sans paramètre) | 0 |
| C-06 | Recrutement futur candidate-centric (loader part de `candidates`) | 0 |
| C-07 | Process recrutement ≠ lifecycle candidat ≠ positionnement commercial (3 vocabulaires) | 0 |
| C-08 | Production & Congés ne déduit jamais un planning journalier depuis des agrégats | 0 |
| C-09 | Matching profil réutilise le moteur unique existant | 0 |
| C-10 | Intégration CRM reportée à SHELL-0018 Phase 6 (Lot 14) | 0 |
| C-11 | Code en feature verticale `src/features/consultants/`, migration progressive | 0 |
| C-12 | Server actions recrutement réutilisées/refactorées, jamais dupliquées | 0 |
| C-13 | Contrat Mobile `getMobileTabsForPath()` protégé jusqu'à migration Mobile (Lots 9-10) | 0 |
| C-14 | Lot 1 : seuls `synthese` + `collaborateurs` rendus in-shell (`?section=`) ; `activite-conges`/`candidats`/`pool-competences` = liens directs jusqu'aux Lots 5/8/6 | 1 |
| C-15 | `SectionNavBarSlot` descendu de `consultants/layout.tsx` → `consultants/(tabbed)/layout.tsx` (patron `missions`) ; `main-menu.config` + Mobile intacts | 1 |
| C-16 | Effectif actif = `collaborators.status <> 'sorti'` ; vivier = `status='vivier'` (provisoire, Lot 7) ; recrutements YTD = `hired` + `closed_at` année civile | 2 |
| C-17 | Practice canonique = `offer_practices.slug` ; candidats → `practice_id`, collaborateurs → cascade `job_profile → nom exact → heuristique → null` ; aucune migration | 2 |
| C-18 | Positionnement collaborateur = `opportunity_candidates` via `person_id` (non terminal) ; `null` sans fiche candidat miroir ; `match_scores` jamais utilisé | 2 |
| C-19 | Rémunération intercontrat via `collaborator_compensation` ; `grossAnnual`/`cjm` nullables ; `compensationVisible` = `profiles.role ∈ {owner,admin}` | 2 |
| C-20 | View-model Synthèse = builder pur testé + loader mince ; aucun recalcul côté composant | 2 |
| C-21 | Section `synthese` = tableau de bord dédié ; `collaborateurs` garde le tableau legacy ; `page.tsx` charge par section | 3 |
| C-22 | Dataviz Desktop = SVG maison, Mobile = barres HTML+Tailwind ; palette practice = `offer_practices.color_hex` (fallback `var(--color-muted)`) | 3 |

## Questions ouvertes en cours

Détail et classement (DATA / PRODUCT / NAVIGATION / LEGACY) dans le doc canonique § 20.

| ID | Résumé | Lot cible | Statut |
|---|---|---|---|
| DATA-1 | Source d'autorité « effectif collaborateur actif » | 2 | ✅ résolue (C-16) |
| DATA-2 | Source canonique de la Practice (collaborateurs + candidats) | 2 | ✅ résolue (C-17) |
| DATA-3 | Preuve canonique d'un positionnement actif d'un collaborateur | 2 | ⚠️ partiellement résolue (C-18) — sous-question lien direct `opp↔collab` ouverte |
| DATA-4 | Définition « candidat qualifié durant l'année en cours » | 7 | ouverte |
| DATA-5 | Planning journalier de production inexistant en base | 11 | ouverte |
| DATA-6 | `candidates.availability` texte libre — normalisation ? | 7 | ouverte |
| DATA-7 | Salaire/CJM intercontrat sous RLS confidentielle — comportement rôle non habilité | 2 | ✅ résolue (C-19) |
| PRODUCT-1 | Intention module Matching : profil→besoins et/ou besoin→profils | 13 | ouverte |
| PRODUCT-2 | « Prochaine action » pour un candidat sans opportunité active | 7 | ouverte |
| PRODUCT-3 | Valeurs métier du sélecteur lifecycle candidat en UI | 7-8 | ouverte |
| PRODUCT-4 | Chevauchement Synthèse Mobile / module Production & Congés (planning) | 3 / 12 | ouverte |
| NAV-1 | `?section=` confirmé vs pathname après audit code réel Lot 1 | 1 | ✅ résolue (Lot 1) |
| NAV-2 | Redirections routes historiques `(tabbed)` — type et calendrier | 5-6 / 15 | ouverte |
| NAV-3 | Calendrier exact redirect `/recruitment` + retrait module menu | 10 / 14 | ouverte |
| NAV-4 | Consultants sous `CRM` ou `Ressources` dans SHELL-0018 Phase 6 | 14 | ouverte |
| LEGACY-1 | Retrait `SectionNavBarSlot` du layout consultants : ici (Lot 1) ou SHELL-0018 ? | 1 / 14 | ✅ résolue (Lot 1, retrait local ; global = Phase 6) |
| LEGACY-2 | `components/recruitment/dashboard/*` morts — confirmer et supprimer | 9 / 15 | ouverte |
| LEGACY-3 | `consultants/(tabbed)/layout.tsx` passthrough — supprimer après migration | 15 | ouverte |
| LEGACY-4 | `ConsultantsSyntheseDesktop` calcule « en mission » depuis `missions.status` — réconcilier avec C-16 | 4 | reportée (contrat figé C-16, réconciliation à la migration du tableau) |

## Baseline technique constatée (2026-09-08, `064b6c02`)

### Routes et fichiers

- `/consultants` — `src/app/(app)/consultants/`
  - `layout.tsx` → monte `SectionNavBarSlot` (legacy horizontal).
  - `(tabbed)/layout.tsx` → passthrough neutre.
  - `page.tsx` → Synthèse racine, loader `collaborators`+`missions`, split `getDashboardDevice()`.
  - `(tabbed)/activite-conges/page.tsx` → loader inline 6 lectures, `ConsultantsActivityDashboard`.
  - `(tabbed)/pool-competences/page.tsx` → loader inline, `PoolCompetencesMap`.
- `/recruitment` — `src/app/(app)/recruitment/`
  - `page.tsx` → `getRecruitmentWorkspace()` + `RecruitmentWorkspace` (Desktop+Mobile même arbre client).
  - `_data/get-recruitment-workspace.ts` → **opportunity_candidates-centric** (~600 lignes).
  - `_actions/` : `create-candidate` · `update-candidate-profile` · `update-candidate-status` · `update-hiring-step` · `update-recruitment-status`.
- Composants : `src/components/consultants/**`, `src/components/recruitment/**` (dont `dashboard/*` orphelins probables).
- Lib : `src/lib/recruitment/recruitment-stages.ts`, `src/lib/consultants/pool-competences-data.ts`, `src/lib/staffing-matching/**`.
- Navigation : `src/lib/navigation/main-menu.config.ts` (« Équipe » + « Recrutement » ; `getMobileTabsForPath` groupe `/missions/opps` + `/recruitment`).
- Standard rail : `src/lib/navigation/section-rail.ts` + `src/components/layout/SectionRail.tsx`.

### Base de données (live, `information_schema` + comptages)

- `collaborators` : 30 lignes — `status` ∈ {`en_mission` 26, `intercontrat` 3, `sorti` 1} ; `practice` = **text libre** (13 valeurs non normalisées) ; `job_profile_id` FK ; **pas de `practice_id`** ; 1 ligne avec `exit_date`.
- `candidates` : 43 lignes — `status` ∈ {`vivier` 11, `recrute` 11, `en_process` 9, `nouveau` 3, `qualifie` 3, `indisponible` 2, `ko_manager` 1, `propose` 1, `archive` 1, `refuse` 1} ; `practice_id` FK ; `job_profile_id` FK ; `availability` = text libre.
- `candidate_hiring_processes` : 34 lignes — `status` ∈ {`hired` 11, `active` 10, `cancelled` 5, `rejected` 5, `withdrawn` 3} ; `current_step` ∈ {`prequalification`, `entretien_manager`, `tests_techniques`, `proposition`, `signature`, `integration`} ; **les 11 `hired` ont un `closed_at` en 2026**.
- `candidate_hiring_milestones` : `step` = 6 mêmes valeurs ; `result` ∈ {`valide` 122, `en_attente` 7, `annule` 5, `refuse` 3}.
- `opportunity_candidates` : `status` aligné sur `RECRUITMENT_STAGES` ; `next_action` = text.
- `missions` : 33 lignes, **10 actives** avec `end_date >= today`.
- `match_scores` : **644 lignes** / 24 opportunités (`CLAUDE.md` annonce 18 — périmé).

> `CLAUDE.md` § état de la base est **périmé** sur ces compteurs (23 collab / 38 cand / 18 match_scores).
> Toujours recompter avant de s'appuyer sur un chiffre.

## Dettes connues (à traiter dans leur lot)

| Dette | Détail | Lot |
|---|---|---|
| Loader recrutement opportunity-centric | Le vivier non positionné est invisible | 7 |
| `RecruitmentWorkspace` non adaptive-split | Desktop + Mobile dans un même arbre client, sous-vues importées statiquement | 8 |
| `dashboard/RecruitmentDesktopDashboard` / `RecruitmentMobileDashboard` | Orphelins probables | 9 / 15 |
| `collaborators.practice` non normalisé | Text libre, non aligné `offer_practices.slug` | 2 / 2.x |
| Planning journalier de production | Absent en base (agrégats mensuels seulement) | 11 |
| Divergence statut collaborateur | `ConsultantsSyntheseDesktop` calcule « en mission » depuis `missions.status` — à réconcilier avec C-16 | 4 |
| `collaborators.practice_id` absent | Practice collaborateur résolue par heuristique sur texte libre (C-17) ; 1 valeur (`Mobile`) non mappée ; FK + backfill = amélioration future non planifiée | futur |
| Positionnements non traçables | 3/3 intercontrat live sans fiche candidat miroir → colonne « — » (C-18) ; lien direct `opp↔collab` = sous-question ouverte | futur |
| `activite-conges` sans branche Mobile serveur | Pas de `getDashboardDevice()` sur la page | 5 |
| ~~`SectionNavBarSlot` sur `/consultants/layout.tsx`~~ | Résolu Lot 1 (descendu dans `(tabbed)/layout.tsx`). Suppression globale `SectionNavBar*` = SHELL-0018 Phase 6 | 14 |
| Routes `(tabbed)` consultants | À rediriger puis supprimer | 5-6 / 15 |
| ~~`synthese` ≈ `collaborateurs`~~ | Résolu Lot 3 (C-21) : `synthese` a son tableau de bord dédié, `collaborateurs` garde le tableau | — |
| Dual-paradigme desktop (Lot 1) | `/consultants` (rail vertical) vs `/consultants/activite-conges` (barre horizontale legacy) — identique à la dette `missions/(tabbed)` | 5-6 |
| `<header>`/`<h1>` internes des composants legacy | `ConsultantsActivityDashboard` + `PoolCompetencesMap` self-headers → double-titre si mis en slot | 5 / 6 |
| `ConsultantsDesktopShell.children` typé `children?` | Optionnel pour compat `renderToStaticMarkup` sous eslint `react/no-children-prop` ; cohérent avec un shell | — |

## Journal des lots

### Lot 3 — Synthèse Desktop + Mobile — ✅ techniquement livré (2026-09-08)

- **Baseline** : `61bbab04` (`main` = `origin/main`, rien à intégrer).
- **Objectif** : construire la page Synthèse, câblée sur `getConsultantsSynthese()` (Lot 2).
- **Fichiers créés** :
  - `src/features/consultants/desktop/synthese/PracticeBreakdownChart.tsx` — **client**, barres SVG horizontales + sélecteur Collaborateurs/Candidats, couleur `offer_practices.color_hex`.
  - `src/features/consultants/desktop/synthese/RecruitmentPipelineChart.tsx` — SVG barres verticales (6 étapes), ligne de stats (`totalActive` / `hiresYearToDate` / `closedNotHiredYearToDate`).
  - `src/features/consultants/desktop/synthese/SyntheseDesktop.tsx` — **client**, 3 KPI + 2 graphiques + 2 `StructuredList` + `dataNotes`.
  - `src/features/consultants/mobile/synthese/SyntheseMobile.tsx` — **client**, KPI + barres HTML+Tailwind + cartes + raccourcis.
  - `src/features/consultants/desktop/synthese/synthese-render.test.ts` — 6 tests.
- **Fichiers modifiés** :
  - `src/app/(app)/consultants/page.tsx` — branche par section : `synthese` → `getConsultantsSynthese()` seul ; `collaborateurs` → `getConsultantsTeam()` seul (ADR-0006).
- **Aucune migration, aucun n8n, aucun changement de route/menu.**
- **Décisions** : C-21 (répartition `synthese` / `collaborateurs`, chargement par section — dette C-14 résorbée), C-22 (dataviz Desktop SVG / Mobile HTML, palette `offer_practices.color_hex`).
- **Invariants protégés** : distribution Desktop/Mobile côté serveur (`getDashboardDevice()`, pas de CSS `hidden`) ; aucune bibliothèque graphique ; `SectionRail` / navigation / Mobile inchangés ; `main-menu.config` intact ; réutilise `StructuredList`, `formatEuro`, `MobilePageHeader`, `getConsultantsSynthese` (Lot 2) — aucun doublon.
- **Gates exécutées** :
  - `npm run typecheck` → PASS (deux fois, dont une après purge `.next`)
  - `npx vitest run src/features/consultants` → PASS (37 tests : 18 nav + 13 builder + 6 rendu) puis `npm test` (**suite complète**) → PASS (258 fichiers)
  - `npm run check:server-boundary` → PASS
  - `npx eslint src/features/consultants src/app/(app)/consultants/page.tsx` → PASS
  - `npm run build` → ⚠️ **NON JOUÉ EN SESSION.** `next build` reste bloqué à 0 % CPU tant que le serveur `next dev` de Guillaume tourne sur le même projet (Next 16 ne tolère pas de build concurrent) ; le poste crée en plus des doublons `.next/* 2` (iCloud). Le contrôle statique équivalent `check:server-boundary` passe, et l'inspection confirme qu'aucun composant client de Lot 3 (`SyntheseDesktop`, `SyntheseMobile`, `PracticeBreakdownChart`) n'importe de module `server-only` — seulement `StructuredList`/`MobilePageHeader` (clients), `formatEuro` (pur), `next/link`, et des imports `type`. **À rejouer par Guillaume (`npm run build`), naturellement avec sa passe de QA.**
- **QA visuelle** : non réalisée — réservée à Guillaume.
- **Limites** : `npm run build` non joué (voir Gates) ; la vue `collaborateurs` reste sur le composant legacy (déplacement + alignement C-16 = Lot 4).
- **Commit** : _(SHA après push)_ — `feat(consultants): page Synthèse Desktop + Mobile (Lot 3)`.
- **SHA final** : _(à renseigner après push)_.
- **NEXT LOT** : Lot 4 — Migration Collaborateurs.

### Lot 2 — Data Contract Synthèse — ✅ techniquement livré (2026-09-08)

- **Baseline** : `8e191c8b` (`main` = `origin/main`, rien à intégrer).
- **Objectif** : loader / view-model **unique** server-only pour la Synthèse (3 KPI, practice, prochaines fins de mission, intercontrats, pipeline recrutement).
- **Fichiers créés** :
  - `src/features/consultants/data/consultants-synthese.types.ts` — `ConsultantsSyntheseViewModel` + types de lignes brutes.
  - `src/features/consultants/data/build-consultants-synthese.ts` — builder **pur** (aucune dépendance Supabase).
  - `src/features/consultants/data/get-consultants-synthese.ts` — loader serveur (`import "server-only"`).
  - `src/features/consultants/data/__tests__/build-consultants-synthese.test.ts` — 13 tests.
- **Aucun fichier applicatif existant modifié.** Aucune migration Supabase (2.x non déclenché). Aucun n8n. Aucune route. Aucun menu.
- **Investigation schéma (live 2026-09-08, via MCP `execute_sql`)** :
  - DATA-1 : `collaborators.status='sorti'` ⟺ `exit_date IS NOT NULL` (1 ligne, accord parfait) → effectif actif = `status <> 'sorti'` (**C-16**).
  - DATA-2 : `collaborators.job_profile_id` peuplé 10/29, `practice` texte 29/29 ; `candidates.practice_id` 43/43 ; `job_profiles.practice_id` 65/65. Aucune source relationnelle commune → cascade `job_profile → nom exact (`offer_practices.name`) → heuristique `getPracticeByName` → null` ; clé canonique `offer_practices.slug` (**C-17**). Seule `Mobile` (~1) tombe en « Autre ».
  - DATA-3 : `match_scores` keyé `person_id` sans statut (matching pur). `opportunity_candidates` n'a pas de lien collaborateur direct ; via `candidate.person_id = collaborator.person_id`. Les **3** intercontrat live ne sont **pas** mirrorés en candidats → compte `null` (« — »), pas `0` (**C-18**).
  - DATA-7 : RLS `collaborator_compensation` owner/admin ; `compensationReadable` dérivé de `profiles.role` (**C-19**).
- **Décisions** : C-16 → C-20 (voir DECISION LOG). **Aucune migration nécessaire.**
- **Cross-check builder ↔ SQL live** : 29 actifs · 11 vivier · 11 hires YTD · 10 process actifs (`tests_techniques` 3 / `proposition` 3 / `signature` 2 / `entretien_manager` 1 / `prequalification` 1) · 3 intercontrat.
- **Invariants protégés** : aucune UI touchée ; loader server-only ; RLS de l'utilisateur (la rémunération confidentielle ne fuit pas) ; réutilise `getPracticeByName`, `PRACTICE_SLUG_TO_OFFER_PRACTICE`, `HIRING_KANBAN_STAGES`, `RECRUITMENT_TERMINAL_STATUSES`, `getOfferPracticesCatalog`, `getJobProfilesCatalog` — aucun doublon.
- **Gates exécutées** :
  - `npm run typecheck` → PASS (après purge `.next` — faux `TS6200`/`TS2300` documentés dans CLAUDE.md)
  - `npm test` (**suite complète**) → PASS (258 fichiers / 2618 tests)
  - `npm run check:server-boundary` → PASS
  - `npx eslint src/features/consultants` → PASS
  - `npm run build` → PASS
- **QA visuelle** : non réalisée — réservée à Guillaume.
- **Limites** : DATA-3 partiel (sous-question lien direct `opp↔collab`) ; heuristique practice pour collaborateurs sans `job_profile_id`. Voir « Dettes connues ».
- **Commit** : `61bbab04` — `feat(consultants): data contract Synthèse — view-model + loader (Lot 2)`.
- **SHA final** : `61bbab042a32b286053bc83dc336ac312c61545b`.
- **NEXT LOT** : Lot 3 — Synthèse Desktop + Mobile.

### Lot 1 — Socle Consultants Workspace — ✅ techniquement livré (2026-09-08)

- **Baseline** : `3f522358` (`main` = `origin/main`, `git merge --ff-only` — rien à intégrer).
- **Objectif** : shell `/consultants` conforme SHELL-0018 — `SectionRail` V2 inline, navigation `?section=`, chapeau navy `Consultants`, header = chapitre actif, 5 chapitres, aucun module contextuel.
- **Fichiers créés** :
  - `src/features/consultants/navigation/consultants-sections.ts`
  - `src/features/consultants/navigation/consultants-icons.tsx`
  - `src/features/consultants/desktop/ConsultantsDesktopShell.tsx`
  - `src/features/consultants/mobile/ConsultantsMobileShell.tsx`
  - `src/features/consultants/data/get-consultants-team.ts`
  - `src/features/consultants/navigation/consultants-sections.test.ts` (18 tests)
- **Fichiers modifiés** :
  - `src/app/(app)/consultants/page.tsx` — réécrit en orchestrateur (device + `?section=` → shell + contenu).
  - `src/app/(app)/consultants/layout.tsx` — `SectionNavBarSlot` retiré.
  - `src/app/(app)/consultants/(tabbed)/layout.tsx` — `SectionNavBarSlot` ajouté (patron `missions`).
- **Décisions** : C-14 (2 sections in-shell : `synthese` + `collaborateurs` ; les 3 autres = liens directs `external: true` vers leur route actuelle, internalisées Lots 5/8/6) ; C-15 (`SectionNavBarSlot` descendu ; `main-menu.config.ts` et Mobile intacts).
- **Écart vs fiche Lot 0** : la fiche envisageait « les 5 chapitres in-shell ». L'audit du code réel a montré que `ConsultantsActivityDashboard` et `PoolCompetencesMap` portent leur propre `<header>`/`<h1>` (double-titre en slot) et que le contenu candidate-centric n'existe pas encore → internalisation reportée aux lots dédiés (C-14). Consigné avant modification.
- **Invariants protégés** : `main-menu.config.ts` non touché ; `getMobileTabsForPath` non touché ; routes `(tabbed)` fonctionnelles (barre horizontale conservée) ; primitive `SectionRail` non modifiée ; branche serveur `getDashboardDevice()` conservée.
- **Gates exécutées** :
  - `npm run typecheck` → PASS
  - `npm test` (**suite complète**) → PASS (257 fichiers / 2605 tests)
  - `npm run check:server-boundary` → PASS
  - `npx eslint` (fichiers touchés) → PASS
  - `npm run build` → PASS (routes `/consultants`, `/consultants/activite-conges`, `/consultants/pool-competences` compilées)
- **QA visuelle** : non réalisée — réservée à Guillaume.
- **Limites / transitoire** : `synthese` et `collaborateurs` rendent la même vue (résorbé Lots 3-4) ; dual-paradigme desktop `/consultants` vs `/consultants/(tabbed)` (résorbé Lots 5-6). Voir « Dettes connues ».
- **Commit** : `8e191c8b` — `feat(consultants): shell /consultants sur SectionRail V2 (Lot 1)`.
- **SHA final** : `8e191c8b39c3b207d13146b41c45a63ff49f5190`.
- **NEXT LOT** : Lot 2 — Data Contract Synthèse.

### Lot 0 — Cadrage documentaire — ✅ techniquement livré (2026-09-08)

- **Baseline** : `064b6c025fa24d0978b3c0959a3f640a5763f43b` (`main` synchronisé `origin/main` par `git merge --ff-only`).
- **Objectif** : créer le dossier canonique, le document de référence, le ledger ; inventorier l'existant code/data ; établir la roadmap 0→15 ; enregistrer les décisions et les questions ouvertes.
- **Fichiers créés** :
  - `docs/FEATURES/consultants_workspace/README.md`
  - `docs/FEATURES/consultants_workspace/00-REFERENCE-CHANTIER-CONSULTANTS.md`
  - `docs/FEATURES/consultants_workspace/01-IMPLEMENTATION-LEDGER.md`
- **Aucun fichier applicatif modifié.** Aucune migration. Aucun n8n. Aucune route. Aucun changement de menu.
- **Décisions** : DECISION LOG C-01 → C-13 (voir doc canonique § 19).
- **Sources consultées** : `CLAUDE.md`, `AGENTS.md`, `docs/navigation_architecture/SHELL-0018/{README,01-ADR,02-SECONDARY-RAIL-STANDARD,04-CURRENT-NAVIGATION-INVENTORY,05-CONTEXTUAL-MODULES-MATRIX,06-PHASE-4-CLOSURE-AUDIT,07-HANDOFF-PHASE-6}.md` ; code réel `src/app/(app)/consultants/**`, `src/app/(app)/recruitment/**`, `src/components/consultants/**`, `src/components/recruitment/**`, `src/lib/recruitment/recruitment-stages.ts`, `src/lib/staffing-matching/actions.ts`, `src/lib/navigation/{section-rail.ts,main-menu.config.ts}`, `src/components/missions/engagements/EngagementsDesktopView.tsx` ; base Supabase live (`information_schema`, comptages).
- **Gates exécutées** : `git diff --check` (propre) ; relecture manuelle (liens internes, numérotation 0→15 sans trou, `NEXT LOT = Lot 1`, cohérence main-only, aucune règle de QA navigateur). **Pas de `npm run build`** — aucun code applicatif modifié.
- **QA visuelle** : non applicable (lot documentaire) — réservée à Guillaume.
- **Limites** : aucune (lot documentaire).
- **Dettes** : voir table « Dettes connues » ci-dessus — toutes reportées à leur lot.
- **Commit** : `4f9fbba1` — `docs(consultants): bootstrap Consultants Workspace roadmap`.
- **SHA final** : `4f9fbba1ca0a5ad22da39631af5f7775cfba0f21`.
- **Dernier SHA connu origin/main** : `4f9fbba1ca0a5ad22da39631af5f7775cfba0f21`.
- **NEXT LOT** : Lot 1 — Socle Consultants Workspace.
