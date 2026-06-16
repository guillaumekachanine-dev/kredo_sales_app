-- Lot 1 — socle intelligence MVP
-- Crée les tables minimales d'intelligence métier sans appliquer
-- automatiquement de données CRM ni introduire de logique de workflow.

BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS knowledge_state text NOT NULL DEFAULT 'native';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_knowledge_state_check'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies DROP CONSTRAINT companies_knowledge_state_check;
  END IF;
END $$;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_knowledge_state_check
  CHECK (knowledge_state = ANY (ARRAY['legacy'::text, 'hybrid'::text, 'native'::text]));

UPDATE public.companies
SET knowledge_state = 'legacy'
WHERE knowledge_state = 'native'
  AND metadata ?| ARRAY['analysis_data', 'sector_analysis', 'pitches', 'contact_stats'];

CREATE TABLE IF NOT EXISTS public.intelligence_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_name text NOT NULL,
  source_url text,
  canonical_url text,
  external_reference text,
  published_at timestamptz,
  collected_at timestamptz NOT NULL DEFAULT now(),
  content_hash text,
  source_key text NOT NULL,
  evidence_excerpt text,
  reliability_score numeric(4,3) NOT NULL DEFAULT 0.500,
  collection_method text NOT NULL,
  technical_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intelligence_sources_source_type_check
    CHECK (
      source_type = ANY (
        ARRAY[
          'official_site'::text,
          'press_release'::text,
          'job_board'::text,
          'professional_profile'::text,
          'regulatory_filing'::text,
          'news_media'::text,
          'public_tender'::text,
          'internal_crm'::text,
          'folio_legacy'::text,
          'human_note'::text,
          'other'::text
        ]
      )
    ),
  CONSTRAINT intelligence_sources_collection_method_check
    CHECK (
      collection_method = ANY (
        ARRAY[
          'manual'::text,
          'api'::text,
          'scrape'::text,
          'import'::text,
          'llm_extraction'::text,
          'human_entry'::text,
          'system_sync'::text
        ]
      )
    ),
  CONSTRAINT intelligence_sources_reliability_score_check
    CHECK (reliability_score >= 0 AND reliability_score <= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS intelligence_sources_workspace_source_key_key
  ON public.intelligence_sources (workspace_id, source_key);

CREATE INDEX IF NOT EXISTS intelligence_sources_workspace_id_idx
  ON public.intelligence_sources (workspace_id);

CREATE INDEX IF NOT EXISTS intelligence_sources_canonical_url_idx
  ON public.intelligence_sources (canonical_url)
  WHERE canonical_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS intelligence_sources_published_at_idx
  ON public.intelligence_sources (workspace_id, published_at DESC)
  WHERE published_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.enrichment_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  attribute_name text NOT NULL,
  attribute_subkey text,
  old_value jsonb,
  proposed_value jsonb NOT NULL,
  normalized_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_value_hash text NOT NULL,
  initial_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  primary_source_id uuid
    REFERENCES public.intelligence_sources(id) ON DELETE SET NULL,
  origin text NOT NULL,
  confidence_score numeric(4,3) NOT NULL DEFAULT 0.500,
  justification text,
  status text NOT NULL DEFAULT 'proposed',
  run_id uuid
    REFERENCES public.ai_intelligence_runs(id) ON DELETE SET NULL,
  requested_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_at timestamptz,
  applied_at timestamptz,
  decision_reason text,
  proposal_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrichment_proposals_target_type_check
    CHECK (target_type = ANY (ARRAY['company'::text, 'contact'::text, 'person'::text])),
  CONSTRAINT enrichment_proposals_origin_check
    CHECK (origin = ANY (ARRAY['folio'::text, 'native'::text, 'external'::text, 'human'::text, 'system'::text])),
  CONSTRAINT enrichment_proposals_status_check
    CHECK (
      status = ANY (
        ARRAY[
          'proposed'::text,
          'needs_review'::text,
          'conflicting'::text,
          'validated'::text,
          'rejected'::text,
          'outdated'::text,
          'applied'::text
        ]
      )
    ),
  CONSTRAINT enrichment_proposals_confidence_score_check
    CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX IF NOT EXISTS enrichment_proposals_workspace_target_idx
  ON public.enrichment_proposals (workspace_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS enrichment_proposals_status_idx
  ON public.enrichment_proposals (workspace_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS enrichment_proposals_active_key_uniq
  ON public.enrichment_proposals (workspace_id, proposal_key)
  WHERE status = ANY (ARRAY['proposed'::text, 'needs_review'::text, 'conflicting'::text, 'validated'::text]);

CREATE TABLE IF NOT EXISTS public.account_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  fact_type text NOT NULL,
  fact_subtype text,
  cardinality text NOT NULL,
  value_text text,
  value_json jsonb,
  normalized_value text NOT NULL,
  normalized_value_hash text NOT NULL,
  origin text NOT NULL,
  confidence_score numeric(4,3) NOT NULL DEFAULT 1.000,
  primary_source_id uuid
    REFERENCES public.intelligence_sources(id) ON DELETE SET NULL,
  source_proposal_id uuid
    REFERENCES public.enrichment_proposals(id) ON DELETE SET NULL,
  effective_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_facts_target_type_check
    CHECK (target_type = ANY (ARRAY['company'::text, 'contact'::text, 'person'::text])),
  CONSTRAINT account_facts_cardinality_check
    CHECK (cardinality = ANY (ARRAY['single'::text, 'multi'::text])),
  CONSTRAINT account_facts_origin_check
    CHECK (origin = ANY (ARRAY['folio'::text, 'native'::text, 'external'::text, 'human'::text, 'system'::text])),
  CONSTRAINT account_facts_confidence_score_check
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT account_facts_value_presence_check
    CHECK (value_text IS NOT NULL OR value_json IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS account_facts_workspace_target_idx
  ON public.account_facts (workspace_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS account_facts_fact_type_idx
  ON public.account_facts (workspace_id, fact_type, fact_subtype);

CREATE INDEX IF NOT EXISTS account_facts_current_idx
  ON public.account_facts (workspace_id, target_type, target_id, is_current);

CREATE UNIQUE INDEX IF NOT EXISTS account_facts_current_single_uniq
  ON public.account_facts (
    workspace_id,
    target_type,
    target_id,
    fact_type,
    COALESCE(fact_subtype, '')
  )
  WHERE is_current = true
    AND cardinality = 'single';

CREATE UNIQUE INDEX IF NOT EXISTS account_facts_current_multi_uniq
  ON public.account_facts (
    workspace_id,
    target_type,
    target_id,
    fact_type,
    COALESCE(fact_subtype, ''),
    normalized_value_hash
  )
  WHERE is_current = true
    AND cardinality = 'multi';

CREATE TABLE IF NOT EXISTS public.account_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL
    REFERENCES public.companies(id) ON DELETE CASCADE,
  signal_category text NOT NULL,
  signal_type text NOT NULL,
  title text NOT NULL,
  summary text,
  event_at timestamptz,
  detected_at timestamptz NOT NULL DEFAULT now(),
  last_evidence_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  dedupe_key text NOT NULL,
  confidence_score numeric(4,3) NOT NULL DEFAULT 0.000,
  relevance_score numeric(4,3) NOT NULL DEFAULT 0.000,
  urgency_score numeric(4,3) NOT NULL DEFAULT 0.000,
  potential_value_score numeric(4,3) NOT NULL DEFAULT 0.000,
  global_score numeric(4,3) NOT NULL DEFAULT 0.000,
  score_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_justification text,
  taxonomy_version text NOT NULL DEFAULT 'mvp-v1',
  scoring_rules_version text NOT NULL DEFAULT 'mvp-v1',
  recommended_action text,
  recommended_practice_id uuid
    REFERENCES public.offer_practices(id) ON DELETE SET NULL,
  suggested_contact_id uuid
    REFERENCES public.contacts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new',
  run_id uuid
    REFERENCES public.ai_intelligence_runs(id) ON DELETE SET NULL,
  primary_source_id uuid
    REFERENCES public.intelligence_sources(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_signals_status_check
    CHECK (
      status = ANY (
        ARRAY[
          'new'::text,
          'qualified'::text,
          'needs_review'::text,
          'actionable'::text,
          'actioned'::text,
          'dismissed'::text,
          'false_positive'::text,
          'expired'::text,
          'archived'::text
        ]
      )
    ),
  CONSTRAINT account_signals_confidence_score_check
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT account_signals_relevance_score_check
    CHECK (relevance_score >= 0 AND relevance_score <= 1),
  CONSTRAINT account_signals_urgency_score_check
    CHECK (urgency_score >= 0 AND urgency_score <= 1),
  CONSTRAINT account_signals_potential_value_score_check
    CHECK (potential_value_score >= 0 AND potential_value_score <= 1),
  CONSTRAINT account_signals_global_score_check
    CHECK (global_score >= 0 AND global_score <= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS account_signals_workspace_dedupe_key_uniq
  ON public.account_signals (workspace_id, dedupe_key);

CREATE INDEX IF NOT EXISTS account_signals_company_status_idx
  ON public.account_signals (workspace_id, company_id, status, detected_at DESC);

CREATE INDEX IF NOT EXISTS account_signals_signal_type_idx
  ON public.account_signals (workspace_id, signal_type, event_at DESC);

CREATE TABLE IF NOT EXISTS public.intelligence_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL
    REFERENCES public.intelligence_sources(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  link_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intelligence_source_links_object_type_check
    CHECK (object_type = ANY (ARRAY['proposal'::text, 'fact'::text, 'signal'::text])),
  CONSTRAINT intelligence_source_links_link_role_check
    CHECK (link_role = ANY (ARRAY['supporting'::text, 'contradicting'::text, 'context'::text]))
);

CREATE UNIQUE INDEX IF NOT EXISTS intelligence_source_links_source_object_role_uniq
  ON public.intelligence_source_links (source_id, object_type, object_id, link_role);

CREATE INDEX IF NOT EXISTS intelligence_source_links_object_idx
  ON public.intelligence_source_links (workspace_id, object_type, object_id);

CREATE OR REPLACE FUNCTION private.resolve_intelligence_object_workspace(
  p_object_type text,
  p_object_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  CASE p_object_type
    WHEN 'company' THEN
      SELECT workspace_id INTO v_workspace_id
      FROM public.companies
      WHERE id = p_object_id;
    WHEN 'contact' THEN
      SELECT workspace_id INTO v_workspace_id
      FROM public.contacts
      WHERE id = p_object_id;
    WHEN 'person' THEN
      SELECT workspace_id INTO v_workspace_id
      FROM public.persons
      WHERE id = p_object_id;
    WHEN 'proposal' THEN
      SELECT workspace_id INTO v_workspace_id
      FROM public.enrichment_proposals
      WHERE id = p_object_id;
    WHEN 'fact' THEN
      SELECT workspace_id INTO v_workspace_id
      FROM public.account_facts
      WHERE id = p_object_id;
    WHEN 'signal' THEN
      SELECT workspace_id INTO v_workspace_id
      FROM public.account_signals
      WHERE id = p_object_id;
    ELSE
      v_workspace_id := NULL;
  END CASE;

  RETURN v_workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_enrichment_proposal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_target_workspace uuid;
  v_source_workspace uuid;
  v_run_workspace uuid;
BEGIN
  v_target_workspace := private.resolve_intelligence_object_workspace(NEW.target_type, NEW.target_id);

  IF v_target_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid enrichment proposal target: %:%', NEW.target_type, NEW.target_id;
  END IF;

  IF NEW.workspace_id <> v_target_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between proposal and target';
  END IF;

  IF NEW.primary_source_id IS NOT NULL THEN
    SELECT workspace_id INTO v_source_workspace
    FROM public.intelligence_sources
    WHERE id = NEW.primary_source_id;

    IF v_source_workspace IS NULL OR v_source_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Workspace mismatch between proposal and primary source';
    END IF;
  END IF;

  IF NEW.run_id IS NOT NULL THEN
    SELECT workspace_id INTO v_run_workspace
    FROM public.ai_intelligence_runs
    WHERE id = NEW.run_id;

    IF v_run_workspace IS NULL OR v_run_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Workspace mismatch between proposal and run';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_account_fact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_target_workspace uuid;
  v_source_workspace uuid;
  v_proposal_workspace uuid;
BEGIN
  v_target_workspace := private.resolve_intelligence_object_workspace(NEW.target_type, NEW.target_id);

  IF v_target_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid account fact target: %:%', NEW.target_type, NEW.target_id;
  END IF;

  IF NEW.workspace_id <> v_target_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between fact and target';
  END IF;

  IF NEW.primary_source_id IS NOT NULL THEN
    SELECT workspace_id INTO v_source_workspace
    FROM public.intelligence_sources
    WHERE id = NEW.primary_source_id;

    IF v_source_workspace IS NULL OR v_source_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Workspace mismatch between fact and primary source';
    END IF;
  END IF;

  IF NEW.source_proposal_id IS NOT NULL THEN
    SELECT workspace_id INTO v_proposal_workspace
    FROM public.enrichment_proposals
    WHERE id = NEW.source_proposal_id;

    IF v_proposal_workspace IS NULL OR v_proposal_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Workspace mismatch between fact and source proposal';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_account_signal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_company_workspace uuid;
  v_source_workspace uuid;
  v_run_workspace uuid;
  v_practice_workspace uuid;
  v_contact_workspace uuid;
BEGIN
  SELECT workspace_id INTO v_company_workspace
  FROM public.companies
  WHERE id = NEW.company_id;

  IF v_company_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid signal company: %', NEW.company_id;
  END IF;

  IF NEW.workspace_id <> v_company_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between signal and company';
  END IF;

  IF NEW.primary_source_id IS NOT NULL THEN
    SELECT workspace_id INTO v_source_workspace
    FROM public.intelligence_sources
    WHERE id = NEW.primary_source_id;

    IF v_source_workspace IS NULL OR v_source_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Workspace mismatch between signal and primary source';
    END IF;
  END IF;

  IF NEW.run_id IS NOT NULL THEN
    SELECT workspace_id INTO v_run_workspace
    FROM public.ai_intelligence_runs
    WHERE id = NEW.run_id;

    IF v_run_workspace IS NULL OR v_run_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Workspace mismatch between signal and run';
    END IF;
  END IF;

  IF NEW.recommended_practice_id IS NOT NULL THEN
    SELECT workspace_id INTO v_practice_workspace
    FROM public.offer_practices
    WHERE id = NEW.recommended_practice_id;

    IF v_practice_workspace IS NULL OR v_practice_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Workspace mismatch between signal and recommended practice';
    END IF;
  END IF;

  IF NEW.suggested_contact_id IS NOT NULL THEN
    SELECT workspace_id INTO v_contact_workspace
    FROM public.contacts
    WHERE id = NEW.suggested_contact_id;

    IF v_contact_workspace IS NULL OR v_contact_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Workspace mismatch between signal and suggested contact';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_intelligence_source_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_source_workspace uuid;
  v_object_workspace uuid;
BEGIN
  SELECT workspace_id INTO v_source_workspace
  FROM public.intelligence_sources
  WHERE id = NEW.source_id;

  IF v_source_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid intelligence source: %', NEW.source_id;
  END IF;

  v_object_workspace := private.resolve_intelligence_object_workspace(NEW.object_type, NEW.object_id);

  IF v_object_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid intelligence link target: %:%', NEW.object_type, NEW.object_id;
  END IF;

  IF NEW.workspace_id <> v_source_workspace OR NEW.workspace_id <> v_object_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between source link, source and object';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_intelligence_sources_updated_at ON public.intelligence_sources;
CREATE TRIGGER trg_intelligence_sources_updated_at
  BEFORE UPDATE ON public.intelligence_sources
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_enrichment_proposals_updated_at ON public.enrichment_proposals;
CREATE TRIGGER trg_enrichment_proposals_updated_at
  BEFORE UPDATE ON public.enrichment_proposals
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_account_facts_updated_at ON public.account_facts;
CREATE TRIGGER trg_account_facts_updated_at
  BEFORE UPDATE ON public.account_facts
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_account_signals_updated_at ON public.account_signals;
CREATE TRIGGER trg_account_signals_updated_at
  BEFORE UPDATE ON public.account_signals
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_validate_enrichment_proposals ON public.enrichment_proposals;
CREATE TRIGGER trg_validate_enrichment_proposals
  BEFORE INSERT OR UPDATE ON public.enrichment_proposals
  FOR EACH ROW EXECUTE FUNCTION private.validate_enrichment_proposal();

DROP TRIGGER IF EXISTS trg_validate_account_facts ON public.account_facts;
CREATE TRIGGER trg_validate_account_facts
  BEFORE INSERT OR UPDATE ON public.account_facts
  FOR EACH ROW EXECUTE FUNCTION private.validate_account_fact();

DROP TRIGGER IF EXISTS trg_validate_account_signals ON public.account_signals;
CREATE TRIGGER trg_validate_account_signals
  BEFORE INSERT OR UPDATE ON public.account_signals
  FOR EACH ROW EXECUTE FUNCTION private.validate_account_signal();

DROP TRIGGER IF EXISTS trg_validate_intelligence_source_links ON public.intelligence_source_links;
CREATE TRIGGER trg_validate_intelligence_source_links
  BEFORE INSERT OR UPDATE ON public.intelligence_source_links
  FOR EACH ROW EXECUTE FUNCTION private.validate_intelligence_source_link();

DROP TRIGGER IF EXISTS trg_audit_intelligence_sources ON public.intelligence_sources;
CREATE TRIGGER trg_audit_intelligence_sources
  AFTER INSERT OR UPDATE OR DELETE ON public.intelligence_sources
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

DROP TRIGGER IF EXISTS trg_audit_enrichment_proposals ON public.enrichment_proposals;
CREATE TRIGGER trg_audit_enrichment_proposals
  AFTER INSERT OR UPDATE OR DELETE ON public.enrichment_proposals
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

DROP TRIGGER IF EXISTS trg_audit_account_facts ON public.account_facts;
CREATE TRIGGER trg_audit_account_facts
  AFTER INSERT OR UPDATE OR DELETE ON public.account_facts
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

DROP TRIGGER IF EXISTS trg_audit_account_signals ON public.account_signals;
CREATE TRIGGER trg_audit_account_signals
  AFTER INSERT OR UPDATE OR DELETE ON public.account_signals
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

DROP TRIGGER IF EXISTS trg_audit_intelligence_source_links ON public.intelligence_source_links;
CREATE TRIGGER trg_audit_intelligence_source_links
  AFTER INSERT OR UPDATE OR DELETE ON public.intelligence_source_links
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

ALTER TABLE public.intelligence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_source_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intelligence_sources_select ON public.intelligence_sources;
CREATE POLICY intelligence_sources_select ON public.intelligence_sources
  FOR SELECT TO authenticated
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS enrichment_proposals_select ON public.enrichment_proposals;
CREATE POLICY enrichment_proposals_select ON public.enrichment_proposals
  FOR SELECT TO authenticated
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS account_facts_select ON public.account_facts;
CREATE POLICY account_facts_select ON public.account_facts
  FOR SELECT TO authenticated
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS account_signals_select ON public.account_signals;
CREATE POLICY account_signals_select ON public.account_signals
  FOR SELECT TO authenticated
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS intelligence_source_links_select ON public.intelligence_source_links;
CREATE POLICY intelligence_source_links_select ON public.intelligence_source_links
  FOR SELECT TO authenticated
  USING (workspace_id = private.current_workspace_id());

GRANT SELECT ON public.intelligence_sources TO authenticated;
GRANT SELECT ON public.enrichment_proposals TO authenticated;
GRANT SELECT ON public.account_facts TO authenticated;
GRANT SELECT ON public.account_signals TO authenticated;
GRANT SELECT ON public.intelligence_source_links TO authenticated;

GRANT ALL ON public.intelligence_sources TO service_role;
GRANT ALL ON public.enrichment_proposals TO service_role;
GRANT ALL ON public.account_facts TO service_role;
GRANT ALL ON public.account_signals TO service_role;
GRANT ALL ON public.intelligence_source_links TO service_role;

COMMIT;
