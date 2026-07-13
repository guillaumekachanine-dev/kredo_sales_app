-- ============================================================================
-- AI Cost Monitoring — Lot 0 (cron du reaper)
-- ============================================================================
-- Isolé dans sa propre migration : create extension pg_cron peut échouer selon
-- les droits du rôle exécutant sur certains plans Supabase — on ne veut pas
-- que ça bloque la fondation (table de prix + vues) de la migration précédente.
--
-- Auparavant, reap_stale_intelligence_runs (ops-004) existait mais n'était
-- câblée sur aucun cron (documenté depuis la Session 22 ADR-0012 Lot 0).
-- Exécution manuelle le 2026-07-13 : 10 runs zombies repris (5 intel-010-refresh
-- running, 1 queued, 4 account_watch_refresh running) — confirme que le
-- problème était réel, pas seulement théorique.
--
-- pg_cron tourne DANS Postgres, pas via n8n — pas besoin d'importer/activer
-- quoi que ce soit sur le VPS pour ce lot.
-- ============================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'reap-stale-intelligence-runs',
  '*/10 * * * *',
  $$select public.reap_stale_intelligence_runs(15, 30)$$
);
