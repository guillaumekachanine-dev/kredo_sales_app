# Audit — ouverture des pages KREDO : pourquoi une « ancienne version » s'affiche d'abord

**Date :** 2026-09-14 · **Périmètre :** les 35 routes `src/app/(app)/**` · **Statut :** ✅ **Lots 1 → 5 exécutés le 2026-09-14** (journal §8) · Lot 0 (QA visuelle) à faire par Guillaume
**Liés :** [`docs/performance-data-audit/`](../performance-data-audit/README.md) (audit données, sept. 2026) ·
[`AUDIT-PERFORMANCE-KREDO.md`](AUDIT-PERFORMANCE-KREDO.md) · [ADR-0006](../adr/ADR-0006-strategie-device-adaptive-cible.md) ·
[ADR-0017](../adr/ADR-0017-cache-components-ppr-refuse.md) · [ADR-0018](../adr/) (shell navigation)

---

## 0. En une page

**Le symptôme est réel, et ce n'est pas un ancien shell qui se charge : ce sont des squelettes de
chargement périmés.** Les pages ont été refondues (thèmes `edito-bright-*`, rail `SectionRail`,
cockpit 5 étapes) ; leurs états de chargement, non. Pendant que le serveur prépare la nouvelle page,
Next affiche le `loading.tsx` le plus proche — qui dessine l'**ancienne** mise en page, parfois
l'ancien thème. L'utilisateur voit donc « l'ancienne version », puis la nouvelle.

Quatre mécanismes, par ordre d'impact perçu :

| # | Mécanisme | Routes touchées | Coût réseau/CPU réel |
|---|---|---|---|
| **A** | **Le shell de module vit dans `page.tsx`, pas dans un `layout.tsx`.** Rail, header et `data-theme` n'existent qu'une fois les données chargées ; avant, c'est le squelette générique `(app)/loading.tsx` (trame KPI + cartes, thème clair) qui occupe tout l'écran. | `/missions`, `/missions/opps`, `/consultants`, `/reports`, `/veille`, `/intelligence`, `/knowledge`, `/prospection-intelligence` | Faible — c'est un défaut **perçu** |
| **B** | **Squelettes périmés ou en double.** `reports/loading.tsx` peint l'ancien thème **sombre** `intelligence-reports` avant la page `edito-bright-reports` ; `[companyId]/loading.tsx` peint l'ancien cockpit cobalt+or à **6 onglets** avant le cockpit edito-bright ; `/cockpit`, `/finance`, `/automations`, `/agenda`, `/intelligence` enchaînent **deux** squelettes différents. | 10 routes | Faible — perçu |
| **C** | **Le shell CRM se recompose après hydratation.** Le store d'onglets (persisté en `sessionStorage`) rend la liste Comptes côté serveur puis bascule sur l'onglet ouvert côté client ; la sidebar se replie **après** hydratation (animation de largeur) ; jusqu'à 10 cockpits masqués en CSS refetchent leurs données. | `/prospection/**` | **Réel** : 2 requêtes API × onglets ouverts, re-rendu client complet |
| **D** | **Chaque page adaptive télécharge ses deux vues.** Les pages importent statiquement `…DesktopView` **et** `…MobileView` : le serveur n'en rend qu'une, mais le navigateur télécharge les deux (vérifié dans les chunks). | Toutes les pages adaptives | **Réel** : fiche compte = 175 Ko gzip propres, dont la vue mobile sur desktop |

**Ce que ce plan corrige :** A, B, C intégralement ; D après mesure. **Ce qu'il ne rouvre pas :**
les décisions déjà tranchées sur mesure (§5) — Cache Components, Realtime, hôtes de tiroirs,
payload `/prospection/accounts`, taille d'instance Supabase.

**Gain attendu, honnêtement chiffré :** le temps serveur des pages ne bouge presque pas (l'audit
données de septembre l'a déjà ramené à 0,2–0,6 s ; le plancher restant est PostgREST, F-10). Ce qui
change : **plus aucun écran intermédiaire faux**, un retour visuel immédiat *dans le bon shell* à
chaque clic de rail, la suppression des refetchs fantômes du CRM, et −50 à −100 Ko gzip de JS sur
les pages adaptives (à confirmer au Lot 4).

---

## 1. Méthode et limites

**Fait :**
- Lecture de toutes les routes `(app)`, des 7 `loading.tsx`, des 9 `layout.tsx`, du shell
  (`AppShell`, `DesktopSidebar`, `MobileNav`, `AppOverlayHosts`, `CrmTabbedShell`), des stores
  persistés, de `proxy.ts` et de la configuration Next.
- Lecture des guides Next **16.2.7 installés** (`node_modules/next/dist/docs/`) : `loading.md`,
  `streaming.md`, `linking-and-navigating.md`, `preventing-flash-before-hydration.md`.
- **Build de production** (`next build`, Turbopack, vert) et calcul du JS gzip par route à partir des
  `page_client-reference-manifest.js` (script en annexe B).
- Base Supabase : volumes (`companies` 115, `contacts` 642, `tasks` 36, `veille_articles` 66) et
  `pg_stat_statements`. **Aucune requête de rendu de page ne dépasse 20 ms de SQL** ; la seule RPC
  lente (`get_account_understanding_context`, 473 ms) est appelée par n8n, pas par une page.
- Croisement avec `docs/performance-data-audit/` pour ne rien refaire ni contredire.

**Pas fait, et pourquoi :** aucune trace navigateur. La QA visuelle est faite par Guillaume
(CLAUDE.md § Méthode, point 8) et l'application exige une session authentifiée. Les
comportements de navigation décrits en §2 sont déduits du code **et** de la documentation Next
installée ; le **Lot 0** les fait confirmer par un enregistrement avant toute modification.

---

## 2. Comment une page s'ouvre aujourd'hui

### 2.1 Arbre de rendu

```
app/layout.tsx                      polices, SpeedInsights, PwaRegistrar
└─ (app)/layout.tsx                 force-dynamic · headers() → device · AppShell + 8 hôtes d'overlay
   ├─ (app)/loading.tsx  ◄───────── Suspense au-dessus de TOUS les modules (squelette générique)
   └─ <module>/layout.tsx           simple <div overflow> — ne porte AUCUN shell de module
      └─ <module>/page.tsx          await données… PUIS <ModuleShell rail+theme>{contenu}</ModuleShell>
```

La coquille visuelle d'un module (rail secondaire, header, thème `edito-bright-*`) est un
**enfant** de `page.tsx`. Elle ne peut donc apparaître qu'une fois **toutes** les données de la page
résolues.

### 2.2 Ce que voit l'utilisateur

**Navigation d'un module à un autre** (ex. `/cockpit` → `/missions`) :
1. Next affiche immédiatement le fallback préchargé : `(app)/loading.tsx` — KPI + 5 cartes, thème
   clair, **sans rail**. C'est « l'ancienne page ».
2. Le serveur streame la page ; le shell Engagements, son rail et son thème apparaissent d'un bloc.

**Pages à Suspense interne** (`/cockpit`, `/finance`, `/automations`, `/agenda`, `/intelligence`) :
1. `(app)/loading.tsx` ou `agenda/loading.tsx` (trame A) ;
2. puis le fallback du `<Suspense>` de la page — `DashboardSkeleton`, `AgendaDesktopSkeleton`,
   `BusinessIntelligenceLoading…` (trame B, différente) ;
3. puis le contenu (trame C). **Trois dessins successifs pour une ouverture.**

**Rechargement complet** : même séquence, le fallback étant flushé dans le HTML initial
(l'audit données l'a mesuré : `GET /agenda` = 61 510 octets de squelette avant la redirection).

**Changement de chapitre dans un module** (`?vue=`, `?section=`) : la clé du segment page inclut les
`searchParams`, mais aucune frontière `loading` n'existe au niveau du module. Le comportement
attendu est un **gel** de l'ancien chapitre jusqu'à la réponse serveur, sans retour visuel — à
confirmer au Lot 0 (c'est l'autre moitié du ressenti « lent »).

---

## 3. Cartographie route par route

JS = gzip téléchargé au premier chargement. **Le socle `(app)/layout` pèse 221 Ko gzip sur toutes les
routes**, `/settings` compris alors qu'elle n'a aucun composant client propre ; la colonne « propre » est ce qui s'y ajoute.

| Route | 1er écran vu | 2e écran | Shell porté par | Thème page | JS propre | Verdict |
|---|---|---|---|---|---|---|
| `/cockpit` | `(app)/loading` | `DashboardSkeleton` | page | clair | 35 Ko | B — double squelette |
| `/agenda` | `agenda/loading` (trame mobile) | `AgendaDesktopSkeleton` (**aussi servi au mobile**) | page | clair | 29 Ko | B |
| `/prospection/accounts` | `accounts/loading` (tableau) | — | `prospection/layout` → `CrmTabbedShell` | clair | 43 Ko | C — onglets, hydratation |
| `/prospection/accounts/[id]` | `[id]/loading` **cockpit cobalt, 6 onglets** | — | page + `CrmTabbedShell` | `edito-bright-cockpit` | **175 Ko** | B + C + D |
| `/missions` | `(app)/loading` | — | page (`EngagementsDesktopView`) | `edito-bright-engagements` | 130 Ko | A + D |
| `/missions/opps` | `(app)/loading` | — | page (`OpportunitiesDesktopShell`) | clair | 68 Ko | A |
| `/consultants` | `(app)/loading` | — | page (`ConsultantsDesktopShell`) | clair | 82 Ko | A + D |
| `/finance` | `(app)/loading` | `DashboardSkeleton` | page | clair | 50 Ko | B |
| `/intelligence` | `(app)/loading` | `BusinessIntelligenceLoading*` | page | `edito-bright-cockpit` | 50 Ko | A + B + D |
| `/prospection-intelligence` | `(app)/loading` | — | page | `intelligence-reports` (sombre) | 7 Ko | A — **prototype en production**, charge tout le snapshot BI |
| `/reports` | `reports/loading` **sombre** | — | page | `edito-bright-reports` | 54 Ko | B — flash de thème inversé |
| `/veille` | `(app)/loading` | — | page | `edito-bright-veille` | 100 Ko | A + D |
| `/knowledge` | `(app)/loading` | — | page | clair | 32 Ko | A + D |
| `/automations` | `(app)/loading` | `DashboardSkeleton` | page | `edito-bright-cockpit` | 24 Ko | B |
| `/settings` | `(app)/loading` | — | page | clair | 0 Ko | données **codées en dur** (sources, profil) |
| `/prospection`, `/prospection/sector-studies`, `/prospection/approche-sectorielle` (+ `[slug]`) | `(app)/loading` ou **squelette dédié d'une page supprimée** | — | — | — | — | `permanentRedirect` rendu par React **après** un squelette |
| `/missions/actives`, `/missions/projets`, `/recruitment`, `/consultants/activite-conges`, `/consultants/pool-competences`, `/staffing` | `(app)/loading` | — | — | — | — | idem : redirection servie par le moteur de rendu |
| `/legacy/**` (5 routes) | `(app)/loading` | — | page | clair | 2–39 Ko | hors navigation principale (bac à sable) |

---

## 4. Constats

Chaque constat : **preuve** (fichier:ligne) → **cause** → **conséquence** → **recommandation**.
Effort S < ½ j · M ≈ 1–2 j · L ≈ 3–5 j.

### O-1 · Le shell de module est rendu par la page, après les données — *cause racine du symptôme*

- **Preuve.** [`missions/page.tsx:121`](../../src/app/(app)/missions/page.tsx) : `EngagementsDesktopView`
  (rail + `data-theme="edito-bright-engagements"`) est retourné **après** `await getEngagementsOverview()`.
  Même motif : [`consultants/page.tsx:124`](../../src/app/(app)/consultants/page.tsx),
  [`missions/opps/page.tsx:120`](../../src/app/(app)/missions/opps/page.tsx),
  [`reports/page.tsx:109`](../../src/app/(app)/reports/page.tsx),
  [`veille/page.tsx:169`](../../src/app/(app)/veille/page.tsx),
  [`intelligence/page.tsx:81`](../../src/app/(app)/intelligence/page.tsx). Les `layout.tsx` de ces
  modules ne sont que des `<div overflow>` ([`missions/layout.tsx`](../../src/app/(app)/missions/layout.tsx),
  [`consultants/layout.tsx`](../../src/app/(app)/consultants/layout.tsx)).
- **Cause.** SHELL-0018 a déplacé les shells dans les features (« le shell est porté par la feature »)
  sans déplacer la frontière de chargement. Le seul `loading.tsx` en amont est celui du groupe `(app)`.
- **Conséquence.** À chaque entrée dans un module, l'écran intermédiaire est une page générique qui
  n'a ni le rail, ni le header, ni le thème du module. Au changement de chapitre, aucun retour visuel.
- **Recommandation — patron « Module Frame ».**
  ```
  <module>/layout.tsx   Server · device (cache) · <ModuleFrame device>{children}</ModuleFrame>
                        → data-theme + rail + header. Aucune donnée métier.
  <module>/loading.tsx  squelette de la ZONE DE CONTENU seulement, dans le thème du module
  <module>/page.tsx     données du chapitre actif + contenu. Plus de shell.
  ```
  - Le rail connaît le chapitre actif via `useSearchParams()` (client) : un layout ne reçoit pas les
    `searchParams` et ne se re-rend pas à la navigation — c'est précisément ce qu'on veut.
  - Les **modules contextuels** (overlays `?module=` de Consultants/Engagements/Opportunités) restent
    rendus par la page : ils dépendent de données. Le frame ne leur fournit qu'un emplacement.
  - Le layout lit `headers()` : sans Cache Components, la navigation **entrante** attend le rendu du
    layout (lecture d'en-tête mémoïsée, ~0 ms) — le squelette de contenu, lui, est préchargé avec le
    layout (`linking-and-navigating.md` : « shared layouts and loading skeletons can be requested
    ahead of time »).
- **Effort.** M par module (6 modules) · **Risque** faible à moyen (props des shells à scinder).

### O-2 · `(app)/loading.tsx` imite une page qui n'existe plus

- **Preuve.** [`(app)/loading.tsx`](../../src/app/(app)/loading.tsx) : en-tête + 4 KPI + 5 cartes,
  thème clair, `p-4 sm:p-6`. Aucune page actuelle n'a cette forme.
- **Conséquence.** C'est littéralement « l'ancienne version » que l'utilisateur voit sur 11 routes.
- **Recommandation.** Le remplacer par un **fallback neutre** : fond `bg-canvas` + indicateur de
  progression fin, **aucune fausse mise en page**. Un squelette générique ne peut ressembler qu'à
  une page fictive ; la forme appartient aux `loading.tsx` de module (O-1).
  Ne pas le supprimer : sans frontière au niveau `(app)`, une navigation vers une route sans
  `loading.tsx` bloquerait sans retour visuel.
- **Effort.** S.

### O-3 · Squelettes périmés et doublons

| Fichier | Défaut | Action |
|---|---|---|
| [`reports/loading.tsx:14`](../../src/app/(app)/reports/loading.tsx) | `data-theme="intelligence-reports"` (sombre) ; la page est `edito-bright-reports`. Son commentaire justifie un thème que la page n'a plus. | Réécrire dans le thème actuel, zone de contenu seulement |
| [`[companyId]/loading.tsx:4`](../../src/app/(app)/prospection/accounts/[companyId]/loading.tsx) | `data-theme="cockpit"` + 6 onglets horizontaux ; le cockpit est `edito-bright-cockpit`, 5 étapes, rail vertical | Réécrire sur la grille réelle de `ClientIntelligenceDesktopView` / `MobileView` |
| [`CrmEntityPanel.tsx:31`](../../src/components/accounts-contacts/CrmEntityPanel.tsx) `LoadingShell` | 3e dessin différent pour le même cockpit | Réutiliser le squelette cockpit unique |
| [`approche-sectorielle/loading.tsx`](../../src/app/(app)/prospection/approche-sectorielle/loading.tsx) + `[slug]/loading.tsx` | Squelettes de pages **supprimées** : la route ne fait que `permanentRedirect("/intelligence")` | Supprimer (O-5) |
| `cockpit`, `finance`, `automations` : `<Suspense fallback={<DashboardSkeleton/>}>` | 2e squelette après `(app)/loading` | Un seul squelette par route : `loading.tsx` du module, `Suspense` interne retiré |
| [`AgendaSection.tsx:16`](../../src/components/agenda/AgendaSection.tsx) | Mobile servi par `AgendaDesktopSkeleton` ; `agenda/loading.tsx` dessine une 3e forme | `agenda/loading.tsx` = squelette device du module ; `Suspense` interne retiré |
| [`intelligence/page.tsx:27`](../../src/app/(app)/intelligence/page.tsx) | `BusinessIntelligenceLoading*` est **fidèle** (le meilleur de l'app), mais passe après `(app)/loading` | Le promouvoir en `intelligence/loading.tsx` |

**Règle à poser :** *une route = un squelette = celui de sa zone de contenu, dans le thème de son
module.* Voir garde-fou §7.

### O-4 · `CrmTabbedShell` : trois recompositions après hydratation

1. **Onglets persistés.** [`create-tab-store.ts:34`](../../src/lib/tabs/create-tab-store.ts) :
   `persist` sur `sessionStorage`, stockage synchrone → le store est hydraté **avant** le premier
   rendu client, alors que le serveur a rendu `activeTabId: "home"`. Si un onglet compte était ouvert,
   le HTML serveur (liste Comptes) ne correspond pas au premier rendu client : React signale un
   écart d'hydratation et re-rend côté client. **L'utilisateur voit la liste, puis le cockpit.**
   *Next 16 le documente comme anti-motif* (`preventing-flash-before-hydration.md`).
2. **Repli de sidebar tardif.** [`CrmTabbedShell.tsx:49`](../../src/components/accounts-contacts/CrmTabbedShell.tsx) :
   `requestCollapse()` dans un `useEffect` → la sidebar est rendue dépliée puis se replie avec
   `transition-[width]` ([`DesktopSidebar.tsx:182`](../../src/components/layout/DesktopSidebar.tsx)).
   Sur `/prospection/accounts/[id]`, ce cas est **dérivable du pathname** et n'a pas besoin d'effet.
3. **Cockpits masqués en CSS.** [`CrmTabbedShell.tsx:151`](../../src/components/accounts-contacts/CrmTabbedShell.tsx) :
   tous les onglets sont montés (`hidden`), et chaque [`CrmEntityPanel`](../../src/components/accounts-contacts/CrmEntityPanel.tsx:87)
   lance `fetch /api/intelligence/{id}` **et** `/api/intelligence-panel/{id}` au montage. Avec
   10 onglets restaurés : **20 requêtes API** complètes à chaque rechargement de n'importe quelle
   page `/prospection/**`, pour 9 cockpits invisibles. Parallèlement, la page serveur sous-jacente
   (liste ou fiche) est calculée et envoyée **même quand elle est masquée**. Violation directe du
   corollaire ADR-0006 « ne jamais charger le composant lourd pour le masquer en CSS ».

**Recommandation.**
- (1) Rendre l'état restauré **non bloquant pour le premier paint** : `skipHydration: true` sur le
  store, `rehydrate()` dans un effet du shell, et tant que la réhydratation n'est pas faite, rendre
  ce que le serveur a rendu. Pour une ouverture directe d'URL, **l'URL fait foi** (pas le store).
- (2) Ajouter `/prospection/accounts/<id>` à la politique pure `shouldAutoCollapseDesktopSidebar` ;
  ne garder le verrou `useSidebarCollapse` que pour le mode onglet embarqué.
- (3) Montage paresseux : un panneau n'est monté qu'à sa **première activation**, puis conservé
  (l'état d'onglet reste préservé, c'était la raison du « tout monté »). Données du cockpit mises en
  cache dans le store par `entityId` pour éviter le refetch au retour.
- **Effort.** M · **Risque** moyen : mode multi-onglets, deep links `?aiSection=`. Tests existants de
  `account-intelligence-desktop-navigation` à étendre.

### O-5 · Les redirections permanentes passent par le moteur de rendu

- **Preuve.** 10 pages dont le seul corps est `permanentRedirect(...)` (liste §3). Sous
  `(app)/loading.tsx`, la réponse est un flux 200 : squelette, **puis** l'instruction de redirection.
  La sidebar contient en plus un contournement : `item.href === "/prospection" ? "/prospection/accounts"`
  ([`DesktopSidebar.tsx:105`](../../src/components/layout/DesktopSidebar.tsx)).
- **Recommandation.** Déclarer les 9 redirections **statiques** dans `next.config.ts` → `redirects()` :
  308 servi avant tout rendu, zéro squelette, zéro rendu React. Supprimer les pages et les deux
  `loading.tsx` orphelins. Corriger `main-menu.config.ts` au lieu du contournement.
  `/staffing` (redirection calculée depuis les query params) et `/agenda` restent tels quels —
  **F-9 a tranché `/agenda`, on ne le rouvre pas.**
- **Effort.** S · **Risque** faible (conserver le 308 permanent, vérifier les liens internes par `grep`).

### O-6 · Les pages adaptives téléchargent les deux vues

- **Preuve.** [`ClientIntelligenceView.tsx:6-7`](../../src/components/accounts-contacts/intelligence/ClientIntelligenceView.tsx)
  importe statiquement `ClientIntelligenceDesktopView` (1 113 lignes) **et** `ClientIntelligenceMobileView`
  (747 lignes). Vérifié dans le build : le libellé `"Navigation Account Intelligence"`, propre à la vue
  mobile, est présent dans les chunks d'entrée de la route (48 + 15 Ko gzip) ; même constat pour
  `ReportsMobileView` sur `/reports` (20 Ko gzip). Le motif est systémique :
  `/missions`, `/consultants`, `/intelligence`, `/knowledge`, `/veille` distribuent Desktop/Mobile par
  un `if` serveur autour de deux imports statiques.
- **Cause.** Une frontière client importée par un Server Component figure dans le manifeste
  d'entrée de la route **quelle que soit la branche rendue**. ADR-0006 est respecté pour les données
  (la vue non rendue ne charge rien), **pas pour le JS**. `CrmEntityPanel` avait déjà corrigé ce
  défaut par `next/dynamic` (son commentaire l.11) ; la route serveur ne l'a pas repris.
- **Distinction avec F-7 (invalidé, non rouvert).** F-7 portait sur des hôtes **déjà** en
  `next/dynamic` ; la mesure a montré que seul un stub partait. Ici les imports sont **statiques** et
  le corps des vues est dans le chunk (texte JSX retrouvé). Mécanisme différent — mais la leçon de
  F-7 s'applique : **mesurer avant de coder** (Lot 4).
- **Recommandation.** Pour chaque dispatcher adaptatif, charger la vue par `next/dynamic` avec un
  `loading` = squelette fidèle (O-3). À valider par `ANALYZE=true npm run build` route par route.
- **Gain.** Borne haute : les chunks contenant la vue non rendue (fiche compte ≈ 60 Ko gzip,
  `/reports` ≈ 20 Ko). Chiffre réel au Lot 4.
- **Effort.** M · **Risque** faible.

### O-7 · Le socle du shell embarque les deux navigations et tout le panneau Intelligence

- **Preuve.** [`AppShell.tsx`](../../src/components/layout/AppShell.tsx) distribue `DesktopSidebar` +
  `IntelligencePanel` ou `MobileNav` + `IntelligenceFAB` + `MobileAccountQuickSearchHost` par un `if`
  serveur : même mécanisme qu'O-6, donc les deux branches partent sur tous les appareils.
  [`IntelligencePanel.tsx:29-32`](../../src/components/intelligence/IntelligencePanel.tsx) importe
  statiquement `MissionComposerDesktop`, `MatchingComposer`, `PitchMailDrawerContent` — du code qui ne
  sert qu'à l'ouverture du panneau. [`IntelligenceFAB.tsx`](../../src/components/intelligence/IntelligenceFAB.tsx)
  (820 lignes) importe statiquement le contenu cockpit mobile.
- **Mesure disponible.** Socle `(app)/layout` = **221 Ko gzip** sur 11 chunks ; dont `supabase-js`
  (chunk `11b8--b8bsw1h`, 63 Ko gzip — **F-13**, voir §5) et un chunk de 34 Ko gzip portant
  indicateur de workflow, panneau Intelligence, bac à sable, recherche rapide mobile.
- **Recommandation.** Deux frontières `next/dynamic` : `DesktopChrome` / `MobileChrome` (une seule
  téléchargée), et le **corps** du panneau Intelligence chargé à la première ouverture (le bouton
  bascule reste dans le socle). Même prudence qu'O-6 : mesurer d'abord.
- **Effort.** M · **Risque** moyen (le panneau s'enregistre au contexte via `RegisterIntelligenceContext`
  au montage des pages : le store doit rester dans le socle, seul le rendu est différé).

### O-8 · Loaders : cascades résiduelles, dimensionnés correctement ailleurs

L'audit données a déjà traité l'essentiel (fiche compte 5 → 3 vagues, `/cockpit` 480 → 151 Ko,
`/veille` 42 → 23 requêtes, `/reports` 7 → 4). Il reste des **cascades d'orchestration**, pas des
requêtes lourdes :

| Où | Défaut | Correction | Gain |
|---|---|---|---|
| [`consultants/page.tsx:89-101`](../../src/app/(app)/consultants/page.tsx) | 3 `await` séquentiels de modules (`pool`, `production`, `matching`), **puis** le chapitre | Lancer le module demandé et le chapitre dans le même `Promise.all` (≤ 2 promesses : compatible pool PostgREST de 10) | −1 vague quand un module est ouvert (~100 ms) |
| [`missions/page.tsx:95-132`](../../src/app/(app)/missions/page.tsx) | Modules contextuels **puis** chapitre ; `missions-at` : liste **puis** détail même quand `?mission=` est connu | Même `Promise.all` ; détail lancé en parallèle si l'id est dans l'URL | −1 à −2 vagues |
| [`veille/page.tsx:117`](../../src/app/(app)/veille/page.tsx) | Comptage du numéro de digest séquentiel après la vague principale | Le calculer depuis `pastDigests` déjà chargé quand le digest y figure | −1 requête |
| [`accounts-contacts-data.ts:358`](../../src/lib/accounts-contacts/accounts-contacts-data.ts) | 2 000 `tasks` lues pour un comptage | Laisser tel quel : **36 lignes** en base. À revoir si > 1 000 | nul aujourd'hui |
| [`prospection-intelligence/page.tsx`](../../src/app/(app)/prospection-intelligence/page.tsx) | Prototype au menu : charge le snapshot BI complet, mobile « en cours de développement » | **Décision produit** : retirer du menu ou finir | — |
| [`missions/opps/page.tsx:82`](../../src/app/(app)/missions/opps/page.tsx) | Mobile : `EmptyState` provisoire | Suivi produit, pas perf | — |

**Non recommandé :** paralléliser au-delà (pool PostgREST de 10, F-10), cache serveur agressif,
RPC (doctrine projet). Voir §5.

### O-9 · Dette relevée en passant

- **Code orphelin** (0 importeur, vérifié par `grep`) : `MissionsActivesContent`,
  `ActiveMissionsOverviewSection`, `StaffingDetailPanel`. `SectionDashboardTemplate` n'est plus
  utilisé que par `(dev)/dashboard-test`. À confirmer puis supprimer.
- **`/settings`** et le pied de `DesktopSidebar` affichent des valeurs **codées en dur**
  (« Guillaume K. », « 14 utilisateurs actifs », statuts de connecteurs fictifs).
- **ADR-0006 non appliqué sur un point** : `src/STRUCTURE.md:97` note « à corriger avant mise en
  production : `Vary: User-Agent` + correction client post-hydratation ». Ni l'un ni l'autre n'existe.
  Sans `Vary`, un cache intermédiaire pourrait servir la branche d'un appareil à l'autre ; risque
  faible tant que toutes les routes `(app)` sont `force-dynamic` et privées, mais la dette est réelle.
- `useCurrentWorkflowExecution` appelle une Server Action **au montage de chaque chargement
  complet**, en plus du canal Realtime. Acceptable (F-13 tranchera l'indicateur), à garder en tête :
  les Server Actions sont sérialisées côté client.

---

## 5. Ce que ce plan ne rouvre pas

| Sujet | Décision existante | Conséquence ici |
|---|---|---|
| Cache Components / PPR | **Refusé** — [ADR-0017](../adr/ADR-0017-cache-components-ppr-refuse.md), D-13 d'ADR-0006 | Le patron O-1 fonctionne **sans** ce flag. Le guide `instant-navigation.md` (`unstable_instant`) en dépend : non retenu. |
| Hôtes de tiroirs conditionnels | **Invalidé par mesure** — F-7 | O-6/O-7 portent sur des imports statiques ; mesure préalable obligatoire |
| `supabase-js` dans le socle (63 Ko gzip) | **Bloqué par un choix produit** — F-13 : l'indicateur de workflow doit-il être sur toutes les pages ? | Reste une décision Guillaume, rappelée au Lot 5 |
| Payload `/prospection/accounts` (1,15 Mo RSC) | **Bloqué par conception** — F-6, chantier XL | O-4 ne touche pas aux contacts |
| Redirection `/agenda` | **Déclassé** — F-9 | Exclue d'O-5 |
| Plancher PostgREST 108 ms, pool 10 | **Décision de plan** — F-10 | Seul levier restant sur le temps serveur, hors code |
| Realtime | ADR-0016 | Non touché |

---

## 6. Plan d'actions

Ordre dicté par l'impact perçu et la dépendance : les squelettes (Lot 2) supposent que la frontière
de chargement est au bon niveau (Lot 1). Chaque lot se termine par la boucle
`typecheck → test → check:server-boundary → lint → build` et une QA visuelle Guillaume.

### Lot 0 — Constater avant de corriger · S · *bloquant*

- Enregistrement écran (Guillaume) de 6 parcours : `/cockpit → /missions`, `/missions?vue=synthese →
  ?vue=projets`, rechargement de `/reports`, `/prospection/accounts` → ouvrir 3 comptes → recharger,
  ouverture de `/prospection/accounts/[id]`, `/cockpit → /intelligence`. Mobile + desktop.
- Console : présence d'une erreur d'hydratation au rechargement avec onglets CRM ouverts (O-4.1).
- Onglet Réseau : nombre d'appels `/api/intelligence*` au rechargement avec N onglets (O-4.3).
- **Critère de sortie :** chaque mécanisme A–D confirmé ou infirmé. Un mécanisme infirmé sort du plan.

### Lot 1 — Frontières de chargement au bon niveau (O-1, O-2, O-5) · M–L · *le lot qui supprime le symptôme*

1. **O-5 d'abord** (S) : 9 redirections dans `next.config.ts`, suppression des pages et loadings
   orphelins, correction de `main-menu.config.ts`.
2. **O-2** (S) : `(app)/loading.tsx` devient un fallback neutre.
3. **O-1, un module à la fois**, pilote `/missions` (le plus lourd, 130 Ko propres, 5 vues) :
   - `missions/layout.tsx` porte `EngagementsFrame` (thème + rail + header, rail actif via
     `useSearchParams`) ; `EngagementsDesktopView` ne garde que l'emplacement des modules contextuels ;
   - `missions/loading.tsx` = squelette de zone de contenu ;
   - puis `/consultants`, `/missions/opps`, `/reports`, `/veille`, `/intelligence`, `/knowledge`.
   - `/missions/opps` est **sous** `missions/layout.tsx` : le frame Engagements ne doit pas s'y
     appliquer. Trancher au pilote : route group `(engagements)` pour `/missions` seul, ou frame
     conditionné au segment enfant via `useSelectedLayoutSegment()`. **Recommandation : route group**,
     explicite et sans logique client.
- **Critère de sortie :** entrer dans un module ou changer de chapitre montre **immédiatement** le
  rail et le thème du module, avec un squelette de contenu seul. Aucun écran clair générique.
- **Pièges connus :** un Client Component du frame qui importe une *valeur* d'un module `server-only`
  passe `tsc` et casse `next build` (CLAUDE.md) ; faire tourner `build:webpack` sur le pilote.

### Lot 2 — Un squelette par route, fidèle (O-3) · M

- Réécrire `reports/loading.tsx` et `[companyId]/loading.tsx` dans les thèmes actuels.
- Retirer les `Suspense` internes doublons de `/cockpit`, `/finance`, `/automations`, `/agenda` ; leur
  squelette devient le `loading.tsx` du module, **par device** (le `loading.tsx` lit
  `getDashboardDevice()`, mémoïsé).
- Promouvoir `BusinessIntelligenceLoading*` en `intelligence/loading.tsx`.
- `CrmEntityPanel` et le `loading` du `next/dynamic` réutilisent le squelette cockpit unique.
- Squelettes regroupés à côté de leur vue (`…DesktopSkeleton.tsx` / `…MobileSkeleton.tsx`) pour
  qu'une refonte de vue touche aussi son squelette dans la même revue.
- **Critère de sortie :** zéro enchaînement de deux squelettes ; contrôle §7 vert.

### Lot 3 — Shell CRM stable à l'hydratation (O-4) · M

- Store d'onglets `skipHydration` + réhydratation explicite ; l'URL prime sur le store en ouverture
  directe.
- Politique de repli de sidebar étendue à `/prospection/accounts/<id>` (fonction pure + test).
- Montage paresseux des `CrmEntityPanel`, cache par `entityId`.
- **Critère de sortie :** aucune erreur d'hydratation ; au rechargement avec 10 onglets, **2** appels
  `/api/intelligence*` (onglet actif) au lieu de 20 ; aucune animation de sidebar au chargement.

### Lot 4 — JS par device, mesuré (O-6, O-7) · M · *go/no-go sur mesure*

- `ANALYZE=true npm run build` : attribuer précisément le poids des vues non rendues sur
  `[companyId]`, `/missions`, `/consultants`, `/reports`, `/veille`, `/intelligence`, et des deux
  chromes dans le socle.
- **Seuil de décision : ≥ 15 Ko gzip par route** (en dessous, le coût en complexité l'emporte — même
  raisonnement que F-7).
- Au-dessus : dispatchers en `next/dynamic` avec squelette fidèle ; `DesktopChrome`/`MobileChrome`
  dynamiques ; corps du panneau Intelligence chargé à la première ouverture.
- **Critère de sortie :** tableau avant/après par route, dans ce document.

### Lot 5 — Loaders et dette (O-8, O-9) · S–M

- Cascades `/consultants`, `/missions`, `/veille` (§O-8).
- Suppression du code orphelin après confirmation.
- `Vary: User-Agent` sur les réponses `(app)` (dans `proxy.ts`).
- **Décisions à porter à Guillaume** (aucune ne se tranche en code) :
  1. F-13 — indicateur de workflow sur toutes les pages, ou seulement `/automations` + pages à run ?
     (libère 63 Ko gzip de `supabase-js` du socle)
  2. `/prospection-intelligence` — retirer du menu ou terminer ?
  3. `/settings` — masquer les valeurs fictives ou brancher les vraies ?
  4. F-10 — essai d'un mois sur une instance Pro, mesuré.

### Synthèse

| Lot | Constats | Effort | Effet perçu | Effet mesurable |
|---|---|---|---|---|
| 0 | — | S | — | confirme A–D |
| **1** | O-1, O-2, O-5 | M–L | **fin de « l'ancienne page »**, retour immédiat au clic de rail | 9 redirections sans rendu |
| **2** | O-3 | M | fin des doubles/triples squelettes et du flash sombre | — |
| **3** | O-4 | M | fin du « liste puis cockpit » et du repli tardif | −18 requêtes API au rechargement (10 onglets) |
| 4 | O-6, O-7 | M | chargement initial plus court sur mobile | −X Ko gzip, chiffré au lot |
| 5 | O-8, O-9 | S–M | — | −1 à −2 vagues sur 3 routes |

---

## 7. Garde-fou durable

Le défaut est né d'une refonte d'écran qui n'a pas emporté son état de chargement. Sans contrôle,
il reviendra à la prochaine refonte. Ajouter au Lot 2 un test Vitest statique
(`src/app/__tests__/loading-fidelity.test.ts`, dans le périmètre de `npm test`) qui échoue si :

1. un `loading.tsx` porte un `data-theme` différent de celui de la page ou du frame de son module ;
2. un `page.tsx` contient à la fois un `permanentRedirect` inconditionnel et rien d'autre (doit vivre
   dans `next.config.ts`) ;
3. un `page.tsx` rend un `<Suspense>` alors que son segment a déjà un `loading.tsx` (double squelette) ;
4. un module rendant un `SectionRail` n'a pas de `layout.tsx` qui le porte.

Et une règle dans `CLAUDE.md` § Adaptive Design, à reprendre après le Lot 1 :
> **Le shell d'un module vit dans son `layout.tsx`, son squelette dans son `loading.tsx`, dans le
> même thème. Refondre une vue = refondre son squelette dans le même commit.**

---

---

## 8. Journal d'exécution — 2026-09-14

Commits sur `main` : `f4925d49` (Lots 1-2) · `6b9f639f` (Lot 3) · `4bbf5b7d` (correctif build webpack) ·
`cfbdae64` (Lot 4) · Lot 5 (commit suivant). Validation à chaque lot : `typecheck` → `test` →
`check:server-boundary` → `lint` (fichiers touchés) → `build`, plus `build:webpack` au Lot 4.

**Lot 0 non exécuté** : il demande un enregistrement des parcours par Guillaume (QA visuelle). Les
corrections ont été conduites sur la lecture du code et de la documentation Next installée ; la QA
visuelle reste le contrôle final.

### Lots 1-2 — frontières de chargement et squelettes ✅

| Constat | Livré |
|---|---|
| O-5 | 9 redirections dans `next.config.ts` via `src/lib/navigation/legacy-redirects.ts` (vérifiées dans `routes-manifest.json` : 308) ; 11 pages et 2 squelettes orphelins supprimés ; contournement `/prospection` retiré de `DesktopSidebar`. 5 tests d'invariants réécrits pour porter sur la table au lieu des pages. |
| O-2 | `(app)/loading.tsx` = fond + barre de progression différée de 150 ms (`.kredo-route-progress`). |
| O-1 | `EngagementsDesktopFrame`, `ConsultantsDesktopFrame`, `OpportunitiesDesktopFrame` montés par les layouts, pilotés par l'URL avec les mêmes fonctions pures que les pages. Route groups `missions/(engagements)` et `missions/opps/(workspace)`. Overlays de modules restés dans les pages (`<dialog>` modaux). Squelette de contenu sensible au chapitre demandé (`UrlAwareContentSkeleton`). |
| O-3 | `WorkspaceSkeleton.tsx` (rail titré + header 76 px + corps). Squelettes par device : cockpit **sombre** (réutilise `cockpit-desktop.css` — la page d'accueil clignotait clair → sombre), Account Intelligence edito-bright (source unique partagée avec `CrmEntityPanel`), comptes, Rapports (était sombre), Veille, Finance, Automatisations, Knowledge, Agenda (mobile ≠ desktop), BI workspace. `Suspense` doublons retirés (cockpit, finance, automations, agenda). Thème de Rapports et Veille déplacé dans leur layout. |
| O-8 (partiel) | Engagements et Consultants : modules chargés dans la même vague que le chapitre ; Synthèse et Atlas partagent une seule lecture du portefeuille ; détail mission/projet en parallèle quand l'id est dans l'URL. |

### Lot 3 — shell CRM ✅

- Stores d'onglets : `skipHydration` + `TabStoresHydrator` (AppShell) ; **seule la liste des onglets
  est persistée** — au rechargement, l'URL décide de l'écran, plus l'onglet actif mémorisé. Toute
  mutation antérieure à la réhydratation la déclenche. 4 tests comportementaux.
- `isAccountCockpitPathname` : repli de la sidebar juste dès le rendu serveur sur une fiche compte.
- Montage paresseux des panneaux d'onglet (10 onglets restaurés : 20 appels API → 0 au chargement).

### Lot 4 — JS par device ✅ *mesuré, avec retours arrière*

Mesure : union dédupliquée des chunks d'entrée de la route et des chunks des imports dynamiques
effectivement rendus, par device (script reconstruit à partir des chargeurs Turbopack `e.A(id)`).

| Route | Avant (post-Lot 3) | Desktop | Mobile |
|---|---|---|---|
| `/cockpit` | 257 | **171** | **141** |
| `/agenda` | 250 | 169 | 172 |
| `/prospection/accounts` | 266 | 186 | 189 |
| fiche compte | 398 | 337 | 378 |
| `/missions` | 351 | **209** | 289 |
| `/missions/opps` | 291 | 220 | 222 |
| `/consultants` | 305 | 238 | 240 |
| `/finance` | 272 | 191 | **143** |
| `/intelligence` | 272 | **161** | 171 |
| `/reports` | 275 | 255 | 257 |
| `/veille` | 321 | 263 | 237 |
| `/knowledge` | 253 | 167 | 169 |
| `/automations` | 246 | 154 | 156 |
| `/settings` | 221 | **129** | **131** |

Ce que la mesure a appris, et qui a changé le plan :
- **Le découpage duplique.** Cinq imports dynamiques séparés pour la chrome alourdissaient le desktop
  jusqu'à +22 Ko (Veille) : regroupés en un import par device (`desktop-chrome.ts` / `mobile-chrome.ts`).
- **Sous le seuil de 15 Ko, retour arrière** : Rapports (−5/−11), Automatisations (−5/−11), Knowledge
  (−3/−3), Agenda (−6/−10) gardent leurs imports statiques. Retirer le découpage de Veille, en
  revanche, la dégradait (342/300) : conservé.
- **Le gain principal n'était pas les vues mais la chrome** : composeurs, tiroirs et 16 vues de
  résultat étaient tirés dans le socle par un simple prédicat (`isDeterministicIntelligenceAction`),
  désormais dans un module pur. `AppDrawer` rendant toujours ses enfants, le contenu du tiroir FAB
  n'est monté qu'à la première ouverture.
- Correctif collatéral : `build:webpack` échouait avant ce chantier (`:global(:root)` dans
  `AccountIntelligenceSignatureHeader.module.css`, commit `9eb7c9bc`) — rétabli, il passe.

### Lot 5 — loaders, dette, garde-fou ✅

- `/veille` : numéro de digest calculé depuis la liste déjà chargée quand elle est complète (repli
  sur la requête `count` sinon, mêmes critères).
- `Vary: User-Agent` posé par `src/proxy.ts` ; note de `src/STRUCTURE.md` mise à jour (la correction
  client post-hydratation d'ADR-0006 reste inexistante).
- Code mort : les 3 orphelins d'O-9 **et leur cascade**, 27 fichiers au total de l'ancien shell
  Missions/Staffing (`components/common/Entity*`, planning mission historique, onglets staffing),
  détectés itérativement, aucun importeur ni test.
- Garde-fou `src/app/__tests__/loading-fidelity.test.ts` (74 assertions), vérifié par mutation : il
  échoue sur un `<Suspense>` doublon et sur un thème retiré.
- Règle durable ajoutée à `CLAUDE.md` § Adaptive Design.

### Reste ouvert

| Sujet | Pourquoi pas dans ce chantier |
|---|---|
| **`/intelligence` : reprise de session BI** | `BusinessIntelligenceEntryGate` rend le catalogue côté serveur (et en charge les données), puis redirige côté client vers le dernier segment consulté (`sessionStorage`, 15 min). Au rechargement : catalogue → squelette → workspace. Le corriger suppose une mémoire lisible par le serveur (cookie) et une redirection avant rendu — refonte d'un dispositif conçu et testé. **Prochain chantier recommandé.** |
| O-8 `/missions/opps` (F-12) | Reporté par l'audit données, non rouvert. |
| Contenu masqué en CSS sous `CrmTabbedShell` | La page liste est calculée même quand un onglet est actif ; dépend du modèle d'onglets non navigants (F-6). |
| Décisions produit | F-13 (indicateur de workflow partout ?), `/prospection-intelligence`, valeurs codées en dur de `/settings` et du pied de sidebar, essai F-10. |
| Dette préexistante relevée | `react-hooks/set-state-in-effect` dans `IntelligencePanel.tsx:377` (non introduite ici). |

## Annexe A — Inventaire des états de chargement *(état AVANT le chantier)*

| Fichier | Couvre | État |
|---|---|---|
| `(app)/loading.tsx` | 11 routes sans loading propre | ❌ page fictive |
| `agenda/loading.tsx` | `/agenda` | ❌ 3e forme, puis `AgendaDesktopSkeleton` |
| `prospection/accounts/loading.tsx` | liste comptes | ⚠️ à aligner sur `AccountsContactsViews` |
| `prospection/accounts/[companyId]/loading.tsx` | fiche compte | ❌ ancien cockpit cobalt, 6 onglets |
| `prospection/approche-sectorielle/loading.tsx` + `[slug]` | redirections | ❌ pages supprimées |
| `reports/loading.tsx` | `/reports` | ❌ ancien thème sombre |
| `components/ui/DashboardSkeleton.tsx` | `/cockpit`, `/finance`, `/automations` | ❌ 2e squelette générique |
| `components/agenda/AgendaDesktopSkeleton.tsx` | `/agenda` (desktop **et mobile**) | ⚠️ faux sur mobile |
| `features/business-intelligence/states/BusinessIntelligenceLoading.tsx` | `/intelligence` | ✅ fidèle — à promouvoir |
| `CrmEntityPanel.tsx` `LoadingShell` | onglets CRM + chunks dynamiques | ❌ générique |

## Annexe B — Mesure du JS par route

Build de production du 2026-09-14 (`next build`, Turbopack). Pour chaque
`.next/server/app/(app)/**/page_client-reference-manifest.js`, somme gzip des `entryJSFiles` de la
page, et de la même liste privée des fichiers de `(app)/layout`. Script conservé hors dépôt ; le
reproduire en ~30 lignes Node (`zlib.gzipSync` sur chaque chunk référencé).

| Route | Total gzip | Propre à la page |
|---|---|---|
| `/prospection/accounts/[companyId]` | 396 Ko | 175 Ko |
| `/missions` | 351 Ko | 130 Ko |
| `/veille` | 321 Ko | 100 Ko |
| `/consultants` | 303 Ko | 82 Ko |
| `/missions/opps` | 289 Ko | 68 Ko |
| `/reports` | 275 Ko | 54 Ko |
| `/finance` · `/intelligence` | 271 Ko | 50 Ko |
| `/prospection/accounts` | 264 Ko | 43 Ko |
| `/cockpit` | 256 Ko | 35 Ko |
| `/knowledge` | 253 Ko | 32 Ko |
| `/agenda` | 250 Ko | 29 Ko |
| `/automations` | 245 Ko | 24 Ko |
| `/settings` | 221 Ko | 0 Ko |
| **Socle `(app)/layout`** | **221 Ko** | — |

⚠️ Ces chiffres sont gzip ; le mode de compression réellement servi par Vercel (brotli) donne des
valeurs ~15 % plus basses. Les comparaisons avant/après du Lot 4 doivent utiliser le même script.
