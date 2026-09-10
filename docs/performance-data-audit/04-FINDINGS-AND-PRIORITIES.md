# 04 — Constats, recommandations et priorités

Format imposé pour chaque constat : **constat → preuve → cause → conséquence → recommandation →
gain attendu → risque → effort**. Les constats sont numérotés `F-n` et référencés par la roadmap.

Échelles : *effort* S (< 1 h) · M (une demi-journée) · L (1 à 3 jours) · XL (chantier).
*Risque* = probabilité de régression fonctionnelle.

---

## F-0 — Région d'exécution Vercel · ✅ **CLOS le 2026-09-10 — le projet était bien aux États-Unis, basculé en France**

| | |
|---|---|
| **Constat** | La base est en `eu-west-1`. La région des fonctions Vercel est inconnue : ni `vercel.json`, ni `.vercel/project.json` dans le repo. Le plan est *hobby*, donc mono-région. |
| **Preuve** | API Management Supabase (`region: eu-west-1`) ; absence des deux fichiers ; API Vercel (`plan: hobby`). |
| **Cause** | Aucune région n'a jamais été fixée explicitement ; le défaut Vercel est `iad1` (Washington DC). |
| **Conséquence** | **Si** les fonctions sont en `iad1`, chaque aller-retour PostgREST ajoute ~80–90 ms de transatlantique aux 116 ms de p50 mesurés côté origine. Sur `/veille` (7 vagues) et la fiche compte (5 vagues), cela représente 400 à 630 ms de latence pure, invisible dans toutes les mesures locales. |
| **Recommandation** | Ouvrir *Vercel → Settings → Functions → Region*. Si ce n'est pas `dub1` (Dublin) ou une autre région `eu-*`, la basculer. Consigner le résultat dans [06-AUDIT-LEDGER](06-AUDIT-LEDGER.md), **y compris si la région était déjà bonne** — c'est une information qui ferme la question. |
| **Gain** | 0 ms si déjà en `eu-*` · **jusqu'à −600 ms par page** sinon |
| **Risque** | Nul (redéploiement) |
| **Effort** | **S — 2 minutes** |

> ✅ **Vérifié par Guillaume le 2026-09-10 : le projet Vercel était effectivement hébergé aux
> États-Unis. Région basculée sur la France ; Supabase était déjà correct.**
> Chaque aller-retour PostgREST payait donc bien un transatlantique, **par-dessus** les 116 ms de
> p50 mesurés côté origine — soit 400 à 630 ms de latence pure sur `/veille` et la fiche compte,
> jamais comptés dans les mesures locales de [00](00-BASELINE-AND-SCOPE.md) §4.
>
> ⚠️ **Le changement ne s'applique qu'aux nouveaux déploiements** : redéployer avant de mesurer.

---

## F-1 — La fiche compte fait 33 allers-retours en 5 vagues · ✅ **(a)(b) LIVRÉS au Lot 3 — 5 → 3 vagues, 1,14 s → 0,57 s, 450 → 92 Ko lus**

| | |
|---|---|
| **Constat** | `/prospection/accounts/[companyId]` émet 33 requêtes en 5 paliers séquentiels. |
| **Preuve** | Trace `[perf]` complète en [01](01-DATA-FLOW-MAP.md) §2.1 : vagues à t0 = 0 / 116 / 140 / 374 / 1029 ms. Total mesuré **1,14 s** (build de production, à chaud). |
| **Cause** | Le hub charge **les 5 étapes** (Connaissance, Secteur, Enjeux, Stratégie, Roadmap) alors que l'écran en affiche une ; et trois doublons stricts subsistent : `companies` ×2, `v_sector_knowledge_resolved` ×2, plus une 33ᵉ requête isolée pour la seule colonne `relation_type`. |
| **Conséquence** | La page la plus utilisée du module Account Intelligence est la plus lente de l'application, et son coût est **indépendant de l'étape consultée**. |
| **Recommandation** | En trois temps, mesurés séparément : **(a)** fusionner les 2 lectures `companies` et y intégrer `relation_type` ; **(b)** fusionner les 2 lectures `v_sector_knowledge_resolved` ; **(c)** ne charger que l'étape affichée, sur le motif `?section=` déjà en production dans `/consultants`. |
| **Gain** | (a)+(b) : **−3 allers-retours, −1 vague, ≈ −250 ms** · (c) : **1,14 s → ~0,4 s** |
| **Risque** | (a)(b) faible · **(c) moyen** — le hub partage un modèle entre étapes |
| **Effort** | (a)(b) **M** · (c) **L/XL** |

---

## F-2 — `companies.metadata` : 378 Ko transférés pour 0 octet utile · ✅ **LIVRÉ au Lot 3 — −99,2 %, SANS migration**

| | |
|---|---|
| **Constat** | Chaque ouverture de fiche compte transfère 378 Ko de blob JSON dont rien n'est extrait. |
| **Preuve** | Trace : `companies … [sector_id=eq.…]` **309 427 octets / 641,7 ms**, `[segment_id=eq.…]` **68 791 octets / 568,8 ms**. Vérification SQL : 10 lignes, `metadata` = 309 Ko de JSON, colonnes utiles = **526 octets**, alias effectivement lus = **0 octet**. |
| **Cause** | [`sector-snapshot-data.ts:153,159`](../../src/lib/intelligence/sector-snapshot-data.ts) sélectionne `metadata` entier pour alimenter `metadataAliases()`, qui n'en veut que 5 chaînes courtes. `metadata` est TOASTé : chaque référence le décompresse intégralement. |
| **Conséquence** | ~600 ms sur la vague la plus lente de la page la plus lente. |
| **Recommandation initiale** | ~~Colonnes générées `meta_aliases` / `meta_legal_name` / `meta_company_name`.~~ **Écartée par la mesure au Lot 3.** |
| **Ce qui a été fait** | **Projection JSON PostgREST**, zéro migration : `meta_aliases:metadata->aliases, …`. Deux faits l'ont imposée — (1) **aucune** des 112 lignes ne porte ces clés et **aucun producteur** n'existe, donc les colonnes générées auraient été 100 % `NULL` ; (2) `EXPLAIN` donne **1,4 ms / 14 buffers**, le coût n'était donc pas la décompression TOAST mais le transport de 309 Ko. |
| **Gain mesuré** | **309 427 → 2 875 octets** (macro) et **68 791 → 597** (segment), soit **−99,2 %** |
| **Risque** | Couvert : 6 tests de non-régression ajoutés sur `metadataAliases`, qui n'en avait **aucun** |
| **Effort réel** | **S** — 2 fichiers, aucune DDL |

---

## F-3 — `/veille` : 42 allers-retours en 7 vagues · ✅ **(a) Lot 2 · (c) Lot 5 — 42 → 23 requêtes, 7 → 5 vagues**

| | |
|---|---|
| **Constat** | 42 requêtes, 7 paliers, **890 ms**, 595 Ko de HTML. Les 306 premières millisecondes sont `getUser()` puis `profiles`, **en série, avant toute donnée métier**. |
| **Preuve** | Trace : `AUTH t0=0 dur=194,8 ms` → `REST t0=196 profiles dur=102,4 ms` → première donnée à t0=306. 7 lectures de `profiles` et 7 appels `/auth/v1/user` sur un seul rendu. |
| **Cause** | `getUser()` en 3 endroits du chemin de rendu ([`veille/page.tsx:43`](../../src/app/%28app%29/veille/page.tsx), [`veille-data.ts:26`](../../src/app/%28app%29/veille/_data/veille-data.ts), [`get-source-management-snapshot.ts:48`](../../src/features/source-management/data/get-source-management-snapshot.ts)) au lieu du résolveur partagé ; et 8 `select("*")`. |
| **Conséquence** | 34 % du temps de la page consommés avant la première donnée utile. |
| **Recommandation** | **(a)** basculer les 3 fichiers sur `getCurrentUserId()`/`resolveCurrentWorkspaceId()` ; **(b)** remplacer les 8 `select("*")` par des colonnes explicites ; **(c)** ne charger le catalogue de sources et les corpus qu'à l'ouverture de leur onglet. |
| **Gain** | (a) **≈ −250 ms, mesuré** · (b) **HYPOTHÈSE −40 à −60 %** sur 4 requêtes, à mesurer · (c) −5 à −8 allers-retours |
| **Risque** | (a) nul · (b) faible · (c) moyen |
| **Effort** | (a) **S** · (b) **S** · (c) **L** |

---

## F-4 — L'identité coûte 11,4 % du temps Supabase · ✅ **LIVRÉ au Lot 2 pour le chemin de rendu**

| | |
|---|---|
| **Constat** | Sur 24 h de trafic réel : **992 appels / 182 s d'origin time** consacrés à `/auth/v1/user`, `/auth/v1/.well-known/jwks.json` et `profiles.workspace_id`, sur 7 900 appels / 1 597 s au total. |
| **Preuve** | `edge_logs` Supabase. Détail : jwks **427 appels** (p50 89 ms), `/auth/v1/user` **146** (p50 176 ms), `profiles` **419** (p50 127 ms). Banc dédié : `getClaims()` = 0,4–1,0 ms sur client partagé, **77–184 ms sur client neuf**. |
| **Cause** | **Deux causes distinctes.** (1) `getUser()` réseau là où `getClaims()` suffirait. (2) **`createClient()` appelé 282 fois** — chaque client a son propre cache JWKS, donc chaque module retélécharge le JWKS. Les 427 fetches de JWKS/jour en sont la trace directe. |
| **Conséquence** | Un huitième du budget Supabase de l'application produit zéro donnée métier. La mémoïsation `fetch` de Next amortit une partie des doublons (`dur=0.2 ms` observé) mais seulement à URL strictement identique. |
| **Recommandation** | **(a)** les 3 `getUser()` du chemin de rendu → résolveur partagé (couvert par F-3a). **(b)** exporter `export const getRequestClient = cache(createClient)` depuis `src/lib/supabase/server.ts` et y faire converger les loaders de rendu, **loader par loader**. Laisser Server Actions et routes API sur `createClient()` (`cache()` y est inerte, et le contrôle strict y est voulu). |
| **Gain** | **80–180 ms par page** résolvant une identité |
| **Risque** | (a) nul · (b) **faible mais réel** — le partage de client change la portée des cookies écrits ; conversion incrémentale obligatoire, jamais de `sed` global |
| **Effort** | (a) **S** · (b) **L** |

---

## F-5 — `/cockpit` : 480 Ko lus pour afficher au plus 4 lignes par bloc · ✅ **LIVRÉ au Lot 3 — 480 → 151 Ko**

| | |
|---|---|
| **Constat** | 10 requêtes sans filtre ni limite. `account_signals` **294 626 octets (843 lignes)**, `calendar_events` **109 186 octets (548 lignes)** → **111 Ko** de HTML. |
| **Preuve** | Trace `/cockpit` + [`cockpit-desktop-data.ts:32-74`](../../src/lib/cockpit/cockpit-desktop-data.ts). Troncatures JS dans [`cockpit-desktop-view-model.ts`](../../src/lib/cockpit/cockpit-desktop-view-model.ts) : `.slice(0,4)` l.181, `.slice(0,5)` l.230, `.slice(0,8)` l.253, `.slice(0,3)` l.300. Côté base : `v_active_account_signals` renvoie **98 lignes** au lieu de 843 ; la fenêtre −7 j/+30 j de `calendar_events` en contient **35** au lieu de 548. |
| **Cause** | Le filtrage et la troncature sont applicatifs alors que la base fournit déjà la vue défensive et sait filtrer par date. |
| **Conséquence** | Le coût de la page d'accueil **croît linéairement avec le volume de signaux** (745 → 843 en un mois). `account_signals` est déjà le chemin le plus lent du trafic réel : p50 **307 ms**, p95 **1 037 ms**, max 3 742 ms. |
| **Ce qui a été fait** | **La vue n'a PAS été substituée.** La preuve d'équivalence exigée a échoué sur la sémantique : la vue et le filtre JS diffèrent sur `expired`, sur `expires_at`, sur la fenêtre de 2 mois et sur les signaux FOLIO. Les deux rendent 98 lignes aujourd'hui avec 0 divergence, mais c'est une coïncidence des données. Basculer serait un **choix produit**. Retenu : pousser le filtre JS **exact** en SQL, filtre applicatif conservé en second rideau. `calendar_events` borné au jour courant **en UTC** (`dateKey` utilise `toISOString()`). |
| **Gain mesuré** | `account_signals` **294 626 → 39 663 o** (−86,5 %) · `calendar_events` **109 186 → 632 o** (−99,4 %) · page **480 → 151 Ko**. HTML **identique à l'octet près**. |
| **Non fait** | `interactions` — 185 lignes / 16 Ko sur 2 colonnes ; une RPC coûterait plus que le gain |
| **Nuance** | Gain de **volume**, pas de latence : les 14 requêtes partent toujours en parallèle. Il empêche le coût de croître avec les données. |

---

## F-6 — `/prospection/accounts` : 1,15 Mo de flux RSC · ⛔ **BLOQUÉ PAR CONCEPTION (Lot 5) — requalifié**

| | |
|---|---|
| **Constat** | Le plus gros payload de l'application. `contacts` + embed `persons` = **364 044 octets** pour 642 lignes, chargés que l'onglet Contacts soit ouvert ou non. |
| **Preuve** | Trace + [`accounts-contacts-data.ts:339-360`](../../src/lib/accounts-contacts/accounts-contacts-data.ts). Le tout est passé en props à [`AccountsContactsViews.tsx`](../../src/components/accounts-contacts/AccountsContactsViews.tsx) — **2 726 lignes de composant client**. |
| **Cause** | Les contacts servent (i) à un comptage par entreprise que la vue produit **déjà** (`nb_contacts`, `nb_with_email` — `buildAccount()` l.264 fait `Math.max` des deux), (ii) à un onglet éventuellement non affiché. Aucune pagination. |
| **Conséquence** | 1,15 Mo à sérialiser côté serveur puis désérialiser et hydrater côté navigateur, à chaque ouverture. Le serveur reste rapide (0,35 s) : **le coût est entièrement chez le client**. |
| 🔴 **Pourquoi (b) est impossible tel quel** | [`use-url-filters.ts`](../../src/lib/search/use-url-filters.ts) écrit l'onglet via `window.history.replaceState`, **volontairement sans navigation App Router** — le commentaire du fichier est explicite : *« no Server Component re-render, no RSC payload refetch »*. Gater les contacts sur `searchParams.tab` côté serveur donnerait un **onglet Contacts vide**. |
| 🔴 **Second obstacle** | `data.contacts` n'alimente pas que l'onglet Contacts : il construit `contactsByAccountId` ([`AccountsContactsViews.tsx:2149`](../../src/components/accounts-contacts/AccountsContactsViews.tsx)), consommé par `filterAccounts` pour l'onglet **Comptes** — les filtres par rôle, e-mail et téléphone portent sur les contacts d'un compte. |
| **Requalification** | Ce n'est plus une optimisation de chargement mais **une refonte de l'état d'onglet de la page**. Les deux voies possibles sont coûteuses : rendre le changement d'onglet navigant (contraire à un choix explicite, et referait tout le payload à chaque clic), ou charger les contacts côté client à la demande — faisable, mais après avoir traité la dépendance de `filterAccounts`, dans un composant de **2 726 lignes**. |
| **Gain si traité** | **−364 Ko réseau, ≈ −500 Ko de flux RSC** — environ la moitié du payload |
| **Effort réel** | **XL**, chantier propre — pas un lot de performance |

---

## F-7 — Les 8 hôtes de tiroirs sont téléchargés sur toutes les pages · ⛔ **INVALIDÉ par la mesure (Lot 4) — ne pas rouvrir**

| | |
|---|---|
| **Constat** | Socle JS commun à **toutes** les pages `(app)` : **1,42 Mo brut / 382 Ko gzip / 21 chunks**. Il contient les 8 hôtes de [`AppOverlayHosts`](../../src/components/layout/AppOverlayHosts.tsx). |
| **Preuve** | Recherche de symboles dans les chunks du socle : `CommunicationComposerHost`, `AssistanceCaseDrawer`, `CrmIdentityDrawerHost`, `ReportGenerationHost`, `WatchAnalysisComposerHost`, `CrmAccountLauncherHost`, `LegacyNavigationDrawer`, `EventDrawer` — **tous présents**. Chunk d'agrégation : 132 Ko. |
| **Cause** | `next/dynamic({ ssr: false })` diffère le **rendu serveur**, pas le **chargement du chunk**. Les 8 hôtes sont rendus **inconditionnellement**, donc leurs chunks partent immédiatement. |
| **Conséquence** | ~130 Ko bruts de JS inutile au premier chargement de chaque page, plus le coût d'hydratation associé. |
| **Recommandation** | Monter chaque hôte sous condition d'ouverture (`const { isOpen } = useXxx(); return isOpen ? <Host/> : null`). Le `next/dynamic` existant fait alors réellement son travail. |
| **Gain** | **−100 à −130 Ko bruts** par premier chargement |
| **Risque** | **Moyen** — certains hôtes s'abonnent peut-être à des événements au montage ; valider **hôte par hôte**, deep-links compris |
| **Effort** | **M** |

---

## F-8 — `/reports` : 4 allers-retours pour 4 compteurs, 144 Ko pour une chaîne · ✅ **LIVRÉ au Lot 2 — 7 → 4 requêtes, 0,45 s → 0,23 s**

| | |
|---|---|
| **Constat** | `getKpis()` émet 4 requêtes `count:"exact", head:true` (93,9 / 100,9 / 148,0 / 168,0 ms, **0 octet de corps chacune**). Et `intelligence_document_versions` renvoie **144 509 octets** de `brief_json`. |
| **Preuve** | Trace `/reports` + [`get-reports-list.ts:446-481`](../../src/app/%28app%29/reports/_data/get-reports-list.ts) et `:541-544`. Usage réel du blob : `extractScenarioLabel()` l.396-405 en tire `brief.what.scenario`, **une chaîne**. |
| **Cause** | Quatre variantes de la même requête filtrée ; et projection JSON non utilisée. |
| **Conséquence** | ~150 ms et 140 Ko gaspillés sur une page à 0,41–0,48 s. |
| **Recommandation** | Un seul `select("status, last_used_at")` compté en JS (volumes de l'ordre de la centaine) · `select(… , brief_json->what->>scenario)` en projection PostgREST, en couvrant les 3 formes acceptées (`what.scenario`, `preset.scenario`, `scenario`). |
| **Gain** | **−3 allers-retours (~−150 ms), −140 Ko** |
| **Risque** | Faible |
| **Effort** | **S** |

---

## F-9 — `/agenda` : redirection émise après le début du streaming · ⛔ **DÉCLASSÉ — impact surestimé, non implémenté**

| | |
|---|---|
| **Constat** | `GET /agenda` renvoie **200 OK avec 61 510 octets** de squelette, puis un `NEXT_REDIRECT 307` en fin de flux, vers `/agenda?view=week&date=…`. |
| **Preuve** | Mesure : `/agenda` → 0,01 s, 61 510 octets, 0 requête, fin de flux `{"digest":"NEXT_REDIRECT;replace;/agenda?view=week&date=2026-09-10;307;"}`. Puis `/agenda?view=week&date=…` → 0,35 s, 200 107 octets, 8 requêtes. |
| **Cause** | [`AgendaDesktopPage.tsx:22`](../../src/components/agenda/AgendaDesktopPage.tsx) appelle `redirect()` **à l'intérieur** de la frontière `Suspense` posée par `AgendaSection` — donc après le début du streaming. |
| **Conséquence** | Le navigateur télécharge 61 Ko et **amorce le chargement des 26 chunks JS** pour un document jeté, à chaque clic sur « Agenda ». |
| **Recommandation** | Faire pointer le lien de navigation sur la route canonique. À défaut, remonter la normalisation dans `page.tsx`, **au-dessus** du `Suspense`. |
| **Coût réel, mesuré au Lot 2** | Navigation client (`RSC: 1`) : **22 484 octets · 7,3–17,1 ms**. Chargement dur : 61 510 octets · 12,1 ms. Soit **~30 à 60 ms** par ouverture, aller-retour compris — et non « 61 Ko + 26 chunks à chaque clic » comme annoncé initialement (vrai du seul chargement dur). |
| **Décision** | **Ne rien faire.** Remonter la redirection dans `page.tsx` est sans effet (elle reste sous `(app)/loading.tsx`). La faire en middleware ou dans le lien de navigation exigerait de dupliquer device + fuseau + `toWorkingDay` + **deux** constructeurs de query string (Desktop `view=week&date=…`, Mobile `mode=calendar&date=…&filters=…`) : toute divergence produit une **double** redirection, pire que le défaut. |
| **Effort** | **S** en apparence, **L** en réalité, pour ~40 ms |

---

## F-10 — PostgREST : pool à 10 connexions et 38 rechargements par jour · ↩️ **RECARACTÉRISÉ le 2026-09-10**

| | |
|---|---|
| **Constat** | `"Connection Pool initialized with a maximum size of 10 connections"` × 43/jour · `"Schema cache loaded …"` × 43 · `"Warp server error: Thread killed by timeout manager"` × 356 · 2 × HTTP 504 à 5 017 ms. |
| **Preuve** | `postgrest_logs` et `edge_logs` Supabase, 24 h. Corrélation dans `pg_stat_statements` : `SELECT name FROM pg_timezone_names` — **41 appels à 891 ms de moyenne, 2 171 ms max**, 5,7 % du CPU base. |
| **Cause** | Comportement plateforme, non déterminé par cet audit. Instance : `shared_buffers` 224 Mo, `max_connections` 60. |
| **Conséquence** | **Deux effets distincts.** (1) Un pool de 10 : `/cockpit` émet 14 requêtes simultanées et `/veille` 17 — au-delà de 10, elles font la queue. C'est ce qui fait passer une requête de ~80 ms isolée à 200–300 ms en rafale. (2) Un redémarrage toutes les ~33 min : la navigation qui tombe dedans paie 1 à 2 s sans cause applicative. |
| ↩️ **Correction — les redémarrages sont marginaux** | Chiffré : **38 rechargements en 24 h, 1 384 ms de moyenne, 1 954 ms au pire — soit 52,6 s cumulées sur 86 400**, c'est-à-dire **0,06 % du temps**. Côté trafic : **78 requêtes au-dessus d'1 s sur 7 416 (1,05 %)** et **2 erreurs 5xx (0,03 %)**. C'est réel, mais ce n'est **pas** ce qui rend KREDO lent. J'avais surévalué ce point. |
| ↩️ **Correction — pas de ticket support** | L'organisation est sur le **plan Free** : il n'y a pas de support avec engagement, seulement la communauté. Ma recommandation d'ouvrir un ticket **ne s'applique pas à ce plan**. |
| **Cause identifiée** | Ce ne sont **pas** des DDL applicatifs : à l'instant d'un rechargement, `postgres_logs` ne montre aucun ordre DDL, mais un **redémarrage du slot de réplication logique Realtime** à la milliseconde près. PostgREST et Realtime se reconnectent ensemble — signature d'un **recyclage de service au niveau plateforme**, cohérent avec le plan Free et la plus petite instance (`shared_buffers` 224 Mo, pool PostgREST **10**). Le cron applicatif est hors de cause : 144 exécutions/jour, toutes en succès, contre 38 rechargements. |
| 🔴 **Ce qui reste vrai et qui compte** | **Le plancher de 108 ms (p50) par aller-retour PostgREST**, pour un temps SQL de 1 à 5 ms — et **le pool de 10 connexions**, alors que `/cockpit` émet 14 requêtes simultanées et `/veille` 17. Ce coût-là est **permanent**, pas occasionnel : c'est lui qui fait qu'une page à 14 requêtes coûte 250 ms au lieu de 20. |
| **Recommandation** | **Décision de plan, pas de code.** Le seul moyen de savoir ce que change une instance plus grande est de la mesurer : passer sur Pro **un mois**, rejouer le protocole de [00](00-BASELINE-AND-SCOPE.md) §5, comparer `p50`/`p95` d'`origin_time` et le nombre de rechargements. Si le plancher de 108 ms ne bouge pas, il est dû au trajet Cloudflare et le palier ne sert à rien : redescendre. |
| **Gain** | **Non chiffrable sans l'essai.** Ne pas l'engager sur une supposition. |
| **Risque** | Nul · **Effort** : S |

---

## F-11 — `audit_log` : 71 Mo pour une table jamais lue, dont 50 Mo de blobs `companies`

| | |
|---|---|
| **Constat** | 71 Mo sur 124 Mo de base (57 %), 14 142 lignes, `seq_scan = 0` et `idx_scan = 0` sur la fenêtre. |
| **Preuve** | `entity_type = 'companies'` : 2 015 lignes, **50 Mo de `diff`, 25 Ko/ligne** — l'avant et l'après de la ligne, donc deux fois le blob `metadata`. |
| **Cause** | `private.log_audit()` sérialise la ligne entière, `metadata` compris. |
| **Conséquence** | 25 Ko de WAL par écriture sur `companies` — WAL que le décodage logique Realtime doit parcourir, et qui représente **84,5 % du CPU de la base** (100 269 appels / 544 s sur 21 h 32). Sauvegardes alourdies, croissance non bornée. |
| **Recommandation** | Exclure `metadata` du `diff` pour `companies` (`to_jsonb(NEW) - 'metadata'`) · rétention 12 mois via le `pg_cron` existant. **Ne pas** rouvrir le dossier Realtime : l'[ADR-0016](../adr/ADR-0016-realtime-notifications-cout-mesure.md) l'a tranché sur mesure ; réduire le WAL en amont est la voie propre. |
| **Gain** | **−50 Mo** et autant de WAL. Effet sur la latence des pages : **nul** — c'est de l'hygiène, pas de la performance perçue. |
| **Risque** | Faible — vérifier qu'aucune procédure d'audit métier ne relit `diff.metadata` |
| **Effort** | **M** |

---

## F-12 — `/missions/opps` : cascade à 4 paliers, dont un évitable

| | |
|---|---|
| **Constat** | 9 requêtes en 4 vagues, 0,41 s. `opportunity_candidates` est interrogée **deux fois**, à deux paliers différents (t0=4593 puis t0=4751), avec deux listes d'ids. |
| **Preuve** | Trace `/missions/opps`. |
| **Cause** | Deux étages de résolution successifs partageant la même table. |
| **Conséquence** | Une vague de trop, ~100 ms. |
| **Recommandation** | Fusionner les deux lectures. **Ne pas** convertir en RPC : le gain (~200 ms) ne justifie pas de déplacer de la logique métier en SQL, contre la doctrine du projet. |
| **Gain** | **−1 vague, ≈ −100 ms** |
| **Risque** | Faible |
| **Effort** | **M** |

---

## F-13 — `@supabase/supabase-js` complet dans le bundle navigateur · 🔒 **CONFIRMÉ mais BLOQUÉ (Lot 4) — devenu une question de produit**

| | |
|---|---|
| **Constat** | Le chunk `11b8--b8bsw1h.js` (**237 Ko bruts**) contient le SDK entier, chargé sur toutes les pages. 23 modules client l'importent ; seuls **3 canaux Realtime** existent. |
| **Preuve** | Recherche de symboles dans les chunks. Canaux : `use-run-journal-realtime.ts:93` (`/automations`), `use-current-workflow-execution.ts:114` (**`AppShell`, toutes pages**), `use-run-tracker.ts:262` (pendant un run). |
| **Cause présumée** | La plupart des 20 autres modules ne font que des `select` ponctuels — remplaçables par des Server Actions. |
| **Conséquence présumée** | 237 Ko bruts inutiles sur les pages sans canal. |
| **Mesure faite (Lot 4)** | **236,8 Ko confirmés** dans les chunks réellement référencés, sur un socle commun de **1 310 Ko en 20 chunks** — soit **18 %**. Les deux seuls postes nommables du socle sont celui-ci et `react-dom` (227,2 Ko, irréductible) ; les 18 autres chunks (~846 Ko) sont le shell applicatif. |
| 🔒 **Pourquoi le chantier est bloqué** | Le SDK est requis par un canal Realtime **monté dans `AppShell`, donc sur toutes les pages** : `use-current-workflow-execution.ts:114`, consommé par `WorkflowExecutionIndicatorDesktop`/`…Mobile`. **Un seul consommateur suffit à maintenir `supabase-js` dans le socle** : convertir les ~20 autres modules clients en Server Actions ne rendrait rien. |
| **Reformulation** | Ce n'est plus un chantier technique mais **une question de produit** : l'indicateur d'exécution de workflow doit-il vivre sur toutes les pages, ou seulement là où un run peut être déclenché ? Tant que la réponse est « toutes », les 237 Ko sont structurels. **À trancher par Guillaume.** |
| **Effort** | Nul tant que la question produit n'est pas tranchée |

---

## Matrice de priorisation

`Impact` = effet mesuré sur le temps d'ouverture · `Fréq.` = fréquence d'usage de la page.

| # | Optimisation | Impact | Fréq. | Effort | Risque | **Priorité** |
|---|---|---|---|---|---|---|
| F-0 | Vérifier la région Vercel | **était aux USA → France** | Toutes | **S** | Nul | ✅ **clos (Lot 1)** |
| F-3a | 3 `getUser()` → résolveur partagé | −250 ms | `/veille` | **S** | Nul | ✅ **livré (Lot 2)** |
| F-9 | Redirection `/agenda` hors du Suspense | ~40 ms | Haute | **L** réel | Moyen | ⛔ **déclassé — ne pas faire** |
| F-8 | `/reports` : 4 comptages → 1, projection JSON | −220 ms, −88 % d'octets | Moyenne | **S** | Faible | ✅ **livré (Lot 2)** |
| F-2 | Projection JSON de `companies.metadata` | **−99,2 % d'octets** | Haute | **S** | Faible | ✅ **livré (Lot 3)** |
| F-5 | `/cockpit` → filtre SQL + fenêtre de dates | **480 → 151 Ko** | **Page d'accueil** | **M** | Faible | ✅ **livré (Lot 3)** |
| F-1ab | Fiche compte : fusionner les doublons | **5 → 3 vagues, −50 % du temps** | Haute | **M** | Faible | ✅ **livré (Lot 3)** |
| F-10 | Essai d'un palier d'instance, mesuré | **inconnu — plancher de 108 ms/appel** | Toutes | **S** | Nul | **🔥 seul levier restant, à décider** |
| F-6a | Comptage contacts depuis la vue | **0** tant que F-6b n'est pas fait | Haute | **S** | Faible | 🔀 **fusionné dans F-6bc (Lot 5)** |
| F-7 | Hôtes de tiroirs conditionnels | **~4 Ko gzip (borne haute)** | Toutes | **M** | Moyen | ⛔ **invalidé — code reverté** |
| F-12 | `/missions/opps` : fusionner les 2 lectures | −100 ms | Moyenne | **M** | Faible | ⏸ **reporté — couple 2 loaders pour ~100 ms** |
| F-3b | `/veille` : 8 `select("*")` → colonnes | à mesurer | Moyenne | **S** | Faible | **11** |
| F-4b | Client Supabase partagé par requête | −80 à −180 ms/page | Toutes | **L** | Faible | 🟡 **amorcé au Lot 2** (`getRequestClient` exporté, 3 loaders convertis) — reste ~275 sites |
| F-6bc | Contacts par onglet + pagination | −500 Ko RSC | Haute | **XL** | Moyen | ⛔ **bloqué : l'onglet ne navigue pas** (voir F-6) |
| F-1c | Fiche compte : chargement par étape | ~−150 ms restants | Haute | **L/XL** | Moyen | ⏸ **non justifié** — la page est à 0,57 s |
| F-3c | `/veille` : socle de sources à l'ouverture | **−6 appels, −2 vagues, −107 Ko** | Moyenne | **M** | Faible | ✅ **livré (Lot 5)** |
| F-11 | `audit_log` : `diff` sans `metadata` + rétention | 0 ms perçu, −50 Mo | — | **M** | Faible | **16 — hygiène** |
| F-13 | Sortir supabase-js du bundle | **237 Ko / 18 % du socle** | Toutes | — | — | 🔒 **bloqué par un choix produit** (indicateur Realtime dans le shell) |

### À faible ROI — à ne pas faire

| Piste | Pourquoi |
|---|---|
| Ajouter des index | Aucun plan ne les demande ; le planning consomme déjà plus de buffers que l'exécution |
| Supprimer les 272 index « inutilisés » | Compteurs remis à zéro : donnée ininterprétable |
| Vues matérialisées | Tables de 100 à 850 lignes |
| Convertir des cascades en RPC | Le gain se capture en fusionnant des requêtes, sans déplacer de métier en SQL |
| `cacheComponents` / PPR | Écarté par [ADR-0017](../adr/ADR-0017-cache-components-ppr-refuse.md) et D-13 de l'ADR-0006 |
| Rouvrir le dispositif Realtime | Tranché par [ADR-0016](../adr/ADR-0016-realtime-notifications-cout-mesure.md) sur mesure |
| Paralléliser davantage les requêtes | Le pool PostgREST fait **10** connexions (F-10) |
| Cache serveur agressif | Masquerait F-1, F-5 et F-6 au lieu de les corriger — explicitement écarté par le cadrage |
