-- ADR-0010 Lot 4 — Active Supabase Realtime (postgres_changes) sur
-- user_notifications. Sans ça, aucun événement n'est émis quelle que soit la
-- RLS : la table doit être explicitement ajoutée à la publication
-- supabase_realtime (même nécessité déjà documentée pour
-- ai_intelligence_results, migration 20260702130000).
-- Nécessaire pour que NotificationBell.tsx reçoive en direct la notification
-- "weekly_brief_ready" créée par /api/n8n/callback lors d'un run cron.

alter publication supabase_realtime add table public.user_notifications;
