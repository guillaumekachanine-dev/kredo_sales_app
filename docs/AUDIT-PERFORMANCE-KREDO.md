# Audit de performance KREDO — protocole d'exécution

> **Statut :** prêt à exécuter · **Rédigé le :** 2026-07-29
> **Portée :** performance de bout en bout (base → serveur → réseau → client)
> **Ce document fait autorité** sur l'ordre des lots, les mesures et les critères de sortie.
> Les chiffres « baseline » ci-dessous ont été relevés **en direct** le 2026-07-29
> (`pg_stat_statements`, `pg_stat_user_tables`, `pg_policies`, arborescence `src/`).

---

## 0. Ce que la reconnaissance a établi

Relevés bruts, pas d'extrapolation.

### Base de données (Supabase `jvzgmhvwirsbdkjpmvla`)

| Mesure | Valeur | Source |
|---|---|---|
| Temps CPU total consommé par le **polling WAL Realtime** | **79,7 %** (2 890 s, 535 001 appels, max 1 110 ms) | `pg_stat_statements` |
| Scans séquentiels sur `profiles` (table à 1 ligne) | **689 232** — `idx_scan` = 8 | `pg_stat_user_tables` |
| Policies RLS utilisant `current_workspace_id()` **sans wrapper InitPlan** | **186 / 245** | `pg_policies` |
| Volatilité de `private.current_workspace_id()` | `STABLE` ✅ (le problème est le wrapping, pas la fonction) | `pg_proc` |
| `v_crm_account_list` | 341 appels · **90 ms moyen · 1 052 ms max** | `pg_stat_statements` |
| `v_ai_intelligence_summary` | 336 appels · 64 ms moyen · **1 256 ms max** | `pg_stat_statements` |
| `SELECT name FROM pg_timezone_names` (rechargement du cache PostgREST) | 251 appels · **677 ms moyen** · 4,7 % du CPU | `pg_stat_statements` |
| Tables publiées en Realtime | 3 (`ai_intelligence_results`, `ai_intelligence_runs`, `user_notifications`) | `pg_publication_tables` |
| Index / policies / triggers / vues | 426 · 245 · 100 · 17 | catalogue |
| Index jamais utilisés | 188 (**à ne pas supprimer**, cf. §5) | `pg_stat_user_indexes` |
| Taille base | 55 MB (dont `audit_log` = 19 MB) | catalogue |

### Application (Next.js 16.2.7 / React 19.2.4 / Turbopack)

| Mesure | Valeur |
|---|---|
| Composants `"use client"` | **439 / 673 `.tsx` (65 %)** |
| Routes (`page.tsx`) | 50 |
| `<Suspense>` dans tout le code | **7** |
| `loading.tsx` | 7 / 50 routes |
| `next/dynamic` | 13 |
| `export const dynamic = "force-dynamic"` | 8 routes |
| `use cache` / `cacheComponents` / `cacheTag` / `cacheLife` | **0** |
| `cache()` React (dédup par requête) | 6 |
| Instrumentation perf (`web-vitals`, Speed Insights, bundle-analyzer) | **aucune** |
| Canaux Realtime ouverts côté client | 12, dont **1 global permanent** (`NotificationBell` monté dans `AppShell`) |
| Appels `auth.getUser()` (aller-retour réseau vers l'API Auth) | 69 |
| `resolveCurrentWorkspaceId()` — 2 allers-retours, **non mémoïsé** | 12 sites d'appel |

### État bloquant

`npm run build` **échoue** au type-check :
`src/components/accounts-contacts/intelligence/SectorSnapshotContent.tsx:29` —
`Property 'playbook' does not exist on type 'ClientIntelligenceSectorView'`.
Fichier non commité (WIP). **Aucune mesure de bundle n'est possible avant correction.**

---

## 1. Diagnostic — les trois leviers réels

L'audit ne doit pas être uniforme. Les données ci-dessus concentrent l'enjeu sur trois foyers,
dans cet ordre de rendement :

> ⚠️ **CORRECTION APPORTÉE PAR LE LOT 1 (2026-07-29) — lire avant d'utiliser ce classement.**
> Le Levier A tel que formulé ci-dessous **était faux**, et la mesure l'a démontré (détail
> en §9). Le wrapping InitPlan a bien été appliqué (210 policies) et il est correct, mais il
> n'a produit **aucun gain mesurable** : 53,35 ms contre 53,58 ms sur `v_crm_account_list`.
> PostgreSQL évaluait déjà `current_workspace_id()` une seule fois par requête, en
> `Index Cond`. Les 689 232 scans sur `profiles` traduisent le **nombre de requêtes**, pas un
> coût par ligne — et ce nombre est dominé par les 535 001 évaluations RLS du polling WAL
> Realtime. **Le vrai levier est donc B, pas A.** L'ordre de priorité réel est **B → C → A**.

### Levier A — RLS non wrappées (effort : une migration · portée : 100 % des requêtes)

186 policies sur 245 s'écrivent `workspace_id = private.current_workspace_id()`.
Sans le wrapper `(SELECT ...)`, PostgreSQL n'a aucune garantie de sortir l'appel du
filtre par ligne : la fonction — `SECURITY DEFINER`, `procost` 100, qui lit `profiles` —
est réévaluée à chaque ligne scannée. C'est l'explication directe des **689 232 scans
séquentiels sur une table à une ligne**.

La correction est mécanique (`(SELECT private.current_workspace_id())`), **sémantiquement
neutre**, et bénéficie à toutes les requêtes de l'application simultanément.
C'est la seule optimisation du plan dont le rapport gain/effort est indiscutable.

> ⚠️ Touche la sécurité multi-tenant. Migration relue ligne à ligne, dry-run en
> transaction `ROLLBACK`, et test négatif obligatoire (accès cross-workspace refusé)
> avant application.

> ⚠️ **CORRECTION APPORTÉE PAR LE LOT 2 (2026-07-29) — ce levier est CLOS sans action.**
> « 79,7 % du CPU base » est exact en part relative et **vide de sens en absolu**. Sur la
> fenêtre de mesure (1 419 976 s), la base entière consomme **3 655 s, soit 0,257 % d'un seul
> cœur** — dont 0,205 % pour Realtime et 0,05 % pour tout le reste de l'application. La base
> est **au repos**. Décision gravée dans
> [ADR-0016](adr/ADR-0016-realtime-notifications-cout-mesure.md) : **aucune modification du
> dispositif Realtime**, avec conditions de réouverture explicites. Contrôles annexes tous
> négatifs (0 fuite de canal sur 8 fichiers, pas de rétention WAL non bornée).
> **Conséquence : la moitié « base de données » de l'audit est close. Seul le Levier C reste.**

### Levier B — Realtime permanent (effort : une décision d'architecture · portée : 80 % du CPU base)

`NotificationBell` est monté dans `AppShell`, donc **abonné en permanence, sur toutes les
pages, pour tous les utilisateurs**. Le décodage WAL qui en découle représente 79,7 % du
temps d'exécution de la base — devant *toutes* les requêtes applicatives réunies.

Trois options, à trancher pendant l'audit (§4, Lot 2) :
1. Restreindre l'abonnement (filtre serveur sur `user_id`, `postgres_changes` → `broadcast`).
2. Remplacer la notification temps réel par un polling à faible fréquence sur les pages
   où l'immédiateté n'apporte rien.
3. Réduire le volume de WAL en amont : les triggers `log_audit` écrivent dans `audit_log`
   (19 MB, plus grosse table de la base) à chaque mutation — WAL que Realtime doit décoder
   même si `audit_log` n'est pas publiée.

### Levier C — frontière serveur/client et cache Next 16 (effort : diffus · portée : latence perçue)

L'application est décrite comme « Server Components first » ; elle est à **65 % client**.
Aucune primitive de cache Next 16 n'est utilisée (`use cache` = 0), 8 routes sont
`force-dynamic`, il y a **7 `<Suspense>` pour 50 routes** — donc quasiment aucun streaming :
chaque navigation attend la totalité des requêtes serveur avant le premier octet utile.

S'y ajoute `resolveCurrentWorkspaceId()` : `auth.getUser()` (aller-retour réseau vers l'API
Auth Supabase) **+** une requête `profiles`, non mémoïsé, sur 12 sites d'appel. Une page qui
charge 5 jeux de données paie potentiellement 10 allers-retours avant la première requête utile.

---

## 2. Critique de la liste de skills proposée

Classement par utilité **dans ce contexte précis**, pas dans l'absolu.

| # | Skill | Verdict | Justification |
|---|---|---|---|
| 1 | `vercel:next-cache-components` | **Indispensable** | `use cache` est à 0 et 8 routes sont `force-dynamic`. C'est exactement le sujet du Levier C. Le skill le plus rentable de la liste. |
| 2 | `supabase:supabase-postgres-best-practices` | **Indispensable** | Couvre le wrapping InitPlan des RLS (Levier A) et l'analyse de plans. **Ce n'est pas** le skill `supabase` générique que tu as cité deux fois. |
| 3 | `web-performance-optimization` | **Fort** | Core Web Vitals, bundle, stratégie de cache. Pertinent sur le Levier C et le lot bundle. |
| 4 | `vercel:react-best-practices` | **Fort, mais à cadrer** | Conçu pour relire des `.tsx` après édition. Sur 439 composants client il faut le cibler sur le top 15 (§3), sinon c'est du bruit. |
| 5 | `vercel:routing-middleware` | **Moyen** | `src/proxy.ts` s'exécute sur chaque requête et appelle Supabase. Déjà optimisé (`getClaims()` au lieu de `getUser()`), mais le matcher inclut toutes les routes API. Une passe rapide, pas un lot. |
| 6 | `simplify` | **Moyen — phase de correction, pas d'audit** | Ne cherche pas les bugs ni les goulots ; nettoie du code *déjà modifié*. À dégainer après chaque lot, jamais pour diagnostiquer. |
| 7 | `engineering:architecture` | **Faible** | Produit des ADR (décisions), pas un audit d'architecture existante. Utile **en sortie** pour graver la décision Realtime du Levier B. Pas en entrée. |
| 8 | `engineering:code-review` / `/code-review` | **Faible en audit, fort en garde-fou** | Tous deux sont **scopés sur un diff**, pas sur une base de code. Inutiles pour trouver les goulots ; excellents pour relire la migration RLS avant application. |
| 9 | `data:explore-data` | **Hors sujet** | Profile un *jeu de données* (taux de null, distributions, doublons). Rien à voir avec la performance d'une base. C'est le seul vrai faux ami de ta liste. |

**Doublon à noter :** tu as cité `supabase` deux fois. Il existe bien deux skills distincts —
`supabase:supabase` (usage général : Auth, SSR, migrations) et
`supabase:supabase-postgres-best-practices` (performance Postgres). Seul le second sert ici.

---

## 3. Ce qui manque à ta liste

Par ordre d'importance.

### 3.1 L'instrumentation — le trou principal

Ton plan n'a **aucune étape de mesure**. Il n'y a aujourd'hui ni `web-vitals`, ni Speed
Insights, ni bundle-analyzer dans le projet. Un audit sans baseline chiffrée produit des
opinions, pas des gains démontrables. C'est le Lot 0, et il est bloquant.

À poser :
- `@next/bundle-analyzer` — taille réelle par route, identification des chunks partagés.
- `@vercel/speed-insights` — LCP / INP / CLS **terrain**, pas en labo.
- `scripts/perf-baseline.sql` (livré avec ce document) — snapshot base avant/après.

### 3.2 Les données de production Vercel

Le connecteur Vercel expose `get_web_analytics`, `get_runtime_logs`,
`get_deployment_build_logs`. Ce sont des mesures **réelles** sur le déploiement
`kredo-green` : durée d'exécution des fonctions, routes les plus lentes, erreurs runtime.
Bien supérieur à toute inspection statique. Tu ne l'as pas mentionné ; c'est probablement
la source la plus fiable de tout l'audit.

### 3.3 Chrome DevTools MCP — module optionnel, décision à prendre

Le connecteur `chrome-devtools` est **actif dans cet environnement** et fournit
`lighthouse_audit`, `performance_start_trace`, `list_network_requests`, `take_heapsnapshot`,
plus les skills `debug-optimize-lcp` et `memory-leak-debugging`.

> **Tu m'avais demandé de ne jamais l'utiliser** (consigne enregistrée : valider par
> `tsc` + `build` et te laisser la vérification visuelle). Cette consigne portait sur la
> **QA visuelle**. Pour un audit de performance, c'est le seul moyen de mesurer LCP, INP,
> le coût réel du JS à l'hydratation et les fuites mémoire. **Je ne le lance pas sans ton
> accord explicite** — c'est un module à activer ou non, tout le reste du plan tient sans lui.

### 3.4 Autres angles absents

| Angle | Pourquoi il compte ici |
|---|---|
| `vercel:vercel-functions` | Fluid Compute, streaming, `maxDuration`. Les routes API n8n et les rapports sont longs. |
| `vercel:turbopack` | Le projet est déjà en Turbopack ; temps de build et de dev sont mesurables. |
| `vercel:runtime-cache` | Cache clé-valeur par région avec invalidation par tag — pertinent pour les référentiels quasi statiques (`offers`, `skills`, `job_profiles`, `sector_intelligence`). |
| `engineering:tech-debt` | 215 400 lignes, une architecture à trois racines concurrentes (`components/`, `features/`, `lib/`). La dette structurelle *est* une cause de lenteur (imports transitifs → bundle). |
| `vercel:verification` | Vérifie la chaîne complète navigateur → API → données. Utile en recette de fin de lot. |
| Agent `vercel:performance-optimizer` | Agent dédié Core Web Vitals / caching / bundle. À réserver au Lot 3. |

---

## 4. Le plan

Six lots. **Séquentiels** : chacun modifie la base de mesure du suivant, les paralléliser
rendrait les gains inattribuables.

---

### Lot 0 — Rétablir le vert et instrumenter · *bloquant*

**Objectif :** disposer d'une baseline chiffrée et reproductible.

1. Corriger `SectorSnapshotContent.tsx:29` (`playbook` absent de `ClientIntelligenceSectorView`)
   → `npm run build` doit repasser à EXIT 0.
2. Installer `@next/bundle-analyzer` (dev) et `@vercel/speed-insights`.
3. Exécuter `scripts/perf-baseline.sql` → consigner M1→M8 dans la section « Baseline » ci-dessous.
4. `npm run build` avec analyzer → consigner First Load JS par route.
5. Relever les métriques prod : `get_web_analytics`, `get_runtime_logs` (dernières 24 h).
6. Poser un tag git `perf-baseline`.

**Critère de sortie :** build vert, tests verts (`npx vitest run`), baseline consignée.
**Modèle :** Sonnet 5 · effort **moyen**. Mécanique, entièrement vérifiable par le build.

---

### Lot 1 — RLS : wrapping InitPlan · *gain le plus élevé*

**Objectif :** supprimer la réévaluation par ligne de `current_workspace_id()`.

1. Extraire les 186 policies (requête de détail dans `perf-baseline.sql`, M4).
2. Générer la migration : chaque `current_workspace_id()` → `(SELECT private.current_workspace_id())`
   dans `USING` **et** `WITH CHECK`. Idem `is_workspace_admin()`.
3. **Dry-run en transaction `ROLLBACK`** avant toute application.
4. Test négatif obligatoire : un `SELECT` cross-workspace doit toujours renvoyer 0 ligne.
   Vérifier nommément les tables confidentielles (`collaborator_compensation`,
   `financial_models`, `client_pricing_agreement*`).
5. Réexécuter M1/M2/M3 → attendu : effondrement de `seq_scan` sur `profiles`.

**Critère de sortie :** M4 → `unwrapped = 0` · test négatif rouge→vert · `get_advisors(security)` sans régression.
**Modèle :** **Opus 5 · effort élevé.** Non négociable : une erreur de wrapping sur une policy
`WITH CHECK` ouvre une brèche d'isolation entre workspaces. Le volume est mécanique, le risque
ne l'est pas. Faire relire la migration par `/code-review` avant application.

---

### Lot 2 — Realtime et volume WAL · *décision d'architecture*

**Objectif :** ramener les 79,7 % de CPU base à un niveau proportionné à l'usage.

1. Quantifier : M6 (slots, WAL retenu) + M7 (volume d'écriture par table).
2. Trancher le cas `NotificationBell` — les trois options du Levier B (§1).
   Décision à graver dans un ADR (`engineering:architecture`).
3. Auditer les 11 autres canaux : `AccountScanDialog` a déjà un repli par relecture à 20 s ;
   vérifier qu'aucun ne reste abonné après démontage (fuite de canal).
4. Évaluer la réduction du bruit `audit_log` (portée des triggers `log_audit`, rétention).

**Critère de sortie :** part du polling WAL dans M1 divisée par 2 au minimum, à usage constant.
**Modèle :** **Opus 5 · effort élevé.** C'est un arbitrage produit (immédiateté perçue contre
coût d'infrastructure), pas une optimisation mécanique.

---

### Lot 3 — Cache Next 16 et frontière serveur/client

**Objectif :** supprimer les allers-retours d'authentification redondants et introduire le streaming.

1. **Mémoïser `resolveCurrentWorkspaceId()`** avec `cache()` de React — gain immédiat,
   risque nul, à faire en premier.
2. Activer `cacheComponents` et poser `use cache` / `cacheLife` / `cacheTag` sur les
   référentiels quasi statiques (`offers`, `skills`, `job_profiles`, `offer_practices`,
   `sector_intelligence`).
   > ⚠️ **Piège dominant :** ne jamais cacher une donnée `workspace_id`-scopée sans clé de
   > cache incluant le workspace. Un cache mal posé fuit des données entre tenants —
   > exactement le risque du Lot 1, par un autre chemin.
3. Justifier ou retirer chacun des 8 `force-dynamic`.
4. Introduire `<Suspense>` + `loading.tsx` sur les routes lourdes (`/prospection/accounts/[companyId]`,
   `/missions/opps`, `/cockpit`, `/reports`) pour streamer la coquille avant les données.
5. Passer `src/proxy.ts` en revue (`vercel:routing-middleware`) : restreindre le matcher.

**Critère de sortie :** TTFB mesuré en baisse sur les 4 routes lourdes · aucune fuite inter-workspace
(test explicite avec deux sessions).
**Modèle :** **Opus 5 · effort élevé** pour les étapes 2 et 3 (frontière de cache = frontière de
sécurité). Sonnet 5 · moyen pour 1, 4 et 5.

---

### Lot 4 — Bundle client et hydratation

**Objectif :** réduire le JS envoyé au navigateur.

1. Rapport bundle-analyzer → identifier les chunks partagés dominants.
2. Reprendre les 15 plus gros composants client (relevés, §0 du protocole) :
   `OpportunityEditForm` (2 256 l.), `AccountsContactsViews` (2 141 l.),
   `CompanyIdentityDrawer` (1 586 l.), `PoolCompetencesMap` (1 452 l.),
   `CommunicationBriefForm` (1 416 l.), `ContactIdentityDrawer` (1 349 l.)…
   Pour chacun : extraire la partie purement présentationnelle en Server Component,
   ou passer en `next/dynamic` si c'est un drawer/modale rarement ouvert
   (le pattern est déjà en place sur `AccountScanDialog` — le généraliser).
3. `d3-shape` n'est importé que par 2 fichiers : vérifier qu'il n'entre pas dans un chunk commun.
4. Repasser `vercel:react-best-practices` sur les fichiers modifiés uniquement.

**Critère de sortie :** First Load JS de la route la plus lourde en baisse d'au moins 25 %.
**Modèle :** Sonnet 5 · effort **moyen** — mécanique, et chaque étape est vérifiée par
`tsc` + `build` + `vitest`. **Fable 5 · moyen** est envisageable pour les extractions les plus
répétitives à condition de conserver la barrière build/tests entre chaque fichier.

---

### Lot 5 — Requêtes et vues lentes

**Objectif :** traiter les pics résiduels après l'effet de masse du Lot 1.

1. Réexécuter M2 **après** le Lot 1 — une partie des maxima à 1 000 ms disparaîtra d'elle-même.
   Ne rien optimiser avant cette relecture.
2. `EXPLAIN (ANALYZE, BUFFERS)` en session authentifiée sur `v_crm_account_list` et
   `v_ai_intelligence_summary` (M9).
3. Traiter les sur-récupérations : `select("*")` sur des vues larges, embeds PostgREST profonds.
4. Index ciblés **uniquement si un plan réel le justifie**.

**Critère de sortie :** aucune requête applicative au-dessus de 200 ms en moyenne dans M2.
**Modèle :** Opus 5 · effort **élevé** (lecture de plans) — mais le lot peut se révéler
largement vide après le Lot 1. C'est le résultat souhaité.

---

### Lot 6 — Mesure terrain · *optionnel, sous réserve d'accord (§3.3)*

Lighthouse, trace de performance, snapshot mémoire, cascade réseau sur les 4 routes lourdes,
en desktop **et** en mobile (les deux branches de rendu sont distinctes).
**Modèle :** Sonnet 5 · effort moyen — l'outil mesure, le modèle rapporte.

---

## 5. Décisions déjà prises — ne pas rouvrir

- **Les 188 index inutilisés ne sont pas supprimés.** Tranché en Session 26 : ils reflètent
  le faible trafic d'un projet jeune, pas une redondance. Les supprimer dégraderait la base
  dès la montée en charge.
- **Les 15 `rls_policy_always_true` en INSERT restent acceptés** (le `DEFAULT current_workspace_id()`
  et les triggers de validation assurent l'isolation).
- **Les 5 fonctions `SECURITY DEFINER` exposées à `authenticated` restent en l'état** — audit
  de Session 26 : gardes internes `require_current_workspace()` + contrôle `wrong_workspace`.
- **Aucune librairie de graphiques** (recharts, chart.js, Tremor) — interdiction projet.
  Toute optimisation de dataviz reste en SVG maison / HTML+Tailwind.
- **Pas de `tailwind.config.*`** (Tailwind v4 = `@theme` uniquement).

---

## 6. Synthèse des recommandations modèle / effort

| Lot | Nature | Modèle | Effort | Raison |
|---|---|---|---|---|
| 0 · Instrumentation | mécanique, vérifiable | Sonnet 5 | moyen | Le build est le juge. |
| 1 · RLS InitPlan | mécanique **mais** sécurité | **Opus 5** | **élevé** | Une policy mal wrappée = fuite inter-tenant. |
| 2 · Realtime / WAL | arbitrage d'architecture | **Opus 5** | **élevé** | Compromis produit, pas de bonne réponse mécanique. |
| 3 · Cache Next 16 | frontière de cache = frontière de sécurité | **Opus 5** | **élevé** | Même risque de fuite que le Lot 1, par le cache. |
| 4 · Bundle client | volume, réversible | Sonnet 5 (Fable 5 possible) | moyen | Chaque étape est gardée par `tsc`/`build`/`vitest`. |
| 5 · Requêtes lentes | lecture de plans | Opus 5 | élevé | Raisonnement sur plans d'exécution. |
| 6 · Mesure terrain | instrumental | Sonnet 5 | moyen | L'outil mesure ; le modèle restitue. |

**Sur le choix global :** ne pas confier l'audit *complet* à un modèle rapide. Les Lots 1, 2 et 3
touchent tous à l'isolation multi-tenant, où une erreur silencieuse coûte infiniment plus que le
temps gagné. Fable 5 a sa place au Lot 4, et seulement là.

**Sur l'effort :** « extra » n'est justifié nulle part dans ce plan. Les leviers sont identifiés
et chiffrés ; ce qu'il reste est de l'exécution rigoureuse, pas de la recherche.

---

## 6 bis. Fiche d'exécution par lot — skills, modèle, effort

> Les noms de skills ci-dessous sont les **identifiants exacts** à invoquer.
> Un skill précédé de `/` est une commande ; les autres s'invoquent par leur nom complet.
> « Après » = à lancer une fois le code du lot écrit, avant la barrière de qualité.

---

### Lot 0 — Instrumentation ✅ *fait le 2026-07-29*

| | |
|---|---|
| **Modèle** | Sonnet 5 |
| **Effort** | moyen |
| **Skills — pendant** | *aucun* (déblocage mécanique + installation de paquets) |
| **Skills — après** | `/simplify` |
| **Pourquoi ce couple** | Le build, `tsc` et `vitest` valident intégralement. Aucun jugement à porter, donc aucun besoin d'Opus. |

---

### Lot 1 — RLS : wrapping InitPlan

| | |
|---|---|
| **Modèle** | **Opus 5** |
| **Effort** | **élevé** |
| **Skills — pendant** | 1. `supabase:supabase-postgres-best-practices` ← **le skill central du lot**<br>2. `supabase:supabase` (motifs RLS, migrations) |
| **Skills — après** | 1. `/code-review` sur la migration ← **obligatoire avant application**<br>2. `/security-review` |
| **Outils** | MCP Supabase : `execute_sql` (dry-run `ROLLBACK`), `apply_migration`, `get_advisors(security)` |
| **Pourquoi ce couple** | Le volume est mécanique (186 policies), le risque ne l'est pas : un `WITH CHECK` mal réécrit ouvre une brèche d'isolation entre workspaces. `/code-review` et `/security-review` sont ici à leur place exacte — sur un diff, en garde-fou, pas en diagnostic. |

---

### Lot 2 — Realtime et volume WAL

| | |
|---|---|
| **Modèle** | **Opus 5** |
| **Effort** | **élevé** |
| **Skills — pendant** | 1. `supabase:supabase` (Realtime : `postgres_changes` vs `broadcast`, filtres serveur)<br>2. `engineering:architecture` ← **produire l'ADR de la décision** |
| **Skills — après** | `/code-review` |
| **Outils** | MCP Supabase : `execute_sql` (M6/M7) |
| **Pourquoi ce couple** | C'est un arbitrage produit — immédiateté perçue de la notification contre coût d'infrastructure — pas une optimisation. `engineering:architecture` sert enfin à ce pour quoi il est fait : graver une décision, pas auditer. |

---

### Lot 3 — Cache Next 16 et frontière serveur/client

| | |
|---|---|
| **Modèle** | **Opus 5** (étapes 2-3) · Sonnet 5 (étapes 1, 4, 5) |
| **Effort** | **élevé** (2-3) · moyen (1, 4, 5) |
| **Skills — pendant** | 1. `vercel:next-cache-components` ← **le skill central du lot**<br>2. `vercel:nextjs` (streaming, Suspense, `loading.tsx`)<br>3. `vercel:routing-middleware` (pour `src/proxy.ts`, étape 5)<br>4. `vercel:runtime-cache` (référentiels quasi statiques)<br>5. `vercel:vercel-functions` (Fluid Compute, `maxDuration` des routes n8n) |
| **Skills — après** | 1. `/code-review`<br>2. `/security-review` ← **le cache mal clé = fuite inter-tenant**<br>3. `/simplify` |
| **Pourquoi ce couple** | Une frontière de cache est une frontière de sécurité : cacher une donnée `workspace_id`-scopée sans inclure le workspace dans la clé fuit des données entre tenants. Même gravité que le Lot 1, par un autre chemin — d'où Opus sur les étapes de cache et `/security-review` en sortie. |

---

### Lot 4 — Bundle client et hydratation

| | |
|---|---|
| **Modèle** | Sonnet 5 · **Fable 5** acceptable pour les extractions répétitives |
| **Effort** | moyen |
| **Skills — pendant** | 1. `web-performance-optimization` ← **le skill central du lot**<br>2. `vercel:react-best-practices` ← **cibler les 15 gros composants, pas les 439**<br>3. `vercel:turbopack` (temps de build, limites de l'analyzer)<br>4. `engineering:tech-debt` (les 3 racines concurrentes `components/`/`features/`/`lib/` alimentent le bundle par imports transitifs) |
| **Skills — après** | 1. `/simplify`<br>2. `/code-review` |
| **Commandes** | `ANALYZE=true npx next build --webpack` puis lire `.next/analyze/client.html` |
| **Pourquoi ce couple** | Purement volumétrique et réversible, et chaque fichier est gardé par `tsc` + `build` + `vitest`. C'est le seul lot où un modèle rapide est défendable — à condition de ne jamais franchir la barrière de qualité en lot groupé. |
| **⚠️ Prérequis** | **Ne pas chercher d'autres imports de barrels — c'est fait, et le cas était isolé.** Vérifié à la revue du 2026-07-29 : `src/components/staffing/index.tsx` est le **seul** barrel du projet important du code serveur, et depuis le correctif du Lot 0 aucun fichier client ne l'importe. Le vrai prérequis est ailleurs : **112 des 126 modules important `@/lib/supabase/server` n'ont pas `import "server-only"`**. C'est la cause racine que le Lot 0 n'a pas traitée (il a corrigé le site d'import, pas la garde absente), et sans elle la même classe de bug repassera en silence sous Turbopack — le CI ne lançant pas webpack, rien ne l'attrapera. |

---

### Lot 5 — Requêtes et vues lentes

| | |
|---|---|
| **Modèle** | **Opus 5** |
| **Effort** | **élevé** |
| **Skills — pendant** | 1. `supabase:supabase-postgres-best-practices` ← **le skill central du lot**<br>2. `data:write-query` (réécriture SQL, dialecte Postgres) |
| **Skills — après** | `/code-review` |
| **Outils** | MCP Supabase : `execute_sql` (`EXPLAIN ANALYZE` en session authentifiée) |
| **Pourquoi ce couple** | Lire un plan d'exécution et décider s'il faut un index, réécrire la vue ou ne rien faire demande du jugement. **Ce lot peut se révéler quasi vide après le Lot 1** — c'est le résultat espéré, pas un échec. |
| **⛔ Skill à ne pas utiliser** | `data:explore-data` — profile un jeu de données (taux de null, distributions), n'a rien à voir avec la performance d'une base. |

---

### Lot 6 — Mesure terrain · *sous réserve d'accord sur Chrome DevTools*

| | |
|---|---|
| **Modèle** | Sonnet 5 |
| **Effort** | moyen |
| **Skills — pendant** | 1. `chrome-devtools-mcp:debug-optimize-lcp`<br>2. `chrome-devtools-mcp:chrome-devtools`<br>3. `chrome-devtools-mcp:memory-leak-debugging` (les 12 canaux Realtime = risque de fuite réel)<br>4. `vercel:verification` (chaîne navigateur → API → données) |
| **Outils** | `lighthouse_audit`, `performance_start_trace`, `list_network_requests`, `take_heapsnapshot`, `emulate` (mobile) |
| **Pourquoi ce couple** | L'outil mesure, le modèle restitue — aucun jugement architectural. **À faire en desktop ET en mobile** : les deux branches de rendu sont des composants distincts (ADR-0006), une mesure desktop ne dit rien du mobile. |
| **⚠️ Sans cet accord** | Il n'existe aucune mesure frontend possible : Web Analytics est désactivé et le trafic (~60 req/7 j) ne produira pas de données Speed Insights exploitables avant des semaines. |

---

### Agent optionnel

`vercel:performance-optimizer` (agent dédié Core Web Vitals / caching / bundle) —
pertinent uniquement sur les **Lots 3, 4 et 6**. À ne pas lancer sur les Lots 1, 2 et 5 :
il ne connaît pas le modèle RLS multi-tenant de KREDO et produirait des recommandations
génériques sur la partie base.

---

## 6 ter. Dette relevée à la revue du 2026-07-29 (`/code-review`)

Deux défauts de la migration `059_rls_initplan_wrapping` **ne sont pas corrigés dans le
fichier** : la règle du projet interdit de modifier une migration déjà appliquée. Ils
nécessitent une nouvelle migration ou un contrôle de CI, à traiter hors audit.

1. **Garde d'idempotence évaluée sur l'expression entière** (ligne 83). Le test
   `not like '%SELECT private.current_workspace_id()%'` porte sur la totalité de
   `qual`/`with_check`, pas par occurrence. Une policy mêlant une forme déjà wrappée et une
   forme non wrappée serait **exclue de la boucle** tout en restant détectée par le garde-fou
   `raise exception` (ligne 113) → **`supabase db reset` échouerait intégralement**.
   Latent : aucune policy à forme mixte n'existe aujourd'hui (vérifié, requête vide).
2. **Aucun garde-fou contre la dérive.** La migration est un `DO` block one-shot. Toutes les
   migrations antérieures servent de modèle copié-collé en forme **non wrappée**, donc les
   futures tables repartiront non wrappées sans qu'aucun contrôle ne le signale — et le
   compteur M4 (aujourd'hui 0/245) remontera en silence. Or le bénéfice « structurel à plus
   grand volume » est la **seule** justification retenue pour conserver la migration : ce futur
   est précisément le moment où la dérive l'aura annulée. Correctif : une assertion en CI sur
   M4 = 0, ou un test d'intégration sur `pg_policies`.

**Constat de processus, à ne pas répéter.** Ce document déclarait `/code-review` **obligatoire
avant application** pour le Lot 1. Il n'a pas été lancé : 210 policies RLS ont été appliquées
en production puis déployées sans revue. Et la lacune qu'il aurait attrapée était réelle — le
test négatif d'isolation omettait `profiles` et `workspaces`, les deux seules tables au motif
RLS non standard (2 policies au lieu de 4) et celles dont dépend `current_workspace_id()`.
Lacune comblée à la revue (`profiles` 1, `workspaces` 1, `audit_log` 5063, `tasks` 30 —
aucune régression). Le résultat était bon ; le processus a échoué.

---

## 7. Règles d'exécution

1. **Un lot = une branche = un commit.** Un gain non isolé est un gain non attribuable.
2. **Mesurer avant, mesurer après, à chaque lot.** Consigner dans §8.
3. **Barrière de qualité entre chaque lot**, sans exception :
   `npx tsc --noEmit` → `npm run build` → `npx vitest run` → `npx eslint` sur les fichiers touchés.
4. **Aucune migration appliquée sans dry-run `ROLLBACK`** et sans test négatif d'isolation.
5. **Aucun rapport de gain sans chiffre avant/après.** Une optimisation non mesurée n'a pas eu lieu.
5 bis. **Toute part relative doit être accompagnée de sa valeur absolue et de sa fenêtre de
   mesure avant de servir à prioriser.** Règle née du Lot 2 : « 79,7 % du temps de la base » et
   « 0,2 % d'un cœur » décrivent le même fait — l'un appelle une refonte, l'autre un classement
   sans suite. Les Lots 1 et 2 ont tous deux été mal priorisés faute d'appliquer cette règle.
5 ter. **Toujours deux passes de préchauffage avant un `EXPLAIN ANALYZE`.** Règle née du Lot 1 :
   une première exécution a annoncé une régression de 4× qui n'était qu'un cache froid.
6. **Vérifier à la source.** Le nombre de tables live diverge de `CLAUDE.md` (drift documenté) :
   toujours interroger le catalogue, jamais la documentation.

---

## 8. Baseline — relevée au Lot 0 (2026-07-29)

### Base de données

| Métrique | Avant | Après | Δ |
|---|---|---|---|
| M1 · part du polling WAL Realtime | **79,7 %** (2 913 s / 539 257 appels) | *inchangé — clos sans action* | ADR-0016 |
| **M1 bis · charge absolue de TOUTE la base** | **0,257 % d'un cœur** (3 655 s / 1 419 976 s) | — | **la vraie grandeur** |
| M2 · pire requête applicative (moyenne) | 90,4 ms (`v_crm_account_list`, 341 appels) | | |
| M2 · pire requête applicative (max) | 1 256 ms (`v_ai_intelligence_summary`) | | |
| M3 · `seq_scan` sur `profiles` | **689 232** (`idx_scan` = 8) | | |
| M3 · `seq_scan` sur `workspaces` | 3 751 (`idx_scan` = 0) | | |
| M4 · policies non wrappées | **210 / 245** (chiffre corrigé) | **0 / 245** | ✅ Lot 1 |
| M2 · `v_crm_account_list`, cache chaud | 53,58 ms | 53,35 ms | **≈ 0 — aucun gain** |
| M6 · slots de réplication actifs | 2 · 16 MB de WAL retenu chacun | | |
| M7 · `audit_log` | 19 MB / 5 063 lignes (**≈ 3,8 KB par ligne**) | | |
| M8 · index inutilisés / total | 188 / 426 | | |

### Application

| Métrique | Avant | Après | Δ |
|---|---|---|---|
| Routes dynamiques `ƒ` | **68 / 71** (3 statiques, 3 SSG) | | |
| JS client total, non compressé (`.next/static/chunks`) | **4,8 MB** | | |
| Chunk du layout `(app)` — chargé sur **toutes** les pages | **156 KB** | | |
| Plus gros chunk partagé | 220 KB (`3794-*.js`) | | |
| `framework` / `main` / `polyfills` | 188 / 136 / 112 KB | | |
| Composants `"use client"` | 439 / 673 (65 %) | | |
| `use cache` / `cacheComponents` | 0 | | |
| `<Suspense>` | 7 (pour 50 `page.tsx`) | | |

### Terrain — indisponible, et c'est un résultat en soi

| Métrique | Constat |
|---|---|
| Vercel Web Analytics | **non activé** sur le projet (404) |
| Trafic production (logs runtime, 7 j) | **≈ 60 requêtes**, toutes routes confondues |
| LCP / INP / CLS terrain | Speed Insights installé au Lot 0, **aucune donnée avant plusieurs semaines** à ce niveau de trafic |

> **Conséquence à retenir.** Les 79,7 % de CPU base brûlés par Realtime le sont avec
> **~60 requêtes utilisateur en 7 jours**. Ce n'est donc pas une charge induite par les
> utilisateurs : c'est un **coût de fonctionnement à vide** (polling WAL avec abonnés
> inactifs, cron `reap_stale_intelligence_runs` toutes les 10 min, réintrospection
> PostgREST). Ce coût est un **plancher fixe**, il ne se dilue pas avec l'usage.
> Cela renforce le Levier B et **disqualifie toute mesure terrain** à court terme :
> l'audit frontend devra être synthétique (labo), pas observationnel.

---

## 9. Journal d'exécution

### Lot 0 — exécuté le 2026-07-29 ✅

**Déblocage du build.** 50 fichiers `.ts`/`.tsx` non suivis polluaient l'arbre de travail
et cassaient `tsc`. Vérification par chemin résolu : **aucun n'est importé par du code
suivi**. 43 ont un jumeau suivi dans `src/features/` (résidus du déplacement `a3711eb0`
« retire legacy views ») ; les 7 autres ont chacun été **supprimés volontairement par un
commit nommé** (`53fcb278`, `c046f3f6`, `af14410b`, `a3711eb0`, `3a213872` — ce dernier
intitulé « prune dead code »). Tous récupérables depuis git.
→ Déplacés (non supprimés) vers le scratchpad de session, dossier `zombies-lot0/`.

**Bug d'architecture trouvé et corrigé** (`src/components/layout/AppOverlayHosts.tsx`).
Ce composant client est monté dans `(app)/layout.tsx`, donc **sur toutes les pages**. Il
importait le **barrel** `@/components/staffing` pour récupérer le seul `StaffingDrawer` —
or ce barrel exporte aussi le Server Component `SyntheseStaffingSection`, qui importe
statiquement `get-staffings-list` / `get-staffings-planning` → `supabase/server.ts` →
`next/headers`. Du code serveur était donc atteignable depuis le graphe client, sur
chaque page. **Turbopack le tolère silencieusement ; webpack le refuse** — ce qui bloquait
toute mesure de bundle. Corrigé par un import direct du module du drawer.
Cause racine du silence : `get-staffings-planning.ts` n'a **pas** la garde `server-only`
(22 fichiers du projet l'ont, pas celui-là).

**Instrumentation posée.** `@next/bundle-analyzer` (dev, activé par `ANALYZE=true`,
passe-plat sinon) et `@vercel/speed-insights` (monté dans le layout racine).

**Deux limites d'outillage constatées, à connaître pour les lots suivants :**
- `@next/bundle-analyzer` **ne fonctionne pas sous Turbopack** — il exige
  `next build --webpack`. L'analyse porte donc sur le bundle webpack, alors que la
  production livre du Turbopack : à traiter comme un indicateur de **composition**
  (quels modules pèsent), pas comme la taille exacte livrée.
- **Next 16 n'imprime plus la table « First Load JS » par route**, ni sous Turbopack ni
  sous webpack. Les tailles doivent être lues dans `.next/analyze/client.html` ou mesurées
  directement sur `.next/static/chunks`.

**Anomalie relevée, non corrigée** (hors périmètre Lot 0) : la route
`/legacy/folio/sector-studies` lève `DYNAMIC_SERVER_USAGE` à chaque build (usage de
`cookies` dans une route que Next tente de prérendre). L'erreur est avalée par un
`try/catch` et journalisée — la page dégrade donc silencieusement. À traiter au Lot 3.

**Barrière de qualité :** `npx tsc --noEmit` → EXIT 0 · `npm run build` (Turbopack) →
EXIT 0 · `npx vitest run` → **698/698 (82 fichiers)** · `npx eslint` sur les 3 fichiers
touchés → 0 erreur.

**Fichiers modifiés :** `next.config.ts`, `src/app/layout.tsx`,
`src/components/layout/AppOverlayHosts.tsx`, `package.json` / `package-lock.json`.

---

### Lot 1 — exécuté le 2026-07-29 ✅ *appliqué, mais gain nul : le diagnostic était faux*

**Migration** : `supabase/migrations/20260729203143_059_rls_initplan_wrapping.sql`
(version enregistrée en base : `20260729203143` — nom de fichier local aligné, cf. piège
documenté Sessions 21/26). **210 policies** réécrites via `ALTER POLICY` (jamais DROP+CREATE :
aucune fenêtre sans policy, rôles/cmd/permissive préservés par construction).
Chiffre corrigé au passage : 210, et non 186 — la requête de comptage initiale sous-estimait
en exigeant que `qual` **et** `with_check` soient tous deux non wrappés.

**Isolation vérifiée, trois fois** (dry-run `ROLLBACK`, puis à nouveau après application),
en session `authenticated` réelle, comptages **strictement identiques** à chaque passe :
utilisateur réel → companies 96 · contacts 642 · opportunities 24 · missions 23 ·
`collaborator_compensation` 23 · `financial_models` 12 · `account_signals` 750 ;
utilisateur inconnu → **0 partout**. `get_advisors(security)` : aucun avertissement nouveau.

**Le résultat de mesure, sans enjolivure.** Mesure A/B sur `v_crm_account_list` (la requête
réellement lente : 341 appels, 90 ms de moyenne historique), cache chaud, session
authentifiée, état « avant » reconstitué en transaction annulée :

| État | Temps d'exécution | Plan sur `companies` |
|---|---|---|
| non wrappé | 53,58 ms | `Index Scan using idx_companies_workspace` |
| wrappé | **53,35 ms** | `Seq Scan` + `Filter` |

**Aucun gain.** Et la cause est instructive : avant migration, le plan montrait déjà
`Index Cond: (workspace_id = private.current_workspace_id())` — PostgreSQL traitait la
fonction `STABLE` comme une expression évaluée **une seule fois** au démarrage du scan.
L'hypothèse de départ (réévaluation par ligne) ne tenait pas. Le passage en `Seq Scan` sur
`companies` n'est pas une régression : sur 96 lignes le planificateur estime le Seq Scan
moins coûteux (41 buffers contre 44) et il a raison — à revérifier au-delà de ~10k lignes.

**Erreur de méthode à ne pas reproduire.** Ma première mesure annonçait 207 ms pour l'état
wrappé, soit une régression de 4×. C'était un **artefact de cache froid** (première exécution
de la session : 3 559 buffers, 14 ms de planification). Deux passes de préchauffage l'ont
dissipé. Toute mesure de plan sur cette base doit être précédée d'un warm-up.

**Pourquoi la migration est conservée malgré un gain nul :** elle est sémantiquement neutre,
sans coût mesuré, alignée sur la recommandation officielle Supabase, et elle protège les
nœuds où le prédicat tombe en `Filter` et non en `Index Cond` — cas réellement présent dans
le plan d'avant (`SubPlan 4 → Filter: (private.current_workspace_id() = workspace_id)` sur
`ai_intelligence_results`). Bénéfice structurel qui croîtra avec le volume, non observable
aux volumes actuels.

**Conséquence sur la suite de l'audit : la priorité change.** Les 689k scans sur `profiles`
sont un effet du **nombre de requêtes**, dominé par Realtime. L'ordre réel devient
**Lot 2 (Realtime) → Lot 3 (cache/RSC) → Lot 5 (requêtes lentes)**. Et le Lot 5 a désormais
une cible identifiée par la mesure, indépendante des RLS : dans `v_crm_account_list`, un seul
nœud `HashAggregate` consomme **14,3 ms des 53 ms**, et deux `Nested Loop Left Join` rejettent
690 et 555 lignes par `Join Filter` au lieu de joindre par hachage.

**Barrière de qualité :** `tsc --noEmit` EXIT 0 · `vitest` 698/698 · migration idempotente
(garde `not like '%SELECT private.<fn>()%'`, réexécution sans double wrapping) · garde-fou
`raise exception` si des policies non wrappées subsistent · vérification finale :
**0 policy non wrappée sur 245**.

---

---

### Lot 2 — exécuté le 2026-07-29 ✅ *clos SANS action — la prémisse était trompeuse*

**Livrable : [ADR-0016](adr/ADR-0016-realtime-notifications-cout-mesure.md)**, qui grave le
refus de re-architecturer, avec les chiffres et des conditions de réouverture. Aucune ligne de
code ni de SQL modifiée.

**L'arithmétique qui ferme le sujet.** Fenêtre `pg_stat_statements` : réinitialisée le
2026-07-13 10:25 UTC, soit **1 419 976 s** (16 j 10 h).

| Grandeur | Valeur |
|---|---|
| Temps d'exécution total, **toutes requêtes** (1 724 distinctes, 718 901 appels) | **3 655 s** |
| → part d'un seul cœur | **0,257 %** |
| dont polling WAL Realtime | 2 913 s → **0,205 %** d'un cœur |
| dont tout le reste de l'application | 742 s → **0,05 %** d'un cœur |
| Cadence réelle du polling | 1 appel toutes les **2,6 s**, ≈ 1 ligne renvoyée → battement à vide |

Les 79,7 % étaient une **part d'un total négligeable**. Dans une base qui ne fait presque
rien, le seul processus qui tourne en continu capte mécaniquement la quasi-totalité du temps
mesuré. L'indicateur était exact et structurellement trompeur — et c'est moi qui l'ai présenté
comme un problème.

**Trois options écartées** (détail et motifs dans l'ADR) : filtrage serveur sur `user_id`,
bascule `postgres_changes` → `broadcast` (qui aurait en plus **supprimé l'évaluation RLS**, à
reconstruire côté applicatif), polling basse fréquence (qui aurait dégradé l'immédiateté de
l'alerte d'échec de workflow pour un gain nul).

**Contrôles annexes, tous négatifs :**
- **Fuites de canaux** : 8 fichiers client audités, création et `removeChannel` équilibrés
  partout. Vérification ciblée sur `NotificationBell` (le seul canal permanent) :
  `removeChannel` bien placé dans le `return` du `useEffect`, dépendances stables
  (`[supabase]`). **Aucune fuite.**
- **Rétention WAL** : 2 slots actifs (16 MB chacun) à une heure d'intervalle, puis **aucun** —
  Realtime les recrée cycliquement. Pas de risque de saturation disque.
- **`audit_log`** : plus grosse table (19 MB / 5 063 lignes ≈ 3,8 KB par ligne) mais seulement
  ≈ 70 insertions/jour → **≈ 100 MB/an**. Retenu en **suivi de stockage**, pas en charge.

**Conséquence stratégique : la moitié « base de données » de l'audit est close.** Les Lots 1
et 2 ont tous deux vu leur prémisse invalidée par la mesure. Il n'y a rien à optimiser dans
cette base.

**Priorité révisée : Lot 3 (cache Next 16 / frontière RSC) → Lot 4 (bundle).** C'est cohérent
avec le profil réel : base au repos, mais 4,8 MB de JS client, 156 KB de chunk de layout sur
chaque page, 68/71 routes dynamiques, `use cache` jamais employé, 7 `<Suspense>` pour 50
routes. **Dans une application dont la base ne travaille pas, la latence ressentie est
intégralement un problème de front-end.** Le Lot 5 devient du confort, pas de la performance.

---

**Tag git `perf-baseline` : posé** sur le commit `f001e0cb` et poussé (2026-07-29), après
commit du WIP sectoriel de Guillaume qui bloquait initialement l'opération. La baseline est
donc rejouable : `git checkout perf-baseline`.
