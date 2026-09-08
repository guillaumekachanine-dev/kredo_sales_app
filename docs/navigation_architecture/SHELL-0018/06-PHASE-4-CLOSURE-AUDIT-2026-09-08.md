# SHELL-0018 — Rapport d'audit exhaustif et clôture Phase 4

> **Date :** 2026-09-08  
> **Chantier :** SHELL-0018 Navigation secondaire Desktop  
> **Lot :** 4.7 — Audit exhaustif et clôture de la Phase 4 (URLisation)  
> **Baseline Git auditée :** `918f55d9` (main synchronisé avec origin/main)  
> **Branche de travail :** `main` (branche unique)

---

## 1. Objet

Ce document dresse l'audit de preuve exhaustif requis pour statuer sur la clôture technique de la **Phase 4** du chantier SHELL-0018.

L'objectif unique est de **prouver** que chaque navigation secondaire Desktop concernée par SHELL-0018 est désormais reconstructible depuis l'URL (deep-link, refresh, Back/Forward), qu'aucun rail ne repose exclusivement sur un `useState` éphémère comme source de vérité de navigation, que les headers principaux restent strictement synchronisés avec le chapitre actif, que les modules contextuels respectent les invariants du Lot 3.1, et que le Mobile demeure isolé et protégé.

---

## 2. Méthode d'audit

L'audit a été mené sur le code source réel du dépôt (`src/app`, `src/components`, `src/features`) à travers les étapes suivantes :

1. **Recherche textuelle et structurelle exhaustive** (ripgrep) sur les identifiants clés :
   - Primitives et composants : `SectionRail`, `LocalNavigation`, `SectionNavBar`, `SectionNavBarSlot` ;
   - États et contrôleurs : `activeTab`, `activeSection`, `activeView`, `setActiveTab`, `setActiveSection`, `setActiveView` ;
   - Hooks de navigation et état React : `useState<`, `useSearchParams`, `usePathname`, `useRouter`, `router.push`, `router.replace`, `useSidebarCollapse`.
2. **Examen unitaire et structurel des 9 surfaces** Desktop canoniques :
   - Vérification du composant principal, de l'adaptateur `SectionRail`, de la fonction de parsing d'URL, du constructeur d'URL (`build*Href`), de la dérivation du titre de header et des modules déclarés.
3. **Contrôle des barrières de compilation et tests automatisés** :
   - `npm run typecheck` (validé sans erreur) ;
   - `npm run check:server-boundary` (validé, aucun composant client n'importe de valeur `server-only`) ;
   - `npm test` : exécution d'une suite ciblée regroupant les 9 surfaces, la primitive `SectionRail` et les tests de contrats de navigation (**21 fichiers de test / 249 tests passés**).
4. **Inventaire du Shell legacy** pour cadrer l'entrée de la Phase 6 sans modifier de code de shell dans ce lot.

---

## 3. Matrice de preuve des 9 surfaces Desktop

| Surface | Route | Source navigation | URL | Root | Back/Forward structurel | Verdict |
|---|---|---|---|---|:---:|:---:|
| **1. Engagements** | `/missions` | `<SectionRail>` inline via `NAV_ENTRIES` (5 chapitres) | `?vue=synthese\|missions-at\|projets\|activite-conges\|planning-at` | `synthese` (quand `vue` est omis ou `vue=synthese`) | Oui (`<Link>` Next.js) | ✅ Conforme URL-driven |
| **2. Business Intelligence** | `/intelligence` | `BusinessIntelligenceLocalNavigation` (`SectionRail`, 6 chapitres) | `?segment=<id>&tab=<chapter>` | `home` (`?tab=home`) | Oui (`window.history.pushState` avec `replaceBiChapterInHref`) | ✅ Conforme URL-driven |
| **3. Account Intelligence** | `/prospection/accounts/[companyId]` | `ClientIntelligenceSidebar` (`SectionRail`, 7 chapitres) | `?aiSection=socle\|connaissance\|secteur\|enjeux\|strategie\|roadmap` | `accueil` (paramètre omis) | Oui (`router.push` direct / `router.replace` multi-comptes embedded) | ✅ Conforme URL-driven |
| **4. Veille & actualités** | `/veille` | `VeilleLocalNavigation` (`SectionRail`, 4 chapitres) | `?section=watched-accounts\|strategic-analysis\|history` | `news` (paramètre omis) | Oui (`router.push` via `buildVeilleSectionHref`) | ✅ Conforme URL-driven |
| **5. Rapports & rédaction** | `/reports` | `ReportsLocalNavigation` (`SectionRail`, 3 chapitres) | `?section=knowledge\|generation` | `documents` (paramètre omis) | Oui (`router.push` via `buildReportsSectionHref`, `{ scroll: false }`) | ✅ Conforme URL-driven |
| **6. Automatisations** | `/automations` | `AutomationsLocalNavigation` (`SectionRail`, 3 chapitres) | `?section=sante\|couts` | `journal` (paramètre omis) | Oui (`router.push` via `buildAutomationsSectionHref`, `{ scroll: false }`) | ✅ Conforme URL-driven |
| **7. Prospection Intelligence** | `/prospection-intelligence` | `ProspectionIntelligenceLocalNavigation` (`SectionRail`, 4 chapitres) | `?section=chapter_1\|chapter_2\|chapter_3` | `strategy` (paramètre omis) | Oui (`router.push` via `buildProspectionSectionHref`, `{ scroll: false }`) | ✅ Conforme URL-driven |
| **8. Knowledge Hub** | `/knowledge` | `KnowledgeHubLocalNavigation` (`SectionRail`, Domaines & Sections) | `?domain=<id>&section=<id>` | `/knowledge` (Catégories) | Oui (`router.push` via `buildKnowledgeHubViewHref`, `{ scroll: false }`) | ✅ Conforme URL-driven |
| **9. Finance** | `/finance` | `FinanceLocalNavigation` (`SectionRail`, 3 chapitres) | `?tab=profitability\|forecast` | `synthesis` (paramètre omis) | Oui (`router.push` via `buildFinanceHref`) | ✅ Conforme URL-driven |

---

## 4. Résultat des recherches de client-state

La recherche systématique d'occurrences `useState<...Tab...>`, `useState<...Section...>` et `useState<...View...>` sur l'ensemble de `src/` confirme :

1. **Zéro navigation secondaire Desktop sur client-state** :
   - Aucun composant Desktop principal des 9 surfaces ne maintient sa position active de chapitre dans un `useState`.
   - Tous les `useState` résiduels dans ces fichiers concernent des états locaux d'interface non contractuels (voir section 5 ci-dessous).
2. **Preuves unitaires déjà automatisées** :
   - `src/components/veille/veille-desktop-contracts.test.ts` assertant `not.toContain("useState<VeilleSection>")` ;
   - `src/components/reports/ReportsLocalNavigation.test.ts` assertant `not.toContain("useState<ReportsSection>")` ;
   - `src/components/automations/AutomationsLocalNavigation.test.ts` assertant `not.toContain("useState<AutomationsTabKey>")` ;
   - `src/components/accounts-contacts/intelligence/account-intelligence-desktop-navigation.test.ts` assertant `not.toContain("useState<ClientIntelligenceDesktopTabKey>")`.

---

## 5. Exceptions locales légitimes

Conformément à la définition de "URL-driven" fixée par le cahier des charges (ADR-0018 V2 § 2 D2-8 et § 7 du prompt) :

1. **États métier et modales purement locaux** (autorisés et non constitutifs d'une dette Phase 4) :
   - Filtres de recherche, tri de colonnes (`sort`), filtres temporels (`period`, `periodFilter`, `costPeriod`) ;
   - États d'ouverture de modales ou drawers (`isPlaybooksOpen`, `isStudiesOpen`, `isPickerOpen`, `dialogOpen`, `sourceManagementOpen`, `isSimulationOpen`, `activeAlert`) ;
   - États de formulaires ou d'édition (`isEditing`, `copied`, `message`).
2. **Mode embedded CRM multi-comptes (`CrmTabbedShell`)** :
   - Dans le shell CRM multi-onglets, les panneaux d'entreprises inactifs sont masqués en CSS sans être démontés.
   - Un réducteur pur (`embeddedAccountIntelligenceNavigationReducer`) conserve en mémoire locale l'onglet actif propre à chaque panneau inactif, évitant les collisions d'URL.
   - Dès qu'un panneau est réactivé, sa section mémorisée est restaurée dans l'URL via `router.replace()`.
   - En consultation directe (`/prospection/accounts/[companyId]`), la navigation est 100% directe via `router.push()` sans mémoire locale.
3. **Paramètres orthogonaux préservés** :
   - `/automations?run=<id>` : le paramètre `run` ouvre directement la modale d'exécution du run ciblé, tout en restant orthogonal à `section` ;
   - `/reports?doc=<id>` : la sélection documentaire dans la Bibliothèque est conservée lors des navigations de filtrage et de chapitres ;
   - `/intelligence?segment=<id>` : le segment actif reste le pivot du workspace segmentaire.

---

## 6. Legacy Shell restant pour Phase 6 (Refonte Shell global)

L'audit particulier de `SectionNavBarSlot`, `SectionNavBar` et `useSidebarCollapse` montre qu'aucun de ces éléments n'interfère avec la validité de la Phase 4, mais qu'ils constituent la matière de la Phase 6 :

| Élément Legacy | Consommateurs actuels | Risque de suppression immédiate | Traitement futur Phase 6 |
|---|---|---|---|
| **`SectionNavBarSlot`** | 6 layouts :<br>1. `src/app/(app)/missions/(tabbed)/layout.tsx`<br>2. `src/app/(app)/consultants/layout.tsx`<br>3. `src/app/(app)/automations/layout.tsx`<br>4. `src/app/(app)/knowledge/layout.tsx`<br>5. `src/app/(app)/finance/layout.tsx`<br>6. `src/app/(app)/prospection/layout.tsx` | **Critique** sur `/consultants` (seule barre de nav du module Équipe) et sur `/missions/(tabbed)` (navigation des sous-routes historiques).<br><br>**Nul (no-op)** sur `/automations`, `/knowledge`, `/finance`, `/prospection` (car aucun onglet dans `main-menu.config.ts`, `SectionNavBar` retourne `null` au runtime). | 1. Migrer `/consultants` vers un `SectionRail` ou un contrat V2.<br>2. Unifier les sous-routes missions vers le shell `/missions?vue=...`.<br>3. Supprimer `SectionNavBarSlot` de tous les layouts. |
| **`SectionNavBar`** | Uniquement `SectionNavBarSlot.tsx` | Lié à `SectionNavBarSlot` et aux types de `main-menu.config.ts`. | Supprimer le composant et nettoyer `SectionTab` de `main-menu.config.ts` une fois les layouts nettoyés. |
| **`useSidebarCollapse`** | 9 consommateurs :<br>- `DesktopSidebar.tsx` (consommateur récepteur)<br>- `ReportsDesktopView.tsx`<br>- `CrmTabbedShell.tsx`<br>- `BusinessIntelligenceDesktop.tsx`<br>- `KnowledgeHubDesktop.tsx`<br>- `VeilleActualitesDesktop.tsx`<br>- `EngagementsDesktopView.tsx`<br>- `ProspectionIntelligenceDesktop.tsx`<br>- `IntelligencePanel.tsx` | **Moyen** : gère le repli de la sidebar globale gauche lors du montage des pages denses. | Arbitrer le comportement global Desktop du Shell (push vs overlay vs largeur fixe) et simplifier le store. |
| **Layouts historiques** | `missions/(tabbed)/layout.tsx`<br>`consultants/layout.tsx` | **Élevé** tant que les sous-pages associées ne sont pas réorientées. | Fusionner avec les layouts parents respectifs. |

---

## 7. Dettes éventuelles

- **Dettes de Phase 4 : 0.** Aucune navigation secondaire Desktop prévue ne subsiste en client-state.
- **Périmètre hors Phase 4 / reporté en Phase 6 :**
  - Le module « Équipe » (`/consultants`) reste sur sa barre d'onglets horizontale `SectionNavBarSlot` issue de l'ancienne architecture. Il n'a jamais fait partie des 9 surfaces à migrer en Phase 2/4.
  - La route historique `/missions/(tabbed)` subsiste en parallèle du shell unifié `/missions`.
  - Aucune de ces dettes ne bloque la clôture de la Phase 4.

---

## 8. Verdict Phase 4

### Critères de clôture validés :
1. Les **neuf surfaces prévues** ont été auditées en profondeur dans le code réel.
2. **Aucune navigation secondaire Desktop** ne repose encore exclusivement sur un `useState` éphémère.
3. Chaque état actif est **reconstructible depuis l'URL** (deep-link, refresh, Back/Forward) ou par le contrat embedded explicitement prévu et documenté (`CrmTabbedShell`).
4. Les **headers principaux** restent synchronisés avec le libellé exact du chapitre actif.
5. Les **modules contextuels** respectent rigoureusement les directives du Lot 3.1 (ancrage bas, uniquement disponibles, `undefined` sans capacité active, aucun bouton mort ni action transverse).
6. Aucune **régression Mobile structurelle** : les branches serveur conditionnelles (`getDashboardDevice()`) et les vues mobiles dédiées restent strictement protégées.
7. Les éléments legacy (`SectionNavBarSlot`, `SectionNavBar`, `useSidebarCollapse`) sont intégralement recensés et cartographiés pour la Phase 6.

### Verdict :
> **Phase 4 — CLOSED (Techniquement close)**  
> La standardisation et l'URLisation des 9 navigations secondaires Desktop du chantier SHELL-0018 sont achevées.
