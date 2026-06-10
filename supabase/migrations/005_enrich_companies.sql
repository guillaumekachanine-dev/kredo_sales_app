-- ============================================================
--  KREDO — Migration 005 : ENRICHIR LES COMPTES (companies)
--  Cible : PostgreSQL 17 / Supabase  —  Schéma : public
-- ============================================================

-- 1. Ajout des colonnes segment, revenue et employee_count
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS segment text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS revenue text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS employee_count integer;

-- 2. Recréation de la colonne size_band en colonne générée stockée
ALTER TABLE public.companies DROP COLUMN IF EXISTS size_band;
ALTER TABLE public.companies ADD COLUMN size_band text GENERATED ALWAYS AS (
  CASE
    WHEN employee_count IS NULL THEN NULL
    WHEN employee_count <= 20 THEN '1-20'
    WHEN employee_count <= 100 THEN '21-100'
    WHEN employee_count <= 500 THEN '101-500'
    WHEN employee_count <= 1000 THEN '501-1000'
    WHEN employee_count <= 5000 THEN '1001-5000'
    ELSE '+5k'
  END
) STORED;
