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

### 7.1 KPI (3) — **contrats figés au Lot 2**

| KPI | Définition **figée** | Source |
|---|---|---|
| **Collaborateurs** | Effectif interne actif = `collaborators.status <> 'sorti'` (C-16). Live 2026-09-08 : **29**. | `collaborators` |
| **Vivier candidats** | `candidates.status = 'vivier'` — **définition provisoire** (C-16), arrêtée au Lot 7 (DATA-4). Une `dataNote` le signale dans le view-model. Live : **11**. | `candidates` |
| **Recrutements réalisés (année en cours)** | `candidate_hiring_processes.status = 'hired' AND closed_at` dans l'année civile courante. Live : **11**. | `candidate_hiring_processes` |

Le view-model unique est produit par `buildConsultantsSynthese` (pur, testé) et chargé par
`getConsultantsSynthese()` — voir `src/features/consultants/data/`.

### 7.2 Chiffres live constatés (2026-09-08 — indicatifs, à revérifier en base)

- `collaborators` : **30 lignes** — `en_mission` 26 · `intercontrat` 3 · `sorti` 1 ; 1 ligne avec `exit_date`.
- `candidates` : **43 lignes** — `vivier` 11 · `recrute` 11 · `en_process` 9 · `nouveau` 3 · `qualifie` 3 ·
  `indisponible` 2 · `ko_manager` 1 · `propose` 1 · `archive` 1 · `refuse` 1.
- `candidate_hiring_processes` : **34 lignes** — `hired` 11 · `active` 10 · `cancelled` 5 · `rejected` 5 · `withdrawn` 3.
- `missions` actives avec `end_date >= today` : **10**.
- `match_scores` : **644 lignes** sur 24 opportunités.

> ⚠️ `CLAUDE.md` annonce 23 collaborateurs / 38 candidats / 18 `match_scores` — **périmé**. Toujours
> recompter en base avant de s'appuyer sur un chiffre.

### 7.3 Contrat de statut collaborateur — ✅ **résolu (Lot 2, DATA-1 → C-16)**

Valeurs `collaborators.status` en base : `en_mission`, `intercontrat`, `sorti`.
**Vérifié live 2026-09-08 : `status = 'sorti'` ⟺ `exit_date IS NOT NULL`** (1 ligne, accord parfait).

**Contrat figé :** effectif actif = **`collaborators.status <> 'sorti'`**. `status` est le champ
sémantique d'autorité ; `exit_date` en est une projection cohérente. La présence d'une mission
active n'entre **pas** dans la définition de l'effectif (un intercontrat reste un actif).

LEGACY-4 (réconciliation de la vue Collaborateurs) : ✅ résolu au Lot 4 — `CollaboratorsDesktop`/`Mobile`
lisent le statut sur `collaborators.status` via `isCollaboratorStaffed`.

---

## 8. Cible fonctionnelle — Graphique 1 : répartition par Practice

- Section graphique de la Synthèse avec **sélecteur `Collaborateurs | Candidats`**.
- Répartition des personnes par **Practice de rattachement**.
- **SVG maison Desktop / barres HTML+Tailwind Mobile.** Aucune bibliothèque.

### Source canonique de la Practice — ✅ **résolu (Lot 2, DATA-2 → C-17)**

État réel du schéma (vérifié live 2026-09-08), avec **couverture** :

| Entité | Rattachement practice | Couverture |
|---|---|---|
| `collaborators` | `practice` (**text libre**, 29/29), `job_profile_id → job_profiles.practice_id` (**10/29**) | pas de `practice_id` |
| `candidates` | `practice_id` (FK `offer_practices`, **43/43**) | relationnel complet |
| `job_profiles` | `practice_id` (FK `offer_practices`, 65/65) | pivot |
| `offer_practices` | 8 lignes — **clé canonique = `slug`** | référentiel |

**Aucune source relationnelle unique ne couvre les deux populations.** Contrat figé :

- **Clé de bucket canonique = `offer_practices.slug`** (+ bucket `null` = « Autre / non rattaché »).
- **Candidats** → `candidates.practice_id` (relationnel, complet).
- **Collaborateurs** → cascade déterministe dans `build-consultants-synthese.ts` :
  1. `job_profile_id → job_profiles.practice_id → offer_practices.slug` (autoritaire) ;
  2. sinon rapprochement **exact** du texte libre sur `offer_practices.name` (normalisé sans casse/accents — 5/13 valeurs live sont verbatim) ;
  3. sinon heuristique par mots-clés (`getPracticeByName` de `src/lib/config/practices.ts`) ;
  4. sinon `null`.

**Aucune migration.** Sur les données live, seule la valeur `Mobile` (~1 collaborateur) tombe en
« Autre » ; une `dataNote` du view-model le signale. **Dette future** (hors périmètre, non
bloquante) : ajouter `collaborators.practice_id` (FK) + backfill pour supprimer l'heuristique —
candidat à un sous-lot dédié si le besoin de précision augmente.

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

### Sources — **figées au Lot 2** (view-model `InterContractCollaborator`)

| Donnée | Source figée |
|---|---|
| Identité | `collaborators.person_id → persons.full_name` |
| Intitulé profil | `collaborators.current_title` |
| Practice | cascade §8 (C-17) |
| Dernière mission | `missions` où `collaborator_id = c.id`, `end_date` max |
| Salaire annuel / CJM | `collaborator_compensation` (`effective_to IS NULL`) — **RLS owner/admin**. `grossAnnual`/`cjm` nullables ; `compensationVisible` dérivé de `profiles.role ∈ {owner, admin}` (DATA-7 → C-19). Rôle non habilité → `null` + `dataNote`. |
| Positionnements en cours | `opportunity_candidates` via `person_id` (DATA-3 → C-18, ci-dessous) |

### `DATA-3` — Preuve d'un positionnement actif — ⚠️ **partiellement résolu (Lot 2, C-18)**

- **`match_scores` n'est JAMAIS utilisé** (matching potentiel, pas positionnement).
- **Source figée** : `opportunity_candidates` dont `candidate.person_id` = `collaborator.person_id`,
  avec `opportunities.stage` non terminal (`gagne` / `perdu` / `abandonne` exclus) **et**
  `opportunity_candidates.status` non terminal (`RECRUITMENT_TERMINAL_STATUSES` réutilisé de
  `recruitment-stages.ts`).
- **Garde anti-faux-zéro** : si le collaborateur n'a **pas** de fiche `candidates` miroir (party
  model), le compte est `null` (« non traçable »), pas `0` — l'UI affiche « — ». Sur les données
  live 2026-09-08, les **3** collaborateurs en intercontrat sont dans ce cas (aucun n'est mirroré
  en candidat) → colonne « — » pour tous, `dataNote` explicite.
- **Sous-question restante** (hors périmètre) : un lien direct `opportunity ↔ collaborator`
  (ou `opportunity_candidates.person_id`) supprimerait la dépendance au party model. À trancher si
  le besoin de fiabilité augmente — pas de migration au Lot 2.

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

**Contrat figé au Lot 2** (view-model `RecruitmentPipeline`) : le graphique affiche les process
**actifs** (`status = 'active'`) répartis sur les **6 étapes canoniques** (`HIRING_KANBAN_STAGES`,
étapes à 0 incluses pour l'entonnoir), plus `totalActive`, `hiresYearToDate` et
`closedNotHiredYearToDate` (process clos `rejected`/`cancelled`/`withdrawn` sur l'année civile).
Les étapes terminales ne polluent pas l'entonnoir. Live 2026-09-08 : `tests_techniques` 3 ·
`proposition` 3 · `signature` 2 · `entretien_manager` 1 · `prequalification` 1 (= 10 actifs).

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

> ✅ **Lot 8 (C-27)** : l'édition inline de la table Candidats couvre **process** (si actif) et
> **lifecycle** — les deux dimensions dont la ligne candidate-centric porte la clé. Le
> **positionnement commercial** reste édité dans le drawer (dette **CAND-4**), la ligne
> n'agrégeant pas d'`opportunity_candidates.id`. Les 5 actions ci-dessus portent désormais
> aussi `revalidatePath("/consultants")`.

### 14.5 « Prochaine action » (`OPEN QUESTION PRODUCT-2`)

`opportunity_candidates.next_action` (text) n'existe que s'il y a un positionnement. Pour un
candidat du vivier sans opportunité active, il n'y a **pas de porteur** de cette information.
Le Lot 7 doit trancher : (a) n'afficher « Prochaine action » que pour les candidats positionnés ;
(b) dériver une action depuis le dernier milestone ; (c) introduire un porteur dédié (migration,
dette Data). **Ne créer aucune colonne arbitraire avant le Lot 7.**

> ✅ **Tranché au Lot 7 (C-26) — option (a).** `nextAction` = `next_action` du positionnement
> actif le plus récent, `null` sinon. Aucune dérivation, aucune colonne. Porteur dédié = dette CAND-2.

### 14.6 Résolutions du Lot 7 (C-26)

| Sujet | Décision |
|---|---|
| Population | Tous les `candidates` du workspace ; `pipelineState` (`pool`/`in_process`/`closed`) dérivé, filtrage à l'affichage (Lot 8). |
| Qualification YTD (DATA-4) | Jalon `candidate_hiring_milestones` `step='prequalification'` + `result='valide'` + `completed_at` année civile. Backfill anciens = dette CAND-1. |
| Disponibilité (DATA-6) | `available_from` (date) + `notice_period_days` (peuplés 43/43) = source structurée ; `availability` texte conservé en libellé, jamais parsé. |
| Prochaine action (PRODUCT-2) | Option (a) — voir 14.5. |
| Lifecycle (PRODUCT-3) | Whitelist canonique `src/lib/recruitment/candidate-lifecycle.ts` (10 statuts, libellés FR, flag `terminal`). |
| Practice | `candidates.practice_id → offer_practices.slug` (C-17), repli `job_profile_id`. |

---

## 15. Cible fonctionnelle — Chapitre Pool de compétences

Reprendre **exactement** le contenu fonctionnel existant.

| Élément | Fichier (après Lot 6) |
|---|---|
| Route in-shell | `src/app/(app)/consultants/page.tsx` — branche `?section=pool-competences` |
| Route historique | `src/app/(app)/consultants/(tabbed)/pool-competences/page.tsx` → `permanentRedirect` (fichier retiré au Lot 15) |
| Loader | `src/features/consultants/data/get-consultants-skills.ts` (4 référentiels cachés + `collaborators` + `person_skills` + `opportunity_skills` → `{ dataset, collaborators }`) |
| Builder | `src/lib/consultants/pool-competences-data.ts` (`buildPoolCompetencesDataset`) — inchangé |
| Composants | `src/features/consultants/skills/` (`PoolCompetencesMap` sans `<header>`, `PoolCompetencesPracticeRow`, `PoolCompetencesSkillCardsRow`, `PoolCompetencesConnections`, `SkillDescriptionTooltip`, `pool-competences-shared.ts`, `types.ts`) |

Traitement : `MOVE` + `REUSE` — **livré (Lot 6, C-25)**. Redirection `/consultants/pool-competences` → `?section=pool-competences` posée ; suppression legacy (fichiers de route + `(tabbed)/layout.tsx`) au Lot 15.

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
| **C-16** | **Effectif actif = `collaborators.status <> 'sorti'`** (DATA-1). KPI vivier = `candidates.status = 'vivier'` **provisoire** (arrêt Lot 7, DATA-4). KPI recrutements = `candidate_hiring_processes.status = 'hired'` + `closed_at` année civile. | Live : `status='sorti'` ⟺ `exit_date IS NOT NULL` (accord parfait). `status` = champ sémantique d'autorité. | Actée (Lot 2) |
| **C-17** | **Practice canonique = `offer_practices.slug`** (+ bucket `null`). Candidats → `practice_id`. Collaborateurs → cascade `job_profile → nom exact → heuristique mots-clés → null`. **Aucune migration.** | Aucune source relationnelle ne couvre les deux populations (`collaborators` : `job_profile_id` 10/29, `practice` texte 29/29 ; `candidates.practice_id` 43/43). `collaborators.practice_id` FK = dette future non bloquante. | Actée (Lot 2) |
| **C-18** | **Positionnement actif d'un collaborateur = `opportunity_candidates` via `person_id`** (opp. + statut non terminaux). `match_scores` jamais utilisé. Compte `null` (« — ») quand pas de fiche `candidates` miroir. | Éviter un faux zéro. Lien direct `opportunity ↔ collaborator` = sous-question ouverte, pas de migration au Lot 2. | Actée (Lot 2) |
| **C-19** | **Rémunération intercontrat via `collaborator_compensation`** (`effective_to IS NULL`) ; `grossAnnual`/`cjm` nullables ; `compensationVisible` dérivé de `profiles.role ∈ {owner, admin}`. Rôle non habilité → `null` + `dataNote`. UI masque (Lot 3). | RLS confidentielle owner/admin ; la RLS fait le filtrage, le view-model porte le signal UX. | Actée (Lot 2) |
| **C-20** | **View-model Synthèse = builder pur `buildConsultantsSynthese` (testé) + loader mince `getConsultantsSynthese`.** Aucun recalcul côté composant (Lot 3). | Patron KREDO (`buildPoolCompetencesDataset`) ; toute la logique métier testable sans DB. | Actée (Lot 2) |
| **C-21** | **Section `synthese` = tableau de bord dédié** (`SyntheseDesktop`/`SyntheseMobile`, `getConsultantsSynthese()`) ; **`collaborateurs` garde le tableau legacy** (`ConsultantsSyntheseDesktop`/`Mobile`). `page.tsx` charge par section. | Résorbe la duplication transitoire C-14 ; ADR-0006 (ne charger que les données de la vue rendue). | Actée (Lot 3) |
| **C-22** | **Dataviz Desktop = SVG maison** (`PracticeBreakdownChart` client pour le toggle, `RecruitmentPipelineChart` pur) ; **Mobile = barres HTML+Tailwind** (`div` width %). Palette practice = `offer_practices.color_hex` (donnée, cohérent avec `practiceBadgeStyle`), fallback `var(--color-muted)`. | Règle dataviz KREDO ; zéro bibliothèque ; les couleurs practice sont une palette catégorielle pilotée par la donnée, pas des HEX arbitraires en dur. | Actée (Lot 3) |
| **C-23** | **Chapitre Collaborateurs = `src/features/consultants/collaborators/`** (`CollaboratorsDesktop`/`Mobile` + `collaborators.types.ts`). Le statut « en mission / intercontrat » se lit sur **`collaborators.status`** (`isCollaboratorStaffed`), pas sur la présence d'une mission active. `getConsultantsTeam` filtre `status <> 'sorti'`. `components/consultants/synthese/` supprimé. | LEGACY-4 : le champ `status` est l'autorité (C-16) ; alignement des KPI, du filtre et du pill. Colonnes mission restent dérivées de la mission active (données de mission, pas de statut). | Actée (Lot 4) |
| **C-24** | **Chapitre Activités & congés internalisé** (`?section=activite-conges`) : loader `get-consultants-activity.ts` (6 lectures extraites), composant `ActivityDashboard` déplacé dans `src/features/consultants/activity/` (types séparés), `<h1>` interne retiré. Route legacy `/consultants/activite-conges` → `permanentRedirect`. **Pas de branche Mobile dédiée** — vue analytique dense unique, contenu large en `overflow-auto`. | Le shell porte le titre ; parité stricte (loader + composant identiques hors `<h1>`) ; une vraie vue Mobile activité chevauche le module Production & Congés (Lot 12) → dette PRODUCT-4. | Actée (Lot 5) |
| **C-25** | **Chapitre Pool de compétences internalisé** (`?section=pool-competences`) : `git mv src/components/consultants/pool-competences/` → `src/features/consultants/skills/` (7 fichiers, imports relatifs préservés) ; 3 consommateurs externes des primitives (`SkillDescriptionTooltip`, `types`, `pool-competences-shared`) repointés. Loader extrait → `src/features/consultants/data/get-consultants-skills.ts` (**pas** dans `skills/` — les loaders vivent dans `data/`, convention Lots 2/5). `buildPoolCompetencesDataset` (`src/lib/consultants/`) inchangé. `<header>`/`<h1>` interne de `PoolCompetencesMap` retiré. Route legacy → `permanentRedirect`. **Pas de branche Mobile dédiée.** **Suppression des fichiers de route `(tabbed)` + `(tabbed)/layout.tsx` + `SectionNavBarSlot` : reportée au Lot 15** (déjà son périmètre), la barre horizontale n'étant plus atteignable (redirect). | Parité stricte ; le shell porte le titre ; cohérence avec la convention loader `data/` du chantier ; scinder le déménagement (Lot 6) du nettoyage legacy (Lot 15) évite de toucher un test d'invariant hors sujet. | Actée (Lot 6) |
| **C-26** | **Contrat de données Candidats candidate-centric** (`src/features/consultants/candidates/data/`) : builder pur `buildConsultantsCandidates` + loader mince `getConsultantsCandidates` (server-only) + types + tests (C-20 réappliqué). **Population** = *tous* les `candidates` du workspace (aucune exclusion au chargement) ; le view-model porte `pipelineState` dérivé (`pool` / `in_process` / `closed`), le filtrage est un choix d'affichage (Lot 8). **DATA-4** : `qualifiedThisYear` = jalon `candidate_hiring_milestones` `step='prequalification'` + `result='valide'` + `completed_at` dans l'année civile de référence (28/43 live) ; `candidates.created_at` jamais assimilé à une qualification ; candidats anciens sans ce jalon → `false` + dette **CAND-1** (backfill = sous-lot 7.x). **DATA-6** : `available_from` (date) + `notice_period_days` (int) sont peuplés 43/43 → source structurée ; `availability` (texte libre) conservé tel quel comme `availabilityLabel`, jamais parsé ; `availabilityBucket` (`immediate`/`scheduled`/`unknown`) dérivé de `available_from`. Aucune migration, aucune normalisation. **PRODUCT-2** (option a) : `nextAction` = `opportunity_candidates.next_action` du positionnement actif le plus récent ; `null` sans positionnement actif ; aucune dérivation ni colonne nouvelle (porteur dédié = dette CAND-2). **PRODUCT-3** : whitelist canonique unique `src/lib/recruitment/candidate-lifecycle.ts` (10 statuts = `VALID_STATUSES` de `update-candidate-status.ts`, libellés FR + flag `terminal`) ; les 3 copies legacy (`CandidateProfileEditor`, `CandidateReferenceProfile`, `RecruitmentListView`) convergent au Lot 8 (dette CAND-3). **Practice** = `candidates.practice_id → offer_practices.slug` (C-17), repli `job_profile_id`. | Le vivier complet doit être visible (13/43 sans positionnement) ; définitions figées et testées ; aucune colonne DB arbitraire ; une seule source de vérité du lifecycle. | Actée (Lot 7) |
| **C-27** | **Chapitre Candidats internalisé** (`?section=candidats`, `external: false`, 5/5 sections in-shell) : `src/features/consultants/candidates/` = `CandidatesDesktop` (`StructuredList` maison, patron `CollaboratorsDesktop` — pas `EntityListView` ni `DataTable`), `CandidatesMobile` (`MobileDataList`/`MobileEntitySummary`, cartes), `CandidateInlineControls` (client), `candidates-view.ts` (helpers purs). Distribution Desktop/Mobile **serveur** (`page.tsx`, ADR-0006). **Drawers réutilisés tels quels** : `CandidateDrawer` (déjà candidate-centric — prend `candidateId`, charge ses données), `NewCandidateDrawer`. **Édition inline (§ 14.4)** : `candidates.status` (`updateCandidateStatus`, toujours) + `candidate_hiring_processes.current_step` (`updateHiringStep`, si process actif). Le **positionnement commercial `opportunity_candidates.status` n'est PAS édité inline** — le view-model candidate-centric n'en porte pas l'identifiant ; reste au drawer / audit Lot 9 (dette **CAND-4**). Les 5 Server Actions recrutement gagnent un `revalidatePath("/consultants")` (C-12, refactor). **Route `/recruitment` + `getMobileTabsForPath` + `main-menu.config` intacts** (C-13 ; dépréciation = Lot 10). | Cohérence visuelle et technique avec les chapitres livrés (Lot 4) plutôt qu'un nouveau paradigme ; `CandidateDrawer` est déjà autoportant ; l'édition inline se limite aux dimensions dont la ligne porte la clé ; `edito_bright_design` explicitement hors périmètre (écran opérationnel de saisie rapide). | Actée (Lot 8) |

---

## 20. OPEN QUESTIONS

> Une question ouverte n'empêche pas de cadrer les lots qui n'en dépendent pas.
> Résolution attendue : colonne « Lot cible ».

### DATA

| ID | Question | Lot cible |
|---|---|---|
| ~~**DATA-1**~~ | ✅ **RÉSOLU (Lot 2, C-16)** — effectif actif = `collaborators.status <> 'sorti'` (`status='sorti'` ⟺ `exit_date IS NOT NULL` live). | 2 |
| ~~**DATA-2**~~ | ✅ **RÉSOLU (Lot 2, C-17)** — clé canonique `offer_practices.slug` ; candidats → `practice_id`, collaborateurs → cascade `job_profile → nom exact → heuristique → null`. Aucune migration ; `collaborators.practice_id` FK = dette future. | 2 |
| ~~**DATA-3**~~ | ⚠️ **PARTIELLEMENT RÉSOLU (Lot 2, C-18)** — source = `opportunity_candidates` via `person_id` ; `null` (« — ») sans fiche candidat miroir. `match_scores` jamais utilisé. Sous-question ouverte : lien direct `opportunity ↔ collaborator`. | 2 / futur |
| ~~**DATA-4**~~ | ✅ **RÉSOLU (Lot 7, C-26)** — `qualifiedThisYear` = jalon `candidate_hiring_milestones` `step='prequalification'` + `result='valide'` + `completed_at` dans l'année civile (28/43 live). Fallback/backfill des candidats anciens = dette **CAND-1** (sous-lot 7.x). | 7 (backfill → 7.x) |
| **DATA-5** | Le **planning journalier de production** n'existe pas en base (agrégats mensuels seulement). Modèle relationnel minimal à créer (table dédiée vs dérivation calendaire) ? | 11 |
| ~~**DATA-6**~~ | ✅ **RÉSOLU (Lot 7, C-26)** — `available_from` (date) + `notice_period_days` (int) sont **peuplés 43/43** → source structurée du tri/filtre. `availability` (texte libre) conservé tel quel en libellé, jamais parsé ; `availabilityBucket` dérivé de `available_from`. Aucune migration, aucune normalisation. | 7 |
| ~~**DATA-7**~~ | ✅ **RÉSOLU (Lot 2, C-19)** — `grossAnnual`/`cjm` nullables ; `compensationVisible` dérivé de `profiles.role`. Rôle non habilité → valeurs `null` + `dataNote` ; l'UI (Lot 3) masque les colonnes, la page reste accessible. | 2 |

### PRODUCT

| ID | Question | Lot cible |
|---|---|---|
| **PRODUCT-1** | Intention du module **Matching profil** : `Profil → besoins` et/ou `Besoin → profils` ? (Moteur actuel = besoin-centrique.) | 13 (décision avant impl.) |
| ~~**PRODUCT-2**~~ | ✅ **RÉSOLU (Lot 7, C-26 — option a)** — `nextAction` = `opportunity_candidates.next_action` du positionnement actif le plus récent ; `null` sinon. Aucune dérivation depuis un milestone, aucune colonne nouvelle. Porteur dédié = dette **CAND-2**. | 7 |
| ~~**PRODUCT-3**~~ | ✅ **RÉSOLU (Lot 7, C-26)** — whitelist canonique `src/lib/recruitment/candidate-lifecycle.ts` : 10 statuts (= `VALID_STATUSES`), libellés FR, flag `terminal` (`recrute`/`refuse`/`ko_manager`/`archive`). Les 3 copies legacy convergent au Lot 8 (dette **CAND-3**). | 7-8 |
| **PRODUCT-4** | La Synthèse Mobile et le module Production & Congés partagent-ils une vue « planning » ? Périmètre de chevauchement à trancher. | 3 / 12 |

### NAVIGATION

| ID | Question | Lot cible |
|---|---|---|
| ~~**NAV-1**~~ | ✅ **RÉSOLU (Lot 1)** — `?section=` confirmé comme contrat (patron Engagements `?vue=` transposé, aucun conflit dans le code réel). | 1 |
| ~~**NAV-2**~~ | ✅ **RÉSOLU** — `activite-conges` (Lot 5, C-24) et `pool-competences` (Lot 6, C-25) → `permanentRedirect`. Suppression des fichiers de route `(tabbed)` + `(tabbed)/layout.tsx` + `SectionNavBarSlot` = **Lot 15** (nettoyage). | 5-6 / 15 |
| **NAV-3** | `/recruitment` : à quel moment exact la redirection permanente est-elle posée (parité prouvée Lot 9) et quand le module `main-menu` « Recrutement » disparaît-il (Lot 14, coord. SHELL-0018 Phase 6) ? | 10 / 14 |
| **NAV-4** | Le module Consultants doit-il rejoindre le groupe `CRM` ou rester `Ressources` dans la taxonomie du menu principal SHELL-0018 Phase 6 ? | 14 |

### LEGACY

| ID | Question | Lot cible |
|---|---|---|
| ~~**LEGACY-1**~~ | ✅ **RÉSOLU (Lot 1)** — retrait local livré : `SectionNavBarSlot` descendu dans `(tabbed)/layout.tsx` (C-15). Suppression globale de `SectionNavBarSlot`/`SectionNavBar` + nettoyage `main-menu.config` = SHELL-0018 Phase 6 (Lot 14 en coordination). | 1 / 14 |
| **LEGACY-2** | `dashboard/RecruitmentDesktopDashboard.tsx` + `RecruitmentMobileDashboard.tsx` : confirmer qu'ils sont morts (aucun import externe constaté) et les supprimer. | 9 / 15 |
| **LEGACY-3** | `src/app/(app)/consultants/(tabbed)/layout.tsx` (passthrough neutre) : à supprimer une fois les deux sous-routes migrées. | 15 |
| ~~**LEGACY-4**~~ | ✅ **RÉSOLU (Lot 4, C-23)** — `CollaboratorsDesktop`/`Mobile` lisent le statut sur `collaborators.status` (`isCollaboratorStaffed`) ; `getConsultantsTeam` filtre `status <> 'sorti'`. | 4 |

---

## 21. INVENTAIRE DE L'EXISTANT — matrice

Traitements : `KEEP` · `MOVE` · `REUSE` · `REFACTOR` · `DEPRECATE` · `REMOVE AFTER PARITY` · `NEW`.

| Capacité | Existant | Source | Cible | Traitement |
|---|---|---|---|---|
| Consultants — Synthèse actuelle (= tableau collaborateurs racine) | oui | `src/app/(app)/consultants/page.tsx`, `components/consultants/synthese/ConsultantsSynthese{Desktop,Mobile}.tsx` | Chapitre **Collaborateurs** | MOVE + REUSE |
| Consultants — nouvelle Synthèse (KPI + graphiques + tableaux courts) | non | — | Chapitre **Synthèse** (racine) | NEW |
| Drawer profil collaborateur | oui | `components/consultants/ConsultantDrawer.tsx` | Chapitres Collaborateurs / Synthèse | REUSE |
| Activité & congés | oui | `src/app/(app)/consultants/(tabbed)/activite-conges/page.tsx`, `components/consultants/activite-conges/ConsultantsActivityDashboard.tsx` | Chapitre **Activités & congés** (`?section=activite-conges`) | MOVE + REUSE |
| Pool de compétences | oui | **Livré Lot 6** — `consultants/page.tsx` (`?section=pool-competences`), `features/consultants/skills/*`, `features/consultants/data/get-consultants-skills.ts`, `lib/consultants/pool-competences-data.ts` ; `(tabbed)/pool-competences/page.tsx` → redirect | Chapitre **Pool de compétences** (`?section=pool-competences`) | MOVE + REUSE ✅ |
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
| ~~**2.x**~~ | **Non déclenché** — Lot 2 a résolu practice (heuristique acceptable) et positionnements (`opportunity_candidates`) sans migration. `collaborators.practice_id` FK reste une dette future non planifiée. | — | — |
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

### Lot 2 — Data Contract Synthèse — ✅ techniquement livré (2026-09-08)

**Réalisé.** Détail d'exécution dans le ledger § « Lot 2 ».

- **Objectif** : un loader / view-model **unique** server-only pour la Synthèse : 3 KPI, répartition par practice (collaborateurs/candidats), 5 prochaines fins de mission, collaborateurs en intercontrat, pipeline recrutement par étape.
- **Livré** :
  - `src/features/consultants/data/consultants-synthese.types.ts` — view-model `ConsultantsSyntheseViewModel` + types de lignes brutes.
  - `src/features/consultants/data/build-consultants-synthese.ts` — **builder pur** (résolution practice en cascade, garde anti-faux-zéro positionnements, réserves méthodo `dataNotes`).
  - `src/features/consultants/data/get-consultants-synthese.ts` — loader serveur (8 lectures parallèles, RLS utilisateur, `compensationReadable` via `profiles.role`).
  - `src/features/consultants/data/__tests__/build-consultants-synthese.test.ts` — 13 tests.
- **DATA résolus** : C-16 (DATA-1), C-17 (DATA-2), C-18 (DATA-3 partiel), C-19 (DATA-7). C-20 (architecture builder pur + loader).
- **Aucune migration** — l'heuristique practice est acceptable (voir §8) ; `collaborators.practice_id` FK = dette future non bloquante, **pas de sous-lot 2.x**.
- **Cross-check live 2026-09-08** : 29 collaborateurs actifs · 11 vivier · 11 recrutements YTD · 10 process actifs · 3 intercontrat (positionnements « — » pour les 3).
- **Gates** : `typecheck` ✅ · `npm test` **complet** ✅ (258 fichiers / 2618 tests) · `check:server-boundary` ✅ · `eslint` ✅ · `build` ✅. QA visuelle : réservée à Guillaume.
- **Hors périmètre tenu** : aucun rendu UI (Lot 3).
- **NEXT LOT** : Lot 3 — Synthèse Desktop + Mobile.

### Lot 3 — Synthèse Desktop + Mobile — ✅ techniquement livré (2026-09-08)

**Réalisé.** Détail dans le ledger § « Lot 3 ».

- **Objectif** : construire la page Synthèse, câblée sur `getConsultantsSynthese()` (Lot 2).
- **Livré** :
  - `src/features/consultants/desktop/synthese/PracticeBreakdownChart.tsx` — **client** (sélecteur Collaborateurs/Candidats), barres horizontales SVG maison, couleur `offer_practices.color_hex`.
  - `src/features/consultants/desktop/synthese/RecruitmentPipelineChart.tsx` — SVG maison (barres verticales, 6 étapes), ligne de stats.
  - `src/features/consultants/desktop/synthese/SyntheseDesktop.tsx` — **client** : 3 KPI + 2 graphiques + 2 tableaux `StructuredList` (`upcomingMissionEnds`, `interContractCollaborators` — colonnes rémunération masquées si `compensationVisible === false`, « — » si `activePositionings === null`) + `dataNotes`.
  - `src/features/consultants/mobile/synthese/SyntheseMobile.tsx` — **client** : 3 KPI · barres HTML+Tailwind (`div` width %) · cartes fins de mission / intercontrat · pipeline · raccourcis.
  - `src/features/consultants/desktop/synthese/synthese-render.test.ts` — 6 tests de rendu (KPI, practices, masquage rémunération, `dataNotes`).
- **Modifié** : `src/app/(app)/consultants/page.tsx` — branche par section : `synthese` charge `getConsultantsSynthese()` uniquement, `collaborateurs` charge `getConsultantsTeam()` uniquement (ADR-0006 : chaque section ne charge que ses données).
- **Décisions** : C-21 (`synthese` = tableau de bord dédié, `collaborateurs` garde le tableau legacy — dette C-14 résorbée), C-22 (dataviz Desktop = SVG maison, Mobile = barres HTML+Tailwind ; palette practice = `offer_practices.color_hex`, fallback `var(--color-muted)`).
- **Critères tenus** : branches Desktop/Mobile distribuées côté serveur (`getDashboardDevice()`) ; aucune bibliothèque graphique ; header shell = `Synthèse`.
- **Gates** : `typecheck` ✅ · `npm test` complet ✅ · `check:server-boundary` ✅ · `eslint` ✅ · `build` local non joué (env : `next dev` concurrent + iCloud) **mais build de production Vercel `READY` sur le commit exact** → vérification `next build` canonique passée. QA visuelle : réservée à Guillaume.
- **Déploiement** : `main` → auto-déploie en production (GitHub↔Vercel). Lots 0-3 tous déployés ; production courante = `7724d800` sur `kredo-green.vercel.app`.
- **NEXT LOT** : Lot 4 — Migration Collaborateurs.

### Lot 4 — Migration Collaborateurs — ✅ techniquement livré (2026-09-08)

**Réalisé.** Détail dans le ledger § « Lot 4 ».

- **Objectif** : déplacer le tableau collaborateurs vers `src/features/consultants/collaborators/`, aligner le statut sur `collaborators.status`, préserver drawer/tri/filtres.
- **Livré** :
  - `src/features/consultants/collaborators/collaborators.types.ts` — `CollaborateurRow` + `isCollaboratorStaffed()` (statut ⇐ `collaborators.status === 'en_mission'`).
  - `src/features/consultants/collaborators/CollaboratorsDesktop.tsx` — déplacé de `components/consultants/synthese/ConsultantsSyntheseDesktop`, renommé, statut/occupation/filtre alignés sur `collaborators.status` (LEGACY-4). Colonnes mission (client, fin, TJM/CJM/marge) restent dérivées de la mission active. Header interne « Effectif (N) ».
  - `src/features/consultants/collaborators/CollaboratorsMobile.tsx` — idem, `MobilePageHeader` retitré « Collaborateurs ».
  - `src/features/consultants/collaborators/collaborators.test.ts` — 4 tests (helper + LEGACY-4 sur les deux vues).
- **Modifié** :
  - `src/features/consultants/data/get-consultants-team.ts` — `.neq("status", "sorti")` (C-16 : effectif actif) + import du type depuis `collaborators/`.
  - `src/app/(app)/consultants/page.tsx` — imports/usages renommés.
- **Supprimé** : `src/components/consultants/synthese/` (2 fichiers + dossier).
- **Décision** : C-23. **LEGACY-4 résolu.**
- **Critères tenus** : parité fonctionnelle (drawer, tri, filtres, colonnes) ; header shell = `Collaborateurs`.
- **Gates** : `typecheck` ✅ · `npm test` complet ✅ (260 fichiers / 2628) · `check:server-boundary` ✅ · `eslint` ✅ · `build` local non joué (`next dev` concurrent) → build de prod Vercel.
- **NEXT LOT** : Lot 5 — Migration Activités & congés.

### Lot 5 — Migration Activités & congés — ✅ techniquement livré (2026-09-08)

**Réalisé.** Détail dans le ledger § « Lot 5 ».

- **Objectif** : absorber `(tabbed)/activite-conges/` dans `?section=activite-conges`, contenu conservé.
- **Livré** :
  - `src/features/consultants/activity/activity.types.ts` — 7 types de lignes + `ActivityDashboardData` (extraits du composant).
  - `src/features/consultants/activity/ActivityDashboard.tsx` — déplacé (`git mv`) de `components/consultants/activite-conges/ConsultantsActivityDashboard`, renommé, `<h1>` interne retiré (le bandeau/hero et ses 3 stats sont conservés). Server component, aucun recalcul métier.
  - `src/features/consultants/activity/activity.test.ts` — 4 tests (pas de `<h1>`, sources partielles, redirect legacy).
  - `src/features/consultants/data/get-consultants-activity.ts` — loader extrait (6 lectures parallèles, `safeRead` dégradant, `sourceIssues`).
  - `src/features/consultants/navigation/consultants-sections.ts` — `activite-conges` → `external: false`, `CONSULTANTS_IN_SHELL_SECTIONS` = 3, `parseConsultantsSection` data-driven.
- **Modifié** : `src/app/(app)/consultants/page.tsx` — branche `activite-conges` (contenu `overflow-auto` pour le contenu large) ; `(tabbed)/activite-conges/page.tsx` → `permanentRedirect("/consultants?section=activite-conges")`.
- **Décision** : C-24. **NAV-2 partiellement résolu** (`activite-conges` redirige ; `pool-competences` = Lot 6 ; fichiers de route supprimés au Lot 15).
- **Mobile** : **pas de branche Mobile dédiée** — la vue reste la dense analytique unique (contenu large scrollable). Dette **PRODUCT-4** (chevauchement avec le module Production & Congés du Lot 12).
- **Critères tenus** : parité (loader identique, composant identique hors `<h1>`) ; ancien chemin redirige ; header shell = `Activités & congés`.
- **Gates** : `typecheck` ✅ · `npx vitest run src/features/consultants` ✅ (44 tests) · `check:server-boundary` ✅ · `eslint` ✅ · `build` → Vercel. ⚠️ `npm test` complet : **1 échec pré-existant hors périmètre** (`veille-desktop-contracts.test.ts`, cassé par du WIP non commité de Guillaume sur `veille/page.tsx` — vérifié : la version `HEAD` passe).
- **NEXT LOT** : Lot 6 — Migration Pool de compétences.

### Lot 6 — Migration Pool de compétences — ✅ techniquement livré (2026-09-08)

**Réalisé.** Détail dans le ledger § « Lot 6 ».

- **Objectif** : absorber `(tabbed)/pool-competences/` dans `?section=pool-competences` sans refonte métier.
- **Livré** :
  - `git mv src/components/consultants/pool-competences/` → **`src/features/consultants/skills/`** (7 fichiers : `PoolCompetencesMap`, `PoolCompetencesPracticeRow`, `PoolCompetencesSkillCardsRow`, `PoolCompetencesConnections`, `SkillDescriptionTooltip`, `pool-competences-shared.ts`, `types.ts`). Imports relatifs inchangés.
  - `src/features/consultants/skills/PoolCompetencesMap.tsx` — `<header>` interne (« Équipe / Pool de compétences » + `<h1>` « Expertises & savoir-faire ») **retiré** ; le `<main>` et l'early-return sont conservés.
  - `src/features/consultants/data/get-consultants-skills.ts` — loader extrait à l'identique de la page legacy (4 référentiels cachés + `collaborators` + `person_skills` + `opportunity_skills`), retourne `{ dataset, collaborators }`. `import "server-only"`. `buildPoolCompetencesDataset` (`src/lib/consultants/pool-competences-data.ts`) **inchangé**.
  - `src/features/consultants/navigation/consultants-sections.ts` — `pool-competences` → `external: false`, `href` `?section=`, ajouté à `CONSULTANTS_IN_SHELL_SECTIONS` (= 4).
  - 3 consommateurs externes des primitives déplacées repointés (`KredoJobsView.tsx`, `talent-knowledge-builders.ts`, `OpportunitySkillsCloud.tsx` → `@/features/consultants/skills/…`).
- **Modifié** : `src/app/(app)/consultants/page.tsx` — branche `pool-competences` (contenu `overflow-auto`, servi aux deux devices) ; `(tabbed)/pool-competences/page.tsx` → `permanentRedirect("/consultants?section=pool-competences")` ; `consultants-sections.test.ts` — assertions `pool-competences` internalisé + href.
- **Décision** : **C-25**. **NAV-2 résolu** (les deux routes `(tabbed)` redirigent ; suppression des fichiers de route + `(tabbed)/layout.tsx` + `SectionNavBarSlot` reportée au Lot 15, périmètre déjà cadré).
- **Mobile** : **pas de branche Mobile dédiée** — cartographie large unique, contenu scrollable. Dette **SKILLS-1** (une vraie synthèse compétences Mobile n'est pas cadrée).
- **Critères tenus** : parité (loader + composant identiques hors `<header>`) ; ancien chemin redirige (301) ; header shell = `Pool de compétences`.
- **Gates** : `typecheck` ✅ · `npx vitest run src/features/consultants` ✅ (44 tests, 5 fichiers) · `npm test` complet ✅ (**261 fichiers / 2633 tests** — l'échec veille pré-existant du Lot 5 a été résorbé par le commit `55d637ee` de Guillaume) · `check:server-boundary` ✅ · `eslint` (fichiers touchés) ✅ · `build` → Vercel prod (gate).
- **NEXT LOT** : Lot 7 — Data Contract Candidats.

### Lot 7 — Data Contract Candidats — ✅ techniquement livré (2026-09-08)

**Réalisé.** Détail dans le ledger § « Lot 7 ».

- **Objectif** : passer le modèle de lecture d'**opportunity-centric** à **candidate-centric**.
- **Livré** (`src/features/consultants/candidates/data/`) :
  - `consultants-candidates.types.ts` — lignes brutes + `ConsultantsCandidatesViewModel` (rows + counts + dataNotes).
  - `build-consultants-candidates.ts` — **builder pur** : practice (C-17), `pipelineState`, `qualifiedThisYear` (DATA-4), `availabilityBucket` (DATA-6), `nextAction` (PRODUCT-2), lifecycle, compteurs, `dataNotes`.
  - `get-consultants-candidates.ts` — loader `server-only` : part de `candidates` (43 live), + `candidate_hiring_processes`, jalons `prequalification/valide` (filtre SQL), `opportunity_candidates` (+ `opportunities.stage`), référentiels practices/job_profiles en cache.
  - `__tests__/build-consultants-candidates.test.ts` — 11 tests.
  - `src/lib/recruitment/candidate-lifecycle.ts` (+ `.test.ts`, 4 tests) — whitelist canonique (PRODUCT-3).
- **Décision** : **C-26**. **DATA-4 / DATA-6 / PRODUCT-2 / PRODUCT-3 résolus.** Dettes **CAND-1** (backfill qualification), **CAND-2** (porteur « prochaine action »), **CAND-3** (3 copies legacy de labels lifecycle).
- **Hors périmètre (confirmé)** : `calendar_events` (RDV/entretiens) non consommés au Lot 7 — la « prochaine action » vient de `opportunity_candidates.next_action` (PRODUCT-2 option a), le planning des entretiens est un sujet Lot 9. Aucune UI (Lot 8). Aucune migration.
- **Cross-check live** : 43 candidats · `pipelineState` = 19 pool / 10 in_process / 14 closed · 28 `qualifiedThisYear` · 13 sans positionnement (exactement les invisibles du loader legacy).
- **Gates** : `typecheck` ✅ · `npx vitest run src/features/consultants src/lib/recruitment/candidate-lifecycle.test.ts` ✅ (7 fichiers / 59 tests) · `npm test` complet ✅ (263 fichiers / 2648 tests) · `check:server-boundary` ✅ · `eslint` ✅ · `build` → Vercel prod (gate).
- **NEXT LOT** : Lot 8 — Page Candidats.

### Lot 8 — Page Candidats — ✅ techniquement livré (2026-09-08)

**Réalisé.** Détail dans le ledger § « Lot 8 ».

- **Objectif** : chapitre Candidats in-shell (`?section=candidats`) — table Desktop, cartes Mobile, filtres, édition inline, ouverture détail.
- **Livré** (`src/features/consultants/candidates/`) :
  - `CandidatesDesktop.tsx` (client) — 3 `StatCard` + filtres (pipeline / practice / disponibilité) + `StructuredList` maison (7 colonnes § 14.3) + `<details>` notes méthodo + drawers.
  - `CandidatesMobile.tsx` (client) — `MobilePageHeader` + `MobileHeroInsight` + segments (Prioritaires / En process / Vivier) + `MobileDataList` de cartes `MobileEntitySummary`.
  - `CandidateInlineControls.tsx` (client) — `Select` lifecycle (`updateCandidateStatus`) + `Select` étape process si actif (`updateHiringStep`), `useOptimistic` + `router.refresh()`.
  - `candidates-view.ts` (+ `.test.ts`, 6 tests) — libellés, buckets, initiales, `formatSalaryK`.
- **Réutilisé sans modification** : `CandidateDrawer` (déjà candidate-centric), `NewCandidateDrawer`, `StructuredList`, `StatusPill`, `MobileDataList`, `HIRING_KANBAN_STAGES`.
- **Server Actions** : `revalidatePath("/consultants")` ajouté aux 5 actions recrutement (`update-candidate-status`, `update-hiring-step`, `update-recruitment-status`, `update-candidate-profile`, `create-candidate`) — refactor C-12, aucune duplication.
- **Décision** : **C-27**. Écart assumé : `StructuredList` (patron Lot 4) plutôt que `DataTable`/`EntityListView` ; édition inline limitée au lifecycle + étape process (le positionnement `opportunity_candidates` reste au drawer → dette **CAND-4**).
- **Navigation** : `candidats` → `external: false` ; **5/5 chapitres in-shell**. `/recruitment`, `getMobileTabsForPath`, `main-menu.config` **intacts** (C-13). Dépréciation `/recruitment` = Lot 10.
- **Adaptive** : `page.tsx` branche `candidats` → `getConsultantsCandidates()` → `CandidatesDesktop` / `CandidatesMobile` selon `getDashboardDevice()` (la vue non rendue n'est pas chargée).
- **Critères tenus** : vivier complet visible (43, filtrable) ; édition inline écrit dans le bon modèle ; `CandidateDrawer` ouvre sur clic ligne ; header shell = `Candidats` ; branches serveur.
- **Gates** : `typecheck` ✅ · `npx vitest run src/features/consultants` ✅ (6 fichiers / 55 tests + 16 candidates) · `npm test` complet ✅ (264 fichiers / 2653 tests) · `check:server-boundary` ✅ · `eslint` ✅ · `build` → Vercel prod (gate).
- **NEXT LOT** : Lot 9 — Absorption fonctionnelle Recruitment.

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
