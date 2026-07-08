# account-watch-scheduler : import & configuration VPS

## 1. Ce que fait ce workflow

Équivalent du document `docs/n8n/INTEL-031-account-watch-scheduler.md`. Chaque
jour à 03:00 UTC : charge les comptes avec veille active (`is_enabled=true`) et
échue (`next_run_at` nul ou passé), crée une ligne `ai_intelligence_runs`
(`run_type='account_watch_refresh'`, `trigger_source='cron'`) par compte, appelle
le webhook `intel-033-account-watch-refresh` avec une signature HMAC, puis
reprogramme `next_run_at` selon `watch_level` (hot +1j / priority +3j /
standard +7j). Un échec incrémente `metadata.consecutive_failures` et désactive
la veille (`is_enabled=false`) au 5e échec consécutif (circuit breaker), sans
jamais bloquer la boucle sur les autres comptes.

## 2. Écart volontaire vs le nom du document source

Le document s'intitule "INTEL-031-account-watch-scheduler", mais **`intel-031`
est déjà pris** dans ce dépôt par `intel-031-issues-map.json` (ADR-0012 Lot 4,
sans rapport avec la veille compte). Ce workflow n'a pas besoin d'un id
`intel-0XX` : il n'est jamais appelé par Next.js (`N8nWorkflowId` ne le liste
pas), c'est un cron 100% interne à n8n qui appelle lui-même le webhook
`intel-033-account-watch-refresh`. D'où le nom neutre `account-watch-scheduler`,
qui évite toute collision.

## 3. Import

1. **Importer `intel-033-account-watch-refresh.json` en premier** — ce workflow
   appelle son webhook, donc il doit exister (au moins importé) avant.
2. n8n → **Workflows → Import from File** → `account-watch-scheduler.json`.
3. Ne pas activer tout de suite (`active: false` par défaut).
4. Credential Supabase déjà référencé (`Supabase_Service_Role_KREDO`), comme pour
   les autres workflows de ce dépôt.

## 4. Configuration requise

### 4.1 Secret HMAC (nœud Crypto)

`Sign Trigger Payload` contient le placeholder `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET`
— remplacer par la même valeur que `N8N_WEBHOOK_SECRET` côté Vercel.

### 4.2 URL du webhook interne (nœud "HTTP Request: Trigger Watch Refresh")

Ciblée en dur sur `http://localhost:5678/webhook/intel-033-account-watch-refresh`
— fonctionne si les deux workflows tournent sur la même instance n8n auto-hébergée
(appel interne, évite un aller-retour réseau externe inutile). **Adapter host:port
si votre setup diffère** (ex. `http://n8n:5678` en docker-compose avec un nom de
service différent, ou un port n8n non standard).

### 4.3 URL de callback KREDO (nœud "Build Webhook Payload")

Ciblée en dur sur `https://kredo-green.vercel.app/api/n8n/callback` — alias de
production documenté au moment de l'écriture (mémoire `vercel-prod-env-config`,
même caveat que `report-weekly-manager-cron.SETUP.md` §3.2). **Vérifier que cet
alias est toujours exact avant d'activer** — si le domaine de prod a changé,
mettre à jour l'URL dans le nœud.

### 4.4 Fuseau horaire du Schedule Trigger

Le nœud "Cron — Quotidien 03:00 UTC" utilise l'expression cron `0 3 * * *`. Comme
pour `report-weekly-manager-cron`, vérifier que l'instance n8n applique bien UTC
(le réglage `GENERIC_TIMEZONE` de l'instance peut primer sur l'attente du
workflow selon la version) — sinon le run partira à 03:00 heure locale du
serveur au lieu de 03:00 UTC.

## 5. Limite assumée : pas d'alerte Discord/Slack

La doc source (§5, Node 08) mentionne "poster une alerte Discord/Slack" quand le
circuit breaker se déclenche (5 échecs consécutifs). Aucun webhook Discord/Slack
n'est configuré dans ce projet — ajouter cette alerte aurait nécessité une URL
inventée qui aurait échoué à l'exécution. En V1, le circuit breaker désactive
silencieusement la veille (`is_enabled=false`, visible dans
`account_watch_settings.last_status='failed'` + `last_error`) ; ajouter un nœud
HTTP Request vers un vrai webhook Discord/Slack est trivial une fois l'URL
disponible (brancher après "Error Handler — Increment Failures", condition
`breaker === true`).

## 6. Test avant activation

1. Dans n8n, ouvrir le workflow → **Execute workflow** manuellement (ne pas
   attendre 03:00).
2. Vérifier que "Supabase: Load Active Watch Settings" retourne bien les comptes
   dont la veille est active dans KREDO (UI `/veille` ou équivalent).
3. Vérifier dans **Executions** que chaque itération de la boucle crée un run et
   déclenche `intel-033-account-watch-refresh` sans erreur (202 attendu).
4. Vérifier dans Supabase que `account_watch_settings.next_run_at` a bien avancé
   selon `watch_level` de chaque compte testé.
5. Forcer un échec (ex. couper temporairement `intel-033-account-watch-refresh`)
   et vérifier que `metadata.consecutive_failures` s'incrémente sans interrompre
   la boucle sur les comptes suivants.

## 7. Activation

Une fois le test §6 validé : activer `intel-033-account-watch-refresh.json`
(prérequis) puis ce workflow.
