-- ============================================================
-- 020_enrich_mission_activity_reports (remote: 20260614074946)
-- Enrichissement du CRA : jours ouvrés / congés / maladie
-- + colonne GENERATED activity_rate_percent
-- ============================================================

ALTER TABLE public.mission_activity_reports
  ADD COLUMN IF NOT EXISTS business_days      numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pto_days           numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sick_days          numeric NOT NULL DEFAULT 0;

-- Colonne générée : taux d'activité = jours facturables / jours ouvrés
ALTER TABLE public.mission_activity_reports
  ADD COLUMN IF NOT EXISTS activity_rate_percent numeric
    GENERATED ALWAYS AS (
      ROUND((billable_days / NULLIF(business_days, 0)) * 100, 1)
    ) STORED;
