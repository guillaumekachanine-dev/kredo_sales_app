# Consultants Workspace — Document de référence canonique

> **Chantier :** Consultants Workspace
> **Statut :** cadré (Lot 0 livré le 2026-09-08)
> **Branche de travail unique :** `main`
> **Baseline de cadrage :** `064b6c025fa24d0978b3c0959a3f640a5763f43b`
> **Autorité :** ce document + le ledger `01-IMPLEMENTATION-LEDGER.md`. En cas de doute,
> le code réel sur `origin/main` et le standard `docs/navigation_architecture/SHELL-0018/` priment.

---

## 1. Intention et périmètre

### 1.1 Problème

KREDO éclate aujourd'hui la gestion des ressources humaines internes et candidates sur
**deux surfaces disjointes** :

- **« Équipe »** — `/consultants` — pilotage des collaborateurs, activité & congés, pool de compétences.
  Navigation : ancienne barre d'onglets horizontale `SectionNavBarSlot`.
- **« Recrutement »** — `/recruitment` — suivi des positionnements et process de recrutement.
  Navigation : aucune (module plat sans onglets).

Ces deux surfaces partagent le même party model (`persons`), les mêmes practices, les mêmes
référentiels de profils et les mêmes compétences, mais ne se parlent pas. Un collaborateur en
intercontrat et un candidat du vivier sont deux facettes du même sujet — « qui peut staffer un besoin » —
traitées dans deux modules qui s'ignorent.

### 1.2 Cible

Un domaine métier unique **« Consultants »**, route canonique **`/consultants`**, couvrant le cycle
de vie complet des ressources internes et candidates :

```
Synthèse ─ Collaborateurs ─ Activités & congés ─ Candidats ─ Pool de compétences
                                                        │
                                    modules : Production & Congés · Matching profil
```

`/recruitment` est **absorbé** dans le chapitre **Candidats**, puis déprécié (redirection permanente
vers `/consultants?section=candidats`) une fois la parité fonctionnelle prouvée.

### 1.3 Ce que le chantier ne fait pas

- Il ne crée **aucun second moteur de matching** : il expose le moteur unique existant
  (`src/lib/staffing-matching/`).
- Il ne réécrit pas la logique métier de l'activité, des congés ou du pool de compétences :
  il **déplace et réutilise** les composants existants.
- Il ne modifie le menu principal, `DesktopSidebar`, `MobileNav`, `SectionNavBar` /
  `SectionNavBarSlot` qu'au **Lot 14**, en coordination avec SHELL-0018 Phase 6.
- Il n'introduit **aucune configuration de navigation en base** (règle SHELL-0018 : la config
  reste en TypeScript).
- Il ne crée de migration Supabase que dans les lots Data explicitement prévus (2.x, 7, 11),
  et seulement si l'audit prouve le besoin.

---

## 2. Contraintes de plateforme (rappel, `CLAUDE.md` fait autorité)

- **Next.js 16.2.7** App Router, **React 19.2.4**, Server Components, Vercel.
- **Tailwind v4** `@theme` dans `src/app/globals.css` — pas de `tailwind.config.*`, pas de HEX en dur dans le JSX.
- **UI maison** sur primitives `<dialog>` (`AppDrawer`, `AppDialog`, `SurfaceCard`, `DataTable<T>`…).
  **Interdits fermes** : shadcn/ui, Radix, recharts, chart.js, Tremor.
- **Dataviz** : SVG écrit à la main. Seule dépendance tolérée : `d3-shape`. **Aucune nouvelle
  bibliothèque graphique** — les graphiques 1 et 2 de la Synthèse sont en SVG maison (Desktop)
  et HTML+Tailwind pur (Mobile).
- **Supabase** : RLS actif, `workspace_id` par DEFAULT (`current_workspace_id()`), jamais envoyé
  par le front. Fonctions `private.*` non appelables en `.rpc()` — résoudre le workspace via
  `profiles.workspace_id` (`resolveCurrentWorkspaceId()`).
- **`import "server-only"`** sur tout module important le client Supabase serveur, puis
  `npm run check:server-boundary`.
- **Adaptive Design (ADR-0006)** : *Desktop = analyse dense / Mobile = action synthétique*.
  Dashboards / cockpits / plannings denses → **adaptive plein** (`DesktopView.tsx` / `MobileView.tsx`
  distribués par un Server Component). CRUD / listes simples → responsive CSS. **Ne jamais charger
  le composant lourd pour le masquer en CSS ; ne charger que les données de la vue rendue.**
- **Boucle de validation** : `typecheck` → `test` → `check:server-boundary` → `lint` (fichiers touchés) → `build`.

---

## 3. Standard de navigation réutilisé — SHELL-0018

Le chantier **n'invente rien** en matière de châssis de navigation. Il applique le standard
stabilisé par SHELL-0018 (Phases 1→5 closes, cf. `docs/navigation_architecture/SHELL-0018/`).

### 3.1 Primitive

- Contrat : `src/lib/navigation/section-rail.ts` (`SectionRailProps`, `SectionRailEntry`,
  union exclusive `href` XOR `onSelect`).
- Composant présentationnel : `src/components/layout/SectionRail.tsx`.
- **Aucune logique métier, aucun Supabase, aucun n8n dans la primitive.**

### 3.2 Invariants visuels et comportementaux (repris tels quels)

| Règle | Valeur |
|---|---|
| Largeur du rail | `w-[11.5rem]` (`184px`), fixe, jamais élargi pour un libellé |
| Chapeau | bouton **navy**, texte **blanc gras `text-xs` centré H+V**, `min-h-10`, `rounded-md` |
| Contenu du chapeau | **titre de la page principale** (`Consultants`) — jamais le nom de l'onglet |
| Action du chapeau | retour à l'état racine (`/consultants`, section `synthese`) |
| Titre de section | `Chapitres` (jamais « Sections » / « Navigation ») — `text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted` |
| Item actif | `border-l-edito-brass bg-edito-surface text-edito-navy` |
| Header de la zone principale | affiche **toujours** le nom exact du chapitre actif (distinct du chapeau) |
| Section `Modules` | ancrée en bas (`mt-auto`), **rendue uniquement si ≥ 1 module contextuel réellement disponible**, sinon `contextualModules: undefined` |
| Navigation | **URL-addressable** : deep-link, refresh, back/forward reconstruisent le chapitre |
| Mobile | branche serveur distincte, jamais du CSS `hidden` sur un arbre Desktop lourd |

### 3.3 Modèle d'implémentation de référence : Engagements (`/missions`)

`EngagementsDesktopView.tsx` intègre `<SectionRail>` **inline** (pas d'adaptateur `LocalNavigation`
séparé), pilote la navigation par **`?vue=`**, le serveur choisit la vue via `pickView()` dans
`src/app/(app)/missions/page.tsx`, et `HEADER_TITLE_BY_VIEW[activeView]` alimente le header.
C'est le patron le plus proche de la cible Consultants — **le Lot 1 s'en inspire directement**,
en remplaçant `?vue=` par **`?section=`** (contrat homogène avec Veille / Reports / Automations /
Prospection / Finance).

### 3.4 Contrat URL cible Consultants

```
/consultants                              → Synthèse (état racine, sans paramètre)
/consultants?section=collaborateurs
/consultants?section=activite-conges
/consultants?section=candidats
/consultants?section=pool-competences
```

- Root canonique : `synthese`, **sans paramètre** (`section` omis quand on est sur la Synthèse).
- Paramètres orthogonaux autorisés et préservés lors des changements de chapitre :
  filtres, tri, pagination, `?candidate=<id>` (détail candidat), `?collaborateur=<id>` (drawer).
- Décision enregistrée comme **contrat cible** (voir DECISION LOG C-03 / C-05), révisable
  uniquement si l'audit du code réel révèle un conflit dur.

---

## 4. Structure cible Desktop

### 4.1 Rail secondaire

```
┌──────────────────────────┐
│       CONSULTANTS         │  ← chapeau navy → /consultants
├──────────────────────────┤
│ CHAPITRES                │
│ ▍ Synthèse               │  section=synthese (racine)
│   Collaborateurs         │  section=collaborateurs
│   Activités & congés     │  section=activite-conges
│   Candidats              │  section=candidats
│   Pool de compétences    │  section=pool-competences
│                          │
│        espace flexible   │
├──────────────────────────┤
│ MODULES                  │  ← rendus seulement si réellement disponibles
│   Production & Congés     │
│   Matching profil         │
└──────────────────────────┘
```

### 4.2 Header principal

Le header de la zone principale affiche le libellé exact du chapitre actif via un
`HEADER_TITLE_BY_SECTION` :

| section | header |
|---|---|
| `synthese` | `Synthèse` |
| `collaborateurs` | `Collaborateurs` |
| `activite-conges` | `Activités & congés` |
| `candidats` | `Candidats` |
| `pool-competences` | `Pool de compétences` |

### 4.3 Modules contextuels

Conformément à la matrice SHELL-0018 Lot 3.1 : un module n'est rendu que si
(1) il a une utilité directe dans la page, (2) il reçoit son contexte sans reconstruction manuelle,
(3) son point d'ouverture est réellement fonctionnel.

| Module | Contexte | Condition de rendu |
|---|---|---|
| **Production & Congés** | Vue transverse collaborateur : productivité + planning production + congés + absences | Rendu quand le module est livré (Lots 11-12). Avant : **non déclaré**. |
| **Matching profil** | Point d'entrée UI vers le moteur unique `runOpportunityMatching` / `use-opportunity-matching` | Rendu quand le module est livré (Lot 13). Avant : **non déclaré**. |

Tant que ces modules ne sont pas livrés, `contextualModules: undefined` (aucun bouton mort,
aucun « bientôt disponible » dans le rail).

---

## 5. Structure cible Mobile

Contrat Adaptive Design (à détailler dans les lots UI, pas ici) :

```
Synthèse ─ Collaborateurs ─ Candidats ─ Activité ─ Compétences
```

- Bottom navigation bar / `MobileSectionRail` selon le patron existant.
- **Synthèse Mobile** : 3 KPI · prochaines fins de mission · intercontrats · synthèse du pipeline
  recrutement · actions rapides.
- Les tableaux Desktop deviennent des **cards / listes orientées action** (touch targets ≥ 44px).
- **Zéro bibliothèque graphique** — jauges et barres en `div` + `height %`.
- La distribution Desktop/Mobile se fait **côté serveur** (`getDashboardDevice()`), jamais en CSS.
- **Contrat Mobile partagé à protéger** : `getMobileTabsForPath()` dans
  `src/lib/navigation/main-menu.config.ts` groupe aujourd'hui `/missions/opps` + `/recruitment`
  sous « Besoins & Staffing » / « Recrutement ». Toute évolution de la route `/recruitment`
  doit préserver ce groupement jusqu'à sa migration explicite (Lot 9-10).

---

## 6. Architecture applicative cible

### 6.1 Emplacement

Convention KREDO récente : **feature verticale** sous `src/features/`. Cible :

```
src/features/consultants/
├── index.tsx            ← Server Component : résout section + device, distribue
├── data/                ← loaders Supabase + view-models (server-only)
├── navigation/          ← SECTIONS, HEADER_TITLE_BY_SECTION, parse/build href
├── desktop/             ← ConsultantsDesktopShell + vues denses
├── mobile/              ← ConsultantsMobileShell + vues action
├── collaborators/       ← chapitre Collaborateurs
├── candidates/          ← chapitre Candidats (+ actions recrutement réutilisées)
├── activity/            ← chapitre Activités & congés
├── skills/              ← chapitre Pool de compétences
├── modules/             ← Production & Congés, Matching profil
└── __tests__/
```

### 6.2 Migration progressive, sans big-bang

- **Ne pas** déplacer immédiatement tout le legacy. Chaque lot extrait / adapte / réutilise,
  puis supprime **après** migration prouvée.
- Les composants existants restent à leur emplacement actuel tant qu'un lot ne les déplace pas.
- Les Server Actions de `src/app/(app)/recruitment/_actions/` sont **réutilisées / refactorées**,
  jamais dupliquées. Elles pourront être déplacées vers `src/features/consultants/candidates/actions/`
  au Lot 8/9.

### 6.3 Route et layout

- La route `/consultants` reste `src/app/(app)/consultants/`.
- `src/app/(app)/consultants/page.tsx` devient un point d'entrée fin qui lit `?section=` et
  délègue à `src/features/consultants/`.
- `src/app/(app)/consultants/layout.tsx` **retire `SectionNavBarSlot`** (Lot 1) — le rail V2 est
  porté par la feature, pas par le layout.
- Les routes `src/app/(app)/consultants/(tabbed)/activite-conges/` et `.../pool-competences/`
  restent d'abord fonctionnelles, puis sont réorientées (redirection) vers `?section=` (Lots 5-6),
  puis supprimées au Lot 15.

---

## 7. Cible fonctionnelle — Synthèse

### 7.1 KPI (3)

| KPI | Définition cible | Source à confirmer au Lot 2 |
|---|---|---|
| **Collaborateurs** | Effectif interne actif (hors sortis) | `collaborators` — exclure `status='sorti'` **et/ou** `exit_date <= today`. Contrat de statut à figer au Lot 2 (voir §7.3). |
| **Vivier candidats** | Nombre de candidats du vivier pertinent | `candidates` — population à définir au Lot 7 (voir §14-15). Baseline naïve : `status='vivier'`. |
| **Recrutements réalisés (année en cours)** | Recrutements aboutis sur l'année civile courante | `candidate_hiring_processes` — `status='hired' AND closed_at` dans l'année civile courante. **Vérifié live 2026-09-08 : 11 process `hired`, tous avec `closed_at` en 2026.** |

### 7.2 Chiffres live constatés (2026-09-08 — indicatifs, à revérifier en base)

- `collaborators` : **30 lignes** — `en_mission` 26 · `intercontrat` 3 · `sorti` 1 ; 1 ligne avec `exit_date`.
- `candidates` : **43 lignes** — `vivier` 11 · `recrute` 11 · `en_process` 9 · `nouveau` 3 · `qualifie` 3 ·
  `indisponible` 2 · `ko_manager` 1 · `propose` 1 · `archive` 1 · `refuse` 1.
- `candidate_hiring_processes` : **34 lignes** — `hired` 11 · `active` 10 · `cancelled` 5 · `rejected` 5 · `withdrawn` 3.
- `missions` actives avec `end_date >= today` : **10**.
- `match_scores` : **644 lignes** sur 24 opportunités.

> ⚠️ `CLAUDE.md` annonce 23 collaborateurs / 38 candidats / 18 `match_scores` — **périmé**. Toujours
> recompter en base avant de s'appuyer sur un chiffre.

### 7.3 Contrat de statut collaborateur (`OPEN QUESTION DATA-1`)

Valeurs `collaborators.status` en base : `en_mission`, `intercontrat`, `sorti`.
Aucun contrat applicatif figé aujourd'hui (`ConsultantsSyntheseDesktop` calcule « en mission »
depuis `missions.status='active'`, pas depuis `collaborators.status`). Le Lot 2 doit :
1. trancher la source d'autorité de l'« effectif actif » (statut vs `exit_date` vs présence de mission active) ;
2. figer la liste des statuts « sortis » à exclure ;
3. enregistrer ce contrat dans `src/features/consultants/data/` et ce document.

**Ne hardcoder aucune valeur avant cet audit.**

---

## 8. Cible fonctionnelle — Graphique 1 : répartition par Practice

- Section graphique de la Synthèse avec **sélecteur `Collaborateurs | Candidats`**.
- Répartition des personnes par **Practice de rattachement**.
- **SVG maison Desktop / barres HTML+Tailwind Mobile.** Aucune bibliothèque.

### Source canonique de la Practice (`OPEN QUESTION DATA-2`)

État réel du schéma (vérifié live 2026-09-08) :

| Entité | Colonnes de rattachement | Nature |
|---|---|---|
| `collaborators` | `practice` (**text libre**), `job_profile_id` (FK `job_profiles`) | **pas de `practice_id`** |
| `candidates` | `practice_id` (FK), `job_profile_id` (FK `job_profiles`) | relationnel |
| `job_profiles` | 65 lignes, référentiel profils recrutement | pivot commun potentiel |
| `offer_practices` | 8 lignes, slugs canoniques | référentiel practices |

Valeurs `collaborators.practice` en base : `Digital`, `Data & AI`, `Data`, `Digital Business Solutions`,
`Cybersecurity`, `Cloud`, `Mobile`, `Design`, `QA`, `Product Management`, `Project Management`,
`Project & Agile Delivery`, `Quality Engineering & Testing` — **texte non normalisé, non aligné sur
`offer_practices.slug`**. Voir la note projet « double vocabulaire des practices » : `offer_practices.slug`
(base) ≠ `PracticeSlug` (front), un seul des 8 coïncide.

**À trancher au Lot 2 :** la relation qui devient la source canonique de la Practice pour ce graphique
(candidat probable : résolution via `job_profile_id → job_profiles`, avec une projection Practice
partagée collaborateurs+candidats). **Ne pas créer une nouvelle taxonomie de Practices.** Si la
résolution fiable n'est pas possible sans normalisation, isoler la normalisation dans un sous-lot `2.x`.

---

## 9. Cible fonctionnelle — Tableau : prochaines fins de mission

- Les **5 missions actives** dont la date de fin est la plus proche de la date courante.
- Règle cible : `missions.status='active' AND end_date >= today` — tri `end_date ASC` — `LIMIT 5`.
- Colonnes minimales : **Collaborateur · Mission · Client · Date de fin · Jours restants**.
- `Jours restants` = dérivé (`end_date - today`), **aucune colonne DB**.
- Source : `missions` (+ `collaborators`/`persons` pour le nom, `companies` pour le client).

---

## 10. Cible fonctionnelle — Tableau : collaborateurs en intercontrat

Colonnes cible : **Nom / prénom · Intitulé du profil · Practice · Dernière mission réalisée ·
Salaire annuel · CJM · Positionnements missions en cours**.

### Sources à auditer (Lot 2)

| Donnée | Source probable |
|---|---|
| Identité | `collaborators` → `persons` |
| Intitulé profil | `collaborators.current_title` / `job_profiles` |
| Practice | cf. §8 (OPEN QUESTION DATA-2) |
| Dernière mission réalisée | `missions` (status `ended`, tri `end_date DESC`) |
| Salaire annuel | `collaborator_compensation.gross_annual` **ou** `v_collaborator_activity_summary.gross_annual` — **RLS confidentielle owner/admin**, à ne charger que côté serveur et à ne pas exposer aux rôles non habilités |
| CJM | `collaborator_compensation.cjm` (généré) / `v_collaborator_*` `cjm_snapshot` / `daily_employer_cost` |
| Positionnements missions en cours | **cf. OPEN QUESTION DATA-3 ci-dessous** |

### `OPEN QUESTION DATA-3` — Preuve canonique d'un positionnement actif

Ne pas confondre :
- **matching potentiel** — `match_scores` (`opportunity_id`, `person_id`, `overall_score`, …) :
  644 lignes, résultat d'un calcul de compatibilité. **Ce n'est pas un positionnement.**
- **positionnement commercial réellement actif** — un collaborateur réellement présenté / retenu
  sur un besoin ouvert.

Piste : `opportunity_candidates` joint `candidate → person → collaborators` + `opportunities.stage`
non terminal, filtré sur les statuts non terminaux (`RECRUITMENT_TERMINAL_STATUSES`). Mais le lien
collaborateur ↔ `opportunity_candidates` passe par une chaîne indirecte (party model) et n'est pas
garanti peuplé pour tous les collaborateurs.

**Le Lot 2 doit** : (a) identifier la source réelle du positionnement en cours d'un collaborateur ;
(b) si le schéma ne le permet pas de façon fiable, marquer la question **OPEN**, proposer la
meilleure architecture relationnelle (ex. vue `v_collaborator_active_positionings`), et **ne rien
inventer** — la colonne affiche alors un état « non déterminé » plutôt qu'un chiffre faux.

---

## 11. Cible fonctionnelle — Graphique 2 : recrutement

- Vue d'ensemble de l'avancement des recrutements **par étape de process**.
- Source principale : `candidate_hiring_processes` (`current_step`), enrichie de `candidate_hiring_milestones`.
- Étapes du **processus de recrutement** (vérifiées live, alignées sur `HIRING_KANBAN_STAGES` de
  `src/lib/recruitment/recruitment-stages.ts`) :
  `prequalification · entretien_manager · tests_techniques · proposition · signature · integration`.
- **Distinction impérative** (voir C-07) :

| | Étape de process | Statut lifecycle candidat |
|---|---|---|
| Table | `candidate_hiring_processes.current_step` / `candidate_hiring_milestones.step` | `candidates.status` |
| Valeurs | `prequalification`…`integration` | `nouveau · qualifie · vivier · propose · en_process · recrute · refuse · indisponible · archive · ko_manager` |
| Sémantique | où en est le recrutement | où en est la relation avec le candidat |
| Vocabulaire tiers | `opportunity_candidates.status` (positionnement commercial) — `RECRUITMENT_STAGES` | — |

Trois vocabulaires coexistent : **process** (`candidate_hiring_processes`), **lifecycle candidat**
(`candidates.status`), **positionnement commercial** (`opportunity_candidates.status`). Ne jamais
les fusionner ni les mapper implicitement.

---

## 12. Cible fonctionnelle — Chapitre Collaborateurs

Déplacer l'actuel tableau collaborateurs de `/consultants` (aujourd'hui la **Synthèse** racine)
vers le chapitre **Collaborateurs**, **sans réécriture métier**.

### Existant à réutiliser

| Élément | Fichier |
|---|---|
| Loader | `src/app/(app)/consultants/page.tsx` (query `collaborators` + `missions` imbriquées) |
| Vue Desktop | `src/components/consultants/synthese/ConsultantsSyntheseDesktop.tsx` (`StructuredList`, colonnes, `getActiveMission`, `getDaysInfo`) |
| Vue Mobile | `src/components/consultants/synthese/ConsultantsSyntheseMobile.tsx` |
| Type partagé | `CollaborateurRow` (exporté par `ConsultantsSyntheseDesktop.tsx`) |
| Drawer profil | `src/components/consultants/ConsultantDrawer.tsx` (+ `src/types/consultant-drawer.ts`) |
| Config practice UI | `src/lib/config/practices` (`getPracticeByName`) |

### Traitement

`MOVE` + `REUSE`. Le contenu de la Synthèse racine devient le chapitre Collaborateurs ; la Synthèse
racine est **reconstruite** (Lots 2-3) comme page de pilotage (KPI + graphiques + tableaux courts).

---

## 13. Cible fonctionnelle — Chapitre Activités & congés

Reprendre le contenu fonctionnel existant **à l'identique**.

| Élément | Fichier |
|---|---|
| Route historique | `src/app/(app)/consultants/(tabbed)/activite-conges/page.tsx` |
| Loader | inline dans la page (6 lectures parallèles : `v_collaborator_activity_summary`, `v_collaborator_ytd_activity`, `v_profitability_alerts`, `collaborator_absences`, `client_closures`, `collaborator_compensation`) |
| Composant | `src/components/consultants/activite-conges/ConsultantsActivityDashboard.tsx` (+ types `AbsenceRow`, `ActivitySummaryRow`, `YtdActivityRow`, `ProfitabilityAlertRow`, `ClientClosureRow`, `CompensationRow`) |
| Device | **à auditer** : la page rend `ConsultantsActivityDashboard` sans branchement `getDashboardDevice()` — vérifier si responsive CSS ou Desktop-only, et si une vue Mobile est attendue (Lot 5). |

### Plan de migration (Lot 5)

1. Extraire le loader inline vers `src/features/consultants/data/`.
2. Monter `ConsultantsActivityDashboard` dans le chapitre `activite-conges` du workspace.
3. **Ne reconstruire aucun calcul** si le composant est réutilisable tel quel.
4. Rediriger `/consultants/activite-conges` → `/consultants?section=activite-conges` (compat historique).
5. Suppression de la route legacy : Lot 15.

---

## 14. Cible fonctionnelle — Chapitre Candidats (évolution majeure)

> **Ce n'est pas une simple intégration de `RecruitmentWorkspace`.**

### 14.1 Rupture de modèle

Le loader actuel `getRecruitmentWorkspace()` (`src/app/(app)/recruitment/_data/`) part de
**`opportunity_candidates`** (positionnements) puis remonte vers le candidat. Conséquence : un
candidat du vivier **non positionné sur un besoin n'apparaît jamais**.

Le loader cible part **prioritairement de `candidates`**, puis enrichit :

```
candidates
  ├── persons                       (full_name, location)
  ├── job_profiles / practice_id    (profil, practice — cf. OPEN QUESTION DATA-2)
  ├── candidate_hiring_processes    (status, current_step)
  ├── candidate_hiring_milestones   (jalons, dates)
  ├── opportunity_candidates        (positionnements — 0..n)
  ├── opportunities                 (besoins liés)
  └── calendar_events               (RDV, entretiens)
```

Objectif : **afficher le vivier KREDO complet pertinent**, y compris les candidats sans
positionnement actif.

### 14.2 Périmètre temporel (`OPEN QUESTION DATA-4`)

Demande : *« intégrer tous les candidats qualifiés durant l'année en cours »*.

Définition cible recommandée à auditer :

```
candidate_hiring_milestones
  step = 'prequalification'
  result = 'valide'
  completed_at dans l'année civile courante
```

`candidate_hiring_milestones.result` en base : `valide` (122) · `en_attente` (7) · `annule` (5) · `refuse` (3).

- **Ne pas assimiler `candidates.created_at` à une date de qualification.**
- Les candidats plus anciens sans milestone `prequalification/valide` : documenter un mécanisme
  de **fallback / backfill** comme **dette Data distincte** (sous-lot `7.x`), ne pas le forcer dans
  la définition principale.

### 14.3 Tableau Candidats — colonnes

| Colonne | Source attendue (à auditer Lot 7) |
|---|---|
| Nom Prénom | `persons.full_name` |
| Intitulé du profil | `candidates.current_title` / `job_profiles` |
| Practice de rattachement | `candidates.practice_id` (cf. OPEN QUESTION DATA-2) |
| Séniorité | `candidates.seniority` (`Senior`, `Confirmé`, `Junior`, `Expert`, `Lead` en base) |
| Disponibilité | `candidates.availability` (**texte libre** — ~20 formes distinctes en base) + `candidates.available_from` (date) |
| Domiciliation | `persons.location` |
| Prétentions salariales | `candidates.expected_salary` / `candidates.expected_daily_rate` |
| Étape / statut du process | `candidate_hiring_processes.current_step` + `candidate_hiring_processes.status` + `candidates.status` |
| Prochaine action | `opportunity_candidates.next_action` — **cf. OPEN QUESTION PRODUCT-2** |

### 14.4 Édition inline « Étape / statut » (C-07)

Un seul sélecteur éditorial en UI, **mais qui écrit dans le bon modèle** selon la dimension choisie :

| Dimension | Modèle écrit | Action existante à réutiliser |
|---|---|---|
| **Process** (`Préqualification`…`Intégration`) | `candidate_hiring_processes.current_step` | `src/app/(app)/recruitment/_actions/update-hiring-step.ts` |
| **Lifecycle candidat** (`Vivier actif`, `NoGo`, `Ne plus contacter`, `Indisponible`, `Recruté`…) | `candidates.status` | `src/app/(app)/recruitment/_actions/update-candidate-status.ts` (whitelist `VALID_STATUSES`) |
| **Positionnement commercial** | `opportunity_candidates.status` | `src/app/(app)/recruitment/_actions/update-recruitment-status.ts` |

**Réutiliser / refactorer ces mutations, jamais les dupliquer.** Autres actions existantes :
`create-candidate.ts`, `update-candidate-profile.ts`.

### 14.5 « Prochaine action » (`OPEN QUESTION PRODUCT-2`)

`opportunity_candidates.next_action` (text) n'existe que s'il y a un positionnement. Pour un
candidat du vivier sans opportunité active, il n'y a **pas de porteur** de cette information.
Le Lot 7 doit trancher : (a) n'afficher « Prochaine action » que pour les candidats positionnés ;
(b) dériver une action depuis le dernier milestone ; (c) introduire un porteur dédié (migration,
dette Data). **Ne créer aucune colonne arbitraire avant le Lot 7.**

---

## 15. Cible fonctionnelle — Chapitre Pool de compétences

Reprendre **exactement** le contenu fonctionnel existant.

| Élément | Fichier |
|---|---|
| Route historique | `src/app/(app)/consultants/(tabbed)/pool-competences/page.tsx` |
| Loader | inline (référentiels cachés `getOfferPracticesCatalog`/`getOffersCatalog`/`getSkillsCatalog`/`getJobProfilesCatalog` + `person_skills` + `opportunity_skills`) |
| Builder | `src/lib/consultants/pool-competences-data.ts` (`buildPoolCompetencesDataset`) |
| Composants | `src/components/consultants/pool-competences/` (`PoolCompetencesMap`, `PoolCompetencesPracticeRow`, `PoolCompetencesSkillCardsRow`, `PoolCompetencesConnections`, `SkillDescriptionTooltip`, types) |

Traitement : `MOVE` + `REUSE`. Redirection `/consultants/pool-competences` → `?section=pool-competences`
(Lot 6), suppression legacy Lot 15.

---

## 16. Module contextuel — Production & Congés

Nouveau module contextuel (rail `Modules`). Objectif : pour chaque collaborateur, afficher
**niveau de productivité · planning des jours de production · congés · absences**.

### Sources existantes à auditer (Lot 11)

| Source | Contenu utile |
|---|---|
| `mission_activity_reports` | CRA par période — `business_days`, `billable_days`, `pto_days`, `sick_days`, `non_billable_days`, `activity_rate_percent` (généré) |
| `collaborator_absences` | absences datées (`start_date`, `end_date`, `duration_days`, `absence_type`) |
| `v_collaborator_activity_summary` | 1 ligne / collaborateur × mois — activité + finance |
| `v_collaborator_ytd_activity` | taux YTD pondéré, `taci_target`, `gap_vs_target` |

### `OPEN QUESTION DATA-5` — agrégat mensuel vs planning journalier

`mission_activity_reports` et les vues fournissent des **agrégats mensuels**. Le module demande
un **planning journalier réel** (jour par jour : production / congé / absence).

- `collaborator_absences` porte des dates → le planning **des congés / absences** est faisable.
- Le planning **des jours de production** jour par jour n'existe pas en base (seuls des totaux mensuels).

**Le Lot 11 doit** : documenter précisément le gap · proposer le modèle relationnel minimal
(ex. table `collaborator_daily_activity` ou dérivation calendaire depuis missions + absences +
`client_closures`) · placer la migration dans un lot Data dédié · **ne jamais fabriquer un faux
calendrier journalier à partir d'agrégats mensuels** (C-08).

---

## 17. Module contextuel — Matching profil

Point d'entrée UI vers le **moteur de matching unique existant**. **Aucun second moteur** (C-09).

### Existant

| Élément | Fichier |
|---|---|
| Orchestrateur | `src/lib/staffing-matching/actions.ts` → `runOpportunityMatching(opportunityId)` — chaîne 100 % déterministe (hydratation RPC → moteur TS C1-C6 → persistance `match_scores`), aucun LLM, aucun n8n |
| Moteur | `src/lib/staffing-matching/compute-match.ts` + `components/compute-c1..c6-*.ts` |
| Hook UI | `src/lib/staffing-matching/use-opportunity-matching.ts` |
| Points d'entrée UI existants | `src/components/staffing/matching/MatchingDialog.tsx`, `src/components/intelligence/matching/MatchingComposer.tsx`, `src/components/intelligence/AccountRecruitmentDialog.tsx` |
| Données | `match_scores` (`opportunity_id`, `person_id`, `overall_score`, `scores` JSONB, `model_version`, `source_run_id`) — 644 lignes / 24 opportunités |

### `OPEN QUESTION PRODUCT-1` — intention du module

Deux intentions possibles :

```
Profil  → besoins compatibles     (part d'un collaborateur/candidat)
Besoin  → profils compatibles     (part d'une opportunité — c'est ce que fait runOpportunityMatching aujourd'hui)
```

Le moteur actuel est **besoin-centrique** (`runOpportunityMatching(opportunityId)`). Un module
« Profil → besoins » demande soit une itération sur les besoins ouverts, soit une nouvelle
requête de lecture sur `match_scores` filtrée par `person_id`. **Le choix produit est enregistré
comme décision (DECISION LOG) avant l'implémentation du Lot 13.**

---

## 18. Absorption de `/recruitment`

### 18.1 Inventaire du module (baseline 2026-09-08)

**Route** — `src/app/(app)/recruitment/` :
- `page.tsx` — `getDashboardDevice()` + `getRecruitmentWorkspace()` → `<RecruitmentWorkspace isMobile>`.
- `_data/get-recruitment-workspace.ts` — loader **opportunity_candidates-centric** (voir §14.1),
  ~600 lignes, dérive aussi les `planningMilestones` (heuristiques d'événements calendaires).
- `_actions/` : `create-candidate.ts` (135) · `update-candidate-profile.ts` (143) ·
  `update-candidate-status.ts` (40) · `update-hiring-step.ts` (36) · `update-recruitment-status.ts` (85).

**Composants** — `src/components/recruitment/` :
- `RecruitmentWorkspace.tsx` (700) — client, filtres locaux (`useState`), 3 vues (list/kanban/planning),
  KPI, drawers ; **Desktop + Mobile dans le même arbre client** (branche `isMobile` — les sous-vues
  sont importées statiquement : ce n'est **pas** de l'adaptive server-split → dette à traiter Lot 8).
- `RecruitmentListView.tsx` (375) · `RecruitmentKanbanView.tsx` (209) · `RecruitmentPlanningView.tsx` (499).
- `CandidateDrawer.tsx` (346) · `CandidateProfileEditor.tsx` (1061) · `CandidateReferenceProfile.tsx` (490) ·
  `HiringProcessStepper.tsx` (320) · `NewCandidateDrawer.tsx` (666).
- `dashboard/RecruitmentDesktopDashboard.tsx` (485) · `dashboard/RecruitmentMobileDashboard.tsx` (194)
  — **non référencés hors d'eux-mêmes → orphelins probables (vérifier au Lot 9/15).**

**Lib** — `src/lib/recruitment/recruitment-stages.ts` : `HIRING_KANBAN_STAGES` (process) +
`RECRUITMENT_STAGES` (positionnement) + helpers de mapping. **KEEP.**

**Dépendances ailleurs :**
- `src/lib/navigation/main-menu.config.ts` : module « Recrutement » (`/recruitment`, pas de tabs) +
  `getMobileTabsForPath()` groupe `/missions/opps` + `/recruitment`.
- `revalidatePath("/recruitment")` dans plusieurs actions (recrutement + staffing).
- `openReportGeneration({ origin: "recruitment" })` (génération de rapports).
- `StaffingDrawer` / `use-staffing-drawer-store` — partagé avec `/missions/opps`.
- `ContextualCommunicationButton` — partagé (communication).
- `src/features/hiring-intensity/` — feature France Travail, **indépendante** du workspace recrutement
  (à ne pas confondre ; hors périmètre sauf découverte contraire).

### 18.2 Classement des capacités

| Capacité | Traitement | Lot |
|---|---|---|
| `recruitment-stages.ts` (vocabulaires + helpers) | **KEEP** | — |
| Server actions `_actions/*` | **REFACTOR** (réutilisées, éventuellement déplacées) | 8-9 |
| Loader `get-recruitment-workspace.ts` (opportunity-centric) | **REFACTOR** → nouveau loader candidate-centric | 7 |
| `RecruitmentListView` / `RecruitmentKanbanView` | **REFACTOR** (réutilisés dans le chapitre Candidats, adaptés au nouveau view-model) | 8 |
| `RecruitmentPlanningView` | **MOVE / REFACTOR** (planning recrutement → chapitre Candidats ou module) | 8-9 |
| `CandidateDrawer` / `CandidateProfileEditor` / `CandidateReferenceProfile` / `HiringProcessStepper` / `NewCandidateDrawer` | **MOVE + REUSE** | 8 |
| `RecruitmentWorkspace.tsx` (shell + filtres) | **REFACTOR** → shell candidate-centric adaptive-split | 8 |
| `dashboard/RecruitmentDesktopDashboard` / `RecruitmentMobileDashboard` | **DEPRECATE → REMOVE LATER** (orphelins à confirmer) | 9 / 15 |
| Module `main-menu` « Recrutement » + `getMobileTabsForPath` | **DEPRECATE** (Lot 14, coord. SHELL-0018) | 14 |
| Route `/recruitment` | **REMOVE AFTER PARITY** → redirect permanent `/consultants?section=candidats` | 10 |

**Rien n'est supprimé avant que la parité fonctionnelle soit prouvée (Lot 9).**

---

## 19. DECISION LOG

> IDs stables. Toute décision issue d'un audit de lot s'ajoute ici (C-11, C-12, …).

| ID | Décision | Raison | Statut |
|---|---|---|---|
| **C-01** | « Équipe » devient **« Consultants »** — domaine métier unique ressources internes + candidates. | Même party model, mêmes référentiels, silos artificiels. | Actée (Lot 0) |
| **C-02** | **Recruitment est absorbé** dans le chapitre **Candidats** de Consultants. | Un candidat et un intercontrat sont deux facettes du même sujet de staffing. | Actée (Lot 0) |
| **C-03** | **`/consultants` reste la route canonique.** `/recruitment` → redirect permanent `/consultants?section=candidats` (Lot 10, après parité). | Continuité des liens, une seule surface. | Actée (Lot 0) |
| **C-04** | **`SectionRail` V2 (SHELL-0018) est le standard Desktop** du workspace. Pas de nouveau châssis. | Standard stabilisé, largeur 184px, chapeau navy, header = chapitre actif. | Actée (Lot 0) |
| **C-05** | **Navigation URL-driven** via `?section=` : `synthese` (racine) · `collaborateurs` · `activite-conges` · `candidats` · `pool-competences`. | Homogène avec Veille/Reports/Automations/Prospection/Finance. Deep-link, refresh, back/forward. | Actée (Lot 0), contrat révisable si conflit code réel |
| **C-06** | Le **recrutement futur est candidate-centric** : le loader part de `candidates`, pas de `opportunity_candidates`. | Le vivier complet doit être visible même sans positionnement actif. | Actée (Lot 0) |
| **C-07** | **Process de recrutement ≠ lifecycle candidat ≠ positionnement commercial** : trois vocabulaires distincts (`candidate_hiring_processes.current_step` / `candidates.status` / `opportunity_candidates.status`). L'édition inline écrit dans le bon modèle via les actions existantes. | Éviter les mappings implicites destructeurs. | Actée (Lot 0) |
| **C-08** | Le module **Production & Congés ne déduit jamais un planning journalier depuis des agrégats mensuels**. Le planning jour par jour de production nécessite un modèle Data dédié (lot 11). | Pas de faux calendrier. | Actée (Lot 0) |
| **C-09** | Le module **Matching profil réutilise le moteur unique existant** (`src/lib/staffing-matching/`). Aucun second moteur. | Un seul moteur déterministe, une seule vérité `match_scores`. | Actée (Lot 0) |
| **C-10** | L'**intégration au menu principal `CRM`** est **reportée à SHELL-0018 Phase 6** (Lot 6.2). Traitée au Lot 14 de ce chantier, jamais en avance de phase. | Séparer refactor technique (rail) et décision produit (taxonomie du menu principal). | Actée (Lot 0) |
| **C-11** | Emplacement du code : **feature verticale `src/features/consultants/`** (convention KREDO récente), migration progressive sans big-bang. | Cohérence avec `business-intelligence`, `knowledge-hub`, etc. | Actée (Lot 0) |
| **C-12** | Les **Server Actions recrutement existantes sont réutilisées / refactorées**, jamais dupliquées. | Une seule implémentation des mutations candidat/process/positionnement. | Actée (Lot 0) |
| **C-13** | Le **contrat Mobile `getMobileTabsForPath()`** (groupe `/missions/opps` + `/recruitment`) est une dépendance protégée jusqu'à la migration Mobile explicite (Lots 9-10). | Règle SHELL-0018 D2-10 : Mobile protégé. | Actée (Lot 0) |
| **C-14** | **Lot 1 — internalisation progressive** : seuls `synthese` et `collaborateurs` sont rendus dans le shell via `?section=` ; `activite-conges` / `candidats` / `pool-competences` restent des **liens directs** vers leur route existante (`external: true`) jusqu'à leur lot d'internalisation (5 / 8 / 6). | Les pages existantes portent leur propre `<h1>` (double-titre en slot) ; l'internalisation prématurée est le périmètre des Lots 5-8. Le socle de navigation est livrable sans réécriture métier. | Actée (Lot 1) |
| **C-15** | **`SectionNavBarSlot` descendu** de `consultants/layout.tsx` vers `consultants/(tabbed)/layout.tsx` (patron `missions`). `main-menu.config.ts` et le Mobile restent intacts. | Éviter le doublon rail vertical + barre horizontale sur `/consultants` sans casser les sous-routes historiques ni le Mobile. Suppression globale de `SectionNavBar*` = SHELL-0018 Phase 6. | Actée (Lot 1) |

---

## 20. OPEN QUESTIONS

> Une question ouverte n'empêche pas de cadrer les lots qui n'en dépendent pas.
> Résolution attendue : colonne « Lot cible ».

### DATA

| ID | Question | Lot cible |
|---|---|---|
| **DATA-1** | Source d'autorité de « l'effectif collaborateur actif » : `collaborators.status` (`sorti`) vs `exit_date` vs présence d'une mission active ? Liste des statuts « sortis » à exclure ? | 2 |
| **DATA-2** | Quelle relation devient la **source canonique de la Practice** partagée collaborateurs + candidats (`collaborators.practice` texte libre vs `candidates.practice_id` FK vs résolution par `job_profile_id`) ? Sans créer de nouvelle taxonomie. | 2 (norm. → 2.x) |
| **DATA-3** | Quelle table constitue la **preuve canonique d'un positionnement actif d'un collaborateur sur une mission** ? (`match_scores` = matching potentiel, PAS positionnement.) Si impossible de façon fiable : proposer une vue relationnelle, ne rien inventer. | 2 |
| **DATA-4** | Définition exacte de « candidat qualifié durant l'année en cours » : `candidate_hiring_milestones` (`step=prequalification`, `result=valide`, `completed_at` YTD) ? Mécanisme de fallback/backfill pour les candidats anciens sans ce milestone ? | 7 (backfill → 7.x) |
| **DATA-5** | Le **planning journalier de production** n'existe pas en base (agrégats mensuels seulement). Modèle relationnel minimal à créer (table dédiée vs dérivation calendaire) ? | 11 |
| **DATA-6** | `candidates.availability` est un **texte libre** (~20 formes). Faut-il une normalisation / un mapping vers `available_from` pour le tri et le filtrage du tableau Candidats ? | 7 |
| **DATA-7** | Salaire annuel / CJM en intercontrat : `collaborator_compensation` est en **RLS confidentielle owner/admin**. Comment le tableau intercontrat se comporte-t-il pour un rôle non habilité (masquage colonne vs page entière réservée) ? | 2 |

### PRODUCT

| ID | Question | Lot cible |
|---|---|---|
| **PRODUCT-1** | Intention du module **Matching profil** : `Profil → besoins` et/ou `Besoin → profils` ? (Moteur actuel = besoin-centrique.) | 13 (décision avant impl.) |
| **PRODUCT-2** | « **Prochaine action** » pour un candidat sans opportunité active : ne l'afficher que pour les positionnés / la dériver du dernier milestone / introduire un porteur dédié ? Aucune colonne arbitraire avant tranchage. | 7 |
| **PRODUCT-3** | Valeurs métier exactes du sélecteur **lifecycle candidat** en UI (`Vivier actif`, `NoGo`, `Ne plus contacter`, `Indisponible`, `Recruté`…) et mapping vers `candidates.status` (`VALID_STATUSES`). | 7-8 |
| **PRODUCT-4** | La Synthèse Mobile et le module Production & Congés partagent-ils une vue « planning » ? Périmètre de chevauchement à trancher. | 3 / 12 |

### NAVIGATION

| ID | Question | Lot cible |
|---|---|---|
| ~~**NAV-1**~~ | ✅ **RÉSOLU (Lot 1)** — `?section=` confirmé comme contrat (patron Engagements `?vue=` transposé, aucun conflit dans le code réel). | 1 |
| **NAV-2** | Redirections des routes historiques `/consultants/activite-conges` et `/consultants/pool-competences` : `redirect` serveur permanent vs temporaire, quand supprimer ? | 5-6 / 15 |
| **NAV-3** | `/recruitment` : à quel moment exact la redirection permanente est-elle posée (parité prouvée Lot 9) et quand le module `main-menu` « Recrutement » disparaît-il (Lot 14, coord. SHELL-0018 Phase 6) ? | 10 / 14 |
| **NAV-4** | Le module Consultants doit-il rejoindre le groupe `CRM` ou rester `Ressources` dans la taxonomie du menu principal SHELL-0018 Phase 6 ? | 14 |

### LEGACY

| ID | Question | Lot cible |
|---|---|---|
| ~~**LEGACY-1**~~ | ✅ **RÉSOLU (Lot 1)** — retrait local livré : `SectionNavBarSlot` descendu dans `(tabbed)/layout.tsx` (C-15). Suppression globale de `SectionNavBarSlot`/`SectionNavBar` + nettoyage `main-menu.config` = SHELL-0018 Phase 6 (Lot 14 en coordination). | 1 / 14 |
| **LEGACY-2** | `dashboard/RecruitmentDesktopDashboard.tsx` + `RecruitmentMobileDashboard.tsx` : confirmer qu'ils sont morts (aucun import externe constaté) et les supprimer. | 9 / 15 |
| **LEGACY-3** | `src/app/(app)/consultants/(tabbed)/layout.tsx` (passthrough neutre) : à supprimer une fois les deux sous-routes migrées. | 15 |
| **LEGACY-4** | `ConsultantsSyntheseDesktop` calcule « en mission » depuis `missions.status`, pas `collaborators.status` — divergence à réconcilier avec DATA-1. | 2 |

---

## 21. INVENTAIRE DE L'EXISTANT — matrice

Traitements : `KEEP` · `MOVE` · `REUSE` · `REFACTOR` · `DEPRECATE` · `REMOVE AFTER PARITY` · `NEW`.

| Capacité | Existant | Source | Cible | Traitement |
|---|---|---|---|---|
| Consultants — Synthèse actuelle (= tableau collaborateurs racine) | oui | `src/app/(app)/consultants/page.tsx`, `components/consultants/synthese/ConsultantsSynthese{Desktop,Mobile}.tsx` | Chapitre **Collaborateurs** | MOVE + REUSE |
| Consultants — nouvelle Synthèse (KPI + graphiques + tableaux courts) | non | — | Chapitre **Synthèse** (racine) | NEW |
| Drawer profil collaborateur | oui | `components/consultants/ConsultantDrawer.tsx` | Chapitres Collaborateurs / Synthèse | REUSE |
| Activité & congés | oui | `src/app/(app)/consultants/(tabbed)/activite-conges/page.tsx`, `components/consultants/activite-conges/ConsultantsActivityDashboard.tsx` | Chapitre **Activités & congés** (`?section=activite-conges`) | MOVE + REUSE |
| Pool de compétences | oui | `src/app/(app)/consultants/(tabbed)/pool-competences/page.tsx`, `components/consultants/pool-competences/*`, `lib/consultants/pool-competences-data.ts` | Chapitre **Pool de compétences** (`?section=pool-competences`) | MOVE + REUSE |
| Recruitment workspace (shell + filtres + 3 vues) | oui | `components/recruitment/RecruitmentWorkspace.tsx` | Chapitre **Candidats** (shell candidate-centric, adaptive-split) | REFACTOR |
| Loader recrutement | oui | `src/app/(app)/recruitment/_data/get-recruitment-workspace.ts` | `src/features/consultants/data/` (candidate-centric) | REFACTOR |
| Recruitment list view | oui | `components/recruitment/RecruitmentListView.tsx` | Chapitre Candidats — vue liste Desktop | REFACTOR |
| Recruitment kanban view | oui | `components/recruitment/RecruitmentKanbanView.tsx` | Chapitre Candidats — vue process | REFACTOR |
| Recruitment planning view | oui | `components/recruitment/RecruitmentPlanningView.tsx` | Chapitre Candidats ou module | MOVE + REFACTOR |
| Candidate drawer / profile editor / reference profile / hiring stepper / new candidate drawer | oui | `components/recruitment/{CandidateDrawer,CandidateProfileEditor,CandidateReferenceProfile,HiringProcessStepper,NewCandidateDrawer}.tsx` | `src/features/consultants/candidates/` | MOVE + REUSE |
| Server actions candidat / process / positionnement | oui | `src/app/(app)/recruitment/_actions/*` | `src/features/consultants/candidates/actions/` | REFACTOR (jamais dupliquer) |
| Hiring process (data) | oui | `candidate_hiring_processes`, `candidate_hiring_milestones` | inchangé | KEEP |
| Positionnements | oui | `opportunity_candidates` | inchangé | KEEP |
| Vocabulaires recrutement | oui | `src/lib/recruitment/recruitment-stages.ts` | inchangé | KEEP |
| Matching (moteur) | oui | `src/lib/staffing-matching/*` | module **Matching profil** (UI seulement) | KEEP + REUSE |
| Production / activity (agrégats) | oui | `mission_activity_reports`, `v_collaborator_activity_summary`, `v_collaborator_ytd_activity` | module **Production & Congés** | REUSE |
| Absences | oui | `collaborator_absences` | module **Production & Congés** | REUSE |
| Planning journalier de production | **non** | — | module **Production & Congés** | NEW (Data, Lot 11) |
| Recruitment dashboard (desktop/mobile) | oui, orphelin | `components/recruitment/dashboard/*` | — | DEPRECATE → REMOVE AFTER PARITY |
| Rail horizontal legacy Consultants | oui | `src/app/(app)/consultants/layout.tsx` + `SectionNavBarSlot` | supprimé (rail V2) | REMOVE AFTER PARITY (Lot 1 local / Lot 14 global) |
| Route `/recruitment` | oui | `src/app/(app)/recruitment/` | redirect `/consultants?section=candidats` | REMOVE AFTER PARITY |
| Module `main-menu` « Recrutement » + « Équipe » tabs | oui | `src/lib/navigation/main-menu.config.ts` | module unique « Consultants » sous CRM | REFACTOR (Lot 14) |
| Mobile grouping `/missions/opps` + `/recruitment` | oui | `getMobileTabsForPath()` | à réviser | REFACTOR (Lot 14, protégé avant) |

---

## 22. Découpage en lots

> Roadmap normative. Ajustable **uniquement** si l'audit réel révèle une dépendance forte —
> tout ajustement est inscrit au ledger avec sa justification.

| Lot | Objet | Type | Dépend de |
|---|---|---|---|
| **0** | Cadrage documentaire (ce lot) | doc | — |
| **1** | Socle Consultants Workspace (rail V2, `?section=`, header, 5 chapitres) | code Front | 0 |
| **2** | Data Contract Synthèse (KPI, practice, fins de mission, intercontrats, pipeline recrutement) | code Data/Front | 1 |
| **2.x** | (conditionnel) Migration DB de normalisation Practice / vue positionnements | code Data | 2 |
| **3** | Synthèse Desktop + Mobile | code Front | 2 |
| **4** | Migration Collaborateurs (`?section=collaborateurs`) | code Front | 1 |
| **5** | Migration Activités & congés (`?section=activite-conges`) | code Front | 1 |
| **6** | Migration Pool de compétences (`?section=pool-competences`) | code Front | 1 |
| **7** | Data Contract Candidats (candidate-centric) | code Data/Front | 1 |
| **7.x** | (conditionnel) Backfill/fallback qualification candidats | code Data | 7 |
| **8** | Page Candidats (Desktop + Mobile, inline edit, prochaine action, détail) | code Front | 7 |
| **9** | Absorption fonctionnelle Recruitment (audit de parité) | code Front | 8 |
| **10** | Dépréciation `/recruitment` (redirect permanent) | code Front | 9 |
| **11** | Module Production & Congés — Data | code Data | 4 |
| **12** | Module Production & Congés — UI (Desktop + Mobile) | code Front | 11 |
| **13** | Module Matching profil (UI vers moteur existant) | code Front | 1 |
| **14** | Intégration Shell global / CRM | code Front | SHELL-0018 Phase 6 |
| **15** | Nettoyage et clôture | code + doc | 10, 12, 13, 14 |

---

## 23. Fiches de lot

> Chaque lot est **autonome** : un agent recevant « Exécute le Lot X du Consultants Workspace »
> trouve tout le reste dans le dépôt (ce document + le ledger + le code réel).

### Lot 0 — Cadrage documentaire

- **Objectif** : créer le dossier canonique, le document de référence, le ledger, l'inventaire code/data, la roadmap, les décisions, les questions ouvertes.
- **Prérequis** : lecture `CLAUDE.md`, `AGENTS.md`, `docs/navigation_architecture/SHELL-0018/*`.
- **Data / Desktop / Mobile** : aucun code.
- **Fichiers** : `docs/FEATURES/consultants_workspace/{README.md,00-REFERENCE-CHANTIER-CONSULTANTS.md,01-IMPLEMENTATION-LEDGER.md}`.
- **Hors périmètre** : toute modification applicative, migration, n8n, route, menu.
- **Critères d'acceptation** : les 3 fichiers existent ; liens internes cohérents ; lots 0→15 sans trou ; DECISION LOG C-01→C-13 ; OPEN QUESTIONS classées ; inventaire couvrant les capacités listées § 32 du prompt ; `NEXT LOT = Lot 1`.
- **Gates** : `git diff --check` ; relecture manuelle (numérotation, liens, cohérence main-only, absence de règle QA navigateur).
- **Documentation à mettre à jour** : n/a (création).
- **Conditions de sortie** : commit `docs(consultants): bootstrap Consultants Workspace roadmap` poussé sur `main`.
- **Lot suivant** : Lot 1.

### Lot 1 — Socle Consultants Workspace — ✅ techniquement livré (2026-09-08)

**Réalisé.** Détail d'exécution dans le ledger `01-IMPLEMENTATION-LEDGER.md` § « Lot 1 ».

- **Objectif** : créer le nouveau shell `/consultants` conforme SHELL-0018 : `SectionRail` V2 inline, navigation URL-driven `?section=`, chapeau navy `Consultants`, header = chapitre actif, 5 chapitres, `contextualModules: undefined`.
- **Livré** :
  - `src/features/consultants/navigation/consultants-sections.ts` — `ConsultantsSection`, `CONSULTANTS_SECTIONS` (5 chapitres, ordre canonique), `HEADER_TITLE_BY_SECTION`, `parseConsultantsSection`, `buildConsultantsSectionHref`, `CONSULTANTS_IN_SHELL_SECTIONS`.
  - `src/features/consultants/navigation/consultants-icons.tsx` — 5 icônes Heroicons v2 outline (patron `engagement-icons`).
  - `src/features/consultants/desktop/ConsultantsDesktopShell.tsx` — `SectionRail` inline (patron `EngagementsDesktopView`), `useSidebarCollapse`, header = chapitre actif, aucun module.
  - `src/features/consultants/mobile/ConsultantsMobileShell.tsx` — coquille minimale (couture serveur, pas de nav ajoutée).
  - `src/features/consultants/data/get-consultants-team.ts` — loader `collaborators` + `missions` extrait de `page.tsx`, aucun filtre (DATA-1 reste au Lot 2).
  - `src/app/(app)/consultants/page.tsx` — orchestrateur : `getDashboardDevice()` + `parseConsultantsSection(?section)` → shell + contenu de section.
  - `src/app/(app)/consultants/layout.tsx` — `SectionNavBarSlot` retiré.
  - `src/app/(app)/consultants/(tabbed)/layout.tsx` — `SectionNavBarSlot` ajouté (descendu ici, patron `missions`).
  - `src/features/consultants/navigation/consultants-sections.test.ts` — 18 tests (parse/build, contrat des 5 chapitres, rendu shell SHELL-0018, invariants de code).
- **Décision de périmètre (C-14)** : seuls `synthese` et `collaborateurs` sont rendus dans le shell via `?section=` ; `activite-conges`, `candidats`, `pool-competences` restent des **liens directs** vers leur route existante (`external: true` dans `CONSULTANTS_SECTIONS`), internalisés à leur lot (5, 8, 6). Motif : les pages existantes portent leur propre `<h1>` (double-titre en slot) et l'internalisation prématurée est exactement le périmètre des Lots 5-8.
- **Décision legacy (C-15)** : `SectionNavBarSlot` descendu de `layout.tsx` vers `(tabbed)/layout.tsx` (patron `missions`). `main-menu.config.ts` **intact**, Mobile **intact** (`getMobileTabsForPath` non modifié). La suppression globale de `SectionNavBar*` reste SHELL-0018 Phase 6.
- **Transitoire assumé** : `synthese` et `collaborateurs` rendent la même vue jusqu'aux Lots 3 (nouvelle Synthèse) + 4 (foyer canonique du tableau) ; dual-paradigme desktop `/consultants` (rail vertical) vs `/consultants/activite-conges` (barre horizontale legacy) — identique à la dette `missions/(tabbed)`, résorbé Lots 5-6.
- **OPEN QUESTIONS résolues** : NAV-1 (contrat `?section=` confirmé, patron Engagements `?vue=` transposé) ; LEGACY-1 (retrait local livré ; global = SHELL-0018 Phase 6).
- **Gates exécutées** : `typecheck` ✅ · `npm test` **complet** ✅ (257 fichiers / 2605 tests) · `check:server-boundary` ✅ · `eslint` fichiers touchés ✅ · `build` ✅. QA visuelle : réservée à Guillaume.
- **NEXT LOT** : Lot 2 — Data Contract Synthèse.

### Lot 2 — Data Contract Synthèse

- **Objectif** : un loader / view-model **unique** server-only pour la Synthèse : 3 KPI, répartition par practice (collaborateurs/candidats), 5 prochaines fins de mission, collaborateurs en intercontrat, pipeline recrutement par étape.
- **Prérequis** : Lot 1. Résoudre DATA-1, DATA-2, DATA-3, DATA-7 (ou les maintenir OPEN avec un comportement défini — jamais un chiffre faux).
- **Data** : `collaborators`, `missions`, `companies`, `persons`, `candidates`, `candidate_hiring_processes`, `job_profiles`, `collaborator_compensation` (RLS admin — serveur uniquement), `v_collaborator_*`. Toute migration réellement nécessaire → sous-lot `2.x` isolé (une migration = un fichier, alignée sur le timestamp réellement enregistré, `db:types`, mise à jour de `CLAUDE.md`).
- **Desktop / Mobile** : aucun rendu — view-model typé + tests unitaires du view-model.
- **Fichiers probables** : `src/features/consultants/data/*.ts`, `__tests__/*`.
- **Hors périmètre** : UI (Lot 3).
- **Critères d'acceptation** : view-model typé, testé ; chaque ambiguïté Data soit résolue et documentée, soit marquée OPEN avec fallback explicite ; aucune valeur inventée pour DATA-3.
- **Gates** : `typecheck` → `test` (ciblé) → `check:server-boundary` → `eslint` → `build`. `+ test:n8n` seulement si un `n8n/workflows/*` est touché (ne devrait pas).
- **Documentation** : DECISION LOG (C-14+ : contrat de statut, source Practice, source positionnement) ; § 7-10 de ce document mis à jour ; OPEN QUESTIONS DATA rebasculées.
- **Conditions de sortie** : gates vertes, commit poussé, `NEXT LOT = Lot 3`.

### Lot 3 — Synthèse Desktop + Mobile

- **Objectif** : construire la page Synthèse.
- **Prérequis** : Lot 2.
- **Data** : consomme le view-model du Lot 2, aucune requête nouvelle.
- **Desktop** : KPI (3 cartes) · Graphique 1 practice (SVG maison + sélecteur Collaborateurs/Candidats) · Graphique 2 recrutement par étape (SVG maison) · tableau 5 prochaines fins de mission · tableau intercontrats (`DataTable<T>` maison).
- **Mobile** : 3 KPI · prochaines fins de mission (cards) · intercontrats (cards) · synthèse pipeline recrutement · actions rapides. Barres HTML+Tailwind, zéro librairie.
- **Fichiers probables** : `src/features/consultants/desktop/synthese/*`, `src/features/consultants/mobile/synthese/*`.
- **Hors périmètre** : autres chapitres.
- **Critères d'acceptation** : les deux branches rendues côté serveur (pas de CSS `hidden`) ; aucune bibliothèque graphique ; pas de HEX en dur ; header = `Synthèse`.
- **Gates** : suite complète (`typecheck` → `test` → `check:server-boundary` → `eslint` → `build`).
- **Documentation** : ledger ; § 5 (Mobile) affiné.
- **Conditions de sortie** : gates vertes, commit poussé, `NEXT LOT = Lot 4`.

### Lot 4 — Migration Collaborateurs

- **État après Lot 1** : `?section=collaborateurs` existe déjà et rend le tableau actuel (`ConsultantsSyntheseDesktop`, loader `get-consultants-team.ts`) — **identique à `synthese`**. Lot 4 = en faire le foyer canonique (contenu propre, header "Collaborateurs"), retirer la duplication avec `synthese` une fois le Lot 3 livré, brancher le contrat de statut du Lot 2.
- **Objectif** : déplacer / réutiliser le tableau collaborateurs existant vers `?section=collaborateurs`, capacités préservées (drawer profil, tri, filtres, colonnes).
- **Prérequis** : Lot 1 (Lot 3 recommandé pour cohérence visuelle).
- **Data** : loader `collaborators` + `missions` existant — extrait vers `src/features/consultants/data/`, aligné sur le contrat de statut du Lot 2.
- **Desktop** : `ConsultantsSyntheseDesktop` réutilisé / renommé `CollaboratorsDesktop`.
- **Mobile** : `ConsultantsSyntheseMobile` réutilisé.
- **Fichiers probables** : `src/features/consultants/collaborators/**`, `src/components/consultants/synthese/*` (déplacés).
- **Hors périmètre** : réécriture métier, module Production & Congés.
- **Critères d'acceptation** : parité fonctionnelle avec l'actuelle Synthèse racine ; drawer profil OK ; header = `Collaborateurs`.
- **Gates** : suite ciblée + `build`.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 5`.

### Lot 5 — Migration Activités & congés

- **État après Lot 1** : le chapitre `activite-conges` est un **lien direct** (`external: true`) vers `/consultants/activite-conges`, qui garde sa barre horizontale via `(tabbed)/layout.tsx`. Lot 5 = passer `external: false`, contrat `?section=activite-conges`, extraire le loader, traiter le `<header>` interne du composant (double-titre), rediriger la route legacy.
- **Objectif** : absorber `src/app/(app)/consultants/(tabbed)/activite-conges/` dans `?section=activite-conges`, contenu fonctionnel conservé.
- **Prérequis** : Lot 1.
- **Data** : extraire le loader inline (6 lectures) vers `src/features/consultants/data/`.
- **Desktop / Mobile** : `ConsultantsActivityDashboard` réutilisé — **retirer son `<header>`/`<h1>` interne** (le shell fournit le header). Auditer le besoin d'une vraie branche Mobile (aujourd'hui pas de `getDashboardDevice()` sur cette page).
- **Navigation** : redirection `/consultants/activite-conges` → `/consultants?section=activite-conges` (NAV-2).
- **Fichiers probables** : `src/features/consultants/activity/**`, `src/app/(app)/consultants/(tabbed)/activite-conges/page.tsx` (→ redirect ou suppression différée Lot 15).
- **Hors périmètre** : recalcul métier, module Production & Congés.
- **Critères d'acceptation** : parité ; ancien chemin redirige ; header = `Activités & congés`.
- **Gates** : suite ciblée + `build`.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 6`.

### Lot 6 — Migration Pool de compétences

- **État après Lot 1** : chapitre `pool-competences` = **lien direct** (`external: true`) vers `/consultants/pool-competences` (barre horizontale conservée). Lot 6 = `external: false`, contrat `?section=`, loader extrait, `<header>`/`<h1>` interne de `PoolCompetencesMap` retiré, route legacy redirigée.
- **Objectif** : absorber `.../pool-competences/` dans `?section=pool-competences` sans refonte métier.
- **Prérequis** : Lot 1.
- **Data** : loader inline (référentiels cachés + `person_skills` + `opportunity_skills`) extrait ; `buildPoolCompetencesDataset` inchangé.
- **Desktop / Mobile** : `PoolCompetencesMap` + composants réutilisés (retirer le `<header>` interne).
- **Navigation** : redirection `/consultants/pool-competences` → `?section=pool-competences`.
- **Fichiers probables** : `src/features/consultants/skills/**`, composants déplacés.
- **Critères d'acceptation** : parité ; ancien chemin redirige ; header = `Pool de compétences`.
- **Gates** : suite ciblée + `build`.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 7`.

### Lot 7 — Data Contract Candidats

- **Objectif** : transformer le modèle de lecture d'**opportunity-centric** à **candidate-centric**.
- **Prérequis** : Lot 1. Résoudre DATA-4, DATA-6, PRODUCT-2, PRODUCT-3 (ou OPEN + comportement défini).
- **Data** : loader partant de `candidates`, enrichi de `persons`, `job_profiles`/`practice_id`, `candidate_hiring_processes`, `candidate_hiring_milestones`, `opportunity_candidates`, `opportunities`, `calendar_events`. Définir : population du vivier · qualification YTD · status/process · prochaine action · disponibilité · practice · profil. Backfill éventuel → sous-lot `7.x`.
- **Desktop / Mobile** : aucun rendu majeur — view-model typé + tests.
- **Fichiers probables** : `src/features/consultants/candidates/data/*`, `__tests__/*`.
- **Hors périmètre** : UI (Lot 8).
- **Critères d'acceptation** : le view-model liste le vivier complet pertinent (candidats sans positionnement inclus) ; définitions figées et documentées ; aucune colonne DB arbitraire.
- **Gates** : `typecheck` → `test` (ciblé) → `check:server-boundary` → `eslint` → `build`.
- **Documentation** : DECISION LOG ; § 14-15 mis à jour.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 8`.

### Lot 8 — Page Candidats

- **État après Lot 1** : chapitre `candidats` = **lien direct** (`external: true`) vers `/recruitment` (module inchangé). Lot 8 = `external: false`, contrat `?section=candidats`, rendu in-shell candidate-centric (view-model Lot 7).
- **Objectif** : construire le chapitre Candidats — tableau Desktop, cartes Mobile, filtres, édition inline process/statut, prochaine action, ouverture détail candidat.
- **Prérequis** : Lot 7.
- **Data** : view-model du Lot 7.
- **Desktop** : `DataTable<T>` maison, colonnes § 14.3, sélecteur inline § 14.4 (écrit via `update-hiring-step` / `update-candidate-status` / `update-recruitment-status`), drawers réutilisés (`CandidateDrawer`, `CandidateProfileEditor`, `NewCandidateDrawer`, `HiringProcessStepper`).
- **Mobile** : cartes orientées action, touch targets ≥ 44px, jamais de `DataTable`.
- **Adaptive** : distribution serveur (`getDashboardDevice()`) — corriger la dette « Desktop+Mobile dans un même arbre client » de `RecruitmentWorkspace`.
- **Fichiers probables** : `src/features/consultants/candidates/**`, composants recrutement déplacés.
- **Hors périmètre** : suppression de `/recruitment` (Lot 10), kanban/planning legacy si non requis en parité (Lot 9).
- **Critères d'acceptation** : vivier complet visible ; édition inline écrit dans le bon modèle ; détail candidat ouvre ; header = `Candidats` ; branches Desktop/Mobile serveur.
- **Gates** : suite complète.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 9`.

### Lot 9 — Absorption fonctionnelle Recruitment

- **Objectif** : auditer la parité entre `/recruitment` et le chapitre Candidats — création candidat, édition, process, planning, kanban, positionnements, prochaine action, génération de rapports, autres fonctions réellement utilisées. Déplacer/reformater ce qui doit survivre.
- **Prérequis** : Lot 8.
- **Data** : réutilise Lot 7.
- **Desktop / Mobile** : compléter les vues manquantes (kanban process, planning recrutement) si elles sont utilisées.
- **Fichiers probables** : `src/features/consultants/candidates/**`, `src/app/(app)/recruitment/**` (audit, pas suppression).
- **Hors périmètre** : suppression du legacy (Lot 10 + 15).
- **Critères d'acceptation** : **rapport de parité** dans le ledger listant chaque capacité `/recruitment` et son équivalent Consultants ; aucune capacité réellement utilisée perdue ; confirmer LEGACY-2 (dashboards orphelins).
- **Gates** : suite complète.
- **Conditions de sortie** : rapport de parité au ledger, commit poussé, `NEXT LOT = Lot 10`.

### Lot 10 — Dépréciation `/recruitment`

- **Objectif** : `/recruitment` → **redirect permanent** vers `/consultants?section=candidats` ; début du nettoyage du code devenu réellement mort.
- **Prérequis** : Lot 9 (parité prouvée).
- **Data** : n/a.
- **Navigation** : `src/app/(app)/recruitment/page.tsx` → `permanentRedirect("/consultants?section=candidats")` (patron identique à `src/app/(app)/prospection/page.tsx`). `getMobileTabsForPath()` : adapter le groupement (coord. C-13 / Lot 14).
- **Fichiers probables** : `src/app/(app)/recruitment/page.tsx`, `src/lib/navigation/main-menu.config.ts` (Mobile), composants morts.
- **Hors périmètre** : retrait du module `main-menu` « Recrutement » (Lot 14).
- **Critères d'acceptation** : `/recruitment` redirige ; aucun lien interne cassé (`revalidatePath("/recruitment")` nettoyés ou conservés selon usage) ; Mobile non régressé.
- **Gates** : suite complète + `main-menu.config.test.ts`.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 11`.

### Lot 11 — Module Production & Congés / Data

- **Objectif** : auditer les sources d'activité/absences ; si nécessaire, créer le **modèle journalier minimal** distinguant production / congés / absences jour par jour. **Aucun calcul fictif** (C-08).
- **Prérequis** : Lot 4. Résoudre DATA-5.
- **Data** : `mission_activity_reports`, `collaborator_absences`, `v_collaborator_*`, `client_closures`, `missions`. Migration éventuelle → fichier dédié, `db:types`, `CLAUDE.md`.
- **Desktop / Mobile** : aucun rendu — view-model + tests.
- **Critères d'acceptation** : gap agrégat/journalier documenté ; modèle proposé et (si retenu) migré ; view-model testé.
- **Gates** : `typecheck` → `test` → `check:server-boundary` → `eslint` → `build`.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 12`.

### Lot 12 — Module Production & Congés / UI

- **Objectif** : Desktop = vue analytique / planning dense ; Mobile = synthèse / action. Déclarer le module dans `contextualModules` du rail (il devient réellement disponible).
- **Prérequis** : Lot 11.
- **Data** : view-model du Lot 11.
- **Desktop / Mobile** : SVG maison / HTML+Tailwind. Branches serveur.
- **Critères d'acceptation** : module rendu dans le rail `Modules` (bas, `mt-auto`) uniquement quand disponible ; pas de bouton mort ailleurs ; header cohérent.
- **Gates** : suite complète.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 13`.

### Lot 13 — Module Matching profil

- **Objectif** : exposer une UI de matching profils ↔ besoins réutilisant le moteur unique. **Aucun second moteur** (C-09).
- **Prérequis** : Lot 1. Résoudre PRODUCT-1 (décision produit enregistrée avant impl.).
- **Data** : `match_scores`, `runOpportunityMatching`, `use-opportunity-matching`, `person_skills`, `opportunity_skills`, `opportunities`.
- **Desktop / Mobile** : point d'entrée contextualisé (dialog / composer), réutilise `MatchingDialog` / `MatchingComposer` si pertinent.
- **Critères d'acceptation** : le module appelle le moteur existant ; module déclaré dans `contextualModules` seulement une fois fonctionnel ; les deux intentions (profil→besoins / besoin→profils) tranchées et documentées.
- **Gates** : suite complète.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 14`.

### Lot 14 — Intégration Shell global / CRM

- **Objectif** : intégrer « Consultants » à la grande section `CRM` du menu principal ; supprimer l'ancien libellé « Équipe » ; retirer le `SectionNavBarSlot` historique de `/consultants` ; aligner `DesktopSidebar` / `main-menu.config` ; Mobile protégé.
- **Prérequis** : **SHELL-0018 Phase 6** (Lot 6.2 « Migration Consultants / Équipe ») — coordination obligatoire. Résoudre NAV-3, NAV-4.
- **Data** : n/a.
- **Fichiers probables** : `src/lib/navigation/main-menu.config.ts`, `src/components/layout/{DesktopSidebar,SectionNavBarSlot,SectionNavBar}.tsx`, `src/app/(app)/consultants/layout.tsx`.
- **Critères d'acceptation** : un seul module « Consultants » sous `CRM` ; « Équipe » et « Recrutement » retirés du menu ; `getMobileTabsForPath()` cohérent ; aucune régression Mobile ; tests `main-menu.config.test.ts` / `mobile-navigation-history.test.ts` verts.
- **Gates** : suite complète.
- **Conditions de sortie** : commit poussé, `NEXT LOT = Lot 15`.

### Lot 15 — Nettoyage et clôture

- **Objectif** : audit exhaustif et suppression du legacy réellement mort : routes `(tabbed)` consultants, `recruitment/**` résiduel, `components/recruitment/dashboard/*`, imports morts, anciennes navigations, duplications Data, tests obsolètes. Rapport de clôture.
- **Prérequis** : Lots 10, 12, 13, 14.
- **Critères d'acceptation** : `grep` de contrôle (`/recruitment`, `SectionNavBarSlot` sur consultants, routes `(tabbed)`) propre ; suite complète `npm test` verte ; **rapport de clôture** `docs/FEATURES/consultants_workspace/02-CLOSURE-AUDIT.md` ; ledger `Statut global : techniquement close`.
- **Gates** : suite complète `npm test` + `build`.
- **Conditions de sortie** : commit poussé, chantier clos.

---

## 24. PROTOCOLE AGENT — DÉBUT DE LOT

1. `git fetch origin`
2. Travailler **exclusivement** sur `main` (aucune branche, aucune proposition de branche).
3. Synchroniser `main` avec `origin/main` (`git merge --ff-only origin/main` ; si divergence, intégrer proprement le travail parallèle — **jamais** `reset --hard`, `force push`, rebase destructif).
4. Lire `CLAUDE.md`.
5. Lire `AGENTS.md`.
6. Lire `docs/FEATURES/consultants_workspace/README.md`.
7. Lire `docs/FEATURES/consultants_workspace/00-REFERENCE-CHANTIER-CONSULTANTS.md` (au moins la fiche du lot + le DECISION LOG + les OPEN QUESTIONS du lot).
8. Lire `docs/FEATURES/consultants_workspace/01-IMPLEMENTATION-LEDGER.md` (baseline, dernier SHA, dettes, `NEXT LOT`).
9. **Vérifier le code réel concerné** (suivre les imports, ne rien qualifier d'absent/cassé sans avoir ouvert le fichier).
10. Vérifier Supabase (`information_schema`, corps des fonctions, `list_migrations`) si le lot dépend de Data.
11. **Ne jamais supposer que le handoff documentaire est plus récent que le code.**
12. **Consigner les écarts** (doc vs code réel) dans le ledger **avant** toute modification.

---

## 25. PROTOCOLE AGENT — FIN DE LOT

1. Exécuter les gates nécessaires : `typecheck` → `test` (ciblé, +complète si pertinent et raisonnable) → `check:server-boundary` → `lint` (fichiers touchés) → `build`. `+ test:n8n` si un `n8n/workflows/*` a été touché.
2. Mettre à jour le ledger : objet, fichiers modifiés, décisions, invariants protégés, tests **réellement exécutés**, limites, dettes, statut, commits.
3. Documenter les décisions nouvelles dans le DECISION LOG (C-14, C-15, …) de ce document.
4. Documenter les dettes.
5. Indiquer **exactement** les tests exécutés — ne jamais inventer une QA, ne jamais écrire que la QA visuelle est passée.
6. `git fetch origin` avant commit/push.
7. Intégrer proprement tout travail parallèle apparu sur `origin/main`.
8. Commit sur `main` (message `docs(consultants): …` ou `feat(consultants): …` / `refactor(consultants): …`).
9. `git push origin main`.
10. Inscrire le **SHA final** et le dernier SHA connu de `origin/main` dans le ledger.
11. Renseigner `NEXT LOT`.

---

## 26. Rappels non négociables

- **Branche `main` uniquement.** Jamais de feature branch.
- **QA visuelle = Guillaume uniquement.** Les agents ne lancent jamais navigateur / Playwright / screenshots / smoke visuel. Un lot n'est jamais bloqué par l'absence de QA visuelle.
- **Vérifier à la source** (base, code, git), pas dans ce document — tout chiffre ici est un instantané.
- **Trancher et assumer**, pas un menu d'options ; ne pas pivoter en cours de lot.
- **Ne jamais charger un composant Desktop lourd puis le masquer en CSS sur Mobile.**
- **Aucune configuration de navigation en base.**
