# HANDOFF — KREDO / SHELL-0018 V2
## Refonte navigation Desktop — Phase 4 close → reprise en Phase 6

> **Date du handoff :** 2026-09-08  
> **Dépôt :** `guillaumekachanine-dev/kredo_sales_app`  
> **Branche de travail exclusive :** `main`  
> **SHA de référence :** `43d5dd95f3f2a90176f4ec1f47b90fd1456bb19f`  
> **Statut :** Phase 4 techniquement close — reprise attendue en Phase 6

---

# 1. Contexte de reprise

Tu reprends un chantier en cours sur l’application **KREDO**.

Dépôt :

```text
https://github.com/guillaumekachanine-dev/kredo_sales_app
```

Répertoire local principal :

```text
/Users/dosta/Desktop/Projets-Dev/KREDO/kredo
```

Branche de travail exclusive :

```text
main
```

État Git de référence au moment du handoff :

```text
origin/main
43d5dd95f3f2a90176f4ec1f47b90fd1456bb19f

43d5dd95 docs(shell-0018): audit and close navigation URL phase
```

La **Phase 4 du chantier SHELL-0018 V2 est officiellement close techniquement**.

Le prochain chantier à préparer est :

```text
Phase 6 — Refonte du Shell global Desktop
```

Ne démarre pas directement des suppressions de composants legacy. Le prochain lot recommandé est :

```text
SHELL-0018 — Lot 6.0
Audit d’entrée et architecture cible du Shell global Desktop
```

---

# 2. Rôle attendu

Agir comme **Lead Développeur Full-Stack / Architecte Logiciel Senior**.

Réponses attendues :

```text
concises
structurées
orientées architecture/composants
production-ready
```

Lorsqu’un lot de développement est demandé, produire un **prompt Codex/Gemini prêt à copier-coller**, suffisamment précis pour que l’agent travaille de manière autonome sans redemander le contexte.

Pour une nouvelle fonctionnalité métier, raisonner selon :

```text
1. Data
2. Desktop
3. Mobile
```

Pour SHELL-0018, le sujet est principalement Front/Shell : ne créer aucune migration Data, Supabase ou n8n sans nécessité métier distincte.

---

# 3. Stack réelle du dépôt

Toujours commencer par lire :

```text
CLAUDE.md
AGENTS.md
```

Ils priment sur les anciens cadrages génériques.

État courant observé du dépôt :

```text
Next.js 16.2.7
React 19.2.4
App Router
Tailwind CSS v4
Supabase / PostgreSQL
n8n externe sur VPS pour l'asynchrone
Vercel pour le Front/API serverless
```

Le projet initial parlait de Next.js 15, mais **ne pas rétrograder ni changer la stack réelle du repo**.

Règles importantes de `AGENTS.md` / `CLAUDE.md` :

```text
- pas de shadcn/ui
- pas de Radix
- pas de Recharts
- pas de Chart.js
- pas de Tremor
- composants/SVG custom lorsque nécessaire
- pas de HEX JSX sauvages
- respecter Tailwind v4 / variables du design system
- jamais exposer le service role Supabase
```

Commandes usuelles :

```bash
npm run typecheck
npm run lint
npm test
npm run check:server-boundary
npm run build
```

---

# 4. Règle Git impérative

Guillaume a explicitement imposé :

```text
Je ne veux travailler que sur la branche principale.
```

Donc :

```text
- travailler exclusivement sur main
- ne créer aucune feature branch
- ne pas proposer de branche
- git fetch origin avant chaque lot
- synchroniser main avec origin/main
- préserver tout travail parallèle
- aucun reset destructif
- aucun force push
- push obligatoire à la fin de chaque lot
```

Début de lot type :

```bash
git fetch origin
git status
git log -n 6 --oneline
```

Si `origin/main` a avancé :

```text
intégrer proprement le travail parallèle avant de poursuivre
```

Un lot n’est pas considéré opérationnellement terminé avant :

```bash
git push origin main
```

---

# 5. Règle QA — impérative et récente

Ne pas reprendre les anciennes procédures de QA navigateur présentes historiquement dans certains documents.

Guillaume a explicitement décidé :

```text
L'agent exécute le chantier.
Guillaume et uniquement Guillaume effectue la QA visuelle.
```

Donc l’agent ne doit plus lancer :

```text
agent-browser
Playwright
navigateur
screenshots
smoke UI
QA responsive
validation visuelle
```

Ne pas demander de renouvellement de :

```text
.codex/auth-state.json
```

Ne jamais bloquer un lot parce que la QA visuelle n’a pas été réalisée.

Le lot est techniquement livrable lorsque :

```text
code compile
tests nécessaires passent
server-boundary passe
lint ciblé passe
build passe si nécessaire
aucune régression technique connue
```

Dans la documentation :

```text
QA visuelle : réservée à Guillaume
```

Ne jamais écrire que la QA visuelle est passée si elle n’a pas eu lieu.

Certaines anciennes sections du ledger mentionnent historiquement des smokes bloqués ; ce sont des éléments d’historique, **pas des gates actuelles**.

---

# 6. Chantier SHELL-0018 V2 — intention

Objectif général :

```text
standardiser et simplifier le Shell Desktop KREDO
```

Les pages Desktop utilisent désormais une navigation secondaire verticale canonique fondée sur :

```text
SectionRail
```

Principes structurants :

```text
- largeur canonique : 11.5rem / 184px
- chapeau navy en haut
- texte chapeau blanc, gras, centré
- chapeau = titre principal de la page
- header principal = nom exact du chapitre actif
- section "Chapitres"
- section "Modules" uniquement lorsqu'un module contextuel réellement disponible existe
- actions transverses hors du rail
- navigation active reconstructible depuis l'URL
- SectionRail reste présentationnel et client-safe
- aucun stockage de config navigation dans Supabase
```

Ne jamais remettre des actions transverses dans le rail secondaire.

Toujours utiliser le terme générique :

```text
actions transverses
```

pour les fonctionnalités centralisées ailleurs.

---

# 7. Contrat canonique `SectionRail`

Fichier :

```text
src/lib/navigation/section-rail.ts
```

Contrat conceptuel :

```ts
export type SectionRailAction =
  | { href: string; onSelect?: never }
  | { href?: never; onSelect: () => void }

export type SectionRailEntry = SectionRailAction & {
  key: string
  label: string
  icon?: ReactNode
  active?: boolean
  title?: string
}

export type SectionRailProps = {
  ariaLabel: string
  title: string
  home: SectionRailAction
  chapters: readonly SectionRailEntry[]
  contextualModules?: readonly SectionRailEntry[]
  className?: string
}
```

Primitive :

```text
src/components/layout/SectionRail.tsx
```

Invariants :

```text
- w-[11.5rem]
- Next Link pour href
- button pour callback
- aria-current="page"
- line-clamp-2
- Modules facultatifs
- Modules ancrés en bas avec mt-auto
- aucune logique métier
- aucune logique transverse
- aucun Supabase
- aucun n8n
```

---

# 8. Phases déjà réalisées

## Phase 1 — socle

Création :

```text
src/lib/navigation/section-rail.ts
src/components/layout/SectionRail.tsx
src/components/layout/SectionRail.test.ts
```

La primitive commune est désormais la base des rails Desktop.

## Phase 2 — migrations des pages

Ont été migrés vers le châssis `SectionRail` :

```text
2.1 Account Intelligence
2.2 Business Intelligence
2.3 Veille
2.4 Rapports
2.5 Automatisations
2.6 Engagements
2.7 Prospection Intelligence
2.8 Knowledge Hub
```

Finance a été traitée dans :

```text
5.1 Finance
```

avec suppression de ses anciens tabs horizontaux internes.

## Phase 3 — Modules contextuels

Lot :

```text
3.1 Standardisation des modules contextuels
```

Document canonique :

```text
docs/navigation_architecture/SHELL-0018/05-CONTEXTUAL-MODULES-MATRIX.md
```

Règle :

```text
Modules = capacités réellement disponibles et contextuelles à la page.
```

Sinon :

```ts
contextualModules: undefined
```

Pas de bouton mort. Pas de placeholder trompeur. Les actions transverses sont hors du rail et relèvent du dispositif Cockpit Intelligence.

---

# 9. Phase 4 — CLOSED

Document de preuve canonique :

```text
docs/navigation_architecture/SHELL-0018/06-PHASE-4-CLOSURE-AUDIT-2026-09-08.md
```

Résultat :

```text
Phase 4 — CLOSED
Surfaces auditées : 9/9
Gaps Phase 4 : 0
```

Aucune navigation secondaire Desktop prévue par SHELL-0018 ne repose encore exclusivement sur un `useState` éphémère.

Toutes sont reconstructibles depuis l’URL.

---

# 10. Matrice finale des 9 surfaces

## 10.1 Engagements

Route :

```text
/missions
```

Navigation :

```text
?vue=
```

Chapitres :

```text
synthese
missions-at
projets
activite-conges
planning-at
```

Root :

```text
synthese
```

`SectionRail` intégré directement dans `EngagementsDesktopView`.

## 10.2 Business Intelligence

Route :

```text
/intelligence
```

Contrat :

```text
?segment=
?tab=
```

6 chapitres.

Root :

```text
home
```

Navigation déjà URL-driven. Ne casser ni la persistence du segment ni le contrat `tab`.

## 10.3 Account Intelligence

Route directe :

```text
/prospection/accounts/[companyId]
```

Contrat :

```text
?aiSection=
```

7 chapitres :

```text
accueil
socle
connaissance
secteur
enjeux
strategie
roadmap
```

Root :

```text
accueil
```

Root canonique sans `aiSection`.

Point architectural important : Account Intelligence peut également être monté dans :

```text
CrmTabbedShell
```

Plusieurs panneaux entreprises restent simultanément montés.

Le Lot 4.2 a introduit une gestion embedded permettant :

```text
Compte A → Secteur
Compte B → Enjeux
retour A → Secteur
```

sans collision.

Ne simplifier jamais cette logique en faisant lire aveuglément le même `aiSection` à tous les panneaux montés.

En route directe :

```text
router.push
URL = source unique de vérité
```

En mode CRM embedded, une mémoire locale par panneau est autorisée comme exception documentée, puis restaurée dans l’URL lors de la réactivation.

## 10.4 Veille & actualités

Route :

```text
/veille
```

Contrat :

```text
?section=
```

Chapitres :

```text
news
watched-accounts
strategic-analysis
history
```

Root :

```text
news
```

Root canonique :

```text
/veille
```

sans `section`.

## 10.5 Rapports & rédaction

Route :

```text
/reports
```

Contrat chapitre :

```text
?section=
```

Chapitres :

```text
documents
knowledge
generation
```

Root :

```text
documents
```

Root canonique sans `section`.

La page possède d’autres paramètres métier : filtres, pagination et document sélectionné. Ils doivent toujours être préservés.

Point important :

```text
navigation chapitre → router.push
filtres/pagination/doc → comportement router.replace existant
```

Ne pas mélanger ces responsabilités.

## 10.6 Automatisations

Route :

```text
/automations
```

Contrat chapitre :

```text
?section=
```

Chapitres :

```text
journal
sante
couts
```

Root :

```text
journal
```

Root canonique sans `section`.

Contrat métier parallèle :

```text
?run=<id>
```

`run` et `section` sont strictement orthogonaux.

Exemple valide :

```text
/automations?run=abc&section=sante
```

Ne casser ni le drill-down run, ni le realtime.

## 10.7 Prospection Intelligence

Route :

```text
/prospection-intelligence
```

Contrat :

```text
?section=
```

Chapitres :

```text
strategy
chapter_1
chapter_2
chapter_3
```

Labels :

```text
Brief
Fenêtres d'opportunités
Approches commerciales
Playbooks
```

Root :

```text
strategy
```

Root canonique sans `section`.

Les états métier restent volontairement locaux :

```text
period
selectedSector
searchQuery
selectedAccountId
isAccountsOpen
```

Route historique :

```text
/prospection
```

Elle a son propre comportement de redirection historique et ne doit pas être confondue avec `/prospection-intelligence`.

## 10.8 Knowledge Hub

Route :

```text
/knowledge
```

Navigation hiérarchique :

```text
Racine
→ Domaine
→ Section
```

Contrat :

```text
?domain=
?section=
```

Root :

```text
/knowledge
→ Catégories
```

Domaines actuels :

```text
clients-markets
expertise-kredo
talents
delivery-feedback
ao-proposals
internal-resources
```

Sections par défaut :

```text
expertise-kredo → practices
talents         → team
```

Expertise KREDO :

```text
practices
jobs
skills
techs
```

Talents :

```text
team
alumni
candidates
skills
```

Les autres domaines utilisent actuellement des IDs :

```text
section-0
section-1
...
```

Ne pas les renommer opportunément.

Le module contextuel disponible :

```text
Ateliers
```

reste piloté par un état modal local. L’état modal n’est pas URLisé et n’a pas à l’être.

## 10.9 Finance

Route :

```text
/finance
```

Contrat :

```text
?tab=
```

Chapitres :

```text
synthesis
profitability
forecast
```

Root :

```text
synthesis
```

Root canonique sans paramètre.

La navigation horizontale interne `FinanceTabs` a été remplacée par :

```text
FinanceLocalNavigation
SectionRail
```

Le rail analytique de droite de Finance est un autre composant et ne doit pas être confondu avec le rail de navigation secondaire.

---

# 11. Commits importants Phase 4

```text
001a9e29 refactor(shell-0018): urlize Veille navigation
5b1c8161 docs(shell-0018): close Veille URL lot

844777ea refactor(shell-0018): urlize Account Intelligence navigation
a6697f47 docs(shell-0018): close Account Intelligence URL lot

ab26119f refactor(shell-0018): urlize Reports navigation
0f595144 docs(shell-0018): close Reports URL lot

4f490e0b refactor(shell-0018): urlize Automations navigation
77623f18 docs(shell-0018): close Automations URL lot

a6ef6ea2 refactor(shell-0018): urlize Prospection navigation
612b0d16 docs(shell-0018): close Prospection URL lot

e9064fcb refactor(shell-0018): urlize Knowledge Hub navigation
918f55d9 docs(shell-0018): close Knowledge Hub URL lot

43d5dd95 docs(shell-0018): audit and close navigation URL phase
```

Finance :

```text
dc87b572 refactor finance / SectionRail + URL
70b57db4 documentation associée
```

---

# 12. Documents SHELL-0018 canoniques

Dossier :

```text
docs/navigation_architecture/SHELL-0018/
```

À lire avant Phase 6 :

```text
README.md
00-CURRENT-STATE-AUDIT-2026-09-07.md
01-ADR-0018-SHELL-NAVIGATION-V2.md
02-SECONDARY-RAIL-STANDARD.md
03-IMPLEMENTATION-LEDGER.md
04-CURRENT-NAVIGATION-INVENTORY.md
05-CONTEXTUAL-MODULES-MATRIX.md
06-PHASE-4-CLOSURE-AUDIT-2026-09-08.md
07-HANDOFF-PHASE-6-REPRISE-CHANTIER.md
```

Les plus importants pour reprendre immédiatement :

```text
03-IMPLEMENTATION-LEDGER.md
04-CURRENT-NAVIGATION-INVENTORY.md
06-PHASE-4-CLOSURE-AUDIT-2026-09-08.md
07-HANDOFF-PHASE-6-REPRISE-CHANTIER.md
```

---

# 13. Situation exacte en entrée de Phase 6

Le Shell secondaire V2 est stabilisé.

Plusieurs mécanismes globaux legacy restent présents et ont été volontairement exclus de Phase 4.

## 13.1 Legacy n°1 — `SectionNavBarSlot`

Composant :

```text
src/components/layout/SectionNavBarSlot.tsx
```

Six layouts le montent encore.

### Consommateurs réels

```text
src/app/(app)/missions/(tabbed)/layout.tsx
src/app/(app)/consultants/layout.tsx
```

Ils utilisent encore réellement la barre horizontale legacy.

### No-ops runtime

Ces layouts montent encore `SectionNavBarSlot`, mais la barre retourne actuellement `null` faute de tabs correspondants :

```text
src/app/(app)/automations/layout.tsx
src/app/(app)/knowledge/layout.tsx
src/app/(app)/finance/layout.tsx
src/app/(app)/prospection/layout.tsx
```

Ces quatre imports sont des candidats naturels à un nettoyage ultérieur, mais **ne pas les supprimer sans vérifier le code courant au début du lot**.

## 13.2 Legacy n°2 — `SectionNavBar`

Composant horizontal historique.

Aujourd’hui :

```text
SectionNavBar
← utilisé via SectionNavBarSlot
```

Il dépend encore de la configuration historique des tabs dans :

```text
main-menu.config.ts
```

Il ne pourra être supprimé proprement qu’après traitement des deux consommateurs réels :

```text
missions/(tabbed)
consultants
```

Ne pas commencer par supprimer le composant central.

## 13.3 Legacy n°3 — `useSidebarCollapse`

Neuf consommateurs documentés à la clôture Phase 4 :

```text
DesktopSidebar.tsx
ReportsDesktopView.tsx
CrmTabbedShell.tsx
BusinessIntelligenceDesktop.tsx
KnowledgeHubDesktop.tsx
VeilleActualitesDesktop.tsx
EngagementsDesktopView.tsx
ProspectionIntelligenceDesktop.tsx
IntelligencePanel.tsx
```

Rôle actuel :

```text
demander le repli de la sidebar globale
lors du montage de certaines pages Desktop denses
```

Ne pas supprimer ce store sans avoir arbitré l’architecture cible du Shell global.

Questions Phase 6 :

```text
- sidebar globale fixe ?
- sidebar compacte ?
- push ?
- overlay ?
- largeur réservée ?
- qui contrôle le collapse ?
- le comportement doit-il encore être demandé page par page ?
```

Le but de Phase 6 devrait être de supprimer progressivement le besoin pour les pages métier de piloter directement la sidebar globale.

## 13.4 Legacy n°4 — layouts historiques

Deux zones demandent un vrai travail de migration.

### A. Missions historiques

```text
src/app/(app)/missions/(tabbed)/layout.tsx
```

Il reste un ancien arbre de sous-routes utilisant `SectionNavBarSlot`.

En parallèle, la nouvelle page :

```text
/missions
```

possède déjà son Shell Engagements V2 piloté par :

```text
?vue=
```

Phase 6 devra déterminer comment :

```text
unifier les anciennes sous-routes
avec le nouveau shell /missions?vue=...
```

sans casser les liens existants.

### B. Consultants / Équipe

```text
src/app/(app)/consultants/layout.tsx
```

C’est actuellement un consommateur **réel et critique** de `SectionNavBarSlot`.

Contrairement aux quatre no-ops, on ne peut pas simplement supprimer son rail horizontal.

Il faudra d’abord :

```text
auditer l'arborescence Équipe
identifier les tabs actuels
définir le contrat URL cible
déterminer s'il faut un SectionRail V2
migrer les vues
puis supprimer SectionNavBarSlot
```

Ce sera probablement un sous-lot dédié.

---

# 14. Cockpit Intelligence — travail parallèle à préserver

Du travail conséquent a été développé en parallèle sur **Cockpit Intelligence**.

Ne pas l’écraser pendant SHELL-0018.

Cockpit Intelligence centralise progressivement les **actions transverses** hors des rails secondaires.

Conséquence architecturale :

```text
Phase 6 doit intégrer le Cockpit Intelligence comme élément du Shell global,
pas recréer des actions transverses dans chaque rail.
```

Toujours inspecter le code réel avant d’intervenir car ce chantier peut continuer à évoluer en parallèle.

---

# 15. Ce qui est stabilisé et ne doit pas être refait en Phase 6

Ne pas rouvrir sans raison :

```text
SectionRail
largeur 184px
chapeau navy
séparation Chapitres / Modules
URLisation des 9 surfaces
contrats ?section / ?tab / ?vue / ?aiSection / ?domain
modules contextuels Lot 3.1
headers des chapitres
```

Phase 6 doit travailler **autour** de ce socle.

Objectif :

```text
simplifier le châssis global
```

et non refaire tous les rails locaux.

---

# 16. Ce qui est hors périmètre du Shell

Ne pas profiter du chantier pour modifier :

```text
Supabase
RLS
RPC
pgvector
n8n
workflows métier
scraping
LLM
modèles financiers
CRM métier
logique Reports
monitoring Automations
Knowledge content
Business Intelligence métier
```

sauf nécessité directement prouvée.

---

# 17. Prochain lot recommandé

Le prochain lot devrait être :

```text
SHELL-0018 — Lot 6.0
Audit d'entrée & architecture cible du Shell global
```

Ce lot devrait idéalement être **audit + cadrage**, avec très peu ou aucun code applicatif.

Objectifs :

```text
1. Revalider le HEAD de main.
2. Cartographier le Shell global Desktop réel.
3. Cartographier DesktopSidebar.
4. Cartographier SectionNavBar / SectionNavBarSlot.
5. Cartographier les 6 layouts consommateurs.
6. Distinguer les 4 no-ops des 2 consommateurs réels.
7. Auditer les 9 usages useSidebarCollapse.
8. Auditer CrmTabbedShell et IntelligencePanel.
9. Auditer l'intégration Cockpit Intelligence.
10. Définir l'architecture cible.
11. Définir l'ordre de démantèlement.
12. Produire les lots Phase 6.
```

Ne pas faire de suppression importante avant cette cartographie.

---

# 18. Ordre de Phase 6 pressenti

À confirmer par audit du code courant.

```text
6.0 — Audit Shell global + architecture cible

6.1 — Suppression des SectionNavBarSlot no-op
      automations / knowledge / finance / prospection

6.2 — Migration du module Consultants / Équipe
      vers le contrat de navigation V2

6.3 — Rationalisation des routes Missions historiques
      et suppression du SectionNavBarSlot missions/(tabbed)

6.4 — Suppression SectionNavBarSlot + SectionNavBar
      + nettoyage main-menu.config associé

6.5 — Refonte / suppression progressive de useSidebarCollapse
      et stabilisation du comportement DesktopSidebar

6.6 — Intégration finale Shell global ↔ Cockpit Intelligence

6.7 — Audit de clôture Phase 6
```

Ne considère pas cet ordre comme définitif avant le Lot 6.0.

---

# 19. Architecture Adaptive Design à protéger

KREDO est utilisé environ :

```text
50% Desktop
50% Mobile
```

Règle absolue :

```text
NE JAMAIS charger un composant Desktop lourd
puis le cacher en CSS sur Mobile.
```

Le serveur ou le composant de distribution doit choisir la bonne branche.

Desktop :

```text
Analyse
tables denses
rails
filtres avancés
```

Mobile :

```text
Action
cartes
synthèse
touch targets >= 44px
bottom navigation
```

Phase 6 concerne essentiellement Desktop, mais ne doit jamais casser les branches Mobile.

---

# 20. Gates techniques pour les prochains lots

Pour un lot applicatif :

```bash
npm run typecheck
npm test -- <tests ciblés>
npm run check:server-boundary
npx eslint <fichiers modifiés>
npm run build
```

Suite complète :

```bash
npm test
```

uniquement lorsqu’elle est pertinente et que son coût reste raisonnable.

Pas de QA navigateur.

Pour un lot purement documentaire :

```text
ne pas lancer inutilement tout le build
```

Mais vérifier suffisamment le code réel pour que la documentation ne soit pas spéculative.

---

# 21. Règle de documentation

Le ledger :

```text
docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md
```

reste la source de vérité opérationnelle.

Chaque lot doit consigner :

```text
- baseline / SHA
- objectif
- fichiers modifiés
- décisions
- invariants protégés
- tests réellement exécutés
- limites
- dettes
- statut
- commits
```

Ne jamais déclarer une gate exécutée si elle ne l’a pas été.

---

# 22. Dernier état validé

À la clôture de Phase 4 :

```text
Phase 4 : CLOSED

Surfaces URLisées : 9/9
Gaps : 0
Code applicatif Lot 4.7 : 0
Tests ciblés : 249/249
typecheck : PASS
server-boundary : PASS
QA visuelle : réservée à Guillaume

origin/main :
43d5dd95f3f2a90176f4ec1f47b90fd1456bb19f
```

Rapport canonique :

```text
docs/navigation_architecture/SHELL-0018/
06-PHASE-4-CLOSURE-AUDIT-2026-09-08.md
```

---

# 23. Instruction de reprise immédiate

Lorsque Guillaume demandera :

```text
"go prompt suivant"
```

ne repars pas sur un Lot 4.x.

La Phase 4 est close.

Commence par vérifier le Git courant, lire les documents SHELL-0018 et le code actuel du Shell, puis préparer :

```text
SHELL-0018 — Lot 6.0
Audit d'entrée et architecture cible du Shell global Desktop
```

Ce prompt devra cadrer précisément :

```text
DesktopSidebar
SectionNavBar
SectionNavBarSlot
main-menu.config
useSidebarCollapse
missions/(tabbed)
consultants
CrmTabbedShell
IntelligencePanel
Cockpit Intelligence
layouts (app)
```

L’objectif du Lot 6.0 sera de produire **l’architecture de démantèlement la plus sûre**, pas de supprimer immédiatement les composants legacy.

Toujours repartir du code réel de `origin/main`, jamais uniquement de ce handoff.
