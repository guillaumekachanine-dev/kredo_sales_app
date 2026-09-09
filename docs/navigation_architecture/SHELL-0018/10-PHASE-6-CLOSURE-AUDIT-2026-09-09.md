# SHELL-0018 — Audit de clôture Phase 6

> **Statut : Phase 6 — CLOSED**
> **Date : 2026-09-09**
> **Branche : `main`**
> **HEAD audité : `2859c5bf` (`docs(shell-0018): record Lot 6.6 commit SHA`) — `HEAD == origin/main`**
> **Nature : audit + documentation. 0 modification de code applicatif.**

Ce document est la **preuve de conformité technique** de l'état du Shell global Desktop après
implémentation de la Phase 6. Il ne remplace pas la cible produit :

- `09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` = architecture **cible** (menu principal +
  structure interne des workspaces) ;
- `10-*` (ce document) = **preuve de conformité** du code committé sur `origin/main` après Phase 6.

Toutes les preuves ci-dessous sont établies sur `HEAD` (`git show HEAD:…`, `git grep … HEAD`,
`git ls-tree -r --name-only HEAD`) et **non** sur le working tree, qui contient un chantier
parallèle hors périmètre (voir §0.2).

---

## 0. Cadre de l'audit

### 0.1. Baseline Git

| Élément | Valeur |
|---|---|
| `git rev-parse HEAD` | `2859c5bff9721a6ddf57a69538bb83121d6af6ce` |
| `git rev-parse origin/main` | `2859c5bff9721a6ddf57a69538bb83121d6af6ce` |
| Identiques au démarrage | ✅ oui |
| Dernier commit fonctionnel Phase 6 | `e8f5e4f6` (`refactor(shell-0018): finalize intelligence shell integration`, Lot 6.6) |
| Dernier commit documentaire | `2859c5bf` (`docs(shell-0018): record Lot 6.6 commit SHA`) |

### 0.2. Travail parallèle préservé (hors SHELL-0018)

Working tree `dirty` au démarrage, **jamais touché / formaté / stashé / checkout / reset / stagé** :

```
 M docs/JOURNAL-SESSIONS.md
 M src/features/opportunities/summary/DeadlinesTable.tsx
 M src/features/opportunities/summary/PipeBreakdownChart.tsx
 M src/features/opportunities/summary/ProcessFlowChart.tsx
 M src/features/opportunities/summary/SkillsComparisonChart.tsx
 M src/features/opportunities/summary/SummaryDesktop.tsx
 M src/features/opportunities/summary/__tests__/summary.test.ts
 M src/features/opportunities/summary/summary-geometry.ts
```

Refonte « Synthèse Opportunités » — chantier distinct. Tous les audits de ce document portent sur
`HEAD` afin de ne pas être pollués par ce working tree.

---

## 1. AUDIT 1 — Navigation principale Desktop

**Source :** `git show HEAD:src/lib/navigation/main-menu.config.ts`

### Premier niveau (exact)

```
Accueil · Agenda · CRM · Intelligence · Outils
```

Verrouillé par test : `src/lib/navigation/main-menu.config.test.ts` —
`expect(groupLabels()).toEqual(["Accueil", "Agenda", "CRM", "Intelligence", "Outils"])`.

### Sous-arbres (exacts)

| Groupe | Entrées | Preuve test |
|---|---|---|
| **CRM** | Comptes & Contacts · Opportunités · Engagements · Consultants · Finance | `itemsOf("CRM")` toEqual |
| **Intelligence** | Business Intelligence · Prospection · Rapports & Rédaction · Veille & Actualités | `itemsOf("Intelligence")` toEqual |
| **Outils** | Knowledge Hub · Automatisations · Paramètres | `itemsOf("Outils")` toEqual |

### Absences prouvées

| Attendu absent | Preuve |
|---|---|
| Groupe `Ressources` racine | `main-menu.config.test.ts` : `some(group => group.label === "Ressources")` → `false` |
| Groupe `Finance` autonome racine | `some(group => group.label === "Finance")` → `false` |
| `Paramètres` racine (avec `href`) | `some(item => item.label === "Paramètres" && item.href)` → `false` |
| Entrée `Cockpit` | `some(item => item.label === "Cockpit")` → `false` |
| Entrée globale `Recrutement` | `flat().find(item => item.label === "Recrutement")` → `undefined` |

### Bac à sable

`git grep -n "Bac à sable\|LegacySandbox" HEAD -- src/components/layout/DesktopSidebar.tsx` →
rendu dans une **zone dédiée** de `DesktopSidebar` (`useLegacySandboxStore`, ~ligne 289),
**hors `mainMenuItems`**, badge `Legacy`. Voir §15.

### Icônes

`git show HEAD:src/components/layout/navigation-icons.tsx` — `home`, `calendar`, `crm`, `staffing`,
`engagements`, `equipe`, `finance`, `bi`, `prospection`, `reports`, `veille`, `knowledge`,
`automations`, `settings` : tous résolus. Test : `getNavigationIcon("home")` → SVG.

**Verdict AUDIT 1 : PASS.**

---

## 2. AUDIT 2 — Contrats URL

Aucun pathname canonique n'a changé pendant la Phase 6 ; les nouveaux labels (`Accueil`, `CRM`,
`Outils`…) sont purement présentationnels.

| Entrée de menu | Pathname `HEAD` | Statut |
|---|---|---|
| Accueil | `/cockpit` | inchangé |
| Agenda | `/agenda` | inchangé |
| Comptes & Contacts | `/prospection/accounts` | inchangé |
| Opportunités | `/missions/opps` | inchangé |
| Engagements | `/missions` | inchangé |
| Consultants | `/consultants` | inchangé |
| Finance | `/finance` | inchangé |
| Business Intelligence | `/intelligence` | inchangé |
| Prospection | `/prospection-intelligence` | inchangé |
| Rapports & Rédaction | `/reports` | inchangé |
| Veille & Actualités | `/veille` | inchangé |
| Knowledge Hub | `/knowledge` | inchangé |
| Automatisations | `/automations` | inchangé |
| Paramètres | `/settings` | inchangé |

**Aucune route créée pour refléter un label** : `git ls-tree -r --name-only HEAD | grep -E
'src/app/\(app\)/(accueil|home|crm|outils|intelligence-group)'` → **0**. `Accueil` pointe vers
`/cockpit` ; `CRM` / `Intelligence` / `Outils` sont des **groupes sans `href`**.

Test : `main-menu.config.test.ts` — « le déplacement visuel de Finance et Paramètres ne change
aucun contrat URL » (8 `getActiveModuleHref` toBe).

**Verdict AUDIT 2 : PASS.**

---

## 3. AUDIT 3 — Ancienne navigation horizontale legacy

| Commande sur `HEAD` | Résultat | Classement |
|---|---|---|
| `git grep -nw "SectionNavBar" HEAD -- src` | **0** (exit 1) | symbole inexistant |
| `git grep -n "SectionNavBarSlot" HEAD -- src` | 3 hits | **aucun code actif** (détail ↓) |
| `git grep -n "getModuleTabs\|getSectionTabsForPath" HEAD -- src` | 2 hits | assertions de test uniquement |
| `git grep -n "tabs\?:" HEAD -- src/lib/navigation/main-menu.config.ts` | **0** (exit 1) | `MainMenuItem.tabs` supprimé |

### Détail des 3 occurrences `SectionNavBarSlot`

| Fichier:ligne | Nature |
|---|---|
| `src/app/(app)/missions/layout.tsx:3` | **commentaire historique** (« le groupe (tabbed) et son SectionNavBarSlot ont été… ») — factuel |
| `src/features/consultants/navigation/consultants-sections.test.ts:224-225` | **assertion de test** vérifiant l'absence (`.not.toContain("SectionNavBarSlot")`) |

### Détail des 2 occurrences helpers

| Fichier:ligne | Nature |
|---|---|
| `src/lib/navigation/main-menu.config.test.ts:23-24` | **assertions de test** : `expect("getModuleTabs" in mod).toBe(false)` / `"getSectionTabsForPath"` |

### Fichiers supprimés (Lot 6.4A, commit `48a3a343`)

- `src/components/layout/SectionNavBar.tsx`
- `src/components/layout/SectionNavBarSlot.tsx`
- `main-menu.config.ts` : `export type SectionTab` (legacy Desktop), `MainMenuItem.tabs`,
  `getModuleTabs()`, `getSectionTabsForPath()`
- `breadcrumb.ts` : `addTabs()` (indexait `item.tabs`)

**Verdict AUDIT 3 : PASS — 0 code legacy actif.**

---

## 4. AUDIT 4 — Tabs d'entités (distinction, conservation volontaire)

Le système de **tabs de fiches entités** (`SectionTab` de `@/lib/tabs/tab-types`) n'a **rien à voir**
avec le legacy `SectionNavBar`. Il est actif et volontairement conservé.

| Fichier `HEAD` | Statut |
|---|---|
| `src/components/layout/SectionTabBar.tsx` | **ACTIF** |
| `src/components/layout/section-tab-styles.ts` | **ACTIF** — 3 consommateurs (`SectionTabBar`, `CrmSectionTabBar`, `StaffingSectionTabBar`) |
| `src/components/accounts-contacts/CrmSectionTabBar.tsx` | **ACTIF** |
| `src/components/staffing/StaffingSectionTabBar.tsx` | **ACTIF** |
| `src/lib/tabs/tab-types.ts` · `create-tab-store.ts` · `crm-tab-store.ts` · `missions-tab-store.ts` · `staffing-tab-store.ts` | **ACTIFS** |

`git grep -n "SectionTab\b" HEAD -- src` → ~25 hits, tous `import … from "@/lib/tabs/tab-types"`
(fiches entités CRM / Missions / Staffing) + 1 commentaire dans `main-menu.config.ts`. **0 depuis
`main-menu.config`.**

| Symbole | Verdict |
|---|---|
| `SectionNavBar` / `SectionNavBarSlot` | **SUPPRIMÉ** |
| `SectionTabBar` / `section-tab-styles.ts` / `src/lib/tabs/*` | **ACTIF — conservé volontairement** |

**Verdict AUDIT 4 : PASS.**

---

## 5. Correction factuelle du document 09

`09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` (ligne ~615, tableau roadmap E.1) énumérait
`section-tab-styles.ts` parmi les éléments **supprimés** par le Lot 6.4A.

**Fait :** `section-tab-styles.ts` a été **conservé** (3 consommateurs actifs — voir §4). L'audit
d'entrée du Lot 6.4A dans le ledger (`03-*` §35) le documentait déjà correctement (« **conservé** »).
Seule la ligne de roadmap 09 §E.1 portait l'erreur.

**Correction appliquée (ce lot) :** la description 6.4A du document 09 distingue désormais
explicitement SUPPRIMÉS vs CONSERVÉS. Aucune autre décision historique n'est réécrite.

---

## 6. AUDIT 5 — Route groups `(tabbed)` et routes de compatibilité

### Route groups historiques

```
git ls-tree -r --name-only HEAD | grep -E 'consultants/\(tabbed\)|missions/\(tabbed\)'  → 0
```

**Verdict : supprimés (Lots 6.2 / 6.3).**

### Routes de compatibilité (classement)

| Route `HEAD` | Comportement | Classement |
|---|---|---|
| `src/app/(app)/consultants/page.tsx` | rendu canonique | **ACTIVE CANONICAL** |
| `src/app/(app)/missions/page.tsx` | rendu canonique (Engagements) | **ACTIVE CANONICAL** |
| `src/app/(app)/missions/opps/page.tsx` (+ `[id]`, `[id]/modifier`) | rendu canonique (Opportunités) | **ACTIVE CANONICAL** |
| `src/app/(app)/consultants/activite-conges/page.tsx` | `permanentRedirect("/consultants?section=activite-conges")` | **COMPATIBILITY REDIRECT** |
| `src/app/(app)/consultants/pool-competences/page.tsx` | `permanentRedirect("/consultants?section=pool-competences")` | **COMPATIBILITY REDIRECT** |
| `src/app/(app)/missions/actives/page.tsx` | `permanentRedirect("/missions?vue=missions-at")` | **COMPATIBILITY REDIRECT** |
| `src/app/(app)/missions/projets/page.tsx` | `permanentRedirect("/missions?vue=projets")` | **COMPATIBILITY REDIRECT** |
| `src/app/(app)/recruitment/page.tsx` | `permanentRedirect("/consultants?section=candidats")` | **COMPATIBILITY REDIRECT** |
| `src/app/(app)/staffing/page.tsx` | `permanentRedirect(resolveLegacyStaffingRedirect(...))` | **COMPATIBILITY REDIRECT** |

Aucune route `DEAD / BLOCKER`. Les redirects `permanentRedirect` sont **intentionnels** (préservation
des liens externes / favoris) et documentés dans `desktop-sidebar-policy.ts` (« Elle NE remplace PAS
les redirections de routes historiques »). **Aucune route supprimée dans ce lot.**

**Verdict AUDIT 5 : PASS.**

---

## 7. AUDIT 5bis — `SectionRail` primitive locale des workspaces

`git ls-tree -r --name-only HEAD | grep -E 'SectionRail|section-rail'` :

```
src/components/layout/SectionRail.tsx        (primitive présentationnelle V2)
src/components/layout/SectionRail.test.ts
src/components/layout/MobileSectionRail.tsx  (variante Mobile)
src/lib/navigation/section-rail.ts           (contrat client-safe)
```

### Consommateurs (navigation interne **appartenant au workspace**)

`git grep -ln "SectionRail" HEAD -- src/features src/components` (hors tests) :

| Workspace | Composant de navigation locale |
|---|---|
| Opportunités | `src/features/opportunities/desktop/OpportunitiesDesktopShell.tsx` |
| Engagements | `src/components/missions/engagements/EngagementsDesktopView.tsx` |
| Consultants | `src/features/consultants/desktop/ConsultantsDesktopShell.tsx` |
| Finance | `src/components/finance/FinanceLocalNavigation.tsx` |
| Business Intelligence | `src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.tsx` |
| Prospection Intelligence | `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx` |
| Rapports & Rédaction | `src/components/reports/ReportsLocalNavigation.tsx` |
| Veille & Actualités | `src/components/veille/VeilleLocalNavigation.tsx` |
| Knowledge Hub | `src/features/knowledge-hub/KnowledgeHubLocalNavigation.tsx` |
| Automatisations | `src/components/automations/AutomationsLocalNavigation.tsx` |
| Account Intelligence | `src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.tsx` |

Preuves du découplage Shell ↔ workspace :

- le Shell (`main-menu.config.ts`) ne transporte plus aucun chapitre — commentaire d'en-tête :
  « la navigation secondaire interne d'un module (chapitres) appartient au workspace concerné, via
  sa propre primitive `SectionRail` — jamais à ce fichier » ;
- `OpportunitiesDesktopShell` : `chapters` + `contextualModules` construits **localement** depuis
  `OPPORTUNITIES_SECTIONS` / `OPPORTUNITIES_MODULE_KEYS` ;
- contrats URL locaux : `?section=` / `?vue=` / `?aiSection=` / `?domain=` résolus par les modules
  de navigation de chaque feature ;
- aucun workspace ne recrée `SectionNavBar` (§3) ni ne pilote la sidebar (§9).

**Verdict AUDIT 5bis : PASS.**

---

## 8. AUDIT 6 — Ownership du collapse

**Source :** `git show HEAD:src/lib/navigation/desktop-sidebar-policy.ts` +
`git show HEAD:src/components/layout/DesktopSidebar.tsx`

### Modèle final (4 sources distinctes, composables par OU)

```
isCollapsed =
     preferredCollapsed                         // A — préférence utilisateur durable
  || workspaceAutoCollapsed                     // B — politique pathname pure du Shell
  || intelligencePanelOpen                      // C — signal Cockpit Intelligence lu directement
  || externalCollapseRequestCount > 0           // D — verrous externes exceptionnels (cockpit CRM)
```

| Source | Implémentation `HEAD` | Portée |
|---|---|---|
| **A** `preferredCollapsed` | `useState(defaultCollapsed)` hydraté du cookie `kredo_sidebar_collapsed` (lu SSR dans `AppShell`) ; écrit **uniquement** par le toggle utilisateur | choix durable utilisateur |
| **B** `workspaceAutoCollapsed` | `shouldAutoCollapseDesktopSidebar(pathname)` — fonction **pure**, 0 dépendance React/Zustand/feature ; préfixes `DESKTOP_SIDEBAR_AUTO_COLLAPSE_PREFIXES` | politique Shell |
| **C** `intelligencePanelOpen` | `useIntelligencePanel((state) => state.isOpen)` — **observé directement** par `DesktopSidebar` | surface globale du Shell |
| **D** `externalCollapseRequestCount` | `useSidebarCollapse((s) => s.collapseRequestCount)` — registre de verrous | exception : cockpit CRM (§10) |

`resolveDesktopSidebarCollapsed({ preferredCollapsed, workspaceAutoCollapsed, intelligencePanelOpen,
externalCollapseRequestCount })` — signature à 4 champs, fonction pure, testée
(`desktop-sidebar-policy.test.ts`, 9 combinaisons dont composition C+D indépendante).

### Toggle utilisateur

```ts
const isForcedCollapsed =
  workspaceAutoCollapsed || intelligencePanelOpen || collapseRequestCount > 0
const toggle = () => { if (isForcedCollapsed) return; /* ne modifie que preferredCollapsed + cookie */ }
```

Le toggle est `disabled` sous toute contrainte forcée (B/C/D) et ne touche **jamais** au cookie sous
contrainte. Quand B/C/D retombent, A (préférence) reprend la main sans mémorisation intermédiaire.

**Verdict AUDIT 6 : PASS.**

---

## 9. AUDIT 7 — `useSidebarCollapse` : occurrences finales

`git grep -n "useSidebarCollapse" HEAD -- src` — occurrences **applicatives** :

| Fichier | Rôle |
|---|---|
| `src/hooks/use-sidebar-collapse.ts` | définition du store (`collapseRequestCount` / `requestCollapse` / `requestRestore`) |
| `src/hooks/use-sidebar-collapse.test.ts` | test du hook |
| `src/components/layout/DesktopSidebar.tsx` | **lecteur** (`collapseRequestCount`) |
| `src/components/accounts-contacts/CrmTabbedShell.tsx` | **émetteur** (`requestCollapse` / `requestRestore`) |

Occurrences restantes = **assertions de test d'absence** :
`consultants-sections.test.ts` (247-250), `opportunities-sections.test.ts` (254-261),
`desktop-sidebar-policy.test.ts` (121-125, ajout Lot 6.6). **Aucun workspace métier ne dépend du
hook.**

`git grep -n "requestCollapse\|requestRestore" HEAD -- src` — hors `use-sidebar-collapse.ts` / tests :

| Fichier | Nature |
|---|---|
| `src/components/accounts-contacts/CrmTabbedShell.tsx:49-50` | **UNIQUE émetteur applicatif** |
| `src/components/layout/MobileNavigationMenu.tsx:448…602` | **fonction locale homonyme** `requestCollapse()` — logique Mobile de repli du menu, **sans aucun rapport** avec le store. Hors périmètre, non modifiée. |

**Verdict AUDIT 7 : PASS — 1 seul émetteur applicatif (`CrmTabbedShell`).**

---

## 10. AUDIT 7bis — Pourquoi le cockpit CRM garde un verrou

`git show HEAD:src/components/accounts-contacts/CrmTabbedShell.tsx` (lignes 42-51) :

```ts
useEffect(() => {
  if (isMobile || !isCockpitActive) return
  useSidebarCollapse.getState().requestCollapse()
  return () => useSidebarCollapse.getState().requestRestore()
}, [isCockpitActive, isMobile])
```

`isCockpitActive` dépend de : `pathname` **ET** `activeTabId` (`useCrmTabStore`) **ET** du mode
embedded multi-compte (`isDirectCockpit || activeTabId !== "home"`). Le Shell ne peut **pas** dériver
proprement cet état sans importer `useCrmTabStore` — ce qui recréerait une dépendance
**Shell → feature métier**. Le mini-store `useSidebarCollapse` joue donc son rôle d'**interface
frontière** : le workspace pousse un verrou anonyme, le Shell l'observe sans connaître sa cause.

**Décision de clôture : conservation justifiée. Le store n'est PAS supprimé en Phase 6.**

---

## 11. AUDIT 8 — Cockpit Intelligence, surface globale du Shell

**Source :** `git show HEAD:src/components/layout/AppShell.tsx`

### Montage (branche Desktop)

```
AppShell (async — Server Component)
├── DesktopSidebar defaultCollapsed={cookie kredo_sidebar_collapsed}
├── main  →  {children}
├── IntelligenceToggle   (flottant haut-droite)
└── IntelligencePanel    (sibling flex, bord droit)
```

### Preuves

| Assertion | Preuve `HEAD` |
|---|---|
| `AppShell` reste **Server Component** | `export async function AppShell(...)` — **pas** de `"use client"` ; `await cookies()` (API serveur) |
| `IntelligencePanel` est une **surface globale du Shell** | monté par `AppShell` au niveau racine, sibling de `main` — pas à l'intérieur d'un workspace |
| `DesktopSidebar` lit **directement** `useIntelligencePanel.isOpen` | `const intelligencePanelOpen = useIntelligencePanel((state) => state.isOpen)` |
| `IntelligencePanel` **n'importe plus** `useSidebarCollapse` | `git grep -n "useSidebarCollapse" HEAD -- src/components/intelligence` → **0** (exit 1) |
| `IntelligencePanel` **n'émet plus** de verrou | `git grep -n "requestCollapse\|requestRestore" HEAD -- src/components/intelligence` → **0** |
| `IntelligenceToggle` = simple `toggle()` | `git show HEAD:src/components/intelligence/IntelligenceToggle.tsx` — `const { isOpen, toggle } = useIntelligencePanel()` ; aucun callback prop, aucun event custom |
| `use-intelligence-panel` non refactoré | API inchangée : `isOpen` / `toggle` / `open` / `close` ; aucun provider |
| Aucune action transverse réintroduite dans les `SectionRail` | §7 — les rails ne portent que `chapters` + `contextualModules` ; accès rapides « Bientôt » restent propriété du panneau |

**Verdict AUDIT 8 : PASS.**

---

## 12. AUDIT 9 — AppShell / Adaptive Design

`git show HEAD:src/components/layout/AppShell.tsx` — deux branches **mutuellement exclusives** :

```ts
export async function AppShell({ device, children }) {
  const isMobile = device === "mobile"
  if (isMobile) {
    return ( … <IntelligenceFAB /> <MobileNav /> … )   // branche Mobile — return anticipé
  }
  const cookieStore = await cookies()
  return ( … <DesktopSidebar /> … <IntelligenceToggle /> <IntelligencePanel /> … )  // branche Desktop
}
```

| Contrôle | Résultat |
|---|---|
| `device` résolu **côté serveur** (prop `DashboardDevice`) | ✅ |
| Branche Mobile ne monte **aucun** composant Desktop (`DesktopSidebar`, `IntelligencePanel`, `IntelligenceToggle`) | ✅ |
| Branche Desktop ne monte **aucun** composant Mobile (`MobileNav`, `IntelligenceFAB`) | ✅ |
| Stratégie « charger Desktop puis cacher en CSS sur Mobile » | ❌ absente — interdiction CLAUDE.md respectée |
| Composants Mobile modifiés en Phase 6 | **aucun** |

**Verdict AUDIT 9 : PASS.**

---

## 13. AUDIT 10 — Bac à sable

`git grep -n "LegacySandbox\|Bac à sable" HEAD -- src/components/layout/DesktopSidebar.tsx` :

- store dédié `useLegacySandboxStore` (`@/features/legacy/LegacySandboxStore`) ;
- rendu dans une **zone séparée** du corps de `DesktopSidebar` (bouton bas de rail, ~ligne 289),
  **hors `mainMenuItems`** ;
- badge visuel `Legacy`.

Classement : **INTENTIONAL LEGACY / NON-BLOCKING.** La cible 09 demande explicitement « conserver
pour le moment ». **Non supprimé.** N'empêche pas la clôture.

---

## 14. AUDIT 11 — Dettes post-Phase 6

| # | Dette | Détail | Classement |
|---|---|---|---|
| 1 | **`kredo_intelligence_open` écrit jamais relu** | `use-intelligence-panel.ts:31` écrit le cookie via `persistOpen()`. Aucun lecteur : `git grep -n "kredo_intelligence_open" HEAD -- src` → 1 seul hit (l'écriture). `AppShell` ne lit que `kredo_sidebar_collapsed`. **Conséquence :** au rechargement, le store Zustand démarre toujours `isOpen: false` quelle que soit la valeur du cookie ; le Cockpit Intelligence est fermé après reload même s'il était ouvert. | **NON-BLOCKING / DEFERRED** — arbitrage hydratation Zustand/SSR après clôture Shell. Ne pas corriger en 6.7. |
| 2 | **Lint `react-hooks/set-state-in-effect`** | `IntelligencePanel.tsx:355-359` — `useEffect` de reset des écrans secondaires au changement d'entité (`setAccountActiveAction(null)` etc.). **error** ESLint pré-existante (confirmée Lot 6.5, `git stash`). Le retrait de l'effet de verrou en 6.6 a seulement décalé la ligne (355→356). Sans rapport avec le collapse ni le Shell. | **NON-BLOCKING** — hors SHELL-0018. Candidat lot d'hygiène React dédié. |
| 3 | **Lint `prettify is defined but never used`** | `src/lib/navigation/breadcrumb.ts:41` — *warning* pré-existant (confirmé Lot 6.4A). `buildBreadcrumbTrail` est bien utilisé (`Breadcrumb.tsx` → AppHeader) ; seule la fonction interne `prettify` est morte. | **NON-BLOCKING / hygiène** — lot d'hygiène dédié. |
| 4 | **Bac à sable** | Legacy fonctionnel conservé volontairement (§13). | **INTENTIONAL LEGACY / NON-BLOCKING** |
| 5 | **Commentaire historique `missions/layout.tsx:3`** | « le groupe (tabbed) et son SectionNavBarSlot ont été… » — factuel, aide à la lecture. | **NON-BLOCKING** — conservé délibérément. |
| 6 | **Renommage `MobileSectionRail` / `SectionTabBar`** | Ambiguïté lexicale « SectionTab » entre tabs d'entités et ancien vocabulaire. | **DEFERRED** — cosmétique, non prioritaire. |

**Dettes BLOCKING : aucune.**

---

## 15. AUDIT 12 — Cible produit (09) vs code (`HEAD`)

| Invariant | Cible 09 | État `HEAD` | Verdict |
|---|---|---|---|
| Menu principal | Accueil / Agenda / CRM / Intelligence / Outils | `groupLabels()` toEqual (test) + `git show HEAD:main-menu.config.ts` | **PASS** |
| Finance sous CRM | Oui (5ᵉ) | `itemsOf("CRM")` = […, "Finance"] (test) | **PASS** |
| Paramètres sous Outils | Oui (3ᵉ) | `itemsOf("Outils")` = […, "Paramètres"] (test) ; `some(Paramètres && href)` racine → false | **PASS** |
| Groupe `Ressources` supprimé | Oui | `some(label === "Ressources")` → false (test) | **PASS** |
| `SectionNavBar` / `SectionNavBarSlot` supprimés | Oui | `git grep -nw "SectionNavBar" HEAD` → 0 ; `SectionNavBarSlot` → 0 code actif | **PASS** |
| `SectionTabBar` / `section-tab-styles` conservés | Oui (tabs entités) | 4 fichiers actifs, 3 consommateurs `section-tab-styles` | **PASS** |
| `SectionRail` = primitive locale des workspaces | Oui | 11 composants de navigation locale consomment la primitive ; Shell ne transporte plus de chapitre | **PASS** |
| Collapse Shell-owned | Oui | `resolveDesktopSidebarCollapsed` (pure) + `DesktopSidebar` dérive 4 sources | **PASS** |
| Cockpit Intelligence global, observé par le Shell | Oui | `AppShell` monte `IntelligencePanel` en racine ; `DesktopSidebar` lit `useIntelligencePanel.isOpen` | **PASS** |
| Mobile = architecture distincte | Oui | branches `AppShell` mutuellement exclusives, 0 CSS-hide | **PASS** |
| URLs préservées | Oui | 14 pathnames canoniques inchangés (§2) | **PASS** |
| `(tabbed)` route groups supprimés | Oui | `git ls-tree HEAD | grep '(tabbed)'` → 0 | **PASS** |
| Redirects legacy = compatibilité intentionnelle | Oui | 6 `permanentRedirect` classés (§6) | **PASS** |
| `useSidebarCollapse` → 1 émetteur (CRM) | Oui | `CrmTabbedShell` seul (§9) | **PASS** |
| `AppShell` Server Component | Oui | `export async function`, pas de `"use client"` | **PASS** |

**Aucune ligne FAIL. Aucune ligne PASS sans preuve.**

---

## 16. AUDIT 13 — Phase 6 lot par lot

| Lot | Objet | Commit fonctionnel | Statut |
|---|---|---|---|
| **6.0** | Audit d'entrée & architecture cible Phase 6 | `6199487a` (docs) | ✅ livré |
| **6.1** | Retrait des `SectionNavBarSlot` no-op | `02c316e0` (+ `e6550db8` build-blocker CSS) | ✅ techniquement livré |
| **6.2** | Shell Consultants + Consultants Lot 14 | `50f1a31e` | ✅ techniquement livré |
| **6.3** | Missions historiques + Opportunities Lot 11 | `12ea8166` | ✅ techniquement livré |
| **6.3R** | Rebaseline architecture cible finale (doc 09) | `b5387bd1` (docs) | ✅ livré |
| **6.4A** | Démantèlement navigation horizontale legacy (technique) | `48a3a343` | ✅ techniquement livré |
| **6.4B** | Alignement navigation principale Desktop (produit) | `e6a19d4d` | ✅ techniquement livré |
| **6.5** | Stabilisation `DesktopSidebar` / collapse | `c10c5589` | ✅ techniquement livré |
| **6.6** | Intégration finale Shell global ↔ Cockpit Intelligence | `e8f5e4f6` | ✅ techniquement livré |
| **6.7** | Audit de clôture Phase 6 (**ce document**) | `docs(shell-0018): close phase 6 shell migration` | ✅ clôturé |

SHA repris du ledger (`03-*`) et de `git log`, non reconstruits de mémoire.

---

## 17. Tests / Gates

### Validation applicative finale de la Phase 6 = Lot 6.6 (commit `e8f5e4f6`)

Aucun code applicatif n'a été modifié depuis. Gates du Lot 6.6 (consignées `03-*` §38) :

- `npm run typecheck` : **passé**
- `npm run check:server-boundary` : **passé** (`AppShell` reste Server Component)
- `npx eslint` (5 fichiers touchés) : **0 problème introduit** ; 1 anomalie pré-existante
  (`IntelligencePanel` `set-state-in-effect`, hors périmètre)
- `npm run build` : **passé** (Next.js 16.2.7 Turbopack, 42/42 pages)
- `npm test` (suite complète) : **293 fichiers / 2 937 tests passés (0 échec)**
- `git diff --check` : **passé**

### Vérifications ré-exécutées pour cet audit (2026-09-09, sur `HEAD`)

- `git diff --check` : **passé**
- `git rev-parse HEAD == git rev-parse origin/main` : **vrai**
- `npx vitest run main-menu.config.test.ts desktop-sidebar-policy.test.ts use-sidebar-collapse.test.ts` :
  **3 fichiers / 53 tests passés**
- audits statiques `git grep … HEAD` : voir §1–§13

> Aucun `npm run build` n'a été relancé pour ce lot : working tree porteur du chantier parallèle
> (§0.2), 0 code applicatif modifié, build déjà vert au Lot 6.6. Le build de référence de la
> Phase 6 est celui du commit `e8f5e4f6`.

---

## 18. Règle de clôture & verdict

### Conditions de clôture (toutes remplies)

| Condition | État |
|---|---|
| Aucun legacy Shell actif interdit (`SectionNavBar*`, helpers d'onglets Desktop) | ✅ §3 |
| Navigation principale conforme à la cible 09 | ✅ §1, §15 |
| `SectionNavBarSlot` / `SectionNavBar` supprimés | ✅ §3 |
| Shell possède la politique de collapse (4 sources, fonction pure) | ✅ §8 |
| Workspaces découplés du collapse (0 dépendance `useSidebarCollapse`) | ✅ §7, §9 |
| Cockpit Intelligence intégré globalement, observé directement par le Shell | ✅ §11 |
| `AppShell` Server Component ; Adaptive Design intact ; Mobile distinct | ✅ §12 |
| Aucun blocker code découvert | ✅ |
| Dettes restantes documentées, aucune BLOCKING | ✅ §14 |
| Aucun fichier du chantier Opportunities parallèle stagé | ✅ §0.2 |

### Verdict

```
Phase 6 — CLOSED
```

Aucun blocker. Les 6 dettes recensées sont **NON-BLOCKING** ou **DEFERRED** et n'entrent pas dans
le périmètre d'une clôture de Shell.

---

## 19. Handoff Phase 7

La Phase 7 **ne rouvre aucune décision Shell**. Elle part des invariants désormais **figés** :

| Invariant figé | Référence |
|---|---|
| Navigation principale Desktop (Accueil / Agenda / CRM / Intelligence / Outils) | §1 |
| Sidebar Shell — ownership du collapse (4 sources, `resolveDesktopSidebarCollapsed`) | §8 |
| `SectionRail` — primitive locale, navigation interne propriété du workspace | §7 |
| Contrats URL canoniques (14 pathnames) | §2 |
| Cockpit Intelligence — surface globale du Shell, signal `useIntelligencePanel.isOpen` | §11 |
| Mobile — architecture distincte (`MobileNav` + `IntelligenceFAB`) | §12 |

La Phase 7 traite **uniquement** : chapitres, modules contextuels, transferts fonctionnels,
alignement CURRENT → TARGET des workspaces (Partie C du document 09).

**Premier lot : `Phase 7.0 — Audit global CURRENT → TARGET`** (revalidation de la Partie C du
document 09 contre `origin/main`).

> Opportunities Lot 12 et Consultants Lot 15 restent **DEFERRED UNTIL TARGET-ALIGNMENT** : ils
> suivent respectivement les lots 7.1 et 7.2, pas avant.

---

## 20. Fichiers modifiés par le Lot 6.7 (documentation uniquement)

| Fichier | Changement |
|---|---|
| `docs/navigation_architecture/SHELL-0018/10-PHASE-6-CLOSURE-AUDIT-2026-09-09.md` | **créé** (ce document) |
| `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md` | Lot 6.7 → ✅ clôturé ; Phase 6 → ✅ CLOSED ; prochain chantier = Phase 7.0 ; §39 |
| `docs/navigation_architecture/SHELL-0018/README.md` | ordre de lecture révisé (ajout 09 + 10) |
| `docs/navigation_architecture/SHELL-0018/09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` | correction factuelle 6.4A (`section-tab-styles.ts` conservé, pas supprimé) + pointeur vers document 10 |

**0 fichier `.ts` / `.tsx` / `.css` / `.sql` / JSON applicatif modifié.**
