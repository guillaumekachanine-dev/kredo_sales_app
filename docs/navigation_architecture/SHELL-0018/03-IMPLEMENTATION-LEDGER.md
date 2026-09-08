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
| **1.0** | Contrat client-safe de `SectionRail` | 🟡 gates locales ciblées validées, smoke bloqué par la session QA | `src/lib/navigation/section-rail.ts` |
| **1.1** | Primitive présentationnelle `SectionRail` | 🟡 gates locales ciblées validées, smoke bloqué par la session QA | `src/components/layout/SectionRail.tsx` |
| **1.2** | Tests unitaires de la primitive | ✅ done | `SectionRail.test.ts` — 5/5 tests passés le 2026-09-08 |
| **2.1** | Migration Account Intelligence | ✅ techniquement livré | commit `31163105` ; QA visuelle réservée à Guillaume |
| **2.2** | Migration Business Intelligence | ✅ techniquement livré | châssis `SectionRail` ; `?segment=` + `?tab=` conservés ; QA visuelle réservée à Guillaume |
| **2.3** | Migration Veille | ✅ techniquement livré | commit `df160aab` ; QA visuelle réservée à Guillaume |
| **2.4** | Migration Rapports | ✅ techniquement livré | commit `d22ad5ca` ; QA visuelle réservée à Guillaume |
| **2.5** | Migration Automatisations | ✅ techniquement livré | commit `c20f33fd` ; QA visuelle réservée à Guillaume |
| **2.6** | Migration Engagements | 🟡 build validé, QA visuelle à faire | premier pilote réel |
| **2.7** | Migration Prospection | ✅ techniquement livré | commit `9b13d84d` ; 15rem → 11.5rem ; QA visuelle réservée à Guillaume |
| **2.8** | Migration Knowledge Hub | ⬜ todo | conserver navigation contextuelle |
| **3.x** | Standardisation des modules contextuels | ⬜ todo | uniquement contexte page |
| **4.x** | URLisation des navigations client-state restantes | ⬜ todo | après stabilisation du rail |
| **5.x** | Migration Finance / mécanismes horizontaux | ⬜ todo | rail + URL |
| **6.x** | Refonte Shell global | ⬜ todo | sidebar / ancien mécanisme / Cockpit Intelligence |
| **7.x** | Architecture menu principal | ⬜ todo | chantier produit séparé |
| **8.x** | Nettoyage / clôture | ⬜ todo | suppression legacy prouvée sûre |

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

Le socle compile, se déploie et passe les gates locales ciblées demandées. Son verdict reste
`partial` jusqu'au smoke Desktop authentifié.

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

**Verdict Lot 2.6 : `partial` jusqu'à la QA visuelle authentifiée.**

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

## 19. Prochaine étape

Faire exécuter la QA visuelle et ergonomique des lots livrés par Guillaume. Aucun lot suivant
n'est commencé dans cette livraison.
