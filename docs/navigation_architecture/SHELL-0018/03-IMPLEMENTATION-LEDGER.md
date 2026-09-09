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
| **6.x** | Refonte Shell global (lots 6.2 à 6.7) | ⬜ todo | sidebar / routes tabbed legacy / Cockpit Intelligence |
| **8.x** | Nettoyage / clôture | ⬜ todo | suppression legacy prouvée sûre |

> **Phase 4 — ✅ close techniquement (Lot 4.7)**

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
