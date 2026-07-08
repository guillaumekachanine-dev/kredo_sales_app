-- ============================================================
-- Account-specific watch settings
-- Minimal data foundation for configuring a dedicated veille per account.
-- Does not create sources, raw staging tables, or workflow logic.
-- ============================================================

BEGIN;

CREATE TABLE public.account_watch_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL
    REFERENCES public.companies(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  watch_level text NOT NULL DEFAULT 'standard',
  cadence text NOT NULL DEFAULT 'weekly',
  include_official_site boolean NOT NULL DEFAULT true,
  include_news boolean NOT NULL DEFAULT true,
  include_jobs boolean NOT NULL DEFAULT true,
  include_public_records boolean NOT NULL DEFAULT false,
  include_tenders boolean NOT NULL DEFAULT false,
  include_social_manual boolean NOT NULL DEFAULT true,
  query_aliases text[] NOT NULL DEFAULT '{}',
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_watch_settings_workspace_company_key
    UNIQUE (workspace_id, company_id),
  CONSTRAINT account_watch_settings_watch_level_check
    CHECK (watch_level = ANY (ARRAY['standard'::text, 'priority'::text, 'hot'::text])),
  CONSTRAINT account_watch_settings_cadence_check
    CHECK (cadence = ANY (ARRAY['weekly'::text, 'twice_weekly'::text, 'daily'::text])),
  CONSTRAINT account_watch_settings_last_status_check
    CHECK (
      last_status IS NULL
      OR last_status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text])
    )
);

COMMENT ON TABLE public.account_watch_settings IS
  'Configuration minimale de veille spécifique par compte. Porte uniquement le cadrage et l’état d’exécution du dernier run, sans stocker les sources ni les résultats bruts.';

CREATE INDEX idx_account_watch_settings_company_id
  ON public.account_watch_settings (company_id);

CREATE OR REPLACE FUNCTION private.validate_account_watch_setting()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_company_workspace uuid;
BEGIN
  SELECT workspace_id INTO v_company_workspace
  FROM public.companies
  WHERE id = NEW.company_id;

  IF v_company_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid account watch setting company: %', NEW.company_id;
  END IF;

  IF NEW.workspace_id <> v_company_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between account watch setting and company';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_account_watch_settings_updated_at ON public.account_watch_settings;
CREATE TRIGGER trg_account_watch_settings_updated_at
  BEFORE UPDATE ON public.account_watch_settings
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_validate_account_watch_settings ON public.account_watch_settings;
CREATE TRIGGER trg_validate_account_watch_settings
  BEFORE INSERT OR UPDATE ON public.account_watch_settings
  FOR EACH ROW EXECUTE FUNCTION private.validate_account_watch_setting();

DROP TRIGGER IF EXISTS trg_audit_account_watch_settings ON public.account_watch_settings;
CREATE TRIGGER trg_audit_account_watch_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.account_watch_settings
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

ALTER TABLE public.account_watch_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_watch_settings_select ON public.account_watch_settings
  FOR SELECT TO authenticated
  USING (workspace_id = (select private.current_workspace_id()));

CREATE POLICY account_watch_settings_insert ON public.account_watch_settings
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = (select private.current_workspace_id()));

CREATE POLICY account_watch_settings_update ON public.account_watch_settings
  FOR UPDATE TO authenticated
  USING (workspace_id = (select private.current_workspace_id()))
  WITH CHECK (workspace_id = (select private.current_workspace_id()));

CREATE POLICY account_watch_settings_delete ON public.account_watch_settings
  FOR DELETE TO authenticated
  USING (workspace_id = (select private.current_workspace_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_watch_settings TO authenticated;
GRANT ALL ON public.account_watch_settings TO service_role;

COMMIT;
