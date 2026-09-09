# Opportunities Workspace — Document de référence canonique

> **Chantier :** Opportunities Workspace (nom produit affiché : **Opportunités**)
> **Statut :** cadré (Lot 0 livré le 2026-09-09)
> **Branche de travail unique :** `main`
> **Baseline de cadrage :** `61aba08ee1b35f848d223f96e08a1e1a624545ec`
> **Autorité :** ce document + le ledger `01-IMPLEMENTATION-LEDGER.md`. En cas de doute,
> le **code réel sur `origin/main`** et le standard `docs/navigation_architecture/SHELL-0018/` priment.

Table des matières :

1. [Intention et périmètre](#1-intention-et-périmètre)
2. [Contraintes de plateforme](#2-contraintes-de-plateforme)
3. [Standard de navigation réutilisé — SHELL-0018](#3-standard-de-navigation-réutilisé--shell-0018)
4. [Route canonique et contrat URL](#4-route-canonique-et-contrat-url)
5. [Périmètre Desktop / Mobile](#5-périmètre-desktop--mobile)
6. [Page de référence structurelle — `/reports` et `/missions`](#6-page-de-référence-structurelle--reports-et-missions)
7. [Structure cible Desktop par chapitre](#7-structure-cible-desktop-par-chapitre)
8. [Architecture Data — tables et contrats](#8-architecture-data--tables-et-contrats)
9. [Chapitre Synthèse — cible fonctionnelle](#9-chapitre-synthèse--cible-fonctionnelle)
10. [Chapitre Besoins & staffing — cible fonctionnelle](#10-chapitre-besoins--staffing--cible-fonctionnelle)
11. [Chapitre Avant-vente — cible fonctionnelle](#11-chapitre-avant-vente--cible-fonctionnelle)
12. [Chapitre Planning — cible fonctionnelle](#12-chapitre-planning--cible-fonctionnelle)
13. [Modules contextuels](#13-modules-contextuels)
14. [Architecture applicative cible](#14-architecture-applicative-cible)
15. [Inventaire de l'existant — matrice de traitement](#15-inventaire-de-lexistant--matrice-de-traitement)
16. [DECISION LOG (OPP-01 → OPP-16)](#16-decision-log)
17. [OPEN QUESTIONS](#17-open-questions)
18. [Roadmap — découpage en lots](#18-roadmap--découpage-en-lots)
19. [Fiches de lot autonomes (Lots 0 → 12)](#19-fiches-de-lot-autonomes)
20. [Protocoles agent](#20-protocoles-agent)

---

## 1. Intention et périmètre

### 1.1 Problème

L'actuel workspace **« Besoins & Staffing »** vit sur `/missions/opps`, dans le shell
**historique** `src/app/(app)/missions/(tabbed)/` :

- Navigation : `SectionNavBarSlot` (barre horizontale legacy — **no-op runtime** ici car
  l'entrée `main-menu` « Besoins & Staffing » ne porte pas de `tabs`) + `MissionsTabbedShell`
  (barre `SectionTabBar` « home » + onglets d'entités ouvertes façon CRM, pilotée par
  `useMissionsTabStore`).
- Contenu : un unique composant client **`NeedsStaffingWorkspace.tsx`** (895 lignes) qui
  concentre : bascule **besoins ⇄ staffing** (`?scope=`), 3 vues **liste / kanban / planning**
  (`?scope`), filtres (`?stage` / `?priority` / `?practice`), tri ACV, édition rapide d'étape,
  création opportunité, création staffing, simulation financière par positionnement, drawer
  unique `AssistanceCaseDrawer`.
- Contrat URL : `?scope=needs|staffing` **obligatoire** (redirection serveur si absent),
  `?view=`, `?stage`, `?priority`, `?practice`, `?sort=acv`, `?direction=`. **L'état n'est
  reconstruit que côté client** (`useNeedsStaffingUrlState`) ; le serveur ne lit que `scope`
  (pour la garde de redirection) et `device`.

Ce workspace :

- **n'est pas aligné** sur le Shell Desktop V2 (`SectionRail`, SHELL-0018 Phases 1→5 closes) ;
- **mélange** dans une seule surface le pilotage commercial (opportunités), le staffing, et
  des vues (kanban/planning) sans hiérarchie de chapitres ;
- **n'expose pas** de vue de pilotage analytique (Synthèse) ni d'espace avant-vente ;
- **vit dans un shell legacy** (`missions/(tabbed)`) que SHELL-0018 Phase 6 doit démanteler.

### 1.2 Cible

Un workspace unique **« Opportunités »**, route canonique inchangée **`/missions/opps`**,
aligné sur `SectionRail` V2, avec **4 chapitres** :

```
Opportunités
├── 1. Synthèse            → surface analytique pleine largeur (exception au shell 3 panneaux)
├── 2. Besoins & staffing  → Liste besoins │ Détail besoin │ Staffing en cours
├── 3. Avant-vente         → Liste │ Vue principale │ Détails   (contenu métier vide en V1, vrais EmptyState)
└── 4. Planning            → Liste opps │ Planning mensuel/annuel │ Détails opp sélectionnée
Modules : Matching profil · Simulation devis · Post-Mortem
          (Modélisation de CA : Future — non affichée)
```

### 1.3 Ce que le chantier ne fait pas

- Il **ne migre pas de `pathname`** : `/missions/opps` reste la route (OPP-02). Aucune route
  `/opportunities` / `/opportunites` n'est créée sans décision produit ultérieure.
- Il **ne redessine pas le Mobile** : le Mobile actuel (`NeedsStaffingWorkspace` branche
  `device === "mobile"`) est **protégé** (OPP-07). Le branchement serveur via
  `getDashboardDevice()` reste le principe. Aucun composant Desktop lourd n'est chargé pour
  être masqué en CSS sur Mobile.
- Il **ne crée aucun second moteur de matching** : il expose le moteur unique existant
  (`src/lib/staffing-matching/`) et le module Consultants
  (`src/features/consultants/modules/profile-matching/`).
- Il **ne crée aucune deuxième modale de simulation** : il réutilise
  `FinancialModelingDesktopDialog` (`@/features/financial-modeling`).
- Il **ne crée aucune nouvelle mission d'intelligence, aucun workflow n8n, aucun trigger** :
  le module Post-Mortem est un nouveau **point d'entrée contextuel** vers la mission existante
  `post-mortem-commercial`.
- Il **ne crée aucune migration Supabase** dans les lots non-Data. Les lots Data (3, 8) ne
  créent une migration que si l'audit prouve le besoin — jamais pour contourner une lecture
  insuffisamment auditée.
- Il **ne supprime aucune capacité legacy silencieusement** (OPP-13) : toute suppression exige
  une preuve de parité ou une décision produit inscrite au Decision Log.
- Il **ne modifie le Shell global, `DesktopSidebar`, `SectionNavBar` / `SectionNavBarSlot`,
  `main-menu.config.ts`** qu'au **Lot 11**, en coordination avec SHELL-0018 Phase 6.

---

## 2. Contraintes de plateforme

`CLAUDE.md` (racine) fait autorité. Rappel :

- **Next.js 16.2.7** App Router, **React 19.2.4**, Server Components, Vercel.
- **Tailwind v4** `@theme` dans `src/app/globals.css` — pas de `tailwind.config.*`, **pas de
  HEX en dur dans le JSX** (n.b. : `NeedsStaffingWorkspace.tsx` viole aujourd'hui cette règle —
  couleurs `#FFC107` / `#9C27B0` / `#607D8B` en dur pour les boutons kanban/planning ; à
  résorber lors de la migration, pas à recopier).
- **UI maison** sur primitives `<dialog>` (`AppDrawer`, `AppDialog`, `SurfaceCard`,
  `DataTable<T>`, `PageFilterBar`, `PageViewSelector`…). **Interdits fermes** : shadcn/ui,
  Radix, recharts, chart.js, Tremor.
- **Dataviz** : SVG écrit à la main (Desktop), barres HTML+Tailwind pur (Mobile). Seule
  dépendance tolérée : `d3-shape`. **Aucune nouvelle bibliothèque graphique** — les graphiques
  de la Synthèse sont en SVG maison.
- **Supabase** : RLS actif, `workspace_id` par DEFAULT (`private.current_workspace_id()`),
  jamais envoyé par le front. Fonctions `private.*` non appelables en `.rpc()`.
- **`import "server-only"`** sur tout module important le client Supabase serveur, puis
  `npm run check:server-boundary`.
- **Adaptive Design (ADR-0006)** : *Desktop = analyse dense / Mobile = action synthétique*.
  Un workspace dense → **adaptive plein** (Server Component qui distribue une branche Desktop
  et une branche Mobile) ; **ne jamais charger le composant lourd pour le masquer en CSS ; ne
  charger que les données de la vue rendue.** `/missions/opps` applique déjà ce principe
  (Mobile ≈ 3 requêtes vs Desktop ≈ 5).
- **Boucle de validation** : `typecheck` → `test` → `check:server-boundary` → `lint` (fichiers
  touchés) → `build`. `tsc` ne détecte pas tout : purger `.next/` avant de conclure à une
  régression ; le `build` est la seule vraie vérification de la frontière serveur/client.

---

## 3. Standard de navigation réutilisé — SHELL-0018

Le chantier **n'invente rien** en matière de châssis de navigation. Il applique le standard
stabilisé par SHELL-0018 (Phases 1→5 closes — cf. `docs/navigation_architecture/SHELL-0018/`).

### 3.1 Primitive

- Contrat : `src/lib/navigation/section-rail.ts` (`SectionRailProps`, `SectionRailEntry`,
  union exclusive `href` **XOR** `onSelect` ; `home`, `chapters`, `contextualModules?`).
- Composant présentationnel : `src/components/layout/SectionRail.tsx`.
- **Aucune logique métier, aucun Supabase, aucun n8n dans la primitive.**

### 3.2 Invariants visuels et comportementaux (repris tels quels)

| Règle | Valeur |
|---|---|
| Largeur du rail | `w-[11.5rem]` (`184px`), fixe, jamais élargi pour un libellé |
| Chapeau | bouton **navy**, texte **blanc gras `text-xs` centré H+V**, `min-h-10`, `rounded-md` |
| Contenu du chapeau | **titre de la page principale** (`Opportunités`) — jamais le nom de l'onglet actif |
| Action du chapeau | retour à l'état racine (`/missions/opps`, chapitre `synthese`) |
| Titre de section | `Chapitres` (jamais « Sections » / « Navigation ») |
| Item actif | `border-l-edito-brass bg-edito-surface text-edito-navy`, `aria-current="page"` |
| Header de la zone principale | affiche **toujours** le nom exact du chapitre actif, **distinct** du chapeau |
| Section `Modules` | ancrée en bas (`mt-auto`), rendue **uniquement si ≥ 1 module contextuel réellement disponible**, sinon `contextualModules: undefined` |
| Navigation | **URL-addressable** : deep-link, refresh, back/forward reconstruisent le chapitre |
| Mobile | branche serveur distincte, jamais de CSS `hidden` sur un arbre Desktop lourd |
| Config navigation | jamais persistée en base — reste en TypeScript |
| Actions transverses | **hors du rail** — centralisées dans Cockpit Intelligence |

### 3.3 Modèle d'implémentation de référence : Engagements (`/missions`)

`src/components/missions/engagements/EngagementsDesktopView.tsx` intègre `<SectionRail>`
**inline** (pas d'adaptateur `LocalNavigation` séparé), pilote la navigation par **`?vue=`**,
le serveur choisit la vue via `pickView()` dans `src/app/(app)/missions/page.tsx`, et
`HEADER_TITLE_BY_VIEW[activeView]` alimente le header. Les chapitres 3-panneaux utilisent
`grid grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)]`.
C'est **le patron le plus proche de la cible Opportunités** — le Lot 1 s'en inspire
directement, en remplaçant `?vue=` par **`?section=`** (contrat homogène avec Veille / Reports /
Automations / Prospection / Finance / Consultants).

---

## 4. Route canonique et contrat URL

### 4.1 Route

- **Route canonique inchangée : `/missions/opps`** (OPP-02).
- Détail opportunité : `/missions/opps/[id]` (`src/app/(app)/missions/opps/[id]/page.tsx`) —
  **hors** shell `(tabbed)` (utilise seulement `missions/layout.tsx`). Édition :
  `/missions/opps/[id]/modifier/page.tsx`.
- Route legacy `/staffing` (`src/app/(app)/staffing/page.tsx`) → `redirect(resolveLegacyStaffingRedirect(...))`
  qui pointe aujourd'hui vers `/missions/opps?scope=staffing`. **À repointer** (Lot 11).

### 4.2 Contrat URL actuel (audité, `src/lib/needs-staffing/url-state.ts`)

| Param | Valeurs | Rôle |
|---|---|---|
| `scope` | `needs` \| `staffing` | **obligatoire** — `OpportunitesPage` redirige vers `?scope=needs` si absent. Bascule besoins ⇄ staffing. |
| `view` | `list` \| `kanban` \| `planning` | mode d'affichage (défaut `list`, omis de l'URL si `list`) |
| `stage` | libre | filtre étape |
| `priority` | `haute` \| `normale` \| `basse` | filtre priorité |
| `practice` | libre | filtre practice |
| `sort` | `acv` | tri ACV |
| `direction` | `asc` \| `desc` | sens du tri |

L'état est piloté **client-side** (`use-needs-staffing-url-state.ts` + `router.replace`). Le
serveur (`opps/page.tsx`) ne lit **que** `scope` (garde de redirection) et `getDashboardDevice()`.

### 4.3 Contrat URL cible

```
/missions/opps                         → Synthèse   (état racine canonique, SANS paramètre)
/missions/opps?section=besoins         → Besoins & staffing
/missions/opps?section=avant-vente     → Avant-vente
/missions/opps?section=planning        → Planning
```

- **`synthese` est l'état racine canonique sans paramètre** (OPP-04) : une navigation normale
  vers la Synthèse **supprime** `section` de l'URL.
- Le parser (`parseOpportunitiesSection`) est **déterministe** : valeur absente, `null`,
  `undefined` ou valeur inconnue → `synthese`. `?section=synthese` est accepté et résolu vers
  `synthese` (mais non produit par le builder).
- Le builder (`buildOpportunitiesSectionHref`) part de
  `new URLSearchParams(searchParams.toString())` et ne modifie **que** `section` :
  **tous les autres query params (tiers ou métier) sont préservés** — deep-link, refresh,
  Back / Forward, lien partagé.
- Changement de chapitre → `router.push()` (vraie entrée d'historique). Mutations de filtres /
  sélection d'entité → `router.replace()` (patron `/reports`). **Ne jamais mélanger ces
  responsabilités.**
- **Compatibilité des anciennes URLs `scope`** (OPP-14, NAVIGATION-01) :
  - `?scope=needs` (ou toute URL `/missions/opps` avec `scope` mais sans `section`) →
    **résolue vers `section=besoins`** ;
  - `?scope=staffing` → **résolue vers `section=besoins`** (le staffing devient le **rail
    droit** du chapitre Besoins, pas un chapitre) ;
  - la résolution se fait **au parsing** (pas de redirection dure si évitable) ; si une
    redirection s'impose (route `/staffing`, liens `main-menu` mobiles), elle est **permanente**
    et documentée. Aucun deep-link historique n'est cassé sans plan de migration explicite
    inscrit au ledger.
- **Sélection d'entité** (Planning / Besoins) : étudier `?opp=<id>` (patron `/reports?doc=`)
  pour rendre la sélection partageable entre Liste / Planning / Détails (PRODUCT-03).

---

## 5. Périmètre Desktop / Mobile

- **La refonte concerne le Desktop.** (OPP-07)
- **Mobile protégé.** Le Mobile actuel de `/missions/opps` : `NeedsStaffingWorkspace` branche
  `device === "mobile"` (via `getDashboardDevice()` dans `opps/page.tsx`), rend
  `NeedsMobileCards` (liste des besoins + staffings actifs dépliables, édition d'étape,
  simulation financière), charge un dataset mobile léger (`getMobileStaffingsList`,
  `getOpportunitiesList({ onlyStaffingNeeds: true })`, `getNeedsStaffingSharedData`).
- **Contrat Mobile partagé à protéger** : `getMobileTabsForPath()` dans
  `src/lib/navigation/main-menu.config.ts` — pour `pathname.startsWith("/missions/opps")` **ou**
  `/recruitment`, renvoie 2 onglets : `{ "Besoins & Staffing" → /missions/opps?scope=needs }`
  et `{ "Recrutement" → /consultants?section=candidats }`. **Toute évolution du contrat URL
  Desktop doit préserver ce groupement Mobile jusqu'à sa migration explicite** (Lot 11,
  coord. SHELL-0018 Phase 6).
- **Interdiction** : charger le nouveau Desktop puis le masquer en CSS sur Mobile. Le
  branchement `getDashboardDevice()` reste le principe ; on ne charge que les données de la
  vue rendue.
- **Aucun redesign Mobile** dans ce mini-chantier, sauf lot explicitement ajouté ultérieurement.
  Chaque lot UI Desktop **documente** l'impact sur les dépendances partagées Mobile.

---

## 6. Page de référence structurelle — `/reports` et `/missions`

La page de référence citée par le cadrage produit est **`/reports` (« Rapports & rédaction »)**.
En pratique, **`/missions` (« Engagements »)** est un modèle encore plus proche (même arbre de
route, `SectionRail` inline, `?vue=`, grille 3-panneaux identique).

| Fichier | Rôle | Réutilisable ? |
|---|---|---|
| `src/components/reports/ReportsDesktopView.tsx` | shell + header + grille 3 panneaux `grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,280px)]` ; `activeSection ===` par chapitre | **Référence de pattern** — ne pas dupliquer |
| `src/components/reports/ReportsLocalNavigation.tsx` | adaptateur `SectionRail` : `REPORTS_DESKTOP_CHAPTERS`, `getReportsDesktopChapterLabel`, `buildReportsRailProps` | patron d'adaptateur |
| `src/components/reports/reports-desktop-navigation.ts` | `parseReportsSection` / `buildReportsSectionHref` (préserve les query params tiers, `?doc=` orthogonal) | patron de helpers URL |
| `src/components/missions/engagements/EngagementsDesktopView.tsx` | `SectionRail` **inline** + `NAV_ENTRIES` + `HEADER_TITLE_BY_VIEW` + `useSidebarCollapse` | **patron direct du Lot 1** |
| `src/app/(app)/missions/page.tsx` | serveur : `pickView(?vue)` → charge les données de la vue rendue → passe le contenu en `children` | **patron direct de l'orchestrateur** |

**Aucune primitive/layout 3-panneaux réutilisable n'existe** dans le repo. `DesktopAnalyticalPage`
(`src/components/templates/`) est le template Finance (rail gauche + rail analytique **droit**),
pas un châssis Liste / Main / Détails. Le **Lot 2** construit une **primitive locale légère**
`OpportunitiesTriPanel` sous `src/features/opportunities/desktop/` — sans généraliser
prématurément un design system global tant qu'aucun second consommateur réel ne le justifie
(OPP-06).

---

## 7. Structure cible Desktop par chapitre

### 7.1 Rail secondaire

```
┌──────────────────────────┐
│       OPPORTUNITÉS        │  ← chapeau navy → /missions/opps (chapitre synthese)
├──────────────────────────┤
│ CHAPITRES                │
│ ▍ Synthèse               │  section=synthese (racine)
│   Besoins & staffing     │  section=besoins
│   Avant-vente            │  section=avant-vente
│   Planning               │  section=planning
│        espace flexible   │
├──────────────────────────┤
│ MODULES                  │  ← rendus seulement si réellement disponibles
│   Matching profil         │
│   Simulation devis        │
│   Post-Mortem             │
└──────────────────────────┘
```

`HEADER_TITLE_BY_SECTION` : `synthese → « Synthèse »`, `besoins → « Besoins & staffing »`,
`avant-vente → « Avant-vente »`, `planning → « Planning »`.

### 7.2 Chapitre Synthèse — **exception au shell 3 panneaux**

```
SectionRail │ Header « Synthèse » │ surface analytique PLEINE LARGEUR
```

Pas de rail `Liste`, pas de rail `Détails`. Contenu = KPI + graphiques + tableau échéances
(cf. § 9).

### 7.3 Chapitres Besoins & staffing / Avant-vente / Planning — **shell 3 panneaux**

```
SectionRail │ Header chapitre │  Liste (rail gauche) │ Vue principale │ Détails (rail droit)
```

- **Besoins & staffing** : `Liste besoins` │ `Détail du besoin` │ `Staffing en cours`.
- **Avant-vente** : `Liste` │ `Vue principale` │ `Détails` — **contenu métier vide en V1**,
  vrais `EmptyState`, aucune donnée fictive.
- **Planning** : `Liste opportunités` │ `Planning mensuel/annuel` │ `Détails opportunité sélectionnée`.

Primitive locale `OpportunitiesTriPanel` (Lot 2) : conteneur
`grid min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)]
overflow-hidden` ; slots `list` / `main` / `details` ; le rail droit dégrade en
`<aside aria-hidden />` quand aucune entité n'est sélectionnée (patron Engagements).

---

## 8. Architecture Data — tables et contrats

> ⚠️ **Vérifié live le 2026-09-09** (`information_schema` + comptages). `CLAUDE.md` annonce des
> chiffres périmés (24 opportunités, 18 `match_scores`). **Toujours recompter en base.**

### 8.1 `opportunities` (32 lignes)

| Colonne | Type | Remarque |
|---|---|---|
| `stage` | text, NOT NULL, défaut `'non_traitee'` | valeurs **live** : `gagne`(15) · `perdu`(7) · `abandonne`(5) · `recherche_profil`(2) · `cv_envoyes`(1) · `qualification`(1) · `contractualisation`(1). **5 opportunités ouvertes** (toutes des besoins de staffing). |
| `opportunity_type` | text | live : `staffing`(18) · `forfait`(4) · `null`(3) · `audit`(2) · `extension`(2) · `cross_sell`(2) · `conseil`(1) |
| `priority` | text, NOT NULL, défaut `'normale'` | |
| `conviction` | smallint, NOT NULL, défaut 50 | 0–100 |
| `company_id` | uuid | 31/32 |
| `practice` | **text libre**, nullable | **12 valeurs distinctes non normalisées** (`Cybersecurity` vs `Cybersecurity & SecOps`, `Data` vs `Data & AI` vs `Data Intelligence & Artificial Intelligence`…). **Aucune FK vers `offer_practices`.** Pas de `practice_id`. |
| `estimated_gain` | numeric, nullable | **29/32** peuplés |
| `weighted_gain` | numeric, **GENERATED** | `= (estimated_gain * conviction) / 100.0` — **`NULL` si `estimated_gain` NULL** (3/32) |
| `acv` | numeric, **GENERATED** | `= CASE WHEN duration_days IS NOT NULL AND target_daily_rate IS NOT NULL THEN duration_days * target_daily_rate ELSE NULL END` — **31/32** peuplés |
| `target_daily_rate` | numeric, nullable | 31/32 |
| `duration_days` | integer, nullable | 32/32 |
| `target_margin_pct` | numeric, nullable | non généré |
| `start_date` | date, nullable | **32/32** |
| `target_close_date` | date, nullable | **28/32** |
| `next_action_label` | text, nullable | |
| `next_action_at` | timestamptz, nullable | **2/32 seulement** — source d'échéance faible |
| `opened_at` | timestamptz, nullable, défaut `now()` | |
| `closed_at`, `win_reason`, `loss_reason` | | |
| `required_headcount` | smallint, NOT NULL, défaut 1 | |
| `requires_staffing` | boolean, NOT NULL, défaut `false` | live : `true`(26) / `false`(6) |
| `sector_id` | uuid, nullable | |
| `need_summary`, `seniority`, `location`, `remote_policy`, `source` | text | |
| `context` | jsonb, NOT NULL, défaut `{}` | |
| `tags` | text[], NOT NULL, défaut `{}` | |

**Étape commerciale — contrat canonique = `src/lib/opportunities/stages.ts`** (et non le
tableau de `CLAUDE.md`, qui est périmé) :

```
SalesStage = qualification · recherche_profil · cv_envoyes · entretien_client
           · contractualisation · gagne · perdu · abandonne · non_traitee
```

`stages.ts` fournit `OPPORTUNITY_STAGES` (avec `order`, `icon`, `color`, `isTerminal`),
`OPPORTUNITY_ACTIVE_STAGES`, `OPPORTUNITY_PIPELINE_STAGES`, `OPPORTUNITY_KANBAN_STAGES`,
`toCanonicalOpportunityStage` (alias legacy : `cv_sent→cv_envoyes`, `rt→entretien_client`,
`negociation/nego→contractualisation`, `win→gagne`, `lost→perdu`), `getOpportunityStageLabel`
(+ alias d'affichage `detection`, `besoin_confirme`), `isTerminalOpportunityStage`,
`isOpenOpportunityStage`, `getOpportunityPipelineIndex/Progress`. **Le chantier réutilise ce
module tel quel — il ne recrée aucune taxonomie d'étape.** (OPP-08)

### 8.2 `opportunity_candidates` (positionnements — staffing)

| Colonne | Type | Remarque |
|---|---|---|
| `opportunity_id`, `candidate_id` | uuid, NOT NULL | |
| `status` | text, NOT NULL | valeurs **live** : `retenu`(12) · `identifie`(5) · `abandonne`(5) · `refuse_client`(4) · `preselectionne`(3) · `refuse_candidat`(3) · `entretien_realise`(2) · `envoye_client`(2) · `propose_interne`(2) · `entretien_planifie`(1). Le code workspace référence aussi `gagne` (absent des données live). |
| `next_action` | text, nullable | prochaine action du positionnement |
| `status_changed_at`, `proposed_at`, `sent_to_client_at` | timestamptz | jalons datés |
| `positioning_origin`, `client_feedback`, `comment` | text | |

**Vocabulaire staffing — helpers existants** : `src/lib/needs-staffing/coverage.ts` :
- `NEGATIVE_TERMINAL_POSITIONING_STATUSES = { refuse_client, refuse_candidat, abandonne }` ;
- `COVERING_POSITIONING_STATUSES = { envoye_client, entretien_planifie, entretien_realise,
  retenu, gagne }` (contribue à la couverture d'un besoin) ;
- `isActivePositioningStatus` = **non** dans les terminaux négatifs ;
- `STAFFING_NEED_OR_FILTER` (PostgREST : `requires_staffing.is.true,and(requires_staffing.is.null,required_headcount.gt.0)`).

> ⚠️ **`opportunities.stage` ≠ `opportunity_candidates.status`.** L'un est l'**étape commerciale
> de l'opportunité**, l'autre l'**avancement d'un profil sur cette opportunité**. Ne jamais les
> fusionner ni les mapper implicitement (cf. PRODUCT-01, et C-07 du Consultants Workspace pour
> la doctrine « trois vocabulaires distincts »).

### 8.3 `opportunity_skills` (55+ lignes)

`opportunity_id`, `skill_id` (FK `skills`), `importance` (text : **`indispensable` · `souhaitee` ·
`bonus`**), `min_level` (smallint), `min_years` (smallint), `weight` (smallint, NOT NULL).
Contrainte métier connue : max 2 `opportunity_contacts` par opportunité (trigger).

### 8.4 `person_skills` (vivier — via `persons`)

`person_id`, `skill_id`, `level` (1–5), `years`, `last_used_year`, `confidence` (0–1),
`source`, `profile_rank` (smallint).

### 8.5 `candidates`

`status` (text) — valeurs **live** : `vivier` · `recrute` · `en_process` · `nouveau` ·
`qualifie` · `indisponible` · `ko_manager` · `propose` · `refuse` · `archive`.
`practice_id` (FK `offer_practices`), `job_profile_id`, `person_id`, `seniority`,
`available_from` (date), `notice_period_days`, `expected_salary`, `expected_daily_rate`,
`current_title`, `experience_years`.
**Définition du vivier → réutiliser le contrat Consultants Workspace** (C-16 : `status='vivier'`
provisoire ; C-26 : qualification via jalon `candidate_hiring_milestones`). **Ne recréer aucune
définition concurrente.** (DATA-02)

### 8.6 `calendar_events`

`opportunity_id` (**208 lignes** rattachées, dont **34 futures**), `opportunity_candidate_id`,
`candidate_id`, `mission_id`, `company_id`, `contact_id`, `event_type` (text, 16 types —
migration 026), `status`, `starts_at`, `ends_at`, `all_day`.

### 8.7 `match_scores` (644 lignes / 24 opportunités)

`opportunity_id`, `person_id`, `overall_score`, `scores` (jsonb — C1..C6), `model_version`,
`source_run_id`. **Cache du moteur `src/lib/staffing-matching/`** (100 % déterministe,
besoin-centrique : `runOpportunityMatching(opportunityId)`). Aucun recalcul, aucun batch global.

### 8.8 `companies`

Utilisée pour le libellé client et la répartition du pipe par client. `meta_logo_path` (colonne
générée — privilégier à `metadata`). Pas de nouvelle taxonomie de Practice ni de client.

### 8.9 Loaders et helpers existants (source de vérité côté code)

| Fichier | Produit |
|---|---|
| `src/app/(app)/missions/_data/get-needs-staffing-shared.ts` | `NeedsStaffingSharedData` : `kpis {openNeedsCount, activePositioningsCount, coverageRate}`, `openNeeds[]`, `coverageByOpportunityId` |
| `src/app/(app)/missions/_data/get-opportunities-list.ts` | `MissionsListRow[]` (option `onlyStaffingNeeds`) |
| `src/app/(app)/missions/_data/get-opportunities-planning.ts` | `OpportunityPlanningData[]` (avec `candidates[]` + `interactions[]`) |
| `src/app/(app)/missions/_data/get-opportunity-detail.ts` | détail opportunité |
| `src/app/(app)/missions/_data/get-opportunity-skills-cloud.ts` | nuage de compétences |
| `src/app/(app)/staffing/_data/get-staffings-list.ts` | `StaffingListRow[]`, `MobileStaffingRow[]` (part de `opportunity_candidates`) |
| `src/app/(app)/staffing/_data/get-staffings-planning.ts` | `StaffingPlanningData[]` |
| `src/lib/needs-staffing/coverage.ts` | `calculateCoverageMetrics`, statuts couvrants/actifs, `STAFFING_NEED_OR_FILTER` |
| `src/lib/needs-staffing/model.ts` | `filterNeedsRows`, `filterStaffingRows`, `cycleAcvSort` |
| `src/lib/opportunities/stages.ts` | taxonomie d'étape commerciale (§ 8.1) |
| `src/lib/staffing-matching/` | moteur de matching unique (`runOpportunityMatching`, `use-opportunity-matching`) |

---

## 9. Chapitre Synthèse — cible fonctionnelle

> **Exception au shell 3 panneaux** : `SectionRail` + Header « Synthèse » + surface analytique
> pleine largeur. Pas de rail Liste ni Détails.
>
> View-model **serveur unique** (Lot 3), builder **pur testé** + loader mince `server-only`
> (patron `buildConsultantsSynthese` / `buildPoolCompetencesDataset`). **Aucun recalcul côté
> composant**, aucun second loader qui recompterait différemment un KPI déjà défini.

### 9.1 Trois KPI

| KPI | Définition | Source / réutilisation |
|---|---|---|
| **Nombre de besoins ouverts** | = `NeedsStaffingSharedData.kpis.openNeedsCount` : opportunités « besoin de staffing » (`isStaffingNeedOpportunity`) dont l'étape n'est pas terminale. Live : **5**. | **Réutiliser `getNeedsStaffingSharedData`** — ne pas recalculer. |
| **Nombre de positionnements actifs** | = `NeedsStaffingSharedData.kpis.activePositioningsCount` : `opportunity_candidates` dont `status` ∉ `{refuse_client, refuse_candidat, abandonne}`. | **Réutiliser `getNeedsStaffingSharedData`.** |
| **CA du pipe des opportunités** | **⚠️ non tranché — voir `OPEN QUESTION DATA-01`.** | à figer au Lot 3 avant toute UI |

### 9.2 `OPEN QUESTION DATA-01` — définition canonique du « CA du pipe »

Aucun contrat serveur canonique n'existe. Deux définitions coexistent dans le code, **et elles
diffèrent** :

| Option | Formule | Couverture live | Porteur actuel |
|---|---|---|---|
| **A** — `weighted_gain` DB | `Σ (estimated_gain × conviction/100)` sur les opps **ouvertes** | `estimated_gain` = 29/32 → **`weighted_gain` NULL sur 3 opps** | colonne générée `opportunities.weighted_gain` |
| **B** — pipe pondéré UI | `Σ ((acv ?? estimated_gain ?? 0) × conviction/100)` sur les opps **ouvertes** | `acv` = 31/32, fallback `estimated_gain`, sinon 0 | `src/components/missions/OpportunitiesKpiSection.tsx` (`getWeightedValue`) |
| **C** — pipe brut | `Σ (acv ?? estimated_gain)` sans pondération conviction | idem B | — |
| **D** — restreint au type/périmètre | A ou B **filtré** `requires_staffing` ou `opportunity_type='staffing'` | — | — |

**Impacts :** l'option retenue **contraint** le graphique Pipe (§ 9.3) — la somme globale du KPI
**doit** égaler (aux arrondis près) la somme des catégories du graphique. **La Synthèse UI n'est
pas considérée prête tant que DATA-01 n'est pas tranchée** (résolution au Lot 3, inscrite au
Decision Log comme OPP-15).

### 9.3 Graphique « Pipe » — interrupteur `Clients | Practices`

- Répartition du **CA du pipe** (mesure **identique** au KPI DATA-01) par **client**
  (`opportunities.company_id → companies.name`) ou par **practice**
  (`opportunities.practice`, texte libre — **aucune nouvelle taxonomie**).
- **Practice** : réutiliser la **cascade de résolution du Consultants Workspace (C-17)** —
  rapprochement exact `offer_practices.name` (normalisé) puis heuristique `getPracticeByName`
  (`src/lib/config/practices.ts`) puis bucket `null` « Autre / non rattaché ». Aucune migration.
- **Invariant** : `somme globale KPI == somme des catégories` (aux arrondis près) — testé.
- SVG maison Desktop, barres HTML Mobile (mais Mobile hors périmètre en V1 → Desktop seul).

### 9.4 Graphique « Compétences » — Top 5 demandées VS Top 5 vivier

- **Demandées** : `opportunity_skills` (des opportunités **ouvertes**) → `skills.name`.
- **Vivier** : `person_skills` filtré sur la **population vivier canonique du Consultants
  Workspace** — **ne recréer aucune définition de « candidat actif » / « candidat vivier »**
  (`DATA-02` ; lire `docs/FEATURES/consultants_workspace/` avant de figer ce dataset).
- **Critère de classement** — à décider et **justifier** au Lot 3 (`OPEN QUESTION DATA-02b`) :
  (a) nombre de profils portant la compétence ; (b) nombre d'occurrences ;
  (c) pondéré par `opportunity_skills.importance/weight` (côté demande) et
  `person_skills.level/profile_rank` (côté offre) ; (d) filtré `min_level`.
  **Recommandation** : (a) nombre de profils distincts côté vivier, (c) `weight`+`importance`
  côté demande — mais non figé.

### 9.5 Graphique « Processus » — étapes par opportunité

Modélisation demandée : *« étapes du processus pour chaque opportunité : qualification, envoi de
CV, présentation candidat, etc. »*.

- **Ne pas fusionner** `opportunities.stage` (étape **commerciale**) et
  `opportunity_candidates.status` (avancement **staffing/candidat**).
- Modèle d'affichage **déterministe par opportunité** (`OPEN QUESTION PRODUCT-01`) :
  ```
  [ étape commerciale de l'opportunité : stages.ts / OPPORTUNITY_ACTIVE_STAGES ]
  +
  [ progression staffing agrégée : nb positionnements par bucket
    identifié → proposé/présélectionné → envoyé client → entretien → retenu/gagné ]
  ```
  Deux dimensions **superposées, jamais confondues**. Toute nouvelle taxonomie
  (buckets de progression staffing) est **explicitement décidée** au Lot 3, pas implicite.
- Entonnoir SVG maison. Étapes à 0 incluses. Étapes terminales négatives hors entonnoir.

### 9.6 Tableau « 5 prochaines échéances »

- **Concept normalisé `OpportunityDeadline`** — **livré au Lot 8** (builder unique
  `src/features/opportunities/planning/data/build-opportunity-deadlines.ts`, cf. § 12) :
  ```
  { opportunityId, opportunityTitle, client, source, label, dueAt, calendarEventType }
  source = next_action | calendar_event | target_close
  ```
- **Règle d'arbitrage figée — OPP-28 (résout DATA-03)** : pour chaque opportunité **ouverte**,
  parmi les dates **futures ou du jour**, on retient **une seule** échéance par priorité :
  1. `opportunities.next_action_at` ;
  2. prochain `calendar_events.starts_at` (hors évènements `cancelled`) ;
  3. `opportunities.target_close_date`.
  `opportunities.start_date` n'est **jamais** une échéance. Les jalons `opportunity_candidates`
  (`sent_to_client_at`…) sont des dates **passées** de suivi → hors périmètre V1.
- Tri `dueAt ASC`, `LIMIT 5` (côté Synthèse), opportunités ouvertes uniquement. Le Planning
  (Lot 9) consomme le **même** builder, sans `LIMIT`.

---

## 10. Chapitre Besoins & staffing — cible fonctionnelle

Shell 3 panneaux :

```
Rail Liste (gauche)          │ Surface centrale            │ Rail Détails (droite)
liste des besoins ouverts    │ détails complets du besoin  │ « Staffing en cours »
recherche / filtres utiles   │ (fiche / drawer réutilisé)  │ positionnements actifs du besoin
sélection du besoin actif    │                             │ ouverture du détail staffing
```

### 10.1 Rail Liste (gauche)

- Liste des **besoins ouverts** : `getOpportunitiesList({ onlyStaffingNeeds: true })` filtré
  sur étape non terminale (ou nouveau loader mince candidate au Lot 5).
- Recherche + filtres **utiles conservés** : étape (`stages.ts`), priorité, practice. Le tri
  ACV et les filtres actuels sont réutilisables (`filterNeedsRows` de
  `src/lib/needs-staffing/model.ts`).
- Sélection du besoin actif → `?opp=<id>` (URL-addressable, PRODUCT-03).

### 10.2 Surface centrale — détail du besoin

- **Réutiliser** la fiche/drawer/detail existant :
  `src/components/missions/opportunity-detail/OpportunityDetailView.tsx` (rendue en plein écran
  par `/missions/opps/[id]`), ou le drawer `AssistanceCaseDrawer` (perspective `opportunity`,
  onglet `besoin`). **Ne dupliquer aucun modèle de détail opportunité.**
- Décision de forme (panneau inline vs drawer vs iframe de la route `[id]`) à trancher au
  Lot 6 (`OPEN QUESTION PRODUCT-04`).

### 10.3 Rail Détails (droite) — « Staffing en cours »

- Positionnements **actifs** du besoin sélectionné : `getStaffingsList()` filtré par
  `opportunityId` + `isActivePositioningStatus`.
- Réutiliser `StaffingListWorkspaceView` / `StaffingListView` / les cartes staffing existantes.
- **Un seul système de drawer** : `useStaffingDrawerStore` (`openStaffingDrawer(id, tab)`).
  **Ne pas créer un second système de drawer.**

### 10.4 Capacités legacy « Besoins & staffing » — classification (OPP-13)

Le workspace actuel possède **davantage de capacités** que la cible explicitement décrite.
**Aucune n'est supprimée silencieusement.** Classification (à confirmer au Lot 6) :

| Capacité legacy | Fichier | Traitement proposé | Chapitre / lot cible |
|---|---|---|---|
| Vue **Liste** besoins | `NeedsListView.tsx` (434) | **REUSE / REFACTOR** | Besoins — rail Liste + centrale (Lot 6) |
| Vue **Liste** staffing | `StaffingListWorkspaceView.tsx` (153), `StaffingListView.tsx` (195) | **REUSE** | Besoins — rail Détails « Staffing en cours » (Lot 6) |
| Bascule **`?scope=` besoins/staffing** | `NeedsStaffingWorkspace` + `url-state.ts` | **DEPRECATE** — devient Liste + rail Détails d'un même chapitre | Lot 6 / compat Lot 11 |
| Vue **Kanban** besoins | `OpportunitiesKanbanView.tsx` (189) | **KEEP conditionnel** — à conserver comme mode secondaire du chapitre Besoins (`?view=kanban`) **ou** DEPRECATE si non retenu | `OPEN QUESTION PRODUCT-02` (Lot 6) |
| Vue **Kanban** staffing / flip besoin↔candidat | `StaffingKanbanView.tsx` (230) + `kanbanDisplayMode` | **KEEP conditionnel** — idem | PRODUCT-02 (Lot 6) |
| Vue **Planning** besoins | `OpportunitiesPlanningView.tsx` (694) | **MOVE / REFACTOR** vers chapitre Planning | Lot 8-9 |
| Vue **Planning** staffing | `StaffingPlanningView.tsx` (309) | **MOVE / REFACTOR** vers chapitre Planning | Lot 8-9 |
| Vue **Planning unifiée** (besoin + staffing, échelles mois/trim/année/semaine) | `UnifiedPlanningView.tsx` (667) | **MOVE / REFACTOR** — base du chapitre Planning | Lot 9 |
| **Filtres** (étape, priorité, practice, tri ACV) | `model.ts`, `PageFilterBar` | **KEEP** | Besoins (Lot 6) |
| **Édition rapide d'étape** (besoin & staffing) | `StageQuickEditorDialog.tsx` (242), `StageTimeline.tsx` (248), `update-opportunity.ts`, `update-staffing-stage.ts` | **KEEP + REUSE** | Besoins (Lot 6) |
| **Création opportunité** | `NewOpportunityButton.tsx` (42), `create-opportunity.ts` (121) | **KEEP** — action du header Besoins (ou Synthèse) | Lot 6 |
| **Création staffing** | `NewStaffingButton.tsx` (270), `opportunity-staffing.ts` (270) | **KEEP** — action du rail « Staffing en cours » | Lot 6 |
| **Simulation financière** par positionnement | import `FinancialModelingDesktopDialog` + `getFinancialModelForStaffingAction` | **KEEP** — déplacée vers le module « Simulation devis » + action de ligne staffing | Lot 10 |
| **KPI partagés** (besoins ouverts, positionnements, couverture) | `SharedKpis` + `get-needs-staffing-shared.ts` | **REUSE** — alimentent la Synthèse | Lot 3-4 |
| Drawer `AssistanceCaseDrawer` (perspectives candidate/opportunity) | `src/components/staffing/`, `use-staffing-drawer-store.ts` | **KEEP** — drawer unique du workspace | tous lots |
| `OpportunitiesDesktopView.tsx` | `src/components/missions/` | **DEPRECATE → REMOVE AFTER PARITY** — orphelin (0 import externe) | Lot 12 |
| `OpportunitiesKpiSection.tsx` | `src/components/missions/` | **REVIEW** — `getWeightedValue` = option B de DATA-01 ; réconcilier ou déprécier | Lot 3 |
| Route `/staffing` (redirect) | `src/app/(app)/staffing/page.tsx` | **REFACTOR** — repointer la redirection | Lot 11 |
| `StaffingTabbedShell` / `StaffingDesktopView` / `StaffingMobileView` / `StaffingDesktopDashboard` | `src/components/staffing/` | **AUDIT** — vérifier consommateurs réels au Lot 6 ; DEPRECATE si orphelins | Lot 6 / Lot 12 |

---

## 11. Chapitre Avant-vente — cible fonctionnelle

Libellé : **Avant-vente**. Intention métier : **projets / avant-vente**.

**Première version = structure uniquement :**

```
rail Liste (vide, vrai EmptyState)  │ surface principale (vrai EmptyState)  │ rail Détails (vide)
```

- **Aucun faux projet, aucune donnée seed, aucun modèle métier inventé.** `EmptyState`
  authentiques uniquement.
- **Question produit future à identifier** (`OPEN QUESTION PRODUCT-05`) : relation entre
  **opportunité commerciale**, **projet avant-vente** et **mission / projet gagné**
  (`projects` existe déjà — `src/app/(app)/missions/projets` / domaine `projects` en base).
  Tant que ce modèle n'est pas cadré, le chapitre reste structurel.

---

## 12. Chapitre Planning — cible fonctionnelle

Objectif : **représentation mensuelle et annuelle des échéances des opportunités ouvertes**.

Shell 3 panneaux :

```
Liste opportunités  │  Planning (calendrier mois / année)  │  Détails opportunité sélectionnée
```

- **Sélecteur `Mois | Année`** (le legacy `UnifiedPlanningView` propose déjà
  mois/trimestre/année/semaine via `planningScale` — à restreindre/adapter, pas à reconstruire).
- **Ne pas reconstruire un deuxième moteur de planning** : auditer et **adapter**
  `UnifiedPlanningView` / `OpportunitiesPlanningView` / `get-opportunities-planning.ts`
  (Lot 9).
- **Sélection d'opportunité partagée** entre Liste / Planning / Détails —
  **URL-addressable `?opp=<id>`** (patron `/reports?doc=`, PRODUCT-03).
- **Builder d'échéances unique `OpportunityDeadline`** (Lot 8), **réutilisé par la Synthèse
  (§ 9.6) ET le Planning**. Il n'existe qu'**un seul** builder de deadlines. (OPP-12)

---

## 13. Modules contextuels

Règle SHELL-0018 Lot 3.1 : un module n'apparaît dans `contextualModules` que si
(1) il a une utilité directe dans la page, (2) il reçoit son contexte sans reconstruction
manuelle, (3) son point d'ouverture est **réellement fonctionnel**. Sinon : **non déclaré**.
**Aucun bouton mort. Aucun « bientôt disponible » dans le rail.** Les actions transverses
restent hors du rail (Cockpit Intelligence).

### 13.1 Matching profil

- **Exigence produit** : donner accès au **même module que la page Consultants**.
- Le Consultants Workspace expose `src/features/consultants/modules/profile-matching/`
  (`ProfileMatchingDesktop`, `ProfileMatchingMobile`, `build-profile-matching.ts`,
  `get-profile-matching.ts`) — **projection profil-centrique en lecture seule** du cache
  `match_scores` du **moteur unique** `src/lib/staffing-matching/` (C-09 / C-32).
- **Ne pas** : copier le composant, forker le loader, recréer un moteur, recalculer
  `match_scores`.
- Le workspace Opportunités étant **besoin-centrique**, le module contextuel ici ouvre
  naturellement **besoin → profils compatibles**. UI besoin-centrique existante :
  `src/components/staffing/matching/MatchingDialog.tsx` + `MatchingResultsDesktop/Mobile` +
  `src/lib/staffing-matching/use-opportunity-matching.ts` (`runOpportunityMatching`,
  déclenché unitairement).
- `OPEN QUESTION CROSS-01` : quel **point d'entrée partagé minimal** expose proprement le
  module — extraire un launcher commun (contexte `opportunityId` optionnel) sans dupliquer
  la donnée ni le moteur. À trancher au Lot 10.

### 13.2 Simulation devis

- **Exigence** : ouvre **la modale de modélisation financière existante**.
- Le workspace importe **déjà** `FinancialModelingDesktopDialog`,
  `getFinancialModelForStaffingAction`, `FinancialModelingLaunchPreset` depuis
  `@/features/financial-modeling` — utilisés aujourd'hui par positionnement staffing.
- **Réutiliser tel quel. Aucune deuxième modale.** Le module contextuel préserve le contexte
  d'opportunité/besoin sélectionné (`opportunityId`, `companyId`, `salesDailyRate`,
  `opportunityTitle`) quand il existe (le preset `mode: "flash"` existe déjà).
- Mobile : `FinancialModelingMobileFlow` (déjà importé — protégé).

### 13.3 Post-Mortem

- **Exigence** : ouvre la fonctionnalité « Mission : post-mortem commercial ».
- La mission existe : slug **`post-mortem-commercial`**, `MISSION_CATALOG[5]`
  (`src/features/intelligence-missions/domain/mission-catalog.ts`), action
  `post_mortem_pipeline` du registre (`src/lib/intelligence/intelligence-registry.ts`),
  config composeur `MISSION_COMPOSER_ACTION_CONFIGS.post_mortem_pipeline`
  (`src/features/intelligence-missions/components/mission-composer-model.ts` — `inputKind`
  période pipeline trimestrielle), launcher `use-mission-launcher.ts` +
  `MissionComposerDesktop` / `MissionComposerMobile`.
- **Réutiliser** : catalogue de missions, composeur, launcher, workflow existant
  (`mission-001-run`). **Ne créer aucune nouvelle mission, aucun workflow n8n, aucun duplicate
  trigger.** Le module Opportunités devient seulement un **nouveau point d'entrée contextuel**.
- `OPEN QUESTION CROSS-02` : quel **launcher officiel** ouvre `post-mortem-commercial` depuis
  un module contextuel (réutiliser `MissionComposerDesktop` monté en dialog, ou un launcher
  dédié). À trancher au Lot 10.

### 13.4 Modélisation de CA — **Future capability, NON affichée** (OPP-11)

- Statut produit : **À venir**. Aucune capacité réelle implémentée.
- Enregistré dans « Future capabilities » (ce document + ledger) mais **NON rendu** dans
  `SectionRail.contextualModules` tant qu'aucune capacité réelle n'existe — pour protéger
  l'invariant « aucun module mort ».
- Entrée de Decision Log explicite (**OPP-11**). Aucun lot d'implémentation prévu dans le
  mini-chantier courant sauf demande ultérieure.

### 13.5 État de rendu des modules par lot

| Module | Rendu dans le rail | Portée |
|---|---|---|
| Matching profil | **✅ Lot 10** (`OPP-30`) | **tous les chapitres** ; contexte `?opp=` transmis s'il existe, sinon écran d'aiguillage vers la liste des besoins |
| Simulation devis | **✅ Lot 10** (`OPP-30`) | **tous les chapitres** ; préset opportunité si `?opp=`, flash nu sinon. L'action par-ligne du rail Staffing (Lot 6) **n'est pas retirée** |
| Post-Mortem | **✅ Lot 10** (`OPP-30`) | **tous les chapitres** (mission trimestrielle, sans opportunité) |
| Modélisation de CA | — jamais | Future capability, non déclarée (OPP-11) |

Lots 1→9 : `contextualModules: undefined`. Depuis le Lot 10, la section « Modules » rend
**les 3 modules, identiques sur tous les chapitres** — ils ne dépendent jamais de l'onglet
consulté. Contrat URL : `?module=matching|simulation|post-mortem`, orthogonal à `?section=` /
`?opp=`, retiré au changement de chapitre.

---

## 14. Architecture applicative cible

### 14.1 Emplacement — feature verticale `src/features/opportunities/`

Convention KREDO récente (cf. `business-intelligence`, `knowledge-hub`, `consultants`).
**Cible progressive** (pas une obligation de tout déplacer au Lot 1) :

```
src/features/opportunities/
├── index.tsx            ← Server Component : résout section + device, distribue
├── navigation/          ← SECTIONS, HEADER_TITLE_BY_SECTION, parse/build href, compat `scope`
├── data/                ← loaders Supabase + view-models (server-only) : synthèse, besoins, planning
├── desktop/             ← OpportunitiesDesktopShell (SectionRail inline) + OpportunitiesTriPanel + vues
├── mobile/              ← couture serveur (Mobile legacy protégé, pas de nouvelle nav)
├── summary/             ← chapitre Synthèse (KPI, graphiques SVG maison, tableau échéances)
├── needs/               ← chapitre Besoins & staffing (liste, détail, staffing en cours)
├── presales/            ← chapitre Avant-vente (structure + EmptyState V1)
├── planning/            ← chapitre Planning (+ builder OpportunityDeadline partagé Synthèse/Planning)
├── modules/             ← points d'entrée Matching profil · Simulation devis · Post-Mortem
└── __tests__/
```

### 14.2 Migration progressive, sans big-bang

- **Ne pas** déplacer immédiatement tout le legacy. Chaque lot **extrait / réutilise / adapte /
  migre**, puis **supprime après parité prouvée**.
- Les composants existants (`src/components/needs-staffing/`, `src/components/staffing/`,
  `src/components/missions/`) restent à leur emplacement tant qu'un lot ne les déplace pas.
- Les Server Actions de `src/app/(app)/missions/_actions/` sont **réutilisées / refactorées**,
  jamais dupliquées. Elles pourront être déplacées vers
  `src/features/opportunities/*/actions/` aux lots concernés.
- Préférer **extraire → réutiliser → adapter → migrer → supprimer après parité** plutôt qu'un
  big-bang.

### 14.3 Route et layout

- La route `/missions/opps` reste `src/app/(app)/missions/`.
- **Lot 1** : `/missions/opps` **sort du groupe `(tabbed)`** — nouveau fichier de route
  `src/app/(app)/missions/opps/page.tsx` (à côté de `opps/[id]/`), point d'entrée fin qui lit
  `?section=` et délègue à `src/features/opportunities/`. L'ancien
  `src/app/(app)/missions/(tabbed)/opps/page.tsx` est retiré **une fois** la nouvelle page
  prouvée à parité (`REMOVE AFTER PARITY`).
- `src/app/(app)/missions/(tabbed)/layout.tsx` (`SectionNavBarSlot` + `MissionsTabbedShell`)
  **reste** pour `/missions/actives` et `/missions/projets` jusqu'à SHELL-0018 Phase 6 —
  **le Lot 1 ne le modifie pas**.
- La suppression de `SectionNavBarSlot` et la sortie complète de `(tabbed)` sont **coordonnées
  avec SHELL-0018 Phase 6.3** (Lot 11).

---

## 15. Inventaire de l'existant — matrice de traitement

Traitements : `KEEP` · `MOVE` · `REUSE` · `REFACTOR` · `DEPRECATE` · `REMOVE AFTER PARITY` · `NEW`.

| Capacité actuelle | Fichier | Cible | Traitement |
|---|---|---|---|
| Orchestrateur workspace (server) | `src/app/(app)/missions/(tabbed)/opps/page.tsx` | `src/app/(app)/missions/opps/page.tsx` (hors `(tabbed)`) + `src/features/opportunities/index.tsx` | REFACTOR → REMOVE AFTER PARITY |
| Shell client monolithique | `src/components/needs-staffing/NeedsStaffingWorkspace.tsx` (895) | éclaté en `OpportunitiesDesktopShell` + chapitres | REFACTOR |
| `SectionNavBarSlot` sur `/missions/opps` | `src/app/(app)/missions/(tabbed)/layout.tsx` | rail V2 porté par la feature | REMOVE AFTER PARITY (Lot 1 local / Lot 11 global, coord. Phase 6) |
| `MissionsTabbedShell` (SectionTabBar + onglets entités) | `src/components/missions/MissionsTabbedShell.tsx` | non repris pour Opportunités (drawer unique conservé) | DEPRECATE pour cette route (Lot 1) — reste pour `actives`/`projets` |
| Contrat URL `?scope=` / helpers | `src/lib/needs-staffing/url-state.ts`, `use-needs-staffing-url-state.ts` | `src/features/opportunities/navigation/` (`?section=` + compat `scope`) | REFACTOR |
| Filtres / tri / bascule | `src/lib/needs-staffing/model.ts` | chapitre Besoins | KEEP + REUSE |
| Métriques couverture / statuts | `src/lib/needs-staffing/coverage.ts` | Synthèse + Besoins | KEEP + REUSE |
| Taxonomie d'étape commerciale | `src/lib/opportunities/stages.ts` | inchangée | KEEP |
| KPI partagés | `src/app/(app)/missions/_data/get-needs-staffing-shared.ts` | view-model Synthèse | REUSE |
| Liste opportunités (loader) | `src/app/(app)/missions/_data/get-opportunities-list.ts` | Besoins — rail Liste | REUSE / REFACTOR |
| Planning opportunités (loader) | `src/app/(app)/missions/_data/get-opportunities-planning.ts` | chapitre Planning + builder échéances | REUSE / REFACTOR |
| Détail opportunité (loader + vue) | `_data/get-opportunity-detail.ts`, `src/components/missions/opportunity-detail/OpportunityDetailView.tsx` | Besoins — surface centrale ; route `[id]` conservée | REUSE |
| Nuage de compétences opp | `_data/get-opportunity-skills-cloud.ts` | Synthèse (graphique compétences) — à évaluer | REUSE |
| Staffing (loaders) | `src/app/(app)/staffing/_data/get-staffings-list.ts`, `get-staffings-planning.ts` | Besoins — rail « Staffing en cours » + Planning | REUSE |
| Vues Liste besoins/staffing | `NeedsListView.tsx`, `StaffingListWorkspaceView.tsx`, `StaffingListView.tsx` | Besoins — Liste + Détails | REUSE / REFACTOR |
| Vues Kanban | `OpportunitiesKanbanView.tsx`, `StaffingKanbanView.tsx` | Besoins — mode secondaire OU DEPRECATE | KEEP conditionnel (PRODUCT-02) |
| Vues Planning | `OpportunitiesPlanningView.tsx`, `StaffingPlanningView.tsx`, `UnifiedPlanningView.tsx` | chapitre Planning | MOVE / REFACTOR |
| Édition rapide d'étape | `StageQuickEditorDialog.tsx`, `StageTimeline.tsx`, `stage-timeline-config.ts` | Besoins | KEEP + REUSE |
| Création opportunité | `NewOpportunityButton.tsx`, `_actions/create-opportunity.ts`, `_actions/update-opportunity.ts` | Besoins / Synthèse (header action) | KEEP |
| Création staffing | `NewStaffingButton.tsx`, `_actions/opportunity-staffing.ts`, `_actions/update-staffing-stage.ts` | Besoins — rail « Staffing en cours » | KEEP |
| Autres actions opp | `_actions/opportunity-{contacts,events,interactions,skills}.ts`, `search-*.ts`, `upsert-account.ts` | inchangées (drawer/détail) | KEEP |
| Drawer unique | `src/components/staffing/AssistanceCaseDrawer.tsx` + `src/hooks/use-staffing-drawer-store.ts` | drawer du workspace | KEEP |
| Simulation financière (import existant) | `@/features/financial-modeling` (`FinancialModelingDesktopDialog`…) | module « Simulation devis » | KEEP + REUSE |
| Route `/staffing` (redirect) | `src/app/(app)/staffing/page.tsx`, `src/lib/needs-staffing/url-state.ts::resolveLegacyStaffingRedirect` | redirection repointée `?section=besoins` | REFACTOR (Lot 11) |
| `OpportunitiesDesktopView.tsx` | `src/components/missions/OpportunitiesDesktopView.tsx` | — (orphelin, 0 import externe) | DEPRECATE → REMOVE AFTER PARITY (Lot 12) |
| `OpportunitiesKpiSection.tsx` | `src/components/missions/OpportunitiesKpiSection.tsx` | Synthèse KPI (après DATA-01) | REVIEW / REFACTOR ou DEPRECATE |
| `StaffingTabbedShell` / `StaffingDesktopView` / `StaffingDesktopDashboard` / `StaffingMobile*` | `src/components/staffing/` | à auditer (consommateurs réels) | AUDIT → KEEP ou DEPRECATE (Lot 6/12) |
| `getMobileTabsForPath` groupe `/missions/opps` + `/recruitment` | `src/lib/navigation/main-menu.config.ts` | préservé jusqu'à migration Mobile explicite | KEEP (Lot 11) |
| Entrée menu « Besoins & Staffing » (`/missions/opps`) | `src/lib/navigation/main-menu.config.ts` (`mainMenuItems`) | libellé → « Opportunités » | REFACTOR (Lot 11, coord. Phase 6) |
| Chapitre Synthèse (KPI + graphiques + échéances) | — | `src/features/opportunities/summary/` | NEW |
| Primitive 3-panneaux locale | — | `src/features/opportunities/desktop/OpportunitiesTriPanel.tsx` | NEW |
| Chapitre Avant-vente (structure) | — | `src/features/opportunities/presales/` | NEW |
| Builder `OpportunityDeadline` | — | `src/features/opportunities/planning/` (partagé Synthèse + Planning) | NEW |
| Points d'entrée modules | — | `src/features/opportunities/modules/` (vers capacités existantes) | NEW (câblage only) |

---

## 16. DECISION LOG

> IDs stables. Toute décision issue d'un audit de lot s'ajoute ici.

| ID | Décision | Raison | Statut |
|---|---|---|---|
| **OPP-01** | **« Besoins & staffing » devient « Opportunités »** — workspace unique de pilotage des opportunités commerciales, du staffing, de l'avant-vente et des échéances. | Un besoin de staffing est une facette d'une opportunité ; la surface actuelle est un fourre-tout sans hiérarchie. | Actée (Lot 0) |
| **OPP-02** | **`/missions/opps` reste la route canonique initiale.** Aucun `/opportunities` / `/opportunites` sans décision produit ultérieure. C'est un changement de workspace/navigation, pas de `pathname`. | Continuité des deep-links ; le cadrage exclut une migration de pathname. | Actée (Lot 0) |
| **OPP-03** | **`SectionRail` V2 (SHELL-0018) est le standard Desktop** du workspace. Pas de nouveau châssis de navigation. Largeur `11.5rem`, chapeau navy, header = chapitre actif, config en TypeScript. | Standard stabilisé (Phases 1→5 closes) ; homogénéité avec Veille/Reports/Automations/Prospection/Finance/Consultants. | Actée (Lot 0) |
| **OPP-04** | **`synthese` est le chapitre racine canonique**, rendu **sans paramètre `section`**. Contrat URL : `?section=synthese\|besoins\|avant-vente\|planning`. | Homogène avec les autres surfaces V2 ; deep-link/refresh/back-forward. | Actée (Lot 0), contrat révisable si conflit code réel |
| **OPP-05** | Les **3 chapitres non-Synthèse suivent le shell 3 panneaux Liste / Main / Détails** ; **Synthèse est une exception** (surface analytique pleine largeur). | La Synthèse est du pilotage, pas de la navigation d'entités ; les 3 autres manipulent des listes d'entités. | Actée (Lot 0) |
| **OPP-06** | **`/reports` (et `/missions` Engagements) sont la référence structurelle, pas une source de code à dupliquer.** Le Lot 2 crée une **primitive locale légère** `OpportunitiesTriPanel`, sans généraliser un design system global tant qu'aucun second consommateur réel ne le justifie. | Éviter la sur-abstraction prématurée ; `ReportsDesktopView` est monolithique et non réutilisable tel quel. | Actée (Lot 0) |
| **OPP-07** | **Mobile hors refonte.** Le Mobile actuel (`NeedsStaffingWorkspace` branche `device==="mobile"`) est protégé ; le branchement serveur `getDashboardDevice()` reste le principe ; jamais de composant Desktop lourd masqué en CSS. Aucun redesign Mobile sauf lot explicite ultérieur. | ADR-0006 ; 50 % des usages sont Mobile ; le cadrage limite le périmètre au Desktop. | Actée (Lot 0) |
| **OPP-08** | **Aucune nouvelle taxonomie d'étape commerciale.** Le contrat canonique est `src/lib/opportunities/stages.ts` (`SalesStage`), **pas** le tableau périmé de `CLAUDE.md`. Les alias legacy (`cv_sent`, `rt`, `negociation`, `win`, `lost`, `detection`, `besoin_confirme`) sont gérés par `toCanonicalOpportunityStage` / `getOpportunityStageLabel`. | Le code réel prime sur `CLAUDE.md` ; les valeurs live confirment `stages.ts`. | Actée (Lot 0) |
| **OPP-09** | **`opportunities.stage` (étape commerciale) et `opportunity_candidates.status` (avancement staffing) ne sont jamais fusionnés ni mappés implicitement.** Le graphique « Processus » les superpose comme deux dimensions distinctes. Toute nouvelle taxonomie (buckets de progression staffing) est explicitement décidée. | Doctrine « trois vocabulaires distincts » du Consultants Workspace (C-07) ; éviter les mappings destructeurs. | Actée (Lot 0) |
| **OPP-10** | **Synthèse et Planning partagent la même définition d'échéance.** Il n'existe **qu'un seul** builder `OpportunityDeadline` (`src/features/opportunities/planning/`), réutilisé par les deux chapitres. `start_date` et `target_close_date` ne sont pas des échéances équivalentes. | Cohérence du chiffre (le tableau Synthèse et le calendrier Planning doivent raconter la même chose). | Actée (Lot 0) |
| **OPP-11** | **« Modélisation de CA » n'est pas affichée avant implémentation.** Enregistré en « Future capabilities », **non rendu** dans `SectionRail.contextualModules`. Aucun lot d'implémentation dans le mini-chantier courant. | Protège l'invariant SHELL-0018 « aucun module mort, aucun placeholder trompeur ». | Actée (Lot 0) |
| **OPP-12** | **Matching profil réutilise le module Consultants unique** (`src/features/consultants/modules/profile-matching/`) et le moteur unique `src/lib/staffing-matching/`. Aucun composant copié, aucun loader forké, aucun moteur recréé, aucun recalcul de `match_scores`. Un point d'entrée partagé minimal est extrait si nécessaire (CROSS-01). | Une seule vérité `match_scores`, un seul moteur déterministe (C-09 du Consultants Workspace). | Actée (Lot 0) |
| **OPP-13** | **Simulation devis réutilise Financial Modeling** (`FinancialModelingDesktopDialog` + `getFinancialModelForStaffingAction` — déjà importés dans le workspace). Aucune deuxième modale de simulation. Le contexte opportunité/besoin sélectionné est préservé. | Un seul moteur financier ; l'intégration existe déjà par positionnement. | Actée (Lot 0) |
| **OPP-14** | **Post-Mortem réutilise `post-mortem-commercial`** (`MISSION_CATALOG`, `MISSION_COMPOSER_ACTION_CONFIGS.post_mortem_pipeline`, `use-mission-launcher`). Aucune nouvelle mission, aucun workflow n8n, aucun duplicate trigger. Le module est un nouveau point d'entrée contextuel. | Le moteur de missions déclaratif (ADR-0020) est stabilisé ; on ne recrée pas de métier IA. | Actée (Lot 0) |
| **OPP-15** | **Aucune capacité legacy n'est supprimée sans décision/parité.** Toute suppression (Kanban, bascule `?scope=`, actions rapides, drawers, planning legacy) exige une preuve de parité **ou** une décision produit inscrite au Decision Log. | Le workspace actuel a plus de capacités que la cible décrite ; la régression silencieuse est proscrite. | Actée (Lot 0) |
| **OPP-16** | **Compatibilité des anciennes URLs `scope`** : `?scope=needs` → `section=besoins` ; `?scope=staffing` → `section=besoins` (le staffing devient le rail droit du chapitre Besoins). Résolution au parsing quand possible, redirection permanente sinon (route `/staffing`, liens `main-menu` mobiles), documentée au ledger. Aucun deep-link historique cassé sans plan de migration. | Le contrat `scope` est aujourd'hui obligatoire (redirection serveur) et porté par le Mobile (`getMobileTabsForPath`). | Actée (Lot 0) |
| **OPP-17** | **`buildOpportunitiesSectionHref` nettoie l'état du chapitre frère.** Au changement de chapitre, le builder supprime `section` **et** les paramètres métier legacy `scope` · `view` · `stage` · `priority` · `practice` · `sort` · `direction` ; tous les autres query params (tiers) sont strictement préservés. La compat `scope` reste assurée **en entrée** par `parseOpportunitiesSection` (OPP-16). | Ces paramètres décrivent l'état interne du seul chapitre Besoins ; les traîner sur Synthèse / Planning / Avant-vente n'a pas de sens et brouille le deep-link. | Actée (Lot 1) |
| **OPP-18** | **Le retrait de `src/app/(app)/missions/(tabbed)/opps/page.tsx` est fait AU Lot 1**, pas différé à un « Lot 1.1 ». Next.js interdit deux `page.tsx` résolvant `/missions/opps` (les route groups ne changent pas le pathname) : conserver l'ancienne route ferait échouer `next build`. Parité assurée par montage direct et inchangé de `NeedsStaffingWorkspace` (mêmes loaders, mêmes props, même branche mobile) dans le chapitre `besoins`. Le shell est alimenté par une prop `searchParamsString` (query relue côté serveur), pas par `useSearchParams()` — évite une Suspense boundary, navigation 100 % URL-driven. | Contrainte technique Next.js ; la fiche Lot 1 (« peut rester un lot 1.1 si prudence ») n'est pas applicable. | Actée (Lot 1) |

| **OPP-19** | **DATA-01 tranchée — « CA du pipe » = option B.** `Σ ((acv ?? estimated_gain ?? 0) × conviction/100)` sur les opportunités dont l'étape n'est **pas terminale** (`isTerminalOpportunityStage`, `non_traitee` incluse dans les terminales). C'est la formule incumbent `OpportunitiesKpiSection.getWeightedValue`. Le graphique Pipe (client / practice / étape) partage la **même mesure** — invariant `Σ catégories == KPI` testé. **Réconcilie LEGACY-04** : le view-model Synthèse `getOpportunitiesSynthese` est le contrat canonique ; `OpportunitiesKpiSection` reste en place jusqu'au Lot 6 puis est déprécié. | Meilleure couverture (`acv` 31/32, fallback gain estimé, sinon 0 → aucune valeur NULL, contre 3 NULL pour l'option A) ; continuité avec l'UI existante. | Actée (Lot 3) |
| **OPP-20** | **DATA-02b tranchée — classement du Top compétences.** *Demandées* : `Σ (opportunity_skills.weight × poids d'importance)` sur les opportunités ouvertes, `indispensable ×3 · souhaitée ×2 · bonus ×1` ; départage par nombre d'opportunités distinctes. *Vivier* : nombre de **profils distincts** portant la compétence ; départage par `Σ level`. Top 5 de chaque côté. | Recommandation § 9.4 retenue : la demande porte une intensité (poids + criticité), l'offre se compte en têtes. | Actée (Lot 3) |
| **OPP-21** | **PRODUCT-01 (volet affichage) — taxonomie de progression staffing.** 5 buckets explicites, superposés à l'étape commerciale `stages.ts`, **jamais fusionnés** (OPP-09) : `identifie` ← `identifie` · `propose` ← `propose_interne`/`preselectionne` · `envoye_client` ← `envoye_client` · `entretien` ← `entretien_planifie`/`entretien_realise` · `retenu` ← `retenu`/`gagne`. Les statuts terminaux négatifs (`refuse_client` · `refuse_candidat` · `abandonne`) sont **hors entonnoir**, comptés à part (`excludedPositioningsCount`). C'est un modèle d'**affichage**, aucune écriture DB, aucune nouvelle colonne. | Le graphique « Processus » (§ 9.5) exige des buckets déterministes ; le vocabulaire staffing DB reste inchangé. | Actée (Lot 3) |
| **OPP-22** | **Échéances Synthèse — règle provisoire.** `getOpportunitiesSynthese.upcomingDeadlines` : `next_action_at` sinon `target_close_date` (jamais `start_date`), `dueAt >= referenceDate`, tri ASC, LIMIT 5, opps ouvertes. `calendar_events` **hors périmètre du Lot 3** (data scope de la fiche). Le concept canonique `OpportunityDeadline` (arbitrage multi-sources incl. `calendar_events`, partagé Synthèse/Planning — OPP-10) est arrêté au **Lot 8** (DATA-03) et remplacera ce champ. | La fiche Lot 3 couvre « 5 prochaines échéances » mais son data scope exclut `calendar_events` ; DATA-03 est explicitement un lot 8. | Actée (Lot 3) — **remplacée par OPP-28 (Lot 8)** |
| **OPP-23** | **Chapitre Besoins — sélection d'entité `?opp=<id>`** (PRODUCT-03, recommandation « oui »). Volet Lot 5 : `parseNeedsSelection` extrait `opp` + les filtres (délégués à `parseNeedsStaffingUrlState`) ; `resolveSelectedNeedId` résout l'actif (id demandé s'il est dans la liste **filtrée**, sinon 1ᵉ besoin, sinon `null`). `getNeedsChapterData` ne charge `getOpportunityDetail` que pour ce besoin — **jamais un détail par ligne de liste** (critère du Lot 5). Le href builder de `opp` + son retrait au changement de chapitre, le sort de `?view=` : **Lot 6** (NAVIGATION-02). Partage avec Planning : **Lot 9**. | Un seul chemin de chargement par entité ; deep-link partageable de la sélection. | Actée (Lot 5) |

| **OPP-24** | **PRODUCT-04 — détail besoin = inline.** La surface centrale du chapitre Besoins réutilise `OpportunityDetailView` **tel quel** (`{ data: OpportunityDetailData, device: "desktop" }`), rendu dans un conteneur scrollable. Aucun modèle de détail dupliqué, pas de drawer besoin dédié, pas d'iframe de la route `[id]`. La route plein écran `/missions/opps/[id]` reste pour le deep-link. | Le tri-panneau EST la surface de détail ; `OpportunityDetailView` est déjà auto-portant (header + pipeline + onglets overview/staffing/timeline/finance) et branché sur le drawer unique. | Actée (Lot 6) |
| **OPP-25** | **PRODUCT-02 — Kanban non repris.** Le mode `?view=kanban` (`OpportunitiesKanbanView`, `StaffingKanbanView`, flip besoin↔candidat) n'est **pas** repris dans le chapitre Besoins V2. La vue d'ensemble du pipe est portée par l'entonnoir « Processus » de la Synthèse (OPP-21) ; un board kanban ne s'insère pas dans un chapitre Liste/Détail 3-panneaux. La capacité **déplacement d'étape** est conservée via `StageQuickEditorDialog` (action de ligne du rail Liste). Composants legacy conservés jusqu'au **Lot 12** (retrait après audit des consommateurs). | Un board plein écran est incompatible avec le châssis 3-panneaux ; pas de valeur produit à maintenir deux paradigmes. Capacité métier (changement d'étape) préservée (OPP-15). | Actée (Lot 6) |
| **OPP-26** | **NAVIGATION-02 — contrat URL du chapitre Besoins.** `?section=besoins` + `?opp=<id>` + filtres `?stage` · `?priority` · `?practice` · `?sort=acv` · `?direction` (repris de `url-state.ts`, builder pur `buildNeedsHref`). **Abandonnés** : `?scope=` (le staffing devient le rail droit, plus une bascule) et `?view=` (Kanban retiré OPP-25 ; Planning = chapitre dédié Lot 9). Compat d'entrée `?scope=needs\|staffing → besoins` conservée par `parseOpportunitiesSection` (OPP-16). `buildOpportunitiesSectionHref` strippe désormais `opp` (+ `view` déjà stripé) au changement de chapitre. Sélection & filtres → `router.replace` (`<Link replace scroll={false}>`), patron `/reports`. | Le chapitre a un état propre (besoin actif + filtres) ; `scope`/`view` n'ont plus de sens dans un chapitre 3-panneaux. | Actée (Lot 6) |
| **OPP-27** | **LEGACY-05 — HEX.** Le chapitre Besoins V2 Desktop est **sans HEX en dur** : les couleurs d'étape viennent de `getOpportunityStageColor` (variables `var(--color-*)` de `stages.ts`), le reste des tokens `@theme`. Les HEX de `NeedsStaffingWorkspace.tsx` (`#FFC107`, `#9C27B0`, `#607D8B`, `#FF5252`…) vivent dans les **toggles Kanban/Planning non repris** (OPP-25) ; le fichier legacy conserve ses HEX jusqu'à son retrait complet (Lot 12, après migration Mobile). | La dette HEX était portée par des vues qui disparaissent du chapitre ; ne pas la recopier (critère § 20.4). | Actée (Lot 6) |

| **OPP-28** | **DATA-03 tranchée — `OpportunityDeadline`.** Builder pur unique `src/features/opportunities/planning/data/build-opportunity-deadlines.ts` : pour chaque opportunité **ouverte** (`!isTerminalOpportunityStage`), parmi les dates **futures ou du jour** (seuil minuit UTC, comme le Lot 3), on retient **une seule** échéance par priorité `next_action_at` > prochain `calendar_events.starts_at` (hors `status='cancelled'`) > `target_close_date`. `start_date` **jamais** une échéance ; jalons `opportunity_candidates` hors périmètre V1 (dates passées). Forme : `{ opportunityId, opportunityTitle, client, source, label, dueAt, calendarEventType }`, `source ∈ {next_action, calendar_event, target_close}`. Tri `dueAt ASC` puis titre puis priorité de source. La Synthèse (`buildOpportunitiesSynthese`) consomme ce builder (`.slice(0,5)`) — **plus aucune logique d'échéance dupliquée**. Le Planning (Lot 9) réutilise le loader `get-opportunity-deadlines.ts`. **Remplace OPP-22.** Écart de nommage vs fiche (`type` → `source`) sans impact contrat. | § 9.6 exige un builder unique partagé Synthèse/Planning (OPP-10) ; `calendar_events` est la source d'échéance la plus fiable (donnée métier explicite, non `cancelled`). | Actée (Lot 8) |

| **OPP-29** | **Planning V1 = milestone planning, pas Gantt projet.** Une lane par opportunité ouverte et au plus un jalon canonique `OpportunityDeadline`. Les vues Mois/Année partagent la même timeline et adaptent uniquement la résolution ; la source est distinguée par forme + couleur. Aucune durée, dépendance, baseline, progression, WBS, date synthétique ou édition par drag. La sélection Liste/Planning/Détails est URL-addressable `?opp=` ; l'échelle et la période sont des états d'exploration éphémères. | Le contrat Lot 8 porte des échéances ponctuelles (`dueAt`) et aucune durée. Cette grammaire conserve la vérité métier tout en offrant une lecture temporelle professionnelle. | Actée (Lot 9) |

| **OPP-30** | **Modules contextuels (Lot 10) = câblage REUSE-only, les 3 constamment visibles sur tous les chapitres** (ils ne dépendent jamais de l'onglet consulté). Contrat `?module=matching\|simulation\|post-mortem` orthogonal à `?section=`/`?opp=`, retiré au changement de chapitre (`LEGACY_NEEDS_STAFFING_QUERY_KEYS`). **CROSS-01** : Matching = `MatchingDialog` besoin-centrique (`src/components/staffing/matching/`) monté tel quel — moteur unique `staffing-matching`, aucun recalcul `match_scores`, **aucun launcher partagé nouveau** ; le contexte opportunité vient du détail **déjà chargé** par le chapitre (`selectedNeedDetail` / `selectedOpportunityDetail`) quand il existe, sinon écran d'aiguillage vers la liste (jamais un bouton mort). **CROSS-02** : Post-Mortem = `MissionComposerDesktop` + `POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG` dans un `AppDialog dataTheme="cockpit"` — aucune nouvelle mission / workflow n8n / trigger. **CROSS-03** : Simulation devis = `FinancialModelingDesktopDialog` toujours déclarée ; préset (`mode:"full"`) si contexte opportunité, flash nu sinon. `Modélisation de CA` absente de l'union `OpportunitiesModule` (OPP-11). Wrappers dans `src/features/opportunities/modules/`, dialogs en `next/dynamic`. | § 13 exige des points d'entrée fins vers des capacités existantes ; les 3 modules sont des outils du workspace, pas des fonctions de chapitre — leur disponibilité est constante. | Actée (Lot 10) |
| **OPP-31** | **Navigation globale, compatibilité legacy et sortie définitive de `(tabbed)` (Lot 11 / SHELL 6.3)** : (1) KREDO ne génère plus de lien `?scope=` ; (2) `scope=needs\|staffing` reste accepté en entrée par `parseOpportunitiesSection` (compat d'entrée transparente sans redirection) ; (3) la route `/staffing` redirige de façon permanente via `permanentRedirect` vers `/missions/opps?section=besoins` en préservant les filtres autorisés (`stage`, `priority`, `practice`, `sort`, `direction`) et en omettant `scope` et `view` ; (4) le nom produit global affiché dans le menu principal (`mainMenuItems`) sous CRM est **« Opportunités »** ; (5) la route `/missions/opps` reste le pathname canonique inchangé ; (6) `OpportunitiesDesktopShell` ne pilote plus la sidebar (`useSidebarCollapse` retiré) ; (7) `missions/(tabbed)` et `MissionsTabbedShell` sont définitivement supprimés ; (8) `/missions/actives` et `/missions/projets` redirigent de façon permanente vers leurs vues canoniques `?vue=missions-at` et `?vue=projets`. | Résolution coordonnée SHELL-0018 Lot 6.3 et Opportunities Lot 11. Clôture des dettes de navigation globale tout en garantissant zéro régression sur les deep-links externes. | Actée (Lot 11) |

---

## 17. OPEN QUESTIONS

> Une question ouverte n'empêche pas de cadrer les lots qui n'en dépendent pas. Résolution
> attendue : colonne « Lot cible ». Les questions qu'un audit du code réel permet de trancher
> immédiatement sont tranchées ci-dessous (voir « Statut »). Ne restent ouvertes que les
> questions réellement indécidables sans arbitrage produit ou lecture Data approfondie.

### DATA

| ID | Question | Lot cible | Statut |
|---|---|---|---|
| **DATA-01** | Quelle métrique est la **source canonique du « CA du pipe »** ? Options A (`weighted_gain` DB), B (pipe pondéré UI = `(acv ?? estimated_gain) × conviction/100`), C (brut), D (restreint périmètre staffing). | **3** | ✅ **tranché (OPP-19)** — option **B**, sur les opps à étape non terminale. Contrat = `getOpportunitiesSynthese`. Invariant `Σ catégories == KPI` testé. |
| **DATA-02** | Quelle **population exacte du vivier** alimente le Top 5 compétences (§ 9.4) ? | **3** | ✅ **repris (Lot 3)** — définition **provisoire** du Consultants Workspace : `candidates.status = 'vivier'` (leur DATA-4, figée à leur Lot 7). `getOpportunitiesSynthese` la réutilise telle quelle, `dataNotes` le signale. Aucune définition concurrente créée. À re-synchroniser quand Consultants fige la sienne. |
| **DATA-02b** | Critère de classement du Top 5 compétences : nombre de profils / occurrences / pondéré `importance`+`weight` / filtré `min_level` ? | **3** | ✅ **tranché (OPP-20)** — demande : `Σ (weight × importance)` (×3/×2/×1) ; vivier : nb de profils distincts. |
| **DATA-03** | Règle d'arbitrage du concept normalisé **`OpportunityDeadline`** quand plusieurs dates existent pour une opportunité (`next_action_at`, `calendar_events.starts_at`, `target_close_date`, `start_date`, jalons staffing) ? | **8** | ✅ **tranché (OPP-28)** — 1 échéance / opp ouverte, dates futures ou du jour, priorité `next_action_at` > prochain `calendar_events` (hors `cancelled`) > `target_close_date` ; `start_date` exclue ; jalons staffing hors périmètre V1 |
| ~~**DATA-04**~~ | Le graphique « Processus » doit-il fusionner `stage` et `opportunity_candidates.status` ? | 0 | ✅ **tranché (OPP-09)** — non ; deux dimensions superposées, jamais confondues |
| ~~**DATA-05**~~ | Quelle taxonomie d'étape commerciale utiliser ? | 0 | ✅ **tranché (OPP-08)** — `src/lib/opportunities/stages.ts` (`SalesStage`), pas le tableau de `CLAUDE.md` |

### PRODUCT

| ID | Question | Lot cible | Statut |
|---|---|---|---|
| **PRODUCT-01** | Quelle **représentation unifiée** pour `opportunity.stage` + `opportunity_candidates.status` dans le graphique « Processus » (buckets de progression staffing, libellés, ordre) ? | **3** | ✅ **volet affichage tranché (OPP-21)** — 5 buckets `identifie/propose/envoye_client/entretien/retenu` superposés à `stages.ts`, jamais fusionnés ; terminaux négatifs hors entonnoir. Modèle d'affichage, aucune écriture DB. Une éventuelle unification **stockée** reste ouverte (hors périmètre de ce chantier). |
| **PRODUCT-02** | Quelles **capacités Kanban actuelles** doivent survivre après la refonte (Kanban besoins, Kanban staffing, flip besoin↔candidat) — mode secondaire du chapitre Besoins ou dépréciation ? | **6** | ✅ **tranché (OPP-25)** — Kanban **non repris** ; changement d'étape conservé via `StageQuickEditorDialog` ; composants legacy retirés au Lot 12 |
| **PRODUCT-03** | La **sélection d'entité** (besoin / opportunité) doit-elle être **URL-addressable** (`?opp=<id>`, patron `/reports?doc=`) pour être partagée entre Liste / Planning / Détails ? | **5 / 6 / 9** | ✅ **volet parsing/résolution tranché (OPP-23, Lot 5)** — `?opp=<id>`, `parseNeedsSelection` + `resolveSelectedNeedId`, détail chargé pour le seul besoin sélectionné. Reste : href builder (Lot 6), partage Planning (Lot 9). |
| **PRODUCT-04** | Forme du **détail besoin** dans la surface centrale : panneau inline, drawer `AssistanceCaseDrawer`, ou réemploi de `OpportunityDetailView` (route `[id]`) ? | **6** | ✅ **tranché (OPP-24)** — `OpportunityDetailView` **inline** (réemploi tel quel), route `[id]` conservée pour le deep-link |
| **PRODUCT-05** | Relation entre **opportunité commerciale**, **projet avant-vente** et **mission / projet gagné** (`projects` en base) ? | **futur** | **ouverte** — la **structure** du chapitre Avant-vente est livrée (Lot 7, `PresalesDesktop`, 3 `EmptyState`) ; le **contenu métier** reste subordonné à cet arbitrage produit + Data |

### NAVIGATION

| ID | Question | Lot cible | Statut |
|---|---|---|---|
| **NAVIGATION-01** | Comment **convertir les deep-links historiques utilisant `scope`** (`?scope=needs`, `?scope=staffing`, route `/staffing`, liens `getMobileTabsForPath`) vers le contrat `?section=` ? | **1 / 11** | ✅ **tranché et livré (Lot 1 & Lot 11 / OPP-16, OPP-31)** — `parseOpportunitiesSection` assure la compat d'entrée `scope=needs\|staffing → besoins` ; `/staffing` redirige de façon permanente vers `?section=besoins` sans `scope`/`view` ; le tab mobile est canonisé vers `?section=besoins` ; aucun lien interne ne produit plus `scope` |
| **NAVIGATION-02** | Le contrat `?view=` / `?stage` / `?priority` / `?practice` (filtres du chapitre Besoins) est-il préservé tel quel, renommé, ou réduit ? | **6** | ✅ **tranché (OPP-26)** — `?section=besoins&opp=&stage=&priority=&practice=&sort=&direction=` ; `?scope` et `?view` abandonnés (compat `scope` d'entrée conservée) |
| ~~**NAVIGATION-03**~~ | `?section=` vs pathname ? | 0 | ✅ **tranché (OPP-04)** — `?section=`, patron Engagements `?vue=` transposé |

### LEGACY

| ID | Question | Lot cible | Statut |
|---|---|---|---|
| **LEGACY-01** | Quels consommateurs utilisent encore le shell `missions/(tabbed)` après la sortie de `/missions/opps` ? (`/missions/actives`, `/missions/projets`, `MissionsTabbedShell`, `MissionsEntityPanel`, `useMissionsTabStore`) — et lesquels bloquent le retrait de `SectionNavBarSlot` ? | **11** (coord. SHELL-0018 Phase 6.3) | ✅ **résolu (SHELL 6.3 / Lot 11)** — `missions/(tabbed)` supprimé, `/missions/actives` et `/missions/projets` redirigent vers `?vue=`, `MissionsTabbedShell` supprimé ; `SectionNavBarSlot` a **0** consommateur applicatif |
| **LEGACY-02** | `src/components/missions/OpportunitiesDesktopView.tsx` — orphelin confirmé (0 import externe) : suppression au Lot 12 ? | **12** | **ouverte** — supprimer après parité |
| **LEGACY-03** | `src/components/staffing/` — quels composants (`StaffingTabbedShell`, `StaffingDesktopView`, `StaffingDesktopDashboard`, `StaffingMobile*`) sont encore montés une fois `/missions/opps` migré et `/staffing` repointé ? | **6 / 12** | **ouverte** — audit des consommateurs réels |
| **LEGACY-04** | `OpportunitiesKpiSection.tsx` (`getWeightedValue` = option B de DATA-01) : réconcilier avec le view-model Synthèse ou déprécier ? | **3** | ✅ **réconcilié (OPP-19)** — sa formule **devient** le contrat canonique (`getOpportunitiesSynthese`). Le composant reste monté par le workspace legacy jusqu'au Lot 6, puis déprécié (LEGACY-02/03 batch Lot 12). |
| **LEGACY-05** | HEX en dur dans `NeedsStaffingWorkspace.tsx` (`#FFC107`, `#9C27B0`, `#607D8B`, `#FF5252`…) — mapper vers des variables `@theme` lors de la migration. | **6** | ✅ **traité (OPP-27)** — le chapitre V2 est sans HEX ; les HEX legacy sont dans les toggles Kanban/Planning non repris, retirés avec `NeedsStaffingWorkspace.tsx` au Lot 12 |

### CROSS-FEATURE

| ID | Question | Lot cible | Statut |
|---|---|---|---|
| **CROSS-01** | Quel **point d'entrée partagé** expose proprement « Matching profil » (contexte `opportunityId` optionnel) sans dupliquer le composant Consultants ni le moteur ? Extraire un launcher commun ou monter `MatchingDialog` existant ? | **10** | ✅ **tranché (OPP-30)** — `MatchingDialog` existant monté tel quel ; module **visible sur tous les chapitres**, contexte `?opp=` transmis s'il existe, sinon écran d'aiguillage ; aucun launcher commun extrait |
| **CROSS-02** | Quel **launcher officiel** ouvre `post-mortem-commercial` depuis un module contextuel (`MissionComposerDesktop` en dialog, ou launcher dédié) ? | **10** | ✅ **tranché (OPP-30)** — `MissionComposerDesktop` + config `post_mortem_pipeline` dans un `AppDialog` thémé cockpit |
| **CROSS-03** | Le module « Simulation devis » doit-il se lancer sans contexte (choix opportunité dans la modale) quand aucun besoin n'est sélectionné, ou n'apparaître qu'avec contexte ? | **10** | ✅ **tranché (OPP-30)** — toujours disponible ; préset appliqué si contexte, sinon flash nu |

---

## 18. Roadmap — découpage en lots

> Roadmap **normative**. Ajustable **uniquement** si l'audit réel prouve une dépendance
> différente — tout ajustement est inscrit au ledger avec sa justification.

| Lot | Objet | Type | Dépend de |
|---|---|---|---|
| **0** | Cadrage documentaire (ce lot) | doc | — |
| **1** | Socle Opportunities Workspace (renommage → « Opportunités », `SectionRail` V2, 4 chapitres, header actif, navigation `?section=`, compat URLs legacy `scope`, sortie de `(tabbed)`) | code Front | 0 |
| **2** | Primitive/layout 3 panneaux `OpportunitiesTriPanel` (Liste / Main / Détails) | code Front | 1 |
| **3** | Data Contract Synthèse (view-model serveur unique : 3 KPI, pipe, top compétences, processus, échéances) — **résout DATA-01** | code Data/Front | 1 |
| **4** | Synthèse Desktop (KPI + graphique pipe Clients/Practices + comparaison compétences + progression processus + tableau 5 échéances) | code Front | 3 |
| **5** | Data/detail Besoins & staffing (liste besoins, besoin sélectionné, détail, staffing actif par besoin) | code Data/Front | 1 |
| **6** | Migration UI Besoins & staffing (rail Liste gauche, détail central, rail « Staffing en cours » droit) — **résout PRODUCT-02/04, NAVIGATION-02, LEGACY-05** | code Front | 2, 5 |
| **7** | Avant-vente (structure 3 panneaux + vrais `EmptyState`, aucune fausse donnée) | code Front | 2 |
| **8** | Data Contract Planning (builder unique `OpportunityDeadline`, réutilisé Synthèse + Planning) — **résout DATA-03** | code Data | 3 |
| **9** | Planning Desktop (liste opportunités, planning central mois/année, détails, sélecteur `Mois \| Année`) | code Front | 2, 8 |
| **10** | Modules existants (Matching profil, Simulation devis, Post-Mortem — câblage vers capacités existantes) — **résout CROSS-01/02/03** ; `Modélisation de CA` reste future non affichée | code Front | 1 |
| **11** | Legacy / compatibilité / navigation globale (anciens `scope`/`view`, liens « Besoins & staffing », `main-menu` labels, `SectionNavBar`/`SectionNavBarSlot` liés à la route, redirection `/staffing`, deep-links historiques) — **coordonné SHELL-0018 Phase 6** | code Front | 1, 6 |
| **12** | Nettoyage et clôture (parité, code mort, duplications, imports legacy, URLs, tests, doc, Mobile protégé, modules) + rapport de clôture `02-CLOSURE-AUDIT.md` | code + doc | 4, 6, 7, 9, 10, 11 |

---

## 19. Fiches de lot autonomes

> Chaque lot est **autonome** : un agent recevant « Exécute le Lot X du Opportunities
> Workspace » trouve tout le reste dans le dépôt (ce document + le ledger + le code réel).
> Format fixe : Objectif · État d'entrée · Prérequis · Data · Desktop · Mobile · Fichiers
> probables · Réutilisations obligatoires · Hors périmètre · Critères d'acceptation · Tests ·
> Gates · Documentation · Conditions de sortie · Lot suivant.

---

### Lot 0 — Cadrage documentaire

- **Objectif** : créer le dossier canonique, le document de référence, le ledger, l'inventaire
  code/Data, la roadmap, le Decision Log, les Open Questions.
- **État d'entrée** : `origin/main` = baseline `61aba08e` ; `/missions/opps` sur le shell
  `missions/(tabbed)` ; SHELL-0018 Phases 1→5 closes, Phase 6 non démarrée ; Consultants
  Workspace Lots 0→13 livrés.
- **Prérequis** : lecture `CLAUDE.md`, `AGENTS.md`, `docs/navigation_architecture/SHELL-0018/*`,
  `docs/FEATURES/consultants_workspace/*`.
- **Data** : audit lecture seule (schéma live `opportunities`, `opportunity_candidates`,
  `opportunity_skills`, `person_skills`, `calendar_events`, `candidates`, `match_scores`).
  Aucune migration.
- **Desktop / Mobile** : aucun code.
- **Fichiers** : `docs/FEATURES/opportunities_workspace/{README.md,00-REFERENCE-CHANTIER-OPPORTUNITES.md,01-IMPLEMENTATION-LEDGER.md}`.
- **Réutilisations obligatoires** : n/a.
- **Hors périmètre** : toute modification applicative, migration Supabase, n8n, route, Shell.
- **Critères d'acceptation** : les 3 fichiers existent ; liens Markdown valides ; lots 0→12
  présents sans trou ; Decision Log OPP-01→OPP-16 ; Open Questions classées
  DATA/PRODUCT/NAVIGATION/LEGACY/CROSS-FEATURE ; inventaire couvrant les capacités du § 15 ;
  `NEXT LOT = Lot 1` ; aucune règle de branche contradictoire ; aucune ancienne règle QA
  navigateur ; aucun module « à venir » rendu comme disponible.
- **Tests** : n/a.
- **Gates** : `git diff --check` ; relecture manuelle (numérotation, liens, cohérence
  main-only).
- **Documentation** : création.
- **Conditions de sortie** : commit `docs(opportunities): bootstrap Opportunities Workspace
  roadmap` poussé sur `main`.
- **Lot suivant** : Lot 1.

---

### Lot 1 — Socle Opportunities Workspace

- **Objectif** : nouveau shell `/missions/opps` conforme SHELL-0018 : `SectionRail` V2 **inline**
  (patron `EngagementsDesktopView`), chapeau navy **« Opportunités »**, header = chapitre actif,
  **4 chapitres** (`synthese` racine · `besoins` · `avant-vente` · `planning`), navigation
  **URL-driven `?section=`**, compat des URLs legacy `scope`, **sortie du groupe `(tabbed)`**.
  `contextualModules: undefined`. **Aucun contenu métier refait** — chaque chapitre monte
  d'abord le contenu legacy ou un `EmptyState` provisoire.
- **État d'entrée** : `/missions/opps` = `src/app/(app)/missions/(tabbed)/opps/page.tsx` →
  `NeedsStaffingWorkspace` ; contrat `?scope=` obligatoire (redirection serveur si absent) ;
  état client (`useNeedsStaffingUrlState`) ; `SectionNavBarSlot` (no-op ici) + `MissionsTabbedShell`.
- **Prérequis** : lire `02-SECONDARY-RAIL-STANDARD.md`,
  `src/components/missions/engagements/EngagementsDesktopView.tsx`,
  `src/app/(app)/missions/page.tsx`, `src/components/reports/ReportsLocalNavigation.tsx`,
  `src/features/consultants/navigation/consultants-sections.ts`.
- **Data** : aucune (les loaders existants sont montés tels quels dans les chapitres).
- **Desktop** :
  - `src/features/opportunities/navigation/opportunities-sections.ts` — `OpportunitiesSection`,
    `OPPORTUNITIES_SECTIONS`, `HEADER_TITLE_BY_SECTION`, `OPPORTUNITIES_ROOT_SECTION = "synthese"`,
    `parseOpportunitiesSection` (déterministe + **compat `scope`** : `scope=needs\|staffing` →
    `besoins`), `buildOpportunitiesSectionHref` (préserve les query params tiers).
  - `src/features/opportunities/navigation/opportunities-icons.tsx` — 4 icônes (patron
    `engagement-icons`).
  - `src/features/opportunities/desktop/OpportunitiesDesktopShell.tsx` — `SectionRail` inline
    (`title="Opportunités"`, `home={{ href: "/missions/opps" }}`), `useSidebarCollapse`,
    header `HEADER_TITLE_BY_SECTION[activeSection]`, `contextualModules` non passé.
  - `src/app/(app)/missions/opps/page.tsx` (**hors `(tabbed)`**) — orchestrateur :
    `getDashboardDevice()` + `parseOpportunitiesSection(?section)` → shell + contenu de chapitre
    (Synthèse = `EmptyState` provisoire ou KPI legacy ; Besoins = `NeedsStaffingWorkspace`
    monté avec `scope` forcé ; Avant-vente = `EmptyState` ; Planning = vue planning legacy).
  - Retrait de `src/app/(app)/missions/(tabbed)/opps/page.tsx` **dans le Lot 1** (OPP-18) :
    Next.js interdit deux `page.tsx` sur `/missions/opps`, le retrait n'est pas différable.
    Parité = `NeedsStaffingWorkspace` monté tel quel dans le chapitre `besoins`.
- **Mobile** : **inchangé** — la branche `device==="mobile"` continue de rendre le Mobile
  legacy ; le shell V2 n'est pas monté sur Mobile. `getMobileTabsForPath` **non modifié**.
- **Fichiers probables** : cf. Desktop ci-dessus + `opportunities-sections.test.ts`.
- **Réutilisations obligatoires** : `SectionRail`, `useSidebarCollapse`,
  `getDashboardDevice()`, `NeedsStaffingWorkspace` (monté tel quel dans le chapitre Besoins),
  `stages.ts`.
- **Hors périmètre** : `SectionNavBarSlot` global, `main-menu.config.ts`, Mobile, tout contenu
  métier, toute migration. **`missions/(tabbed)/layout.tsx` n'est pas modifié** (reste pour
  `actives`/`projets`).
- **Critères d'acceptation** : `/missions/opps` rend le rail V2 (184px, chapeau navy
  « Opportunités ») ; 4 chapitres ; header = chapitre actif ; `/missions/opps` sans param →
  Synthèse ; `?section=besoins` → workspace besoins ; `?scope=needs` et `?scope=staffing` →
  chapitre Besoins (compat) ; deep-link/refresh/back-forward reconstruisent le chapitre ;
  aucun `useState` de navigation éphémère ; Mobile inchangé ; `contextualModules` absent.
- **Tests** : `opportunities-sections.test.ts` (parse `undefined`/`null`/valides/inconnu/`scope`,
  build root sans param, préservation des query params, contrat des 4 chapitres, rendu shell
  SHELL-0018).
- **Gates** : `typecheck` → `npm test -- <ciblés> src/components/layout/SectionRail.test.ts` →
  `check:server-boundary` → `npx eslint <fichiers touchés>` → `build`.
- **Documentation** : ledger § Lot 1 ; NAVIGATION-01 (volet parsing) + NAVIGATION-03 résolues ;
  Decision Log si divergence.
- **Conditions de sortie** : `typecheck`/`test`/`build` verts ; commit + push `main` ; SHA au
  ledger.
- **Lot suivant** : Lot 2.

---

### Lot 2 — Primitive/layout 3 panneaux

- **Objectif** : `src/features/opportunities/desktop/OpportunitiesTriPanel.tsx` — châssis
  **Liste / Main / Détails** repris de `/reports` (conteneur
  `grid grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)]`, rail droit qui
  dégrade en `<aside aria-hidden />`). Utilisé par les chapitres Besoins, Avant-vente, Planning.
- **État d'entrée** : Lot 1 livré ; aucune primitive 3-panneaux réutilisable dans le repo.
- **Prérequis** : lire `ReportsDesktopView.tsx` (grille), `missions/page.tsx` (dégradé aside),
  `02-SECONDARY-RAIL-STANDARD.md`.
- **Data** : aucune.
- **Desktop** : `OpportunitiesTriPanel` (props `list`, `main`, `details?`, `detailsEmpty?`),
  `overflow` par panneau, scroll interne, pas d'overflow horizontal du body.
- **Mobile** : n/a (Mobile protégé — la primitive est Desktop only, pas de `hidden` CSS).
- **Fichiers probables** : `OpportunitiesTriPanel.tsx` + `.test.ts`.
- **Réutilisations obligatoires** : classes Tailwind `@theme` uniquement.
- **Hors périmètre** : ne pas en faire un composant `src/components/layout/` global tant
  qu'aucun second consommateur hors Opportunités ne le justifie (OPP-06).
- **Critères d'acceptation** : rend 3 colonnes ; `details` absent → `<aside aria-hidden />` ;
  aucun scroll horizontal ; testé par `renderToStaticMarkup`.
- **Tests** : `OpportunitiesTriPanel.test.ts`.
- **Gates** : `typecheck` → test ciblé → `check:server-boundary` → `eslint` → `build`.
- **Documentation** : ledger § Lot 2.
- **Conditions de sortie** : gates vertes ; commit + push.
- **Lot suivant** : Lot 3.

---

### Lot 3 — Data Contract Synthèse

- **Objectif** : view-model **serveur unique** de la Synthèse, **builder pur testé** + loader
  mince `server-only` (patron `buildConsultantsSynthese`). Couvre : 3 KPI, répartition pipe
  (Clients/Practices), top compétences (demandées VS vivier), progression processus par
  opportunité, 5 prochaines échéances. **Résout DATA-01** (inscrit **OPP-19** — OPP-17/18 pris au Lot 1). Aucune UI majeure.
- **État d'entrée** : Lot 1 livré.
- **Prérequis** : § 9 de ce document ; `get-needs-staffing-shared.ts` ; `coverage.ts` ;
  `stages.ts` ; `src/lib/config/practices.ts` ; `docs/FEATURES/consultants_workspace/`
  (définition vivier C-16/C-26) ; `OpportunitiesKpiSection.tsx` (option B).
- **Data** : lecture `opportunities`, `opportunity_candidates`, `opportunity_skills`, `skills`,
  `person_skills`, `persons`, `candidates`, `companies`. **Aucune migration** (ne jamais créer
  de migration pour contourner une lecture insuffisamment auditée).
- **Desktop / Mobile** : pas d'UI (types + builder + loader + tests).
- **Fichiers probables** : `src/features/opportunities/data/opportunities-synthese.types.ts`,
  `build-opportunities-synthese.ts`, `get-opportunities-synthese.ts`,
  `__tests__/build-opportunities-synthese.test.ts`.
- **Réutilisations obligatoires** : `getNeedsStaffingSharedData` pour KPI 1 & 2 (ne pas
  recalculer) ; cascade practice C-17 du Consultants Workspace ; définition vivier canonique.
- **Hors périmètre** : graphiques, composants.
- **Critères d'acceptation** : DATA-01 tranchée et inscrite au Decision Log (OPP-19) ;
  KPI 1 & 2 = valeurs de `getNeedsStaffingSharedData` (test d'égalité) ; `Σ KPI CA du pipe ==
  Σ catégories du graphique pipe` (test, aux arrondis près) ; `stage` et
  `opportunity_candidates.status` restent deux champs distincts dans le view-model (OPP-09) ;
  `dataNotes` pour les réserves méthodo (couverture `estimated_gain`, practice « Autre »).
- **Tests** : builder pur (fixtures) — KPI, pipe par client/practice, top compétences,
  processus, échéances, invariant somme.
- **Gates** : `typecheck` → test ciblé → `check:server-boundary` → `eslint` → `build`.
- **Documentation** : ledger § Lot 3 ; Decision Log OPP-19 (DATA-01), OPP-20 (DATA-02b),
  OPP-21 (PRODUCT-01 affichage), OPP-22 (échéances provisoires) ; DATA-02 reprise du contrat
  provisoire Consultants ; LEGACY-04 réconciliée.
- **Conditions de sortie** : gates vertes ; commit + push.
- **Lot suivant** : Lot 4.

---

### Lot 4 — Synthèse Desktop

- **Objectif** : chapitre Synthèse Desktop — surface analytique **pleine largeur** (exception
  shell 3 panneaux) : 3 KPI, graphique pipe `Clients | Practices`, comparaison compétences
  Top 5 demandées / Top 5 vivier, progression processus, tableau 5 échéances.
- **État d'entrée** : Lots 1 + 3 livrés.
- **Prérequis** : § 9 ; règles dataviz `CLAUDE.md` ; SVG maison ; `KpiCard`.
- **Data** : `getOpportunitiesSynthese()` (Lot 3) — **aucun recalcul côté composant**.
- **Desktop** : `src/features/opportunities/summary/SummaryDesktop.tsx` + sous-composants SVG
  maison (`PipeBreakdownChart` client pour le toggle, `SkillsComparisonChart`,
  `ProcessFunnelChart`, `DeadlinesTable`).
- **Mobile** : hors périmètre V1 (le chapitre Synthèse n'est pas exposé sur Mobile ; si besoin
  plus tard, branche serveur dédiée — jamais de `hidden` CSS).
- **Fichiers probables** : `summary/` + tests.
- **Réutilisations obligatoires** : palette practice pilotée par la donnée
  (`offer_practices.color_hex` si présent, fallback `var(--color-muted)`) ; **pas de HEX
  arbitraire**. Pas de nouvelle librairie graphique.
- **Hors périmètre** : Kanban, Planning (Lot 9), détail besoin.
- **Critères d'acceptation** : `/missions/opps` (racine) rend la Synthèse ; le graphique pipe
  somme au KPI CA du pipe ; toggle `Clients | Practices` sans rechargement serveur ; `EmptyState`
  propres quand une série est vide ; aucun overflow horizontal.
- **Tests** : rendu des composants purs (`renderToStaticMarkup`), helpers de mise en forme.
- **Gates** : suite complète si raisonnable, sinon ciblée + `build`.
- **Documentation** : ledger § Lot 4.
- **Conditions de sortie** : gates vertes ; commit + push.
- **Lot suivant** : Lot 5.

---

### Lot 5 — Data/detail Besoins & staffing

- **Objectif** : stabiliser les contrats de données du chapitre Besoins : liste des besoins
  ouverts, besoin sélectionné, détail du besoin, staffing actif par besoin. **Réutiliser les
  loaders existants, éviter les doubles queries.**
- **État d'entrée** : Lot 1 livré ; loaders `get-opportunities-list.ts`,
  `get-opportunity-detail.ts`, `get-staffings-list.ts` en place.
- **Prérequis** : § 10 ; `coverage.ts` ; `model.ts`.
- **Data** : réutilisation / extraction mince vers `src/features/opportunities/needs/data/` ;
  pas de migration.
- **Desktop / Mobile** : loaders + types + tests (peu ou pas d'UI).
- **Fichiers probables** : `needs/data/get-opportunities-needs.ts` (ou réemploi direct),
  `needs/data/*.types.ts`, tests.
- **Réutilisations obligatoires** : `get-opportunities-list`, `get-staffings-list`,
  `get-needs-staffing-shared`, `calculateCoverageMetrics`.
- **Hors périmètre** : UI (Lot 6), Planning.
- **Critères d'acceptation** : un seul chemin de chargement par entité (pas de double query
  liste + détail redondante) ; `dataNotes` si besoin ; tests des filtres/sélection.
- **Tests** : builders/filtres purs.
- **Gates** : standard.
- **Documentation** : ledger § Lot 5.
- **Conditions de sortie** : gates vertes ; commit + push.
- **Lot suivant** : Lot 6.

---

### Lot 6 — Migration UI Besoins & staffing

- **Objectif** : chapitre Besoins Desktop sur `OpportunitiesTriPanel` : rail **Liste** gauche
  (besoins ouverts + recherche/filtres + sélection), surface **centrale** (détail complet du
  besoin, composant réutilisé), rail **Détails** droit = **« Staffing en cours »**
  (positionnements actifs, ouverture du détail staffing via le drawer unique). **Parité des
  actions conservées.** Documenter explicitement le sort de : Kanban, anciens switch `scope`,
  actions rapides, drawers (OPP-15).
- **État d'entrée** : Lots 2 + 5 livrés ; `NeedsStaffingWorkspace` encore monté par le Lot 1
  dans le chapitre Besoins.
- **Prérequis** : § 10 + § 10.4 (matrice legacy) ; `use-staffing-drawer-store.ts` ;
  `AssistanceCaseDrawer` ; `OpportunityDetailView` ; `StageQuickEditorDialog`.
- **Data** : Lot 5.
- **Desktop** : `src/features/opportunities/needs/NeedsDesktop.tsx` (monte `OpportunitiesTriPanel`),
  `NeedsListPanel`, `NeedsDetailPanel`, `StaffingInProgressRail`. Réutilise `NeedsListView`,
  `StaffingListWorkspaceView`, `StageQuickEditorDialog`, `NewOpportunityButton`,
  `NewStaffingButton`.
- **Mobile** : **inchangé** (Mobile legacy). Décision de sort documentée si le composant Mobile
  partage du code avec la branche Desktop retirée.
- **Fichiers probables** : `needs/` + tests ; retrait progressif de l'usage de
  `NeedsStaffingWorkspace` dans le chapitre Besoins.
- **Réutilisations obligatoires** : drawer unique `useStaffingDrawerStore` (jamais de second
  système) ; modèle de détail opportunité existant (jamais dupliqué) ; actions
  `_actions/*` existantes ; `stages.ts`.
- **Hors périmètre** : Planning, Avant-vente, modules, suppression de `NeedsStaffingWorkspace`
  Mobile.
- **Critères d'acceptation** : rail Liste + détail central + rail Staffing rendus ; sélection
  URL-addressable (`?opp=` — PRODUCT-03 tranché ici) ; parité des actions conservées prouvée
  (création opp, création staffing, édition d'étape, simulation par ligne) ; **décision
  inscrite** pour Kanban (PRODUCT-02), `?scope`/`?view` (NAVIGATION-02), HEX→variables
  (LEGACY-05) ; aucun bouton mort.
- **Tests** : helpers de vue + contrats de navigation `?opp=`.
- **Gates** : standard (+ `npm test` complet si le périmètre touche des contrats partagés).
- **Documentation** : ledger § Lot 6 ; Decision Log OPP-18+ (Kanban, scope/view, détail besoin) ;
  PRODUCT-02/03/04, NAVIGATION-02, LEGACY-05 résolues.
- **Conditions de sortie** : gates vertes ; parité documentée ; commit + push.
- **Lot suivant** : Lot 7.

---

### Lot 7 — Avant-vente

- **Objectif** : créer le chapitre Avant-vente sur `OpportunitiesTriPanel` : rail Liste vide,
  surface principale `EmptyState`, rail Détails vide. **Aucune fausse donnée, aucun seed, aucun
  modèle métier inventé.**
- **État d'entrée** : Lot 2 livré.
- **Prérequis** : § 11 ; composant `EmptyState` maison.
- **Data** : **aucune**.
- **Desktop** : `src/features/opportunities/presales/PresalesDesktop.tsx` — 3 panneaux, vrais
  `EmptyState` (« Aucun projet avant-vente », wording produit à valider).
- **Mobile** : n/a.
- **Fichiers probables** : `presales/` + test.
- **Réutilisations obligatoires** : `EmptyState`, `OpportunitiesTriPanel`.
- **Hors périmètre** : tout modèle Projet tant que PRODUCT-05 n'est pas cadré.
- **Critères d'acceptation** : `?section=avant-vente` rend la structure 3 panneaux avec
  `EmptyState` authentiques ; aucune donnée fictive ; PRODUCT-05 reste ouverte et documentée.
- **Tests** : rendu `EmptyState`.
- **Gates** : standard.
- **Documentation** : ledger § Lot 7.
- **Conditions de sortie** : gates vertes ; commit + push.
- **Lot suivant** : Lot 8.

---

### Lot 8 — Data Contract Planning

- **Objectif** : builder **unique** `OpportunityDeadline` (`{ opportunityId, opportunityTitle,
  client, type, label, dueAt }`), **réutilisé par la Synthèse (§ 9.6) ET le Planning**.
  **Résout DATA-03** (règle d'arbitrage multi-dates). Auditer et réutiliser les loaders
  Planning actuels.
- **État d'entrée** : Lot 3 livré (le tableau échéances de la Synthèse doit basculer sur ce
  builder — refactor documenté).
- **Prérequis** : § 9.6 + § 12 ; `get-opportunities-planning.ts` ; `calendar_events` schéma.
- **Data** : lecture `opportunities` (`next_action_at`, `target_close_date`, `start_date`),
  `calendar_events` (`opportunity_id`, `starts_at`), `opportunity_candidates`. **Aucune
  migration.**
- **Desktop / Mobile** : builder + loader + tests.
- **Fichiers probables** : `src/features/opportunities/planning/data/build-opportunity-deadlines.ts`,
  `get-opportunity-deadlines.ts`, `opportunity-deadline.types.ts`, tests ; refactor du view-model
  Synthèse pour consommer ce builder.
- **Réutilisations obligatoires** : `get-opportunities-planning` (adapter, ne pas reconstruire).
- **Hors périmètre** : moteur de calendrier UI (Lot 9).
- **Critères d'acceptation** : un **seul** builder de deadlines dans tout le repo (test
  d'unicité / grep) ; règle d'arbitrage figée et testée ; `start_date` non traité comme
  échéance par défaut ; la Synthèse consomme ce builder (OPP-10).
- **Tests** : builder pur (multi-dates, priorité, exclusions).
- **Gates** : standard.
- **Documentation** : ledger § Lot 8 ; DATA-03 résolue.
- **Conditions de sortie** : gates vertes ; commit + push.
- **Lot suivant** : Lot 9.

---

### Lot 9 — Planning Desktop

- **Objectif** : chapitre Planning sur `OpportunitiesTriPanel` : rail **Liste opportunités**,
  surface **Planning central** (calendrier mois / année), rail **Détails opportunité
  sélectionnée**. Sélecteur **`Mois | Année`**. Échéances **cohérentes avec la Synthèse**
  (même builder, Lot 8).
- **État d'entrée** : Lots 2 + 8 livrés ; `UnifiedPlanningView` / `OpportunitiesPlanningView` /
  `StaffingPlanningView` legacy en place.
- **Prérequis** : § 12 ; audit `UnifiedPlanningView.tsx` (667), `OpportunitiesPlanningView.tsx`
  (694).
- **Data** : `get-opportunity-deadlines` (Lot 8) + loaders planning adaptés.
- **Desktop** : `src/features/opportunities/planning/PlanningDesktop.tsx` — **adapter** le
  moteur de planning existant (ne pas reconstruire un deuxième moteur) ; restreindre l'échelle
  à `mois | année`.
- **Mobile** : inchangé.
- **Fichiers probables** : `planning/` + tests.
- **Réutilisations obligatoires** : `UnifiedPlanningView` / `OpportunitiesPlanningView`
  (MOVE/REFACTOR) ; builder d'échéances unique.
- **Hors périmètre** : reconstruction d'un moteur de calendrier ; échelles semaine/trimestre
  (sauf décision).
- **Critères d'acceptation** : `?section=planning` rend les 3 panneaux ; sélecteur
  `Mois | Année` ; sélection d'opportunité partagée Liste ↔ Planning ↔ Détails
  (`?opp=`) ; les échéances affichées == celles de la Synthèse (test de cohérence).
- **Tests** : helpers de découpage temporel + cohérence builder.
- **Gates** : standard.
- **Documentation** : ledger § Lot 9.
- **Conditions de sortie** : gates vertes ; commit + push.
- **Lot suivant** : Lot 10.

---

### Lot 10 — Modules existants

- **Objectif** : raccorder **Matching profil**, **Simulation devis**, **Post-Mortem** dans
  `SectionRail.contextualModules` — **exclusivement via les capacités existantes**.
  `Modélisation de CA` reste future et **non affichée** (OPP-11).
- **État d'entrée** : Lot 1 livré ; modules Consultants / Financial Modeling / Intelligence
  Missions en place.
- **Prérequis** : § 13 ; `src/features/consultants/modules/profile-matching/` ;
  `src/components/staffing/matching/MatchingDialog.tsx` ;
  `src/lib/staffing-matching/use-opportunity-matching.ts` ;
  `@/features/financial-modeling` ; `src/features/intelligence-missions/components/mission-composer-model.ts` ;
  `use-mission-launcher.ts`.
- **Data** : aucune (lecture des caches existants `match_scores`, modèles financiers).
- **Desktop** : `src/features/opportunities/modules/` — points d'entrée fins :
  `opportunities-modules.ts` (déclaration `contextualModules` conditionnelle,
  `?module=matching|simulation|post-mortem`), wrappers qui montent les composants existants.
- **Mobile** : les entrées Mobile existantes (`FinancialModelingMobileFlow`,
  `ProfileMatchingMobile`) restent inchangées.
- **Fichiers probables** : `modules/` + tests de contrat.
- **Réutilisations obligatoires** : moteur unique `staffing-matching` ; modale
  `FinancialModelingDesktopDialog` ; mission `post-mortem-commercial` (aucune nouvelle mission /
  workflow / trigger). **Aucun composant copié, aucun loader forké, aucun recalcul de
  `match_scores`.**
- **Hors périmètre** : `Modélisation de CA` (non affichée) ; tout nouveau moteur/modale.
- **Critères d'acceptation** : les 3 modules ouvrent la capacité réelle ; contexte
  opportunité/besoin préservé quand il existe ; aucun bouton mort ; `Modélisation de CA` absente
  du rail ; CROSS-01/02/03 tranchées et inscrites au Decision Log (OPP-19+).
- **Tests** : contrat `contextualModules` (rendu conditionnel, `?module=` parsing).
- **Gates** : standard.
- **Documentation** : ledger § Lot 10 ; Decision Log ; CROSS-01/02/03 résolues.
- **Conditions de sortie** : gates vertes ; commit + push.
- **Lot suivant** : Lot 11.

---

### Lot 11 — Legacy / compatibilité / navigation globale

- **Objectif** : auditer puis traiter : anciens `scope`/`view`, anciens liens « Besoins &
  staffing », `main-menu` labels, `SectionNavBar` / `SectionNavBarSlot` liés à la route,
  redirection `/staffing`, deep-links historiques. **Coordonné avec SHELL-0018 Phase 6.**
  **Aucun retrait sans preuve de non-régression.**
- **État d'entrée** : Lots 1 + 6 livrés ; `/missions/opps` hors `(tabbed)` ;
  `missions/(tabbed)/layout.tsx` encore consommé par `actives`/`projets`.
- **Prérequis** : `docs/navigation_architecture/SHELL-0018/07-HANDOFF-PHASE-6-REPRISE-CHANTIER.md`
  (§ 13.4 A « Missions historiques ») ; `04-CURRENT-NAVIGATION-INVENTORY.md` ;
  `main-menu.config.ts` ; `resolveLegacyStaffingRedirect`.
- **Data** : aucune.
- **Desktop** :
  - `src/app/(app)/staffing/page.tsx` — repointer `resolveLegacyStaffingRedirect` vers
    `/missions/opps?section=besoins` (OPP-16).
  - `main-menu.config.ts` — entrée « Besoins & Staffing » → libellé **« Opportunités »**
    (`href` inchangé `/missions/opps`) ; coord. Phase 6 pour le rattachement de groupe.
  - Retrait de `src/app/(app)/missions/(tabbed)/opps/page.tsx` si pas déjà fait au Lot 1.
  - Audit : `SectionNavBarSlot` sur `missions/(tabbed)` — reste tant que `actives`/`projets`
    ne sont pas migrés (Phase 6.3) ; documenter l'état.
- **Mobile** : `getMobileTabsForPath()` — préserver le groupe `/missions/opps` + `/recruitment`
  (C-13 du Consultants Workspace) ; ne repointer que si la migration Mobile est explicitement
  décidée.
- **Fichiers probables** : `staffing/page.tsx`, `main-menu.config.ts`, tests d'invariants nav.
- **Réutilisations obligatoires** : contrat de compat `scope` du Lot 1.
- **Hors périmètre** : suppression globale de `SectionNavBar*` (SHELL-0018 Phase 6, pas ce
  chantier) ; redesign Mobile.
- **Critères d'acceptation** : `/staffing` → `/missions/opps?section=besoins` ; libellé menu
  « Opportunités » ; aucun deep-link `scope` cassé (tests) ; Mobile intact ; LEGACY-01/03
  documentées ; coordination Phase 6 inscrite au ledger et à SHELL-0018.
- **Tests** : invariants de navigation, résolution des URLs legacy.
- **Gates** : `npm test` complet (contrats de nav partagés) + `build`.
- **Documentation** : ledger § Lot 11 ; note dans
  `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md` (coordination) ;
  LEGACY-01/02/03 traitées ou reportées Lot 12.
- **Conditions de sortie** : gates vertes ; non-régression prouvée ; commit + push.
- **Lot suivant** : Lot 12.

---

### Lot 12 — Nettoyage et clôture

- **Objectif** : audit exhaustif — parité, code mort, duplications, imports legacy, URLs,
  tests, documentation, Mobile protégé, modules. Produire un **rapport de clôture**
  `02-CLOSURE-AUDIT.md`. Statut global du chantier → « techniquement close ».
- **État d'entrée** : Lots 1→11 livrés.
- **Prérequis** : tout le dossier + le code réel.
- **Data** : aucune.
- **Desktop / Mobile** : suppression du legacy prouvé mort uniquement
  (`OpportunitiesDesktopView.tsx`, `src/app/(app)/missions/(tabbed)/opps/`, composants
  `src/components/staffing/` / `src/components/needs-staffing/` sans consommateur — LEGACY-02/03).
- **Fichiers probables** : suppressions + `02-CLOSURE-AUDIT.md`.
- **Réutilisations obligatoires** : n/a.
- **Hors périmètre** : toute nouvelle feature.
- **Critères d'acceptation** : `grep` legacy vide (imports morts) ; `npm test` complet vert ;
  `build` vert ; Mobile inchangé (diff nul sur la branche Mobile) ; `contextualModules` = 3
  modules réels ; `Modélisation de CA` absente ; rapport de clôture listant chaque suppression
  avec sa preuve de parité.
- **Tests** : suite complète.
- **Gates** : `typecheck` → `npm test` → `check:server-boundary` → `lint` → `build`.
- **Documentation** : `02-CLOSURE-AUDIT.md` ; ledger statut global « techniquement close » ;
  entrée en tête de `docs/JOURNAL-SESSIONS.md`.
- **Conditions de sortie** : rapport publié ; commit + push ; SHA final au ledger.
- **Lot suivant** : — (chantier clos ; toute suite = nouveau lot explicite, ex. Mobile,
  Modélisation de CA, modèle Projet avant-vente).

---

## 20. Protocoles agent

### 20.1 Début de lot

```
1.  git fetch origin
2.  travailler uniquement sur main (aucune feature branch, jamais proposer de branche)
3.  synchroniser main avec origin/main sans écraser de travail parallèle
    (pas de reset --hard, pas de force push, pas de git add -A aveugle)
4.  lire CLAUDE.md
5.  lire AGENTS.md
6.  lire docs/FEATURES/opportunities_workspace/README.md
7.  lire 00-REFERENCE-CHANTIER-OPPORTUNITES.md (la fiche du lot concerné)
8.  lire 01-IMPLEMENTATION-LEDGER.md
9.  vérifier le code réel des fichiers cités (ils peuvent avoir bougé)
10. vérifier les dépendances cross-feature (SHELL-0018, Consultants, Financial Modeling,
    Intelligence Missions)
11. vérifier le schéma Supabase réel si le lot est un lot Data (information_schema, jamais
    le tableau de CLAUDE.md)
12. consigner toute divergence dans le ledger AVANT de coder
```

**Règle de vérité** :
`code réel origin/main` > `standards SHELL-0018` > `document canonique` > `ledger` >
`documents historiques`.

### 20.2 Fin de lot

```
1.  gates techniques dans l'ordre : typecheck → test (ciblés + complet si pertinent) →
    check:server-boundary → lint (fichiers touchés) → build
2.  mettre à jour le ledger (fichiers touchés, décisions, invariants protégés, dettes)
3.  mettre à jour le Decision Log (OPP-xx) si une décision a été prise
4.  consigner les dettes restantes explicitement
5.  consigner les tests RÉELLEMENT exécutés (jamais déclarer une gate non exécutée)
6.  aucune QA visuelle inventée — « QA visuelle : réservée à Guillaume »
7.  git fetch origin
8.  intégrer proprement tout travail parallèle
9.  commit sur main (message conventionnel : docs(opportunities): … / feat(opportunities): … /
    refactor(opportunities): …)
10. git push origin main
11. inscrire le SHA final au ledger
12. indiquer le NEXT LOT
```

### 20.3 QA

**Règle absolue** : Guillaume effectue **seul** la QA visuelle. L'agent ne lance **jamais**
`agent-browser`, Playwright, navigateur, screenshot, smoke visuel. Il ne demande aucun
renouvellement de `.codex/auth-state.json`. L'absence de QA visuelle **ne bloque pas** la
livraison technique.

### 20.4 Critères d'acceptation transverses (tous lots de code)

- Aucun HEX en dur dans le JSX (variables `@theme`).
- Aucune nouvelle librairie graphique ; SVG maison Desktop / barres HTML Mobile.
- `import "server-only"` + `check:server-boundary` vert sur tout module serveur.
- Branche Mobile protégée : jamais de composant Desktop lourd masqué en CSS ; distribution
  serveur `getDashboardDevice()`.
- Navigation reconstructible depuis l'URL (aucun `useState` de navigation éphémère).
- `contextualModules` : aucun bouton mort, aucun placeholder trompeur.
- Aucune migration Supabase hors lots Data (3, 8) et seulement si l'audit la prouve nécessaire.
- Aucune capacité legacy supprimée sans preuve de parité ou décision au Decision Log (OPP-15).
