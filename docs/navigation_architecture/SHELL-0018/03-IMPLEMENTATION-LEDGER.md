# SHELL-0018 V2 — Ledger d'implémentation

> **Statut global : en cours**  
> **Baseline : 2026-09-07**  
> **Branche de travail unique : `main`**
> **SHA de départ du chantier V2 : `d9c7fc9edb9d35cc6d2fc889d9e251ad0fa311a1`**

Ce ledger est la source de vérité de l'avancement opérationnel du chantier V2.

## 1. Protocole agent

Avant tout lot :

1. se placer sur `main` et synchroniser avec `origin/main` sans écraser les changements récents ;
2. lire `README.md` ;
3. lire l'ADR V2 ;
4. lire le standard du rail ;
5. vérifier l'état réel du code concerné ;
6. consigner tout écart ici avant modification.

Tous les commits du chantier sont réalisés directement sur `main`. Aucune branche dédiée
SHELL-0018 ne doit être créée.

À la sortie de chaque lot :

1. mettre à jour le tableau de suivi ;
2. consigner les fichiers modifiés ;
3. consigner les gates réellement exécutées ;
4. consigner les limites / dettes ;
5. ne jamais déclarer `done` si une gate nécessaire n'a pas été exécutée ou si une régression connue subsiste.

## 2. Invariants V2

| ID | Invariant |
|---|---|
| V2-N1 | Largeur canonique du rail Desktop : `11.5rem` / `184px`. |
| V2-N2 | Chapeau = bouton navy avec titre de page principal en blanc, gras, centré. |
| V2-N3 | Le nom de l'onglet actif est toujours affiché dans le header principal. |
| V2-N4 | Le rail contient `Chapitres` et éventuellement `Modules`. |
| V2-N5 | `Modules` contient uniquement des modules contextuels réellement disponibles. |
| V2-N6 | Les actions transverses restent hors du rail et sont centralisées dans Cockpit Intelligence. |
| V2-N7 | L'état de navigation est reconstructible depuis l'URL. |
| V2-N8 | `SectionRail` reste présentationnel et client-safe. |
| V2-N9 | Aucune configuration de rail/navigation n'est persistée dans Supabase. |
| V2-N10 | Les dépendances Mobile partagées sont protégées jusqu'à migration explicite. |
| V2-N11 | Aucun changement métier non nécessaire dans un lot de migration de rail. |
| V2-N12 | Aucun bouton mort ou placeholder fonctionnel trompeur dans `Modules`. |

## 3. Gates

Pour un lot de code :

```bash
npm run typecheck
npm run build
npm test
npm run check:server-boundary
npx eslint <fichiers touchés>
```

QA minimale :

- render Desktop ;
- pas d'erreur runtime ;
- pas d'overflow horizontal ;
- scroll correct ;
- chapeau conforme ;
- header avec nom d'onglet ;
- si URL touchée : refresh + back + forward ;
- si contrat partagé touché : smoke test Mobile.

## 4. Lots

| Lot | Objet | Statut | Référence / note |
|---|---|---|---|
| **0A** | Audit complet code + DB | ✅ done | audit du 2026-09-07 |
| **0B** | Rebaseline documentaire V2 | ✅ done | baseline du 2026-09-07 |
| **1.0** | Contrat client-safe de `SectionRail` | ✅ techniquement livré — QA visuelle réservée à Guillaume | `src/lib/navigation/section-rail.ts` |
| **1.1** | Primitive présentationnelle `SectionRail` | ✅ techniquement livré — QA visuelle réservée à Guillaume | `src/components/layout/SectionRail.tsx` |
| **1.2** | Tests unitaires de la primitive | ✅ done | `SectionRail.test.ts` — 5/5 tests passés le 2026-09-08 |
| **2.1** | Migration Account Intelligence | ✅ techniquement livré | commit `31163105` ; QA visuelle réservée à Guillaume |
| **2.2** | Migration Business Intelligence | ✅ techniquement livré | châssis `SectionRail` ; `?segment=` + `?tab=` conservés ; QA visuelle réservée à Guillaume |
| **2.3** | Migration Veille | ✅ techniquement livré | commit `df160aab` ; QA visuelle réservée à Guillaume |
| **2.4** | Migration Rapports | ✅ techniquement livré | commit `d22ad5ca` ; QA visuelle réservée à Guillaume |
| **2.5** | Migration Automatisations | ✅ techniquement livré | commit `c20f33fd` ; QA visuelle réservée à Guillaume |
| **2.6** | Migration Engagements | ✅ techniquement livré — QA visuelle réservée à Guillaume | premier pilote réel |
| **2.7** | Migration Prospection | ✅ techniquement livré | commit `9b13d84d` ; 15rem → 11.5rem ; QA visuelle réservée à Guillaume |
| **2.8** | Migration Knowledge Hub | ✅ techniquement livré | navigation contextuelle Racine → Domaine → Section conservée ; 12.5rem → 11.5rem ; QA visuelle réservée à Guillaume |
| **3.1** | Standardisation des modules contextuels | ✅ techniquement livré | matrice exhaustive `05-CONTEXTUAL-MODULES-MATRIX.md` ; QA visuelle réservée à Guillaume |
| **4.1** | URLisation Veille | ✅ techniquement livré | `?section=` Desktop ; état racine `news` sans paramètre ; commit `001a9e29` ; QA réelle réservée à Guillaume |
| **4.2** | URLisation Account Intelligence | ✅ techniquement livré | `?aiSection=` Desktop ; accueil canonique sans paramètre ; commit `844777ea` ; QA visuelle réservée à Guillaume |
| **4.3** | URLisation Rapports & rédaction | ✅ techniquement livré | `?section=` Desktop ; `documents` canonique sans paramètre ; suppression de `useState` Desktop ; QA visuelle réservée à Guillaume |
| **4.4** | URLisation Automatisations | ✅ techniquement livré | `?section=` Desktop ; `journal` canonique sans paramètre ; suppression de `useState` Desktop ; préservation intégrale de `?run=` ; QA visuelle réservée à Guillaume |
| **4.5** | URLisation Prospection Intelligence | ✅ techniquement livré | `?section=` Desktop ; `strategy` canonique sans paramètre ; suppression de `useState` Desktop ; QA visuelle réservée à Guillaume |
| **4.6** | URLisation Knowledge Hub | ✅ techniquement livré | `?domain=` + `?section=` Desktop ; racine `/knowledge` ; QA visuelle réservée à Guillaume |
| **4.7** | Audit & clôture Phase 4 | ✅ techniquement livré | audit exhaustif des 9 surfaces ; aucune navigation secondaire Desktop client-state résiduelle |
| **6.0** | Audit d'entrée & architecture cible Phase 6 | ✅ livré | document `08-PHASE-6-ENTRY-AUDIT-AND-TARGET-ARCHITECTURE.md` |
| **6.1** | Retrait des `SectionNavBarSlot` no-op | ✅ techniquement livré | 4 layouts nettoyés ; build blocker CSS préexistant corrigé (`e6550db8`) ; QA visuelle réservée à Guillaume |
| **6.2** | Shell Consultants + Consultants Lot 14 | ✅ techniquement livré | `(tabbed)` supprimé, `Consultants` sous CRM, commit `50f1a31e` ; QA visuelle réservée à Guillaume |
| **6.3** | Missions historiques + Opportunities Lot 11 | ✅ techniquement livré | `missions/(tabbed)` supprimé, `MissionsTabbedShell` supprimé, `SectionNavBarSlot` 0 consommateur, CRM `Opportunités`, `/staffing` redirect permanent |
| **6.3R** | Rebaseline architecture cible finale de navigation | ✅ livré (documentaire) | document `09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` ; supersède les anciennes cibles ; 0 code applicatif |
| **6.4A** | Démantèlement navigation horizontale **legacy** (technique) | ✅ techniquement livré | `SectionNavBar.tsx` + `SectionNavBarSlot.tsx` supprimés ; `getModuleTabs`, `getSectionTabsForPath`, `MainMenuItem.tabs`, type `SectionTab` de `main-menu.config` supprimés ; type Mobile explicite `MobileNavigationTab` ; `getMobileTabsForPath` découplé. `section-tab-styles.ts` + `SectionTabBar` **conservés**. Voir §35 |
| **6.4B** | Alignement **navigation principale Desktop** (produit) | ✅ techniquement livré | `Cockpit` → `Accueil` (icône `home`, pathname `/cockpit` conservé) ; Finance déplacée sous CRM (5ᵉ) ; Paramètres déplacé sous Outils (3ᵉ) ; groupes `Finance`/`Ressources` racines supprimés ; logo `aria-label` « Retour à l'accueil ». 0 pathname modifié, 0 workspace touché, 0 Mobile. Voir §36 |
| **6.5** | Stabilisation `DesktopSidebar` / collapse | ✅ techniquement livré | politique pathname `desktop-sidebar-policy.ts` ; `DesktopSidebar` dérive son état effectif (préférence cookie + auto-repli + verrous) ; `useSidebarCollapse` réduit à un compteur de verrous ; 6 émetteurs historiques + 1 lecteur supprimés ; `IntelligencePanel` verrou équilibré. Voir §37 |
| **6.6** | Intégration finale Shell global ↔ Cockpit Intelligence | ✅ techniquement livré | commit `e8f5e4f6` ; `DesktopSidebar` observe directement `useIntelligencePanel.isOpen` ; `resolveDesktopSidebarCollapsed` gagne la dimension `intelligencePanelOpen` ; `IntelligencePanel` n'importe plus `useSidebarCollapse` et n'émet plus de verrou ; `CrmTabbedShell` reste le seul émetteur applicatif ; `AppShell` inchangé (Server Component). Voir §38 |
| **6.7** | Audit de clôture Phase 6 | ✅ clôturé | audit sur `HEAD` (`2859c5bf`) ; navigation principale + URLs + collapse Shell-owned + Cockpit Intelligence global + Mobile distinct + tabs d'entités conservés : tous **PASS** ; 0 blocker ; 6 dettes NON-BLOCKING/DEFERRED. Document `10-PHASE-6-CLOSURE-AUDIT-2026-09-09.md`. Voir §39 |
| **Phase 6** | Refonte Shell global Desktop | ✅ **CLOSED (2026-09-09)** | doc `10-*` — invariants Shell figés |
| **7.0** | Audit global CURRENT → TARGET des workspaces | ✅ livré | audit sur `HEAD` (`f477f736`) ; 10 workspaces revalidés contre 09 §B/C ; impact Data/Routing/Desktop/Mobile ; blockers ; sous-lots 7.3A/B/C ; séquence Phase 7 ; `MISSION_CATALOG` = 7 specs (framework mission réutilisable) ; duplication rentabilité Finance↔Engagements confirmée. Document `11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md`. Voir §40 |
| **7.1** | Alignement Opportunités | ⬜ todo | `YES AFTER REBASELINE` — attend l'intégration de la refonte Synthèse Opportunités parallèle |
| **7.2** | Alignement Consultants | ✅ techniquement livré (`bb2a3a4d`) | `pool-competences` chapitre Desktop → **Module Desktop** (composant + Data réutilisés) ; 4 chapitres Desktop + libellés cible ; Mobile inchangé (5 accès, `SEPARATE IMPLEMENTATION`) ; `resolveConsultantsDesktopEntry` pure ; 0 pathname / 0 redirect / 0 Data. Consultants Lot 15 → `UNBLOCKED / READY`. Voir §41 |
| **7.3** | Engagements + Finance (coordonné) | ⬜ todo | sous-lots 7.3A (Data — `NEEDS DATA DECISION`) → 7.3B → 7.3C |
| **7.4 → 7.9** | BI · Prospection · Rapports · Veille · Knowledge Hub · Automatisations | ⬜ todo | voir doc `11-*` §19 — 7.5 Prospection `NEEDS PRODUCT DECISION` (workspace coquille) |
| **7.10** | Audit final architecture interne | ⬜ todo | clôture Phase 7 |

> **Phase 4 — ✅ close techniquement (Lot 4.7)** · **Phase 6 — ✅ CLOSED (Lot 6.7, doc `10-*`)**
>
> **Cible canonique de navigation : `09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md`** (Lot 6.3R).
> Menu principal + architecture interne des workspaces. Supersède les anciennes cibles lorsqu'elles divergent.
> **Preuve de conformité technique du Shell : `10-PHASE-6-CLOSURE-AUDIT-2026-09-09.md`** (Lot 6.7).

## 5. Journal des décisions de rebaseline

### 2026-09-07 — R-01

Le périmètre des Modules du rail est réduit aux **modules contextuels de la page**.

Les actions transverses sont hors rail et relèvent de Cockpit Intelligence.

### 2026-09-07 — R-02

Le chapeau canonique est un bouton navy. Son texte est le titre de page principal, blanc, gras et centré.

### 2026-09-07 — R-03

Le nom de l'onglet actif doit toujours apparaître dans le header de la section principale.

### 2026-09-07 — R-04

La règle historique « chapitre = route » est remplacée par « chapitre = état URL-addressable ». Pathname et query param sont tous deux autorisés.

### 2026-09-07 — R-05

Le Mobile est hors refonte visuelle mais ses dépendances partagées ne sont pas supprimables sans migration explicite.

### 2026-09-07 — R-06

Knowledge Hub n'est plus exempté du châssis commun : seule sa navigation métier contextuelle reste spécifique.

### 2026-09-07 — R-07

Le premier pilote de migration est **Engagements** plutôt qu'Account Intelligence : son titre de page est non ambigu, son état `?vue=` est déjà URL-addressable et il ne possède aucun module contextuel à arbitrer. Cela permet de prouver la primitive sans modifier de logique métier.

### 2026-09-08 — R-08

`main` est la seule branche de travail du chantier SHELL-0018. Chaque lot est synchronisé,
validé et committé directement sur `main` ; aucune branche dédiée n'est créée.

## 6. Écarts connus avant code

- plusieurs rails `11.5rem` sont encore des copies locales ;
- Prospection utilise `15rem` ;
- Knowledge Hub utilise `12.5rem` ;
- Finance utilise encore une barre de tabs horizontale ;
- `SectionNavBar` / `SectionNavBarSlot` restent consommés par des routes historiques ;
- plusieurs pages utilisent `useSidebarCollapse` ;
- certains rails ont un chapeau clair au lieu du chapeau navy canonique ;
- la section Modules n'est pas ancrée en bas partout ;
- certains headers affichent encore un titre générique plutôt que le nom exact de l'onglet actif.

## 7. Clôture du Lot 0B

Fichiers créés :

- `docs/navigation_architecture/SHELL-0018/README.md`
- `docs/navigation_architecture/SHELL-0018/00-CURRENT-STATE-AUDIT-2026-09-07.md`
- `docs/navigation_architecture/SHELL-0018/01-ADR-0018-SHELL-NAVIGATION-V2.md`
- `docs/navigation_architecture/SHELL-0018/02-SECONDARY-RAIL-STANDARD.md`
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`
- `docs/navigation_architecture/SHELL-0018/04-CURRENT-NAVIGATION-INVENTORY.md`

Vérifications documentaires :

- les Modules du rail sont définis uniquement comme contextuels ;
- les actions transverses sont explicitement hors rail ;
- la règle du chapeau navy centré est présente dans README + ADR + standard ;
- la règle du nom d'onglet dans le header principal est présente dans README + ADR + standard ;
- le Mobile est identifié comme dépendance protégée ;
- aucune migration Supabase n'est demandée ;
- aucun fichier applicatif n'a été modifié dans ce lot.

**Verdict Lot 0B : `done`.**

## 8. Lot 1 — socle `SectionRail`

### Audit d'entrée effectué

- pattern de classes vérifié dans les rails existants ;
- helper `cn` vérifié comme client-safe ;
- pattern de tests par `renderToStaticMarkup` vérifié dans le dépôt ;
- usage de `line-clamp-2` vérifié dans plusieurs composants existants ;
- aucune dépendance Supabase / n8n / `server-only` introduite.

### Fichiers créés

- `src/lib/navigation/section-rail.ts`
- `src/components/layout/SectionRail.tsx`
- `src/components/layout/SectionRail.test.ts`

### Contrat implémenté

La primitive supporte :

- chapeau via `href` ou callback ;
- chapitres via `href` ou callback ;
- état actif ;
- icône optionnelle ;
- labels jusqu'à deux lignes ;
- modules contextuels facultatifs ;
- section Modules ancrée en bas ;
- largeur fixe `11.5rem` ;
- chapeau navy, blanc, gras et centré.

### Validation du socle

- preview Vercel du commit `7b56a1db9cb905f360866f96ee41fd208f5bbd85` : **READY** ;
- `next build` de cette preview : terminé avec succès ;
- tests ciblés locaux du 2026-09-08 : **14/14 passés** sur `SectionRail.test.ts` et
  `engagements-desktop-ui.test.ts` ;
- `npm run check:server-boundary` du 2026-09-08 : **passé** ;
- lint ciblé du 2026-09-08 : **passé sans erreur ni warning** sur le contrat, la primitive,
  leurs tests et le consommateur Engagements ;
- smoke Desktop authentifié `/missions` du 2026-09-08 : **bloqué avant rendu** ;
  `.codex/auth-state.json` redirige vers `/login?next=%2Fmissions`. La session QA doit être
  renouvelée, sans contournement du système d'authentification ;
- aucune migration Supabase ;
- aucun changement métier.

Le socle compile, se déploie et passe l'intégralité des gates techniques locales et de build.
Conformément à la règle projet réconciliée, la QA visuelle est réservée exclusivement à Guillaume et son absence ne bloque pas la livraison technique.
Son verdict historique est réconcilié : **`techniquement livré — QA visuelle réservée à Guillaume`**.

## 9. Lot 2.6 — pilote Engagements

### Modifications

- `EngagementsDesktopView.tsx` utilise désormais `SectionRail` ;
- suppression du rail JSX local ;
- chapeau = `Engagements`, navy, blanc, gras et centré via la primitive ;
- navigation `?vue=` conservée ;
- section `Chapitres` fournie par la primitive ;
- aucun module affiché car aucun module contextuel n'est déclaré sur cette page ;
- le header principal affiche désormais le **nom exact de l'onglet actif** : `Synthèse`, `Missions AT`, `Projets`, `Activité & congés`, `Planning des engagements` ;
- tests de contrat du header mis à jour.

### Validation

- preview Vercel du commit `ee565dd7b01005c6573d8b239380f2270913a7e4` : **READY** ;
- build Next/Turbopack : **compilation et TypeScript validés** par Vercel ;
- smoke HTTP sur `/missions?vue=missions-at` : **200**, puis redirection vers le login faute de session authentifiée ;
- tests ciblés locaux du 2026-09-08 : **14/14 passés** sur la primitive et le contrat Desktop
  Engagements ;
- `npm run check:server-boundary` et lint ciblé : **passés** le 2026-09-08 ;
- QA visuelle authentifiée du rail : bloquée car `.codex/auth-state.json` redirige vers le login ;
- aucune migration Supabase ;
- aucun changement n8n ;
- aucune modification Mobile.

Conformément à la règle projet réconciliée, la QA visuelle est réservée exclusivement à Guillaume et son absence ne bloque pas la livraison technique.
**Verdict Lot 2.6 : `techniquement livré — QA visuelle réservée à Guillaume`.**

## 10. Préparation du Lot 2.1 — delta `ClientIntelligenceSidebar` / `SectionRail`

Delta établi le 2026-09-08 sur le code de `main`. Aucun fichier applicatif n'a été modifié.

| Axe | `ClientIntelligenceSidebar` actuel | Contrat `SectionRail` / V2 | Traitement prévu au Lot 2.1 |
|---|---|---|---|
| Châssis | JSX local, largeur déjà `11.5rem` | primitive partagée `SectionRail` | remplacer le châssis local sans modifier les sept clés métier ni leur ordre |
| Chapeau | `Liste des comptes`, avec `onBackToAccounts` | titre de page principale et retour à son état racine | utiliser `Account Intelligence` et revenir au chapitre `accueil` ; préserver l'action de retour à la liste dans le header principal, hors chapeau |
| Chapitres | callbacks `onTabChange`, état `activeTab` local | callbacks ou liens, état actif fourni | mapper les sept entrées existantes vers `chapters` ; conserver les callbacks pendant ce lot |
| Header principal | absent sur `accueil`, présent sur les six autres chapitres | nom exact de l'onglet actif toujours visible | rendre le header Desktop sur les sept états et afficher `Accueil` pour l'état racine |
| Libellé partagé `accueil` | `getAccountIntelligenceTabLabel("accueil")` renvoie `Account Intelligence` et est consommé par Mobile | Desktop doit distinguer titre de page et titre d'onglet | ne pas modifier ce helper partagé ; dériver le libellé Desktop depuis la configuration des chapitres |
| Modules | section toujours rendue ; boutons disabled si callback/slug absent | section facultative, aucun bouton mort | construire `contextualModules` conditionnellement : Répertoire et Bibliothèque seulement avec callback, Playbook seulement avec slug |
| Position Modules | `mt-5`, directement après les chapitres | ancrage bas `mt-auto`, chapitres flexibles et scrollables | laisser `SectionRail` porter le layout canonique |
| Styles | chapeau `shadow-sm` + `transition-all`, modules `truncate` | aucune ombre décorative ; labels jusqu'à deux lignes | supprimer les styles locaux en utilisant ceux de la primitive |
| URL | `useState("accueil")`, non reconstructible après refresh | état URL-addressable à terme | dette V2-N7 maintenue explicitement pour la Phase 4 afin de ne pas mêler URLisation et remplacement du châssis |
| Mobile | état et navigation propres dans `ClientIntelligenceMobileView` ; helpers partagés | Mobile protégé | ne modifier ni `ClientIntelligenceMobileView`, ni `MOBILE_NAV_ITEMS`, ni `TabKey`, ni le helper de titre partagé |

### Contrat de migration minimal

1. transformer `ClientIntelligenceSidebar` en adaptateur présentationnel de `SectionRail` ou
   intégrer directement la primitive dans `ClientIntelligenceDesktopView` ;
2. conserver les sept clés et callbacks métier existants ;
3. déplacer visuellement l'action existante « retour à la liste des comptes » dans le header,
   sans changer sa destination ni le store CRM appelé ;
4. rendre le header pour `accueil` avec le libellé exact `Accueil` ;
5. omettre tout module sans action réelle ;
6. ne pas URLiser les chapitres dans ce lot ; inscrire cette dette dans la gate de sortie ;
7. ne toucher à aucun composant Mobile, loader, donnée Supabase ou workflow n8n.

### Baseline de préparation

- test existant `ClientIntelligenceSidebar.test.ts` : **2/2 passé** le 2026-09-08 ;
- lint ciblé du rail, de son test, de la vue Desktop et du header : **passé** ;
- le paramètre `tab` est déjà utilisé par la liste Comptes & contacts ; la future URLisation ne
  devra pas le réutiliser sans contrat explicite ;
- la vue Desktop peut être montée directement sur `/prospection/accounts/[companyId]` ou dans
  plusieurs panneaux conservés montés par `CrmTabbedShell`. La Phase 4 devra préserver ces deux
  modes et le back/forward avant de remplacer l'état local.

**Verdict de préparation :** delta établi puis appliqué dans le Lot 2.1, sans URLisation et sans
modification Mobile.

## 11. Clôture du Lot 2.1 — Account Intelligence

### Fichiers modifiés

- `src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.tsx` ;
- `src/components/accounts-contacts/intelligence/ClientIntelligenceDesktopView.tsx` ;
- `src/components/accounts-contacts/intelligence/header/AccountIntelligenceSignatureHeader.tsx` ;
- `src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.test.ts`.

### Comportement migré

- `ClientIntelligenceSidebar` délègue désormais son châssis à la primitive canonique
  `SectionRail` ;
- le chapeau affiche `Account Intelligence` et son callback sélectionne le chapitre racine
  `accueil` ;
- les sept chapitres, leur ordre, leurs clés, leurs icônes et leurs callbacks métier sont
  conservés ;
- le header principal Desktop est rendu pour les sept chapitres et affiche le libellé exact de
  l'onglet actif, dont `Accueil` pour l'état racine ;
- le helper de titre partagé avec Mobile n'a pas été modifié : le libellé Desktop est dérivé de
  la configuration Desktop ;
- l'action existante de retour vers la liste des comptes reste disponible dans le header
  principal, avec la même destination et le même store CRM ;
- Répertoire, Bibliothèque et Playbook ne sont transmis à `SectionRail` que lorsque leur action
  ou leur destination contextuelle existe ; aucun bouton module disabled ou placeholder ne
  subsiste ;
- `SectionRail` porte désormais la largeur `11.5rem`, l'état actif brass, le scroll des chapitres
  et l'ancrage bas de la zone Modules.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** ;
2. `npm test -- src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.test.ts src/components/layout/SectionRail.test.ts` : **15/15 tests passés** ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des quatre fichiers modifiés : **passé sans erreur ni warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 et génération des 41 pages statiques
   terminées avec succès.

### Limites et dettes restantes

- l'état `activeTab` reste local conformément au périmètre du lot ; l'URLisation complète reste
  une dette de Phase 4 ;
- aucune QA visuelle ou ergonomique n'est incluse dans ce verdict technique ;
- aucune modification Mobile, Supabase, RLS, RPC, fetch métier ou workflow n8n.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Verdict Lot 2.1 : `techniquement livré`.** Toutes les gates techniques demandées passent et
aucune régression technique connue ne subsiste dans le périmètre du lot.

## 12. Préparation du Lot 2.2 — delta Business Intelligence / `SectionRail`

Delta établi le 2026-09-08 sur le code de `main`, avant modification applicative :

| Axe | État actuel | Cible du Lot 2.2 |
|---|---|---|
| Châssis | `BusinessIntelligenceLocalNavigation` duplique le rail en JSX et en classes locales | conserver le composant comme adaptateur léger de `SectionRail` |
| Chapeau | bloc clair statique, sans retour à l'état racine | chapeau canonique `Business Intelligence`, actionnant `tab=home` pour le segment actif via les helpers URL existants |
| Chapitres | six entrées issues de `BI_CHAPTERS`, callbacks URL existants | mapper les mêmes définitions, dans le même ordre, vers `chapters` |
| Header principal | table locale de titres ; `home` affiche `Business Intelligence` | dériver le libellé de `BI_CHAPTERS` et afficher `Accueil` pour `home` |
| Signature | reçoit la même table locale que le header principal | lui transmettre le libellé dérivé du chapitre actif sans changer son rendu métier |
| Modules | deux capacités segmentaires réelles et une action transverse | ne transmettre que les capacités contextuelles disposant d'un callback ; retirer du rail toute action non contextuelle |
| Routage | `segment` et `tab` sont déjà reconstruits par `resolveBiChapter`, `buildBusinessIntelligenceHref` et `replaceBiChapterInHref` | préserver intégralement deep-link, refresh, back/forward et changement de segment |
| Mobile | `BI_CHAPTERS` et les helpers URL sont partagés | ne modifier aucun contrat, libellé ou composant Mobile |

Le lot reste un refactor de châssis : aucune donnée, aucun fetch, aucune règle métier et aucun
workspace analytique ne sont modifiés.

## 13. Clôture du Lot 2.2 — Business Intelligence

### Fichiers modifiés

- `src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.tsx` ;
- `src/features/business-intelligence/desktop/BusinessIntelligenceDesktop.tsx` ;
- `src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.test.ts` ;
- `src/features/business-intelligence/navigation/business-intelligence-chapters.ts`.

### Architecture retenue

- `BusinessIntelligenceLocalNavigation` reste un adaptateur Desktop léger autour de la primitive
  canonique `SectionRail` ;
- le chapeau canonique affiche `Business Intelligence` et déclenche le retour au chapitre `home`
  via le callback URL existant, qui conserve le segment actif avec `replaceBiChapterInHref` ;
- les six chapitres, leur ordre, leurs identifiants, leurs libellés et leurs icônes sont conservés
  depuis `BI_CHAPTERS` ;
- le titre du chapitre actif est désormais dérivé de `BI_CHAPTERS` puis transmis au header
  principal et à la signature ; l'état `home` affiche donc `Accueil` dans le header principal ;
- `resolveBiChapter`, `buildBusinessIntelligenceHref`, `replaceBiChapterInHref`, `?segment=` et
  `?tab=` restent les mécanismes de navigation, sans nouvel état client ni nouvelle sous-route ;
- le chargement dynamique des modales et workspaces lourds reste inchangé.

### Modules contextuels

- `Études sectorielles` et `Playbooks` sont conservés comme capacités liées au segment courant ;
- chacun n'est transmis à `contextualModules` que lorsque son callback réel est fourni ;
- toute action non contextuelle a été retirée du rail sans création d'un nouvel emplacement ;
- la primitive commune porte l'ancrage bas de la section `Modules` ; aucun bouton mort ne
  subsiste.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** après mise à l'écart d'un cache `.next` périmé qui contenait
   des déclarations générées dupliquées ;
2. `npm test -- src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.test.ts src/features/business-intelligence/navigation/business-intelligence-chapters.test.ts src/features/business-intelligence/__tests__/business-intelligence-layout-contracts.test.ts src/features/business-intelligence/__tests__/business-intelligence-lot2-shell.test.ts src/components/layout/SectionRail.test.ts` : **25/25 tests passés** ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des quatre fichiers applicatifs et de test modifiés : **passé sans erreur ni
   warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7, TypeScript et génération des 41 pages
   statiques terminées avec succès.

### Limites et dettes restantes

- aucune dette de routage n'est introduite : l'état reste URL-addressable et conserve le segment ;
- aucune modification Mobile, Supabase, RLS, RPC, fetch métier, workspace analytique ou workflow
  n8n ;
- aucune régression technique connue ne subsiste dans le périmètre du lot.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Lot 2.2 techniquement livré.**

## 14. Préparation du Lot 2.3 — delta Veille / `SectionRail`

Delta établi le 2026-09-08 sur le code de `main`, avant modification applicative :

| Axe | État actuel | Cible du Lot 2.3 |
|---|---|---|
| Châssis | `VeilleLocalNavigation` duplique le rail en JSX et en classes locales | conserver le composant comme adaptateur Desktop léger de `SectionRail` |
| Chapeau | bloc clair statique sans action | chapeau canonique `Veille & actualités`, ramenant à la section racine `news` via le callback existant |
| Chapitres | quatre entrées locales pilotées par `VeilleSection` | conserver les quatre clés, leur ordre, leurs libellés et leurs icônes dans une configuration Desktop typée unique |
| Header principal | titres dérivés du contenu (`Sélection…`, `Veille des comptes`, `Analyses stratégiques`, `Historique de la veille`) | afficher le libellé exact du chapitre actif depuis la même configuration Desktop |
| Modules | `Gestion des sources` est toujours rendue, même sans callback ; une action transverse est également présente | transmettre uniquement `Gestion des sources`, et seulement lorsque son callback réel existe |
| Routage | état client local `VeilleSection` | conserver ce mécanisme dans ce lot ; dette V2-N7 maintenue pour la Phase 4 |
| Mobile | branche et composants distincts | ne modifier aucun contrat ni composant Mobile |

Le lot reste un refactor de châssis : aucune donnée, aucun fetch, aucun workflow, aucune logique
métier de veille et aucun contenu des quatre sections ne sont modifiés.

## 15. Clôture du Lot 2.3 — Veille & actualités

### Fichiers modifiés

- `src/components/veille/VeilleLocalNavigation.tsx` ;
- `src/components/veille/VeilleActualitesDesktop.tsx` ;
- `src/components/veille/veille-desktop-contracts.test.ts` ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`.

### Architecture retenue

- `VeilleLocalNavigation` reste un adaptateur Desktop léger autour de la primitive canonique
  `SectionRail` ;
- le chapeau affiche `Veille & actualités` et sélectionne la section racine `news` via le callback
  `onChange` existant ;
- `VEILLE_DESKTOP_CHAPTERS` devient la source de vérité Desktop typée des quatre chapitres :
  `news`, `watched-accounts`, `strategic-analysis`, `history`, dans leur ordre existant, avec leurs
  libellés et leurs icônes conservés ;
- le titre du header principal est dérivé de cette même configuration et affiche exactement
  `Actualités`, `Veille ciblée`, `Analyses` ou `Archives` selon l'état client courant ;
- la date et les métriques du digest courant restent disponibles comme information secondaire
  du header `Actualités` ;
- l'état local `VeilleSection`, les callbacks, les contenus et les interactions métier des quatre
  sections restent inchangés.

### Modules contextuels

- `Gestion des sources` reste le seul module contextuel du rail Veille ;
- il n'est transmis à `contextualModules` que lorsque son callback réel est fourni ;
- les éléments non contextuels ont été retirés du rail sans création d'un nouvel emplacement ;
- `SectionRail` porte l'ancrage bas de `Modules` et la section entière est omise sans action réelle ;
- aucun bouton mort, disabled permanent ou placeholder n'est rendu.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** après mise à l'écart d'un cache `.next` périmé contenant deux
   fichiers de déclarations générées dupliqués ;
2. `npm test -- src/components/veille/veille-desktop-contracts.test.ts src/components/layout/SectionRail.test.ts` : **25/25 tests passés** ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des trois fichiers applicatifs et de test modifiés : **passé sans erreur** ; un
   warning `react-hooks/exhaustive-deps` préexistant à la ligne 471 de
   `VeilleActualitesDesktop.tsx`, hors des zones modifiées et de ce refactor de châssis, reste
   inchangé ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7, TypeScript et génération des 41 pages
   statiques terminées avec succès.

### Limites et dettes restantes

- l'URLisation des sections Veille n'est pas traitée : la dette V2-N7 reste volontairement
  reportée à la Phase 4 ;
- aucune modification Mobile, Supabase, RLS, RPC, fetch métier, workflow n8n ou Cockpit
  Intelligence ;
- aucune régression technique connue ne subsiste dans le périmètre du lot.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Lot 2.3 techniquement livré.**

## 16. Clôture du Lot 2.4 — Rapports & rédaction

### Fichiers modifiés et créés

- `src/components/reports/ReportsLocalNavigation.tsx` (nouveau composant adaptateur) ;
- `src/components/reports/ReportsDesktopView.tsx` ;
- `src/components/reports/ReportsLocalNavigation.test.ts` (nouveaux tests unitaires et de contrat) ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`.

### Architecture retenue

- Le rail secondaire Desktop inline a été extrait dans l'adaptateur Desktop léger `ReportsLocalNavigation`, qui délègue la présentation à la primitive canonique `SectionRail` ;
- Le chapeau canonique affiche `Rapports & rédaction` (navy, texte blanc, gras, centré horizontalement et verticalement, largeur 11.5rem / 184px) et déclenche la sélection de la section racine `documents` via `home.onSelect`, sans modifier les autres états métier de la page ;
- La configuration Desktop unique `REPORTS_DESKTOP_CHAPTERS` sert de source de vérité pour les trois chapitres : `documents` (« Bibliothèque »), `knowledge` (« Connaissances ») et `generation` (« Génération »), conservant exactement leurs identifiants, leur ordre, leurs libellés et leurs icônes ;
- Le header principal Desktop applique l'invariant SHELL-0018 en affichant le titre exact du chapitre actif (`Bibliothèque`, `Connaissances` ou `Génération`), dérivé dynamiquement de la configuration via `getReportsDesktopChapterLabel(activeSection)` ;
- Toutes les fonctionnalités métier de consultation documentaire, d'édition, de filtrage, de duplication, de favoris, d'archivage, de génération, de Knowledge Space et d'analyses restent strictement protégées et inchangées ;
- L'import inutilisé `useCrmAccountLauncherStore` a été supprimé de `ReportsDesktopView.tsx`.

### Modules contextuels

- Aucun module contextuel réel distinct des trois chapitres n'est présent sur cette page ;
- `contextualModules` est omis (`undefined`), ce qui empêche le rendu de la section Modules dans le rail ;
- Les actions non contextuelles recopiées dans l'ancien rail inline ont été retirées du rail ;
- Aucun bouton mort, placeholder trompeur ou action disabled n'est affiché.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** sans erreur ;
2. `npm test -- src/components/reports/ReportsLocalNavigation.test.ts src/components/layout/SectionRail.test.ts` : **11/11 tests passés** ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des fichiers créés et modifiés : **passé sans erreur** ; le warning `setShowFilters` préexistant dans `ReportsDesktopView.tsx` reste inchangé ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès.

### Limites et dettes restantes

- L'état de navigation `activeSection` reste un état local dans ce lot ; l'URLisation de la page Rapports reste une dette de Phase 4 conformément au cadrage ;
- Aucune modification Mobile, Supabase, RLS, RPC, fetch métier ou workflow n8n ;
- Aucune régression technique connue ne subsiste dans le périmètre du lot.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Lot 2.4 techniquement livré.**

## 17. Clôture du Lot 2.5 — Automatisations

### Fichiers modifiés et créés

- `src/components/automations/AutomationsLocalNavigation.tsx` (adaptateur refactorisé) ;
- `src/components/automations/AutomationsDesktopDashboard.tsx` ;
- `src/components/automations/AutomationsLocalNavigation.test.ts` (nouveaux tests unitaires et de contrat) ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`.

### Architecture retenue

- `AutomationsLocalNavigation` est désormais un adaptateur Desktop léger autour de la primitive canonique `SectionRail` ;
- Le chapeau canonique affiche `Automatisations` (navy, texte blanc, gras, centré horizontalement et verticalement, largeur 11.5rem / 184px) et déclenche la sélection du chapitre racine `journal` via `home.onSelect`, sans modifier inutilement d'autres états métier ;
- La configuration Desktop unique `AUTOMATIONS_DESKTOP_CHAPTERS` sert de source de vérité pour les trois chapitres : `journal` (« Journal d'exécution »), `sante` (« Santé des workflows ») et `couts` (« Coûts »), en conservant exactement leurs identifiants, leur ordre, leurs libellés et leurs icônes fines SVG ;
- Le header principal Desktop applique l'invariant SHELL-0018 en affichant le titre exact du chapitre actif (`Journal d'exécution`, `Santé des workflows` ou `Coûts`), dérivé dynamiquement de la configuration via `getAutomationsDesktopChapterLabel(activeTab)` ;
- L'indicateur secondaire `Live Telemetry` est conservé et s'affiche à côté du titre actif sans le masquer ni le remplacer ;
- Les sémantiques locales devenues redondantes (`role="tab"`, `aria-selected`, `shadow-xs`) ont été supprimées au profit du contrat canonique de `SectionRail` (`aria-current="page"`) ;
- Toutes les fonctionnalités métier sensibles (suivi temps réel `useRunJournalRealtime`, statuts live, drill-down dialog, modal d'exécutions, KPIs, simulation de cadence, filtres du journal et de coûts, calculs et cartes) restent strictement protégées et inchangées ;
- Le support du deep-link `initialRunId` (`/automations?run=<id>`) est strictement préservé sans régression.

### Modules contextuels

- La page Automatisations ne contient pas de véritable module contextuel ;
- `contextualModules` est explicitement défini à `undefined`, évitant tout module artificiel ou bouton mort ;
- La section Modules n'est donc pas rendue dans le rail.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** sans erreur ;
2. `npm test -- src/components/automations/AutomationsLocalNavigation.test.ts src/components/layout/SectionRail.test.ts` : **14/14 tests passés** (et **38/38 tests passés** sur l'ensemble de `src/components/automations/`) ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des fichiers créés et modifiés : **passé sans erreur ni warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès.

### Limites et dettes restantes

- L'état de navigation `activeTab` reste un état local dans ce lot ; l'URLisation des chapitres Automatisations reste une dette de Phase 4 conformément au cadrage ;
- Aucune modification Mobile, Supabase, RLS, RPC, fetch métier ou workflow n8n ;
- Aucune régression technique connue ne subsiste dans le périmètre du lot.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Lot 2.5 techniquement livré.**

## 18. Clôture du Lot 2.7 — Prospection Intelligence

### Fichiers modifiés et créés

- `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx` (adaptateur refactorisé) ;
- `src/features/prospection-intelligence/desktop/ProspectionIntelligenceHeader.tsx` ;
- `src/features/prospection-intelligence/desktop/ProspectionIntelligenceDesktop.tsx` ;
- `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.test.ts` (nouveaux tests unitaires et de contrat) ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`.

### Architecture retenue

- `ProspectionIntelligenceLocalNavigation` délègue intégralement son châssis à la primitive canonique `SectionRail` ;
- La largeur locale historique `15rem` est normalisée à la largeur standard `11.5rem` (`184px`) sans débordement horizontal ;
- Le chapeau canonique affiche `Prospection` (navy, texte blanc, gras, centré horizontalement et verticalement, largeur 11.5rem / 184px) et son action `home.onSelect` ramène au chapitre racine `strategy` sans modifier inutilement d'autres états métier ;
- La configuration Desktop unique `PROSPECTION_DESKTOP_CHAPTERS` sert de source de vérité pour les quatre chapitres : `strategy` (« Brief »), `chapter_1` (« Fenêtres d'opportunités »), `chapter_2` (« Approches commerciales ») et `chapter_3` (« Playbooks »), en conservant exactement leurs identifiants, leur ordre, leurs libellés et leurs icônes fines SVG ;
- Le chapitre `Playbooks` reste un chapitre métier et n'est pas transformé en module ;
- Le header principal Desktop applique l'invariant SHELL-0018 en affichant le titre exact du chapitre actif (`Brief`, `Fenêtres d'opportunités`, `Approches commerciales` ou `Playbooks`), dérivé dynamiquement de la configuration via `getProspectionDesktopChapterLabel(activeTab)` ;
- Les divergences locales (`Sections`, classes custom, boutons redondants) ont été supprimées au profit du contrat canonique de `SectionRail` (`aria-current="page"`) ;
- L'action transverse « CRM Launcher » et son hook `useCrmAccountLauncherStore` ont été retirés du rail sans déplacement artificiel ;
- Toutes les fonctionnalités et états métier (filtres de période 30/90/180, filtre secteur, recherche compte, `selectedAccountId`, modale de priorisation, composants analytiques `StrategicBrief`, `IntelligenceKpiStrip`, `AccountPriorityBoard`, `PotentialReachMatrix`, `AccountAttackPanel`) restent strictement protégés et inchangés.

### Modules contextuels

- La page Prospection Intelligence ne contient pas de véritable module contextuel distinct de ses quatre chapitres ;
- `contextualModules` est explicitement défini à `undefined`, évitant tout module artificiel ou bouton mort ;
- La section Modules n'est donc pas rendue dans le rail.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** sans erreur ;
2. `npm test -- src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.test.ts src/components/layout/SectionRail.test.ts` : **14/14 tests passés** (et **5/5 tests passés** sur `business-intelligence-layout-contracts.test.ts`) ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des fichiers créés et modifiés : **passé sans erreur ni warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès.

### Limites et dettes restantes

- L'état de navigation `activeTab` reste un état local dans ce lot ; l'URLisation de la page Prospection reste une dette de Phase 4 conformément au cadrage ;
- La redirection de la route historique `/prospection` vers `/intelligence` n'est pas modifiée ;
- Aucune modification Mobile, Supabase, RLS, RPC, fetch métier ou workflow n8n ;
- Aucune régression technique connue ne subsiste dans le périmètre du lot.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Lot 2.7 techniquement livré.**

## 19. Clôture du Lot 2.8 — Knowledge Hub

### Fichiers modifiés et créés

- `src/features/knowledge-hub/knowledge-hub.types.ts` (contrat partagé `KnowledgeView`) ;
- `src/features/knowledge-hub/KnowledgeHubLocalNavigation.tsx` (adaptateur refactorisé `SectionRail` et helpers purs) ;
- `src/features/knowledge-hub/KnowledgeHubDesktop.tsx` (intégration du header actif et suppression de dépendance inversée) ;
- `src/features/knowledge-hub/KnowledgeHubLocalNavigation.test.ts` (suite complète de tests unitaires et de contrat) ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`.

### Architecture retenue

- `KnowledgeHubLocalNavigation` délègue intégralement son châssis à la primitive canonique `SectionRail` ;
- La largeur locale historique `12.5rem` est normalisée à la largeur standard `11.5rem` (`184px`) sans débordement ni scroll horizontal ;
- Le conteneur `<nav>` local redondant et les styles dupliqués ont été retirés au profit du standard ;
- Le contrat de navigation `KnowledgeView` a été extrait vers `knowledge-hub.types.ts`, éliminant la dépendance inversée entre `KnowledgeHubLocalNavigation` et `KnowledgeHubDesktop` ;
- L'architecture contextuelle obligatoire est strictement préservée :
  - **Racine (`categories`)** : le rail affiche les domaines issus de `domains` avec leurs libellés, leur ordre et leurs icônes via `KnowledgeHubCategoryIcon` ;
  - **Domaine (`domain`)** : le rail affiche uniquement les sections du domaine actif (`EXPERTISE_CHAPTERS` pour Expertise KREDO, `TALENTS_CHAPTERS` pour Talents, ou les sections dérivées de `subItems` pour les autres domaines) ;
  - La sélection d'une section active est matérialisée par `active === true` et `aria-current="page"`.
- Une source de vérité unique et typée centralise la résolution de la navigation et des libellés (`getKnowledgeHubDomainChapters`, `getKnowledgeHubActiveLabel`, `getKnowledgeHubDefaultSection`) ;
- Le chapeau canonique affiche `Knowledge Hub` (navy, texte blanc, gras, centré horizontalement et verticalement, largeur 11.5rem / 184px) et son action `home.onSelect` ramène à l'accueil du Hub `{ type: "categories" }` sans dupliquer de bouton retour ;
- Le header principal Desktop applique l'invariant SHELL-0018 en affichant le titre exact du contexte actif :
  - `Catégories` à la racine ;
  - Le libellé exact de la section active en consultation de domaine (`Practices`, `Métiers`, `Équipe`, `Alumni`, etc.) ;
  - Le nom du domaine en fallback si aucune sectionId n'est active ;
- Les titres métier internes de consultation (`Expertise KREDO`, `Talents`) sont protégés et conservés dans leurs vues respectives sans collision visuelle ;
- Toutes les données, filtres, cartes et modèles métier (Expertise, Talents, REX, AO, etc.) restent strictement protégés et inchangés.

### Modules contextuels

- Les deux modules contextuels propres au Knowledge Hub (`Ateliers` / `workshop` et `Interroger` / `ask`) sont conservés dans `contextualModules` sous réserve de disponibilité de l'action (`onOpenModal`) ;
- L'état actif des modules reflète `activeModal` ;
- Lorsque `onOpenModal` est absent, `contextualModules` est `undefined`, garantissant l'absence de tout bouton mort ou placeholder trompeur ;
- Les modales `KnowledgeHubModuleModal` et leur chargement dynamique sont rigoureusement préservés.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** sans erreur ;
2. `npm test -- src/features/knowledge-hub/KnowledgeHubLocalNavigation.test.ts src/components/layout/SectionRail.test.ts` : **17/17 tests passés** ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des fichiers créés et modifiés : **passé sans erreur ni warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès.

### Limites et dettes restantes

- L'état de navigation principal `activeView` reste un état local dans ce lot ; l'URLisation du Knowledge Hub reste une dette de Phase 4 SHELL-0018 conformément au cadrage ;
- Aucune modification Mobile (la vue mobile `KnowledgeHubMobile` et la partie mobile de `KnowledgeLibraryMode` sont inchangées) ;
- Aucune modification Supabase, RLS, RPC, fetch métier ou workflow n8n ;
- Aucune régression technique connue ne subsiste dans le périmètre du lot.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Lot 2.8 techniquement livré.**

## 20. Clôture du Lot 5.1 — Finance

### Fichiers modifiés, créés et supprimés

- `src/components/finance/FinanceLocalNavigation.tsx` (nouveau composant adaptateur `SectionRail`, configuration et helpers URL) ;
- `src/components/finance/FinanceDesktopDashboard.tsx` (intégration du SectionRail, suppression de `FinanceTabs`, URL comme source de vérité) ;
- `src/components/finance/FinanceTabs.tsx` (supprimé — composant horizontal legacy orphelin après migration) ;
- `src/components/finance/FinanceLocalNavigation.test.ts` (nouveaux tests unitaires et de contrat) ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`.

### Architecture retenue

- La barre horizontale legacy `FinanceTabs` a été définitivement supprimée de la vue Desktop et du repository ;
- Le rail secondaire Desktop délègue sa présentation à la primitive canonique `SectionRail` via l'adaptateur léger `FinanceLocalNavigation` ;
- Largeur canonique standard `11.5rem` (`184px`) respectée sans débordement ni scroll horizontal ;
- Le chapeau canonique affiche `Finance` (navy, texte blanc, gras, centré horizontalement et verticalement, largeur 11.5rem / 184px) et son action `home.onSelect` ramène au chapitre racine `synthesis` via la navigation URL standard ;
- La configuration Desktop unique et typée `FINANCE_DESKTOP_CHAPTERS` sert de source de vérité pour les trois chapitres :
  1. `synthesis` : « Synthèse »
  2. `profitability` : « Rentabilité missions »
  3. `forecast` : « Prévision & simulation »
  conservant strictement leurs clés, leur ordre et leurs libellés canoniques ;
- L'attribut accessible `aria-current="page"` matérialise l'état actif du chapitre courant ;
- Le header principal de `DesktopAnalyticalPage` applique l'invariant SHELL-0018 en affichant dynamiquement le nom exact du chapitre actif (`Synthèse`, `Rentabilité missions` ou `Prévision & simulation`), dérivé de `getFinanceDesktopChapterLabel(activeTab)` au lieu du titre générique statique `Cockpit Financier & Rentabilité` ;
- Distinction stricte des deux rails : le nouveau `SectionRail` gauche (184px) est la navigation locale, tandis que le rail contextuel droit `rail={...}` de `DesktopAnalyticalPage` (analyse des risques sur Synthèse, outil de simulation sur Prévision & simulation) est intégralement préservé sans interférence ;
- Les actions du header (`PageQuickActions`) restent intégralement préservées dans leur composant dédié (Rapport financier, Simulation, Synthèse direction, Arbitrage N+1) et ne sont ni déplacées ni dupliquées.

### URL comme source de vérité

- L'état de navigation n'utilise plus un `useState` local non reconstructible : `activeTab` est dérivé directement de `useSearchParams()` via le helper pur `parseFinanceTab` ;
- Mapping URL canonique sans duplication :
  - `/finance` → `synthesis` (racine canonique)
  - `/finance?tab=profitability` → `profitability`
  - `/finance?tab=forecast` → `forecast`
  - Valeur inconnue ou absente → fallback déterministe vers `synthesis` ;
- La navigation par `buildFinanceHref` supprime le paramètre `tab` pour l'état racine `synthesis` et préserve tous les éventuels autres query params de la page ;
- La navigation par `router.push()` crée une véritable entrée d'historique (Back, Forward, refresh, lien partagé).

### Modules contextuels

- Aucun module contextuel n'étant requis pour ce lot, `contextualModules` est explicitement défini à `undefined` ;
- La section Modules n'est donc pas rendue dans le rail, évitant tout bouton mort ou placeholder artificiel.

### Mobile — protection absolue

- Le branchement serveur conditionnel dans `src/components/finance/index.tsx` basé sur `getDashboardDevice()` reste strictement intact ;
- Aucun composant Desktop lourd n'est importé ni rendu côté Mobile ;
- `FinanceMobileDashboard.tsx`, `getFinanceMobileDashboardData()` et `getDashboardDevice()` ne sont aucunement modifiés.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** sans erreur ;
2. `npm test -- src/components/finance/FinanceLocalNavigation.test.ts src/components/layout/SectionRail.test.ts src/components/finance/` : **16/16 tests passés** (et **14/14 tests passés** sur l'ensemble de Finance) ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des fichiers créés et modifiés : **passé sans erreur** ; les 3 warnings `<img>` préexistants sur `FinanceDesktopDashboard.tsx` restent inchangés ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès en production.

### Limites et dettes restantes

- Aucune dette de routage : l'état Finance est désormais entièrement URL-addressable ;
- Aucune modification Supabase, RLS, RPC, fetch métier ou workflow n8n ;
- Aucune régression technique connue ne subsiste dans le périmètre du lot.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Lot 5.1 techniquement livré.**

## 21. Lot 3.1 — Standardisation des modules contextuels

### Rails audités

- Account Intelligence ;
- Business Intelligence ;
- Veille & actualités ;
- Rapports & rédaction ;
- Automatisations ;
- Engagements ;
- Prospection ;
- Knowledge Hub ;
- Finance ;
- tous les consommateurs réels de `SectionRail` et de `contextualModules` retrouvés dans le code
  au HEAD `4c8ca03b`.

La matrice de décision complète vit dans
`docs/navigation_architecture/SHELL-0018/05-CONTEXTUAL-MODULES-MATRIX.md`.

### Modules conservés

- Account Intelligence : `Répertoire`, `Bibliothèque`, `Playbook`, chacun sous sa garde de
  contexte et d'action existante ;
- Business Intelligence : `Études sectorielles` et `Playbooks`, désormais sous double garde du
  callback et de `workspace.coverage` pour le segment actif ;
- Veille & actualités : `Gestion des sources`, uniquement avec son callback réel ;
- Knowledge Hub : `Ateliers`, avec son callback et son état actif existants.

### Module retiré

- Knowledge Hub : `Interroger` a été retiré du rail. L'ouverture locale existe, mais la capacité
  affiche « Bientôt disponible » et son bouton `Envoyer` est durablement désactivé. La modale
  métier n'est ni supprimée ni reconstruite, et aucun déplacement vers Cockpit Intelligence
  n'est effectué dans ce lot.

### Pages sans Modules

Rapports & rédaction, Automatisations, Engagements, Prospection et Finance restent sans section
`Modules`. Aucun module n'est créé pour remplir artificiellement la zone.

Les builders conditionnels Account Intelligence, Business Intelligence et Veille renvoient
désormais `contextualModules: undefined` lorsque leur tableau d'entrées disponibles est vide.
Knowledge Hub respectait déjà ce contrat sans callback. La primitive `SectionRail` n'a pas été
modifiée.

### Factorisation

Aucune factorisation transverse n'est introduite. Les capacités homonymes n'ont pas toutes le
même contexte ni le même mécanisme d'ouverture ; chaque page conserve donc son adaptateur local.
Le contrat TypeScript existant de `SectionRailEntry` garantit déjà qu'une entrée possède soit un
`href`, soit un `onSelect`, sans permettre une entrée sans action.

### Tests et gates

Exécutés dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** ;
2. tests ciblés des neuf rails Desktop, de `SectionRail` et des contrats Business Intelligence :
   **13 fichiers / 113 tests passés** ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des neuf fichiers applicatifs et de test modifiés : **passé sans erreur ni
   warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7, TypeScript et génération des 41
   pages statiques terminées avec succès.

Les assertions ajoutées couvrent `contextualModules === undefined`, les gardes de disponibilité
BI, le déclenchement des callbacks, la conservation des clés/libellés et l'absence de section
`Modules` ou de bouton disabled lorsque la capacité n'est pas disponible.

### Périmètre protégé et dette

- aucun chapitre, libellé, ordre, clé ou mécanisme de navigation modifié ;
- URLisation Finance préservée ;
- aucun fichier Mobile, Cockpit Intelligence, Supabase, n8n, loader ou donnée métier modifié ;
- aucune dette technique nouvelle dans le périmètre ;
- QA visuelle non exécutée conformément à la consigne du lot, validation réservée à Guillaume.

**Verdict Lot 3.1 : `techniquement livré`.**

## 22. Lot 4.1 — URLisation Veille & actualités

### Contrat de navigation Desktop

- l'ancien `useState<VeilleSection>("news")` a été supprimé de
  `VeilleActualitesDesktop.tsx` ; le chapitre actif est désormais dérivé à chaque rendu de
  `useSearchParams()` via le helper client-safe `parseVeilleSection()` ;
- les changements de chapitre passent par `router.push()` et
  `buildVeilleSectionHref(pathname, searchParams, nextSection)`, ce qui crée une entrée
  d'historique et permet la restauration déterministe par deep-link, refresh, Back et Forward ;
- le paramètre Desktop est `section`. Le paramètre `tab` n'a pas été réutilisé car il appartient
  déjà au contrat Mobile `tab=veille` ; cette séparation évite toute collision Desktop/Mobile ;
- mapping canonique :
  - `/veille` → `news` → `Actualités` ;
  - `/veille?section=watched-accounts` → `Veille ciblée` ;
  - `/veille?section=strategic-analysis` → `Analyses` ;
  - `/veille?section=history` → `Archives` ;
- `section=news`, un paramètre absent et toute valeur inconnue sont lus comme `news`. Lors d'une
  navigation normale vers `news`, le paramètre `section` est supprimé afin de conserver `/veille`
  comme URL racine canonique ;
- le builder part de `new URLSearchParams(searchParams.toString())` et ne modifie que `section`.
  Tous les autres paramètres présents, dont `digestId`, `topic`, `tab`, `companyId` et tout futur
  query param, sont donc préservés.

### Archives, Mobile et modules contextuels

- `HistorySection` ne reçoit plus `onOpenDigest` et ne déclenche plus de changement d'état local.
  Son lien unique `/veille?digestId=...` omet naturellement `section`, donc ouvre le digest dans
  le chapitre racine `news` sans double navigation `router.push` + `Link` ;
- la `key={digest?.id ?? "veille-no-digest"}` de `VeilleActualitesPage` est conservée. Un remount
  du lecteur Desktop reconstruit désormais le chapitre actif depuis l'URL ;
- le contrat Mobile reste inchangé : branche serveur distincte, `initialMobileTab`,
  `initialMobileCompanyId`, `tab=veille` et `companyId` n'ont pas été modifiés ;
- le contrat du Lot 3.1 reste inchangé : `Gestion des sources` demeure conditionnée par
  `onOpenSourceManagement` et `contextualModules` reste `undefined` sans module disponible ;
- aucun loader, fetch, état métier/UI, composant Mobile, contrat `topic`/`digestId`, élément visuel,
  accès Supabase, RPC, RLS, n8n ou tracking de run n'a été modifié.

### Tests et gates

Les tests ciblés couvrent le parsing de `undefined`, `null`, des quatre valeurs valides et d'une
valeur inconnue ; la suppression de `section` pour `news` ; l'ajout des autres chapitres ; la
préservation des paramètres existants ; l'état actif du `SectionRail` ; le titre de header ; le
contrat structurel `useSearchParams()` + `router.push()` ; le lien Archives → Digest ; le remount
par `key` ; ainsi que les invariants Mobile et modules contextuels.

Gates exécutées dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** après mise à l'écart récupérable du cache `.next` périmé qui
   contenait deux déclarations générées dupliquées ;
2. `npm test -- src/components/veille/veille-desktop-contracts.test.ts src/components/layout/SectionRail.test.ts src/features/source-management/__tests__/source-management-components.test.ts src/components/veille/mobile/veille-mobile-view-models.test.ts` : **103/103 tests passés** ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des trois fichiers applicatifs et de test modifiés : **passé sans erreur** ; trois
   warnings préexistants et hors périmètre restent inchangés ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7, TypeScript et génération des 41 pages
   statiques terminées avec succès.

**QA visuelle, Back/Forward réel et ergonomique : non exécutés conformément à la consigne du lot ;
validation réservée à Guillaume.**

**Verdict Lot 4.1 : `techniquement livré`.**

## 23. Lot 4.2 — URLisation Account Intelligence

### Contrat URL Desktop

- le paramètre retenu est `aiSection`. `tab` n'est pas utilisé car ce nom appartient déjà aux
  contrats de tabs du périmètre CRM ; cette séparation empêche toute collision avec le shell et
  ses onglets entité ;
- le mapping conserve strictement les sept chapitres, leur ordre, leurs clés, leurs icônes et
  leurs contenus :
  - absence de `aiSection` ou `aiSection=accueil` → `accueil` → `Accueil` ;
  - `aiSection=socle` → `socle` → `Socle` ;
  - `aiSection=connaissance` → `connaissance` → `Entreprise` ;
  - `aiSection=secteur` → `secteur` → `Secteur` ;
  - `aiSection=enjeux` → `enjeux` → `Enjeux` ;
  - `aiSection=strategie` → `strategie` → `Stratégie` ;
  - `aiSection=roadmap` → `roadmap` → `Roadmap` ;
- une valeur inconnue retombe de manière déterministe sur `accueil` ;
- `accueil` est l'état canonique sans paramètre : une navigation normale vers ce chapitre
  supprime `aiSection` et ne génère pas `?aiSection=accueil` ;
- `buildAccountIntelligenceHref()` clone toujours la query via
  `new URLSearchParams(searchParams.toString())` et ne modifie que `aiSection`. Les paramètres
  existants ou futurs sont conservés.

La configuration canonique `CLIENT_INTELLIGENCE_NAV_ITEMS`, son type Desktop, le parser, le
builder URL et le contrôleur pur du mode embedded sont regroupés dans la frontière client-safe
`account-intelligence-desktop-navigation.ts`. Aucune seconde liste de chapitres n'a été créée.

### Route directe

Sur `/prospection/accounts/[companyId]`, `ClientIntelligenceDesktopView` dérive directement le
chapitre actif de `useSearchParams()` avec `parseAccountIntelligenceSection()`. Il ne possède plus
de `useState` pour la position de navigation et aucune boucle `useEffect` URL ↔ état n'a été
introduite.

Le rail et `ClientIntelligenceHomeTab` reçoivent exactement le même contrôleur
`navigateSection()`. Chaque changement de chapitre appelle `router.push()` avec le builder URL :
deep-link, refresh, Back, Forward et partage de lien reposent donc sur l'historique et l'URL. Le
header continue à appeler `getClientIntelligenceDesktopTabLabel(activeTab)` et reste synchronisé
avec la section résolue.

La page serveur `[companyId]/page.tsx`, ses chargements parallèles et la distribution par
`ClientIntelligenceView` sont restés intacts.

### Shell CRM embedded et préservation multi-comptes

`CrmTabbedShell` conserve son invariant existant : tous les `CrmEntityPanel` Desktop restent
montés et les panneaux inactifs sont seulement masqués. La liste des onglets et `activeTabId`
restent gérés et persistés par le `CrmTabStore` existant ; ils ne sont pas URLisés dans ce lot.

Le shell porte un réducteur local dédié aux seules sections Account Intelligence embedded :

- une mémoire de chapitre distincte est indexée par identifiant de panneau ;
- le panneau actif dérive son chapitre de `aiSection` lorsque l'URL est stabilisée ;
- un panneau inactif reçoit sa propre valeur mémorisée et ne suit jamais l'URL du panneau actif ;
- seul le callback du panneau actif peut appeler `router.push()` ; tout appel d'un panneau
  inactif est ignoré ;
- lors d'une réactivation de panneau, sa valeur mémorisée est restaurée dans l'URL avec
  `router.replace()`, sans créer une entrée d'historique pour un changement de tab CRM qui reste
  volontairement hors URL ;
- un état de transition explicite évite qu'une ancienne URL écrase la mémoire du nouveau panneau
  pendant cette restauration ;
- Back/Forward sur le panneau actif met à jour uniquement sa mémoire et son rendu.

Le test de contrat bloquant couvre `compte A → Secteur`, `compte B → Enjeux`, puis retour sur A :
`Secteur` reste actif pour A et `Enjeux` reste mémorisé pour B. Un second test vérifie qu'un
événement URL appliqué à un panneau inactif est ignoré.

Cette mémoire des panneaux inactifs est volontairement locale à l'instance du shell : aucune
nouvelle persistance n'est ajoutée au `CrmTabStore`, conformément au périmètre. Le chapitre du
panneau visible reste, lui, reconstructible après refresh depuis `aiSection`.

### Périmètres protégés

- les règles du Lot 3.1 sont inchangées : Répertoire uniquement avec callback, Bibliothèque
  uniquement avec callback, Playbook uniquement avec slug, et `contextualModules === undefined`
  lorsqu'aucun module n'est disponible ;
- `SectionRail`, `AccountIntelligenceSignatureHeaderDesktop`, la navigation Mobile,
  `MOBILE_NAV_ITEMS`, `TabKey`, `getAccountIntelligenceTabLabel` et le branchement adaptatif ne
  sont pas modifiés ;
- `handleBackToAccounts()`, `useCrmTabStore().setActiveTab("home")` et le retour vers
  `/prospection/accounts` conservent exactement leur comportement ;
- aucun loader, fetch métier, donnée Supabase, RLS, RPC, référence financière, pgvector,
  workflow n8n ou suivi de run n'a été modifié.

### Tests et gates

Les tests ciblés couvrent le parsing des valeurs absentes, valides et inconnues ; le mapping des
sept chapitres ; l'accueil canonique ; l'ajout et la suppression de `aiSection` ; la préservation
des query params tiers ; le pilotage du rail et du Home par le même contrôleur ; la synchronisation
du header ; l'absence de `useState` de navigation directe ; l'usage de `router.push()` ; le maintien
simultané des panneaux embedded ; l'isolation d'un panneau inactif ; Back/Forward sur le panneau
actif ; et le scénario multi-comptes A → B → A.

Gates exécutées dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** ;
2. `npm test -- src/components/accounts-contacts/intelligence/account-intelligence-desktop-navigation.test.ts src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.test.ts src/components/layout/SectionRail.test.ts` : **3 fichiers / 33 tests passés** ;
3. `npm run check:server-boundary` : **passé** ;
4. lint ciblé des six fichiers applicatifs et de test du lot : **passé sans erreur ni warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7, TypeScript et génération des 41
   pages statiques terminées avec succès.

**QA visuelle et test manuel Back/Forward : non exécutés conformément à la consigne du lot ;
validation réservée à Guillaume.**

**Verdict Lot 4.2 : `techniquement livré`.**

## 25. Lot 4.3 — URLisation Rapports & rédaction

### Contrat URL Desktop

- L'état local `const [activeSection, setActiveSection] = useState<ReportsSection>("documents")` a été intégralement supprimé de `ReportsDesktopView.tsx` ;
- Le chapitre actif `activeSection` est désormais dérivé de manière déterministe depuis l'URL via `parseReportsSection(searchParams.get("section"))` ;
- Contrat canonique de navigation :
  - `/reports` → `documents` (« Bibliothèque ») ;
  - `/reports?section=knowledge` → `knowledge` (« Connaissances ») ;
  - `/reports?section=generation` → `generation` (« Génération ») ;
- `documents` est l'état racine canonique sans paramètre : la navigation vers `documents` supprime `section` de l'URL ;
- `parseReportsSection` accepte néanmoins `?section=documents` et le résout vers `documents`, tout comme `null`, `undefined` ou toute valeur inconnue ;
- `buildReportsSectionHref()` part de `new URLSearchParams(searchParams.toString())` et modifie uniquement `section`.

### Préservation des query params et comportements existants

- Tous les query params métier de la page Rapports (`search`, `documentType`, `status`, `entityType`, `entityId`, `ownerId`, `favoritesOnly`, `periodFrom`, `periodTo`, `page`, `doc`) sont strictly conservés lors des changements de chapitre ;
- La distinction entre navigations est respectée :
  - Changement de chapitre → `router.push()` via `buildReportsSectionHref()` (création d'entrée dans l'historique pour Back/Forward/refresh) ;
  - Mutations de filtres, pagination et sélection documentaire → `router.replace()` via `applyUrlMutation()` ;
- `handleReset()` réinitialise les filtres métier sans supprimer `section` (un reset des filtres conserve le chapitre courant) ;
- La sélection documentaire (`?doc=`) est préservée lors du changement de chapitre, permettant de restaurer le contexte Bibliothèque intact au retour ;
- Le header principal affiche dynamiquement le nom du chapitre actif via `getReportsDesktopChapterLabel(activeSection)` ;
- Le chapeau `Rapports & rédaction` déclenche une navigation URL vers l'état racine canonique sans paramètre ;
- L'action « Générer une analyse » et la modale `WatchAnalysisComposerDesktop` restent indépendantes du chapitre de navigation URL ;
- `ReportsMobileView` conserve son propre état local `useState<ReportsSection>("documents")` sans modification ;
- Le branchement adaptatif serveur `getDashboardDevice()` et les loaders dans `src/app/(app)/reports/page.tsx` restent inchangés ;
- `contextualModules` reste `undefined`.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** ;
2. `npm test` : **2551/2551 tests passés** (dont 22/22 sur `ReportsLocalNavigation.test.ts` et `SectionRail.test.ts`) ;
3. `npm run check:server-boundary` : **passé** ;
4. `npx eslint` sur les fichiers modifiés/créés : **passé sans erreur** (1 warning préexistant `setShowFilters` inchangé) ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès.

**QA visuelle et test manuel Back/Forward : non exécutés conformément à la consigne du lot ; validation réservée à Guillaume.**

**Verdict Lot 4.3 : `techniquement livré`.**

## 26. Clôture du Lot 4.4 — URLisation Automatisations

### Fichiers modifiés et créés

- `src/components/automations/automations-desktop-navigation.ts` (nouveaux helpers client-safe `parseAutomationsSection` et `buildAutomationsSectionHref`) ;
- `src/components/automations/automations-desktop-navigation.test.ts` (nouveaux tests unitaires purs de parsing et de construction URL) ;
- `src/components/automations/AutomationsDesktopDashboard.tsx` (suppression du `useState` local, URL comme source de vérité) ;
- `src/components/automations/AutomationsLocalNavigation.tsx` (réexport du type client-safe `AutomationsTabKey`) ;
- `src/components/automations/AutomationsLocalNavigation.test.ts` (contrats de navigation URL et assertions d'isolation) ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md`.

### Architecture retenue et contrat URL

- L'état local `const [activeTab, setActiveTab] = useState<AutomationsTabKey>("journal")` a été intégralement supprimé de `AutomationsDesktopDashboard.tsx` ;
- Le chapitre actif `activeTab` est désormais dérivé de manière déterministe depuis l'URL via `parseAutomationsSection(searchParams.get("section"))` ;
- Contrat canonique de navigation :
  - `/automations` → `journal` (« Journal d'exécution ») ;
  - `/automations?section=sante` → `sante` (« Santé des workflows ») ;
  - `/automations?section=couts` → `couts` (« Coûts ») ;
- `journal` est l'état racine canonique sans paramètre : la navigation vers `journal` supprime `section` de l'URL ;
- `parseAutomationsSection` accepte néanmoins `?section=journal` et le résout vers `journal`, tout comme `null`, `undefined` ou toute valeur inconnue ;
- `buildAutomationsSectionHref()` part de `new URLSearchParams(searchParams.toString())` et modifie uniquement `section` ;
- Les changements de chapitre utilisent `router.push()` avec `{ scroll: false }`, créant une véritable étape dans l'historique de navigation (Back, Forward, refresh, deep-link, lien partagé).

### Préservation intégrale et orthogonalité de ?run=

- La route `/automations?run=<id>` continue de fonctionner à l'identique : `initialRunId` extrait par `page.tsx` et transmis au Desktop initialise `selectedRunId` et `dialogOpen` pour ouvrir directement `RunDrillDownDialog` ;
- `section` et `run` sont totalement orthogonaux :
  - `/automations?run=abc` résout `section` par défaut sur `journal` et ouvre la modale du run `abc` ;
  - un changement de chapitre depuis `/automations?run=abc` vers Santé produit `/automations?run=abc&section=sante` ;
  - un retour vers le Journal produit `/automations?run=abc` (en supprimant `section` et en conservant `run`) ;
- Aucun reset ni suppression automatique du paramètre `run` n'a été introduit lors de la navigation dans le rail.

### Composants et états métier préservés

- Le header principal Desktop continue d'afficher le titre du chapitre actif (`Journal d'exécution`, `Santé des workflows` ou `Coûts`) via `getAutomationsDesktopChapterLabel(activeTab)` accompagné de l'indicateur `Live Telemetry` ;
- Le chapeau canonique `Automatisations` ramène au chapitre racine `journal` tout en préservant les query params existants ;
- Tous les états React locaux (`selectedRunId`, `dialogOpen`, `metricsOpen`, `simulatorModalOpen`, `selectedWorkflowForModal`, `sort`, `periodFilter`, `statusFilter`, `companyFilter`, `showAllJournalRows`, `costPeriod`, `showAllCostWorkflows`) sont intégralement conservés ;
- Le hook temps réel `useRunJournalRealtime`, le cycle de vie realtime et les statuts live restent strictement inchangés ;
- `AutomationsMobileDashboard.tsx` ne subit aucune modification et reste totalement indépendant du contrôleur URL Desktop ;
- `contextualModules` reste `undefined`.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** sans erreur ;
2. `npm test -- src/components/automations/ src/components/layout/SectionRail.test.ts` : **52/52 tests passés** (et **2560/2560 tests passés** sur la suite complète `npm test`) ;
3. `npm run check:server-boundary` : **passé** ;
4. `npx eslint` sur les fichiers modifiés/créés : **passé sans erreur ni warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès en production.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Verdict Lot 4.4 : `techniquement livré`.**

## 27. Clôture du Lot 4.5 — URLisation Prospection Intelligence

### Fichiers modifiés et créés

- `src/features/prospection-intelligence/desktop/prospection-intelligence-desktop-navigation.ts` (nouveaux helpers client-safe `parseProspectionSection` et `buildProspectionSectionHref`) ;
- `src/features/prospection-intelligence/desktop/prospection-intelligence-desktop-navigation.test.ts` (nouveaux tests unitaires purs de parsing et de construction URL) ;
- `src/features/prospection-intelligence/desktop/ProspectionIntelligenceDesktop.tsx` (suppression du `useState<PiTabKey>` local, URL comme source de vérité) ;
- `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx` (réexport du type client-safe `PiTabKey`) ;
- `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.test.ts` (contrats de navigation URL et assertions d'isolation) ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md` (correction documentaire de l'index 4.2 et enregistrement du Lot 4.5).

### Architecture retenue et contrat URL

- L'état local `const [activeTab, setActiveTab] = useState<PiTabKey>("strategy")` a été intégralement supprimé de `ProspectionIntelligenceDesktop.tsx` ;
- Le chapitre actif `activeTab` est désormais dérivé de manière déterministe depuis l'URL via `parseProspectionSection(searchParams.get("section"))` ;
- Contrat canonique de navigation :
  - `/prospection-intelligence` → `strategy` (« Brief ») ;
  - `/prospection-intelligence?section=chapter_1` → `chapter_1` (« Fenêtres d'opportunités ») ;
  - `/prospection-intelligence?section=chapter_2` → `chapter_2` (« Approches commerciales ») ;
  - `/prospection-intelligence?section=chapter_3` → `chapter_3` (« Playbooks ») ;
- `strategy` est l'état racine canonique sans paramètre : la navigation vers `strategy` supprime `section` de l'URL ;
- `parseProspectionSection` accepte néanmoins `?section=strategy` et le résout vers `strategy`, tout comme `null`, `undefined` ou toute valeur inconnue ;
- `buildProspectionSectionHref()` part de `new URLSearchParams(searchParams.toString())` et modifie uniquement `section` ;
- Les changements de chapitre utilisent `router.push()` avec `{ scroll: false }`, créant une véritable étape dans l'historique de navigation (Back, Forward, refresh, deep-link, lien partagé).

### Préservation des états métier et des filtres

- Le header principal Desktop continue d'afficher le titre du chapitre actif (`Brief`, `Fenêtres d'opportunités`, `Approches commerciales` ou `Playbooks`) via `getProspectionDesktopChapterLabel(activeTab)` ;
- Le chapeau canonique `Prospection` ramène au chapitre racine `strategy` tout en préservant les eventuals query params existants ;
- Tous les états React locaux métier (`period`, `selectedSector`, `searchQuery`, `selectedAccountId`, `isAccountsOpen`) sont intégralement conservés lors de la navigation entre chapitres ;
- Les trois chapitres métier encore en cours de développement (`chapter_1`, `chapter_2`, `chapter_3`) et leurs conteneurs sont maintenus intacts ;
- La redirection serveur historique de `/prospection` vers `/intelligence` (`src/app/(app)/prospection/page.tsx`) reste inchangée ;
- La détection du device serveur et la vue Mobile placeholder restent inchangées ;
- `contextualModules` reste `undefined`.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** sans erreur ;
2. `npm test -- src/features/prospection-intelligence/ src/components/layout/SectionRail.test.ts` : **23/23 tests passés** (et **2560/2560 tests passés** sur la suite complète `npm test`) ;
3. `npm run check:server-boundary` : **passé** ;
4. `npx eslint` sur les fichiers modifiés/créés : **passé sans erreur ni warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès en production.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Verdict Lot 4.5 : `techniquement livré`.**

## 28. Lot 4.6 — URLisation Knowledge Hub

### Architecture & modifications apportées

- Suppression intégrale de `useState<KnowledgeView>` dans `KnowledgeHubDesktop.tsx` ;
- Création d'une frontière pure client-safe `src/features/knowledge-hub/knowledge-hub-desktop-navigation.ts` contenant :
  - `parseKnowledgeHubView(domainRaw, sectionRaw)` : dérive `KnowledgeView` depuis l'URL de manière déterministe ;
  - `buildKnowledgeHubViewHref(pathname, searchParams, nextView)` : construit les URLs canoniques en conservant les query params tiers ;
  - helpers purs de domaines/sections (`KnowledgeHubSectionChapter`, `EXPERTISE_CHAPTERS`, `TALENTS_CHAPTERS`, `getKnowledgeHubDefaultSection`, `getKnowledgeHubDomainChapters`, `getKnowledgeHubActiveLabel`) ;
- Re-export de ces helpers depuis `KnowledgeHubLocalNavigation.tsx` pour préserver le contrat existant sans duplication ;
- `KnowledgeHubDesktop.tsx` dérive `activeView` via `useSearchParams()` et contrôle les navigations via `router.push(buildKnowledgeHubViewHref(...), { scroll: false })` ;
- `handleSelectDomain` (cartes de la racine) et `onChangeView` (rail) utilisent le même contrôleur unique ;
- Navigation hiérarchique :
  - Racine canonique `/knowledge` -> `{ type: "categories" }` ;
  - Domaines avec section par défaut (`expertise-kredo` -> `practices`, `talents` -> `team`) ;
  - Domaines génériques sans section par défaut (`clients-markets`, etc.) ;
  - Validation stricte du domaine et de la section avec fallbacks déterministes (domaine inconnu -> `categories`, section invalide -> section par défaut ou domaine sans section) ;
- Le header principal reste synchronisé avec `getKnowledgeHubActiveLabel(activeView)` ;
- `activeModal` reste un état local (`useState<"workshop" | "ask" | null>(null)`) pour la modale Ateliers ;
- Vue Mobile inchangée (`KnowledgeHubMobile`) ;
- Aucune modification Data, Supabase, RLS, RPC, snapshot ni n8n.

### Validation technique

Exécutée dans l'ordre prescrit le 2026-09-08 :

1. `npm run typecheck` : **passé** ;
2. `npm test -- src/features/knowledge-hub/ src/components/layout/SectionRail.test.ts` : **37/37 tests passés** (et **2587/2587 tests passés** sur la suite complète `npm test`) ;
3. `npm run check:server-boundary` : **passé** ;
4. `npx eslint` sur les fichiers modifiés/créés : **passé sans erreur ni warning** ;
5. `npm run build` : **passé**, compilation Next.js 16.2.7 (Turbopack), TypeScript et génération des 41 pages statiques terminées avec succès.

**QA visuelle : non exécutée conformément à la règle projet ; validation réservée à Guillaume.**

**Verdict Lot 4.6 : `techniquement livré`.**

## 29. Lot 4.7 — Audit et clôture Phase 4

### SHA audité
- `918f55d9` (main synchronisé avec origin/main).

### Surfaces auditées
- Les 9 surfaces Desktop canoniques :
  1. Engagements (`/missions`)
  2. Business Intelligence (`/intelligence`)
  3. Account Intelligence (`/prospection/accounts/[companyId]`)
  4. Veille & actualités (`/veille`)
  5. Rapports & rédaction (`/reports`)
  6. Automatisations (`/automations`)
  7. Prospection Intelligence (`/prospection-intelligence`)
  8. Knowledge Hub (`/knowledge`)
  9. Finance (`/finance`)

### Recherches effectuées
- Recherches ripgrep exhaustives sur l'ensemble de `src/app`, `src/components`, `src/features` :
  - `SectionRail`, `LocalNavigation`, `activeTab`, `activeSection`, `activeView`, `setActiveTab`, `setActiveSection`, `setActiveView` ;
  - `useState<`, `useSearchParams`, `usePathname`, `useRouter`, `router.push`, `router.replace` ;
  - `SectionNavBar`, `SectionNavBarSlot`, `useSidebarCollapse`.

### Exceptions locales légitimes
- Confirmées conformes à l'ADR-0018 V2 :
  - Mode embedded CRM multi-comptes (`CrmTabbedShell`) : mémoire locale isolée par panneau via réducteur pur (`embeddedAccountIntelligenceNavigationReducer`), synchronisation avec l'URL (`?aiSection=`) sur le panneau actif, restauration via `router.replace()`, direct route sans mémoire ;
  - Paramètres orthogonaux préservés : `?run=` sur Automatisations, `?doc=` sur Rapports, `?segment=` sur Business Intelligence ;
  - États UI locaux métier : filtres, modales, dialogues, accordéons, tri de tables (`sort`).

### Statut des neuf navigations
- 9/9 conformes au contrat URL-driven :
  - Chaque navigation Desktop est reconstructible après refresh depuis l'URL ou le contrat embedded documenté ;
  - Aucun rail principal ne repose sur un `useState` éphémère ;
  - Chaque header principal affiche dynamiquement le libellé exact du chapitre actif.

### État des anciens `SectionNavBar*`
- `SectionNavBarSlot` monté dans 6 layouts :
  - 4 no-ops au runtime (`automations`, `knowledge`, `finance`, `prospection`) car aucun onglet dans `main-menu.config.ts` ;
  - 2 consommateurs actifs : `missions/(tabbed)` et `consultants` ;
  - Risque et plan de traitement documentés pour Phase 6.

### Réconciliation des anciens statuts QA
- Conformément à la règle projet (la QA visuelle est réservée exclusivement à Guillaume et son absence ne bloque pas une livraison technique) :
  - Lots 1.0, 1.1 et 2.6 réconciliés vers `✅ techniquement livré — QA visuelle réservée à Guillaume`.

### Fichiers documentaires mis à jour et créés
- `docs/navigation_architecture/SHELL-0018/04-CURRENT-NAVIGATION-INVENTORY.md` (remis à niveau avec le code actuel) ;
- `docs/navigation_architecture/SHELL-0018/06-PHASE-4-CLOSURE-AUDIT-2026-09-08.md` (rapport de clôture de Phase 4) ;
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md` (mise à jour du ledger et clôture Phase 4).

### Tests et gates exécutés
- `npm run typecheck` : **passé** ;
- `npm run check:server-boundary` : **passé** ;
- Suite vitest ciblée sur les 9 surfaces, la primitive et les helpers de navigation : **21 fichiers / 249 tests passés** ;
- 0 modification de code applicatif dans ce lot.

### Verdict
- **Phase 4 — ✅ close techniquement.**

---

## 30. Prochaine étape — Entrée Phase 6 (Refonte Shell global)

La standardisation du menu secondaire et l'URLisation des navigations secondaires Desktop (Phases 1 à 4) étant achevées, le chantier passe à la **Phase 6 — Refonte Shell global** :
1. Arbitrage du comportement du menu principal Desktop (push vs overlay vs rail permanent) ;
2. Migration du module « Équipe » (`/consultants`) et unification des sous-routes `/missions` ;
3. Retrait définitif de `SectionNavBarSlot`, `SectionNavBar` et simplification de `useSidebarCollapse` ;
4. Intégration globale avec Cockpit Intelligence.

---

## 31. Lot 6.0 — Audit d'entrée & architecture cible du Shell global Desktop

> **Date :** 2026-09-09
> **Baseline :** `e0cab6f5` (main, synchronisé avec origin/main)
> **Objectif :** Auditer le Shell global Desktop réel, reconstruire tous les inventaires depuis le code de HEAD, définir l'architecture cible, produire la roadmap Phase 6 exécutable.
> **Code applicatif modifié :** 0

### Résultat de l'audit

**Document canonique produit :**
```
docs/navigation_architecture/SHELL-0018/08-PHASE-6-ENTRY-AUDIT-AND-TARGET-ARCHITECTURE.md
```

### Inventaires reconstruits depuis le code de HEAD

#### `useSidebarCollapse` — 12 fichiers, 11 consommateurs uniques
- 1 récepteur : `DesktopSidebar.tsx`
- 2 émetteurs légitimes : `IntelligencePanel.tsx`, `CrmTabbedShell.tsx`
- 8 émetteurs historiques (pattern `useEffect requestCollapse/requestRestore` au montage) : `ConsultantsDesktopShell`, `OpportunitiesDesktopShell`, `EngagementsDesktopView`, `ReportsDesktopView`, `BusinessIntelligenceDesktop`, `KnowledgeHubDesktop`, `VeilleActualitesDesktop`, `ProspectionIntelligenceDesktop`
- 1 lecteur marginal : `ProspectionIntelligenceHeader` (lit `isCollapsed` pour un séparateur visuel)

> **Évolution depuis le handoff Phase 4 :** +2 émetteurs (`ConsultantsDesktopShell`, `OpportunitiesDesktopShell`) ajoutés par les chantiers Consultants Workspace et Opportunities Workspace.

#### `SectionNavBarSlot` — 6 montages dans les layouts
- 4 no-ops runtime : `automations`, `knowledge`, `finance`, `prospection`
- 2 consommateurs fonctionnels réels : `missions/(tabbed)`, `consultants/(tabbed)`

> Pas de changement depuis le handoff Phase 4 pour ces deux listes — seulement le layout `consultants/layout.tsx` a été restructuré (SectionNavBarSlot descendu dans `(tabbed)` par le chantier Consultants Workspace Lot 1).

#### `SectionNavBar` — 1 consommateur unique (`SectionNavBarSlot.tsx`)

#### `main-menu.config.ts` tabs — 2 entrées :
- `Engagements` (`/missions`) : 3 tabs
- `Équipe` (`/consultants`) : 3 tabs

### Architecture cible définie

- Le Shell global (`AppShell` / `DesktopSidebar`) possède le collapse/expand
- Les workspaces ne pilotent plus directement la sidebar (suppression des 8 usages historiques)
- IntelligencePanel et CrmTabbedShell restent les 2 seuls émetteurs légitimes
- Contrats URL intégralement préservés
- Aucune nouvelle couche créée

### Ordre Phase 6 retenu

```
6.1 — Retrait SectionNavBarSlot no-op (automations, knowledge, finance, prospection)
6.2 — Shell Consultants + Consultants Lot 14 (routes tabbed, useSidebarCollapse)
6.3 — Missions historiques + Opportunities Lot 11 (routes tabbed, useSidebarCollapse)
6.4 — Retrait définitif SectionNavBarSlot + SectionNavBar + configs legacy
6.5 — Stabilisation DesktopSidebar + démantèlement useSidebarCollapse
6.6 — Intégration Shell ↔ Cockpit Intelligence
6.7 — Audit et clôture Phase 6
```

6.2 et 6.3 sont parallélisables. 6.4 dépend de 6.1+6.2+6.3. 6.5 dépend de 6.4.

### Invariants protégés
- Aucun contrat URL modifié
- Aucune feature métier modifiée
- Aucun composant SectionRail touché
- Mobile intégralement protégé

### Gates exécutées
- `git diff --check` : **passé** (0 modification applicative)
- Recherches statiques exhaustives (`grep`) pour prouver les inventaires

### Limites
- QA visuelle : réservée à Guillaume
- Lot purement documentaire — aucun gate applicatif exécuté (aucun code modifié)

### Verdict
- **Lot 6.0 — ✅ livré.** Architecture de démantèlement suffisamment sûre pour lancer SHELL 6.1 sans nouvel audit général.

## 30. Clôture du Lot 6.1 — Retrait des `SectionNavBarSlot` no-op

### Objectif
Supprimer les 4 montages inutiles de `SectionNavBarSlot` dans les layouts où le composant retournait déjà `null` au runtime, sans toucher aux consommateurs réels ni aux composants legacy.

### Baseline
`6199487a` (`docs(shell-0018): audit phase 6 global shell architecture`), complété par le commit `e6550db8` (`fix(ui): avoid turbopack parsing failure on account drawer shadow`) pour le build blocker CSS préexistant.

### Fichiers modifiés
- `src/app/(app)/automations/layout.tsx`
- `src/app/(app)/knowledge/layout.tsx`
- `src/app/(app)/finance/layout.tsx`
- `src/app/(app)/prospection/layout.tsx`

### Preuve des no-ops
- `src/components/layout/SectionNavBarSlot.tsx` délègue à `SectionNavBar` qui lit `getSectionTabsForPath()` depuis `main-menu.config.ts`.
- `main-menu.config.ts` ne définit de `tabs` que pour `/missions` et `/consultants`.
- Pour `/automations`, `/knowledge`, `/finance` et `/prospection`, `getSectionTabsForPath()` retournait `[]` et `SectionNavBar` retournait `null`.
- Aucun changement fonctionnel, structurel, CSS ou URL.

### Build blocker préexistant identifié & résolu séparément
- Erreur de parsing Turbopack CSS : `Parsing CSS source code failed ./src/app/globals.css:13036 Unexpected token Delim('!')`.
- Cause : parsing d'une valeur arbitraire complexe Tailwind `shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(255,152,0,0.24)]` dans `CompanyIdentityDrawer.tsx`.
- Résolution : classe CSS dédiée `.kredo-company-identity-cta-shadow` dans `globals.css` et `CompanyIdentityDrawer.tsx`.
- Livré dans un commit dédié préalable : `e6550db8`.

### Gates exécutées
- `npm run typecheck` : **passé** (0 erreur)
- `npm run check:server-boundary` : **passé**
- `npx eslint` ciblé sur les 4 layouts : **passé** (0 erreur, 0 warning)
- `npm run build` : **passé** (Turbopack, 42/42 pages générées)
- `git diff --check` : **passé**

### Limites et dettes restantes
- `SectionNavBarSlot` et `SectionNavBar` restent présents dans le codebase pour les sous-routes historiques `missions/(tabbed)` et `consultants/(tabbed)`.
- Ces consommateurs et composants seront démantelés dans les lots 6.2, 6.3 et 6.4.
- QA visuelle : réservée à Guillaume.

### Verdict
- **Lot 6.1 — ✅ techniquement livré.**

---

## 32. Clôture du Lot 6.2 — Shell Consultants + Consultants Lot 14

### Objectif
Finaliser l'intégration du workspace Consultants au Shell V2 : supprimer le dernier `SectionNavBarSlot` Consultants (`consultants/(tabbed)/layout.tsx`) et le route group `(tabbed)`, préserver les deep-links historiques `/consultants/activite-conges` et `/consultants/pool-competences` par des redirections permanentes déplacées via `git mv`, retirer `useSidebarCollapse` de `ConsultantsDesktopShell`, intégrer Consultants dans le groupe `CRM` du menu principal (`mainMenuItems`) en supprimant l'ancien libellé « Équipe », l'entrée globale « Recrutement » et le groupe vide « Ressources », et sécuriser le contrat Mobile `getMobileTabsForPath("/consultants")` via `CONSULTANTS_SECTIONS` (5 destinations canoniques).

### Baseline
`02c316e0` (`refactor(shell-0018): remove no-op section nav slots`), `main` synchronisé avec `origin/main`.

### Fichiers modifiés / déplacés
- `src/app/(app)/consultants/(tabbed)/layout.tsx` — **supprimé** (dernier `SectionNavBarSlot` du workspace et route group `(tabbed)` éliminés).
- `src/app/(app)/consultants/activite-conges/page.tsx` — **déplacé via `git mv`** (redirection permanente vers `/consultants?section=activite-conges` préservée).
- `src/app/(app)/consultants/pool-competences/page.tsx` — **déplacé via `git mv`** (redirection permanente vers `/consultants?section=pool-competences` préservée).
- `src/features/consultants/desktop/ConsultantsDesktopShell.tsx` — suppression de `useSidebarCollapse` et du hook `useEffect` (`requestCollapse/requestRestore`).
- `src/lib/navigation/main-menu.config.ts` — renommage du groupe `Commerce` en `CRM`, renommage `CRM - Comptes` en `Comptes & contacts`, déplacement de `Consultants` sous `CRM` (sans `tabs`, icône `equipe`), suppression de l'entrée globale `Recrutement` et du groupe `Ressources` vide, ajout de la résolution explicite mobile pour `/consultants` via `CONSULTANTS_SECTIONS`.
- `src/features/consultants/navigation/consultants-sections.test.ts` — remplacement des tests d'invariants obsolètes par la validation de l'absence de `SectionNavBarSlot`, de la suppression de `(tabbed)`, de la persistance des 2 routes legacy redirigeant canoniquement, et de l'absence de `useSidebarCollapse`.
- `src/lib/navigation/main-menu.config.test.ts` — assertions validant le groupe `CRM`, l'absence de `Ressources` et de `Recrutement`, l'absence de `tabs` sur `Consultants`, et les 5 destinations mobiles.
- `src/features/consultants/recruitment-deprecation.test.ts` — mise à jour de l'assertion menu (NAV-3 résolue).
- `src/features/consultants/activity/activity.test.ts` — mise à jour du chemin de la route historique `activite-conges/page.tsx`.
- `src/app/(app)/consultants/layout.tsx` — mise à jour du commentaire d'en-tête (alignement SHELL 6.2).

### Coordination Consultants Workspace Lot 14
- Décision C-34 actée dans `00-REFERENCE-CHANTIER-CONSULTANTS.md`.
- Résolution définitive de NAV-3 (retrait Recrutement menu global) et NAV-4 (Consultants sous CRM).
- Résolution de LEGACY-3 (suppression de `(tabbed)/layout.tsx`).
- Recadrage du Lot 15 Consultants sur le nettoyage métier orphelin et rapport de clôture `02-CLOSURE-AUDIT.md`.

### Gates exécutées
- `npm run typecheck` : **passé** (après purge `.next` des routes déplacées)
- `npm test -- ...` (tests ciblés) : **38/38 passés**
- `npm run check:server-boundary` : **passé**
- `npx eslint` ciblé : **passé** (0 erreur, 0 warning)
- `npm test` (**suite complète**) : **292 fichiers / 2 891 tests passés (0 échec)**
- `npm run build` : **passé** (Turbopack, 42/42 pages générées, routes `/consultants`, `/consultants/activite-conges`, `/consultants/pool-competences` compilées)
- `git diff --check` : **passé**

### Recherches statiques
- `SectionNavBarSlot` dans `src/app/(app)/consultants` et `src/features/consultants` : **0 occurrence applicative**
- `useSidebarCollapse` dans `src/features/consultants` : **0 occurrence**
- `label: "Recrutement"` dans le menu principal `mainMenuItems` : **0 entrée globale**
- `consultants/(tabbed)` dans `src` : **0 occurrence applicative**

### Limites et dettes restantes
- `SectionNavBarSlot` reste présent uniquement pour `missions/(tabbed)` (réservé Lot 6.3).
- QA visuelle : réservée à Guillaume.

### Prochain lot
- **SHELL 6.3** — Missions historiques + Opportunities Lot 11 (routes tabbed, useSidebarCollapse).

### Verdict
- **Lot 6.2 — ✅ techniquement livré.**
- **Commit coordonné :** `50f1a31e`

## 33. Clôture du Lot 6.3 — Rationalisation Missions historiques + Opportunities Lot 11

### Date
2026-09-09

### Baseline
- SHA de départ : `04cbf1e6` (`docs(shell-0018): record Lot 6.2 and Consultants Lot 14 commit SHA`).
- `main` synchronisé avec `origin/main`.

### Fichiers supprimés
- `src/app/(app)/missions/(tabbed)/layout.tsx` — suppression définitive du dernier layout montant `SectionNavBarSlot` et `MissionsTabbedShell`.
- `src/app/(app)/missions/(tabbed)/actives/page.tsx` — ancien composant métier Desktop supprimé.
- `src/app/(app)/missions/(tabbed)/projets/page.tsx` — ancien composant métier Desktop supprimé.
- `src/components/missions/MissionsTabbedShell.tsx` — shell horizontal legacy Engagements supprimé (0 consommateur résiduel).

### Fichiers créés / déplacés (redirections permanentes)
- `src/app/(app)/missions/actives/page.tsx` — route minimale de compatibilité avec `permanentRedirect("/missions?vue=missions-at")`.
- `src/app/(app)/missions/projets/page.tsx` — route minimale de compatibilité avec `permanentRedirect("/missions?vue=projets")`.

### Fichiers modifiés
- `src/app/(app)/missions/layout.tsx` — mise à jour du commentaire d'en-tête (alignement SHELL 6.3).
- `src/features/opportunities/desktop/OpportunitiesDesktopShell.tsx` — suppression de `useSidebarCollapse` et du hook `useEffect` (`requestCollapse/requestRestore`).
- `src/lib/navigation/main-menu.config.ts` :
  - Renommage de l'entrée CRM `Besoins & Staffing` en `Opportunités` (`href: "/missions/opps"`, icône `staffing`).
  - Retrait des `tabs` legacy sur l'entrée `Engagements` (`tabs: undefined`).
  - Canonisation du lien onglet mobile vers `/missions/opps?section=besoins` (au lieu de `?scope=needs`).
- `src/app/(app)/staffing/page.tsx` — redirection permanente via `permanentRedirect(resolveLegacyStaffingRedirect(await searchParams))`.
- `src/lib/needs-staffing/url-state.ts` — `resolveLegacyStaffingRedirect` redirige vers `/missions/opps?section=besoins` en préservant les filtres autorisés (`stage`, `priority`, `practice`, `sort`, `direction`) et sans jamais injecter `scope` ni `view`.
- Deep-links actifs migrés vers `?vue=missions-at&mission=` et `?vue=projets&projet=` :
  - `src/lib/cockpit/cockpit-desktop-view-model.ts`
  - `src/lib/intelligence/actions/action-priorities-rules.ts`
  - `src/lib/intelligence/actions/detect-risks-rules.ts`
  - `src/lib/intelligence/actions/prepare-day-rules.ts`
  - `src/lib/intelligence/actions/upcoming-deadlines-rules.ts`
  - `src/lib/intelligence/mobile-account-cockpit.ts`
  - `src/components/finance/FinanceDesktopDashboard.tsx`
  - `src/components/intelligence/action-results/AnalyzeMarginsResult.tsx`
- Tests adaptés :
  - `src/lib/navigation/main-menu.config.test.ts` (CRM avec Opportunités, Engagements sans tabs, mobile `?section=besoins`)
  - `src/lib/needs-staffing/url-state.test.ts` (`resolveLegacyStaffingRedirect` vers `?section=besoins`, absence de `scope`/`view`)
  - `src/features/opportunities/navigation/opportunities-sections.test.ts` (tests invariants du shell et compatibilité scope maintenue)
  - `src/lib/navigation/mobile-navigation-history.test.ts` (mise à jour attendu mobile `/missions/opps?section=besoins`)
- Documentation :
  - `src/STRUCTURE.md`
  - `docs/FEATURES/opportunities_workspace/README.md`
  - `docs/FEATURES/opportunities_workspace/00-REFERENCE-CHANTIER-OPPORTUNITES.md` (décision OPP-31, questions NAVIGATION-01 et LEGACY-01 résolues)
  - `docs/FEATURES/opportunities_workspace/01-IMPLEMENTATION-LEDGER.md` (Lot 11 livré techniquement)

### Preuve SectionNavBarSlot — 0 consommateur applicatif
- `rg -n "SectionNavBarSlot" src/app src/components` :
  - Unique résultat : `src/components/layout/SectionNavBarSlot.tsx` (sa propre définition).
  - Aucun consommateur applicatif dans `src/app` ni `src/components`.
  - Prêt pour suppression coordonnée au **SHELL 6.4**.

### Gates exécutées
- `npm run typecheck` : **passé** (0 erreur)
- `npm test -- ...` (tests ciblés) : **57/57 passés**
- `npm run check:server-boundary` : **passé**
- `npx eslint` ciblé : **passé** (0 erreur, 0 warning)
- `npm test` (**suite complète**) : **292 fichiers / 2 896 tests passés (0 échec)**
- `npm run build` : **passé** (Next.js 16.2.7 Turbopack, 42/42 pages générées)
- `git diff --check` : **passé**

### Recherches statiques
- `MissionsTabbedShell` dans `src` : **0 occurrence**
- `useSidebarCollapse` dans `src/features/opportunities` : **0 occurrence**
- `scope=needs|scope=staffing` nouvellement générés : **0 occurrence** (uniquement tests & `parseOpportunitiesSection` pour compatibilité d'entrée)
- Deep-links utilisateurs actifs vers `/missions/actives` ou `/missions/projets` : **0 occurrence résiduelle**

### Prochain lot
- **SHELL 6.4** — Retrait définitif de `SectionNavBarSlot`, `SectionNavBar`, `section-tab-styles.ts`, `SectionTab`, `getModuleTabs`, `getSectionTabsForPath`.
- **Opportunities Lot 12** — Nettoyage et clôture.

### Verdict
- **Lot 6.3 — ✅ techniquement livré.**
- **Commit coordonné :** `12ea8166` (`refactor(shell-0018): finalize missions and opportunities navigation`)

---

## 34. Lot 6.3R — Rebaseline architecture cible finale de navigation

> **Nature :** documentaire uniquement. **Aucun fichier applicatif modifié.**
> **Baseline Git :** `972c647b` (`main` = `origin/main`, non avancé).

### Objet

Figer la nouvelle architecture cible de navigation KREDO (décidée après SHELL 6.2 + Consultants
Lot 14 et SHELL 6.3 + Opportunities Lot 11) comme **source de vérité canonique**, et superséder
explicitement les anciennes cibles lorsqu'elles divergent.

### Livrables

- **Créé :** `09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` — cible canonique :
  - Partie A : navigation principale Desktop (menu global) ;
  - Partie B : architecture interne de 11 workspaces (chapitres / modules) ;
  - Partie C : matrice exhaustive CURRENT → TARGET (colonnes Workspace / Niveau / Current /
    Target / Traitement / Preuve code / Lot futur ; valeurs `KEEP` `RENAME` `MOVE` `REUSE`
    `TRANSFORM` `NEW/FUTURE` `REMOVE`) ;
  - Partie D : décisions figées **NAV-TARGET-01 → NAV-TARGET-10** ;
  - Parties E/F/G : roadmap révisée, suspension des nettoyages, invariants.
- **Mis à jour :** `README.md` (ordre de lecture + règle de vérité), `08-…` (bandeau de
  supersession partielle), ce ledger (table des lots + Phase 7 + §34).
- **Anciennes cibles supersédées (jamais supprimées, jamais réécrites) :**
  `04-CURRENT-NAVIGATION-INVENTORY.md`, `07-HANDOFF-PHASE-6-REPRISE-CHANTIER.md`, `08-…` §8
  (taxonomie de menu), `docs/adr/ADR-0018-refonte-shell-navigation-desktop.md`.
  **Non supersédés :** `01-ADR-0018-SHELL-NAVIGATION-V2.md`, `02-SECONDARY-RAIL-STANDARD.md`.

### Audit factuel minimal (preuve de dépôt, lecture seule)

| Fichier inspecté | Constat retenu |
|---|---|
| `src/lib/navigation/main-menu.config.ts` | Cockpit/Agenda racines ; groupes CRM (Comptes & contacts, Opportunités, Engagements, Consultants), Intelligence (BI, Prospection, Rapports & Rédaction, Veille & Actualités), **Finance autonome**, Outils (Knowledge Hub, Automatisations) ; **Paramètres racine**. `SectionTab`/`getModuleTabs`/`getSectionTabsForPath` présents, **0 entrée `tabs`**. Groupe « Ressources » / « Équipe » / « Recrutement » **absents**. |
| `src/components/layout/DesktopSidebar.tsx` | Logo → `/cockpit` ; groupes = `item.items`, entrées plates sinon ; **Bac à sable** = bouton codé en dur, badge « Legacy », `useLegacySandboxStore`. |
| `src/features/opportunities/navigation/opportunities-sections.ts` + `…/modules/opportunities-modules.ts` | Chapitres `synthese`/`besoins`/`avant-vente`/`planning` ; modules `matching`/`simulation`/`post-mortem`. |
| `src/components/missions/engagements/EngagementsDesktopView.tsx` | Vues `synthese`/`missions-at`/`projets`/`activite-conges`/`planning-at` (`?vue=`) ; **aucun module contextuel**. |
| `src/features/consultants/navigation/consultants-sections.ts` | Chapitres `synthese`/`collaborateurs`/`activite-conges`/`candidats`/`pool-competences` ; modules `production-conges`/`matching-profil`. |
| `src/components/finance/FinanceLocalNavigation.tsx` | Chapitres `synthesis`/`profitability` (« Rentabilité missions »)/`forecast` ; `contextualModules: undefined`. |
| `src/features/business-intelligence/navigation/business-intelligence-chapters.ts` + `…/BusinessIntelligenceLocalNavigation.tsx` | 6 chapitres ; modules `studies`/`playbooks` (conditionnels). |
| `src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx` | Chapitres `strategy`(Brief)/`chapter_1`(Fenêtres d'opportunités)/`chapter_2`(Approches commerciales)/`chapter_3`(Playbooks) ; `contextualModules: undefined`. |
| `src/components/reports/ReportsLocalNavigation.tsx` | Chapitres `documents`(Bibliothèque)/`knowledge`(Connaissances)/`generation` ; module `knowledge-management` (conditionnel). |
| `src/components/veille/VeilleLocalNavigation.tsx` | Chapitres `news`/`watched-accounts`/`strategic-analysis`/`history` ; module `source-management` (conditionnel). |
| `src/features/knowledge-hub/knowledge-hub-shell-data.ts` | Domaines `clients-markets`/`expertise-kredo`/`talents`/`delivery-feedback`/`ao-proposals`/`internal-resources` ; modules Ateliers (`workshops`) + RAG. |
| `src/components/automations/AutomationsLocalNavigation.tsx` | Chapitres `journal`/`sante`(Santé des workflows)/`couts` ; `contextualModules: undefined`. |

### Replanification

- **Phase 6 révisée :** 6.3R → **6.4A** (technique legacy) → **6.4B** (menu principal) → 6.5
  (DesktopSidebar/collapse) → 6.6 (Shell ↔ Cockpit Intelligence) → 6.7 (audit de clôture).
  **6.4A et 6.4B ne sont jamais mélangés.**
- **Phase 7 — Alignement fonctionnel des workspaces (nouvelle) :**

  | Lot | Objet |
  |---|---|
  | 7.0 | Audit global CURRENT → TARGET (revalidation Partie C contre `origin/main`) |
  | 7.1 | Opportunités — puis **Opportunities Lot 12** (nettoyage & clôture) |
  | 7.2 | Consultants (`pool-competences` chapitre → module) — puis **Consultants Lot 15** |
  | 7.3 | **Engagements + Finance** (lot coordonné — voir ci-dessous) |
  | 7.4 | Business Intelligence |
  | 7.5 | Prospection |
  | 7.6 | Rapports & Rédaction |
  | 7.7 | Veille & Actualités |
  | 7.8 | Knowledge Hub |
  | 7.9 | Automatisations |
  | 7.10 | Audit final architecture interne |

  **Engagements + Finance ensemble (7.3) :** le déplacement de la « rentabilité des missions »
  (Finance → chapitre « Rentabilité des engagements » d'Engagements) impose un lot coordonné
  pour éviter duplication Data, second calcul de marge et duplication UI. Une seule source de
  vérité (`missions.gross_margin_pct`, `v_collaborator_activity_summary`, `pnl_monthly`).

### Nettoyages suspendus

- **Opportunities Lot 12** et **Consultants Lot 15** → `DEFERRED UNTIL TARGET-ALIGNMENT`
  (respectivement après Phase 7.1 et Phase 7.2). Lots **non annulés**. Motif : des composants
  aujourd'hui legacy peuvent être réutilisés / transformés par la cible interne.

### Décisions de rebaseline

### 2026-09-09 — R-09
Le document `09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` est la **cible canonique** de
navigation (NAV-TARGET-01). Menu Desktop final = Accueil, Agenda, CRM, Intelligence, Outils +
Bac à sable legacy séparé (NAV-TARGET-03). Finance → module de CRM sans changement de pathname
(NAV-TARGET-04). Paramètres → dernier module d'Outils (NAV-TARGET-05). Pathnames conservés par
défaut (NAV-TARGET-02, NAV-TARGET-10). Toute capacité absente du code = `NEW/FUTURE`, jamais de
bouton mort (NAV-TARGET-07). Transformations internes des workspaces = Phase 7 (NAV-TARGET-08).

### Gates

- `git diff --check` : **passé**
- `git diff --name-only` : **documents Markdown uniquement** (0 fichier applicatif)
- Pas de `build` / `test` / `typecheck` : aucun code modifié (lot documentaire).

### Prochain lot

- **SHELL 6.4A — Démantèlement navigation horizontale legacy** (et **non** Opportunities Lot 12
  ni Consultants Lot 15).

### Verdict

- **Lot 6.3R — ✅ livré (documentaire).**

---

## 35. Lot 6.4A — Démantèlement navigation horizontale legacy

> **Nature :** lot technique de démantèlement. **N'applique PAS** la nouvelle taxonomie du menu
> principal (réservée à 6.4B). **Baseline Git :** `b5387bd1` (`main` = `origin/main`, non avancé).

### Audit d'entrée (avant suppression)

| Symbole | Constat |
|---|---|
| `SectionNavBarSlot` | 0 consommateur applicatif — seule sa définition + 1 assertion de test (`consultants-sections.test.ts`, string-check, toujours valide) + 2 commentaires historiques |
| `SectionNavBar` | Consommé **uniquement** par `SectionNavBarSlot` |
| `getModuleTabs` | Définition dans `main-menu.config.ts` + tests uniquement |
| `getSectionTabsForPath` | Définition + `SectionNavBar` + tests + 2 usages internes de `getMobileTabsForPath` (branche `/prospection` et fallback final, tous deux → `[]` car plus aucune entrée `tabs`) + 1 usage `breadcrumb.ts` (`item.tabs`, déjà no-op) |
| `section-tab-styles.ts` | **3 consommateurs actifs** : `SectionTabBar`, `StaffingSectionTabBar`, `CrmSectionTabBar` → **conservé** |
| `src/lib/tabs/tab-types.ts::SectionTab` | Type des fiches entités ouvertes — **hors périmètre, intact** |

### Fichiers supprimés

- `src/components/layout/SectionNavBar.tsx`
- `src/components/layout/SectionNavBarSlot.tsx`

### `main-menu.config.ts`

- **Supprimé** : `export type SectionTab` (legacy Desktop), `MainMenuItem.tabs`, `getModuleTabs()`, `getSectionTabsForPath()`.
- **Ajouté** : `export type MobileNavigationTab` (même forme ; concept explicitement Mobile).
- **`getMobileTabsForPath()` découplé** : retour typé `MobileNavigationTab[]` ; branche `/prospection`
  retirée (fallback identique) ; fallback final `getSectionTabsForPath(...).filter(...)` → `return []`.
  Les 4 regroupements explicites (Consultants, Opportunités/Recrutement, Engagements, Rapports/Veille)
  et leurs destinations canoniques sont **inchangés**.

### Autres fichiers touchés

| Fichier | Changement |
|---|---|
| `src/components/layout/MobileSectionRail.tsx` | `import { SectionTab }` → `import type { MobileNavigationTab }` ; prop `tabs` re-typée ; commentaire « écho de la SectionNavBar » retiré. Aucun changement UI/comportement. |
| `src/components/layout/MobileNavigationMenu.tsx` | `type SectionTab` → `type MobileNavigationTab` (import + 3 annotations `tabs` / `tabsFor` / `activeTabHref`). Aucun changement UI. |
| `src/lib/navigation/breadcrumb.ts` | Retrait de `addTabs()` (indexait `item.tabs`, déjà vide) ; l'index href→label ne contient plus que groupes → modules. Comportement identique. |
| `src/lib/navigation/main-menu.config.test.ts` | Tests `getModuleTabs` / `getSectionTabsForPath` retirés ; ajout : aucune entrée ne porte `tabs`, helpers legacy absents de l'export, onglets Mobile canoniques + `[]` hors regroupement (`/prospection*`, `/finance`, `/cockpit`). |
| `src/STRUCTURE.md` | Ligne navigation mise à jour (`MobileNavigationTab`, `getMobileTabsForPath`). |

### Non touché (hors périmètre, vérifié)

`SectionTabBar`, `CrmSectionTabBar`, `StaffingSectionTabBar`, `CrmTabbedShell`, `StaffingTabbedShell`,
`src/lib/tabs/*`, `section-tab-styles.ts`, `DesktopSidebar.tsx`, `navigation-icons.tsx`, la taxonomie
de `mainMenuItems`, `SectionRail`, les navigations de workspaces, `useSidebarCollapse`, Supabase/RLS/n8n.

### Preuves de sortie

- `rg "SectionNavBarSlot" src` → 2 hits : 1 assertion de test (`.not.toContain`), 1 commentaire historique (`missions/layout.tsx`). **0 code.**
- `rg "\bSectionNavBar\b" src` → **0** (le symbole n'existe plus).
- `rg "getModuleTabs|getSectionTabsForPath" src` → 2 hits, tous dans `main-menu.config.test.ts` (assertions d'absence).
- `rg "tabs\?:" src/lib/navigation/main-menu.config.ts` → **0**.
- `rg "\bSectionTab\b" src/lib/navigation src/components/layout` → `SectionTabBar.tsx` (type entité, `@/lib/tabs/tab-types`) + 1 commentaire. **0 depuis `main-menu.config`.**
- `rg "section-tab-styles" src` → 3 consommateurs actifs (attendu).

### Gates

- `npm run typecheck` : **passé** (après purge `.next` ; a révélé `breadcrumb.ts`, corrigé).
- Tests ciblés (`main-menu.config`, `mobile-navigation-history`, `recruitment-deprecation`, `consultants-sections`, `business-intelligence-migration`) : **56/56 passés**.
- `npm run check:server-boundary` : **passé**.
- `npx eslint` (fichiers touchés) : **0 erreur** ; 1 *warning* pré-existant `prettify is defined but never used` dans `breadcrumb.ts` (présent avant ce lot, hors périmètre 6.4A).
- `npm run build` : **passé** (Next.js 16.2.7 Turbopack, 42/42 pages).
- `npm test` (**suite complète**) : **292 fichiers / 2 897 tests passés (0 échec)**.
- `git diff --check` : **passé**.

### Dettes restantes

- *Warning* lint `prettify` inutilisé dans `breadcrumb.ts` — pré-existant, à nettoyer dans un lot d'hygiène dédié.
- Commentaire historique « le groupe (tabbed) et son SectionNavBarSlot ont été… » dans `src/app/(app)/missions/layout.tsx` — factuel, conservé.
- `MobileSectionRail` / `SectionTabBar` : renommage éventuel pour lever l'ambiguïté « SectionTab » — non prioritaire, hors 6.4A.

### Prochain lot

- **SHELL 6.4B — Alignement navigation principale Desktop** (taxonomie du menu : Accueil, CRM+Finance, Outils+Paramètres…).

### Verdict

- **Lot 6.4A — ✅ techniquement livré.** Commit : `48a3a343` (`refactor(shell-0018): remove legacy section navigation`).

---

## 36. Lot 6.4B — Alignement de la navigation principale Desktop

> **Nature :** lot produit — applique la taxonomie de menu du document canonique `09-…`.
> N'a **pas** touché aux chapitres/modules des workspaces, à `SectionRail`, au collapse, à
> Cockpit Intelligence, ni au Mobile. **Baseline Git :** `a2046809`.

### Taxonomie — avant / après

| | Avant (`a2046809`) | Après (6.4B) |
|---|---|---|
| Premier niveau | Cockpit · Agenda · **CRM** · Intelligence · **Finance** · Outils · **Paramètres** | **Accueil** · Agenda · **CRM** · Intelligence · **Outils** |
| CRM | Comptes & contacts · Opportunités · Engagements · Consultants | **Comptes & Contacts** · Opportunités · Engagements · Consultants · **Finance** |
| Intelligence | BI · Prospection · Rapports & Rédaction · Veille & Actualités | *(inchangé)* |
| Outils | Knowledge Hub · Automatisations | Knowledge Hub · Automatisations · **Paramètres** |
| Groupe `Finance` racine | présent (1 entrée) | **supprimé** |
| `Paramètres` racine | présent | **supprimé** (déplacé sous Outils) |

### Changements

| Élément | Traitement | Détail |
|---|---|---|
| **Accueil** | `RENAME` | `label` « Cockpit » → « Accueil » ; `icon` « cockpit » → **`home`** ; `href` **`/cockpit` conservé** ; `primary: true` conservé. Aucune route `/home` ni `/accueil`, aucune redirection. |
| **Comptes & Contacts** | `RENAME` | casse du libellé uniquement ; `href` `/prospection/accounts` + `icon` `crm` inchangés. Pas de route `/crm`. |
| **Finance** | `MOVE` | entrée déplacée telle quelle dans `CRM.items` en 5ᵉ position ; groupe autonome supprimé ; `href` `/finance`, `icon` `finance`, `primary: true` conservés. Contenu de la page Finance **non touché**. |
| **Paramètres** | `MOVE` | entrée racine → `Outils.items` en 3ᵉ (dernière) position ; `href` `/settings`, `icon` `settings` conservés. |
| **Icône `home`** | `NEW` | `navigation-icons.tsx` : nouveau `case "home"` (SVG inline heroicons-style — toit + corps de maison + porte ; `fill="none"`, `stroke="currentColor"`, `strokeWidth={strokeWidthOverride ?? 2}`, `baseClasses`). `case "cockpit"` **conservé intact** (consommé ailleurs). |
| **Logo KREDO** | libellés a11y | `DesktopSidebar.tsx` : `aria-label` « Retour au cockpit » → « Retour à l'accueil » ; `title` (collapsed) « Cockpit » → « Accueil ». `href="/cockpit"`, dimensions, layout, bouton collapse, cookie sidebar, comportement visuel **inchangés**. |

### Non touché (vérifié)

- **Pathnames** : tous conservés (`/cockpit`, `/agenda`, `/prospection/accounts`, `/missions/opps`, `/missions`, `/consultants`, `/finance`, `/intelligence`, `/prospection-intelligence`, `/reports`, `/veille`, `/knowledge`, `/automations`, `/settings`).
- **`primary: true`** : aucun retrait (contrat conservé — refonte éventuelle = lot ultérieur).
- **`getActiveModuleHref`** : logique inchangée ; test dédié prouvant que le regroupement visuel ne change aucun contrat URL.
- **Mobile** : `MobileNavigationMenu`, `MobileBottomNav` (hardcode `Cockpit`/`cockpit-mobile`, ne lit pas `mainMenuItems`), `MobileNav`, `MobileSectionRail`, `getMobileTabsForPath` — **0 modification**. Audit statique : aucun consommateur Mobile de `mainMenuItems` cassé.
- **Symboles internes `Cockpit*`** (`CockpitPage`, `CockpitDesktopDashboard`, `cockpit-data`, Cockpit Intelligence, CSS `cockpit-*`) : aucun renommage.
- **`breadcrumb.ts`** : `ROOT` reste `{ label: "KREDO", href: "/cockpit" }` ; `/cockpit` est court-circuité avant l'index → pas d'incohérence. Warning pré-existant `prettify` **non corrigé** (hors périmètre).
- **`intelligence-registry.ts`** (`PAGE_COCKPIT_CONFIGS`, labels « Cockpit » / « Comptes & contacts` » dupliqués statiquement) : hors périmètre (Cockpit Intelligence — Phase 7 / lot dédié).

### Fichiers modifiés

- `src/lib/navigation/main-menu.config.ts` — `mainMenuItems` réordonné (Accueil, Finance sous CRM, Paramètres sous Outils, groupes racines supprimés).
- `src/components/layout/navigation-icons.tsx` — `case "home"`.
- `src/components/layout/DesktopSidebar.tsx` — 2 libellés a11y du logo.
- `src/lib/navigation/main-menu.config.test.ts` — describe « taxonomie cible (SHELL 6.4B) » : premier niveau exact, CRM (5), Intelligence (4), Outils (3), absence Cockpit/Finance/Ressources/Paramètres racine, `getActiveModuleHref` 8 cas, `getNavigationIcon("home")` → SVG.
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md` — table des lots + §36.

### Preuves de sortie

- `rg 'label: "Cockpit"' src/lib/navigation src/components/layout` → **0**.
- `rg 'label: "Finance"' src/lib/navigation/main-menu.config.ts` → **1**, dans `CRM.items`.
- `rg 'label: "Paramètres"' src/lib/navigation/main-menu.config.ts` → **1**, dans `Outils.items`.
- `rg 'label: "Ressources"' src/lib/navigation/main-menu.config.ts` → **0**.

### Gates

- `npm run typecheck` : **passé** (après purge `.next`).
- Tests ciblés (`main-menu.config`, `recruitment-deprecation`, `business-intelligence-migration`, `MobileBottomNav`, `intelligence-registry`, `src/lib/navigation`) : **60/60 passés**.
- `npm run check:server-boundary` : **passé**.
- `npx eslint` (fichiers touchés) : **0 erreur, 0 warning**.
- `npm run build` : **passé** (Next.js 16.2.7 Turbopack, 42/42 pages).
- `npm test` (**suite complète**) : **292 fichiers / 2 902 tests passés (0 échec)**.
- `git diff --check` : **passé**.

### Prochain lot

- **SHELL 6.5 — Stabilisation `DesktopSidebar` / `useSidebarCollapse`**.

### Verdict

- **Lot 6.4B — ✅ techniquement livré.** Commit : `e6a19d4d` (`refactor(shell-0018): align desktop main navigation`).

---

## 37. Lot 6.5 — Stabilisation `DesktopSidebar` / `useSidebarCollapse`

> **Nature :** ownership du repli de la navigation principale Desktop.
> Ne traite **pas** l'intégration finale Shell ↔ Cockpit Intelligence (Lot 6.6).
> **Baseline Git :** `f9c770bd`.
>
> ⚠️ **Travail parallèle préservé** — au démarrage, dirty et **jamais touché / stagé** :
> `docs/JOURNAL-SESSIONS.md` + `src/features/opportunities/summary/{SummaryDesktop,summary-geometry,
> DeadlinesTable,PipeBreakdownChart,ProcessFlowChart,SkillsComparisonChart}.tsx` +
> `src/features/opportunities/summary/__tests__/summary.test.ts` (refonte Synthèse Opportunités).
> `git add` explicites fichier par fichier pour ce lot.

### Modèle d'état effectif

`DesktopSidebar` ne reçoit plus d'ordre « replie-toi maintenant » : il **dérive** son état de
trois entrées indépendantes.

| Entrée | Source | Persistance |
|---|---|---|
| `preferredCollapsed` | `useState(defaultCollapsed)` — toggle utilisateur | cookie `kredo_sidebar_collapsed` (inchangé) |
| `workspaceAutoCollapsed` | `shouldAutoCollapseDesktopSidebar(pathname)` (politique Shell pure) | — |
| verrous externes | `useSidebarCollapse.collapseRequestCount > 0` | store en mémoire |

`isCollapsed = resolveDesktopSidebarCollapsed({...})` = `preferredCollapsed || workspaceAutoCollapsed
|| externalCollapseRequestCount > 0`. Le toggle est `disabled` dès qu'un repli est forcé
(`workspaceAutoCollapsed || count > 0`) et ne persiste **que** la préférence. Quitter un workspace
/ fermer un panneau restaure la préférence **sans mémorisation intermédiaire**.

### Politique pathname — `src/lib/navigation/desktop-sidebar-policy.ts` (nouveau, pur)

- `shouldAutoCollapseDesktopSidebar(pathname)` — `true` sur préfixe canonique :
  `/missions` · `/consultants` · `/finance` · `/intelligence` · `/prospection-intelligence` ·
  `/reports` · `/veille` · `/knowledge` · `/automations` (match `=== prefix` ou `prefix/…`,
  `?query`/`#hash` ignorés).
- **NON auto-repliés** : `/cockpit` · `/agenda` · `/prospection/accounts` (+ descendants) ·
  `/settings` · `/`. `/prospection/accounts` reste géré par le verrou propre de `CrmTabbedShell`.
  `/prospection-intelligence` est bien distingué de `/prospection/accounts`.
- `resolveDesktopSidebarCollapsed({ preferredCollapsed, workspaceAutoCollapsed, externalCollapseRequestCount })` — composition pure, testée.
- Aucune redirection créée : les routes historiques (`/missions/actives`, `/staffing`, `/recruitment`…) gardent leurs contrats.

### `useSidebarCollapse` — avant / après

| Avant | Après |
|---|---|
| `isCollapsed`, `pendingRequest`, `wasExpandedBeforePanel`, `collapseRequestCount`, `reportState`, `requestCollapse`, `requestRestore`, `consumeRequest` | `collapseRequestCount`, `requestCollapse`, `requestRestore` |
| bus d'ordre one-shot + miroir de l'état visuel | **registre de verrous temporaires externes** uniquement |

`requestCollapse` → `count + 1` ; `requestRestore` → `Math.max(0, count - 1)` (underflow protégé).
Plusieurs verrous simultanés composent (Cockpit CRM + Cockpit Intelligence = 2).

### `DesktopSidebar.tsx`

- Supprimés : `pendingRequest` / `reportState` / `consumeRequest`, le `useLayoutEffect` de report,
  le `useEffect` de consommation de requête (+ son `eslint-disable set-state-in-effect`), les imports
  `useEffect` / `useLayoutEffect`.
- `isCollapsed` devient dérivé ; `preferredCollapsed` remplace l'ancien `useState` piloté.
- **Invariants intacts** : taxonomie du menu, icônes, dimensions, couleurs, Bac à sable, footer,
  active state, `getActiveModuleHref`, logo (`/cockpit`), largeurs collapsed/expanded, animation,
  nom du cookie.

### `IntelligencePanel.tsx`

Effet de verrou rendu **équilibré** : `useEffect` retourne désormais un cleanup.
`isOpen` faux → aucun appel ; ouverture → `requestCollapse` ; fermeture / unmount → cleanup
`requestRestore`. Aucun autre comportement du panneau modifié. Reste le seul émetteur avec `CrmTabbedShell` (décision de conservation/refonte du bus = Lot 6.6).

### `CrmTabbedShell.tsx`

Pattern déjà correct (`useEffect` équilibré, garde `isMobile || !isCockpitActive`) — **non modifié**
(le contrat `requestCollapse`/`requestRestore` du store est inchangé).

### Émetteurs historiques supprimés (6) + lecteur (1)

| Fichier | Retrait |
|---|---|
| `EngagementsDesktopView.tsx` | `useEffect` + import `useSidebarCollapse` + import `useEffect` (devenu inutilisé) |
| `ReportsDesktopView.tsx` | `useEffect` + import `useSidebarCollapse` (import `useEffect` conservé — 2 autres usages) |
| `VeilleActualitesDesktop.tsx` | `useEffect` + import `useSidebarCollapse` (import `useEffect` conservé) |
| `BusinessIntelligenceDesktop.tsx` | `useEffect` + import `useSidebarCollapse` + import `useEffect` (inutilisé) |
| `ProspectionIntelligenceDesktop.tsx` | `useEffect` + import `useSidebarCollapse` + import `useEffect` (inutilisé) |
| `KnowledgeHubDesktop.tsx` | `useEffect` + selector `useSidebarCollapse()` + import `useEffect` (inutilisé) |
| `ProspectionIntelligenceHeader.tsx` | lecture `s.isCollapsed` + le séparateur cosmétique conditionnel + import |

Aucune autre logique métier/UI touchée. **Consultants / Opportunities** : déjà nettoyés (Lots 6.2/6.3),
`rg useSidebarCollapse src/features/{consultants,opportunities}` → **0**. **Finance / Automatisations**
n'utilisaient déjà pas d'émetteur — la politique Shell (`/finance`, `/automations`) les couvre.

### Occurrences finales

- `useSidebarCollapse` (applicatif) : `use-sidebar-collapse.ts` (+ test), `DesktopSidebar.tsx`,
  `IntelligencePanel.tsx`, `CrmTabbedShell.tsx` — **aucun workspace métier**.
- `requestCollapse` / `requestRestore` (hors hook/test/Mobile) : `IntelligencePanel.tsx` +
  `CrmTabbedShell.tsx` uniquement. *(NB : `MobileNavigationMenu.tsx` a une fonction locale
  `requestCollapse` sans rapport — Mobile, hors périmètre.)*

### Tests

- `src/lib/navigation/desktop-sidebar-policy.test.ts` (nouveau) — 16 pathnames auto-repliés,
  7 non repliés, query/hash, pathname vide, distinction `/prospection-intelligence` vs
  `/prospection/accounts` ; `resolveDesktopSidebarCollapsed` : 8 combinaisons (préférence,
  workspace, verrous 0/1/2, restauration).
- `src/hooks/use-sidebar-collapse.test.ts` (réécrit) — 1 verrou, 2 verrous concurrents, underflow,
  absence des anciennes clés (`isCollapsed`/`pendingRequest`/`wasExpandedBeforePanel`/`reportState`/`consumeRequest`).
- Assertions statiques existantes (`consultants-sections.test.ts`, `opportunities-sections.test.ts` :
  « n'importe ni n'utilise `useSidebarCollapse` ») : toujours vertes.

### Gates

- `npm run typecheck` : **passé** (après purge `.next`).
- Tests ciblés (`use-sidebar-collapse`, `desktop-sidebar-policy`, consultants/opportunities sections,
  prospection-intelligence, business-intelligence, reports, veille) : **53 fichiers / 538 tests passés**.
- `npm run check:server-boundary` : **passé**.
- `npx eslint` (13 fichiers touchés) : **0 problème introduit**. 3 anomalies **pré-existantes**
  confirmées par `git stash` (non corrigées — hors périmètre, ne touchent pas au collapse) :
  `IntelligencePanel.tsx` `set-state-in-effect` **error** (effet de reset des écrans secondaires,
  non lié au verrou) ; `ReportsDesktopView.tsx` `setShowFilters` unused *warning* ;
  `VeilleActualitesDesktop.tsx` `accountSignals` exhaustive-deps *warning*.
- `npm run build` : **passé** (Next.js 16.2.7 Turbopack, 42/42 pages).
- `npm test` (**suite complète**) : **293 fichiers / 2 932 tests passés (0 échec)** — inclut les
  fichiers de test du travail parallèle Synthèse Opportunités, non affectés par ce lot.
- `git diff --check` : **passé**.

### Prochain lot

- **SHELL 6.6 — Intégration Shell global ↔ Cockpit Intelligence**.

### Verdict

- **Lot 6.5 — ✅ techniquement livré.** Commit : `c10c5589` (`refactor(shell-0018): centralize desktop sidebar collapse`).

---

## 38. Lot 6.6 — Intégration finale Shell global ↔ Cockpit Intelligence

> **Nature :** petit lot architectural. Le Cockpit Intelligence est un élément du **Shell
> global** ; son état d'ouverture devient un signal lu **directement** par la sidebar, et non
> plus un verrou artificiel dans `useSidebarCollapse`.
> **Baseline Git :** `e739f20f` (`docs(shell-0018): record Lot 6.5 commit SHA`) — `HEAD` = `origin/main`.
>
> ⚠️ **Travail parallèle préservé** — dirty au démarrage et **jamais touché / stagé** :
> `docs/JOURNAL-SESSIONS.md` + `src/features/opportunities/summary/{SummaryDesktop,summary-geometry,
> DeadlinesTable,PipeBreakdownChart,ProcessFlowChart,SkillsComparisonChart}.tsx` +
> `src/features/opportunities/summary/__tests__/summary.test.ts` (refonte Synthèse Opportunités).
> `git add` explicites fichier par fichier.

### Architecture avant → après

**Avant (6.5)** — le Cockpit Intelligence pilotait la sidebar via un verrou :

```
IntelligencePanel  ──useEffect(isOpen)──▶  useSidebarCollapse.requestCollapse/Restore
                                                   │
                                                   ▼
                                           DesktopSidebar (collapseRequestCount > 0)
```

**Après (6.6)** — le Shell lit le signal lui-même :

```
useIntelligencePanel.isOpen ──────────────▶ DesktopSidebar
                                              ├── preferredCollapsed        (cookie)
                                              ├── workspaceAutoCollapsed    (politique pathname)
                                              ├── intelligencePanelOpen     (signal direct)  ← nouveau
                                              └── externalCollapseRequestCount > 0
                                                        └── cockpit CRM uniquement
```

### Fichiers modifiés (7)

| Fichier | Changement |
|---|---|
| `src/lib/navigation/desktop-sidebar-policy.ts` | `resolveDesktopSidebarCollapsed` gagne la 4ᵉ dimension `intelligencePanelOpen` (OU logique) ; commentaires : `externalCollapseRequestCount` ne cite plus Cockpit Intelligence, désigne « les surfaces dont l'état ne peut pas être dérivé directement par le Shell — actuellement le cockpit CRM ». |
| `src/lib/navigation/desktop-sidebar-policy.test.ts` | helper `resolve` à 4 arguments ; cas `intelligencePanelOpen` ; test de composition Intelligence + verrou CRM (indépendance) ; nouveau `describe` statique de découplage. |
| `src/components/layout/DesktopSidebar.tsx` | `import { useIntelligencePanel }` ; `const intelligencePanelOpen = useIntelligencePanel((state) => state.isOpen)` (sélecteur, pas de destructuration du store) ; `isForcedCollapsed` inclut `intelligencePanelOpen` ; `resolveDesktopSidebarCollapsed(...)` reçoit `intelligencePanelOpen` ; commentaire d'en-tête passé à 4 entrées. |
| `src/components/intelligence/IntelligencePanel.tsx` | suppression de `import { useSidebarCollapse }` et de l'`useEffect` de verrou (lignes ~353‑360). Import `useEffect` **conservé** (effet de reset des écrans secondaires). Aucun autre effet / écran / action / drawer / composer / matching / header touché. |
| `src/hooks/use-sidebar-collapse.ts` | commentaires uniquement — le store (`collapseRequestCount` / `requestCollapse` / `requestRestore`) est **inchangé**. Documente : registre de verrous externes exceptionnels ; seul consommateur à date = `CrmTabbedShell` ; Cockpit Intelligence n'est plus cité comme consommateur. |
| `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md` | tableau des Lots (6.6 ✅, 6.7 prochain) + présente section. |

**Non modifiés (conformité périmètre) :** `AppShell.tsx` (reste Server Component, monte toujours
`DesktopSidebar` / `main` / `IntelligenceToggle` / `IntelligencePanel` — aucun provider ajouté),
`IntelligenceToggle.tsx`, `use-intelligence-panel.ts` (API `isOpen`/`toggle`/`open`/`close`
inchangée, aucun provider), `CrmTabbedShell.tsx` (pattern `useEffect` équilibré conservé — son
`isCockpitActive` dépend du pathname + `activeTabId` + mode embedded multi-compte, non déductible
proprement par le Shell ; `DesktopSidebar` ne dépend donc pas de `useCrmTabStore`). Géométrie du
panneau (sibling flex, largeur, `brand-primary`, `data-theme="cockpit"`, transitions, z-index) :
**intacte**. Mobile (`IntelligenceFAB`, `MobileNav*`) : **hors périmètre, intact**. Accès rapides
« Bientôt » : inchangés. `main-menu.config.ts`, `navigation-icons.tsx`, `SectionRail`, préfixes
de politique, `getActiveModuleHref`, breadcrumb : intacts.

### Émetteurs finaux du registre de verrous

- `useSidebarCollapse` (applicatif) : `use-sidebar-collapse.ts` (+ test), `DesktopSidebar.tsx`
  (lecteur `collapseRequestCount`), `CrmTabbedShell.tsx` (émetteur). **Plus aucune occurrence dans
  `src/components/intelligence/`, `src/features/`, `src/components/reports|veille|missions`.**
- `requestCollapse` / `requestRestore` (hors hook/test/Mobile) : `CrmTabbedShell.tsx`
  **uniquement**. *(NB : `MobileNavigationMenu.tsx` a une fonction locale homonyme `requestCollapse`
  sans rapport — Mobile, hors périmètre, non modifiée.)*

### Composition des contraintes (vérifiée par test)

| préférence | workspace | intelligence | verrou CRM | → repli |
|---|---|---|---|---|
| false | false | false | 0 | **false** |
| true  | false | false | 0 | true |
| false | true  | false | 0 | true |
| false | false | **true** | 0 | true |
| false | false | false | 1 | true |
| false | false | true | 1 | true |
| false | false | **true → false** | 1 | true (verrou CRM tient) |
| false | false | true | **1 → 0** | true (Intelligence tient) |
| false | false | false | 0 | restauration préférence/workspace |

Aucune dépendance entre les deux mécanismes. Le toggle utilisateur reste `disabled` tant que
`isForcedCollapsed === true` et ne modifie que `preferredCollapsed` (aucun changement de cookie).

### Preuves `rg`

```
rg -n "useSidebarCollapse" src/components/intelligence      → 0
rg -n "requestCollapse|requestRestore" src \
  --glob '!src/hooks/use-sidebar-collapse.ts' \
  --glob '!src/hooks/use-sidebar-collapse.test.ts' \
  --glob '!src/components/layout/MobileNavigationMenu.tsx' \
  --glob '!**/*.test.ts'                                    → CrmTabbedShell.tsx uniquement
```

### Dette consignée — `kredo_intelligence_open`

`useIntelligencePanel` **écrit** le cookie `kredo_intelligence_open` (via `persistOpen`) mais
`AppShell` (Server Component) ne le **relit jamais** : seul `kredo_sidebar_collapsed` est lu au SSR.
Le store Zustand démarre donc toujours à `isOpen: false` au rechargement, quel que soit le cookie.
**Décision 6.6 :** hors périmètre — pas d'extension à un chantier d'hydratation Zustand/SSR. À
arbitrer séparément après la clôture du Shell (candidat Phase 6.7 ou ultérieur). Les deux cookies
restent strictement disjoints : `kredo_sidebar_collapsed` (préférence sidebar) n'est jamais utilisé
pour déterminer `kredo_intelligence_open` et réciproquement.

### Gates

- Tests ciblés (`desktop-sidebar-policy.test.ts` + `use-sidebar-collapse.test.ts`) :
  **2 fichiers / 39 tests passés**.
- `npm run typecheck` : **passé**.
- `npm run check:server-boundary` : **passé** (`AppShell` reste Server Component).
- `npx eslint` (5 fichiers touchés) : **0 problème introduit**. 1 anomalie **pré-existante**
  confirmée (Lot 6.5) : `IntelligencePanel.tsx` `react-hooks/set-state-in-effect` **error** sur
  l'effet de reset des écrans secondaires — explicitement **hors périmètre** (§9 du cadrage), non
  corrigée. Le retrait de l'effet de verrou a seulement décalé sa ligne (355→356).
- `npm run build` : **passé** (Next.js 16.2.7 Turbopack, 42/42 pages, compiled in ~7s).
- `git diff --check` : **passé**.
- `npm test` (**suite complète**) : **293 fichiers / 2 937 tests passés (0 échec)** — inclut les
  fichiers de test du travail parallèle Synthèse Opportunités, non affectés.

### Critères d'acceptation — tous remplis

`DesktopSidebar` observe `useIntelligencePanel.isOpen` ✔ · ouvrir le Cockpit replie la sidebar ✔ ·
le fermer restaure préférence/workspace ✔ · `IntelligencePanel` n'importe plus `useSidebarCollapse` ✔ ·
n'émet plus `requestCollapse/requestRestore` ✔ · `CrmTabbedShell` seul émetteur applicatif ✔ ·
pas de fuite `useCrmTabStore` dans le Shell ✔ · contraintes composables ✔ · toggle bloqué sous
contrainte forcée ✔ · `AppShell` Server Component ✔ · aucun provider Shell ✔ · aucun changement
visuel / Mobile / workspace ✔ · aucun fichier Opportunities parallèle committé ✔ · gates vertes ✔.

### Prochain lot

- **SHELL 6.7 — Audit de clôture Phase 6**.

### Verdict

- **Lot 6.6 — ✅ techniquement livré.** Commit : `e8f5e4f6` (`refactor(shell-0018): finalize intelligence shell integration`).

---

## 39. Lot 6.7 — Audit de clôture Phase 6

> **Nature :** audit + documentation. **0 modification de code applicatif.**
> **HEAD audité :** `2859c5bf` — `HEAD == origin/main` au démarrage.
> **Document produit :** `10-PHASE-6-CLOSURE-AUDIT-2026-09-09.md` (preuve de conformité technique).
>
> ⚠️ **Travail parallèle préservé** — working tree dirty au démarrage, jamais touché / stagé :
> `docs/JOURNAL-SESSIONS.md` + `src/features/opportunities/summary/*` (refonte Synthèse
> Opportunités). Tous les audits portent sur `HEAD` (`git show HEAD:…`, `git grep … HEAD`,
> `git ls-tree HEAD`), pas sur le working tree.

### Résultats d'audit (tous PASS)

| # | Audit | Preuve clé | Verdict |
|---|---|---|---|
| 1 | Navigation principale | `main-menu.config.test.ts` verrouille `["Accueil","Agenda","CRM","Intelligence","Outils"]` + sous-arbres ; 0 `Cockpit`/`Ressources`/`Finance` racine | PASS |
| 2 | Contrats URL | 14 pathnames canoniques inchangés ; aucune route `/accueil` `/home` `/crm` | PASS |
| 3 | Nav horizontale legacy | `git grep -nw SectionNavBar HEAD` → 0 ; `SectionNavBarSlot` → 0 code actif (1 commentaire + 2 assertions de test) ; `getModuleTabs`/`getSectionTabsForPath` → assertions d'absence ; `MainMenuItem.tabs` → 0 | PASS |
| 4 | Tabs d'entités distingués | `SectionTabBar` / `section-tab-styles.ts` / `src/lib/tabs/*` **actifs, conservés** ; `SectionTab` = `@/lib/tabs/tab-types` (fiches entités), 0 depuis `main-menu.config` | PASS |
| 5 | Route groups `(tabbed)` | `git ls-tree HEAD | grep '(tabbed)'` → 0 | PASS |
| 5 | Redirects de compatibilité | 6 `permanentRedirect` (consultants/activite-conges, pool-competences, missions/actives, projets, recruitment, staffing) → **COMPATIBILITY REDIRECT** intentionnels ; 0 DEAD/BLOCKER | PASS |
| 5bis | `SectionRail` local | 11 composants de navigation locale consomment la primitive ; Shell ne transporte plus de chapitre | PASS |
| 6 | Ownership collapse | `resolveDesktopSidebarCollapsed` pure à 4 champs : `preferredCollapsed \|\| workspaceAutoCollapsed \|\| intelligencePanelOpen \|\| externalCollapseRequestCount > 0` ; toggle bloqué sous contrainte forcée | PASS |
| 7 | `useSidebarCollapse` | applicatif = hook (+test), `DesktopSidebar` (lecteur), `CrmTabbedShell` (émetteur) ; **`requestCollapse`/`requestRestore` hors hook/test → `CrmTabbedShell` uniquement** ; `MobileNavigationMenu` = fonction locale homonyme sans rapport | PASS |
| 8 | Cockpit Intelligence global | `AppShell` monte `IntelligencePanel` en racine ; `DesktopSidebar` lit `useIntelligencePanel((s) => s.isOpen)` ; `IntelligencePanel` : `git grep useSidebarCollapse HEAD -- src/components/intelligence` → 0 | PASS |
| 9 | AppShell / Adaptive Design | `export async function AppShell` (Server Component, `await cookies()`) ; branches Mobile/Desktop mutuellement exclusives ; 0 CSS-hide ; 0 composant Mobile modifié en Phase 6 | PASS |
| 10 | Bac à sable | `useLegacySandboxStore` dédié, hors `mainMenuItems`, badge `Legacy` → INTENTIONAL LEGACY / NON-BLOCKING | PASS |
| 12 | Cible 09 vs HEAD | 15 invariants, tous PASS avec preuve | PASS |

### Dettes post-Phase 6 (aucune BLOCKING)

| # | Dette | Classement |
|---|---|---|
| 1 | `kredo_intelligence_open` écrit (`use-intelligence-panel.ts:31`) jamais relu → Cockpit démarre `isOpen: false` après reload | **NON-BLOCKING / DEFERRED** (hydratation Zustand/SSR post-Shell) |
| 2 | Lint `react-hooks/set-state-in-effect` **error** `IntelligencePanel.tsx` (effet reset écrans secondaires) — pré-existant, hors SHELL | **NON-BLOCKING** |
| 3 | Lint `prettify` inutilisé `breadcrumb.ts` — *warning* pré-existant | **NON-BLOCKING / hygiène** |
| 4 | Bac à sable legacy | **INTENTIONAL LEGACY / NON-BLOCKING** |
| 5 | Commentaire historique `missions/layout.tsx:3` | **NON-BLOCKING** (conservé délibérément) |
| 6 | Renommage `MobileSectionRail`/`SectionTabBar` (ambiguïté « SectionTab ») | **DEFERRED** |

### Correction documentaire

`09-*` §E.1 (roadmap 6.4A) listait `section-tab-styles.ts` parmi les fichiers **supprimés** — erreur
factuelle (le fichier est conservé, 3 consommateurs actifs ; l'audit d'entrée 6.4A du ledger le
documentait déjà correctement). Corrigé : la ligne distingue désormais SUPPRIMÉS vs CONSERVÉS.
Pointeur vers le document 10 ajouté. Aucune autre décision historique réécrite.

### Fichiers modifiés (documentation uniquement)

- `docs/navigation_architecture/SHELL-0018/10-PHASE-6-CLOSURE-AUDIT-2026-09-09.md` — **créé**
- `docs/navigation_architecture/SHELL-0018/03-IMPLEMENTATION-LEDGER.md` — tableau des Lots + §39
- `docs/navigation_architecture/SHELL-0018/README.md` — ordre de lecture + statut Phase 6 CLOSED
- `docs/navigation_architecture/SHELL-0018/09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md` —
  correction factuelle 6.4A + note Phase 6 CLOSED

**0 fichier `.ts` / `.tsx` / `.css` / `.sql` / JSON applicatif modifié.**

### Gates

- `git diff --check` : **passé**
- `git rev-parse HEAD == git rev-parse origin/main` : **vrai**
- `npx vitest run main-menu.config.test.ts desktop-sidebar-policy.test.ts use-sidebar-collapse.test.ts` :
  **3 fichiers / 53 tests passés**
- Dernière validation applicative complète de la Phase 6 = **Lot 6.6 / commit `e8f5e4f6`**
  (typecheck + server-boundary + build 42/42 + `npm test` 293 fichiers / 2 937 tests). Aucun code
  applicatif modifié depuis → non rejouée (working tree porteur du chantier parallèle).

### Statut de clôture

```
Phase 6 — CLOSED
```

Toutes les conditions de clôture remplies (§18 du document 10). Aucun blocker. Prochaine phase :
**Phase 7 — Alignement fonctionnel des workspaces**, premier lot **7.0 — Audit global
CURRENT → TARGET**. Opportunities Lot 12 / Consultants Lot 15 : **DEFERRED UNTIL TARGET-ALIGNMENT**
(après 7.1 / 7.2).

### Verdict

- **Lot 6.7 — ✅ clôturé.** Commit : `docs(shell-0018): close phase 6 shell migration`.
- **Phase 6 — ✅ CLOSED.**

---

## 40. Lot 7.0 — Audit global CURRENT → TARGET des workspaces

> **Nature :** audit + documentation d'entrée de Phase 7. **0 code applicatif modifié.**
> **HEAD audité :** `f477f736` — `HEAD == origin/main`.
> **Document produit :** `11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md` (référence opérationnelle
> de la Phase 7).
>
> ⚠️ **Travaux parallèles préservés** — working tree dirty, jamais touché / stagé :
> `src/features/opportunities/summary/*` (refonte Synthèse Opportunités) +
> `src/components/agenda/*` (Agenda Mobile) + `docs/JOURNAL-SESSIONS.md`. Tous les audits portent
> sur `HEAD`.

### Portée

Revalidation de la Partie C de `09-*` contre `origin/main` pour les 10 workspaces : Opportunités,
Engagements, Consultants, Finance, Business Intelligence, Prospection, Rapports & Rédaction, Veille
& Actualités, Knowledge Hub, Automatisations. Ajout des couches d'exécution : impact Data (DATA-0→3),
Routing (URL-0→3), Desktop/Mobile, blockers, séquençage, critères d'acceptation par lot.

### Résultats clés

| Constat | Détail |
|---|---|
| **Partie C du 09 confirmée** | Tous les pointeurs de preuve (`opportunities-sections.ts`, `consultants-sections.ts`, `BI_CHAPTERS`, `FINANCE_DESKTOP_CHAPTERS`, `EngagementsDesktopView`, `PROSPECTION_DESKTOP_CHAPTERS`, `REPORTS_/VEILLE_/AUTOMATIONS_DESKTOP_CHAPTERS`, `knowledge-hub-shell-data.ts`) existent à `HEAD` et correspondent. |
| **Majorité de renames purs** | BI, Rapports, Veille, Knowledge Hub, Automatisations, Opportunités = `DATA-0 / URL-0`, complexité LOW. |
| **`MISSION_CATALOG` = 7 specs** (pas 1 — `CLAUDE.md` périmé) | `veille-analyse-mensuelle`, `rentabilite-portefeuille`, `activation-portefeuille`, `capacite-staffing`, `revue-compte-client`, `post-mortem-commercial`, `funnel-recrutement`. `MissionComposerDesktop` = **framework mission commun réutilisable** (déjà branché : Opportunités `post-mortem`). Les modules cibles « Mission : … » passent de `NEW` pur à `NEW/FUTURE avec framework REUSE`. |
| **Duplication rentabilité Finance ↔ Engagements** | `getFinanceDashboardData()` (`src/lib/finance/finance-data.ts`) et `getEngagementsActivityAnalytics()` (`src/app/(app)/missions/_data/`) lisent séparément `missions`/`mission_activity_reports` et recalculent la marge. → **7.3A = DATA-2** (vue `v_mission_profitability` recommandée ou builder partagé). **NEEDS DATA DECISION.** |
| **Prospection = workspace coquille** | `chapter_1` / `chapter_2` / `chapter_3` sont des panneaux **vides** (« Cette page est actuellement vide »). Seul `strategy` (Brief) a du contenu. Mobile = placeholder statique. La cible 09 §B.6 est de la **construction**, pas de l'alignement → **7.5 NEEDS PRODUCT DECISION**, à re-séquencer en fin de phase. |
| **2 transformations chapitre → module** | Consultants `pool-competences` (7.2, URL-2, code `skills/` conservé) et Prospection `chapter_3` Playbooks (7.5). |
| **Adaptive Design** | Tous les workspaces ont Desktop + Mobile réels **sauf Prospection** (stub). `production-leave` / `profile-matching` ont Desktop **et** Mobile → REUSE propre pour Engagements. `BI_CHAPTERS[].mobileLabel` déjà découplé du `label` Desktop. |

### Blockers

| Blocker | Impact | Résolution |
|---|---|---|
| Refonte Synthèse Opportunités parallèle (`src/features/opportunities/summary/`) | **7.1** — chapitre `synthese` → « Vue d'ensemble » | Attendre merge/rebaseline. Les 6 autres renames 7.1 sont indépendants. |
| Décision Data 7.3A (vue vs builder partagé) | **7.3** | Arbitrage avant 7.3A. |
| Contenu Prospection `chapter_1/2/3` | **7.5** | Décision produit : apporter le contenu ou classer `NEW/FUTURE`. |

### Séquence Phase 7 recommandée

`7.2 → 7.4 → 7.8 → 7.9 → 7.6 → 7.7 → [7.1 dès rebaseline] → 7.3A → 7.3B → 7.3C → 7.5 → 7.10`
(l'ordre 09 §E.2 reste respecté pour les dépendances réelles : 7.6 avant 7.7, 7.3 coordonné en
sous-lots, 7.10 dernier ; les lots LOW/`READY` sont avancés pendant que la refonte Synthèse se
stabilise et que 7.3A est instruite).

### Go / No-Go

- **7.1 Opportunités** : `YES AFTER REBASELINE`.
- **7.2 Consultants** : `YES` — **premier lot exécutable** si 7.1 reste bloqué (indépendance prouvée).
- **7.3A** : `NO — DATA DECISION REQUIRED`.
- **7.5 Prospection** : `NO — PRODUCT DECISION REQUIRED`.
- **7.4 / 7.6 / 7.8 / 7.9** : `YES`. **7.7** : `YES` après 7.6.

### Fichiers modifiés (documentation uniquement)

- `11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md` — **créé**
- `03-IMPLEMENTATION-LEDGER.md` — tableau des Lots + présente section §40
- `README.md` — ordre de lecture (ajout doc 11) + statut Phase 7

**0 fichier `.ts` / `.tsx` / `.css` / `.sql` / JSON applicatif modifié.**

### Gates

- `git diff --check` : **passé**
- `git rev-parse HEAD == git rev-parse origin/main` : **vrai**
- `npx vitest run` (navigation : `main-menu.config`, `opportunities/navigation`,
  `consultants/navigation`, `business-intelligence/navigation`) : **4 fichiers / 73 tests passés**
- Aucun build : 0 code applicatif modifié.

### Dettes relevées (à traiter en lot, hors 7.0)

`CLAUDE.md` périmé sur `MISSION_CATALOG` · duplication rentabilité (7.3A) · Prospection coquille +
Mobile stub (7.5) · clés de query non alignées sur les labels (ne pas renommer — compat) ·
`Business Review` / `Atlas du portefeuille` = `NEW/FUTURE` différables.

### Prochain lot

- **Phase 7.2 — Alignement Consultants** (si 7.1 bloqué par la refonte Synthèse) **ou**
  **Phase 7.1 — Alignement Opportunités** dès rebaseline.

### Verdict

- **Lot 7.0 — ✅ livré.** Commit : `docs(phase-7): audit workspace target alignment`.
- **Phase 7 — ▶️ ENTRY AUDIT COMPLET. Implémentation prête (hors 7.1/7.3A/7.5 en attente de décision/rebaseline).**

---

## 41. Lot 7.2 — Alignement Consultants sur l'architecture cible

> **Statut : ✅ techniquement livré (2026-09-09).** Baseline `adf1df5a` (`HEAD == origin/main`).
> Cible : `09-*` §B.3 / §C.4. Plan d'exécution : `11-*` §5 / §19.

### Portée livrée

| Niveau | CURRENT | TARGET | Traitement |
|---|---|---|---|
| Chapitre Desktop | `synthese` « Synthèse » | **Vue d'ensemble** | RENAME (clé stable) |
| Chapitre Desktop | `collaborateurs` | Collaborateurs | KEEP |
| Chapitre Desktop | `activite-conges` « Activités & congés » | **Activité & Congés** | RENAME (casse) |
| Chapitre Desktop | `candidats` « Candidats » | **Vivier Candidats** | RENAME |
| Chapitre → Module | `pool-competences` « Pool de compétences » | **Module Desktop « Pool de compétences »** | **TRANSFORM** — composant `PoolCompetencesMap` + loader `getConsultantsSkills` réutilisés à l'identique |
| Module | `production-conges` | Production & Congés | KEEP (2ᵉ) |
| Module | `matching-profil` « Matching profil » | **Matching Profil** (3ᵉ) | RENAME (casse) |
| Module | — | Mission : prévoir les disponibilités | **NEW/FUTURE — non implémenté** (aucun bouton mort) |

### Architecture

- **`CONSULTANTS_DESKTOP_CHAPTERS`** (4) : nouveau contrat, dérivé de `CONSULTANTS_SECTIONS` en
  excluant `pool-competences`. Le rail Desktop (`ConsultantsDesktopShell`) le consomme.
- **`CONSULTANTS_SECTIONS`** (5) : **conservé** — alimente la navigation Mobile
  (`getMobileTabsForPath` → `main-menu.config.ts`, non modifié) et le parsing `?section=`.
  `pool-competences` y reste avec le libellé « Pool de compétences ».
- **`CONSULTANTS_CONTEXTUAL_MODULES`** = `["pool-competences", "production-conges", "matching-profil"]`.
- **`resolveConsultantsDesktopEntry(rawSection, rawModule)`** : fonction **pure** (testée isolément)
  qui produit `{ chapter, module }` pour le Desktop. `?section=pool-competences` → chapitre support
  `synthese` + module `pool-competences`. Aucun `permanentRedirect` nouveau.
- **`PoolCompetencesDesktop`** (`src/features/consultants/modules/pool-competences/desktop/`) :
  wrapper minimal sur la primitive KREDO `AppDialog` (surface / titre / fermeture URL-driven /
  scroll). Aucune logique métier dupliquée.
- **Adaptive Design** : `PoolCompetencesDesktop` monté uniquement par `ConsultantsDesktopShell` ;
  Mobile rend `PoolCompetencesMap` directement (dette SKILLS-1). Aucune bascule CSS.
- **Lazy loading** : `getConsultantsSkills()` chargé côté Desktop uniquement si
  `activeModule === "pool-competences"` (ADR-0006).

### Routing / Data

- **Pathnames** : inchangés. **Redirects** : `/consultants/pool-competences` et
  `/consultants/activite-conges` `permanentRedirect` **conservés tels quels** ; aucun nouveau.
- **URL-2** matérialisé : `?module=pool-competences` (canonique) + `?section=pool-competences` (compat,
  réinterprété par device).
- **Data** : **DATA-0**. 0 migration, 0 RPC, 0 view, 0 table, 0 n8n.

### Gates

- `rm -rf .next && npm run typecheck` → **PASS**
- `npm test` → **PASS** (293 fichiers / 2 965 tests)
- `npm run check:server-boundary` → **PASS**
- `npx eslint` (fichiers modifiés) → **PASS**
- `npm run build` → **PASS** (42/42 pages)
- `git diff --check` → **PASS**

### Verdict

- **Lot 7.2 — ✅ livré.** Commit : `bb2a3a4d` — `refactor(consultants): align workspace target navigation`.
  Push `adf1df5a..bb2a3a4d` sur `origin/main`.
- **Consultants Lot 15 — Nettoyage et clôture** : `DEFERRED UNTIL TARGET-ALIGNMENT` →
  **`UNBLOCKED / READY`**. Auditables au Lot 15 : `src/components/recruitment/dashboard/*`
  (orphelins), `_actions/` legacy `/recruitment` non repointés. À **conserver** :
  `src/lib/consultants/pool-competences-data.ts` (consommé Desktop + Mobile), routes legacy
  `permanentRedirect` (compat bookmarks).
- **Travaux parallèles** (`src/features/opportunities/summary/*`, `docs/JOURNAL-SESSIONS.md`) :
  **jamais touchés / stagés**.
