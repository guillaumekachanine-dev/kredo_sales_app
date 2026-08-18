-- Migration: 088_source_collection_metrics
-- Lot 6 - Scoring V2 d'efficacité des sources

CREATE TABLE IF NOT EXISTS public.source_collection_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id() REFERENCES public.workspaces(id),
  source_catalog_id uuid NOT NULL REFERENCES public.source_catalog(id) ON DELETE CASCADE,
  corpus_id uuid NULL REFERENCES public.source_corpora(id) ON DELETE SET NULL,
  workflow_id text NOT NULL,
  workflow_run_key text NOT NULL,
  usage_scope text NOT NULL CHECK (usage_scope IN ('news', 'account_watch')),
  company_id uuid NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  query_succeeded boolean NOT NULL DEFAULT true,
  items_collected integer NOT NULL DEFAULT 0 CHECK (items_collected >= 0),
  items_after_dedup integer NOT NULL DEFAULT 0 CHECK (items_after_dedup >= 0),
  items_retained integer NOT NULL DEFAULT 0 CHECK (items_retained >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, workflow_run_key, source_catalog_id, usage_scope)
);

CREATE INDEX IF NOT EXISTS idx_source_collection_metrics_workspace_catalog ON public.source_collection_metrics(workspace_id, source_catalog_id);
CREATE INDEX IF NOT EXISTS idx_source_collection_metrics_created_at ON public.source_collection_metrics(created_at);

ALTER TABLE public.source_collection_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'source_collection_metrics' AND policyname = 'Enable read for workspace users'
  ) THEN
    CREATE POLICY "Enable read for workspace users" ON public.source_collection_metrics
      FOR SELECT TO authenticated
      USING (workspace_id = (select private.current_workspace_id()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'source_collection_metrics' AND policyname = 'Enable insert for workspace users'
  ) THEN
    CREATE POLICY "Enable insert for workspace users" ON public.source_collection_metrics
      FOR INSERT TO authenticated
      WITH CHECK (workspace_id = (select private.current_workspace_id()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'source_collection_metrics' AND policyname = 'Enable update for workspace users'
  ) THEN
    CREATE POLICY "Enable update for workspace users" ON public.source_collection_metrics
      FOR UPDATE TO authenticated
      USING (workspace_id = (select private.current_workspace_id()))
      WITH CHECK (workspace_id = (select private.current_workspace_id()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'source_collection_metrics' AND policyname = 'Enable delete for workspace users'
  ) THEN
    CREATE POLICY "Enable delete for workspace users" ON public.source_collection_metrics
      FOR DELETE TO authenticated
      USING (workspace_id = (select private.current_workspace_id()));
  END IF;
END $$;

CREATE OR REPLACE VIEW public.v_source_effectiveness_30d WITH (security_invoker = true) AS
SELECT
  workspace_id,
  source_catalog_id,
  COUNT(*)::integer AS observations,
  COUNT(*) FILTER (WHERE query_succeeded = true)::integer AS successful_observations,
  COUNT(*) FILTER (WHERE items_retained > 0)::integer AS productive_observations,
  COALESCE(SUM(items_collected), 0)::integer AS items_collected,
  COALESCE(SUM(items_after_dedup), 0)::integer AS items_after_dedup,
  COALESCE(SUM(items_retained), 0)::integer AS items_retained,
  ROUND((COUNT(*) FILTER (WHERE query_succeeded = true)::numeric / COUNT(*)), 4) AS reliability_rate,
  ROUND((COUNT(*) FILTER (WHERE items_retained > 0)::numeric / COUNT(*)), 4) AS productive_run_rate,
  ROUND(COALESCE(SUM(items_retained)::numeric / NULLIF(SUM(items_after_dedup), 0), 0), 4) AS retention_rate,
  CASE
    WHEN COUNT(*) < 3 THEN NULL
    ELSE ROUND((
      0.25 * (COUNT(*) FILTER (WHERE query_succeeded = true)::numeric / COUNT(*)) +
      0.50 * (COUNT(*) FILTER (WHERE items_retained > 0)::numeric / COUNT(*)) +
      0.25 * COALESCE(SUM(items_retained)::numeric / NULLIF(SUM(items_after_dedup), 0), 0)
    ) * 100)::integer
  END AS effectiveness_score
FROM public.source_collection_metrics
WHERE created_at >= (NOW() - INTERVAL '30 days')
GROUP BY workspace_id, source_catalog_id;
