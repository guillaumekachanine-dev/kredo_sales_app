-- Active Supabase Realtime (postgres_changes) sur ai_intelligence_results.
-- Sans ça, aucun événement n'est émis quelle que soit la RLS : la table doit
-- être explicitement ajoutée à la publication supabase_realtime.
-- Nécessaire pour que le front (subscription dans IntelligenceActionDrawers.tsx,
-- INTEL-020) reçoive le résultat dès que n8n l'écrit via /api/n8n/callback.

alter publication supabase_realtime add table public.ai_intelligence_results;
