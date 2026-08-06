# INTEL-033 — account-watch-refresh : import & configuration VPS

## 1. Ce que fait ce workflow

Déclenché par webhook (path `intel-033-account-watch-refresh`), ce workflow
exécute la veille ciblée sur UN compte : il charge le compte + les signaux déjà
connus, collecte jusqu'à 5 sources (site officiel, presse, emploi, annonces
légales, marchés publics), déduplique, qualifie/score les éléments par LLM, écrit
`intelligence_sources` + `account_signals` + `intelligence_source_links`, met à
jour `account_watch_settings`, puis notifie KREDO via callback signé.

Deux appelants existants : le bouton "Mettre à jour maintenant" (route
`src/app/api/intelligence/accounts/[companyId]/watch-refresh/route.ts`, déjà en
prod) et le nouveau workflow `account-watch-scheduler.json` (cron quotidien).

## 2. Écart corrigé vs la doc `docs/n8n/INTEL-030-account-watch-refresh.md`

Le document source utilise le préfixe "INTEL-030" (et une fois "INTEL-033") et un
en-tête `x-n8n-signature`. Le code déjà livré côté Next.js
(`src/lib/n8n/types.ts`, `client.ts`, la route `watch-refresh`) utilise en réalité
l'id **`intel-033-account-watch-refresh`** et l'en-tête **`x-kredo-signature`**
(convention HMAC déjà en place sur tous les workflows REPORT-001/INTEL-020/030-032).
Ce workflow suit le code réel, pas le nom de fichier de la doc — sinon le bouton
"Mettre à jour maintenant" existant n'aurait jamais pu l'atteindre.

## 3. Import

1. n8n → **Workflows → Import from File** → `intel-033-account-watch-refresh.json`.
2. Ne pas activer tout de suite (`active: false` par défaut).
3. Les credentials Supabase (`Supabase_Service_Role_KREDO`, id `GBrm2aWU0dDf85QS`)
   et Anthropic (`Anthropic API (KREDO)`, id `MERo2FsyLlNgDQXh`) sont référencées
   telles quelles — elles existent déjà sur cette instance (mêmes ids que
   `KREDO — Veille Hebdomadaire IA & Marché.json`), aucune resélection normalement
   nécessaire. Si l'import affiche un credential manquant malgré tout, resélectionner
   le credential existant du même nom dans chaque nœud concerné.

## 4. Configuration requise

### 4.1 Secret HMAC (2 nœuds Crypto)

`Verify Signature` et `Sign Callback` / `Sign Failure Callback` contiennent le
placeholder `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` — remplacer par la même valeur
que `N8N_WEBHOOK_SECRET` côté Vercel (déjà configurée pour les workflows
REPORT-001/INTEL-020/030-032, copier le même secret).

### 4.2 Webhook

Le nœud `Webhook — Account Watch Refresh` doit être accessible à l'URL
`{N8N_WEBHOOK_BASE_URL}/webhook/intel-033-account-watch-refresh` — c'est
exactement l'URL que `callN8nWebhook()` construit côté Next.js à partir de la
variable d'environnement Vercel `N8N_WEBHOOK_BASE_URL`. Vérifier qu'elle pointe
bien vers cette instance n8n avant d'activer.

## 5. Limites assumées (à connaître avant d'activer)

- **Sources Pappers/BOAMP/France Travail non branchées** : aucune clé API n'existe
  pour ces API tierces dans ce projet. Les collecteurs "Emploi", "Annonces
  légales" et "Marchés publics" utilisent Google News RSS (recherche mot-clé)
  comme proxy fonctionnel et sans credentials — c'est un choix délibéré pour livrer
  un workflow qui marche dès l'import plutôt qu'un appel à une API inexistante.
  `reliability_score` de ces sources est calibré en conséquence (0.6–0.7, pas
  1.0 comme une vraie API BOAMP). Pour brancher une vraie API plus tard, il suffit
  de remplacer l'URL du nœud `Collect: ...` concerné — la suite du pipeline
  (normalisation, dédup, scoring, écriture DB) ne change pas.
- **Site officiel** : extraction best-effort par regex sur la homepage (pas de
  vraie API "newsroom"). Résultats faibles sur des sites qui ne linkent pas
  clairement leurs actualités depuis la homepage — acceptable car géré par les
  règles §10 (source inaccessible → on passe à la suivante).
- **`account_watch_settings` (Node 05 de la doc) n'est pas rechargée séparément** :
  le payload entrant transporte déjà les settings fraîchement lus par l'appelant
  (route manuelle ou scheduler) — relire la même table dans ce workflow serait une
  requête redondante sans bénéfice réel.
- **Aucun PATCH direct de `ai_intelligence_runs` vers succeeded/failed** : ce
  workflow ne fait que le passage à `running`. La transition finale est gérée par
  `/api/n8n/callback` (`updateRunStatus`) au moment où il reçoit le callback signé
  — c'est le pattern déjà utilisé par tous les workflows `report-*`/`intel-030..032`
  existants dans ce dépôt, on ne le réinvente pas ici.

## 6. Test avant activation

1. Dans n8n, copier l'URL du webhook (mode "Listen for test event" ou après
   activation temporaire).
2. Déclencher manuellement le bouton "Mettre à jour maintenant" sur un compte de
   test dans KREDO (ou `curl` direct avec un payload signé).
3. Vérifier dans **Executions** que le run va jusqu'au callback sans erreur.
4. Vérifier dans Supabase : `account_signals` contient de nouvelles lignes pour
   ce compte, chacune avec un `primary_source_id` non nul et un
   `intelligence_source_links` correspondant.
5. Rejouer le même run (mêmes items) et vérifier qu'aucun doublon n'est créé
   (idempotence via `ON CONFLICT (workspace_id, dedupe_key)` / `(workspace_id,
   source_key)`, résolution `ignore-duplicates`).
6. Vérifier que `account_watch_settings.last_status` passe à `succeeded` et que
   le cockpit KREDO reflète le run (Realtime sur `ai_intelligence_runs`).

## 7. Activation

Une fois le test §6 validé de bout en bout : activer ce workflow (toggle en haut
à droite). Il peut être activé indépendamment de `account-watch-scheduler.json`
(le bouton manuel fonctionne seul).

## 8. Correctif 2026-08-04 — arrêt silencieux de la chaîne (à réimporter)

**Symptôme observé en production** : exécution marquée `succeeded` en ~1,7 s,
qui s'arrêtait sur `Collect: Public Records` sans erreur ; aucun signal écrit,
aucun callback émis, run laissé en `running` jusqu'au reaper ops-004
(9 runs `failed` par reprise, 0 signal `account_watch_*` en base).

**Cause racine** : n8n n'exécute pas un nœud qui reçoit 0 item. Le flux Google
News « annonces légales » renvoie un canal vide pour la plupart des comptes
(vérifié : `Robertet` → news 100 items, jobs 47, **public records 0**, tenders 1),
donc `Collect: Public Records` sortait 0 item et toute la suite du workflow était
sautée en silence. Rien n'ayant levé d'erreur, l'exécution était comptée en succès.
C'est le même piège que celui déjà corrigé sur `intel-010-refresh` (Session 23).

**Corrections apportées :**

1. `alwaysOutputData: true` sur les 5 collecteurs (`Collect: *`) et les 4 nœuds
   d'écriture/lecture Supabase de la partie basse — un collecteur vide émet
   désormais un item vide, la chaîne continue.
2. Trois branches de garde explicites, pour qu'un run sans matière se termine
   proprement au lieu de s'interrompre plus loin :
   - `IF — Has Items to Qualify?` → si 0 élément, `Skip Qualification` court-circuite
     l'appel LLM (**zéro token dépensé** pour qualifier une liste vide) ;
   - `IF — Has Signals to Write?` → saute toute la séquence d'écriture Supabase
     (un `POST` PostgREST avec un tableau vide ne renvoie aucun item et
     rebloquait la chaîne) ;
   - `IF — Has Source Links?` → idem pour `intelligence_source_links`.
3. Nouveau pivot stable `Finalize Run Summary` : seul point de convergence des
   branches, lu par `Prepare Callback` et `Update Watch Settings -> Succeeded`.
   Ces deux nœuds référençaient `Map Signals to Sources`, qui peut ne pas être
   exécuté — la référence aurait levé.
4. `Build Source Links Payload` renvoie désormais **un seul item** porteur du
   tableau (`linksPayload` / `linksCount`) : un Code node qui renvoie `[]` n'émet
   aucun item et stoppait la chaîne au même titre qu'un collecteur vide.
5. `modelProvider`/`modelUsed`/`tokens*` valent `null` quand aucun appel LLM n'a
   eu lieu, au lieu d'un modèle fantôme jamais sollicité (cohérent avec le
   correctif `intel-010-refresh` de la Session 24, qui alimente `v_ai_*_costs`).
6. Bug de scoring corrigé au passage : `noisySourcesCapped` comparait un nombre
   de sources à un nombre d'items (`bySource.size !== capped.length`) et était
   donc quasi toujours `true` à tort ; il est maintenant positionné uniquement
   quand une source dépasse réellement le plafond de 20 signaux.
7. `Build Sources Payload` et `Map Signals to Sources` reçoivent
   `onError: continueErrorOutput` : leur sortie erreur était câblée vers
   `Prepare Failure Callback` mais jamais armée.

**Action requise** : réimporter le JSON à jour sur le VPS et réactiver. Aucune
nouvelle credential ni variable d'environnement.

**Limite connue non traitée** : les collecteurs désactivés dans `settings`
(`includePublicRecords`/`includeTenders` à `false` par défaut) déclenchent quand
même la requête HTTP avant que le nœud `Shape+Accumulate` ne jette le résultat.
C'est du gaspillage de latence, pas un bug — laissé en l'état pour ne pas
alourdir la topologie de deux `IF` supplémentaires.

## 9. Optimisation 2026-08-04 — rendement de la collecte (même import que §8)

Le premier run réparé a révélé un second défaut, indépendant de l'arrêt silencieux :
`itemsCollectedTotal: 147` → `itemsAfterDedup: 40` → **`signalsCreated: 5`**, avec
`noisySourcesCapped: true`.

**Cause** : la règle anti-bruit §10 (« si une source dépasse 20 signaux sur un run,
n'en garder que les 5 meilleurs ») groupait sur `sourceType::sourceName`, or les
5 collecteurs passent tous par Google News. Tous les articles tombaient donc dans
un seul groupe et la règle jetait ~87 % de la collecte à chaque run. Google News
est un **agrégateur**, pas une source : ses URL pointent toutes vers
`news.google.com` et son libellé masquait l'éditeur réel.

**Corrections :**

1. **Éditeur réel rétabli** (`Shape+Accumulate: *`) : lecture de `item.source`
   quand le parser RSS l'expose, sinon extraction du suffixe `« Titre - Éditeur »`
   que Google News ajoute systématiquement (vérifié 100/100 sur le flux réel).
   `source_name` porte désormais `Les Echos`, `Tribuca.net`… au lieu de
   `Google News`, le titre est nettoyé de son suffixe redondant, et le collecteur
   d'origine est tracé dans `intelligence_sources.technical_metadata.collectedVia`.
2. **Cap anti-bruit groupé sur l'éditeur réel** — un média qui inonde reste bridé,
   les 19 autres passent. Sur Robertet, le maximum réel par éditeur est de 4 : la
   règle ne se déclenche plus du tout, ce qui est le comportement attendu.
3. **Budget LLM réparti en tourniquet** (`Normalize & Dedup Items`) : le plafond
   de 40 candidats était consommé par ordre de collecte, donc saturé par la
   centaine d'actualités — les signaux recrutement et appels d'offres, les plus
   actionnables pour une ESN, n'étaient jamais qualifiés. Chaque collecteur est
   désormais servi à tour de rôle, par fraîcheur décroissante.
4. **Éléments de plus de 120 jours écartés** : au-delà, `freshness()` vaut déjà 0,
   l'item consommait du budget LLM sans pouvoir peser dans le score. Un item sans
   date reste conservé (fraîcheur moyenne).
5. **Déduplication douce par titre normalisé** : une même dépêche reprise à
   l'identique par plusieurs éditeurs ne crée plus qu'un signal. Comparaison sur
   titre exact normalisé seulement — deux angles différents restent deux signaux.
6. **Homonymie traitée** : la recherche par nom ramène des éléments qui ne parlent
   pas de l'entreprise (le « Prix Robertet » est une course hippique — 9 items sur
   40 dans le run testé). Le prompt demande explicitement de noter ces cas à 0 sur
   les trois axes, et `Compute Scores & Apply Rules` ne les écrit plus en base.
   Seuil très conservateur : il faut être nul sur `pertinence_esn` **et**
   `fit_practice` **et** `urgence`. Le compte est remonté dans le callback
   (`contentJson.rejectedOffTopic`).

**Résultat mesuré** (rejeu des 4 flux RSS réels de Robertet, 148 éléments) :
148 collectés → 40 qualifiés → 9 hors sujet écartés → **31 signaux écrits sur
19 éditeurs distincts**, contre 5 auparavant. Aucun appel LLM supplémentaire :
le plafond de 40 candidats par run est inchangé, donc le coût par run l'est aussi.

**Limite constatée, non corrigée** : le collecteur « recrutement » via Google News
est peu productif — 45 de ses 47 résultats ont plus de 120 jours et sont écartés
par le filtre de fraîcheur. Obtenir de vrais signaux d'embauche demanderait une
source dédiée (API job board), hors périmètre de ce correctif.

## 10. Retrait du collecteur « recrutement » (2026-08-04)

Mesuré sur le flux réel : **45 des 47 résultats** du collecteur emploi avaient plus
de 120 jours et étaient écartés par le filtre de fraîcheur ; les 21 restants étaient
déjà remontés par le collecteur actualités. Rejeu avec et sans lui : **31 signaux
dans les deux cas**. Il ne produisait rien, tout en coûtant un appel réseau par run.

- Nœuds `Collect: Job Board Signals` et `Shape+Accumulate: Job Board` supprimés
  (40 nœuds au lieu de 42) ; `Shape+Accumulate: News Media` enchaîne directement
  sur `Collect: Public Records`, dont la référence de contexte amont a été
  repointée en conséquence.
- `includeJobs` retiré de `Validate Payload`, du contrat `AccountWatchRefreshSettings`
  (`src/lib/n8n/types.ts`), des réglages (`account-watch-settings.ts`), du mapping
  (`intelligence-data.ts`), des `select` PostgREST et de la liste de sources
  affichée dans le cockpit (`client-intelligence-home.ts` — le toggle « Offres
  d'emploi » ne pilotait plus rien).
- `job_board` retiré de `RELIABILITY_BY_SOURCE_TYPE` (aucun signal de ce type n'a
  jamais été écrit en base — vérifié).
- **La colonne `account_watch_settings.include_jobs` est conservée** : aucune
  migration destructive pour un champ qui resservirait tel quel le jour où une
  vraie source d'offres (API job board) sera branchée. Elle n'est simplement plus
  lue ni exposée.

## 11. Rafraîchissement de la fiche compte (2026-08-04)

`src/app/api/n8n/callback/route.ts` appelle désormais
`revalidatePath('/prospection/accounts/{companyId}')` sur tout run réussi rattaché
à un compte. Sans cela, la fiche — un Server Component — n'affichait les nouveaux
signaux qu'après un rechargement manuel : la veille écrit des lignes
`account_signals` mais ne produit aucun document, donc rien ne transite par le
Realtime auquel les drawers sont abonnés. L'appel est encapsulé dans un `try/catch`
non bloquant : à ce stade le callback a déjà tout persisté, un échec d'invalidation
ne doit pas renvoyer 500 à n8n, qui rejouerait le callback.

## 12. Correctif 2026-08-07 — gardes explicites et versioning

**Incident de référence** : Compte Ciffreo Bona (`b7c8dd96-358d-4fec-a0bf-4b9bbc213f6c`), exécution n8n `83111` arrêtée à `Collect: Tenders`. KREDO n'a reçu aucun callback, le run `c14f77fa-3530-4c79-84a7-537ae4547d12` est resté en `running` puis reclassé `failed` par ops-004.

**Cause** : Même avec `alwaysOutputData: true`, un collecteur optionnel (ex. Public Records) désactivé dans les réglages KREDO retournait 0 item, ce qui stoppait silencieusement la chaîne avant d'atteindre le collecteur suivant (ex. Tenders).

**Corrections apportées :**
1. **Gardes explicites (IF)** : Ajout de nœuds `IF — Include Public Records?` et `IF — Include Tenders?`. Un collecteur désactivé est purement ignoré et son contexte passe directement au nœud suivant sans aucun appel réseau.
2. **Comportement attendu 0 signal** : Si un run aboutit à 0 item qualifié, le `Finalize Run Summary` converge correctement. Il produit un callback de succès contenant `signalsCreated: 0`, et met à jour `account_watch_settings` avec `last_status = succeeded`. Le run ne meurt plus silencieusement.
3. **Convergence centralisée** : `Finalize Run Summary` est l'unique source de vérité lue par les deux nœuds aval (`Update Watch Settings -> Succeeded` et `Prepare Callback`). 
4. **Traçabilité de version** : La version du workflow (`2026-08-07.1`) est émise dans le callback et stockée dans `ai_intelligence_runs.config`.
