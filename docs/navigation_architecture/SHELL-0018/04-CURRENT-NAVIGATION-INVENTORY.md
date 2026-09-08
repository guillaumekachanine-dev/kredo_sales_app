# SHELL-0018 V2 — Inventaire des navigations secondaires Desktop

> **Statut : à jour au 2026-09-08 (HEAD de clôture Phase 4)**  
> **Chantier : SHELL-0018 Navigation secondaire Desktop**  
> **Branche de travail unique : `main`**

## 1. Objet

Inventaire opérationnel exhaustif des navigations secondaires Desktop après exécution des Phases 1, 2, 3, 4 et 5.1.

Ce document décrit l'état réel du code sur `main`.

---

## 2. Matrice globale des 9 surfaces canoniques

| Ordre | Surface | Fichier principal | Primitive | Largeur | Chapeau (navy centré) | Chapitres | Modules contextuels (Lot 3.1) | État de navigation URL | Statut Phase 4 |
|---:|---|---|---|---:|---|---|---|---|:---:|
| 1 | Account Intelligence | `src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.tsx` | `SectionRail` | `11.5rem` | `Account Intelligence` | 7 chapitres typés | 3 modules conditionnels (`contacts`, `documents`, `playbook`) | `?aiSection=` (accueil racine sans paramètre) ; embedded CRM isolé | ✅ techniquement livré |
| 2 | Business Intelligence | `src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.tsx` | `SectionRail` | `11.5rem` | `Business Intelligence` | 6 chapitres typés | 2 modules conditionnels (`studies`, `playbooks`) | `?segment=<id>&tab=<chapter>` (`home` racine) | ✅ techniquement livré |
| 3 | Veille & actualités | `src/components/veille/VeilleLocalNavigation.tsx` | `SectionRail` | `11.5rem` | `Veille & actualités` | 4 chapitres typés | 1 module conditionnel (`source-management`) | `?section=` (`news` racine sans paramètre) | ✅ techniquement livré |
| 4 | Rapports & rédaction | `src/components/reports/ReportsLocalNavigation.tsx` | `SectionRail` | `11.5rem` | `Rapports & rédaction` | 3 chapitres typés | `undefined` (aucun module artificiel) | `?section=` (`documents` racine sans paramètre) | ✅ techniquement livré |
| 5 | Automatisations | `src/components/automations/AutomationsLocalNavigation.tsx` | `SectionRail` | `11.5rem` | `Automatisations` | 3 chapitres typés | `undefined` (actions transverses exclues) | `?section=` (`journal` racine sans paramètre) ; `?run=` orthogonal | ✅ techniquement livré |
| 6 | Engagements | `src/components/missions/engagements/EngagementsDesktopView.tsx` | `SectionRail` (inline) | `11.5rem` | `Engagements` | 5 chapitres typés | `undefined` (aucun module) | `?vue=` (`synthese` racine sans paramètre) | ✅ techniquement livré |
| 7 | Prospection Intelligence | `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx` | `SectionRail` | `11.5rem` | `Prospection` | 4 chapitres typés | `undefined` (actions globales exclues) | `?section=` (`strategy` racine sans paramètre) | ✅ techniquement livré |
| 8 | Knowledge Hub | `src/features/knowledge-hub/KnowledgeHubLocalNavigation.tsx` | `SectionRail` | `11.5rem` | `Knowledge Hub` | Contextuel (Domaines / Sections) | 1 module conditionnel (`workshop`) | `?domain=` + `?section=` (`/knowledge` racine Catégories) | ✅ techniquement livré |
| 9 | Finance | `src/components/finance/FinanceLocalNavigation.tsx` | `SectionRail` | `11.5rem` | `Finance` | 3 chapitres typés | `undefined` (rail droit analytique distinct) | `?tab=` (`synthesis` racine sans paramètre) | ✅ techniquement livré |
| 10 | Legacy Shell | `src/components/layout/SectionNavBarSlot.tsx` | `SectionNavBar` (horizontal) | — | — | Onglets horizontaux legacy (2 routes actives, 4 no-ops) | — | Pathname | ⬜ Phase 6 |

---

## 3. Détail des 9 surfaces

### 3.1 Account Intelligence

- **Route :** `/prospection/accounts/[companyId]` + shell multi-comptes CRM (`/prospection/accounts`)
- **Composant Desktop :** `ClientIntelligenceDesktopView.tsx`
- **Adaptateur rail :** `ClientIntelligenceSidebar.tsx` → primitive partagée `SectionRail`
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Account Intelligence`, actionnant le retour au chapitre `accueil`
- **Chapitres :** 7 entrées typées (`accueil`, `socle`, `connaissance`, `secteur`, `enjeux`, `strategie`, `roadmap`)
- **Modules contextuels :** `Répertoire` (ouvre `ContactDirectoryDialog` sur le compte), `Bibliothèque` (ouvre `CompanyDocumentsModal` sur le compte), `Playbook` (lien direct `/ressources/playbook/{slug}`). Uniquement si le callback ou le slug existe ; `undefined` sinon
- **État navigation :** Dérivé de `useSearchParams()` via `parseAccountIntelligenceSection()`
- **Contrat URL :** `?aiSection=` (`accueil` est l'état racine sans paramètre)
- **Mode embedded CRM :** Géré par le réducteur pur de `CrmTabbedShell.tsx` (`embeddedAccountIntelligenceNavigationReducer`) qui mémorise la section active par panneau sans polluer l'URL des autres comptes
- **Header principal :** Affiche dynamiquement le nom du chapitre actif via `getClientIntelligenceDesktopTabLabel(activeTab)` (`Accueil`, `Socle`, `Entreprise`, `Secteur`, `Enjeux`, `Stratégie`, `Roadmap`)
- **Statut Phase 4 :** ✅ Techniquement livré (Lot 4.2)

### 3.2 Business Intelligence

- **Route :** `/intelligence`
- **Composant Desktop :** `BusinessIntelligenceDesktop.tsx`
- **Adaptateur rail :** `BusinessIntelligenceLocalNavigation.tsx` → `SectionRail`
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Business Intelligence`, actionnant `home` via `onChange("home")`
- **Chapitres :** 6 entrées issues de `BI_CHAPTERS` (`home`, `sector-analysis`, `competitive-environment`, `regulatory-calendar`, `value-chain`, `sector-news`)
- **Modules contextuels :** `Études sectorielles` (`studies`) et `Playbooks` (`playbooks`), soumis à double garde (couverture disponible `coverage.*.available` + callback présent) ; `undefined` sinon
- **État navigation :** Dérivé de l'URL via `resolveBiChapter(searchParams.get("tab") ?? initialTab)`
- **Contrat URL :** `?segment=<id>&tab=<chapter>` (`home` est le chapitre d'accueil canonique)
- **Navigation :** `window.history.pushState` avec `replaceBiChapterInHref` (maintient le segment actif)
- **Header principal :** Affiche le libellé exact du chapitre actif via `getBiChapterLabel(activeChapter)` dans `BusinessIntelligenceHeader` et `BusinessIntelligenceSignatureHeader`
- **Statut Phase 4 :** ✅ Techniquement livré (Lots 2.2 et 3.1)

### 3.3 Veille & actualités

- **Route :** `/veille`
- **Composant Desktop :** `VeilleActualitesDesktop.tsx`
- **Adaptateur rail :** `VeilleLocalNavigation.tsx` → `SectionRail`
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Veille & actualités`, actionnant la section racine `news`
- **Chapitres :** 4 entrées typées `VEILLE_DESKTOP_CHAPTERS` (`news`, `watched-accounts`, `strategic-analysis`, `history`)
- **Modules contextuels :** `Gestion des sources` (`source-management`), rendu uniquement si `onOpenSourceManagement` est fourni ; `undefined` sinon
- **État navigation :** Dérivé de `useSearchParams()` via `parseVeilleSection(searchParams.get("section"))`
- **Contrat URL :** `?section=` (`news` est l'état racine sans paramètre, `section` est omis)
- **Navigation :** `router.push(buildVeilleSectionHref(pathname, searchParams, nextSection))`
- **Header principal :** Affiche le titre exact via `getVeilleDesktopChapterLabel(section)` (`Actualités`, `Veille ciblée`, `Analyses`, `Archives`)
- **Statut Phase 4 :** ✅ Techniquement livré (Lot 4.1)

### 3.4 Rapports & rédaction

- **Route :** `/reports`
- **Composant Desktop :** `ReportsDesktopView.tsx`
- **Adaptateur rail :** `ReportsLocalNavigation.tsx` → `SectionRail`
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Rapports & rédaction`, actionnant la section racine `documents`
- **Chapitres :** 3 entrées typées `REPORTS_DESKTOP_CHAPTERS` (`documents`, `knowledge`, `generation`)
- **Modules contextuels :** `undefined` (aucun module contextuel distinct des chapitres)
- **État navigation :** Dérivé de `useSearchParams()` via `parseReportsSection(searchParams.get("section"))`
- **Contrat URL :** `?section=` (`documents` est l'état racine sans paramètre ; les filtres et `?doc=` sont orthogonaux et préservés)
- **Navigation :** `router.push(buildReportsSectionHref(pathname, searchParams, nextSection), { scroll: false })`
- **Header principal :** Affiche le titre exact via `getReportsDesktopChapterLabel(activeSection)` (`Bibliothèque`, `Connaissances`, `Génération`)
- **Statut Phase 4 :** ✅ Techniquement livré (Lot 4.3)

### 3.5 Automatisations

- **Route :** `/automations`
- **Composant Desktop :** `AutomationsDesktopDashboard.tsx`
- **Adaptateur rail :** `AutomationsLocalNavigation.tsx` → `SectionRail`
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Automatisations`, actionnant le chapitre racine `journal`
- **Chapitres :** 3 entrées typées `AUTOMATIONS_DESKTOP_CHAPTERS` (`journal`, `sante`, `couts`)
- **Modules contextuels :** `undefined` (actions transverses exclues)
- **État navigation :** Dérivé de `useSearchParams()` via `parseAutomationsSection(searchParams.get("section"))`
- **Contrat URL :** `?section=` (`journal` est l'état racine sans paramètre ; `?run=<id>` est strictement orthogonal)
- **Navigation :** `router.push(buildAutomationsSectionHref(pathname, searchParams, next), { scroll: false })`
- **Header principal :** Affiche le titre exact via `getAutomationsDesktopChapterLabel(activeTab)` (`Journal d'exécution`, `Santé des workflows`, `Coûts`)
- **Statut Phase 4 :** ✅ Techniquement livré (Lot 4.4)

### 3.6 Engagements

- **Route :** `/missions`
- **Composant Desktop :** `EngagementsDesktopView.tsx`
- **Adaptateur rail :** `<SectionRail>` inline direct
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Engagements`, pointant vers `home: { href: "/missions" }`
- **Chapitres :** 5 entrées typées `NAV_ENTRIES` (`synthese`, `missions-at`, `projets`, `activite-conges`, `planning-at`)
- **Modules contextuels :** Non déclarés / `undefined`
- **État navigation :** Dérivé du paramètre serveur `vue` via `pickView()` dans `src/app/(app)/missions/page.tsx`
- **Contrat URL :** `?vue=` (`synthese` est l'état racine sans paramètre ou avec `vue=synthese`)
- **Navigation :** `<SectionRail>` utilise `href: /missions?vue=${entry.view}` via `<Link>` Next.js
- **Header principal :** Affiche le titre exact via `HEADER_TITLE_BY_VIEW[activeView]` (`Synthèse`, `Missions AT`, `Projets`, `Activité & congés`, `Planning des engagements`)
- **Statut Phase 4 :** ✅ Techniquement livré (Lot 2.6)

### 3.7 Prospection Intelligence

- **Route :** `/prospection-intelligence` (redirection de `/prospection` vers `/intelligence` inchangée)
- **Composant Desktop :** `ProspectionIntelligenceDesktop.tsx`
- **Adaptateur rail :** `ProspectionIntelligenceLocalNavigation.tsx` → `SectionRail` (normalisé de `15rem` à `11.5rem`)
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Prospection`, actionnant le chapitre racine `strategy`
- **Chapitres :** 4 entrées typées `PROSPECTION_DESKTOP_CHAPTERS` (`strategy`, `chapter_1`, `chapter_2`, `chapter_3`)
- **Modules contextuels :** `undefined` (actions transverses exclues)
- **État navigation :** Dérivé de `useSearchParams()` via `parseProspectionSection(searchParams.get("section"))`
- **Contrat URL :** `?section=` (`strategy` est l'état racine sans paramètre)
- **Navigation :** `router.push(buildProspectionSectionHref(pathname, searchParams, next), { scroll: false })`
- **Header principal :** Affiche le titre exact via `getProspectionDesktopChapterLabel(activeTab)` (`Brief`, `Fenêtres d'opportunités`, `Approches commerciales`, `Playbooks`)
- **Statut Phase 4 :** ✅ Techniquement livré (Lot 4.5)

### 3.8 Knowledge Hub

- **Route :** `/knowledge`
- **Composant Desktop :** `KnowledgeHubDesktop.tsx`
- **Adaptateur rail :** `KnowledgeHubLocalNavigation.tsx` → `SectionRail` (normalisé de `12.5rem` à `11.5rem`)
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Knowledge Hub`, actionnant l'accueil `{ type: "categories" }`
- **Chapitres :** Navigation contextuelle dynamique :
  - Niveau racine (`categories`) : liste des domaines
  - Niveau domaine (`domain`) : liste des sections du domaine actif (`EXPERTISE_CHAPTERS`, `TALENTS_CHAPTERS`, etc.)
- **Modules contextuels :** `Ateliers` (`workshop`), conditionné par la disponibilité de `onOpenModal` ; `undefined` sinon. (Note : l'entrée placeholder `ask` a été retirée au Lot 3.1)
- **État navigation :** Dérivé de `useSearchParams()` via `parseKnowledgeHubView(searchParams.get("domain"), searchParams.get("section"))`
- **Contrat URL :** `/knowledge` (racine Catégories), `/knowledge?domain=<id>` ou `/knowledge?domain=<id>&section=<id>`
- **Navigation :** `router.push(buildKnowledgeHubViewHref(pathname, searchParams, nextView), { scroll: false })`
- **Header principal :** Affiche le titre actif via `getKnowledgeHubActiveLabel(activeView)` (`Catégories`, ou nom de la section/domaine actif)
- **Statut Phase 4 :** ✅ Techniquement livré (Lot 4.6)

### 3.9 Finance

- **Route :** `/finance`
- **Composant Desktop :** `FinanceDesktopDashboard.tsx` (remplacement définitif de `FinanceTabs.tsx`)
- **Adaptateur rail :** `FinanceLocalNavigation.tsx` → `SectionRail`
- **Largeur :** `11.5rem` (`184px`)
- **Chapeau :** Bouton navy centré `Finance`, actionnant le chapitre racine `synthesis`
- **Chapitres :** 3 entrées typées `FINANCE_DESKTOP_CHAPTERS` (`synthesis`, `profitability`, `forecast`)
- **Modules contextuels :** `undefined` (le rail droit analytique de `DesktopAnalyticalPage` est distinct et préservé)
- **État navigation :** Dérivé de `useSearchParams()` via `parseFinanceTab(searchParams.get("tab"))`
- **Contrat URL :** `?tab=` (`synthesis` est l'état racine sans paramètre)
- **Navigation :** `router.push(buildFinanceHref(pathname, searchParams, tab))`
- **Header principal :** Affiche le titre exact via `getFinanceDesktopChapterLabel(activeTab)` dans `DesktopAnalyticalPage` (`Synthèse`, `Rentabilité missions`, `Prévision & simulation`)
- **Statut Phase 4 :** ✅ Techniquement livré (Lot 5.1)

---

## 4. Éléments legacy identifiés pour Phase 6 (Refonte Shell global)

1. **`SectionNavBarSlot.tsx`** et **`SectionNavBar.tsx`** :
   - Montés dans 6 layouts : `missions/(tabbed)`, `consultants`, `automations`, `knowledge`, `finance`, `prospection`.
   - Actifs sur 2 routes : `/missions/(tabbed)` et `/consultants`.
   - No-ops au runtime sur 4 routes : `/automations`, `/knowledge`, `/finance`, `/prospection` (aucun onglet configuré dans `main-menu.config.ts`, retournent `null`).
   - Traitement Phase 6 : migration de `/consultants`, unification des sous-routes missions, puis suppression des deux composants.
2. **`useSidebarCollapse`** :
   - Hook / store Zustand gérant le repli automatique de la sidebar globale gauche sur les pages à rail secondaire dense.
   - Traitement Phase 6 : décision finale sur le comportement du menu principal (push vs overlay vs largeur adaptative).
3. **Layouts historiques à unifier :**
   - `src/app/(app)/missions/(tabbed)/layout.tsx`
   - `src/app/(app)/consultants/layout.tsx`
