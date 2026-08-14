-- Migration: 078_source_management_created_by_index
-- Cover source_catalog.created_by foreign key reported by Supabase Performance Advisor.

CREATE INDEX IF NOT EXISTS idx_source_catalog_created_by
  ON public.source_catalog(created_by)
  WHERE created_by IS NOT NULL;
