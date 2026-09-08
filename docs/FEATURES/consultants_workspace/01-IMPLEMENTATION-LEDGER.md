# Consultants Workspace — Implementation Ledger

> Source de vérité **opérationnelle** du chantier. Le document canonique
> (`00-REFERENCE-CHANTIER-CONSULTANTS.md`) porte le QUOI et le POURQUOI ; ce fichier porte
> l'ÉTAT RÉEL, lot par lot.

```
Chantier                 : Consultants Workspace
Statut global            : en cours
Branche                  : main (branche unique — aucune feature branch)
Baseline initiale        : 064b6c025fa24d0978b3c0959a3f640a5763f43b
Dernier lot livré        : Lot 11 — Module Production & Congés — Data Contract mensuel
Lot courant              : —
Prochain lot             : Lot 12 — Module Production & Congés — UI
Dernier SHA connu origin/main : 9d715c3e   (2026-09-08)
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
| 7 | Data Contract Candidats (candidate-centric) | ✅ techniquement livré | `767e6696` | `src/features/consultants/candidates/data/` : builder pur + loader + types + 11 tests ; `src/lib/recruitment/candidate-lifecycle.ts` (+ 4 tests). C-26. **DATA-4/6 + PRODUCT-2/3 résolus.** Dettes CAND-1/2/3. Aucune migration, aucune UI. Gates verts (build → Vercel). |
| 8 | Page Candidats (Desktop + Mobile, inline edit) | ✅ techniquement livré | `84c7d8f1` | `src/features/consultants/candidates/` : `CandidatesDesktop` (`StructuredList` 7 col.) + `CandidatesMobile` (cartes) + `CandidateInlineControls` + `candidates-view` (+6 tests). C-27. **5/5 chapitres in-shell.** Drawers `CandidateDrawer`/`NewCandidateDrawer` réutilisés. `revalidatePath("/consultants")` sur 5 actions. Dette CAND-4 (positionnement inline). `/recruitment` intact. Gates verts (build → Vercel). |
| 9 | Absorption fonctionnelle Recruitment (audit parité) | ✅ techniquement livré | `16596041` | Matrice parité 17/17. CAND-3 résolu (labels unifiés). CAND-4 tranché (C-28 option 1). LEGACY-2 confirmé orphelin. CandidatesKanbanDesktop (EntityKanbanView). Rapports + Agenda intégrés. Planning déprécié (heuristiques illégitimes C-08). |
| 10 | Dépréciation `/recruitment` (redirect permanent) | ✅ techniquement livré | `b900b0f4` | `permanentRedirect("/consultants?section=candidats")`. C-13 résolue (contrat mobile `getMobileTabsForPath` repointé). NAV-3 volet dépréciation résolu. Call-sites actifs repointés (`SyntheseMobile`, `TalentProfileDetail`, `entity-links`). Code métier legacy préservé (Lot 15). |
| 11 | Module Production & Congés — Data | ✅ techniquement livré | `ab637998` | Granularité mensuelle `1 collab × 1 mois` (C-30, DATA-5 résolu). 22 tests + sentinelles. Loader server-only, RLS respectée. Zéro migration, zéro UI. |
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
| C-27 | Chapitre Candidats internalisé (`?section=candidats`, 5/5 sections in-shell) : `CandidatesDesktop` (`StructuredList` maison, patron Lot 4 — pas `DataTable`/`EntityListView`), `CandidatesMobile` (cartes), `CandidateInlineControls`, `candidates-view.ts`. Distribution serveur (`page.tsx`). Drawers `CandidateDrawer` (déjà candidate-centric) + `NewCandidateDrawer` réutilisés tels quels. Édition inline = lifecycle (`updateCandidateStatus`) + étape process si actif (`updateHiringStep`) ; positionnement `opportunity_candidates` NON inline (dette CAND-4). `revalidatePath("/consultants")` ajouté aux 5 actions recrutement (C-12). `/recruitment` + `getMobileTabsForPath` + `main-menu.config` intacts (C-13). | 8 |
| C-28 | Parité Recruitment : Kanban candidate-centric (`CandidatesKanbanDesktop` via `EntityKanbanView` + `HIRING_KANBAN_STAGES`), planning déprécié (heuristiques illégitimes C-08, zéro migration), CAND-3 résolu (`src/lib/recruitment/candidate-lifecycle.ts`), CAND-4 Option 1 confirmée (`opportunity_candidates.status` maintenu au staffing/drawer), LEGACY-2 confirmé orphelin (suppression Lot 15), « Nouveau rapport » + Agenda (« Planifier ») intégrés. | 9 |
| C-29 | Dépréciation /recruitment & redirection canonique : permanentRedirect("/consultants?section=candidats") direct sans loader ni composant. C-13 résolue (getMobileTabsForPath repointé). Call-sites actifs repointés (SyntheseMobile, TalentProfileDetail, entity-links, mainMenuItems). Code métier legacy préservé (Lot 15). | 10 |
| C-30 | Production & Congés adopte une granularité mensuelle fondée sur les CRA réels (v_collaborator_activity_summary, ytd, absences) ; aucun planning journalier de production fictif ; TACI non double-compté ; RLS salaires respectée (coûts/marges null si non habilité). | 11 |

## Questions ouvertes en cours

Détail et classement (DATA / PRODUCT / NAVIGATION / LEGACY) dans le doc canonique § 20.

| ID | Résumé | Lot cible | Statut |
|---|---|---|---|
| DATA-1 | Source d'autorité « effectif collaborateur actif » | 2 | ✅ résolue (C-16) |
| DATA-2 | Source canonique de la Practice (collaborateurs + candidats) | 2 | ✅ résolue (C-17) |
| DATA-3 | Preuve canonique d'un positionnement actif d'un collaborateur | 2 | ⚠️ partiellement résolue (C-18) — sous-question lien direct `opp↔collab` ouverte |
| DATA-4 | Définition « candidat qualifié durant l'année en cours » | 7 | ✅ résolue (C-26) — jalon `prequalification/valide` daté année civile ; backfill = dette CAND-1 |
| DATA-5 | Planning journalier de production inexistant en base | 11 | ✅ résolue (C-30) — abandon du planning journalier fictif au profit du contrat mensuel CRA |
| DATA-6 | `candidates.availability` texte libre — normalisation ? | 7 | ✅ résolue (C-26) — `available_from`+`notice_period_days` (43/43) = source structurée ; texte jamais parsé |
| DATA-7 | Salaire/CJM intercontrat sous RLS confidentielle — comportement rôle non habilité | 2 | ✅ résolue (C-19) |
| PRODUCT-1 | Intention module Matching : profil→besoins et/ou besoin→profils | 13 | ouverte |
| PRODUCT-2 | « Prochaine action » pour un candidat sans opportunité active | 7 | ✅ résolue (C-26, option a) — positionnement actif le + récent, `null` sinon ; porteur dédié = dette CAND-2 |
| PRODUCT-3 | Valeurs métier du sélecteur lifecycle candidat en UI | 7-8 | ✅ résolue (C-26) — whitelist `src/lib/recruitment/candidate-lifecycle.ts` ; convergence des 3 copies legacy = dette CAND-3 |
| PRODUCT-4 | Chevauchement Synthèse Mobile / module Production & Congés (planning) | 3 / 12 | ouverte |
| NAV-1 | `?section=` confirmé vs pathname après audit code réel Lot 1 | 1 | ✅ résolue (Lot 1) |
| NAV-2 | Redirections routes historiques `(tabbed)` — type et calendrier | 5-6 / 15 | ✅ résolue — `activite-conges` (C-24) + `pool-competences` (C-25) = `permanentRedirect` ; suppression des fichiers de route + `(tabbed)/layout.tsx` + `SectionNavBarSlot` = Lot 15 |
| NAV-3 | Calendrier exact redirect `/recruitment` + retrait module menu | 10 / 14 | ⚠️ partiellement résolue (C-29) — volet dépréciation et redirection canonique résolu Lot 10 ; retrait global du menu principal = Lot 14 (coord. SHELL-0018 Phase 6) |
| NAV-4 | Consultants sous `CRM` ou `Ressources` dans SHELL-0018 Phase 6 | 14 | ouverte |
| LEGACY-1 | Retrait `SectionNavBarSlot` du layout consultants : ici (Lot 1) ou SHELL-0018 ? | 1 / 14 | ✅ résolue (Lot 1, retrait local ; global = Phase 6) |
| LEGACY-2 | `components/recruitment/dashboard/*` morts — confirmer et supprimer | 9 / 15 | ✅ résolue (C-28) — orphelins confirmés (0 import repo), suppression au Lot 15 |
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
| ~~**CAND-3** — 3 copies legacy des labels lifecycle~~ | Résolu Lot 9 (C-28) : `CandidateProfileEditor`, `CandidateReferenceProfile`, `RecruitmentListView` migrés sur `candidate-lifecycle.ts` (`CANDIDATE_LIFECYCLE_STATUSES` + `getCandidateLifecycleLabel`). | — |
| ~~**CAND-4** — positionnement commercial non éditable inline~~ | Tranché Lot 9 (C-28 Option 1) : `opportunity_candidates.status` maintenu au drawer / staffing. Legacy n'avait pas non plus d'inline edit (action `updateRecruitmentStatus` était orpheline sans call-site). Découplage strict des 3 vocabulaires garanti. | — |
| ~~`RecruitmentWorkspace` non adaptive-split~~ | Lot 8 : le **chapitre Candidats** est nativement adaptive-split serveur (`CandidatesDesktop` / `CandidatesMobile`). `RecruitmentWorkspace` lui-même (un seul arbre client) reste jusqu'à la dépréciation `/recruitment` (Lot 10). | 8 / 10 |
| ~~`dashboard/RecruitmentDesktopDashboard` / `RecruitmentMobileDashboard`~~ | Confirmé orphelin Lot 9 (C-28 / LEGACY-2). 0 import repo. Suppression au Lot 15. | 15 |
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

### Lot 11 — Module Production & Congés / Data Contract mensuel — ✅ techniquement livré (2026-09-09)

- **Baseline** : `9d715c3e` (`main` = `origin/main`).
- **Objectif** : Construire le Data Contract du futur module Production & Congés à une granularité mensuelle stricte (`1 collaborateur × 1 mois`) fondée sur les données réellement disponibles dans les CRA, résoudre DATA-5, acter la décision C-30 (abandon de tout calendrier de production fictif), fournir un builder pur testé avec sentinelles et un loader Supabase `server-only` respectant la confidentialité RLS. Aucune UI (réservée Lot 12).
- **Audit préalable du schéma réel et des données live** :
  - `mission_activity_reports` : 227 CRA couvrant 11 mois (2026-01 à 2026-11) ; 227/227 lignes respectent `billable_days + pto_days + sick_days + non_billable_days == business_days` ; snapshots TJM et CJM disponibles sur 100 % des lignes.
  - `collaborator_absences` : 88 absences réelles réparties en `conge_paye` (60), `maladie` (21), `rtt` (4), `formation` (2), `autre` (1). Les 3 absences traversant une fin de mois s'alignent exactement sur les jours ouvrés réels de chaque mois.
  - `v_collaborator_activity_summary` : projection mensuelle existante (227 lignes) avec activité et métriques financières (`revenue`, `employer_cost`, `real_margin`).
  - `v_collaborator_ytd_activity` : 30 lignes avec `ytd_activity_rate`, `taci_target`, `gap_vs_target`.
  - `collaborator_compensation` : 29 lignes actives, protégées par RLS `is_workspace_admin()`.
  - **Migration Supabase** : 0 migration nécessaire (schéma live complet et suffisant).
- **Fichiers créés** :
  - `src/features/consultants/modules/production-leave/data/production-leave.types.ts` : view-model canonique (`ProductionLeaveViewModel`, `ProductionLeaveCollaborator`, `CollaboratorMonthlyProduction`, `MonthlyAbsenceBreakdownItem`, `MonthlyAbsenceItem`, `YtdProductivity`) et types bruts.
  - `src/features/consultants/modules/production-leave/data/build-production-leave.ts` : builder pur, 0 dépendance DB, historique borné à 12 mois, calcul déterministe de la productivité, ventilation prorata jours ouvrés des absences, impact CA théorique (`days × tjm`), modélisation financière sans double comptage du TACI, et respect RLS (coûts/marges `null` + `dataNote` si non habilité).
  - `src/features/consultants/modules/production-leave/data/get-production-leave.ts` : loader `server-only` avec lectures parallèles Supabase sous RLS utilisateur, résolution Practice C-17.
  - `src/features/consultants/modules/production-leave/data/__tests__/build-production-leave.test.ts` : suite de 22 tests unitaires couvrant l'agrégation mensuelle, la productivité, les absences et les finances, ainsi que 4 tests sentinelles stricts (aucun tableau de jours journalier généré, aucun billable_days réparti artificiellement, pas d'assimilation de businessDays - productionDays à de l'absence, TACI non double-compté).
- **Fichiers modifiés** :
  - `docs/FEATURES/consultants_workspace/README.md` : statut mis à jour (Lots 0-11 livrés), prochain lot = Lot 12.
  - `docs/FEATURES/consultants_workspace/00-REFERENCE-CHANTIER-CONSULTANTS.md` : Section 16 réalignée, C-08 mis à jour, C-30 enregistré, DATA-5 résolu, tableau d'inventaire et fiche Lot 11 mis à jour.
  - `docs/FEATURES/consultants_workspace/01-IMPLEMENTATION-LEDGER.md` : ce fichier.
- **Décisions & Résolutions** :
  - **C-30** : Granularité mensuelle stricte fondée sur les CRA réels. Zéro calendrier journalier de production fictif. Absences datées ventilées. Séparation production, manque à produire théorique et coût structurel.
  - **DATA-5** : Résolue sans migration par réutilisation des projections SQL existantes et builder pur.
- **Sentinelles d'invariants** :
  - Aucun calendrier journalier de production fictif (C-08).
  - Zéro dérive vers un planning journalier.
  - `businessDays - productionDays` n'est pas confondu avec l'absence.
  - Le TACI n'est jamais double-compté au coût salarial.
  - Confidentialité RLS respectée : les rôles non habilités reçoivent des coûts et marges `null`.
- **Gates exécutées** :
  - `rm -rf .next && npm run typecheck` → **PASS**
  - `npm test` (**suite complète**) → **PASS** (10 fichiers / 90 tests consultants, suite globale verte)
  - `npm run check:server-boundary` → **PASS**
  - `npx eslint` (fichiers créés) → **PASS** (0 erreur, 0 avertissement)
  - `npm run build` → **PASS**
- **QA visuelle** : non applicable (lot Data sans UI) — réservée à Guillaume pour le Lot 12.
- **Commit** : `ab637998` — `feat(consultants): add monthly production data contract (Lot 11)`
- **SHA final** : `ab637998baab245e1139a403d8f9da02ebc9cf47`
- **NEXT LOT** : Lot 12 — Module Production & Congés / UI.

### Lot 10 — Dépréciation `/recruitment` — ✅ techniquement livré (2026-09-08)

- **Baseline** : `8e8583ba` (`main` = `origin/main`).
- **Objectif** : Faire de `/consultants?section=candidats` l'unique point d'entrée fonctionnel du recrutement dans KREDO via une redirection permanente (`permanentRedirect`) de `/recruitment`, sans exécuter aucun loader legacy ni monter aucun composant, tout en adaptant les références de navigation actives nécessaires sans anticiper le Lot 14 ni supprimer prématurément le code legacy (réservé au Lot 15).
- **Fichiers modifiés** :
  - `src/app/(app)/recruitment/page.tsx` — Remplacé par `permanentRedirect("/consultants?section=candidats")` (patron `prospection/page.tsx`). Suppression des imports et appels à `getDashboardDevice`, `getRecruitmentWorkspace`, `RecruitmentWorkspace` et `DashboardSkeleton`.
  - `src/lib/navigation/main-menu.config.ts` :
    - `getMobileTabsForPath()` : onglet « Recrutement » repointé de `/recruitment` vers `/consultants?section=candidats` (**C-13 résolue**).
    - `mainMenuItems` sous Ressources : entrée « Recrutement » repointée vers `/consultants?section=candidats` pour éviter une redirection intermédiaire morte, sans restructurer le menu global (frontière **NAV-3**).
  - `src/features/consultants/mobile/synthese/SyntheseMobile.tsx` : bouton raccourci repointé vers `/consultants?section=candidats`.
  - `src/features/knowledge-hub/talents/TalentProfileDetail.tsx` : lien vers le profil candidat repointé vers `/consultants?section=candidats`.
  - `src/lib/reports/weekly-manager/entity-links.ts` : entité `candidate` repointée vers `/consultants?section=candidats&candidateId=${entityId}`.
  - `src/features/consultants/navigation/consultants-sections.ts` : commentaire d'en-tête mis à jour pour documenter la dépréciation.
  - `src/lib/navigation/main-menu.config.test.ts` : assertion mise à jour sur `/consultants?section=candidats`.
  - `src/lib/navigation/mobile-navigation-history.test.ts` : assertion mise à jour sur `/consultants?section=candidats`.
  - `src/features/consultants/desktop/synthese/synthese-render.test.ts` : assertion raccourci mise à jour sur `href="/consultants?section=candidats"`.
- **Fichiers créés** :
  - `src/features/consultants/recruitment-deprecation.test.ts` : test structurel validant les invariants (redirection permanente, absence de loader/composant legacy sur la route, contrat mobile et menu).
- **Fichiers préservés intacts (conformément aux règles du Lot 10)** :
  - `src/components/recruitment/RecruitmentWorkspace.tsx`
  - `src/components/recruitment/RecruitmentListView.tsx`
  - `src/components/recruitment/RecruitmentKanbanView.tsx`
  - `src/components/recruitment/RecruitmentPlanningView.tsx`
  - `src/app/(app)/recruitment/_data/get-recruitment-workspace.ts`
  - `src/app/(app)/recruitment/_actions/**` (mutations toujours consommées via C-12)
  - `src/components/recruitment/dashboard/**` (orphelins LEGACY-2 préservés pour Lot 15)
- **Data & n8n** : Aucune migration Supabase, aucune nouvelle table, aucun workflow n8n.
- **Décisions** : **C-29**. **C-13 résolue** (Mobile tabs). **NAV-3 partiellement résolue** (dépréciation et redirection effectuées ; restructuration globale et retrait du module menu réservés au Lot 14 coord. SHELL-0018 Phase 6).
- **Gates exécutées** :
  - `rm -rf .next && npm run typecheck` → **PASS**
  - `npm test` (**suite complète**) → **PASS**
  - `npm run check:server-boundary` → **PASS**
  - `npx eslint` (fichiers touchés) → **PASS**
  - `npm run build` → **PASS**
- **QA visuelle** : non réalisée — réservée à Guillaume.
- **Commit** : `b900b0f4` — `feat(consultants): deprecate recruitment route (Lot 10)`
- **SHA final** : `b900b0f4f7f119dac9b3fe52fc083b63fe07350f`
- **NEXT LOT** : Lot 11 — Module Production & Congés / Data.

### Lot 9 — Absorption fonctionnelle Recruitment — ✅ techniquement livré (2026-09-08)

- **Baseline** : `5fadc96ef811e59265f97ae89098fb4923e5a5f4` (`main` = `origin/main`).
- **Objectif** : Prouver la parité fonctionnelle entre `/recruitment` et `/consultants?section=candidats`, absorber les capacités manquantes légitimes sans casser `/recruitment`, résoudre CAND-3, trancher CAND-4 et confirmer LEGACY-2.
- **Audit du code réel préalable** :
  - L'ancien `/recruitment` repose sur `getRecruitmentWorkspace` (~600 lignes, orienté opportunités/positionnements) et rend `RecruitmentWorkspace` avec 3 sous-vues : Liste (`RecruitmentListView`), Kanban (`RecruitmentKanbanView`), Planning (`RecruitmentPlanningView`).
  - L'audit des Server Actions `_actions/` a révélé une surprise majeure pour CAND-4 : `updateRecruitmentStatus` (mise à jour du statut `opportunity_candidates`) n'était en réalité appelée nulle part dans `/recruitment` (0 consommateur repo). L'édition de positionnement n'était donc jamais inline dans l'UI existante, mais uniquement effectuée via les drawers d'opportunité/staffing.
  - L'audit de `RecruitmentPlanningView` a révélé que les jalons de planning (`planningMilestones`) étaient fabriqués par des heuristiques de parsing regex textuel sur `calendar_events` (détection de mots-clés "prequal", "tech", "contrat") et des dates de création d'opportunité, violant la règle cardinale C-08 (« ne jamais fabriquer une date ou un jalon absent de la donnée source »).
  - L'audit de `components/recruitment/dashboard/*` a révélé 0 import externe dans tout le projet (LEGACY-2 confirmé orphelin).
  - Capacités utiles manquantes dans `?section=candidats` : la visualisation Kanban par étape de recrutement, la génération de rapport d'activité recrutement (`openReportGeneration`), et l'action de prise de rendez-vous / entretien agenda depuis la fiche candidat.

- **Matrice de parité fonctionnelle (17 capacités auditées)** :

| # | Capacité legacy `/recruitment` | Utilisée réellement ? | Équivalent Consultants actuel | Écart constaté | Décision Lot 9 |
|---|---|---|---|---|---|
| 1 | Voir le vivier complet | OUI | `CandidatesDesktop` / `CandidatesMobile` | Aucun (43/43 candidats, candidate-centric) | **KEEP** (couvert Lot 8) |
| 2 | Créer un candidat | OUI | `NewCandidateDrawer` | Aucun | **KEEP** (couvert Lot 8) |
| 3 | Ouvrir le détail candidat | OUI | `CandidateDrawer` | Aucun | **KEEP** (couvert Lot 8) |
| 4 | Modifier le profil candidat | OUI | `CandidateProfileEditor` (dans drawer) | Labels dupliqués (dette CAND-3) | **REUSE & ADAPT** (CAND-3 résolu) |
| 5 | Modifier lifecycle candidat | OUI | Inline controls + Drawer | Aucun (`updateCandidateStatus`) | **KEEP** (couvert Lot 8) |
| 6 | Modifier étape hiring process | OUI | Inline controls + Drawer (`HiringProcessStepper`) | Aucun (`updateHiringStep`) | **KEEP** (couvert Lot 8) |
| 7 | Modifier statut positionnement commercial | OUI (drawer/staffing) | `StaffingDrawer` / `CandidateDrawer` | Aucun inline dans legacy non plus (CAND-4) | **ADAPT** (Option 1 confirmée : laissé au staffing/drawer) |
| 8 | Voir prochaine action | OUI (lecture) | Colonne Prochaine action (Lot 8) | Aucun (positionnement actif récent) | **KEEP** (couvert Lot 8) |
| 9 | Kanban recrutement | OUI | `CandidatesKanbanDesktop` | Absent de Consultants | **ABSORB** (`EntityKanbanView` + `HIRING_KANBAN_STAGES`) |
| 10 | Planning recrutement | NON (heuristique) | `HiringProcessStepper` + Agenda | Planning legacy illégitime (heuristiques regex calendar) | **DEPRECATE** (rejeté car viole C-08) |
| 11 | Créer / ouvrir événement Agenda | OUI | `AgendaEventDrawer` dans `CandidateDrawer` | Absent du drawer candidat | **ABSORB** (bouton « Planifier » ajouté au drawer) |
| 12 | Préparer communication candidat | OUI | `ContextualCommunicationButton` | Aucun (déjà présent dans `CandidateDrawer`) | **KEEP** (déjà couvert) |
| 13 | Ouvrir Staffing / positionnement | OUI | `CandidateDrawer` | Aucun (liens vers opportunités / staffing intacts) | **KEEP** (déjà couvert) |
| 14 | Générer un rapport | OUI | `CandidatesDesktop` (« Nouveau rapport ») | Absent de Consultants | **ABSORB** (`openReportGeneration({ origin: "recruitment" })` intégré) |
| 15 | Filtres spécifiques | OUI | Pipeline (Pool/Process/Closed), Practice, Dispo | Legacy filtrait par stage opportunité | **KEEP** (filtres candidate-centric plus riches) |
| 16 | KPI spécifiques | OUI | 3 StatCards (Qualifiés YTD, Vivier, En process) | Identiques aux KPI legacy pertinents | **KEEP** (couvert Lot 8) |
| 17 | Dashboards legacy | NON (0 import) | Orphelins | Fichiers morts `components/recruitment/dashboard/*` | **DEPRECATE** (LEGACY-2 confirmé, suppression Lot 15) |

- **Décisions et arbitrages durables (C-28)** :
  1. **Kanban recrutement absorbé** : Composant `CandidatesKanbanDesktop.tsx` construit à partir du view-model candidate-centric du Lot 7 et de la primitive générique `EntityKanbanView`. Les colonnes correspondent strictement aux 6 étapes de `HIRING_KANBAN_STAGES`. Le changement d'étape s'effectue via `updateHiringStep` avec mise à jour optimiste (`useOptimistic`). Bascule ergonomique `[Tableau | Kanban]` intégrée dans `CandidatesDesktop.tsx`.
  2. **Planning recrutement déprécié** : Rejeté sur preuve d'absence de contrat de données fiable. L'ancien planning déduisait des étapes à partir de détections de chaînes de caractères ("prequal", "tech", etc.) dans les titres d'événements calendrier globaux. Aucun modèle relationnel de dates n'existe en base pour étayer cette vue, et la règle C-08 interdit formellement de fabriquer des dates fictives. Les vraies dates de jalons sont consultables dans `CandidateDrawer` via `HiringProcessStepper`, et la planification réelle se fait dans l'Agenda.
  3. **CAND-3 résolu** : Unification des libellés de lifecycle candidat. Les copies locales dupliquées dans `CandidateProfileEditor.tsx`, `CandidateReferenceProfile.tsx` et `RecruitmentListView.tsx` ont été supprimées et remplacées par les exports canoniques de `@/lib/recruitment/candidate-lifecycle` (`CANDIDATE_LIFECYCLE_STATUSES` et `getCandidateLifecycleLabel`).
  4. **CAND-4 tranché (Option 1)** : La mise à jour du statut de positionnement commercial `opportunity_candidates.status` reste dans le `StaffingDrawer` et les écrans de staffing. L'audit a prouvé que `/recruitment` n'exposait pas non plus cette mutation inline. Les 3 vocabulaires (lifecycle candidat `candidates.status`, étape du process `candidate_hiring_processes.current_step`, positionnement commercial `opportunity_candidates.status`) restent strictement étanches.
  5. **LEGACY-2 confirmé** : `RecruitmentDesktopDashboard.tsx` et `RecruitmentMobileDashboard.tsx` n'ont aucun import externe dans tout le dépôt. Ce sont des composants orphelins. Consignés au ledger, leur suppression physique interviendra au Lot 15.
  6. **Capacités contextuelles réintroduites** :
     - Bouton « Nouveau rapport » dans `CandidatesDesktop.tsx` appelant `openReportGeneration({ origin: "recruitment", reportType: "activity_recruitment" })`.
     - Bouton « Planifier » et `<AgendaEventDrawer>` intégrés dans `CandidateDrawer.tsx` avec type d'événement `entretien_candidat` pré-rempli avec le `candidate_id`.

- **Fichiers créés** :
  - `src/features/consultants/candidates/CandidatesKanbanDesktop.tsx` — Vue Kanban candidate-centric (`EntityKanbanView`, 6 étapes `HIRING_KANBAN_STAGES`, badges contextuels, `useOptimistic` pour transition d'étape).
  - `src/features/consultants/candidates/candidates-kanban.test.ts` — Tests unitaires validant le mapping des colonnes et la structure des cartes Kanban (3 tests).
- **Fichiers modifiés** :
  - `src/features/consultants/candidates/CandidatesDesktop.tsx` — Bascule de vue `[Tableau | Kanban]` + bouton « Nouveau rapport » (`openReportGeneration`).
  - `src/components/recruitment/CandidateDrawer.tsx` — Bouton « Planifier » + `<AgendaEventDrawer>` (`event_type: "entretien_candidat"`).
  - `src/components/recruitment/CandidateProfileEditor.tsx` — Convergence vers `candidate-lifecycle.ts` (CAND-3).
  - `src/components/recruitment/CandidateReferenceProfile.tsx` — Convergence vers `candidate-lifecycle.ts` (CAND-3).
  - `src/components/recruitment/RecruitmentListView.tsx` — Convergence vers `candidate-lifecycle.ts` (CAND-3).
  - `docs/FEATURES/consultants_workspace/00-REFERENCE-CHANTIER-CONSULTANTS.md` — Enregistrement C-28, clôture LEGACY-2.
  - `docs/FEATURES/consultants_workspace/README.md` — Mise à jour des statuts et jalonnement.
- **Invariants protégés** :
  - `/recruitment` reste entièrement fonctionnel et intact (aucune redirection ni suppression prématurée).
  - Aucune nouvelle migration Supabase, aucun workflow n8n créé.
  - Aucun changement de navigation globale (`main-menu.config.ts` et `getMobileTabsForPath` protégés).
  - Pas de bibliothèque externe introduite.
- **Gates exécutées** :
  - `rm -rf .next && npm run typecheck` → **PASS** (0 erreurs)
  - `npm test` (**suite complète**) → **PASS** (265 fichiers / 2656 tests)
  - `npm run check:server-boundary` → **PASS**
  - `npx eslint` (fichiers touchés) → **PASS**
  - `npm run build` → **PASS** (Turbopack, exit code 0, routes `/consultants` et `/recruitment` compilées sans erreur)
- **QA visuelle** : réservée à Guillaume.
- **Commit** : `16596041` — `feat(consultants): absorb recruitment capabilities and prove parity (Lot 9)`
- **SHA final** : `16596041d22e6d6799089cb5245edb0e00dccd20`
- **NEXT LOT** : Lot 10 — Dépréciation `/recruitment` (redirection permanente vers `/consultants?section=candidats`).

### Lot 8 — Page Candidats — ✅ techniquement livré (2026-09-08)

- **Baseline** : `4c15f519` (`main` = `origin/main`). Travail parallèle Guillaume dans l'arbre (cockpit/veille/design-lab) — **non stagé**.
- **Objectif** : rendre le chapitre Candidats in-shell (`?section=candidats`), câblé sur le view-model candidate-centric du Lot 7 ; table Desktop, cartes Mobile, édition inline, ouverture détail.
- **Audit code réel préalable** :
  - `CandidateDrawer` est **déjà candidate-centric** (`candidateId` en prop, charge ses propres données client-side) → réutilisable tel quel, pas d'adaptation.
  - `RecruitmentListView` (legacy) utilise `EntityListView` + `updateCandidateStatus` avec `useOptimistic` + `router.refresh()` → patron repris.
  - `CollaboratorsDesktop`/`Mobile` (Lot 4) = patron canonique du chantier (`StructuredList`, `useDrawerState`, `StatCard`, `MobileDataList`) → suivi.
  - `updateRecruitmentStatus` opère sur `opportunity_candidates.id` — **absent du view-model Lot 7** (agrégé) → édition du positionnement laissée au drawer (CAND-4).
- **Fichiers créés** :
  - `src/features/consultants/candidates/CandidatesDesktop.tsx` — client ; 3 `StatCard` (qualifiés / vivier / en process) + filtres pipeline·practice·disponibilité + `StructuredList` 7 colonnes (§ 14.3) + `<details>` notes méthodo + `CandidateDrawer` + `NewCandidateDrawer`.
  - `src/features/consultants/candidates/CandidatesMobile.tsx` — client ; `MobilePageHeader` + `MobileHeroInsight` + 3 segments (Prioritaires / En process / Vivier) + `MobileDataList` de `MobileEntitySummary`.
  - `src/features/consultants/candidates/CandidateInlineControls.tsx` — client ; `Select` lifecycle (`updateCandidateStatus`) + `Select` étape (`updateHiringStep`) si `latestHiringProcess.status === 'active'` ; `useOptimistic` + `useTransition` + `router.refresh()`.
  - `src/features/consultants/candidates/candidates-view.ts` (+ `.test.ts`, 6 tests) — `PIPELINE_STATE_META`, `AVAILABILITY_BUCKET_META`, `HIRING_STEP_LABEL`, `LIFECYCLE_*`, `candidateInitials`, `candidateAvatarTone`, `formatSalaryK`.
- **Fichiers modifiés** :
  - `src/features/consultants/navigation/consultants-sections.ts` — `candidats` → `external: false`, `href` `?section=candidats`, ajouté à `CONSULTANTS_IN_SHELL_SECTIONS` (**5/5**).
  - `src/features/consultants/navigation/consultants-sections.test.ts` — assertions (parse `candidats`, 5/5 in-shell, plus de `href="/recruitment"` dans le rail).
  - `src/app/(app)/consultants/page.tsx` — branche `candidats` → `getConsultantsCandidates()` → Desktop/Mobile serveur.
  - `src/app/(app)/recruitment/_actions/{update-candidate-status,update-hiring-step,update-recruitment-status,update-candidate-profile,create-candidate}.ts` — `+ revalidatePath("/consultants")` (refactor C-12, 1 ligne chacun ; aucune autre modification).
- **Non modifiés** : `getRecruitmentWorkspace`, `RecruitmentWorkspace`, `RecruitmentListView`, `src/lib/navigation/main-menu.config.ts`, `getMobileTabsForPath`, route `/recruitment`. Aucune migration, aucun n8n.
- **Décision** : **C-27**. Écarts assumés : `StructuredList` (patron Lot 4) au lieu de `DataTable`/`EntityListView` — c'est LE composant table maison des chapitres du chantier ; édition inline = 2 dimensions sur 3 (positionnement → CAND-4). `edito_bright_design` explicitement **hors périmètre** (son propre document exclut « tableaux CRM opérationnels » et « écrans de saisie rapide »).
- **Invariants protégés** : distribution Desktop/Mobile serveur (`getDashboardDevice`, pas de CSS `hidden`) ; zéro bibliothèque ; tokens `var(--color-*)` (aucun HEX en dur) ; `SectionRail` / Mobile nav / `main-menu.config` intacts ; Server Actions réutilisées (C-12).
- **Gates exécutées** :
  - `rm -rf .next && npm run typecheck` → **PASS**
  - `npx vitest run src/features/consultants` → **PASS** (6 fichiers / 55 tests + 16 `candidates-view`)
  - `npm test` (**suite complète**) → **PASS** (264 fichiers / 2653 tests)
  - `npm run check:server-boundary` → **PASS**
  - `npx eslint` (fichiers touchés : `candidates/`, `navigation/`, `page.tsx`, `_actions/`) → **PASS**
  - `npm run build` (local) → **non joué** (`next dev` concurrent). **Build de prod Vercel = gate** : commit `78e750e7` → `dpl_3TTn1i5TqD2yCTG9V3kgkqnKmmjr`, target `production`, **`READY`**, aliasé `kredo-green.vercel.app` (~140 s). Les composants client + imports de Server Actions passent `next build`.
- **QA visuelle** : réservée à Guillaume.
- **Commit** : `84c7d8f1` — `feat(consultants): chapitre Candidats in-shell — table + cartes + édition inline (Lot 8)` ; doc-commit `78e750e7`.
- **SHA final** : `84c7d8f1`.
- **NEXT LOT** : Lot 9 — Absorption fonctionnelle Recruitment (audit de parité `/recruitment` ↔ chapitre Candidats ; trancher CAND-3, CAND-4 ; confirmer LEGACY-2).

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
  - `npm run build` (local) → **non joué** (`next dev` concurrent). **Build de prod Vercel = gate** : commit `00740322` → `dpl_4fpvQxZz8r5Zg1YeteLVahLau7tX`, target `production`, **`READY`**, aliasé `kredo-green.vercel.app` (~140 s).
- **QA visuelle** : réservée à Guillaume (aucune surface UI dans ce lot).
- **⚠️ Travail parallèle** : `origin/main` a avancé pendant le lot (`00a8c876 feat(cockpit): finalize mobile homepage redesign`, Guillaume) — intégré par `git merge --ff-only`, hors périmètre, non modifié.
- **Commit** : `767e6696` — `feat(consultants): data contract Candidats — view-model candidate-centric (Lot 7)` ; doc-commit `00740322`.
- **SHA final** : `767e6696`.
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
