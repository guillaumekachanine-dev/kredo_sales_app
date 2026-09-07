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
| **2.2** | Migration Business Intelligence | ⬜ todo | conserver `?tab=` |
| **2.3** | Migration Veille | ⬜ todo | modules contextuels existants |
| **2.4** | Migration Rapports | ⬜ todo | extraire rail inline |
| **2.5** | Migration Automatisations | ⬜ todo | supprimer divergences visuelles |
| **2.6** | Migration Engagements | 🟡 build validé, QA visuelle à faire | premier pilote réel |
| **2.7** | Migration Prospection | ⬜ todo | `15rem → 11.5rem` |
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

## 12. Prochaine étape

Faire réaliser la QA visuelle et ergonomique d'Account Intelligence par Guillaume. Aucun autre
lot de migration n'est commencé dans cette livraison.
