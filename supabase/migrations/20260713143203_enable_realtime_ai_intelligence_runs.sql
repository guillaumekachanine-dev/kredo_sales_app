-- Monitoring IA Lot 1 : le journal d'exécution live (/automations) a besoin de
-- Realtime sur les transitions de statut de run (queued→running→succeeded/failed),
-- pas seulement sur les résultats. Même pattern que les migrations précédentes
-- (enable_realtime_ai_intelligence_results, enable_realtime_user_notifications).
--
-- Effet de bord positif : AccountScanDialog.tsx souscrit déjà à des événements
-- UPDATE sur ai_intelligence_runs (filter id=eq.<runId>) qui ne pouvaient jamais
-- se déclencher tant que la table n'était pas dans la publication — son fallback
-- de relecture à 20s masquait le problème. Cette migration corrige ça aussi.
alter publication supabase_realtime add table public.ai_intelligence_runs;
