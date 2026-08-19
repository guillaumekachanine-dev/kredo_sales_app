# INTEL-021 — Analyse de la veille (Mensuelle V1 & À la demande V2)

Le workflow `intel-021-monthly-watch-analysis` prend en charge deux schémas :
1. **V1 Mensuelle historique** (`schemaVersion: 1`, `triggerMode: "manual" | "scheduled"`) : analyse les digests et articles du mois écoulé.
2. **V2 Analyse à la demande** (`schemaVersion: 2`, `triggerMode: "manual_custom"`) : analyse 1 à 3 groupes de sources (`veille_article`, `account_signal`, `intelligence_document`, `veille_digest`) guidée par une intention utilisateur.

Il n'effectue aucune collecte externe sur Internet.

## Contrats

- Webhook stable : `intel-021-monthly-watch-analysis`
- `resultType` : `strategic_watch_analysis`
- Déclenchement : via `/api/n8n/trigger`
- Déclenchement planifié V1 : le 2 de chaque mois à 06:00 (Europe/Paris), via `POST /api/veille/monthly-watch/cron`
- Cycle : run Supabase → webhook n8n → validation/hydratation → LLM → callback signé → résultat dans `ai_intelligence_results`.

Le payload est le type `MonthlyWatchAnalysisInput` (V1) ou l'enveloppe V2 dérivée de `WatchAnalysisInputV2` (V2) de `src/lib/n8n/types.ts`.
Toutes les données métier (articles, signaux, documents) sont revalidées et hydratées côté serveur / n8n avec les accès Supabase ; aucun contenu métier intégral n'est transmis par le navigateur.

## Configuration avant activation

1. Importer le JSON dans n8n sans l'activer.
2. Remplacer les placeholders de secrets HMAC (`REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` et `REMPLACE_PAR_TON_N8N_CALLBACK_SECRET`) par les secrets de la passerelle KREDO.
3. Affecter les credentials `supabaseApi` et `anthropicApi` aux nœuds concernés.
4. Définir `KREDO_APP_URL` et `N8N_CRON_SECRET` dans l'environnement n8n, et le même `N8N_CRON_SECRET` dans l'application.
5. Tester les deux chemins (V1 mensuelle et V2 à la demande) ainsi que les deux callbacks (succès et échec).
6. Les sorties d'erreur (`onError: "continueErrorOutput"`) sont reliées au callback d'échec `status=failed`.

Le fichier est livré avec `active: false`. Aucun déploiement n8n n'est réalisé automatiquement.
