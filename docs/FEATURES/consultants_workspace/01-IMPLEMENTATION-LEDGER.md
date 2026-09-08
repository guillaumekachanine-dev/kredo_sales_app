# Consultants Workspace — Implementation Ledger

> Source de vérité **opérationnelle** du chantier. Le document canonique
> (`00-REFERENCE-CHANTIER-CONSULTANTS.md`) porte le QUOI et le POURQUOI ; ce fichier porte
> l'ÉTAT RÉEL, lot par lot.

```
Chantier                 : Consultants Workspace
Statut global            : en cours
Branche                  : main (branche unique — aucune feature branch)
Baseline initiale        : 064b6c025fa24d0978b3c0959a3f640a5763f43b
Dernier lot livré        : Lot 7 — Data Contract Candidats
Lot courant              : —
Prochain lot             : Lot 8 — Page Candidats
Dernier SHA connu origin/main : <SHA Lot 7>   (2026-09-08, commit refactor Lot 7)
```

## Table des lots

Statuts autorisés : `⬜ todo` · `🟡 en cours` · `✅ techniquement livré` · `⛔ bloqué`
(jamais `done` — ne jamais signifier qu'une QA visuelle a eu lieu).

| Lot | Objet | Statut | Commit | Notes |
|---|---|---|---|---|
| 0 | Cadrage documentaire | ✅ techniquement livré | `4f9fbba1` | Dossier + doc de référence + ledger + inventaire + roadmap 0→15 + DECISION LOG C-01→C-13 + 20 OPEN QUESTIONS. Aucun code applicatif. |
| 1 | Socle Consultants Workspace (rail V2 `SectionRail`, `?section=`, header, 5 chapitres, `SectionNavBarSlot` descendu) | ✅ techniquement livré | `8e191c8b` | `src/features/consultants/{navigation,desktop,mobile,data}`. C-14 (2 sections in-shell), C-15 (`SectionNavBarSlot` → `(tabbed)/layout`). NAV-1 + LEGACY-1 résolues. `npm test` complet vert. |
| 2 | Data Contract Synthèse | ✅ techniquement livré | `61bbab04` | `src/features/consultants/data/` : builder pur + loader + 13 tests. DATA-1/2/3/7 résolus (C-16→C-20). **Aucune migration** (2.x non déclenché). `npm test` complet vert. |
| 3 | Synthèse Desktop + Mobile | ✅ techniquement livré + **déployé prod** | `f4b66b3e` | `src/features/consultants/{desktop,mobile}/synthese/` : KPI + 2 graphiques (SVG maison / barres HTML) + 2 tableaux + `dataNotes`. C-21/C-22. Gates verts ; **build de prod Vercel `READY`** (`7724d800` = déploiement courant `kredo-green.vercel.app`). |
| 4 | Migration Collaborateurs (`?section=collaborateurs`) | ✅ techniquement livré | `3296d8ea` | `src/features/consultants/collaborators/` : `CollaboratorsDesktop`/`Mobile` + `collaborators.types` + 4 tests. C-23 / **LEGACY-4 résolu** (statut ⇐ `collaborators.status`) ; loader filtre `sorti`. `components/consultants/synthese/` supprimé. Gates verts (build → Vercel). |
| 5 | Migration Activités & congés (`?section=activite-conges`) | ✅ techniquement livré | `e88500b6` | `src/features/consultants/activity/` (`ActivityDashboard` + types + loader) + 8 tests. C-24 : `<h1>` retiré, route legacy → `permanentRedirect`, pas de Mobile dédié (dette PRODUCT-4). Gates verts (build → Vercel). |
| 6 | Migration Pool de compétences (`?section=pool-competences`) | ✅ techniquement livré | `2eb96035` | `git mv` → `src/features/consultants/skills/` + loader `data/get-consultants-skills.ts` + `<header>` retiré + route legacy → `permanentRedirect`. C-25. **NAV-2 résolu.** 3 consommateurs externes repointés. Gates verts (build → Vercel). |
| 7 | Data Contract Candidats (candidate-centric) | ✅ techniquement livré | `<SHA Lot 7>` | `src/features/consultants/candidates/data/` : builder pur + loader + types + 11 tests ; `src/lib/recruitment/candidate-lifecycle.ts` (+ 4 tests). C-26. **DATA-4/6 + PRODUCT-2/3 résolus.** Dettes CAND-1/2/3. Aucune migration, aucune UI. Gates verts (build → Vercel). |
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
| C-23 | Chapitre Collaborateurs = `src/features/consultants/collaborators/` ; statut lu sur `collaborators.status` (`isCollaboratorStaffed`) ; `getConsultantsTeam` filtre `sorti` ; `components/consultants/synthese/` supprimé | 4 |
| C-24 | Chapitre Activités & congés internalisé (`?section=activite-conges`) ; `ActivityDashboard` + `activity.types` + `get-consultants-activity` dans `src/features/consultants/activity/` ; `<h1>` retiré ; route legacy → `permanentRedirect` ; pas de branche Mobile (dette PRODUCT-4) | 5 |
| C-25 | Chapitre Pool de compétences internalisé (`?section=pool-competences`) ; `git mv components/consultants/pool-competences/` → `src/features/consultants/skills/` (7 fichiers) ; loader → `data/get-consultants-skills.ts` (convention `data/`, pas `skills/`) ; `buildPoolCompetencesDataset` inchangé ; `<header>` interne retiré ; route legacy → `permanentRedirect` ; pas de branche Mobile (dette SKILLS-1) ; suppression fichiers route `(tabbed)` + layout reportée au Lot 15 | 6 |
| C-26 | Contrat Candidats candidate-centric (`src/features/consultants/candidates/data/`) : builder pur + loader `server-only` + types + tests. Population = tous les `candidates` (filtrage à l'affichage via `pipelineState`). DATA-4 : `qualifiedThisYear` = jalon `prequalification/valide` daté année civile. DATA-6 : `available_from`+`notice_period_days` (43/43) = source structurée, texte `availability` jamais parsé. PRODUCT-2 : `nextAction` = positionnement actif le + récent, `null` sinon (option a). PRODUCT-3 : whitelist canonique `src/lib/recruitment/candidate-lifecycle.ts`. Practice = `practice_id → slug` (C-17), repli `job_profile_id`. Dettes CAND-1/2/3 | 7 |

## Questions ouvertes en cours

Détail et classement (DATA / PRODUCT / NAVIGATION / LEGACY) dans le doc canonique § 20.

| ID | Résumé | Lot cible | Statut |
|---|---|---|---|
| DATA-1 | Source d'autorité « effectif collaborateur actif » | 2 | ✅ résolue (C-16) |
| DATA-2 | Source canonique de la Practice (collaborateurs + candidats) | 2 | ✅ résolue (C-17) |
| DATA-3 | Preuve canonique d'un positionnement actif d'un collaborateur | 2 | ⚠️ partiellement résolue (C-18) — sous-question lien direct `opp↔collab` ouverte |
| DATA-4 | Définition « candidat qualifié durant l'année en cours » | 7 | ✅ résolue (C-26) — jalon `prequalification/valide` daté année civile ; backfill = dette CAND-1 |
| DATA-5 | Planning journalier de production inexistant en base | 11 | ouverte |
| DATA-6 | `candidates.availability` texte libre — normalisation ? | 7 | ✅ résolue (C-26) — `available_from`+`notice_period_days` (43/43) = source structurée ; texte jamais parsé |
| DATA-7 | Salaire/CJM intercontrat sous RLS confidentielle — comportement rôle non habilité | 2 | ✅ résolue (C-19) |
| PRODUCT-1 | Intention module Matching : profil→besoins et/ou besoin→profils | 13 | ouverte |
| PRODUCT-2 | « Prochaine action » pour un candidat sans opportunité active | 7 | ✅ résolue (C-26, option a) — positionnement actif le + récent, `null` sinon ; porteur dédié = dette CAND-2 |
| PRODUCT-3 | Valeurs métier du sélecteur lifecycle candidat en UI | 7-8 | ✅ résolue (C-26) — whitelist `src/lib/recruitment/candidate-lifecycle.ts` ; convergence des 3 copies legacy = dette CAND-3 |
| PRODUCT-4 | Chevauchement Synthèse Mobile / module Production & Congés (planning) | 3 / 12 | ouverte |
| NAV-1 | `?section=` confirmé vs pathname après audit code réel Lot 1 | 1 | ✅ résolue (Lot 1) |
| NAV-2 | Redirections routes historiques `(tabbed)` — type et calendrier | 5-6 / 15 | ✅ résolue — `activite-conges` (C-24) + `pool-competences` (C-25) = `permanentRedirect` ; suppression des fichiers de route + `(tabbed)/layout.tsx` + `SectionNavBarSlot` = Lot 15 |
| NAV-3 | Calendrier exact redirect `/recruitment` + retrait module menu | 10 / 14 | ouverte |
| NAV-4 | Consultants sous `CRM` ou `Ressources` dans SHELL-0018 Phase 6 | 14 | ouverte |
| LEGACY-1 | Retrait `SectionNavBarSlot` du layout consultants : ici (Lot 1) ou SHELL-0018 ? | 1 / 14 | ✅ résolue (Lot 1, retrait local ; global = Phase 6) |
| LEGACY-2 | `components/recruitment/dashboard/*` morts — confirmer et supprimer | 9 / 15 | ouverte |
| LEGACY-3 | `consultants/(tabbed)/layout.tsx` passthrough — supprimer après migration | 15 | ouverte |
| LEGACY-4 | `ConsultantsSyntheseDesktop` calcule « en mission » depuis `missions.status` — réconcilier avec C-16 | 4 | ✅ résolue (C-23) |

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
| ~~Loader recrutement opportunity-centric~~ | Résolu Lot 7 (C-26) côté **lecture** : `getConsultantsCandidates` part de `candidates` (vivier complet, 13/43 sans positionnement inclus). L'ancien `getRecruitmentWorkspace` reste en place jusqu'à la page Lot 8 / dépréciation Lot 10. | 7 |
| **CAND-1** — backfill qualification | Lot 7 : `qualifiedThisYear` faux pour les candidats sans jalon `prequalification/valide` daté cette année (15/43 live). Mécanisme de fallback / backfill à définir. | 7.x |
| **CAND-2** — porteur « prochaine action » | Lot 7 : un candidat du vivier sans positionnement actif n'a aucun porteur de « prochaine action » (PRODUCT-2 option a). Colonne / table dédiée = migration éventuelle. | futur |
| **CAND-3** — 3 copies legacy des labels lifecycle | `CandidateProfileEditor`, `CandidateReferenceProfile`, `RecruitmentListView` dupliquent le mapping statut→libellé. Converger vers `src/lib/recruitment/candidate-lifecycle.ts` (créé Lot 7). | 8 |
| `RecruitmentWorkspace` non adaptive-split | Desktop + Mobile dans un même arbre client, sous-vues importées statiquement | 8 |
| `dashboard/RecruitmentDesktopDashboard` / `RecruitmentMobileDashboard` | Orphelins probables | 9 / 15 |
| `collaborators.practice` non normalisé | Text libre, non aligné `offer_practices.slug` | 2 / 2.x |
| Planning journalier de production | Absent en base (agrégats mensuels seulement) | 11 |
| ~~Divergence statut collaborateur~~ | Résolu Lot 4 (C-23) : `CollaboratorsDesktop`/`Mobile` lisent `collaborators.status` | — |
| `collaborators.practice_id` absent | Practice collaborateur résolue par heuristique sur texte libre (C-17) ; 1 valeur (`Mobile`) non mappée ; FK + backfill = amélioration future non planifiée | futur |
| Positionnements non traçables | 3/3 intercontrat live sans fiche candidat miroir → colonne « — » (C-18) ; lien direct `opp↔collab` = sous-question ouverte | futur |
| `activite-conges` sans vue Mobile dédiée | Lot 5 : vue analytique dense unique servie aux deux devices (contenu large `overflow-auto`). Une vraie vue Mobile activité chevauche le module Production & Congés → **PRODUCT-4** | 12 |
| **SKILLS-1** — `pool-competences` sans vue Mobile dédiée | Lot 6 : `PoolCompetencesMap` (cartographie SVG large) servie aux deux devices en `overflow-auto`. Une vraie synthèse compétences Mobile (cartes / jauges) n'est pas cadrée | futur |
| ~~`SectionNavBarSlot` sur `/consultants/layout.tsx`~~ | Résolu Lot 1 (descendu dans `(tabbed)/layout.tsx`). Suppression globale `SectionNavBar*` = SHELL-0018 Phase 6 | 14 |
| Routes `(tabbed)` consultants | Lot 6 : `activite-conges` **et** `pool-competences` redirigent (`permanentRedirect`). Fichiers de route + `(tabbed)/layout.tsx` + `SectionNavBarSlot` supprimés au **Lot 15** (aucune route `(tabbed)` réelle ne subsiste). | 15 |
| ~~`synthese` ≈ `collaborateurs`~~ | Résolu Lot 3 (C-21) : `synthese` a son tableau de bord dédié, `collaborateurs` garde le tableau | — |
| ~~Dual-paradigme desktop~~ | Résolu Lot 6 : `activite-conges` + `pool-competences` internalisés, la barre horizontale legacy n'est plus atteignable (redirect). Retrait du code mort = Lot 15. | — |
| ~~`<header>`/`<h1>` internes des composants legacy~~ | Résolu : `<h1>` retiré de `ActivityDashboard` (Lot 5) et `<header>` retiré de `PoolCompetencesMap` (Lot 6). | — |
| `ConsultantsDesktopShell.children` typé `children?` | Optionnel pour compat `renderToStaticMarkup` sous eslint `react/no-children-prop` ; cohérent avec un shell | — |

## Journal des lots

### Lot 7 — Data Contract Candidats — ✅ techniquement livré (2026-09-08)

- **Baseline** : `de412164` (`main` = `origin/main` ; travail parallèle Guillaume non commité dans l'arbre — `design-qa.md`, `cockpit-mobile.css`, `docs/FEATURES/cockpit_intelligence_mobile_actions_contextuelles/`, `design-lab/*` — **non stagé**).
- **Objectif** : modèle de lecture **candidate-centric** (C-06) — view-model typé + tests, aucune UI.
- **Investigation schéma (live 2026-09-08, MCP `execute_sql`)** :
  - `candidates` 43 · `available_from` **43/43** · `notice_period_days` **43/43** · `practice_id` 43/43 · `availability` texte libre ~25 formes.
  - `candidate_hiring_processes` 34 (`hired` 11 / `active` 10 / `cancelled` 5 / `rejected` 5 / `withdrawn` 3) ; **`opportunity_candidate_id` FK nullable** (lien process ↔ positionnement).
  - `candidate_hiring_milestones` : FK `hiring_process_id` (pas `candidate_id` direct) ; `prequalification/valide` × `completed_at` année 2026 → **28 candidats distincts** (DATA-4).
  - `opportunity_candidates` 39 : `next_action` renseigné 31/39 ; 13 candidats sans aucun positionnement.
- **Fichiers créés** :
  - `src/features/consultants/candidates/data/consultants-candidates.types.ts` — lignes brutes + `ConsultantsCandidatesViewModel`.
  - `src/features/consultants/candidates/data/build-consultants-candidates.ts` — **builder pur** (aucune dépendance Supabase).
  - `src/features/consultants/candidates/data/get-consultants-candidates.ts` — loader `server-only` (6 lectures // : 2 catalogues cachés + `candidates`+persons, `candidate_hiring_processes`, jalons filtrés SQL `step='prequalification'`/`result='valide'`, `opportunity_candidates`+`opportunities.stage`).
  - `src/features/consultants/candidates/data/__tests__/build-consultants-candidates.test.ts` — 11 tests.
  - `src/lib/recruitment/candidate-lifecycle.ts` (+ `.test.ts`, 4 tests) — whitelist canonique (PRODUCT-3).
- **Aucun fichier applicatif existant modifié.** Aucune migration. Aucun n8n. Aucune route. Aucun menu. `getRecruitmentWorkspace` + `_actions/*` **intacts** (réutilisés au Lot 8).
- **Décisions** : **C-26** (voir DECISION LOG). DATA-4 / DATA-6 / PRODUCT-2 / PRODUCT-3 **résolus**. Dettes **CAND-1** (backfill qualif), **CAND-2** (porteur prochaine action), **CAND-3** (3 copies legacy labels).
- **Cross-check builder ↔ SQL live** : `pipelineState` = **19 pool / 10 in_process / 14 closed** (= 43) · `qualifiedThisYear` = **28** · sans positionnement = **13**.
- **Invariants** : aucune UI touchée ; loader `server-only` ; RLS utilisateur ; réutilise `isOfferPracticeSlug`/`OfferPracticeSlug` (`@/lib/config/practices`), `RECRUITMENT_TERMINAL_STATUSES` (`recruitment-stages`), `getOfferPracticesCatalog`/`getJobProfilesCatalog` — aucun doublon ; le mapping lifecycle est **centralisé** (ne recrée pas une 4ᵉ copie, il devient la cible de convergence).
- **Hors périmètre confirmé** : `calendar_events` non consommés (planning entretiens = Lot 9).
- **Gates exécutées** :
  - `rm -rf .next && npm run typecheck` → **PASS** (2×)
  - `npx vitest run src/features/consultants src/lib/recruitment/candidate-lifecycle.test.ts` → **PASS** (7 fichiers / 59 tests)
  - `npm test` (**suite complète**) → **PASS** (263 fichiers / 2648 tests)
  - `npm run check:server-boundary` → **PASS**
  - `npx eslint src/features/consultants/candidates src/lib/recruitment/candidate-lifecycle.ts src/lib/recruitment/candidate-lifecycle.test.ts` → **PASS**
  - `npm run build` (local) → **non joué** (`next dev` concurrent). Build de prod Vercel = gate.
- **QA visuelle** : réservée à Guillaume (aucune surface UI dans ce lot).
- **Commit** : `<SHA Lot 7>` — `feat(consultants): data contract Candidats — view-model candidate-centric (Lot 7)`.
- **SHA final** : `<SHA Lot 7>`.
- **NEXT LOT** : Lot 8 — Page Candidats.

### Lot 6 — Migration Pool de compétences — ✅ techniquement livré (2026-09-08)

- **Baseline** : `55d637ee` (`main` local, en avance d'un commit non poussé sur `origin/main` `642ad3f9` — `55d637ee feat(cockpit): integrate mobile home v2`, fait par Guillaume à 20:47). **Écart doc/réalité consigné** : le handoff annonçait `origin/main = 642ad3f9` et le travail cockpit/veille comme *non commité*. Guillaume a confirmé (question posée) : **pousser cockpit + Lot 6 ensemble**. Le commit `55d637ee` a par ailleurs résorbé l'échec `veille-desktop-contracts.test.ts` (page + test modifiés de concert) → `npm test` complet repasse **vert**.
- **Objectif** : absorber `(tabbed)/pool-competences/` dans `?section=pool-competences`, sans refonte métier.
- **Fichiers déplacés (`git mv`)** :
  - `src/components/consultants/pool-competences/` → `src/features/consultants/skills/` — 7 fichiers : `PoolCompetencesMap.tsx`, `PoolCompetencesPracticeRow.tsx`, `PoolCompetencesSkillCardsRow.tsx`, `PoolCompetencesConnections.tsx`, `SkillDescriptionTooltip.tsx`, `pool-competences-shared.ts`, `types.ts`. Imports relatifs (`./…`) inchangés ; le dossier source est vide et supprimé.
- **Fichiers modifiés** :
  - `src/features/consultants/skills/PoolCompetencesMap.tsx` — `<header>` interne retiré (`<p>` « Équipe / Pool de compétences » + `<h1>` « Expertises & savoir-faire »). `<main>` et l'early-return `!selectedPractice` conservés.
  - `src/features/consultants/navigation/consultants-sections.ts` — `pool-competences` : `external: false`, `href: "/consultants?section=pool-competences"`, ajouté à `CONSULTANTS_IN_SHELL_SECTIONS` (= 4). Commentaire d'en-tête mis à jour.
  - `src/features/consultants/navigation/consultants-sections.test.ts` — `pool-competences` internalisé (parse + href + render header) ; `render()` accepte `"pool-competences"`. **Assertion « le layout (tabbed) conserve SectionNavBarSlot » laissée intacte** (retrait du layout = Lot 15).
  - `src/app/(app)/consultants/page.tsx` — branche `pool-competences` : `getConsultantsSkills()` → `PoolCompetencesMap` dans `<div className="min-h-0 flex-1 overflow-auto bg-canvas">`, servie aux deux devices (pas de branche Mobile). Commentaire d'en-tête mis à jour.
  - `src/app/(app)/consultants/(tabbed)/pool-competences/page.tsx` — **remplacé par** `permanentRedirect("/consultants?section=pool-competences")` (patron Lot 5, ~10 lignes).
  - 3 consommateurs externes des primitives déplacées repointés vers `@/features/consultants/skills/…` :
    `src/features/knowledge-hub/expertise/KredoJobsView.tsx` (`SkillDescriptionTooltip`, `types`),
    `src/features/knowledge-hub/talents/talent-knowledge-builders.ts` (`pool-competences-shared`),
    `src/components/missions/OpportunitySkillsCloud.tsx` (`SkillDescriptionTooltip`, `types`).
- **Fichiers créés** :
  - `src/features/consultants/data/get-consultants-skills.ts` — loader `import "server-only"`, extrait à l'identique de la page legacy (4 référentiels cachés `getOfferPracticesCatalog`/`getOffersCatalog`/`getSkillsCatalog`/`getJobProfilesCatalog` + `collaborators` + `person_skills` + `opportunity_skills`), construit les 2 `Map` puis appelle `buildPoolCompetencesDataset`. Retourne `{ dataset, collaborators }`.
- **Inchangé** : `src/lib/consultants/pool-competences-data.ts` (`buildPoolCompetencesDataset` + types de lignes). Aucune migration, aucun n8n, aucun menu. `main-menu.config.ts`, `intelligence-registry.ts`, `KredoSkillsView.tsx` continuent de pointer `/consultants/pool-competences` → **le `permanentRedirect` les couvre** (identique au traitement `activite-conges` du Lot 5) ; repointage vers `?section=` = Lot 14/15.
- **Décision** : **C-25**. **NAV-2 résolu.** Écart de nommage assumé : le loader va dans `data/` (convention Lots 2/5 : `get-consultants-{team,synthese,activity}`), pas dans `skills/` comme le suggérait le handoff.
- **Décision de périmètre** : le `(tabbed)/layout.tsx` + `SectionNavBarSlot` + les 2 fichiers de route redirect **ne sont pas supprimés ici**. Après Lot 6 il n'existe plus aucune route `(tabbed)` réelle → c'est exactement le périmètre déjà cadré du **Lot 15** (« routes `(tabbed)` consultants »). Scinder évite de casser un test d'invariant hors sujet dans un lot de déménagement.
- **Parité** : loader = mêmes 7 lectures (4 caches + 3 requêtes, colonnes identiques) ; `PoolCompetencesMap` identique hors `<header>` ; `buildPoolCompetencesDataset` bit-identique.
- **Mobile** : pas de branche dédiée — dette **SKILLS-1**.
- **Gates exécutées** :
  - `rm -rf .next && npm run typecheck` → **PASS**
  - `npx vitest run src/features/consultants` → **PASS** (5 fichiers / 44 tests)
  - `npm test` (**suite complète**) → **PASS** (261 fichiers / 2633 tests) — plus aucun échec hors périmètre (veille résorbé par `55d637ee`)
  - `npm run check:server-boundary` → **PASS**
  - `npx eslint` (fichiers touchés : `skills/`, `data/get-consultants-skills.ts`, `page.tsx`, redirect, `consultants-sections{,.test}.ts`, 3 consommateurs) → **PASS**
  - `npm run build` (local) → **non joué** (`next dev` concurrent). **Build de prod Vercel = gate** : commit `a9d34e38` → `dpl_BagZ45CNJCYphakvZLSDrzNadQ8t`, target `production`, **`READY`**, aliasé sur `kredo-green.vercel.app` (turbopack, `nodejs:3`). Le commit cockpit `55d637ee` avait déjà buildé `READY` séparément (`dpl_9xh9kzacv9ossexuqBbNZEHyfAu5`).
- **⚠️ Travail parallèle** : le commit contient aussi `55d637ee` (cockpit mobile v2 + veille + `design-qa.md`) — décision explicite de Guillaume de le pousser avec le Lot 6. Le WIP restant non suivi (`design-lab/*`) n'est **pas** stagé.
- **QA visuelle** : réservée à Guillaume.
- **Commit** : `2eb96035` — `refactor(consultants): chapitre Pool de compétences internalisé (Lot 6)`.
- **SHA final** : `2eb96035`.
- **NEXT LOT** : Lot 7 — Data Contract Candidats.

### Lot 5 — Migration Activités & congés — ✅ techniquement livré (2026-09-08)

- **Baseline** : `0cfa4ddc` (`main` = `origin/main`).
- **Objectif** : absorber `(tabbed)/activite-conges/` dans `?section=activite-conges`, contenu conservé.
- **Fichiers créés** :
  - `src/features/consultants/activity/activity.types.ts` — 7 types + `ActivityDashboardData` (extraits du composant).
  - `src/features/consultants/activity/activity.test.ts` — 4 tests.
  - `src/features/consultants/data/get-consultants-activity.ts` — loader (6 lectures parallèles, `safeRead` dégradant).
- **Fichiers déplacés / modifiés** :
  - `git mv components/consultants/activite-conges/ConsultantsActivityDashboard.tsx → features/consultants/activity/ActivityDashboard.tsx` — renommé `ActivityDashboard`, types externalisés, `<h1>Activite & conges` **retiré** (hero + 3 stats conservés).
  - `src/features/consultants/navigation/consultants-sections.ts` — `activite-conges` `external:false` ; `CONSULTANTS_IN_SHELL_SECTIONS` = 3 ; `parseConsultantsSection` data-driven (Set).
  - `src/features/consultants/navigation/consultants-sections.test.ts` — assertions mises à jour.
  - `src/app/(app)/consultants/page.tsx` — branche `activite-conges` (contenu `overflow-auto`).
  - `src/app/(app)/consultants/(tabbed)/activite-conges/page.tsx` — **remplacé par `permanentRedirect("/consultants?section=activite-conges")`** (~8 lignes).
- **Dossier supprimé** : `src/components/consultants/activite-conges/`. Aucun autre consommateur (grep).
- **Aucune migration, aucun n8n, aucun menu.** `main-menu.config` intact ; `getMobileTabsForPath` intact (la barre `SectionNavBar` de `pool-competences` liste encore l'onglet Activité → il redirige, transitoire jusqu'au Lot 6).
- **Décision** : C-24. NAV-2 partiel. PRODUCT-4 (Mobile activité) documenté.
- **Parité** : loader identique (mêmes 6 requêtes), composant identique hors `<h1>`.
- **Gates exécutées** :
  - `npm run typecheck` → PASS (après purge `.next`)
  - `npx vitest run src/features/consultants` → PASS (5 fichiers / 44 tests).
  - `npm run check:server-boundary` → PASS
  - `npx eslint src/features/consultants src/app/(app)/consultants/**` → PASS
  - `npm test` (**suite complète**) → **260 fichiers PASS, 1 FAIL hors périmètre** : `src/components/veille/veille-desktop-contracts.test.ts` — cassé par du **WIP non commité de Guillaume** sur `src/app/(app)/veille/page.tsx` (vérifié : `git show HEAD:…/veille/page.tsx` contient la chaîne assertée ; la version working-tree ne la contient plus). **Aucun rapport avec Lot 5** ; ne sera pas dans le commit ni sur `origin/main`.
  - `npm run build` (local) → non joué (`next dev` concurrent) — build de prod Vercel = gate.
- **⚠️ Travail parallèle non commité dans l'arbre** (à ne PAS committer) : refonte cockpit mobile (`src/components/cockpit/mobile/*`, `src/lib/cockpit/mobile/*`) + retouches veille (`veille/page.tsx`, `VeilleActualites{Mobile,Page}.tsx`) + `design-lab/*` non suivis. Toujours stager les chemins `src/features/consultants` / `src/app/(app)/consultants` / `docs/FEATURES/consultants_workspace` explicitement.
- **QA visuelle** : réservée à Guillaume.
- **Commit** : `e88500b6` — `refactor(consultants): chapitre Activités & congés internalisé (Lot 5)`.
- **SHA final** : `e88500b654dcf6e38b561617e9f3954cecc9ac50`.
- **NEXT LOT** : Lot 6 — Migration Pool de compétences.

### Lot 4 — Migration Collaborateurs — ✅ techniquement livré (2026-09-08)

- **Baseline** : `149c2bbf` (`main` = `origin/main`, rien à intégrer).
- **Objectif** : déplacer le tableau collaborateurs vers `src/features/consultants/collaborators/`, aligner le statut sur `collaborators.status` (LEGACY-4), préserver les capacités.
- **Fichiers créés** :
  - `src/features/consultants/collaborators/collaborators.types.ts` — `CollaborateurRow` + `isCollaboratorStaffed()`.
  - `src/features/consultants/collaborators/CollaboratorsDesktop.tsx` — déplacé + renommé depuis `components/consultants/synthese/ConsultantsSyntheseDesktop`, statut/occupation/filtre/pill ⇐ `collaborators.status`.
  - `src/features/consultants/collaborators/CollaboratorsMobile.tsx` — idem ; `MobilePageHeader` retitré « Collaborateurs ».
  - `src/features/consultants/collaborators/collaborators.test.ts` — 4 tests.
- **Fichiers modifiés** :
  - `src/features/consultants/data/get-consultants-team.ts` — `.neq("status", "sorti")` (C-16) + import du type depuis `collaborators/`.
  - `src/app/(app)/consultants/page.tsx` — imports/usages renommés (`CollaboratorsDesktop`/`Mobile`).
- **Fichiers supprimés** : `src/components/consultants/synthese/ConsultantsSyntheseDesktop.tsx`, `.../ConsultantsSyntheseMobile.tsx` (+ dossier `synthese/`). Aucun autre consommateur (vérifié par grep).
- **Aucune migration, aucun n8n, aucune route/menu touchés.**
- **Décision** : C-23. **LEGACY-4 résolu** — colonnes mission (client, fin, TJM/CJM/marge) restent volontairement dérivées de la mission active (données de mission, pas de statut).
- **Impact données** : le chapitre Collaborateurs affiche désormais **29** collaborateurs (effectif actif) au lieu de 30 (1 `sorti` exclu).
- **Invariants protégés** : drawer profil (`ConsultantDrawer` inchangé), tri/filtres, colonnes, `StructuredList` ; `ConsultantDrawer` et les dossiers `activite-conges/` `pool-competences/` de `components/consultants/` non touchés.
- **Gates exécutées** :
  - `npm run typecheck` → PASS
  - `npx vitest run src/features/consultants` → PASS (41 tests) puis `npm test` (**suite complète**) → PASS (260 fichiers / 2628 tests)
  - `npm run check:server-boundary` → PASS
  - `npx eslint src/features/consultants src/app/(app)/consultants/page.tsx` → PASS
  - `npm run build` (local) → non joué (`next dev` concurrent) — **build de prod Vercel = gate** (cf. Lot 3).
- **QA visuelle** : non réalisée — réservée à Guillaume.
- **Commit** : `3296d8ea` — `refactor(consultants): chapitre Collaborateurs dans la feature + statut aligné (Lot 4)`.
- **SHA final** : `3296d8ea72bbed4e305f8f2eba5e5e4bf1345919`.
- **NEXT LOT** : Lot 5 — Migration Activités & congés.

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
  - `npm run build` (local) → non joué en session (`next build` bloqué par le `next dev` concurrent + doublons iCloud `.next/* 2`). **MAIS : le build de production Vercel a tourné sur le commit exact `f4b66b3e` puis `7724d800` et est `READY`** (`dpl_Gi7KBdK2iQ4UL4gj6w9cFCxrd9HY`, `dpl_7DAmwDmWvCeVRV8ggbLtUDNM5Qee`, target `production`, bundler turbopack, `nodejs:3` lambdas) → **la vérification `next build` canonique EST passée, sur Vercel.** 0 erreur runtime dans les 2 h suivant le déploiement.
- **QA visuelle** : non réalisée — réservée à Guillaume.
- **Déploiement** : `main` auto-déploie en production (intégration GitHub↔Vercel). Commit `7724d800` = déploiement de production courant, `READY`, servi sur `kredo-green.vercel.app` (`/consultants` → 200, mur d'auth `/login` attendu).
- **Limites** : la vue `collaborateurs` reste sur le composant legacy (déplacement + alignement C-16 = Lot 4).
- **Commit** : `f4b66b3e` — `feat(consultants): page Synthèse Desktop + Mobile (Lot 3)`.
- **SHA final** : `f4b66b3e4be9293c127bd4056a9e345cee89b4e2`.
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
