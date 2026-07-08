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
