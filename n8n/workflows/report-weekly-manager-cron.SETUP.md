# ADR-0010 Lot 4 — report-weekly-manager-cron : import & configuration VPS

## 1. Ce que fait ce workflow

Contrairement à `report-weekly-manager.json` (rédaction du brief, déclenché
soit par un clic utilisateur soit par ce cron), `report-weekly-manager-cron.json`
ne rédige rien lui-même : il se contente de sonner **chaque lundi 07:00
(Europe/Paris)** et d'appeler `/api/reports/weekly-manager/cron-trigger`, qui :

1. Liste tous les profils (`profiles`, tous workspaces confondus — en V1, un
   seul workspace existe réellement).
2. Pour chacun, calcule la semaine ISO en cours et appelle
   `getWeeklyManagerBrief()` (périmètre personnel, `isWorkspaceWide: false`).
3. Déclenche un run `report-weekly-manager` par profil, avec
   `triggerSource: "cron"` — cette marque distingue le run d'un déclenchement
   manuel : `/api/n8n/callback` ne crée une notification (`user_notifications`)
   que pour les runs `trigger_source = "cron"`, jamais pour un clic manuel
   (déjà visible en Realtime dans le drawer ouvert par l'utilisateur).

Un échec sur un profil (agenda indisponible, RPC en erreur, etc.) n'interrompt
jamais la boucle — voir le commentaire en tête de
`src/app/api/reports/weekly-manager/cron-trigger/route.ts`. Le lundi suivant
retentera naturellement, aucune notification d'échec n'est envoyée en V1.

## 2. Import

1. n8n → **Workflows → Import from File** → sélectionner `report-weekly-manager-cron.json`.
2. Ne pas activer tout de suite (`active: false` par défaut).

## 3. Configuration requise

### 3.1 Secret HMAC (nœud Crypto)

Le nœud **"Sign Request"** contient le placeholder `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET`
— remplacer par la même valeur que `N8N_WEBHOOK_SECRET` côté Vercel (déjà
configurée pour les autres workflows REPORT-001, copier le même secret).

### 3.2 URL de l'app

Le nœud **"Call Cron Trigger"** cible en dur `https://kredo-green.vercel.app/api/reports/weekly-manager/cron-trigger`
— c'est l'alias de production documenté au moment de l'écriture de ce
workflow (`vercel-prod-env-config`, projet `kredo`, scope
`guillaume-kasanins-projects`). **Vérifier que cet alias est toujours exact
avant d'activer** — si le domaine de prod a changé, mettre à jour l'URL dans
le nœud (ou basculer sur une expression `{{ $env.KREDO_APP_URL }}` si une
variable d'environnement dédiée est préférée sur le VPS).

### 3.3 Fuseau horaire du Schedule Trigger

`settings.timezone` est réglé sur `Europe/Paris` dans le JSON, et le nœud
"Schedule — Lundi 07:00" utilise l'expression cron `0 7 * * 1`. Vérifier que
l'instance n8n respecte bien ce fuseau (certaines installations n8n imposent
le fuseau serveur au niveau global via `GENERIC_TIMEZONE`, qui prime parfois
sur le réglage au niveau du workflow selon la version) — sinon le brief
partira à 07:00 UTC au lieu de 07:00 Europe/Paris.

## 4. Test avant activation

1. Dans n8n, ouvrir le workflow → **Execute workflow** manuellement (ne pas
   attendre lundi).
2. Vérifier dans **Executions** que les 4 nœuds s'exécutent sans erreur et
   que "Call Cron Trigger" reçoit un `200` avec un JSON `{ triggered, failed, results }`.
3. Vérifier dans Supabase que `ai_intelligence_runs` contient une nouvelle
   ligne par profil avec `trigger_source = 'cron'`.
4. Attendre la fin d'exécution de `report-weekly-manager` (celui-ci doit déjà
   être actif — voir `report-weekly-manager.SETUP.md`) puis vérifier
   `user_notifications` : une ligne `notification_type = 'weekly_brief_ready'`
   par profil, avec `deep_link` pointant vers `/reports?doc=...`.
5. Se connecter à Kredo avec le compte du profil testé → la cloche du header
   doit afficher un badge non-lu et lister la notification.

## 5. Activation

Une fois le test §4 validé de bout en bout : activer `report-weekly-manager`
(prérequis) puis ce workflow (toggle en haut à droite de l'écran n8n).

## 6. Non fait dans cette session (Lot 4)

- Notification en cas d'échec cron (V1 : silencieux, log serveur uniquement).
- Cloche de notification sur la vue mobile (uniquement câblée dans `AppHeader.tsx`,
  desktop — la navigation mobile utilise `IntelligenceFAB`, pas ce header).
- Filtre "profils actifs" — la boucle couvre tous les profils sans notion de
  statut (aucune colonne de ce type n'existe sur `profiles` aujourd'hui).
