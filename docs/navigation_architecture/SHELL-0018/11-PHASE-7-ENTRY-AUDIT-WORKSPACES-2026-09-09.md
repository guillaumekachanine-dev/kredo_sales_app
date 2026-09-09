# Phase 7 — Audit CURRENT → TARGET des workspaces

> **Statut : ENTRY AUDIT / IMPLEMENTATION PLAN**
> **Date : 2026-09-09**
> **Branche : `main`**
> **HEAD audité : `f477f736` (`docs(shell-0018): close phase 6 shell migration`) — `HEAD == origin/main`**
> **Nature : audit + documentation. 0 modification de code applicatif.**

Ce document est la **référence opérationnelle de la Phase 7**. Il revalide la Partie C de
`09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` contre `origin/main`, ajoute les couches
manquantes (impact Data, Routing, Desktop/Mobile, blockers, séquençage) et produit les critères
d'acceptation de chaque lot 7.1 → 7.10.

- `09-*` = **cible** (chapitres / modules par workspace).
- `10-*` = preuve de clôture Phase 6 (invariants Shell figés) — **CLOSED, ne pas rouvrir**.
- `11-*` (ce document) = **plan d'exécution** de la Phase 7.

Toutes les preuves sont établies sur `HEAD` (`git show HEAD:…`, `git grep … HEAD`,
`git ls-tree HEAD`) — le working tree porte deux chantiers parallèles (§17).

---

## 1. Baseline

| Élément | Valeur |
|---|---|
| `git rev-parse HEAD` | `f477f73619b39a6d90ecbd3bbb97962ca75812eb` |
| `git rev-parse origin/main` | idem — synchronisés |
| Dernier lot Phase 6 | 6.7 (`f477f736`) — Phase 6 CLOSED |
| Cible produit | `09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` (Partie B / C) |
| Séquence Phase 7 (09 §E.2) | 7.0 → 7.1 Opportunités → 7.2 Consultants → 7.3 Engagements+Finance → 7.4 BI → 7.5 Prospection → 7.6 Rapports → 7.7 Veille → 7.8 Knowledge Hub → 7.9 Automatisations → 7.10 Audit final |

### Travaux parallèles présents dans le working tree (hors Phase 7.0)

```
 M docs/JOURNAL-SESSIONS.md
 M src/features/opportunities/summary/{SummaryDesktop,summary-geometry,DeadlinesTable,
     PipeBreakdownChart,ProcessFlowChart,SkillsComparisonChart}.tsx
 M src/features/opportunities/summary/__tests__/summary.test.ts
 M src/components/agenda/{AgendaMobileWorkspace,agenda-mobile-model,agenda-mobile-model.test}.ts(x)
?? src/components/agenda/MobileAgendaTimeline.tsx
```

- **Refonte Synthèse Opportunités** (`src/features/opportunities/summary/`) → **bloque 7.1** (chapitre
  `synthese` = cible « Vue d'ensemble »). Voir §17 / §22.
- **Agenda Mobile** (`src/components/agenda/`) → **hors périmètre Phase 7** (Agenda n'est pas un
  workspace Phase 7). Aucun impact sur les lots 7.x.
- **Aucun de ces fichiers n'est modifié / stagé / committé par 7.0.**

---

## 2. Invariants Phase 6 — hors périmètre Phase 7

La Phase 7 **ne rouvre pas** (doc `10-*`) :

| Invariant | Preuve HEAD |
|---|---|
| Navigation principale Desktop (`main-menu.config.ts`, `DesktopSidebar`) | `10-*` §1 |
| Architecture du collapse (`resolveDesktopSidebarCollapsed`, 4 sources) | `10-*` §8 |
| `useSidebarCollapse` — 1 émetteur (`CrmTabbedShell`) | `10-*` §9 |
| Cockpit Intelligence — surface globale, `useIntelligencePanel.isOpen` lu par le Shell | `10-*` §11 |
| `AppShell` Server Component | `10-*` §12 |
| Primitive `SectionRail` (`w-[11.5rem]`, chapeau navy, Chapitres/Modules) | `01-*`, `02-*` |
| `SectionTabBar` (tabs de fiches entités) | `10-*` §4 |
| Architecture Mobile globale (`AppShell` branche `isMobile`, `MobileNav`, `IntelligenceFAB`) | `10-*` §12 |
| Pathnames canoniques | §15 ci-dessous |

**Label ≠ pathname (NAV-TARGET-10).** Aucun renommage de chapitre/module ne crée de route.

Pathnames figés : `/cockpit` · `/agenda` · `/prospection/accounts` · `/missions/opps` · `/missions`
· `/consultants` · `/finance` · `/intelligence` · `/prospection-intelligence` · `/reports` ·
`/veille` · `/knowledge` · `/automations` · `/settings`.

---

## 3. Méthodologie CURRENT → TARGET

### 3.1. Valeurs `Traitement`

`KEEP` · `RENAME` (label seul) · `MOVE` (déplacement de niveau, code inchangé) · `REUSE` (capacité
existante montée ailleurs) · `TRANSFORM` (chapitre ↔ module, ou changement de nature) ·
`NEW/FUTURE` (capacité absente — jamais un bouton mort, NAV-TARGET-07) · `REMOVE`.

### 3.2. Classes d'impact Data

| Classe | Signification |
|---|---|
| **DATA-0** | Aucun changement Data. Rename / move UI pur. |
| **DATA-1** | Nouveau loader OU réutilisation d'un loader existant, **sans nouveau contrat DB**. |
| **DATA-2** | Nouvelle vue / RPC / contrat Data nécessaire (pas de changement de schéma). |
| **DATA-3** | Modification de schéma / métier structurante. |

**Le Lot 7.0 ne crée aucune migration. Aucun lot 7.x ne devrait atteindre DATA-3** sur la base de
cet audit (à reconfirmer par lot).

### 3.3. Classes d'impact Routing

| Classe | Signification |
|---|---|
| **URL-0** | Label seul. `?section=` / `?tab=` / `?vue=` inchangés. |
| **URL-1** | Query param / navigation interne existante réutilisée. |
| **URL-2** | Nouvelle représentation interne, **pathname stable**, éventuel nouveau `?module=` / clé de query. |
| **URL-3** | `permanentRedirect` de compatibilité requis. |

Principe : **pathname stable par défaut** (NAV-TARGET-02). Aucune classe URL-3 identifiée pour la
Phase 7 (les redirects legacy existants — §15 — restent en place, aucun nouveau).

### 3.4. Classes d'impact Mobile

`NO IMPACT` · `LABEL SYNC` (aligner un libellé mobile) · `SEPARATE IMPLEMENTATION` (le mobile a sa
propre architecture, à traiter distinctement) · `FUTURE` (mobile stub / absent).

Adaptive Design (ADR-0006) : Desktop = analyse dense ; Mobile = action synthétique ; **jamais** de
composant Desktop chargé pour être masqué en CSS. Un rename de `SectionRail` Desktop **n'entraîne
pas** automatiquement une modification Mobile.

### 3.5. Statut de préparation par workspace

`READY` · `READY WITH REBASELINE` (attend l'intégration d'un chantier parallèle) ·
`NEEDS PRODUCT DECISION` · `NEEDS DATA DECISION` · `BLOCKED BY PARALLEL WORK`.

---

## 4. Opportunités — `/missions/opps` (Lot 7.1)

**Preuves HEAD :** `src/features/opportunities/navigation/opportunities-sections.ts`,
`src/features/opportunities/modules/opportunities-modules.ts`,
`src/features/opportunities/desktop/OpportunitiesDesktopShell.tsx`,
`src/features/opportunities/modules/__tests__/opportunities-modules-reuse.test.ts`.

### A. Routing
- Pathname canonique `/missions/opps` — racine `synthese` **sans paramètre**.
- Chapitres : `?section=besoins|avant-vente|planning`. Compat `?scope=needs|staffing` → `besoins`
  **au parsing** (`parseOpportunitiesSection`), aucun redirect dur.
- Modules : `?module=matching|simulation|post-mortem`, orthogonal à `?section=` et `?opp=`.
- `buildOpportunitiesSectionHref` purge les clés éphémères (`LEGACY_NEEDS_STAFFING_QUERY_KEYS` :
  `scope, view, stage, priority, practice, sort, direction, opp, module`) au changement de chapitre.

### B. Navigation CURRENT (code)
Chapitres : `synthese` « Synthèse » · `besoins` « Besoins & staffing » · `avant-vente`
« Avant-vente » · `planning` « Planning » (`OPPORTUNITIES_SECTIONS`, `HEADER_TITLE_BY_SECTION`).
Modules (constamment visibles, Lot 10) : `matching` « Matching profil » · `simulation`
« Simulation devis » · `post-mortem` « Post-Mortem » (`OPPORTUNITIES_MODULE_LABELS`).

### C. Navigation TARGET (09 §B.1)
Chapitres : **Vue d'ensemble · Besoins & Staffing · Avant-vente Projets · Planning & Échéances**.
Modules : **Matching profils · Simulation financière · Revue post-mortem**.

### D. Data
- `synthese` → `SummaryDesktop` (`src/features/opportunities/summary/`) — **en cours de refonte
  parallèle** (§17).
- `besoins` → `NeedsDesktop` + `getMobileStaffingsList` (`src/app/(app)/staffing/_data/`).
- `avant-vente` → `PresalesDesktop`.
- Modules : `MatchingDialog` (`@/components/staffing/matching/`, moteur unique
  `src/lib/staffing-matching/`) ; `FinancialModelingDesktopDialog` (`@/features/financial-modeling`) ;
  `MissionComposerDesktop` + `POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG` (mission
  `post-mortem-commercial` du `MISSION_CATALOG`). Test `opportunities-modules-reuse.test.ts` verrouille :
  aucun moteur ré-implémenté, aucune 2ᵉ modale, aucun webhook.

### E. Vue Desktop
`OpportunitiesDesktopShell` = `SectionRail` inline (chapitres + `contextualModules` = 3 modules) +
header. Dialogs en `next/dynamic` (lazy).

### F. Vue Mobile
`/missions/opps` branche `device === "mobile"` (`getDashboardDevice`). Vue mobile dédiée
(`getMobileStaffingsList`, ne charge pas les données Desktop — Adaptive plein). **Rename de rail
Desktop → `LABEL SYNC` mobile uniquement si un libellé de section est affiché côté mobile** (à
confirmer en 7.1).

### G. Réutilisation
Les 3 modules sont **déjà `REUSE` complet** — le lot 7.1 ne fait que **renommer** (RENAME).

### H. Risques
- **Chantier parallèle Synthèse** : le chapitre `synthese` (→ « Vue d'ensemble ») ne doit pas être
  renommé tant que la refonte n'est pas mergée ou explicitement rebaselinée. Sinon conflit sur
  `SummaryDesktop.tsx` / `summary-geometry.ts`.
- `OpportunitiesDesktopView.tsx` legacy (Partie F du 09) : à réévaluer REUSE/REMOVE **après** 7.1
  (Opportunities Lot 12, `DEFERRED UNTIL TARGET-ALIGNMENT`).

### Matrice

| Niveau | CURRENT | TARGET | Traitement | Source | Data | Desktop | Mobile | Dépendance | Lot |
|---|---|---|---|---|---|---|---|---|---|
| Chapitre | `synthese` « Synthèse » | Vue d'ensemble | RENAME | `opportunities-sections.ts` | DATA-0 | label rail + `HEADER_TITLE_BY_SECTION` | LABEL SYNC (à confirmer) | **refonte Summary parallèle** | 7.1 |
| Chapitre | `besoins` « Besoins & staffing » | Besoins & Staffing | RENAME (casse) | idem | DATA-0 | label | NO IMPACT | — | 7.1 |
| Chapitre | `avant-vente` « Avant-vente » | Avant-vente Projets | RENAME | idem | DATA-0 | label | NO IMPACT | — | 7.1 |
| Chapitre | `planning` « Planning » | Planning & Échéances | RENAME | idem | DATA-0 | label | NO IMPACT | — | 7.1 |
| Module | `matching` « Matching profil » | Matching profils | RENAME | `opportunities-modules.ts` | DATA-0 | label `OPPORTUNITIES_MODULE_LABELS` | NO IMPACT | — | 7.1 |
| Module | `simulation` « Simulation devis » | Simulation financière | RENAME | idem | DATA-0 | label | NO IMPACT | — | 7.1 |
| Module | `post-mortem` « Post-Mortem » | Revue post-mortem | RENAME | idem | DATA-0 | label | NO IMPACT | — | 7.1 |

**Statut : `READY WITH REBASELINE`** (attend l'intégration de la refonte Synthèse Opportunités).
Complexité **LOW** (7 renames purs, 0 Data).

---

## 5. Consultants — `/consultants` (Lot 7.2)

**Preuves HEAD :** `src/features/consultants/navigation/consultants-sections.ts`,
`src/features/consultants/desktop/ConsultantsDesktopShell.tsx`,
`src/features/consultants/skills/` (chapitre `pool-competences`),
`src/features/consultants/modules/{production-leave,profile-matching}/`.

### A. Routing
- `/consultants` racine `synthese` sans paramètre ; `?section=collaborateurs|activite-conges|
  candidats|pool-competences` (toutes internalisées, `external: false`).
- Modules : `?module=production-conges|matching-profil` (+ `&person=`), `buildConsultantsModuleHref`.
- Redirects legacy `permanentRedirect` : `/consultants/activite-conges` → `?section=activite-conges` ;
  `/consultants/pool-competences` → `?section=pool-competences` ; `/recruitment` → `?section=candidats`.

### B. Navigation CURRENT
Chapitres : `synthese` « Synthèse » · `collaborateurs` « Collaborateurs » · `activite-conges`
« Activités & congés » · `candidats` « Candidats » · `pool-competences` « Pool de compétences ».
Modules : `production-conges` « Production & Congés » · `matching-profil` « Matching profil »
(`CONSULTANTS_CONTEXTUAL_MODULES`).

### C. Navigation TARGET (09 §B.3)
Chapitres : **Vue d'ensemble · Collaborateurs · Activité & Congés · Vivier Candidats**
(`pool-competences` **sort des chapitres**).
Modules : **Pool de compétences** (ex-chapitre) · **Production & Congés** · **Matching Profil** ·
**Mission : prévoir les disponibilités**.

### D. Data
- `pool-competences` → `src/lib/consultants/pool-competences-data.ts` + composants
  `src/features/consultants/skills/` (`PoolCompetencesMap`, `PoolCompetencesConnections`, etc.).
- Modules : `production-leave/data/get-production-leave.ts` + `build-production-leave.ts` (builder pur,
  contrat mensuel) ; `profile-matching/data/get-profile-matching.ts` + `build-profile-matching.ts`.
- « Mission : prévoir les disponibilités » : **spec candidate `capacite-staffing` dans
  `MISSION_CATALOG`** (`src/features/intelligence-missions/domain/mission-catalog.ts`) — voir §18.

### E. Vue Desktop
`ConsultantsDesktopShell` = `SectionRail` (chapitres + `contextualModules` = 2 modules montés en
sibling, `ProductionLeaveDesktop` / `ProfileMatchingDesktop`).

### F. Vue Mobile
`/consultants` adaptive plein (`ConsultantsMobileShell`, `SyntheseMobile`, …). Les 2 modules ont
**une implémentation Mobile dédiée** (`production-leave/mobile/`, `profile-matching/mobile/`).
`getMobileTabsForPath("/consultants")` fournit 5 onglets Mobile (`main-menu.config.ts`) incluant
« Pool de compétences » → **`SEPARATE IMPLEMENTATION`** : la transformation chapitre → module côté
Desktop **ne doit pas** retirer le pool de la navigation Mobile sans décision explicite.

### G. Réutilisation
- `Pool de compétences` : `TRANSFORM` — code `skills/` **conservé**, remonté dans un module
  (`?module=pool-competences` ou modal). URL-2.
- `Production & Congés`, `Matching Profil` : `KEEP` (déjà modules).

### H. Risques
- **Divergence Desktop/Mobile** sur `pool-competences` (chapitre Mobile vs module Desktop).
- `?section=pool-competences` + redirect legacy : **conservés** même après passage en module
  (compat) — le module peut aussi accepter `?section=pool-competences` en alias, à trancher en 7.2.
- Composants legacy recrutement (Partie F) : réévaluer **après** 7.2 (Consultants Lot 15).

### Matrice

| Niveau | CURRENT | TARGET | Traitement | Source | Data | Desktop | Mobile | Dépendance | Lot |
|---|---|---|---|---|---|---|---|---|---|
| Chapitre | `synthese` « Synthèse » | Vue d'ensemble | RENAME | `consultants-sections.ts` | DATA-0 | label | LABEL SYNC | — | 7.2 |
| Chapitre | `collaborateurs` | Collaborateurs | KEEP | idem | DATA-0 | — | NO IMPACT | — | 7.2 |
| Chapitre | `activite-conges` « Activités & congés » | Activité & Congés | RENAME (casse) | idem | DATA-0 | label | LABEL SYNC | — | 7.2 |
| Chapitre | `candidats` « Candidats » | Vivier Candidats | RENAME | idem | DATA-0 | label | LABEL SYNC | — | 7.2 |
| Chapitre → Module | `pool-competences` « Pool de compétences » | Module « Pool de compétences » | TRANSFORM | `consultants-sections.ts` + `skills/` | DATA-0 (code conservé) | rail : sortir des `chapters`, entrer dans `contextualModules` ; monter `skills/` en overlay | SEPARATE IMPLEMENTATION (garder l'onglet Mobile) | — | 7.2 |
| Module | `production-conges` | Production & Congés | KEEP | `modules/production-leave/` | DATA-0 | — | NO IMPACT | — | 7.2 |
| Module | `matching-profil` « Matching profil » | Matching Profil | RENAME (casse) | `modules/profile-matching/` | DATA-0 | label | NO IMPACT | — | 7.2 |
| Module | — | Mission : prévoir les disponibilités | NEW/FUTURE (framework REUSE possible) | `MISSION_CATALOG` slug `capacite-staffing` + `MissionComposerDesktop` | DATA-1 (providers mission existants) | nouveau `contextualModule` | FUTURE | §18 | 7.2 ou différé |

**Statut : `IMPLEMENTED / PASS` (Phase 7.2 — 2026-09-09).** Complexité **MEDIUM** (1 TRANSFORM
structurel + arbitrage Mobile). 0 Data nouvelle. commit `bb2a3a4d` (`refactor(consultants): align workspace target navigation`).

> **Livré :** 4 chapitres Desktop + libellés produit (`CONSULTANTS_DESKTOP_CHAPTERS`,
> `HEADER_TITLE_BY_SECTION`) ; `pool-competences` chapitre Desktop → **Module Desktop**
> (`CONSULTANTS_CONTEXTUAL_MODULES` = `pool-competences`, `production-conges`, `matching-profil`),
> wrapper `PoolCompetencesDesktop` (primitive `AppDialog`) réutilisant `PoolCompetencesMap` +
> `getConsultantsSkills` **à l'identique** ; résolution device pure `resolveConsultantsDesktopEntry`
> (`?section=pool-competences` → Desktop : `synthese` + module Pool ; Mobile : vue Pool historique) ;
> Mobile **inchangé** (5 accès, `SEPARATE IMPLEMENTATION`) ; libellés Mobile synchronisés
> (`SyntheseMobile`, `CandidatesMobile`, `getMobileTabsForPath`). **0 pathname, 0 `permanentRedirect`
> nouveau, 0 Data.** Module « Mission : prévoir les disponibilités » **non implémenté** (NEW/FUTURE —
> aucun bouton mort). Gates : `typecheck` / `test` (293 f / 2 965 t) / `check:server-boundary` /
> `lint` / `build` / `git diff --check` = **PASS**. Consultants Lot 15 → `UNBLOCKED / READY`.

---

## 6. Engagements + Finance — `/missions` + `/finance` (Lot 7.3 coordonné)

**Preuves HEAD :** `src/components/missions/engagements/EngagementsDesktopView.tsx`
(`NAV_ENTRIES`, `HEADER_TITLE_BY_VIEW`, `?vue=`), `src/app/(app)/missions/page.tsx`,
`src/app/(app)/missions/_data/get-engagements-activity-analytics.ts`,
`src/components/finance/{index.tsx,FinanceDesktopDashboard.tsx,FinanceLocalNavigation.tsx,
MissionProfitabilityTable.tsx}`, `src/lib/finance/finance-data.ts`.

### 6.1. Engagements

**A. Routing** — `/missions` racine `synthese` ; `?vue=synthese|missions-at|projets|activite-conges|
planning-at`. Redirects legacy `permanentRedirect` : `/missions/actives` → `?vue=missions-at` ;
`/missions/projets` → `?vue=projets`.

**B. CURRENT** — Chapitres : `synthese` « Synthèse » · `missions-at` « Missions AT » · `projets`
« Projets » · `activite-conges` « Activité & congés » · `planning-at` « Planning des engagements »
(`NAV_ENTRIES`). **Modules : aucun** (`EngagementsDesktopView` monte `<SectionRail>` **sans**
`contextualModules`).

**C. TARGET (09 §B.2)** — Chapitres : **Synthèse · Missions AT · Projets · Rentabilité des
engagements · Planning & Échéances**. Modules : **Atlas du portefeuille · Production & Congés ·
Mission : analyse des marges**.

**D. Data** — `activite-conges` → `getEngagementsActivityAnalytics()` (`server-only`) →
`missions` + `mission_activity_reports` + `client_closures` → `buildEngagementsActivityAnalytics()`
(builder pur, `engagements-activity-utils.ts`) → `EngagementsActivityDesktop`.

**E. Desktop** — `EngagementsDesktopView` = `SectionRail` (chapitres, href `/missions?vue=…`) +
header. `data-theme="edito-bright-engagements"`.

**F. Mobile** — `EngagementsMobileShell` (adaptive plein, `getDashboardDevice`).

### 6.2. Finance

**A. Routing** — `/finance` racine `synthesis` ; `?tab=profitability|forecast`
(`parseFinanceTab`, `buildFinanceHref`). Pas de redirect legacy.

**B. CURRENT** — `/finance/page.tsx` → `src/components/finance/index.tsx` (device switch) →
`FinanceDesktopDashboard`, qui **contient** `FinanceLocalNavigation` + `?tab=` +
`MissionProfitabilityTable`. Chapitres : `synthesis` « Synthèse » · `profitability` « Rentabilité
missions » · `forecast` « Prévision & simulation » (`FINANCE_DESKTOP_CHAPTERS`).
**Modules : aucun** (`buildFinanceRailProps` → `contextualModules: undefined`).

**C. TARGET (09 §B.4)** — Chapitres : **Synthèse · Rentabilité P&L · Forecast · Business Review**.
Modules : **Simulation financière · Atlas du portefeuille · Mission : analyse des marges**.

**D. Data** — `getFinanceDashboardData()` (`src/lib/finance/finance-data.ts`, `server-only`,
`createClient`) → `pnl_monthly` + `opportunities` + `missions` + `collaborators` + `companies` +
`mission_activity_reports` → `missionProfitability: MissionProfitabilityRow[]` **calculé en TS**
(`missions.map(...)`, ligne ~249). Mobile : `getFinanceMobileDashboardData()`.

### 6.3. Point critique — duplication de la rentabilité

**Constat prouvé :** deux loaders **distincts** produisent une lecture de rentabilité par mission
sur des tables **qui se recoupent** :

| | Finance | Engagements |
|---|---|---|
| Loader | `getFinanceDashboardData()` (`src/lib/finance/finance-data.ts`) | `getEngagementsActivityAnalytics()` (`src/app/(app)/missions/_data/`) |
| Tables | `missions`, `mission_activity_reports`, `pnl_monthly`, `opportunities`, `collaborators`, `companies` | `missions`, `mission_activity_reports`, `client_closures` |
| Calcul marge | `missions.map()` en TS (`MissionProfitabilityRow`) | `buildEngagementsActivityAnalytics()` (builder pur) |
| Composant | `MissionProfitabilityTable` | `EngagementsActivityDesktop` |

Le 09 §B.2/B.4 demande que la cible « Rentabilité des engagements » (Engagements) **reprenne le
contenu pertinent** de Finance « Rentabilité missions », avec **une seule source de vérité Data,
un seul moteur de calcul, pas de duplication UI**.

**Recommandation : découper 7.3 en sous-lots.**

| Sous-lot | Objet | Data | UI |
|---|---|---|---|
| **7.3A** | Contrat Data unique de rentabilité mission/engagement | **DATA-2** — soit une vue `v_mission_profitability` (préférée, aligne `missions.gross_margin_pct` déjà GENERATED + `v_collaborator_activity_summary` migration 025), soit un builder pur partagé consommé par les deux loaders. **Décision Data requise.** | — |
| **7.3B** | Engagements : `activite-conges` → chapitre « Rentabilité des engagements » + modules (Production & Congés REUSE) | DATA-1 (consomme 7.3A) | `EngagementsDesktopView` : ajouter `contextualModules` ; renommer chapitre `planning-at` |
| **7.3C** | Finance : `profitability` → « Rentabilité P&L » (recentrage P&L, retrait du détail mission déplacé), + module Simulation financière | DATA-1 | `FinanceDesktopDashboard` |

`Business Review` (Finance) = `NEW/FUTURE`.

### 6.4. Matrice

| WS | Niveau | CURRENT | TARGET | Traitement | Data | Desktop | Mobile | Dépendance | Lot |
|---|---|---|---|---|---|---|---|---|---|
| Engagements | Chapitre | `synthese` | Synthèse | KEEP | DATA-0 | — | NO IMPACT | — | 7.3B |
| Engagements | Chapitre | `missions-at` | Missions AT | KEEP | DATA-0 | — | NO IMPACT | — | 7.3B |
| Engagements | Chapitre | `projets` | Projets | KEEP | DATA-0 | — | NO IMPACT | — | 7.3B |
| Engagements | Chapitre | `activite-conges` « Activité & congés » | Rentabilité des engagements | TRANSFORM + REUSE | **DATA-2** (7.3A) | contenu + label + `?vue=` (garder la clé `activite-conges` ou alias) | SEPARATE IMPLEMENTATION | 7.3A | 7.3B |
| Engagements | Chapitre | `planning-at` « Planning des engagements » | Planning & Échéances | RENAME | DATA-0 | label | LABEL SYNC | — | 7.3B |
| Engagements | Module | — | Atlas du portefeuille | NEW/FUTURE | DATA-1/2 | nouveau `contextualModule` | FUTURE | §17 transverse | 7.3B / différé |
| Engagements | Module | — | Production & Congés | REUSE | DATA-0 | monter `production-leave/desktop/` | REUSE `production-leave/mobile/` | Consultants module | 7.3B |
| Engagements | Module | — | Mission : analyse des marges | NEW/FUTURE (framework REUSE) | DATA-1 | `MissionComposerDesktop` | FUTURE | §18 | 7.3B / différé |
| Finance | Chapitre | `synthesis` | Synthèse | KEEP | DATA-0 | — | NO IMPACT | — | 7.3C |
| Finance | Chapitre | `profitability` « Rentabilité missions » | Rentabilité P&L | RENAME + contenu MOVE vers Engagements | **DATA-2** (7.3A) | recentrage P&L | LABEL SYNC | 7.3A | 7.3C |
| Finance | Chapitre | `forecast` « Prévision & simulation » | Forecast | RENAME | DATA-0 | label | LABEL SYNC | — | 7.3C |
| Finance | Chapitre | — | Business Review | NEW/FUTURE | DATA-1/2 | nouveau chapitre | FUTURE | — | 7.3C / différé |
| Finance | Module | — (`contextualModules: undefined`) | Simulation financière | REUSE | DATA-0 | `FinancialModelingDesktopDialog` | NO IMPACT | `@/features/financial-modeling` | 7.3C |
| Finance | Module | — | Atlas du portefeuille | NEW/FUTURE | — | — | FUTURE | §17 | différé |
| Finance | Module | — | Mission : analyse des marges | NEW/FUTURE (framework REUSE) | DATA-1 | `MissionComposerDesktop` | FUTURE | §18 | différé |

**Statut : `NEEDS DATA DECISION`** (7.3A : vue vs builder partagé). Complexité **HIGH**.
Sous-lots **7.3A → 7.3B → 7.3C** obligatoires dans cet ordre.

---

## 7. Business Intelligence — `/intelligence` (Lot 7.4)

**Preuves HEAD :** `src/features/business-intelligence/navigation/business-intelligence-chapters.ts`
(`BI_CHAPTERS`), `src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.tsx`.

### A. Routing
`/intelligence?segment=<id>&tab=<chapter>` (`buildBusinessIntelligenceHref`). Sans `segment` :
`SegmentCatalogLandingDesktop` (catalogue). Legacy `tab` mappé (`LEGACY_CHAPTERS` :
`priorities→home`, `sectors→sector-analysis`, `competitive_env→…`, `windows→regulatory-calendar`,
`value_chain→value-chain`).

### B/C. CURRENT → TARGET
Chapitres CURRENT (`BI_CHAPTERS`) : `home` « Accueil » · `sector-analysis` « Analyse sectorielle » ·
`competitive-environment` « Environnement concurrentiel » · `regulatory-calendar` « Calendrier
réglementaire » · `value-chain` « Chaîne de valeur » · `sector-news` « Actualités sectorielles ».
TARGET : identiques **hormis casse / singulier** — `Calendrier Réglementaire`, `Chaîne de Valeur`,
`Actualité sectorielle`.
Modules CURRENT (conditionnels) : `studies` « Études sectorielles » (`studiesAvailable`) ·
`playbooks` « Playbooks » (`playbooksAvailable`). TARGET : `KEEP` + **Bibliothèque** `NEW/FUTURE`.

### D. Data
`getBusinessIntelligenceSnapshot()` + `buildBusinessIntelligenceDesktopModel()` ;
`SegmentResourceKey` (study / competitiveMap / regulatory / valueChain / news). Chaîne de valeur :
tables `value_chain_nodes/actors/links`. **Aucune Data nouvelle pour le lot.**

### E/F. Desktop/Mobile
`BusinessIntelligenceDesktop` + `BusinessIntelligenceLocalNavigation` (rail avec `mobileLabel`
distinct par chapitre — `BI_CHAPTERS[].mobileLabel`). Mobile : `BusinessIntelligenceMobile`
(adaptive plein). **`mobileLabel` déjà séparé du `label` Desktop** → les renames Desktop sont
`NO IMPACT` Mobile (sauf décision de synchroniser).

### Matrice (résumé) — 6 chapitres (3 KEEP, 3 RENAME casse), 2 modules KEEP, 1 module NEW/FUTURE.
Tous **DATA-0 / URL-0**, sauf Bibliothèque `NEW/FUTURE`.

**Statut : `IMPLEMENTED / PASS` (Phase 7.4 — 2026-09-10).** Complexité **LOW** (3 renames de casse Desktop canoniques, `mobileLabel` découplé inchangé).

> **Livré :** 6 chapitres Desktop conformes (`BI_CHAPTERS` : `Accueil`, `Analyse sectorielle`, `Environnement concurrentiel`, `Calendrier Réglementaire`, `Chaîne de Valeur`, `Actualité sectorielle`) ; 0 modification d'identifiant technique (`home`, `sector-analysis`, `competitive-environment`, `regulatory-calendar`, `value-chain`, `sector-news`) ; 0 changement de routing (`?segment=&tab=`) ; 0 modification Data/Supabase/n8n (DATA-0) ; Mobile labels inchangés (`Terrain`, `Analyse`, `Concurrence`, `Réglementation`, `Chaîne`, `Actualités` — `NO IMPACT`) ; 2 modules réels conservés (`Études sectorielles`, `Playbooks`) ; `Bibliothèque` non implémentée (NEW/FUTURE). Gates : `typecheck` / `test` (348 tests BI) / `check:server-boundary` / `lint` / `build` = **PASS**.

---

## 8. Prospection — `/prospection-intelligence` (Lot 7.5)

**Preuves HEAD :** `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx`
(`PROSPECTION_DESKTOP_CHAPTERS`), `…/ProspectionIntelligenceDesktop.tsx`,
`src/app/(app)/prospection-intelligence/page.tsx`.

### A. Routing
`/prospection-intelligence` — `?section=` via `prospection-intelligence-desktop-navigation.ts`
(`PiTabKey` : `strategy | chapter_1 | chapter_2 | chapter_3`).

### B. CURRENT
Chapitres : `strategy` « Brief » · `chapter_1` « Fenêtres d'opportunités » · `chapter_2`
« Approches commerciales » · `chapter_3` « Playbooks ». **Modules : aucun.**

> 🔴 **`chapter_1`, `chapter_2` et `chapter_3` sont des panneaux vides** — `ProspectionIntelligenceDesktop.tsx`
> lignes 177-203 : « Cette page est actuellement vide. Elle accueillera prochainement… ». Seul
> `strategy` (Brief) porte du contenu réel (`PotentialReachMatrix`, `AccountAttackPanel`,
> `PriorityAccountsModal`). **Prospection est le workspace le moins mature.**

### C. TARGET (09 §B.6)
Chapitres : **Brief · Angles d'approche · Activité**. `chapter_1` → `REMOVE`. `chapter_3` →
`TRANSFORM` (module « Playbook »).
Modules : **Campagne** `NEW/FUTURE` · **Métriques Activité** `NEW/FUTURE` · **Playbook** `TRANSFORM`
(ex-`chapter_3`).

### D. Data
`getBusinessIntelligenceSnapshot()` (partagé avec BI) + `buildBusinessIntelligenceDesktopModel()`.
« Angles d'approche » / « Activité » / « Campagne » / « Métriques Activité » : **aucune Data
correspondante**.

### F. Mobile
`page.tsx` : `device === "mobile"` → **placeholder statique** (« La page Prospection est en cours de
développement pour mobile »). **Pas d'implémentation Mobile réelle** → `FUTURE`.

### H. Risques
- La cible construit sur des **coquilles vides** : renommer `chapter_2` → « Angles d'approche » ou
  transformer `chapter_3` en module « Playbook » **sans contenu** violerait NAV-TARGET-07 (bouton
  mort). **Le lot 7.5 doit soit apporter le contenu, soit rester `NEW/FUTURE`.**
- Risque de **duplication** avec CRM / Account Intelligence (`AccountAttackPanel`,
  `PotentialReachMatrix` existent déjà côté Brief) — à cartographier en 7.5.

### Matrice

| Niveau | CURRENT | TARGET | Traitement | Data | Desktop | Mobile | Lot |
|---|---|---|---|---|---|---|---|
| Chapitre | `strategy` « Brief » | Brief | KEEP | DATA-0 | — | FUTURE | 7.5 |
| Chapitre | `chapter_2` « Approches commerciales » (vide) | Angles d'approche | RENAME (mais contenu absent → **NEW/FUTURE de fait**) | DATA-1+ | label ; contenu à créer | FUTURE | 7.5 |
| Chapitre | — | Activité | NEW/FUTURE | DATA-1+ | — | FUTURE | 7.5 |
| Chapitre | `chapter_1` « Fenêtres d'opportunités » (vide) | — | REMOVE | DATA-0 | retirer du rail | FUTURE | 7.5 |
| Chapitre → Module | `chapter_3` « Playbooks » (vide) | Module « Playbook » | TRANSFORM (contenu absent) | DATA-1+ | rail | FUTURE | 7.5 |
| Module | — | Campagne | NEW/FUTURE | — | — | FUTURE | 7.5 / différé |
| Module | — | Métriques Activité | NEW/FUTURE | — | — | FUTURE | 7.5 / différé |

**Statut : `NEEDS PRODUCT DECISION`** (que met-on dans « Angles d'approche » / « Activité » ?
la Data existe-t-elle ? Prospection Mobile est-il dans le périmètre ?). Complexité **HIGH**
(le workspace est quasi vide — c'est de la construction, pas de l'alignement).

---

## 9. Rapports & Rédaction — `/reports` (Lot 7.6)

**Preuves HEAD :** `src/components/reports/ReportsLocalNavigation.tsx` (`REPORTS_DESKTOP_CHAPTERS`),
`src/components/reports/reports-desktop-navigation.ts`, `src/app/(app)/reports/page.tsx`.

### A/B/C
`/reports` — `?section=documents|knowledge|generation` (racine `documents`).
CURRENT : `documents` « Bibliothèque » · `knowledge` « Connaissances » · `generation` « Génération ».
Module : `knowledge-management` « Gestion de la connaissance » (conditionnel `onOpenKnowledgeManagement`).
TARGET : **Bibliothèque · Connaissance · Génération** ; modules **Gestion de la connaissance** (KEEP)
+ **Analyse transverse** `NEW/FUTURE`.

### D/E/F
`reports/page.tsx` : `Promise.all([getDashboardDevice(), listResult, detailResult])` ;
`device === "mobile"` → `ReportsMobileView`. Desktop → `ReportsDesktopView` (monte
`ReportsLocalNavigation`, `onOpenKnowledgeManagement`). Adaptive plein.

### G/H
`knowledge-management` = capacité **réelle** (module conditionnel branché). « Analyse transverse » :
aucune capacité → `NEW/FUTURE`. **Le composant `knowledge-management` de Reports est la source du
`REUSE` demandé par Veille (§10)** — ne pas le forker.

### Matrice — 1 RENAME (`knowledge` → « Connaissance »), 2 KEEP, 1 module KEEP, 1 module NEW/FUTURE.
**DATA-0 / URL-0.**

**Statut : `READY`.** Complexité **LOW**.

---

## 10. Veille & Actualités — `/veille` (Lot 7.7)

**Preuves HEAD :** `src/components/veille/VeilleLocalNavigation.tsx` (`VEILLE_DESKTOP_CHAPTERS`),
`src/app/(app)/veille/page.tsx`.

### A/B/C
`/veille` — `?section=news|watched-accounts|strategic-analysis|history` (racine `news`).
CURRENT chapitres : `news` « Actualités » · `watched-accounts` « Veille ciblée » ·
`strategic-analysis` « Analyses » · `history` « Archives ».
CURRENT module : `source-management` « Gestion des sources » (conditionnel).
TARGET chapitres : **Actualités thématiques · Veille Ciblée · Analyses · Archives**.
TARGET modules : **Gestion des sources** (KEEP) · **Gestion de la connaissance** `REUSE` (composant
Reports) · **Analyse transverse** `NEW/FUTURE` · **Mission : analyse de la veille** `NEW/FUTURE`
(framework REUSE — spec `veille-analyse-mensuelle` dans `MISSION_CATALOG`, §18).

### D/E/F
`veille/page.tsx` : `device === "mobile"` → vue mobile dédiée (`initialMobileTab`). Adaptive plein.

### G. Réutilisation
- **Gestion de la connaissance** : `REUSE` du composant Reports `knowledge-management` (§9). **Ne
  pas dupliquer** — extraire le composant dans un emplacement partageable (`src/components/knowledge/`
  ou `src/features/knowledge-management/`) consommé par Reports **et** Veille. Coordination 7.6 ↔ 7.7 :
  idéalement l'extraction se fait en 7.6, la consommation en 7.7.
- **Mission : analyse de la veille** : `MISSION_CATALOG` slug `veille-analyse-mensuelle` +
  `MissionComposerDesktop` → framework REUSE (§18).

### Matrice

| Niveau | CURRENT | TARGET | Traitement | Data | Desktop | Mobile | Dépendance | Lot |
|---|---|---|---|---|---|---|---|---|---|
| Chapitre | `news` « Actualités » | Actualités thématiques | RENAME | DATA-0 | label | LABEL SYNC | — | 7.7 |
| Chapitre | `watched-accounts` « Veille ciblée » | Veille Ciblée | RENAME (casse) | DATA-0 | label | LABEL SYNC | — | 7.7 |
| Chapitre | `strategic-analysis` « Analyses » | Analyses | KEEP | DATA-0 | — | NO IMPACT | — | 7.7 |
| Chapitre | `history` « Archives » | Archives | KEEP | DATA-0 | — | NO IMPACT | — | 7.7 |
| Module | `source-management` | Gestion des sources | KEEP | DATA-0 | — | NO IMPACT | — | 7.7 |
| Module | — | Gestion de la connaissance | REUSE | DATA-0 | monter composant partagé | NO IMPACT | **extraction 7.6** | 7.7 |
| Module | — | Analyse transverse | NEW/FUTURE | — | — | FUTURE | partagé Reports | différé |
| Module | — | Mission : analyse de la veille | NEW/FUTURE (framework REUSE) | DATA-1 | `MissionComposerDesktop` | FUTURE | §18 | 7.7 / différé |

**Statut : `READY`** (dépend d'une extraction légère en 7.6). Complexité **MEDIUM**.

---

## 11. Knowledge Hub — `/knowledge` (Lot 7.8)

**Preuves HEAD :** `src/features/knowledge-hub/knowledge-hub-shell-data.ts` (`domains`),
`src/features/knowledge-hub/KnowledgeHubLocalNavigation.tsx`,
`src/features/knowledge-hub/knowledge-hub-desktop-navigation.ts`.

### A/B/C
Navigation **Racine → Domaine → Section** (SHELL Lot 2.8) — conservée.
Domaines CURRENT (`domains[].id` / `.title`) : `clients-markets` « Clients & Marchés » ·
`expertise-kredo` « Expertise KREDO » · `talents` « Talents » · `delivery-feedback` « Delivery & REX » ·
`ao-proposals` « AO & Propositions » · `internal-resources` « Ressources internes ».
TARGET : identiques **sauf** `Expertise KREDO` → **Expertises KREDO** et `Ressources internes` →
**Ressources admin** (2 RENAME).
Modules : `workshops` « Ateliers » (`KnowledgeHubModuleModal`) + RAG « Interroger le Corpus » —
`KEEP` les deux.

### D
`domains` = **données statiques TS** (`knowledge-hub-shell-data.ts`) — `id` technique séparé du
`title`. Un rename de `title` est **DATA-0**. `internal-resources` `id` **conservé** (ne PAS le
renommer en `admin-resources` sans migration de la nav contextuelle).

### E/F
`KnowledgeHubDesktop` + `KnowledgeHubLocalNavigation` ; `KnowledgeHubMobile` +
`KnowledgeHubMobileWorkshops` (adaptive plein). Modules : `KnowledgeHubModuleModal` (Desktop),
`KnowledgeHubMobileWorkshops` (Mobile).

### Matrice — 2 RENAME (`title` uniquement), 4 KEEP, 2 modules KEEP. **DATA-0 / URL-0.**

**Statut : `READY`.** Complexité **LOW** (2 libellés). Ne pas toucher les `id` de domaine.

---

## 12. Automatisations — `/automations` (Lot 7.9)

**Preuves HEAD :** `src/components/automations/AutomationsLocalNavigation.tsx`
(`AUTOMATIONS_DESKTOP_CHAPTERS`), `src/components/automations/index.tsx`,
`src/components/automations/automations-desktop-navigation.ts`.

### A/B/C
`/automations` — `?section=journal|sante|couts` (`?run=` préservé pour le deep-link d'un run).
CURRENT : `journal` « Journal d'exécution » · `sante` « Santé des workflows » · `couts` « Coûts ».
**Modules : aucun** (`contextualModules: undefined`).
TARGET : **Journal d'exécution · Fiabilité des workflows · Coûts** ; modules **Métriques**
`NEW/FUTURE` · **Simulateur de cadence** `NEW/FUTURE`.

### D/E/F
`automations/index.tsx` : `Promise.all([getDashboardDevice(), data])` → `AutomationsDesktopDashboard`
/ `AutomationsMobileDashboard` (adaptive plein). Data : vues `v_workflow_health`,
`v_workflow_cost_stats`, `v_ai_*_costs` (CLAUDE.md). Aucune Data nouvelle pour le rename.

### Matrice — 1 RENAME (`sante` → « Fiabilité des workflows », **clé `sante` conservée**), 2 KEEP,
2 modules `NEW/FUTURE`. **DATA-0 / URL-0.**

**Statut : `READY`.** Complexité **LOW**.

---

## 13. Cross-workspace module reuse

| Module | Workspaces cibles | Implémentation existante (HEAD) | Source Data | Réutilisable ? | Stratégie |
|---|---|---|---|---|---|
| **Simulation financière** | Opportunités (existe), Finance | `@/features/financial-modeling` — `FinancialModelingDesktopDialog` | `financial_models`, `v_financial_model_*` | Oui, monté tel quel (test `opportunities-modules-reuse`) | **REUSE EXISTING** — Finance monte le même dialog en 7.3C |
| **Matching Profil** | Opportunités (existe), Consultants (existe) | `MatchingDialog` (`@/components/staffing/matching/`) + moteur `src/lib/staffing-matching/` ; module Consultants `profile-matching/` | `match_scores`, `person_skills`, `opportunity_skills` | Oui — moteur unique déjà | **SHARED COMPONENT** (déjà le cas) |
| **Production & Congés** | Consultants (existe), Engagements | `src/features/consultants/modules/production-leave/` (Desktop **+** Mobile, builder pur `build-production-leave.ts`) | `mission_activity_reports`, `collaborator_absences`, `collaborator_compensation` | Oui — contrat mensuel isolé, UI Desktop+Mobile | **SHARED COMPONENT** — Engagements l'importe en 7.3B |
| **Atlas du portefeuille** | Engagements, Finance | **Aucun module de rail.** Voisin : type/action intelligence `account_portfolio` (« Revue de portefeuille comptes », enum `intelligence_document_type`) | `companies`, `account_score_*` (neutralisé runtime), `v_crm_account_list` | Partiellement — pas de composant module | **FUTURE SHARED MODULE** — `NEW/FUTURE` ; décision Data (quelle lecture portefeuille ?) |
| **Gestion de la connaissance** | Rapports (existe), Veille | Module conditionnel `knowledge-management` de `ReportsLocalNavigation` / `ReportsDesktopView` | knowledge stores Reports | Oui, à condition d'**extraire** le composant hors `src/components/reports/` | **SHARED COMPONENT après extraction** (7.6 extrait, 7.7 consomme) |
| **Analyse transverse** | Rapports, Veille | **Aucune** | — | Non | **NOT SHARED / FUTURE** — `NEW/FUTURE` partout |
| **Playbook(s)** | BI (`playbooks` module, existe), Prospection (`chapter_3` vide → module) | BI : `playbooks` module conditionnel (`playbooksAvailable`) sur `sector_intelligence.playbook` | `sector_intelligence` (playbook JSONB), `v_sector_knowledge_resolved` | BI oui ; Prospection non (coquille vide) | **SHARED DATA + DISTINCT VIEW** — la Data playbook sectoriel existe ; la vue Prospection reste à créer |
| **Mission : analyse des marges** | Engagements, Finance | Framework `MissionComposerDesktop` + `MISSION_CATALOG` ; **pas de slug exact** (`rentabilite-portefeuille` proche) ; voisin `src/lib/intelligence/actions/analyze-margins.ts` + `AnalyzeMarginsResult.tsx` | `missions`, `mission_activity_reports` | Framework oui ; wiring non | **FUTURE SHARED MODULE** (§18) |
| **Mission : prévoir les disponibilités** | Consultants | Framework + slug `capacite-staffing` (`MISSION_CATALOG`) | providers `staffing-horizon`, `hiring-period` | Framework oui ; wiring non | **FUTURE SHARED MODULE** (§18) |
| **Mission : analyse de la veille** | Veille | Framework + slug `veille-analyse-mensuelle` (`MISSION_CATALOG`) | provider `veille-period` | Framework oui ; wiring non | **FUTURE SHARED MODULE** (§18) |

**Principe :** ne jamais recréer un module partagé. Ordre d'extraction : `production-leave` déjà
prêt ; `knowledge-management` à extraire en 7.6 ; modules « Mission : … » via le framework unique.

---

## 14. Audit des « Missions : … » — moteur commun réutilisable ?

**Question :** l'architecture Intelligence Missions actuelle peut-elle servir de framework commun aux
modules cibles « Mission : analyse des marges / prévoir les disponibilités / analyse de la veille » ?

**Réponse : OUI, un moteur commun existe et est prouvé.**

Preuves HEAD :
- `src/features/intelligence-missions/domain/mission-catalog.ts` — `MISSION_CATALOG` contient
  **7 specs** (⚠️ CLAUDE.md dit « 1 mission » — **périmé**) :
  `veille-analyse-mensuelle`, `rentabilite-portefeuille`, `activation-portefeuille`,
  `capacite-staffing`, `revue-compte-client`, `post-mortem-commercial`, `funnel-recrutement`.
- `src/features/intelligence-missions/components/MissionComposerDesktop.tsx` +
  `mission-composer-model.ts` — composeur UX générique.
- `src/features/intelligence-missions/__tests__/` — ~25 fichiers de test (providers de corpus,
  budget déterministe, résolveur, `validate-mission-report`, `mission-launch-pilot`…).
- **Déjà branché comme module de workspace :** Opportunités `post-mortem`
  (`POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG`, test `opportunities-modules-reuse.test.ts`).

**Contraintes :**
- Le wiring d'une mission comme module de rail = **quelques lignes** (config composeur + entrée
  `contextualModules`), **pas** un nouveau workflow n8n ni un import VPS (`mission-001-run.json`
  générique — cf. ADR-0020 L5).
- `capacite-staffing` / `veille-analyse-mensuelle` : specs **présentes** → downgrade de `NEW/FUTURE`
  pur vers **`NEW/FUTURE` avec framework REUSE** (coût d'implémentation faible).
- « Mission : analyse des marges » : **pas de slug exact** — soit `rentabilite-portefeuille`
  convient, soit une nouvelle spec est requise. **Décision produit en 7.3.**
- **Les actions transverses restent propriété du Cockpit Intelligence** (invariant `10-*` §11 /
  NAV-TARGET). Un module « Mission : … » de workspace ne doit pas ré-héberger un lanceur global —
  il monte le composeur **contextualisé** (comme Opportunités `post-mortem`).

**Ce lot 7.0 ne branche aucune mission.**

---

## 15. Routing impact map

| Workspace | Pathname | Contrat interne | Redirects legacy `permanentRedirect` (conservés) | Classe max Phase 7 |
|---|---|---|---|---|
| Opportunités | `/missions/opps` | `?section=` + `?module=` + `?opp=` ; compat `?scope=` au parsing | — | URL-0 |
| Engagements | `/missions` | `?vue=` | `/missions/actives`→`?vue=missions-at` ; `/missions/projets`→`?vue=projets` | URL-1 (ajout module) |
| Consultants | `/consultants` | `?section=` + `?module=` (+`&person=`) | `/consultants/activite-conges`, `/consultants/pool-competences`, `/recruitment` | **URL-2** (`pool-competences` chapitre→module) |
| Finance | `/finance` | `?tab=` | — | URL-0 |
| Business Intelligence | `/intelligence` | `?segment=&tab=` ; legacy `tab` mappé | — | URL-0 |
| Prospection | `/prospection-intelligence` | `?section=` (`PiTabKey`) | — | **URL-2** (`chapter_1` REMOVE, `chapter_3` chapitre→module) |
| Rapports | `/reports` | `?section=` | — | URL-0 |
| Veille | `/veille` | `?section=` | — | URL-0 (ajout module) |
| Knowledge Hub | `/knowledge` | Racine→Domaine→Section (`?domain=`/interne) | — | URL-0 |
| Automatisations | `/automations` | `?section=` + `?run=` | — | URL-0 |

**Aucune classe URL-3 (nouveau redirect).** Aucun nouveau pathname. Les clés de query internes
(`activite-conges`, `sante`, `pool-competences`, `chapter_3`) sont **conservées** même sous un
nouveau libellé — un renommage de clé est hors périmètre (dette cosmétique éventuelle, lot dédié).

---

## 16. Data dependency map

| Domaine Data | Tables / vues | Workspaces consommateurs | Impact Phase 7 |
|---|---|---|---|
| Rentabilité mission/engagement | `missions` (`gross_margin_pct` GENERATED), `mission_activity_reports` (`cjm_snapshot`), `pnl_monthly`, `client_closures`, `v_collaborator_activity_summary`, `v_profitability_alerts` | **Finance** (`getFinanceDashboardData`), **Engagements** (`getEngagementsActivityAnalytics`) | **DATA-2 en 7.3A** — unifier (vue `v_mission_profitability` recommandée) ; aujourd'hui 2 loaders divergents |
| Production & Congés | `mission_activity_reports`, `collaborator_absences`, `collaborator_compensation` (RLS admin) | Consultants (module), **Engagements cible** | DATA-0 (module `production-leave` déjà isolé) |
| Matching | `match_scores`, `person_skills`, `opportunity_skills`, `job_profiles` | Opportunités, Consultants | DATA-0 (moteur unique) |
| Simulation financière | `financial_models`, `v_financial_model_*`, `client_pricing_agreements` | Opportunités, **Finance cible** | DATA-0 |
| Intelligence sectorielle | `sector_intelligence`, `v_sector_knowledge_resolved`, `value_chain_*` | BI, Prospection | DATA-0 |
| Playbook sectoriel | `sector_intelligence.playbook`, `v_sector_knowledge_resolved` | BI (module), **Prospection cible** | DATA-1 (Prospection : nouvelle vue de lecture) |
| Knowledge / RAG | stores knowledge Reports, corpus | Rapports, **Veille cible** | DATA-0 (extraction composant, pas Data) |
| Missions d'intelligence | `ai_intelligence_runs` (`run_type='mission:<slug>'`), providers de corpus | Opportunités (post-mortem), **Consultants / Engagements / Finance / Veille cibles** | DATA-1 (providers existants) |
| Portefeuille comptes (« Atlas ») | `companies`, `v_crm_account_list`, `account_score_*` (neutralisé), doc type `account_portfolio` | Engagements cible, Finance cible | **DATA-2 / décision** — quelle lecture ? |

**Aucun changement de schéma (DATA-3) identifié.** Deux décisions Data : **7.3A** (rentabilité) et
**Atlas du portefeuille** (différable).

---

## 17. Parallel-work blockers

| Chantier parallèle (working tree) | Fichiers | Workspace(s) impacté(s) | Blocage |
|---|---|---|---|
| **Refonte Synthèse Opportunités** | `src/features/opportunities/summary/{SummaryDesktop,summary-geometry,DeadlinesTable,PipeBreakdownChart,ProcessFlowChart,SkillsComparisonChart}.tsx` + `__tests__/summary.test.ts` | **Opportunités (7.1)** — chapitre `synthese` → « Vue d'ensemble » | **BLOCKED BY PARALLEL WORK** — le rename du chapitre `synthese` et toute retouche de `SummaryDesktop` doivent attendre le merge / rebaseline. Les 6 autres renames de 7.1 (`besoins`, `avant-vente`, `planning`, 3 modules) sont **indépendants** de ce chantier. |
| **Agenda Mobile** | `src/components/agenda/{AgendaMobileWorkspace,agenda-mobile-model,MobileAgendaTimeline}` | Aucun (Agenda hors Phase 7) | Aucun |
| `docs/JOURNAL-SESSIONS.md` | — | — | Aucun (documentaire) |

**Règle :** 7.1 ne démarre pas tant que `src/features/opportunities/summary/` est `dirty`. Attendre
soit un commit fonctionnel sur `main`, soit un rebaseline explicite (le chantier repart de `HEAD`).

---

## 18. Recommended implementation sequence

La séquence 09 §E.2 (7.1 → 7.9) **reste valide**, avec ces ajustements :

1. **7.1 Opportunités** — `READY WITH REBASELINE`. Démarrer **après** intégration de la refonte
   Synthèse. Alternative : faire d'abord les 6 renames indépendants (`besoins`, `avant-vente`,
   `planning` + 3 modules) et différer le seul rename `synthese`.
2. **7.2 Consultants** — `READY`. **Peut passer avant 7.1** si 7.1 reste bloqué (indépendance
   prouvée : aucun fichier commun, `src/features/consultants/` vs `src/features/opportunities/`).
3. **7.3 Engagements + Finance** — sous-lots **7.3A (Data) → 7.3B (Engagements) → 7.3C (Finance)**.
   `NEEDS DATA DECISION` avant 7.3A.
4. **7.4 BI** — `READY`, LOW. Peut être avancé (indépendant, renames de casse).
5. **7.6 Rapports** — `READY`, LOW. **Inclut l'extraction du composant `knowledge-management`**
   (préalable à 7.7).
6. **7.7 Veille** — `READY` après 7.6. MEDIUM.
7. **7.5 Prospection** — `NEEDS PRODUCT DECISION`, HIGH. **Recommandé en dernier** parmi les
   workspaces (le workspace est quasi vide — c'est de la construction). Peut être re-séquencé après
   7.9 sans risque.
8. **7.8 Knowledge Hub** — `READY`, LOW (2 libellés).
9. **7.9 Automatisations** — `READY`, LOW.
10. **7.10 Audit final** — inchangé.

### Séquence optimale proposée

`7.2 → 7.4 → 7.8 → 7.9 → 7.6 → 7.7 → [7.1 dès rebaseline] → 7.3A → 7.3B → 7.3C → 7.5 → 7.10`

> Justification : on avance les lots LOW/`READY` indépendants pendant que la refonte Synthèse
> Opportunités se stabilise et que la décision Data 7.3A est instruite ; Prospection (construction)
> passe en fin ; l'ordre 09 §E.2 reste respecté pour les dépendances réelles (7.6 avant 7.7, 7.3
> coordonné, 7.10 dernier).

---

## 19. Lots 7.1 → 7.10 détaillés (critères d'acceptation)

> Chaque prompt de lot sera dérivé de ce bloc. `Out of scope` commun à tous : invariants Phase 6
> (§2), création de route/pathname, migration de schéma, modification Mobile non justifiée,
> composant Desktop chargé pour être masqué en CSS, bouton mort pour une capacité `NEW/FUTURE`.

### 7.1 — Opportunités
- **Objectif :** aligner labels chapitres/modules sur 09 §B.1 (7 RENAME).
- **Data :** DATA-0.
- **Desktop :** `opportunities-sections.ts` (`OPPORTUNITIES_SECTIONS`, `HEADER_TITLE_BY_SECTION`),
  `opportunities-modules.ts` (`OPPORTUNITIES_MODULE_LABELS`).
- **Mobile :** vérifier si un libellé de section apparaît côté mobile → `LABEL SYNC` sinon `NO IMPACT`.
- **Routing :** URL-0 (clés `synthese/besoins/avant-vente/planning`, `matching/simulation/post-mortem` inchangées).
- **Tests :** `opportunities-sections.test.ts`, `opportunities-modules-reuse.test.ts` (adapter labels).
- **DoD :** 4 chapitres + 3 modules renommés ; 0 changement de clé URL ; tests verts ; `synthese`
  non touché tant que la refonte Synthèse n'est pas mergée.
- **Dependencies :** rebaseline refonte Synthèse Opportunités. **Puis** Opportunities Lot 12.

### 7.2 — Consultants — ✅ IMPLEMENTED / PASS (2026-09-09)
- **Objectif :** 3 RENAME + `pool-competences` chapitre → module (TRANSFORM), code `skills/` conservé.
- **Data :** DATA-0 pour le cœur ; DATA-1 si module mission `capacite-staffing` inclus.
- **Desktop :** `consultants-sections.ts` (retirer `pool-competences` de `CONSULTANTS_SECTIONS`,
  l'ajouter à `CONSULTANTS_CONTEXTUAL_MODULES`), `ConsultantsDesktopShell` (monter `skills/` en
  overlay module).
- **Mobile :** **garder** l'onglet « Pool de compétences » dans `getMobileTabsForPath("/consultants")`
  (`SEPARATE IMPLEMENTATION`) — décision explicite requise.
- **Routing :** URL-2 — `?module=pool-competences` ; conserver `?section=pool-competences` +
  redirect legacy en alias (compat).
- **Tests :** `consultants-sections.test.ts` (+ static decoupling).
- **DoD :** `pool-competences` absent des chapitres Desktop, présent en module ; `skills/`
  inchangé ; Mobile inchangé ; redirect legacy fonctionnel. **Puis** Consultants Lot 15.
- **✅ Livré (2026-09-09) :** `CONSULTANTS_DESKTOP_CHAPTERS` (4) distinct de `CONSULTANTS_SECTIONS` (5,
  Mobile) ; `resolveConsultantsDesktopEntry` (fonction pure testée) ; wrapper `PoolCompetencesDesktop`
  (`AppDialog`) ; libellés Desktop + Mobile alignés ; 0 pathname / 0 redirect / 0 Data.
  Consultants Lot 15 → `UNBLOCKED / READY`.

### 7.3A — Contrat Data rentabilité (préalable)
- **Objectif :** une seule source de vérité rentabilité mission/engagement.
- **Data :** **DATA-2** — créer `v_mission_profitability` (recommandé) OU un builder pur partagé
  `src/lib/finance/build-mission-profitability.ts` consommé par `getFinanceDashboardData()` **et**
  `getEngagementsActivityAnalytics()`. `missions.gross_margin_pct` (GENERATED) reste la source de
  marge ; aucun 2ᵉ calcul.
- **DoD :** les deux loaders consomment le même contrat ; `MissionProfitabilityRow` unifié ; tests
  de parité (même mission → mêmes chiffres des deux côtés).
- **Dependencies :** décision Data (vue vs builder) — **NEEDS DATA DECISION**.

### 7.3B — Engagements
- **Objectif :** `activite-conges` → « Rentabilité des engagements » (contenu 7.3A) ; `planning-at`
  → « Planning & Échéances » ; ajouter `contextualModules` (Production & Congés REUSE).
- **Data :** DATA-1 (consomme 7.3A).
- **Desktop :** `EngagementsDesktopView` (`NAV_ENTRIES`, `HEADER_TITLE_BY_VIEW`, ajout
  `contextualModules`), `get-engagements-activity-analytics.ts`.
- **Mobile :** `SEPARATE IMPLEMENTATION` — `EngagementsMobileShell` traité distinctement.
- **Routing :** URL-1 (clé `activite-conges` conservée ou alias ; `?module=` ajouté).
- **DoD :** chapitre renommé et alimenté par 7.3A ; module Production & Congés monté (Desktop+Mobile
  réutilisés) ; 0 recalcul de marge ; `Atlas` / `Mission : analyse des marges` = `NEW/FUTURE` (pas
  de bouton mort).

### 7.3C — Finance
- **Objectif :** `profitability` → « Rentabilité P&L » (recentrage P&L, le détail mission vit
  désormais côté Engagements) ; `forecast` → « Forecast » ; module Simulation financière (REUSE).
- **Data :** DATA-1.
- **Desktop :** `FinanceLocalNavigation` (`FINANCE_DESKTOP_CHAPTERS`), `FinanceDesktopDashboard`,
  `finance-data.ts`.
- **Routing :** URL-0 (`?tab=` clés `synthesis/profitability/forecast` conservées).
- **DoD :** pas de duplication UI avec Engagements ; `Business Review` = `NEW/FUTURE` ; module
  Simulation monté via `@/features/financial-modeling`.

### 7.4 — Business Intelligence — ✅ IMPLEMENTED / PASS (2026-09-10)
- **Objectif :** 3 RENAME de casse/singulier (`regulatory-calendar`, `value-chain`, `sector-news`).
- **Data :** DATA-0. **Routing :** URL-0.
- **Desktop :** `business-intelligence-chapters.ts` (`BI_CHAPTERS[].label`).
- **Mobile :** `NO IMPACT` (`mobileLabel` déjà découplé) — aucun changement.
- **DoD :** labels alignés ; `mobileLabel` inchangés ; `Bibliothèque` = `NEW/FUTURE` ;
  `studies`/`playbooks` inchangés.
- **✅ Livré (2026-09-10) :** `BI_CHAPTERS` labels `Accueil`, `Analyse sectorielle`, `Environnement concurrentiel`,
  `Calendrier Réglementaire`, `Chaîne de Valeur`, `Actualité sectorielle` ; IDs techniques `home`, `sector-analysis`,
  `competitive-environment`, `regulatory-calendar`, `value-chain`, `sector-news` inchangés ; Mobile labels
  `Terrain`, `Analyse`, `Concurrence`, `Réglementation`, `Chaîne`, `Actualités` inchangés ; 0 changement d'URL ;
  0 changement Data.

### 7.5 — Prospection
- **Objectif :** `chapter_2` → « Angles d'approche » ; `chapter_1` REMOVE ; `chapter_3` → module
  « Playbook » ; nouveau chapitre « Activité ».
- **⚠️ Préalable — NEEDS PRODUCT DECISION :** `chapter_1/2/3` sont **vides**. Le lot doit **soit**
  apporter le contenu (Data + composants), **soit** classer les items `NEW/FUTURE` et se limiter à
  `REMOVE chapter_1` + `RENAME chapter_2`.
- **Data :** DATA-1+ (« Angles d'approche » : quelle source ? ; « Playbook » : `v_sector_knowledge_resolved`).
- **Mobile :** `FUTURE` (placeholder statique — décider si Prospection Mobile entre dans le périmètre).
- **Routing :** URL-2 (`chapter_1` retiré, `chapter_3` → `?module=playbook`).
- **DoD :** aucun chapitre/module vide affiché ; `chapter_1` retiré du rail ; décision produit
  tracée.

### 7.6 — Rapports & Rédaction
- **Objectif :** RENAME `knowledge` → « Connaissance » ; **extraire** le composant
  `knowledge-management` vers un emplacement partageable (préalable 7.7).
- **Data :** DATA-0. **Routing :** URL-0.
- **DoD :** label aligné ; composant `knowledge-management` extrait et consommé par Reports sans
  régression ; `Analyse transverse` = `NEW/FUTURE`.

### 7.7 — Veille & Actualités
- **Objectif :** 2 RENAME (`news`, `watched-accounts`) ; module « Gestion de la connaissance » REUSE
  du composant extrait en 7.6 ; option module « Mission : analyse de la veille » (framework REUSE).
- **Data :** DATA-0 (REUSE) / DATA-1 (mission).
- **DoD :** labels alignés ; module KM monté **sans duplication** ; `Analyse transverse` +
  `Mission : …` = `NEW/FUTURE` sauf si branchés proprement.
- **Dependencies :** 7.6 (extraction).

### 7.8 — Knowledge Hub
- **Objectif :** 2 RENAME de `title` (`expertise-kredo`, `internal-resources`).
- **Data :** DATA-0. **Routing :** URL-0. **Mobile :** `LABEL SYNC`.
- **DoD :** `title` alignés ; **`id` de domaine inchangés** ; modules Ateliers/RAG inchangés.

### 7.9 — Automatisations
- **Objectif :** RENAME `sante` → « Fiabilité des workflows » (clé `sante` conservée).
- **Data :** DATA-0. **Routing :** URL-0.
- **DoD :** label aligné ; `?run=` préservé ; `Métriques` / `Simulateur de cadence` = `NEW/FUTURE`.

### 7.10 — Audit final architecture interne
- **Objectif :** revalider chaque workspace contre 09 §B/C ; recenser les `NEW/FUTURE` restants et
  les dettes ; clôturer la Phase 7.
- **Data :** DATA-0. Documentaire.

---

## 20. Go / No-Go Phase 7.1

| Lot | Workspace | Complexité | Data | Desktop | Mobile | Dépendances | Rebaseline requis | Go |
|---|---|---|---|---|---|---|---|---|
| **7.1** | Opportunités | LOW | DATA-0 | 7 labels | LABEL SYNC (à confirmer) | refonte Synthèse parallèle | **OUI** | **YES AFTER REBASELINE** |
| **7.2** | Consultants | MEDIUM | DATA-0 (cœur) | 3 labels + 1 TRANSFORM | SEPARATE IMPL. (pool) | — | Non | ✅ **IMPLEMENTED / PASS** (`bb2a3a4d`) |
| **7.3A** | Rentabilité Data | HIGH | **DATA-2** | — | — | décision vue/builder | Non | **NO — DECISION REQUIRED** |
| **7.3B** | Engagements | HIGH | DATA-1 | 1 TRANSFORM + 1 RENAME + modules | SEPARATE IMPL. | 7.3A | Non | NO (après 7.3A) |
| **7.3C** | Finance | MEDIUM | DATA-1 | 2 RENAME + 1 module | LABEL SYNC | 7.3A, 7.3B | Non | NO (après 7.3B) |
| **7.4** | Business Intelligence | LOW | DATA-0 | 3 labels | NO IMPACT | — | Non | ✅ **IMPLEMENTED / PASS** |
| **7.5** | Prospection | HIGH | DATA-1+ | REMOVE + RENAME + TRANSFORM (coquilles vides) | FUTURE | **décision produit** | Non | **NO — DECISION REQUIRED** |
| **7.6** | Rapports | LOW | DATA-0 | 1 label + extraction composant | NO IMPACT | — | Non | **YES** |
| **7.7** | Veille | MEDIUM | DATA-0 | 2 labels + module REUSE | LABEL SYNC | 7.6 | Non | YES (après 7.6) |
| **7.8** | Knowledge Hub | LOW | DATA-0 | 2 labels | LABEL SYNC | — | Non | **YES** |
| **7.9** | Automatisations | LOW | DATA-0 | 1 label | NO IMPACT | — | Non | **YES** |

**Go 7.1 :** `YES AFTER REBASELINE` — attendre l'intégration de la refonte Synthèse Opportunités
dans `main`, ou un rebaseline explicite du chantier. Les 6 renames indépendants de 7.1 pourraient
être exécutés avant, mais le lot est plus propre en une passe.

**Go 7.2 :** `YES` — aucun blocage, aucune dépendance. **Recommandé comme premier lot Phase 7
exécutable** si 7.1 reste bloqué.

---

## 21. Fichiers modifiés par le Lot 7.0 (documentation uniquement)

| Fichier | Changement |
|---|---|
| `docs/navigation_architecture/SHELL-0018/11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md` | **créé** (ce document) |
| `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md` | Lot 7.0 → ✅ livré ; entrée §40 ; séquence Phase 7 |
| `docs/navigation_architecture/SHELL-0018/README.md` | ordre de lecture (ajout doc 11), statut Phase 7 |

**0 fichier `.ts` / `.tsx` / `.css` / `.sql` / JSON applicatif modifié.**

---

## 22. Dettes / observations relevées (hors périmètre 7.0, à traiter dans les lots)

1. **`MISSION_CATALOG` = 7 specs** — `CLAUDE.md` (« ADR-0020… Catalogue = 1 mission ») est **périmé**.
   À corriger lors d'une prochaine révision de `CLAUDE.md` (hors SHELL-0018).
2. **Duplication de lecture rentabilité** Finance ↔ Engagements (§6.3) — résorbée par 7.3A.
3. **Prospection = workspace coquille** — `chapter_1/2/3` vides. La cible 09 §B.6 est de la
   construction, pas de l'alignement. À arbitrer produit avant 7.5.
4. **Prospection Mobile = placeholder statique** — pas d'implémentation. Décider du périmètre Mobile.
5. **Finance : pas de chapitre `Business Review`, pas de module** — `NEW/FUTURE`, différable.
6. **Clés de query internes non alignées sur les labels** (`chapter_1/2/3`, `sante`,
   `activite-conges` côté Engagements pour « Rentabilité ») — dette cosmétique, **ne pas renommer
   les clés** en Phase 7 (compat), lot dédié éventuel.
7. **`account_score_*` neutralisé au runtime** (ADR-0011 Lot 1) — toute lecture « Atlas du
   portefeuille » doit passer par `v_crm_account_list` / `companies`, jamais `account_score_current`.

---

## 23. Prochain lot

- ~~**Phase 7.2 — Alignement Consultants**~~ → ✅ **livré (2026-09-09)**. Consultants Lot 15 →
  ✅ **CLOSED (2026-09-10)** (workspace techniquement clos).
- **Phase 7.1 — Alignement Opportunités** dès que `src/features/opportunities/summary/` est intégré
  à `main` ou rebaseliné.
- Suite Phase 7 : `7.4 → 7.8 → 7.9 → 7.6 → 7.7 → [7.1 dès rebaseline] → 7.3A → 7.3B → 7.3C → 7.5 → 7.10`.

Opportunities Lot 12 : **DEFERRED UNTIL TARGET-ALIGNMENT** (après 7.1). Consultants Lot 15 :
**CLOSED** (workspace techniquement clos).
