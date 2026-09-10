# 06 — Journal du chantier

> Une entrée par investigation ou décision. **Les prémisses invalidées comptent autant que les
> confirmations** — c'est le principal enseignement de l'audit de juillet 2026, où trois lots sur
> cinq ont vu leur diagnostic contredit par la mesure.

---

## 2026-09-10 · Session d'audit — diagnostic initial

### Ce qui a été fait

| Étape | Méthode | Résultat |
|---|---|---|
| Instrumentation | `perf-trace.ts` branché sur le `fetch` du client Supabase serveur, activé par `KREDO_PERF_TRACE=1` | Trace de chaque aller-retour : table, `t0`, durée, octets |
| Build de mesure | Worktree git isolé + `node_modules` cloné (`cp -Rc`) + `next build` + `next start:3100` | Le serveur de dev de Guillaume n'a pas été interrompu |
| Session de test | `admin/generate_link` → `auth/v1/verify` → cookie `sb-<ref>-auth-token` | Session authentifiée réelle, jeton **ES256** confirmé |
| Mesure des routes | 13 routes × 3 passes, `curl -w` sur le build de production | Tableau de [00](00-BASELINE-AND-SCOPE.md) §4 |
| Mesure base | `pg_stat_statements`, `EXPLAIN (ANALYZE, BUFFERS)`, advisors, `edge_logs`, `postgrest_logs` | [03](03-DATABASE-AUDIT.md) |
| Mesure bundle | Analyse de `.next/static` + corrélation avec les `<script>` de chaque page | [00](00-BASELINE-AND-SCOPE.md) §4.3 |

### Décisions d'investigation

**D-1 — Ne pas interrompre le serveur de dev en cours.** Next 16 refuse deux `next dev` sur le
même répertoire. Plutôt que de tuer le processus de Guillaume (PID 20055), la mesure a été faite
sur un **build de production dans un worktree isolé**. Bénéfice inattendu : les chiffres obtenus
sont ceux de la production, pas ceux du mode dev — ils sont donc directement exploitables.
*Piège rencontré :* Turbopack refuse un `node_modules` en lien symbolique vers l'extérieur de la
racine (`Symlink … points out of the filesystem root`). Contourné par `cp -Rc` (clonefile APFS,
5 s, 487 Mo sans duplication de blocs).

**D-2 — Mesurer plutôt que lire le code, y compris pour l'authentification.** Le banc dédié
(`authbench.mjs`) a produit le résultat le plus contre-intuitif de la session : `getClaims()` coûte
**0,4 ms sur un client partagé et 77–184 ms sur un client neuf**. La lecture du code seule aurait
conclu que la conversion `getUser()` → `getClaims()` du Lot 3 (juillet 2026) suffisait. Elle ne
suffit pas : avec 282 `createClient()`, chaque module retélécharge le JWKS. Les **427 appels
quotidiens à `/auth/v1/.well-known/jwks.json`** relevés dans `edge_logs` le confirment
indépendamment.

**D-3 — `edge_logs` est la meilleure source de vérité disponible.** Le champ
`response.origin_time` donne la latence **côté Supabase**, donc indépendante du poste de mesure.
C'est ce qui permet d'affirmer que le coût d'un aller-retour PostgREST est de **116 ms p50 /
602 ms p95** sans dépendre de la position géographique du client. Cette source n'avait pas été
utilisée par l'audit de juillet 2026.

**D-4 — Ne pas rouvrir les dossiers déjà tranchés.** Le décodage WAL Realtime représente toujours
84,5 % du CPU de la base (100 269 appels / 544 s sur 21 h 32) — chiffre conforme à
l'[ADR-0016](../adr/ADR-0016-realtime-notifications-cout-mesure.md), qui l'a clos sur la valeur
absolue (0,83 % d'un cœur). Le présent audit **ne le rouvre pas** et propose à la place d'agir sur
le volume de WAL en amont (F-11). Même traitement pour `cacheComponents`/PPR
([ADR-0017](../adr/ADR-0017-cache-components-ppr-refuse.md)).

### Prémisses écartées par la mesure

| Hypothèse plausible | Ce que la mesure a montré | Conséquence |
|---|---|---|
| « Des index manquent » | `EXPLAIN` sur les requêtes les plus lourdes : tout en `shared hit`, aucun `Rows Removed by Filter`. Le *planning* consomme plus de buffers que l'exécution (246 contre 118). | **Aucun index recommandé.** |
| « Les RLS coûtent cher » | 258 policies, **0** non wrappée `(SELECT …)`. Acquis du Lot 1 de juillet 2026. | Rien à faire. |
| « Le TTFB est mauvais » | 10–25 ms sur **toutes** les routes, grâce à `(app)/loading.tsx`. | Le TTFB ne discrimine rien ; la grandeur utile est la durée totale du flux streamé. |
| « Il faut paralléliser davantage » | Le pool PostgREST fait **10 connexions** (`postgrest_logs`). `/cockpit` émet 14 requêtes simultanées, `/veille` 17. | **Paralléliser n'est plus un levier** : il faut supprimer des appels. |
| « Les requêtes dupliquées coûtent cher » | Next 16 mémoïse les `fetch` GET identiques : doublon `/automations` observé à `dur=0.2 ms`. | Coût réel faible — **mais** la protection ne joue qu'à URL strictement identique. |
| « `/prospection/accounts` est lente » | 0,35 s côté serveur — c'est **le client** qui paie (1,15 Mo de flux RSC). | Le correctif est le volume sérialisé, pas la requête. |

### Ce qui n'a pas pu être déterminé

| Question ouverte | Pourquoi | Comment trancher |
|---|---|---|
| **Région d'exécution des fonctions Vercel** | Ni `vercel.json` ni `.vercel/project.json` dans le repo ; la configuration déployée n'est pas lisible depuis la session | *Vercel → Settings → Functions → Region*. **F-0, action n°1 de la roadmap.** |
| **Cause des 43 redémarrages PostgREST par jour** | Comportement plateforme | Ticket Supabase (**F-10**) |
| **Core Web Vitals terrain** | `@vercel/speed-insights` est actif en production, mais ses données ne sont pas accessibles depuis cette session | Console Vercel |
| **Part exacte de `@supabase/supabase-js` imputable au bundle** | Non mesurée | `ANALYZE=true npm run build` (**F-13**, Lot 4.2) |

### Anomalie de test signalée par honnêteté

La **première** exécution de `npx vitest run` de la session a rapporté **3 échecs sur 3 013 tests
(1 fichier)**. Les **trois exécutions suivantes** ont donné **294 fichiers / 3 017 tests verts**,
sans aucune modification entre-temps. L'hypothèse la plus probable est une contention machine (un
`tsc --noEmit` et un serveur de dev tournaient en parallèle). **Aucune correction n'a été apportée
et aucune n'était nécessaire** — mais le fait qu'un fichier de test puisse échouer sous charge est
consigné ici pour qu'il soit reconnu s'il se reproduit.

### État livré

- **Code** : `src/lib/supabase/perf-trace.ts` (nouveau), `src/lib/supabase/server.ts` (3 lignes).
  Aucune modification fonctionnelle. Inerte hors `KREDO_PERF_TRACE=1`.
- **Documentation** : les 7 fichiers de `docs/performance-data-audit/`.
- **Validation** : `typecheck` EXIT 0 · `vitest` 294/294, 3 017 tests · `check:server-boundary`
  EXIT 0 · `eslint` 0 erreur sur les fichiers touchés · `next build` EXIT 0 (worktree isolé,
  tableau de routes conforme).

---

## 2026-09-10 · Lot 1 — Vérifications sans code · ✅ **F-0 CLOS**

**F-0 — Région Vercel : la supposition était fondée.** Guillaume a vérifié : le projet Vercel
était **effectivement hébergé aux États-Unis**, alors que la base Supabase est en `eu-west-1`.
**Région basculée sur la France.** Supabase était déjà correct.

Conséquence : chaque aller-retour PostgREST payait un transatlantique (~80–90 ms) **par-dessus**
les 116 ms de p50 mesurés côté origine. Sur `/veille` (7 vagues) et la fiche compte (5 vagues),
cela représentait 400 à 630 ms de latence pure — invisible dans toutes les mesures locales de
l'audit, et donc **jamais comptée dans les chiffres de [00](00-BASELINE-AND-SCOPE.md) §4**.

> ⚠️ **Le changement de région ne s'applique qu'aux nouveaux déploiements.** Un redéploiement est
> nécessaire pour que les fonctions basculent réellement. À vérifier avant de mesurer un gain.

**Reste ouvert : F-10** (ticket Supabase — pool à 10 connexions, 43 redémarrages PostgREST/jour).

---

## 2026-09-10 · Lot 2 — Quick wins · ✅ **LIVRÉ, 3 gestes sur 4**

### Mesures avant → après (build de production, session réelle, 3 passes, valeur à chaud)

| Route | requêtes | total | HTML |
|---|---|---|---|
| `/veille` | **42 → 29** (−31 %) | **0,89 s → 0,71 s** (−20 %) | 610 476 → **610 476 octets, identique** |
| `/reports` | **7 → 4** (−43 %) | **0,41–0,48 s → 0,227 s** (−45 %) | 107 568 → 106 563 |
| `/cockpit` (témoin, non touché) | 14 → 14 | 0,25 → 0,26 s | identique |
| `/prospection/accounts` (témoin) | 6 → 6 | 0,35 → 0,38 s | identique |
| `/consultants` (témoin) | 8 → 8 | 0,20 → 0,21 s | identique |

Les trois routes témoins confirment que le gain est bien localisé et qu'aucune régression n'a été
introduite ailleurs.

### 2.1 — Résolution d'identité (F-3a, F-4) · **le gain principal**

`src/lib/supabase/server.ts` expose désormais `getRequestClient = cache(createClient)` : **un seul
client Supabase par rendu RSC**, donc **un seul cache JWKS**. `workspace.ts` s'appuie dessus et
gagne `getCurrentProfile()`, qui remonte `workspace_id` **et** `role` en une lecture — les
consommateurs qui géraient une capacité admin faisaient sinon une seconde requête
`select("workspace_id, role")`, distincte et donc **non dédupliquée** par la mémoïsation `fetch`
de Next.

Trois consommateurs du chemin de rendu convertis : `veille/page.tsx`, `veille/_data/veille-data.ts`
(qui appelait `createClient()` **15 fois** dans un seul module), `source-management/data/get-source-management-snapshot.ts`.

Sur `/veille`, la trace le montre sans ambiguïté :

```
AVANT   AUTH  t0=   0ms dur=194,8ms  /auth/v1/user
        REST  t0= 196ms dur=102,4ms  profiles select=workspace_id
        REST  t0= 306ms …            ← première donnée métier
APRÈS   REST  t0=   0ms …            ← première donnée métier
        REST  t0=   5ms dur=102,4ms  profiles select=workspace_id,role   (en parallèle)
```

**Le préambule séquentiel de 306 ms a disparu.** Zéro appel `/auth/v1/user` sur la page.
7 lectures de `profiles` → **1**. 7 vagues → **6**.

**Périmètre volontairement exclu :** les 63 `getUser()` des Server Actions et les 9 des routes API.
`cache()` y est inerte (React alloue un cache jetable hors rendu RSC) et le contrôle strict y est
voulu — arbitrage déjà documenté dans `workspace.ts`.

### 2.3 — `/reports` : 4 comptages → 1 requête (F-8)

`getKpis()` émettait 4 requêtes `count:"exact", head:true` sur le même filtre (93,9 / 100,9 /
148,0 / 168,0 ms, **corps vide à chaque fois**). Remplacées par une lecture unique de
`status, last_used_at` comptée en JS.

**Équivalence vérifiée en base** — rendu `total=99, drafts=76, ready=22, usedThisMonth=0` contre
SQL `99 / 76 / 22 / 0`. **Identique.**

### 2.4 — `/reports` : projection JSON au lieu du blob (F-8)

`brief_json` était rapatrié en entier pour en extraire **une chaîne**. Remplacé par une projection
PostgREST des trois formes acceptées :
`scenario_what:brief_json->what->>scenario, scenario_preset:…, scenario_root:…`.

**Mesuré sur la table entière : 454 241 → 52 459 octets (−88 %).**

**Équivalence vérifiée en base** — SQL sur les 24 documents listés : 3 scénarios non nuls,
`battle_situation_pitch | direction_summary_pitch | signal_outreach`. Rendu : exactement
3 `scenarioLabel` non nuls (« Pitch de situation (Battle Card) », « Synthèse orale pour
direction », « Premier contact (signal/actualité) ») et 21 nuls. **Identique.**

*Reste sur cette requête* : `qa_flags` pèse désormais l'essentiel des 52 Ko restants.
`computeQualityOk()` n'en a besoin que d'un booléen agrégé — piste pour un lot ultérieur, hors
périmètre du Lot 2.

### 2.2 — `/agenda` : ❌ **NON IMPLÉMENTÉ — prémisse surestimée par l'audit**

**J'avais surévalué ce constat.** Le document [02](02-CODE-AUDIT.md) §C-4 affirmait que le
navigateur téléchargeait « 61 Ko et amorçait les 26 chunks JS **à chaque clic sur Agenda** ».
C'est vrai d'un **chargement dur** (signet, URL directe, démarrage PWA) — pas d'une navigation
interne, qui passe par `<Link>` et ne demande que la charge RSC.

Mesure faite avant d'implémenter quoi que ce soit :

| Chemin | Coût réel du détour |
|---|---|
| Navigation client (en-tête `RSC: 1`) | **22 484 octets · 7,3–17,1 ms** |
| Chargement dur (document HTML) | 61 510 octets · 12,1 ms |

Soit **~30 à 60 ms et 22–61 Ko** par ouverture, aller-retour réseau compris.

**Le correctif propre coûte plus cher que le défaut.** La redirection est émise sous la frontière
Suspense de `(app)/loading.tsx` : la remonter dans `page.tsx` ne change rien, le shell est flushé
de toute façon. Il ne reste que deux options, toutes deux mauvaises :
- **Middleware** — il faudrait y dupliquer la détection du device, `getTodayDateKey` avec fuseau,
  `toWorkingDay` (le mobile décale au jour ouvré) et **deux** constructeurs de query string
  distincts (`view=week&date=…` en Desktop, `mode=calendar&date=…&filters=commerce,recruitment` en
  Mobile). Toute divergence produit une **double** redirection — pire que le défaut actuel.
- **Lien de navigation canonique** — même duplication, plus une URL qui périme à minuit, plus un
  test qui assert `agenda?.href === "/agenda"` (`main-menu.config.test.ts:95`).

**Décision : F-9 déclassé, non implémenté.** Constat corrigé dans [02](02-CODE-AUDIT.md) §C-4 et
[04](04-FINDINGS-AND-PRIORITIES.md#f-9). À rouvrir seulement si la canonisation de l'URL Agenda est
refondue pour une autre raison.

### Barrière de qualité

`npx tsc --noEmit` EXIT 0 · `npx vitest run` **294 fichiers / 3 021 tests verts** ·
`npm run check:server-boundary` EXIT 0 · `npx eslint` sur les 6 fichiers touchés : **0 erreur** ·
`npm run build` EXIT 0 (worktree isolé), **tableau de routes inchangé**.

### Fichiers touchés

`src/lib/supabase/server.ts` · `src/lib/supabase/workspace.ts` ·
`src/app/(app)/veille/page.tsx` · `src/app/(app)/veille/_data/veille-data.ts` ·
`src/features/source-management/data/get-source-management-snapshot.ts` ·
`src/app/(app)/reports/_data/get-reports-list.ts`

---

## 2026-09-10 · Lot 3 — Sur-récupération · ✅ **LIVRÉ, 4 gestes sur 5**

### Mesures avant → après

| Route | requêtes | **vagues** | **octets lus en base** | total | HTML |
|---|---|---|---|---|---|
| `/prospection/accounts/[companyId]` | **33 → 31** | **5 → 3** | **~450 Ko → 92 Ko** (−79 %) | **1,14 s → 0,57 s** (−50 %) | 219 512 → **219 512, identique** |
| `/cockpit` | 14 → 14 | 2 → 2 | **~480 Ko → 151 Ko** (−69 %) | — | 113 786 → **113 786, identique** |

L'octet-à-octet identique du HTML sur les deux pages est la preuve la plus forte que rien n'a
changé fonctionnellement.

> ⚠️ **Sur `/cockpit`, le `total_s` ne bouge pas et peut même remonter d'une passe à l'autre.**
> C'est attendu : le lot ne supprime aucun aller-retour sur cette page, il en réduit le contenu.
> Les 14 requêtes partent toujours en parallèle, et la durée est celle de la plus lente. La série
> de mesures de ce lot est d'ailleurs globalement plus lente que celle du Lot 2 **y compris sur
> les routes non touchées** (`/consultants` 0,21 → 0,24 s, `/intelligence` 0,28 → 0,33 s) : c'est
> du bruit réseau, pas une régression. **Le gain de F-5 est un gain de volume, pas de latence** —
> il empêche le coût de croître avec les données, il ne raccourcit pas la page aujourd'hui.

### 3.1 — F-2 : `companies.metadata` · **la recommandation de l'audit était mauvaise, corrigée**

L'audit préconisait une **migration** ajoutant des colonnes générées. Deux mesures l'ont écartée :

1. **Aucune des 112 lignes de `companies` ne porte les clés lues** (`aliases`, `alternate_names`,
   `legal_name`, `company_name`, `identite.*`). Des colonnes générées auraient été 100 % `NULL`.
   Aucun producteur non plus : les workflows n8n écrivent `legal_name`, `siren`, `naf_code` comme
   **colonnes réelles**, via `perform_proposal_apply`, jamais dans le blob.
2. **`EXPLAIN (ANALYZE, BUFFERS)` : 1,4 ms d'exécution, 14 buffers.** Le coût n'était donc **pas**
   la décompression TOAST (comme le supposait l'audit par analogie avec le Lot 5 de juillet), mais
   **le transport et la sérialisation de 309 Ko**.

Correctif retenu — **projection JSON PostgREST**, zéro migration :

```
id,name,legal_name,segment,
meta_aliases:metadata->aliases, meta_alternate_names:metadata->alternate_names,
meta_legal_name:metadata->>legal_name, meta_company_name:metadata->>company_name,
meta_raison_sociale:metadata->identite->>raison_sociale, meta_identite_nom:metadata->identite->>nom
```

Trois variantes mesurées sur les 10 comptes du macro-secteur témoin :

| Variante | octets | temps (3 passes) |
|---|---:|---|
| A — blob complet (avant) | **318 072** | 0,40 · 0,40 · 0,36 s |
| B — projection des 5 clés (**retenue**) | **2 004** | 0,20 · 0,19 · 0,25 s |
| C — sans `metadata` du tout | 1 404 | 0,19 · 0,17 · 0,17 s |

B coûte ~600 octets et ~25 ms de plus que C **et conserve intégralement la capacité de
rapprochement par alias**. En production, mesuré sur la fiche compte : **309 427 → 2 875 octets**
(macro) et **68 791 → 597 octets** (segment), soit **−99,2 %**.

**Dette de test comblée au passage :** `metadataAliases()` n'avait **aucune couverture**. Six cas
ajoutés (`aliases`, `alternate_names`, `legal_name`, `company_name`, `identite.raison_sociale`,
`identite.nom`) — sans eux, ce refactor aurait pu supprimer la capacité sans qu'aucun test n'échoue.

### 3.2 — F-5 : `/cockpit` · **la vue défensive n'est PAS substituée, et c'est délibéré**

L'audit recommandait `account_signals` → `v_active_account_signals`. **La preuve d'équivalence
exigée avant substitution a d'abord échoué sur la sémantique**, avant de réussir sur les données :

| | filtre JS `isActionableSignal` | `v_active_account_signals` |
|---|---|---|
| statuts exclus | `dismissed`, `archived`, **`expired`** | `archived`, `dismissed` |
| `expires_at` dépassé | **exclu** | pas de filtre |
| fenêtre `detected_at` | aucune | **≥ now − 2 mois** |
| signaux FOLIO (`signal_type LIKE 'folio_%'`) | **conservés** | exclus |

Les deux rendent **98 lignes aujourd'hui, avec 0 divergence dans les deux sens** — mais c'est une
coïncidence des données du jour, pas une équivalence. Basculer sur la vue masquerait les signaux
FOLIO et ceux de plus de deux mois : **c'est un choix produit, pas une optimisation.**

Retenu : **pousser le filtre JS exact en SQL**, sémantique inchangée.
`.not("status","in","(dismissed,archived,expired)")` + `.or("expires_at.is.null,expires_at.gte.<now>")`.
Le filtre applicatif est **conservé** en second rideau.

`calendar_events` : le view model ne garde que le jour courant **en UTC** (`dateKey` utilise
`toISOString()`) — bornes posées en SQL à l'identique.

| Lecture | avant | après |
|---|---:|---:|
| `account_signals` | 294 626 o (843 lignes) | **39 663 o** (−86,5 %) |
| `calendar_events` | 109 186 o (548 lignes) | **632 o** (−99,4 %) |
| **total page** | ~480 Ko | **151 Ko** |

`interactions` : **non touché**, contrairement à ce que proposait l'audit. 185 lignes / 16 854
octets sur deux colonnes, pour un `max(occurred_at)` par compte. Une RPC ou une vue coûterait plus
que le gain — hors doctrine du projet.

### 3.3 — F-1a / F-1b : les doublons de la fiche compte

Deux loaders partagés, mémoïsés par `cache()` :

- [`src/lib/intelligence/account-company-row.ts`](../../src/lib/intelligence/account-company-row.ts) —
  la ligne `companies` était lue **trois fois** par rendu (34 329 + 35 474 octets, blob `metadata`
  compris deux fois, plus une requête isolée pour la seule colonne `relation_type`, une vague après
  toutes les autres). Projection = union stricte des trois. **→ une seule lecture.**
- [`src/lib/intelligence/sector-knowledge-resolved.ts`](../../src/lib/intelligence/sector-knowledge-resolved.ts) —
  `v_sector_knowledge_resolved` était lue **deux fois** avec deux projections différentes, donc
  deux URLs que la mémoïsation `fetch` de Next ne pouvait pas dédupliquer. **→ une seule lecture.**

Troisième geste, sur la page : `getDashboardDevice()` est une lecture d'en-tête mémoïsée (zéro
réseau). L'attendre **avant** le `Promise.all` permet d'y faire entrer les agrégats portefeuille,
qui formaient à eux seuls la 5ᵉ vague.

**Résultat : 5 vagues → 3.**

### 3.4 / 3.5 — non faits, et pourquoi

- **F-6a (comptage contacts depuis la vue)** — reporté au Lot 5. Le comptage JS disparaîtrait, mais
  **les 364 Ko de contacts resteraient** : ils servent aussi l'onglet Contacts. Le gain de
  performance est nul tant que F-6b (chargement par onglet) n'est pas fait. Les deux vont ensemble.
- **F-12 (`/missions/opps`, fusion des 2 lectures `opportunity_candidates`)** — non fait. Les deux
  lectures vivent dans deux loaders indépendants séparés par une frontière de vague
  (`get-needs-staffing-shared` et `get-opportunities-planning`). Les coupler pour ~100 ms n'est pas
  un bon échange. À reprendre si `/missions/opps` devient prioritaire.

### Barrière de qualité

`npx tsc --noEmit` EXIT 0 · `npx vitest run` **294 fichiers / 3 023 tests verts** (dont 2 nouveaux
sur les alias) · `npm run check:server-boundary` EXIT 0 · `npx eslint` sur les 9 fichiers touchés :
**0 erreur** (1 warning `toNumber` **pré-existant**, vérifié identique sur `HEAD`) ·
`npm run build` EXIT 0, tableau de routes inchangé.

### Fichiers touchés

**Nouveaux** : `src/lib/intelligence/account-company-row.ts` ·
`src/lib/intelligence/sector-knowledge-resolved.ts`
**Modifiés** : `sector-snapshot-data.ts` · `client-intelligence-sector.ts` (+ son test) ·
`account-panel-data.ts` (+ son test) · `intelligence-data.ts` ·
`account-intelligence-home-financials.ts` · `cockpit/cockpit-desktop-data.ts` ·
`prospection/accounts/[companyId]/page.tsx` · `sector-snapshot-data.test.ts`

**Aucune migration.** Le Lot 3 se solde sans une ligne de DDL — la recommandation initiale en
prévoyait une.

---

## 2026-09-10 · Lot 4 — Bundle client · ⛔ **FERMÉ SANS ACTION — la prémisse de F-7 était fausse**

Ce lot **ne livre aucun code**. Il livre une mesure qui invalide son propre point d'entrée, et
ferme la question. C'est un résultat, pas un échec.

### Ce que F-7 affirmait

> Les 8 hôtes de `AppOverlayHosts` sont rendus inconditionnellement ; `next/dynamic({ssr:false})`
> diffère le rendu serveur mais pas le chargement du chunk ; ~130 Ko bruts de JS inutile sur
> chaque page. **Gain attendu : −100 à −130 Ko.**

### Ce que la mesure dit

Le code a d'abord été écrit intégralement : 5 hôtes pilotés par un store conditionnés dans
`AppOverlayHosts`, `ReportGenerationDrawer` passé en `next/dynamic` derrière un verrou de montage,
et une coquille `CommunicationComposerGate` (écouteur léger + `initialRequest` en prop, pour éviter
toute course entre le chargement du chunk et la réémission de l'événement). `typecheck`, 3 023
tests et `build` verts.

**Gain mesuré sur le JS réellement référencé par les `<script>` de la page servie : +1 Ko.** Nul.

Le doute portant sur l'implémentation, une **borne haute** a été mesurée : `AppOverlayHosts` vidé
de ses 8 hôtes, build complet, mesure identique. C'est le maximum absolu que ce constat pourra
jamais rendre.

| Route | baseline | Lot 4 (hôtes conditionnels) | **borne haute (hôtes supprimés)** |
|---|---|---|---|
| `/cockpit` | 1 548 Ko · 415 Ko gzip | 1 549 · 414 | **1 541 · 411** |
| `/veille` | 1 806 · 469 | 1 810 · 471 | **1 801 · 468** |
| `/prospection/accounts` | 1 600 · 423 | 1 601 · 422 | **1 593 · 420** |
| `/finance` | — | 1 613 · 428 | **1 604 · 425** |

**Gain maximal théorique : ~7 Ko bruts / ~4 Ko gzip, soit 0,4 %.** Pas 130 Ko.

### Pourquoi le constat initial était faux

L'audit cherchait des **symboles** de composants (`CommunicationComposerHost`,
`AssistanceCaseDrawer`, `EventDrawer`…) dans les chunks du socle commun, et les y trouvait. La
conclusion tirée — « les corps des composants sont dans le socle » — était erronée : ce que
`grep` trouvait, ce sont les **stubs de chargement** de `next/dynamic` (site d'appel `import()`,
identifiant de module), qui vivent nécessairement dans le chunk parent. Les corps, eux, étaient
**déjà** dans des chunks paresseux séparés.

> 🔴 **Leçon méthodologique, à ne pas réapprendre.** Chercher le nom d'un composant dans un chunk
> ne dit pas si son **code** y est : un `next/dynamic` laisse toujours sa trace textuelle dans le
> parent. La seule mesure valable est le **poids des chunks réellement référencés par les
> `<script>` de la page servie**, comparé à un build témoin. Le champ
> `firstLoadUncompressedJsBytes` de `.next/diagnostics/route-bundle-stats.json` ne tranche pas non
> plus : il déclarait +1 Ko là où la borne haute donne −7 Ko.

**`next/dynamic({ssr:false})` faisait donc correctement son travail depuis le début.** Le motif
en place dans `AppOverlayHosts` est bon ; il ne fallait pas y toucher.

### Code écrit puis retiré

`AppOverlayHosts.tsx`, `CommunicationComposerHost.tsx` et `ReportGenerationHost.tsx` sont revenus à
leur état d'origine ; `CommunicationComposerGate.tsx` a été supprimé. Conserver une coquille
supplémentaire et une nouvelle prop sur un composant de 1 096 lignes pour **4 Ko gzip** aurait été
exactement la sur-ingénierie que le cadrage interdit.

Barrière de qualité après revert : `tsc --noEmit` EXIT 0 · `vitest` **294 fichiers / 3 023 tests**.

### 4.2 — Où sont réellement les 1,42 Mo · *acquis de ce lot*

Le socle commun aux 35 routes `(app)` fait **1 310 Ko bruts en 20 chunks**. Sa composition, chunk
par chunk :

| Chunk | Taille | Contenu |
|---|---:|---|
| `11b8--b8bsw1h.js` | **236,8 Ko** | **`@supabase/supabase-js` complet** (GoTrue + Realtime + PostgREST + Storage) |
| `0jalrk9v5qf7s.js` | **227,2 Ko** | `react-dom` — incompressible |
| 18 autres | ~846 Ko | shell applicatif : `DesktopSidebar`, `IntelligencePanel`, `MobileNav`, runtime et routeur Next |

**Ce ne sont pas les tiroirs.** Les deux seuls postes nommables sont `react-dom` (irréductible) et
`supabase-js`.

### 4.3 — F-13 (`supabase-js` hors du bundle) : **bloqué, et la cause est identifiée**

237 Ko, soit **18 % du socle**, confirmés dans les chunks réellement référencés. Mais le SDK est
requis par un canal Realtime **monté dans `AppShell`, donc sur toutes les pages** :
`use-current-workflow-execution.ts:114` (`kredo-workflow-indicator-${userId}`), consommé par
`WorkflowExecutionIndicatorDesktop` / `…Mobile`.

Tant que cet indicateur est dans le shell, **aucune conversion des ~20 autres modules clients en
Server Actions ne sortira `supabase-js` du socle** : un seul consommateur suffit à l'y maintenir.

**F-13 est donc reformulé** : ce n'est pas un chantier de conversion de modules, c'est **une
question de produit** — l'indicateur d'exécution de workflow doit-il être présent sur toutes les
pages, ou seulement sur celles où un run peut être déclenché ? Tant que la réponse est « toutes »,
le poids est structurel et il faut l'assumer. **À trancher par Guillaume, pas par l'audit.**

---

## 2026-09-10 · F-10 recaractérisé — **j'avais surévalué les redémarrages, et le ticket support n'a pas lieu d'être**

Question de Guillaume : « c'est quoi F-10 précisément et que dois-je faire ? ». La vérification
faite pour y répondre corrige deux erreurs de l'audit.

**Erreur 1 — l'ampleur.** Les rechargements de cache de schéma PostgREST sont réels mais
marginaux : **38 en 24 h, 1 384 ms de moyenne, 1 954 ms au pire → 52,6 s cumulées sur 86 400, soit
0,06 % du temps**. Côté trafic : **78 requêtes au-dessus d'1 s sur 7 416 (1,05 %)**, **2 erreurs
5xx (0,03 %)**. L'audit en faisait « potentiellement le gain le plus large » ; c'est faux.

**Erreur 2 — le ticket.** L'organisation est sur le **plan Free**. Il n'y a pas de support avec
engagement. « Ouvrir un ticket Supabase » n'était pas une action disponible.

**Cause réelle, établie et non supposée.** À l'instant d'un rechargement, `postgres_logs` ne montre
**aucun ordre DDL** — mais un redémarrage du **slot de réplication logique Realtime** à la
milliseconde près :

```
17:00:49.999  logical decoding found consistent point at 58/2D0011D0     (postgres_logs)
17:00:50.032  Received a schema cache reload message on the "pgrst" channel  ×5
17:00:50.138  Successfully connected to PostgreSQL
17:00:50.143  Connection Pool initialized with a maximum size of 10 connections
17:00:51.990  Schema cache queried in 1740.5 milliseconds
              … puis la même séquence une seconde fois (2 répliques)
```

PostgREST **et** Realtime se reconnectent ensemble : signature d'un **recyclage de service au
niveau plateforme**, cohérent avec le plan Free et la plus petite instance (`shared_buffers`
224 Mo, pool PostgREST 10). Les deux `pgrst_ddl_watch` / `pgrst_drop_watch` existent bien mais ne
sont pas déclenchés. Le cron applicatif est **hors de cause** : 144 exécutions/jour toutes en
succès, contre 38 rechargements, et `reap_stale_intelligence_runs()` ne fait qu'un `UPDATE`.

**Ce qui reste vrai, et qui est le vrai sujet.** Le **plancher de 108 ms (p50) par aller-retour
PostgREST** pour un temps SQL de 1 à 5 ms, et le **pool de 10 connexions** face à 14 requêtes
simultanées sur `/cockpit` et 17 sur `/veille`. Ce coût est **permanent**, pas occasionnel.

**Action retenue : un essai mesuré, pas un ticket.** Passer sur Pro un mois, rejouer le protocole
de [00](00-BASELINE-AND-SCOPE.md) §5, comparer `p50`/`p95` d'`origin_time` et le compte de
rechargements. Si le plancher ne bouge pas, il vient du trajet Cloudflare et le palier ne sert à
rien — redescendre. **Aucune ligne de code.**

---

## 2026-09-10 · Lot 5 — Chargement contextuel · ✅ **5.3 LIVRÉ · 5.1 bloqué par conception · 5.2 non justifié**

### 5.3 — `/veille` : le socle de sources chargé à l'ouverture · ✅ **LIVRÉ**

| Grandeur | Avant | Après |
|---|---:|---:|
| Requêtes | 29 | **23** (−6) |
| **Vagues** | 7 | **5** (−2) |
| Octets lus en base | 562 370 | **454 989** (−107 381, **−19 %**) |
| HTML streamé | 613 185 | **527 375** (−85 810, **−14 %**) |

`/veille` appelait `getSourceManagementSnapshot()` à **chaque rendu de page** pour alimenter
**trois dialogues qui ne s'ouvrent que sur clic** : le panneau « Gérer les sources » (desktop et
mobile) et les réglages de veille globale. Coût : 5 requêtes, dont `source_catalog select=*`
(44 589 o) et `source_corpus_items select=*` (44 595 o), réparties sur deux vagues du chemin
critique.

Les trois dialogues sont désormais **autoportants** : ils chargent le socle eux-mêmes, à
l'ouverture. La prop `sourceManagementSnapshot` a disparu de toute la chaîne — `page.tsx` →
`VeilleActualitesPage` → `Desktop`/`Mobile` → `VeilleHeaderActions` → dialogues (6 composants).

**Aucun mécanisme inventé** : le motif existait déjà dans le repo (`SourceManagementModule` du
panneau Cockpit, `useModuleSnapshot` + `ModuleLoadingDrawer`). Il est simplement étendu.

**Deux points de conception à ne pas défaire :**

1. **Le montage est conditionnel (`if (!open) return null`), pas piloté par un état interne.**
   `useModuleSnapshot` se déclenche au **montage** : garder la shell montée avec un drapeau
   `open` rechargerait au rendu de page, c'est-à-dire exactement le défaut corrigé.
2. **La relecture à chaque ouverture est délibérée.** Le panneau permet d'ajouter et de modifier
   des sources ; une donnée mémoïsée serait périmée dès la première mutation. Le coût est un
   aller-retour sur une action utilisateur explicite.

**Un piège rencontré, à noter.** Le premier jet portait un hook maison avec
`setState({status:"loading"})` en tête d'effet — refusé par `react-hooks/set-state-in-effect`.
La règle avait raison : le montage conditionnel rend l'état de chargement **dérivé du montage**
et supprime le hook custom. Le correctif est plus court que le code qu'il remplace.

**Trois tests mis à jour, aucun affaibli.** `source-management-components.test.ts` assertait
l'invariant ADR-0006 (« ne jamais monter les deux shells ») sur `SourceManagementLauncher`. Le
branchement ayant migré dans `SourceManagementShell`, l'assertion l'a suivi — et **quatre
assertions ont été ajoutées** : montage conditionnel, absence de prop `snapshot`, dialogue de
réglages monté à l'ouverture, et `/veille/page.tsx` qui ne charge plus le socle. Ces gardes
empêchent la régression de revenir par inadvertance. Total : 3 023 → **3 030 tests**.

> ⚠️ **Lecture des durées de ce lot.** La série de mesures est globalement **plus rapide** que
> celle du Lot 4, y compris sur les routes non touchées (`/cockpit` 0,26 → 0,15 s, `/reports`
> 0,23 → 0,13 s). C'est du bruit réseau favorable. **Les grandeurs à retenir sont celles qui n'en
> dépendent pas** : requêtes, vagues, octets.

### 5.1 — `/prospection/accounts` : contacts par onglet · ⛔ **BLOQUÉ PAR CONCEPTION, non tenté**

L'audit prévoyait « charger les contacts à l'ouverture de l'onglet ». **Ce n'est pas possible tel
quel**, et la raison est explicite dans le code :

[`src/lib/search/use-url-filters.ts`](../../src/lib/search/use-url-filters.ts) écrit l'état
d'onglet et de filtres via `window.history.replaceState` — **volontairement sans navigation App
Router**. Le commentaire du fichier le dit : *« no Server Component re-render, no RSC payload
refetch. Filtering stays 100 % client-side. »*

Conséquence : gater les contacts sur `searchParams.tab` côté serveur donnerait un **onglet
Contacts vide** — le clic ne déclenche aucun rendu serveur.

Deuxième obstacle, indépendant : `data.contacts` n'alimente pas que l'onglet Contacts. Il construit
`contactsByAccountId` ([`AccountsContactsViews.tsx:2149`](../../src/components/accounts-contacts/AccountsContactsViews.tsx)),
consommé par `filterAccounts` pour l'onglet **Comptes** — les filtres par rôle, e-mail et téléphone
portent sur les contacts d'un compte.

Les deux voies possibles sont coûteuses :
- **Rendre le changement d'onglet navigant** (`router.push`) — contraire à un choix explicite, et
  cela referait tout le payload de la page à chaque clic d'onglet : on échangerait de la latence
  initiale contre de la latence d'interaction.
- **Charger les contacts côté client à la demande** — faisable (le motif du 5.3 s'applique), mais
  il faut d'abord traiter la dépendance de `filterAccounts`, dans un composant client de
  **2 726 lignes**.

**Décision : non tenté dans ce lot.** Ce n'est plus une optimisation de chargement mais une
refonte de l'état d'onglet de la page. À traiter comme un chantier propre, pas comme un lot de
performance. Le gain reste réel (−364 Ko réseau, ~−500 Ko de flux RSC) et le constat F-6 reste
ouvert avec cette qualification.

### 5.2 — Fiche compte par étape · ⏸ **NON JUSTIFIÉ EN L'ÉTAT**

La roadmap posait la condition elle-même : *« Si la fiche compte est déjà descendue sous 0,5 s
après le Lot 3, 5.2 devient discutable — la décision se prend sur la mesure, pas sur le plan. »*

Elle est à **0,57 s** (contre 1,14 s), en **3 vagues** au lieu de 5. Le gain restant se compte en
~150 ms pour un chantier **L/XL** qui casse le modèle de données partagé entre les 5 étapes du hub.
**Rapport gain/risque insuffisant.** À rouvrir si la fiche compte redevient lente, ou si le hub est
refondu pour une autre raison.

### Barrière de qualité

`npx tsc --noEmit` EXIT 0 · `npx vitest run` **294 fichiers / 3 030 tests verts** ·
`npm run check:server-boundary` EXIT 0 · `npx eslint` sur les 8 fichiers touchés : **0 erreur**
(1 warning `accountSignals` **pré-existant**, vérifié identique par `git stash`) ·
`npm run build` EXIT 0.

### Fichiers touchés

**Nouveau** : `src/features/source-management/components/SourceManagementShell.tsx`
**Modifiés** : `SourceManagementLauncher.tsx` · `veille/GlobalWatchSettingsDialog.tsx` ·
`veille/VeilleHeaderActions.tsx` · `veille/VeilleActualitesDesktop.tsx` ·
`veille/VeilleActualitesMobile.tsx` · `veille/VeilleActualitesPage.tsx` ·
`app/(app)/veille/page.tsx` · `source-management-components.test.ts`

---

## Modèle pour les entrées suivantes

```markdown
## AAAA-MM-JJ · Lot N — <titre>

**Mesure avant** (protocole 00 §5) : <route> — <total> · <n> requêtes · <n> vagues · <octets>
**Action** : <ce qui a été changé, fichier:ligne>
**Mesure après** : <mêmes grandeurs>
**Gain réel** : <chiffre>  ← s'il est nul, l'écrire et fermer le lot
**Prémisse invalidée** : <le cas échéant — c'est la partie la plus utile de l'entrée>
**Barrière de qualité** : typecheck / test / server-boundary / lint / build
```
