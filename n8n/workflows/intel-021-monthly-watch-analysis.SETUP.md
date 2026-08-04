# INTEL-021 — Analyse mensuelle de la veille

Le workflow analyse uniquement les lignes `veille_digests` et `veille_articles`
du mois civil précédent. Il n’effectue aucune collecte externe.

## Contrat

- Webhook stable : `intel-021-monthly-watch-analysis`
- `resultType` : `strategic_watch_analysis`
- déclenchement manuel : `/api/n8n/trigger`
- déclenchement planifié : le 2 de chaque mois à 06:00 (Europe/Paris), via
  `POST /api/veille/monthly-watch/cron`
- cycle : run Supabase → webhook n8n → callback signé → résultat → document
  versionné par période.

Le payload est le type `MonthlyWatchAnalysisInput` de `src/lib/n8n/types.ts`.
Les identifiants de digests et d’articles sont hydratés côté n8n avec les
credentials Supabase ; aucun texte intégral n’est transmis depuis le navigateur.

## Configuration avant activation

1. Importer le JSON dans n8n sans l’activer.
2. Remplacer les deux placeholders de secrets HMAC par les secrets déjà utilisés
   par la passerelle KREDO.
3. Affecter les credentials `supabaseApi` et `anthropicApi` aux nœuds concernés.
4. Définir `KREDO_APP_URL` et `N8N_CRON_SECRET` dans l’environnement n8n, et le
   même `N8N_CRON_SECRET` dans l’application.
5. Tester un run manuel, le callback, la création documentaire puis une relance
   sur la même période : la relance doit produire une nouvelle version du même
   document.
6. Vérifier les deux chemins de callback : succès et échec. Les sorties d’erreur
   des nœuds `continueErrorOutput` sont reliées au callback `status=failed`.

Le fichier est volontairement livré avec `active: false`. Aucun déploiement n8n
n’est réalisé par ce lot.
