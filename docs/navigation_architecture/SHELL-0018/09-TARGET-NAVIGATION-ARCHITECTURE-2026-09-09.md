# KREDO — Architecture cible finale de navigation

> **Statut : Décision canonique**
> **Date : 2026-09-09**
> **Lot : SHELL-0018 — 6.3R (rebaseline documentaire, aucun code applicatif modifié)**
> **Baseline Git : `972c647b` (`main`, synchronisé avec `origin/main`)**
> **Supersède les anciennes cibles de navigation lorsqu'elles divergent.**

---

## 0. Portée et règle de supersession

Ce document définit la **destination fonctionnelle et informationnelle finale** de la
navigation KREDO, arbitrée après la livraison de :

- **SHELL 6.2 + Consultants Lot 14** (Consultants sous CRM, suppression « Équipe » /
  « Recrutement » / groupe « Ressources », dernier `SectionNavBarSlot` Consultants retiré) ;
- **SHELL 6.3 + Opportunities Lot 11** (sortie de `missions/(tabbed)`, `MissionsTabbedShell`
  supprimé, libellé CRM « Opportunités », `/staffing` → `?section=besoins`).

> **Règle NAV-TARGET (supersession).**
> Ce document définit la destination fonctionnelle et informationnelle finale.
> Les anciens ADR, audits et ledgers restent valides comme **historique
> d'implémentation**, mais ne doivent plus être utilisés pour réintroduire une
> taxonomie, un libellé ou une organisation contredisant cette cible.
>
> Documents explicitement supersédés **lorsqu'ils divergent** (jamais supprimés, jamais réécrits) :
> - `docs/adr/ADR-0018-refonte-shell-navigation-desktop.md` (2026-08-06) — taxonomie de menu antérieure ;
> - `docs/navigation_architecture/SHELL-0018/00-CURRENT-STATE-AUDIT-2026-09-07.md` — instantané périmé ;
> - `docs/navigation_architecture/SHELL-0018/04-CURRENT-NAVIGATION-INVENTORY.md` — inventaire pré-6.2/6.3 ;
> - `docs/navigation_architecture/SHELL-0018/07-HANDOFF-PHASE-6-REPRISE-CHANTIER.md` — cible de menu partielle ;
> - `docs/navigation_architecture/SHELL-0018/08-PHASE-6-ENTRY-AUDIT-AND-TARGET-ARCHITECTURE.md` §8
>   (« Architecture cible ») — reste la référence d'**ownership technique** (collapse, bus sidebar,
>   `SectionNavBar*`), mais la **taxonomie de menu** et la **structure interne des workspaces** sont
>   désormais fixées ici.
>
> `01-ADR-0018-SHELL-NAVIGATION-V2.md` et `02-SECONDARY-RAIL-STANDARD.md` **ne sont pas
> supersédés** : ils restent la loi visuelle et comportementale de la primitive `SectionRail`.

**Aucun code applicatif n'est modifié par ce lot.** La cible ci-dessous est une destination ;
sa matérialisation est planifiée en **Phase 6.4B** (menu principal) et en **Phase 7** (interne
des workspaces).

---

## 1. Deux niveaux d'architecture — ne jamais confondre

| Niveau | Objet | Propriétaire | Où il se décide |
|---|---|---|---|
| **A. Navigation principale Desktop** | Le menu global : logo, entrées racines, groupes, modules de premier niveau | **Le Shell** (`DesktopSidebar` + `main-menu.config.ts`) | Phase 6.4B |
| **B. Architecture interne d'un workspace** | Pour une page : ses **Chapitres** et ses **Modules** | **Le workspace concerné** (contrat de navigation local + `SectionRail`) | Phase 7.x |

- Un changement de **menu global** appartient au Shell (Phase 6.4B).
- Un changement de **chapitre / module** appartient au workspace (Phase 7).
- **Chapitre** = une sous-vue de la page, portée par l'URL (`?section=`, `?vue=`, `?tab=`…),
  rendue dans la zone principale, nommée dans le header principal.
- **Module** = un outil **contextuel** de la page, listé sous l'espace flexible du `SectionRail`,
  ouvert **au-dessus** du chapitre courant (`?module=` ou équivalent). Jamais un lanceur global.
  Les actions transverses restent hors rail (Cockpit Intelligence — ADR-0018 V2 D2-6).

---

# PARTIE A — NAVIGATION PRINCIPALE DESKTOP

## A.1. Structure cible

```
Logo KREDO ................................. → page Accueil (pathname /cockpit conservé)

Accueil ................................... /cockpit          (ex-« Cockpit »)
Agenda ................................... /agenda

CRM
  Comptes & Contacts ..................... /prospection/accounts   (pathname audité, conservé)
  Opportunités .......................... /missions/opps
  Engagements .......................... /missions
  Consultants .......................... /consultants
  Finance ............................. /finance                 (déplacé depuis un groupe autonome)

INTELLIGENCE
  Business Intelligence ................ /intelligence
  Prospection ......................... /prospection-intelligence
  Rapports & Rédaction ................ /reports
  Veille & Actualités ................. /veille

OUTILS
  Knowledge Hub ....................... /knowledge
  Automatisations .................... /automations
  Paramètres ........................ /settings                  (n'est plus une entrée racine)

──────────────────────────────────────────
Bac à sable (LEGACY — hors menu principal, destiné à suppression ultérieure, lot dédié)
```

## A.2. État actuel du code (preuve — `src/lib/navigation/main-menu.config.ts`, `src/components/layout/DesktopSidebar.tsx`)

| Position actuelle | Entrée | Pathname actuel | Icône actuelle |
|---|---|---|---|
| Racine | **Cockpit** (`primary`) | `/cockpit` | `cockpit` |
| Racine | **Agenda** | `/agenda` | `calendar` |
| Groupe **CRM** | Comptes & contacts (`primary`) | `/prospection/accounts` | `crm` |
| Groupe **CRM** | Opportunités (`primary`) | `/missions/opps` | `staffing` |
| Groupe **CRM** | Engagements | `/missions` | `engagements` |
| Groupe **CRM** | Consultants | `/consultants` | `equipe` |
| Groupe **Intelligence** | Business Intelligence | `/intelligence` | `bi` |
| Groupe **Intelligence** | Prospection | `/prospection-intelligence` | `prospection` |
| Groupe **Intelligence** | Rapports & Rédaction | `/reports` | `reports` |
| Groupe **Intelligence** | Veille & Actualités | `/veille` | `veille` |
| Groupe **Finance** (autonome) | Finance (`primary`) | `/finance` | `finance` |
| Groupe **Outils** | Knowledge Hub | `/knowledge` | `knowledge` |
| Groupe **Outils** | Automatisations | `/automations` | `automations` |
| Racine | **Paramètres** | `/settings` | `settings` |
| Hors `main-menu.config.ts` | **Bac à sable** (bouton codé en dur dans `DesktopSidebar`, badge « Legacy », ouvre `useLegacySandboxStore`) | — | — |

Le groupe **« Ressources »** et les entrées **« Équipe »** / **« Recrutement »** **n'existent
plus** dans `main-menu.config.ts` (retirés au Consultants Lot 14 / SHELL 6.2).

Le type `SectionTab`, `getModuleTabs()`, `getSectionTabsForPath()` **subsistent** dans
`main-menu.config.ts`, mais **aucune entrée ne porte plus de tableau `tabs`** (retirés aux
Lots 6.2 et 6.3). `getMobileTabsForPath()` en dépend encore (fallback). Leur suppression est
le périmètre de **SHELL 6.4A**.

## A.3. Traitement entrée par entrée (Phase 6.4B)

### Logo KREDO
Renvoie à la page **Accueil**. Le pathname existant (`/cockpit`) **n'est pas automatiquement
renommé**. Aujourd'hui déjà : `<Link href="/cockpit">` dans `DesktopSidebar.tsx`. **KEEP.**

### Accueil (ex-Cockpit) — `RENAME`
- Nom produit cible : **Accueil**.
- Pathname : **`/cockpit` conservé** sauf décision ultérieure explicite (NAV-TARGET-02).
- Pictogramme cible : icône **Accueil / Home**, et non une icône « Cockpit » spécifique.
- `aria-label` / `title` (« Retour au cockpit », « Cockpit ») à réaligner sur « Accueil ».

### Agenda — `KEEP`
RAS. Pathname `/agenda`.

### CRM — section principale
Ordre cible **exact** :
1. **Comptes & Contacts**
2. **Opportunités**
3. **Engagements**
4. **Consultants**
5. **Finance**

| Entrée | Traitement | Détail |
|---|---|---|
| **Comptes & Contacts** | `RENAME` | Libellé `Comptes & contacts` → `Comptes & Contacts`. **Ne PAS décider d'une migration de pathname dans ce lot** : le contrat canonique actuel `/prospection/accounts` est conservé (NAV-TARGET-02). **Ne pas créer `/crm`** uniquement pour refléter le nom. |
| **Opportunités** | `KEEP` | Pathname canonique conservé : **`/missions/opps`**. Libellé déjà « Opportunités » (Lot 11). |
| **Engagements** | `KEEP` | Nom inchangé. Pathname canonique : **`/missions`**. |
| **Consultants** | `KEEP` | Domaine ayant absorbé l'ancienne page **Équipe** et le **recrutement** (Consultants Lots 9-14). Pathname canonique : **`/consultants`**. |
| **Finance** | `MOVE` | La page Finance passe **sous CRM**, en dernière position. **Pathname `/finance` conservé.** Le **groupe autonome « Finance »** de `main-menu.config.ts` **disparaît** (conteneur seulement — la page n'est pas touchée). |

### INTELLIGENCE — `KEEP` (section inchangée)
Ordre : **Business Intelligence · Prospection · Rapports & Rédaction · Veille & Actualités**.
Aucune modification de menu. (Les transformations *internes* de ces workspaces relèvent de la Partie B / Phase 7.)

### Ressources — `REMOVE` (déjà effectué)
La section globale autonome **« Ressources »** est supprimée. **Constat de code :** elle
n'existe déjà plus dans `main-menu.config.ts` (retrait au Consultants Lot 14). Ligne conservée
dans la matrice pour mémoire, statut *déjà réalisé*.

### OUTILS
Ordre cible : **Knowledge Hub · Automatisations · Paramètres**.

| Entrée | Traitement | Détail |
|---|---|---|
| **Knowledge Hub** | `KEEP` | `/knowledge`. |
| **Automatisations** | `KEEP` | `/automations`. |
| **Paramètres** | `MOVE` | N'est **plus une entrée racine séparée** : devient le **dernier module du groupe Outils**. **Pathname `/settings` conservé.** |

### Bac à sable — `KEEP` (LEGACY)
- Reste **séparé** du menu principal (bouton dédié dans `DesktopSidebar`, badge « Legacy »).
- **Conservé temporairement**, explicitement marqué **LEGACY / destiné à suppression ultérieure**.
- **NE DOIT PAS être supprimé dans la Phase 6 sans lot dédié** (dette déjà consignée en
  `08-…` §11 : `LegacySandboxStore` / `LegacyNavigationDrawer` hors périmètre SHELL-0018).

---

# PARTIE B — ARCHITECTURE INTERNE CIBLE DES WORKSPACES

> Rappel : **Chapitre** (sous-vue URL, header principal) ≠ **Module** (outil contextuel du rail,
> ouvert au-dessus du chapitre). Chaque ligne « Traitement » s'appuie sur une **preuve de dépôt**.
> Une capacité cible **absente du code** est **`NEW/FUTURE`** — **jamais `REUSE`**, jamais un bouton mort (NAV-TARGET-07).

## B.1. Opportunités — `/missions/opps`

**Preuves :** `src/features/opportunities/navigation/opportunities-sections.ts`,
`src/features/opportunities/modules/opportunities-modules.ts`,
`src/features/opportunities/desktop/OpportunitiesDesktopShell.tsx`.

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `synthese` — « Synthèse » | **Vue d'ensemble** | `RENAME` |
| `besoins` — « Besoins & staffing » | **Besoins & Staffing** | `KEEP` (casse) |
| `avant-vente` — « Avant-vente » | **Avant-vente Projets** | `RENAME` |
| `planning` — « Planning » | **Planning & Échéances** | `RENAME` |

Contrat URL `?section=` inchangé (racine `synthese` sans paramètre ; compat `?scope=` au parsing).

### Modules

| Actuel (code) | Cible | Traitement | Preuve |
|---|---|---|---|
| `matching` — « Matching profil » | **Matching profils** | `RENAME` | `MatchingDialog`, moteur unique `src/lib/staffing-matching/` |
| `simulation` — « Simulation devis » | **Simulation financière** | `RENAME` | `FinancialModelingDesktopDialog` (`@/features/financial-modeling`) |
| `post-mortem` — « Post-Mortem » | **Revue post-mortem** | `RENAME` | `MissionComposerDesktop`, mission `post-mortem-commercial` |

Les 3 modules sont déjà constamment visibles sur tous les chapitres (Lot 10). Contrat `?module=`.

## B.2. Engagements — `/missions`

**Preuves :** `src/components/missions/engagements/EngagementsDesktopView.tsx`
(`VIEWS`, `HEADER_TITLE_BY_VIEW`, `?vue=`), `src/app/(app)/missions/page.tsx`.

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `synthese` — « Synthèse » | **Synthèse** | `KEEP` |
| `missions-at` — « Missions AT » | **Missions AT** | `KEEP` |
| `projets` — « Projets » | **Projets** | `KEEP` |
| `activite-conges` — « Activité & congés » | **Rentabilité des engagements** | `TRANSFORM` + `MOVE`/`REUSE` |
| `planning-at` — « Planning des engagements » | **Planning & Échéances** | `RENAME` |

**Transformation majeure `activite-conges` → « Rentabilité des engagements »** : la nouvelle
section reprend le contenu pertinent de **Finance → « Rentabilité des missions »**
(voir B.5). C'est un **MOVE / REUSE métier futur** — **aucun code déplacé dans ce lot**.
Coordination obligatoire **Engagements + Finance** (Phase 7.3) pour garantir : une seule source
de vérité Data, pas de duplication métier, pas de second calcul de marge, pas de duplication UI.

### Modules

| Actuel (code) | Cible | Traitement | Preuve / note |
|---|---|---|---|
| *(aucun — `contextualModules` absent de `EngagementsDesktopView`)* | **Atlas du portefeuille** | `NEW/FUTURE` | Aucun module de rail. Capacité **voisine** existante à évaluer en REUSE Phase 7.3 : type de document / action intelligence `account_portfolio` (« Revue de portefeuille comptes »). Non matérialisée comme module → reste `NEW/FUTURE`. |
| — | **Production & Congés** | `REUSE` | Module existant `src/features/consultants/modules/production-leave/` (contrat mensuel + UI Desktop/Mobile, Consultants Lots 11-12). |
| — | **Mission : analyse des marges** | `REUSE` | Capacité intelligence existante : `src/lib/intelligence/actions/` (règles de marge) + `AnalyzeMarginsResult.tsx`. À reconfirmer « réellement branché comme module » en Phase 7.3 — sinon repli en `NEW/FUTURE`. |

## B.3. Consultants — `/consultants`

**Preuves :** `src/features/consultants/navigation/consultants-sections.ts`
(`CONSULTANTS_SECTIONS`, `CONSULTANTS_CONTEXTUAL_MODULES`),
`src/features/consultants/desktop/ConsultantsDesktopShell.tsx`.

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `synthese` — « Synthèse » | **Vue d'ensemble** | `RENAME` |
| `collaborateurs` — « Collaborateurs » | **Collaborateurs** | `KEEP` |
| `activite-conges` — « Activités & congés » | **Activité & Congés** | `KEEP` (casse) |
| `candidats` — « Candidats » | **Vivier Candidats** | `RENAME` |
| `pool-competences` — « Pool de compétences » | *(sort des chapitres)* | `TRANSFORM` (chapitre → module) |

Le chapitre **`pool-competences`** doit **sortir des chapitres** et **devenir un Module**.
**Transformation structurelle future — à ne pas faire maintenant** (Phase 7.2). Le contrat
`?section=pool-competences` et la route `permanentRedirect` legacy restent inchangés d'ici là.

### Modules

| Actuel (code) | Cible | Traitement | Preuve / note |
|---|---|---|---|
| *(nouveau)* | **Pool de compétences** | `TRANSFORM` | Provient du chapitre `pool-competences` (`src/features/consultants/skills/`). |
| `production-conges` — « Production & Congés » | **Production & Congés** | `KEEP` | `src/features/consultants/modules/production-leave/` (Lots 11-12). |
| `matching-profil` — « Matching profil » | **Matching Profil** | `KEEP` (casse) | `src/features/consultants/modules/profile-matching/` (Lot 13). |
| — | **Mission : prévoir les disponibilités** | `NEW/FUTURE` | Aucune implémentation. **Ne jamais considérer implémenté sans preuve.** |

## B.4. Finance — `/finance`

**Preuve :** `src/components/finance/FinanceLocalNavigation.tsx`
(`FINANCE_DESKTOP_CHAPTERS`, `?tab=`).

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `synthesis` — « Synthèse » | **Synthèse** | `KEEP` |
| `profitability` — « Rentabilité missions » | **Rentabilité P&L** | `RENAME` (+ contenu destiné à `MOVE`/`REUSE` vers Engagements → « Rentabilité des engagements », voir B.2) |
| `forecast` — « Prévision & simulation » | **Forecast** | `RENAME` |
| *(absent)* | **Business Review** | `NEW/FUTURE` |

> **Attention (Phase 7.3).** Le contenu actuel « Rentabilité des missions » de Finance est
> destiné à être **réutilisé / transféré** vers Engagements → « Rentabilité des engagements ».
> Le chantier coordonné Engagements + Finance doit garantir : **une seule source de vérité
> Data**, **pas de duplication métier**, **pas de deuxième calcul de marge**.

### Modules

| Actuel (code) | Cible | Traitement | Preuve / note |
|---|---|---|---|
| *(aucun — `contextualModules: undefined`)* | **Simulation financière** | `REUSE` | `@/features/financial-modeling` (`FinancialModelingDesktopDialog`). |
| — | **Atlas du portefeuille** | `NEW/FUTURE` | Idem B.2 : pas de module de rail ; capacité voisine `account_portfolio` à évaluer Phase 7.3. |
| — | **Mission : analyse des marges** | `REUSE` | Idem B.2 (`src/lib/intelligence/actions/` + `AnalyzeMarginsResult.tsx`) — à reconfirmer, sinon `NEW/FUTURE`. |

## B.5. Business Intelligence — `/intelligence`

**Preuves :** `src/features/business-intelligence/navigation/business-intelligence-chapters.ts`
(`BI_CHAPTERS`), `src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.tsx`.

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `home` — « Accueil » | **Accueil** | `KEEP` |
| `sector-analysis` — « Analyse sectorielle » | **Analyse sectorielle** | `KEEP` |
| `competitive-environment` — « Environnement concurrentiel » | **Environnement concurrentiel** | `KEEP` |
| `regulatory-calendar` — « Calendrier réglementaire » | **Calendrier Réglementaire** | `RENAME` (casse) |
| `value-chain` — « Chaîne de valeur » | **Chaîne de Valeur** | `RENAME` (casse) |
| `sector-news` — « Actualités sectorielles » | **Actualité sectorielle** | `RENAME` (singulier) |

### Modules

| Actuel (code) | Cible | Traitement | Preuve / note |
|---|---|---|---|
| `studies` — « Études sectorielles » (conditionnel `studiesAvailable`) | **Études sectorielles** | `KEEP` | `BusinessIntelligenceLocalNavigation.tsx` |
| `playbooks` — « Playbooks » (conditionnel `playbooksAvailable`) | **Playbooks** | `KEEP` | idem |
| *(absent du rail)* | **Bibliothèque** | `NEW/FUTURE` | Aucun module « Bibliothèque » dans le rail BI. |

## B.6. Prospection — `/prospection-intelligence`

**Preuves :** `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx`
(`PROSPECTION_DESKTOP_CHAPTERS`), `…/prospection-intelligence-desktop-navigation.ts` (`?section=`).

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `strategy` — « Brief » | **Brief** | `KEEP` |
| `chapter_2` — « Approches commerciales » | **Angles d'approche** | `RENAME` |
| *(absent)* | **Activité** | `NEW/FUTURE` |
| `chapter_1` — « Fenêtres d'opportunités » | *(pas de chapitre cible)* | `REMOVE` (arbitrage Phase 7.5 — repli possible dans « Activité » ou un module) |
| `chapter_3` — « Playbooks » | *(sort des chapitres)* | `TRANSFORM` (chapitre → module « Playbook ») |

### Modules

| Actuel (code) | Cible | Traitement | Preuve / note |
|---|---|---|---|
| *(aucun — `contextualModules: undefined`)* | **Campagne** | `NEW/FUTURE` | Aucune implémentation de module. |
| — | **Métriques Activité** | `NEW/FUTURE` | Aucune implémentation de module. |
| `chapter_3` — « Playbooks » | **Playbook** | `TRANSFORM` | Provient du chapitre actuel `chapter_3`. |

> **Ne pas inventer un module si aucune implémentation réelle n'existe.**

## B.7. Rapports & Rédaction — `/reports`

**Preuves :** `src/components/reports/ReportsLocalNavigation.tsx` (`REPORTS_DESKTOP_CHAPTERS`),
`src/components/reports/reports-desktop-navigation.ts` (`?section=`).

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `documents` — « Bibliothèque » | **Bibliothèque** | `KEEP` |
| `knowledge` — « Connaissances » | **Connaissance** | `RENAME` |
| `generation` — « Génération » | **Génération** | `KEEP` |

### Modules

| Actuel (code) | Cible | Traitement | Preuve / note |
|---|---|---|---|
| `knowledge-management` — « Gestion de la connaissance » (conditionnel `onOpenKnowledgeManagement`) | **Gestion de la connaissance** | `KEEP` | `ReportsLocalNavigation.tsx` |
| *(absent)* | **Analyse transverse** | `NEW/FUTURE` | Aucune capacité réelle correspondante. |

## B.8. Veille & Actualités — `/veille`

**Preuve :** `src/components/veille/VeilleLocalNavigation.tsx` (`VEILLE_DESKTOP_CHAPTERS`).

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `news` — « Actualités » | **Actualités thématiques** | `RENAME` |
| `watched-accounts` — « Veille ciblée » | **Veille Ciblée** | `KEEP` (casse) |
| `strategic-analysis` — « Analyses » | **Analyses** | `KEEP` |
| `history` — « Archives » | **Archives** | `KEEP` |

### Modules

| Actuel (code) | Cible | Traitement | Preuve / note |
|---|---|---|---|
| `source-management` — « Gestion des sources » (conditionnel `onOpenSourceManagement`) | **Gestion des sources** | `KEEP` | `VeilleLocalNavigation.tsx` |
| *(absent)* | **Gestion de la connaissance** | `REUSE` | Composant existant côté Rapports (`knowledge-management`). **Ne pas dupliquer** — privilégier le REUSE Phase 7.7. |
| *(absent)* | **Analyse transverse** | `NEW/FUTURE` | — |
| *(absent)* | **Mission : analyse de la veille** | `NEW/FUTURE` | — |

## B.9. Knowledge Hub — `/knowledge`

**Preuves :** `src/features/knowledge-hub/knowledge-hub-shell-data.ts` (`domains`),
`src/features/knowledge-hub/knowledge-hub-desktop-navigation.ts`,
`src/features/knowledge-hub/KnowledgeHubLocalNavigation.tsx`.
Navigation contextuelle **Racine → Domaine → Section** conservée (SHELL Lot 2.8) — la cible
compare **CURRENT vs TARGET** au niveau des domaines, sans modifier le modèle.

### Chapitres (domaines)

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `clients-markets` — « Clients & Marchés » | **Clients & Marchés** | `KEEP` |
| `expertise-kredo` — « Expertise KREDO » | **Expertises KREDO** | `RENAME` |
| `talents` — « Talents » | **Talents** | `KEEP` |
| `delivery-feedback` — « Delivery & REX » | **Delivery & REX** | `KEEP` |
| `ao-proposals` — « AO & Propositions » | **AO & Propositions** | `KEEP` |
| `internal-resources` — « Ressources internes » | **Ressources admin** | `RENAME` |

### Modules

| Actuel (code) | Cible | Traitement | Preuve |
|---|---|---|---|
| Ateliers (`workshops`) | **Ateliers** | `KEEP` | `KnowledgeHubModuleModal.tsx`, `KnowledgeHubMobileWorkshops.tsx` |
| RAG (« Interroger le Corpus ») | **RAG** | `KEEP` | `KnowledgeHubModuleModal.tsx` (`isWorkshop ? … : "Interroger le Corpus"`) |

## B.10. Automatisations — `/automations`

**Preuves :** `src/components/automations/AutomationsLocalNavigation.tsx`
(`AUTOMATIONS_DESKTOP_CHAPTERS`), `src/components/automations/automations-desktop-navigation.ts` (`?section=`, `?run=` préservé).

### Chapitres

| Actuel (code) | Cible | Traitement |
|---|---|---|
| `journal` — « Journal d'exécution » | **Journal d'exécution** | `KEEP` |
| `sante` — « Santé des workflows » | **Fiabilité des workflows** | `RENAME` |
| `couts` — « Coûts » | **Coûts** | `KEEP` |

### Modules

| Actuel (code) | Cible | Traitement | Preuve / note |
|---|---|---|---|
| *(aucun — `contextualModules: undefined`)* | **Métriques** | `NEW/FUTURE` | Aucune implémentation. **Ne créer aucune fonctionnalité.** |
| — | **Simulateur de cadence** | `NEW/FUTURE` | Aucune implémentation. |

---

# PARTIE C — MATRICE CURRENT → TARGET (exhaustive)

Colonnes : **Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur**
Valeurs `Traitement` : `KEEP` · `RENAME` · `MOVE` · `REUSE` · `TRANSFORM` · `NEW/FUTURE` · `REMOVE`.

## C.1. Navigation principale Desktop

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Logo | Main menu | `<Link href="/cockpit">` KREDO | Logo → page Accueil (`/cockpit`) | KEEP | `DesktopSidebar.tsx` (Link `/cockpit`) | 6.4B |
| Cockpit | Main menu | « Cockpit », icône `cockpit`, `/cockpit` | « Accueil », icône Home, `/cockpit` | RENAME | `main-menu.config.ts` L177-182 | 6.4B |
| Agenda | Main menu | « Agenda », `/agenda` | « Agenda », `/agenda` | KEEP | `main-menu.config.ts` L183-187 | 6.4B |
| CRM | Main menu | Groupe CRM : Comptes & contacts, Opportunités, Engagements, Consultants | Groupe CRM : + Finance en 5ᵉ, ordre figé | MOVE (Finance entrante) | `main-menu.config.ts` L189-220 | 6.4B |
| Comptes & Contacts | Main menu | « Comptes & contacts », `/prospection/accounts` | « Comptes & Contacts », `/prospection/accounts` (audité, conservé) | RENAME | `main-menu.config.ts` L193-199 | 6.4B |
| Opportunités | Main menu | « Opportunités », `/missions/opps` | idem | KEEP | `main-menu.config.ts` L200-206 | 6.4B |
| Engagements | Main menu | « Engagements », `/missions` | idem | KEEP | `main-menu.config.ts` L207-212 | 6.4B |
| Consultants | Main menu | « Consultants », `/consultants` | idem | KEEP | `main-menu.config.ts` L213-218 | 6.4B |
| Finance | Main menu | Groupe autonome « Finance » → Finance `/finance` | Module du groupe **CRM**, `/finance` conservé | MOVE | `main-menu.config.ts` L253-264 | 6.4B |
| Groupe Finance | Main menu | Conteneur de groupe autonome | Supprimé (page conservée) | REMOVE | `main-menu.config.ts` L253-264 | 6.4B |
| Intelligence | Main menu | BI · Prospection · Rapports & Rédaction · Veille & Actualités | idem | KEEP | `main-menu.config.ts` L222-251 | 6.4B |
| Ressources | Main menu | *(déjà absent)* | Section supprimée | REMOVE (fait) | absent de `main-menu.config.ts` (Consultants Lot 14) | — |
| Outils | Main menu | Knowledge Hub · Automatisations | + Paramètres en dernier | MOVE (Paramètres entrant) | `main-menu.config.ts` L266-281 | 6.4B |
| Knowledge Hub | Main menu | `/knowledge` | idem | KEEP | `main-menu.config.ts` L271-275 | 6.4B |
| Automatisations | Main menu | `/automations` | idem | KEEP | `main-menu.config.ts` L276-280 | 6.4B |
| Paramètres | Main menu | Entrée racine « Paramètres », `/settings` | Dernier module du groupe **Outils**, `/settings` conservé | MOVE | `main-menu.config.ts` L283-288 | 6.4B |
| Bac à sable | Main menu | Bouton dédié dans `DesktopSidebar`, badge « Legacy » | Conservé, séparé, marqué LEGACY / suppression ultérieure | KEEP | `DesktopSidebar.tsx` L265-292 | lot dédié (hors Phase 6) |
| `SectionTab` / `getModuleTabs` / `getSectionTabsForPath` | Shell (technique) | Types + helpers présents, **0 entrée `tabs`** | Supprimés | REMOVE | `main-menu.config.ts` L12-18, L74-119 | 6.4A |

## C.2. Opportunités — `/missions/opps`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Opportunités | Chapitre | Synthèse (`synthese`) | Vue d'ensemble | RENAME | `opportunities-sections.ts` | 7.1 |
| Opportunités | Chapitre | Besoins & staffing (`besoins`) | Besoins & Staffing | KEEP | `opportunities-sections.ts` | 7.1 |
| Opportunités | Chapitre | Avant-vente (`avant-vente`) | Avant-vente Projets | RENAME | `opportunities-sections.ts` | 7.1 |
| Opportunités | Chapitre | Planning (`planning`) | Planning & Échéances | RENAME | `opportunities-sections.ts` | 7.1 |
| Opportunités | Module | Matching profil (`matching`) | Matching profils | RENAME | `opportunities-modules.ts` + `src/lib/staffing-matching/` | 7.1 |
| Opportunités | Module | Simulation devis (`simulation`) | Simulation financière | RENAME | `opportunities-modules.ts` + `@/features/financial-modeling` | 7.1 |
| Opportunités | Module | Post-Mortem (`post-mortem`) | Revue post-mortem | RENAME | `opportunities-modules.ts` + mission `post-mortem-commercial` | 7.1 |

## C.3. Engagements — `/missions`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Engagements | Chapitre | Synthèse (`synthese`) | Synthèse | KEEP | `EngagementsDesktopView.tsx` | 7.3 |
| Engagements | Chapitre | Missions AT (`missions-at`) | Missions AT | KEEP | `EngagementsDesktopView.tsx` | 7.3 |
| Engagements | Chapitre | Projets (`projets`) | Projets | KEEP | `EngagementsDesktopView.tsx` | 7.3 |
| Engagements | Chapitre | Activité & congés (`activite-conges`) | Rentabilité des engagements | TRANSFORM / MOVE / REUSE | `EngagementsDesktopView.tsx` + Finance `profitability` | 7.3 |
| Engagements | Chapitre | Planning des engagements (`planning-at`) | Planning & Échéances | RENAME | `EngagementsDesktopView.tsx` | 7.3 |
| Engagements | Module | — | Atlas du portefeuille | NEW/FUTURE | aucun module rail ; voisin `account_portfolio` (docs intelligence) | 7.3 |
| Engagements | Module | — | Production & Congés | REUSE | `src/features/consultants/modules/production-leave/` | 7.3 |
| Engagements | Module | — | Mission : analyse des marges | REUSE | `src/lib/intelligence/actions/` + `AnalyzeMarginsResult.tsx` (à reconfirmer) | 7.3 |

## C.4. Consultants — `/consultants`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Consultants | Chapitre | Synthèse (`synthese`) | Vue d'ensemble | RENAME | `consultants-sections.ts` | 7.2 |
| Consultants | Chapitre | Collaborateurs (`collaborateurs`) | Collaborateurs | KEEP | `consultants-sections.ts` | 7.2 |
| Consultants | Chapitre | Activités & congés (`activite-conges`) | Activité & Congés | KEEP | `consultants-sections.ts` | 7.2 |
| Consultants | Chapitre | Candidats (`candidats`) | Vivier Candidats | RENAME | `consultants-sections.ts` | 7.2 |
| Consultants | Chapitre | Pool de compétences (`pool-competences`) | — (sort des chapitres) | TRANSFORM | `consultants-sections.ts` + `src/features/consultants/skills/` | 7.2 |
| Consultants | Module | — | Pool de compétences | TRANSFORM | ex-chapitre `pool-competences` | 7.2 |
| Consultants | Module | Production & Congés (`production-conges`) | Production & Congés | KEEP | `consultants-sections.ts` `CONSULTANTS_CONTEXTUAL_MODULES` | 7.2 |
| Consultants | Module | Matching profil (`matching-profil`) | Matching Profil | KEEP | `consultants-sections.ts` + `modules/profile-matching/` | 7.2 |
| Consultants | Module | — | Mission : prévoir les disponibilités | NEW/FUTURE | aucune implémentation | 7.2 |

## C.5. Finance — `/finance`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Finance | Chapitre | Synthèse (`synthesis`) | Synthèse | KEEP | `FinanceLocalNavigation.tsx` | 7.3 |
| Finance | Chapitre | Rentabilité missions (`profitability`) | Rentabilité P&L | RENAME (+ contenu MOVE/REUSE vers Engagements) | `FinanceLocalNavigation.tsx` | 7.3 |
| Finance | Chapitre | Prévision & simulation (`forecast`) | Forecast | RENAME | `FinanceLocalNavigation.tsx` | 7.3 |
| Finance | Chapitre | — | Business Review | NEW/FUTURE | absent de `FINANCE_DESKTOP_CHAPTERS` | 7.3 |
| Finance | Module | — (`contextualModules: undefined`) | Simulation financière | REUSE | `@/features/financial-modeling` | 7.3 |
| Finance | Module | — | Atlas du portefeuille | NEW/FUTURE | idem C.3 | 7.3 |
| Finance | Module | — | Mission : analyse des marges | REUSE | idem C.3 (à reconfirmer) | 7.3 |

## C.6. Business Intelligence — `/intelligence`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Business Intelligence | Chapitre | Accueil (`home`) | Accueil | KEEP | `business-intelligence-chapters.ts` | 7.4 |
| Business Intelligence | Chapitre | Analyse sectorielle (`sector-analysis`) | Analyse sectorielle | KEEP | `business-intelligence-chapters.ts` | 7.4 |
| Business Intelligence | Chapitre | Environnement concurrentiel (`competitive-environment`) | Environnement concurrentiel | KEEP | `business-intelligence-chapters.ts` | 7.4 |
| Business Intelligence | Chapitre | Calendrier réglementaire (`regulatory-calendar`) | Calendrier Réglementaire | RENAME | `business-intelligence-chapters.ts` | 7.4 |
| Business Intelligence | Chapitre | Chaîne de valeur (`value-chain`) | Chaîne de Valeur | RENAME | `business-intelligence-chapters.ts` | 7.4 |
| Business Intelligence | Chapitre | Actualités sectorielles (`sector-news`) | Actualité sectorielle | RENAME | `business-intelligence-chapters.ts` | 7.4 |
| Business Intelligence | Module | Études sectorielles (`studies`) | Études sectorielles | KEEP | `BusinessIntelligenceLocalNavigation.tsx` | 7.4 |
| Business Intelligence | Module | Playbooks (`playbooks`) | Playbooks | KEEP | `BusinessIntelligenceLocalNavigation.tsx` | 7.4 |
| Business Intelligence | Module | — | Bibliothèque | NEW/FUTURE | absent du rail BI | 7.4 |

## C.7. Prospection — `/prospection-intelligence`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Prospection | Chapitre | Brief (`strategy`) | Brief | KEEP | `ProspectionIntelligenceLocalNavigation.tsx` | 7.5 |
| Prospection | Chapitre | Approches commerciales (`chapter_2`) | Angles d'approche | RENAME | `ProspectionIntelligenceLocalNavigation.tsx` | 7.5 |
| Prospection | Chapitre | — | Activité | NEW/FUTURE | absent de `PROSPECTION_DESKTOP_CHAPTERS` | 7.5 |
| Prospection | Chapitre | Fenêtres d'opportunités (`chapter_1`) | — | REMOVE | `ProspectionIntelligenceLocalNavigation.tsx` | 7.5 |
| Prospection | Chapitre | Playbooks (`chapter_3`) | — (sort des chapitres) | TRANSFORM | `ProspectionIntelligenceLocalNavigation.tsx` | 7.5 |
| Prospection | Module | — (`contextualModules: undefined`) | Campagne | NEW/FUTURE | aucune implémentation | 7.5 |
| Prospection | Module | — | Métriques Activité | NEW/FUTURE | aucune implémentation | 7.5 |
| Prospection | Module | Playbooks (`chapter_3`) | Playbook | TRANSFORM | ex-chapitre `chapter_3` | 7.5 |

## C.8. Rapports & Rédaction — `/reports`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Rapports & Rédaction | Chapitre | Bibliothèque (`documents`) | Bibliothèque | KEEP | `ReportsLocalNavigation.tsx` | 7.6 |
| Rapports & Rédaction | Chapitre | Connaissances (`knowledge`) | Connaissance | RENAME | `ReportsLocalNavigation.tsx` | 7.6 |
| Rapports & Rédaction | Chapitre | Génération (`generation`) | Génération | KEEP | `ReportsLocalNavigation.tsx` | 7.6 |
| Rapports & Rédaction | Module | Gestion de la connaissance (`knowledge-management`) | Gestion de la connaissance | KEEP | `ReportsLocalNavigation.tsx` | 7.6 |
| Rapports & Rédaction | Module | — | Analyse transverse | NEW/FUTURE | aucune capacité réelle | 7.6 |

## C.9. Veille & Actualités — `/veille`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Veille & Actualités | Chapitre | Actualités (`news`) | Actualités thématiques | RENAME | `VeilleLocalNavigation.tsx` | 7.7 |
| Veille & Actualités | Chapitre | Veille ciblée (`watched-accounts`) | Veille Ciblée | KEEP | `VeilleLocalNavigation.tsx` | 7.7 |
| Veille & Actualités | Chapitre | Analyses (`strategic-analysis`) | Analyses | KEEP | `VeilleLocalNavigation.tsx` | 7.7 |
| Veille & Actualités | Chapitre | Archives (`history`) | Archives | KEEP | `VeilleLocalNavigation.tsx` | 7.7 |
| Veille & Actualités | Module | Gestion des sources (`source-management`) | Gestion des sources | KEEP | `VeilleLocalNavigation.tsx` | 7.7 |
| Veille & Actualités | Module | — | Gestion de la connaissance | REUSE | composant Rapports `knowledge-management` (ne pas dupliquer) | 7.7 |
| Veille & Actualités | Module | — | Analyse transverse | NEW/FUTURE | aucune capacité réelle | 7.7 |
| Veille & Actualités | Module | — | Mission : analyse de la veille | NEW/FUTURE | aucune implémentation | 7.7 |

## C.10. Knowledge Hub — `/knowledge`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Knowledge Hub | Chapitre (domaine) | Clients & Marchés (`clients-markets`) | Clients & Marchés | KEEP | `knowledge-hub-shell-data.ts` | 7.8 |
| Knowledge Hub | Chapitre (domaine) | Expertise KREDO (`expertise-kredo`) | Expertises KREDO | RENAME | `knowledge-hub-shell-data.ts` | 7.8 |
| Knowledge Hub | Chapitre (domaine) | Talents (`talents`) | Talents | KEEP | `knowledge-hub-shell-data.ts` | 7.8 |
| Knowledge Hub | Chapitre (domaine) | Delivery & REX (`delivery-feedback`) | Delivery & REX | KEEP | `knowledge-hub-shell-data.ts` | 7.8 |
| Knowledge Hub | Chapitre (domaine) | AO & Propositions (`ao-proposals`) | AO & Propositions | KEEP | `knowledge-hub-shell-data.ts` | 7.8 |
| Knowledge Hub | Chapitre (domaine) | Ressources internes (`internal-resources`) | Ressources admin | RENAME | `knowledge-hub-shell-data.ts` | 7.8 |
| Knowledge Hub | Module | Ateliers (`workshops`) | Ateliers | KEEP | `KnowledgeHubModuleModal.tsx` | 7.8 |
| Knowledge Hub | Module | RAG (« Interroger le Corpus ») | RAG | KEEP | `KnowledgeHubModuleModal.tsx` | 7.8 |

## C.11. Automatisations — `/automations`

| Workspace | Niveau | Current | Target | Traitement | Preuve code | Lot futur |
|---|---|---|---|---|---|---|
| Automatisations | Chapitre | Journal d'exécution (`journal`) | Journal d'exécution | KEEP | `AutomationsLocalNavigation.tsx` | 7.9 |
| Automatisations | Chapitre | Santé des workflows (`sante`) | Fiabilité des workflows | RENAME | `AutomationsLocalNavigation.tsx` | 7.9 |
| Automatisations | Chapitre | Coûts (`couts`) | Coûts | KEEP | `AutomationsLocalNavigation.tsx` | 7.9 |
| Automatisations | Module | — (`contextualModules: undefined`) | Métriques | NEW/FUTURE | aucune implémentation | 7.9 |
| Automatisations | Module | — | Simulateur de cadence | NEW/FUTURE | aucune implémentation | 7.9 |

---

# PARTIE D — DÉCISIONS FIGÉES

| Réf. | Décision |
|---|---|
| **NAV-TARGET-01** | La nouvelle architecture du **2026-09-09** est la **cible canonique** de navigation. Toute divergence d'un ADR / audit / ledger antérieur se résout en faveur de ce document. |
| **NAV-TARGET-02** | Les **pathnames existants sont conservés** sauf migration explicitement décidée. Défauts stables : Accueil → `/cockpit` · Opportunités → `/missions/opps` · Engagements → `/missions` · Consultants → `/consultants` · Finance → `/finance`. Comptes & Contacts : contrat actuel `/prospection/accounts` **audité et conservé** — **ne pas créer `/crm`**. |
| **NAV-TARGET-03** | Le menu Desktop final contient **uniquement** : **Accueil, Agenda, CRM, Intelligence, Outils** + **Bac à sable** legacy séparé. Pas de groupe « Finance » autonome, pas de groupe « Ressources », pas d'entrée racine « Paramètres ». |
| **NAV-TARGET-04** | **Finance** devient un **module du groupe CRM**, **sans changement de pathname** (`/finance`). |
| **NAV-TARGET-05** | **Paramètres** devient le **dernier module du groupe Outils**, sans changement de pathname (`/settings`). |
| **NAV-TARGET-06** | **Chapitre** et **Module** sont deux niveaux fonctionnels **distincts** (cf. Partie B). Un changement de menu global = Shell ; un changement chapitre/module = workspace. |
| **NAV-TARGET-07** | Une **capacité cible absente du code** est marquée **`NEW/FUTURE`** et **n'est jamais matérialisée par un bouton mort**. Elle n'apparaît dans l'UI qu'à son lot d'implémentation réel. Concernés à date : *Mission : prévoir les disponibilités*, *Analyse transverse*, *Mission : analyse de la veille*, *Simulateur de cadence*, *Métriques* (Automatisations), *Campagne*, *Métriques Activité*, *Bibliothèque* (BI), *Business Review* (Finance), *Activité* (Prospection), *Atlas du portefeuille*. |
| **NAV-TARGET-08** | Les **transformations internes** des workspaces sont **reportées en Phase 7**. La Phase 6 ne touche que le Shell (6.4A technique, 6.4B menu principal). |
| **NAV-TARGET-09** | **Opportunities Lot 12** et **Consultants Lot 15** (nettoyage / clôture) sont **différés** jusqu'après leur alignement cible respectif (Phase 7.1 et 7.2) : `DEFERRED UNTIL TARGET-ALIGNMENT`. Motif : des composants aujourd'hui considérés legacy peuvent être **réutilisés ou transformés** par la cible — aucune suppression prématurée. |
| **NAV-TARGET-10** | **Label ≠ pathname.** Une évolution du nom produit ou du libellé de navigation **ne provoque pas** automatiquement une migration de route. |

---

# PARTIE E — ROADMAP RÉVISÉE

## E.1. Phase 6 — Shell global (révisée)

| Lot | Objet | Nature | Dépend de |
|---|---|---|---|
| **6.3R** | Rebaseline architecture cible finale (**ce document**) | Documentaire | 6.2, 6.3 |
| **6.4A** | Démantèlement navigation horizontale **legacy** | **Technique** — SUPPRIMÉS : `SectionNavBarSlot`, `SectionNavBar`, `SectionTab` de `main-menu.config`, `MainMenuItem.tabs`, `getModuleTabs`, `getSectionTabsForPath`, `breadcrumb.addTabs`. CONSERVÉS (tabs de fiches entités, sans rapport) : `SectionTabBar`, `section-tab-styles.ts`, `src/lib/tabs/*`, `SectionTab` de `@/lib/tabs/tab-types`, `CrmSectionTabBar` / `StaffingSectionTabBar` | 6.1 + 6.2 + 6.3 (0 consommateur) |
| **6.4B** | Alignement **navigation principale Desktop** | **Produit** — applique NAV-TARGET-03/04/05 : Accueil, Agenda, CRM (+ Finance), Intelligence, Outils (+ Paramètres), Bac à sable séparé | 6.3R |
| **6.5** | Stabilisation `DesktopSidebar` / collapse — réduction de `useSidebarCollapse` à ses émetteurs légitimes, auto-repli Shell | Technique | 6.4A |
| **6.6** | Intégration Shell global ↔ Cockpit Intelligence | Technique | 6.5 |
| **6.7** | Audit de clôture Phase 6 | Documentaire | tous |

> **6.4A et 6.4B ne sont jamais mélangés.** 6.4A est un refactor technique sans décision
> produit ; 6.4B applique la taxonomie de menu de ce document.

> **Phase 6 — ✅ CLOSED (2026-09-09).** Preuve de conformité technique :
> `10-PHASE-6-CLOSURE-AUDIT-2026-09-09.md`. Les invariants Shell (menu principal, ownership du
> collapse, `SectionRail` local, contrats URL, Cockpit Intelligence global, Mobile distinct) sont
> désormais **figés** : la Phase 7 ne les rouvre pas.

## E.2. Phase 7 — Alignement fonctionnel des workspaces (nouvelle)

| Lot | Objet |
|---|---|
| **7.0** | Audit global CURRENT → TARGET (revalidation de la Partie C contre `origin/main`) |
| **7.1** | Opportunités (chapitres + modules — Partie B.1 / C.2) — **puis** Opportunities Lot 12 (nettoyage & clôture) |
| **7.2** | Consultants (chapitres + `pool-competences` chapitre → module — Partie B.3 / C.4) — **puis** Consultants Lot 15 (nettoyage & clôture) |
| **7.3** | **Engagements + Finance** (lot **coordonné**) |
| **7.4** | Business Intelligence |
| **7.5** | Prospection |
| **7.6** | Rapports & Rédaction |
| **7.7** | Veille & Actualités |
| **7.8** | Knowledge Hub |
| **7.9** | Automatisations |
| **7.10** | Audit final architecture interne |

### Pourquoi Engagements + Finance dans un seul lot (7.3)

Le déplacement de la **rentabilité des missions** (Finance → chapitre « Rentabilité des
engagements » d'Engagements, cf. B.2 / B.4) impose un **lot coordonné**, pour éviter :

- une **duplication Data** (deux lectures divergentes des mêmes CRA / `pnl_monthly`) ;
- une **duplication de calcul de marge** (un seul moteur, `missions.gross_margin_pct` /
  `v_collaborator_activity_summary` restent la source) ;
- une **duplication UI** (un seul composant de rentabilité, monté à deux endroits au plus).

Sortie attendue de 7.3 : **une seule source de vérité**, la page Finance conservant Synthèse /
Rentabilité P&L / Forecast / Business Review, Engagements récupérant la lecture « engagements ».

---

# PARTIE F — SUSPENSION DES NETTOYAGES OPPORTUNITIES / CONSULTANTS

Les Lots ne sont **pas annulés** ; leur **statut de prochaine exécution** change.

| Chantier | Lot | Ancien statut | Nouveau statut |
|---|---|---|---|
| Opportunities Workspace | **Lot 12 — Nettoyage et clôture** | « Prochain lot » | **DEFERRED UNTIL TARGET-ALIGNMENT** — exécuté **après Phase 7.1 Opportunités** |
| Consultants Workspace | **Lot 15 — Nettoyage et clôture** | « Prochain lot » | **DEFERRED UNTIL TARGET-ALIGNMENT** — exécuté **après Phase 7.2 Consultants** |

**Motif :** des composants actuellement classés legacy (ex. `OpportunitiesDesktopView.tsx`,
`src/components/staffing/`, `src/components/needs-staffing/`, dashboards recrutement orphelins,
routes `(tabbed)` résiduelles) **pourraient être réutilisés ou transformés** par la cible
interne. Toute suppression avant l'alignement Phase 7 est prématurée.

Le **NEXT LOT** de SHELL-0018 reste **SHELL 6.4A — Démantèlement navigation horizontale
legacy**, et **non** Opportunities Lot 12 ni Consultants Lot 15.

---

# PARTIE G — INVARIANTS PRÉSERVÉS

1. **Contrats URL stabilisés** — aucune refonte : `?section=`, `?tab=`, `?vue=`, `?aiSection=`,
   `?domain=`, `?opp=`, `?module=`, `?run=`, `?segment=`, compat `?scope=` au parsing.
2. **Primitive `SectionRail`** — inchangée (`w-[11.5rem]`, chapeau navy, séparation
   Chapitres / Modules) — `01-ADR-0018-*` et `02-SECONDARY-RAIL-STANDARD.md` font toujours loi.
3. **Cockpit Intelligence** — les actions transverses restent hors des rails secondaires.
4. **Mobile** — aucune régression ; jamais de composant Desktop lourd chargé pour être masqué.
5. **Aucune configuration de navigation en base** — tout reste en TypeScript.
6. **Historique intact** — aucun document livré n'est réécrit ; les anciennes cibles sont
   supersédées, jamais supprimées.
