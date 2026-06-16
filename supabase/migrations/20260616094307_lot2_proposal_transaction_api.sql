-- Lot 2 — API transactionnelle de traitement des propositions
-- Ce lot introduit :
-- 1. une surface RPC réduite pour décider et appliquer des propositions ;
-- 2. la gestion explicite de la concurrence ;
-- 3. la publication atomique vers les colonnes CRM autorisées ou account_facts.

BEGIN;

ALTER TABLE public.enrichment_proposals
  ADD COLUMN IF NOT EXISTS applied_by uuid,
  ADD COLUMN IF NOT EXISTS application_error text,
  ADD COLUMN IF NOT EXISTS application_conflict jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'enrichment_proposals_applied_by_fkey'
      AND conrelid = 'public.enrichment_proposals'::regclass
  ) THEN
    ALTER TABLE public.enrichment_proposals
      ADD CONSTRAINT enrichment_proposals_applied_by_fkey
      FOREIGN KEY (applied_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'proposal_operation_result'
  ) THEN
    CREATE TYPE public.proposal_operation_result AS (
      proposal_id uuid,
      status text,
      operation text,
      target_type text,
      target_id uuid,
      target_field text,
      fact_id uuid,
      previous_value jsonb,
      applied_value jsonb,
      conflict jsonb,
      message text
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.require_authenticated_user()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'permission_denied',
      DETAIL = 'An authenticated user is required to process an enrichment proposal.';
  END IF;

  RETURN v_actor_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.require_current_workspace()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  v_workspace_id := private.current_workspace_id();

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'workspace_not_found',
      DETAIL = 'The authenticated user is not attached to a current workspace.';
  END IF;

  RETURN v_workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.proposal_expected_value(
  p_old_value jsonb,
  p_initial_snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_old_value IS NOT NULL THEN
    RETURN p_old_value;
  END IF;

  IF p_initial_snapshot IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(p_initial_snapshot) = 'object' AND p_initial_snapshot ? 'current' THEN
    RETURN COALESCE(p_initial_snapshot -> 'current', 'null'::jsonb);
  END IF;

  IF p_initial_snapshot <> '{}'::jsonb THEN
    RETURN p_initial_snapshot;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.proposal_application_payload(
  p_proposed_value jsonb,
  p_normalized_value jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN p_normalized_value IS NOT NULL AND p_normalized_value <> '{}'::jsonb THEN p_normalized_value
    ELSE p_proposed_value
  END;
$$;

CREATE OR REPLACE FUNCTION private.jsonb_nullable_text(p_value text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(to_jsonb(p_value), 'null'::jsonb);
$$;

CREATE OR REPLACE FUNCTION private.jsonb_nullable_integer(p_value integer)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(to_jsonb(p_value), 'null'::jsonb);
$$;

CREATE OR REPLACE FUNCTION private.normalize_text_value(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT NULLIF(regexp_replace(lower(btrim(p_value)), '\s+', ' ', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION private.extract_text_value(
  p_payload jsonb,
  p_nullable boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_source jsonb;
  v_value text;
BEGIN
  IF p_payload IS NULL OR p_payload = 'null'::jsonb THEN
    IF p_nullable THEN
      RETURN NULL;
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = 'A non-null text value is required.';
  END IF;

  CASE jsonb_typeof(p_payload)
    WHEN 'string' THEN
      v_value := btrim(p_payload #>> '{}');
    WHEN 'object' THEN
      IF p_payload ? 'value' THEN
        v_source := p_payload -> 'value';
      ELSIF p_payload ? 'text' THEN
        v_source := p_payload -> 'text';
      ELSE
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'invalid_value',
          DETAIL = 'Expected object payload with a text field named value or text.';
      END IF;

      IF v_source IS NULL OR v_source = 'null'::jsonb THEN
        v_value := NULL;
      ELSIF jsonb_typeof(v_source) = 'string' THEN
        v_value := btrim(v_source #>> '{}');
      ELSE
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'invalid_value',
          DETAIL = 'Expected a string payload.';
      END IF;
    ELSE
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'invalid_value',
        DETAIL = 'Expected a scalar string or an object payload.';
  END CASE;

  IF v_value IS NOT NULL AND v_value = '' THEN
    v_value := NULL;
  END IF;

  IF v_value IS NULL AND NOT p_nullable THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = 'A non-null text value is required.';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION private.extract_integer_value(
  p_payload jsonb,
  p_nullable boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_source jsonb;
  v_text text;
BEGIN
  IF p_payload IS NULL OR p_payload = 'null'::jsonb THEN
    IF p_nullable THEN
      RETURN NULL;
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = 'A non-null integer value is required.';
  END IF;

  CASE jsonb_typeof(p_payload)
    WHEN 'number' THEN
      v_text := p_payload #>> '{}';
    WHEN 'string' THEN
      v_text := btrim(p_payload #>> '{}');
    WHEN 'object' THEN
      IF p_payload ? 'value' THEN
        v_source := p_payload -> 'value';
      ELSIF p_payload ? 'integer' THEN
        v_source := p_payload -> 'integer';
      ELSE
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'invalid_value',
          DETAIL = 'Expected object payload with an integer field named value or integer.';
      END IF;

      IF v_source IS NULL OR v_source = 'null'::jsonb THEN
        v_text := NULL;
      ELSIF jsonb_typeof(v_source) IN ('number', 'string') THEN
        v_text := btrim(v_source #>> '{}');
      ELSE
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'invalid_value',
          DETAIL = 'Expected an integer payload.';
      END IF;
    ELSE
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'invalid_value',
        DETAIL = 'Expected a scalar integer or an object payload.';
  END CASE;

  IF v_text IS NULL OR v_text = '' THEN
    IF p_nullable THEN
      RETURN NULL;
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = 'A non-null integer value is required.';
  END IF;

  IF v_text !~ '^-?[0-9]+$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = format('Expected an integer-compatible value, got "%s".', v_text);
  END IF;

  RETURN v_text::integer;
END;
$$;

CREATE OR REPLACE FUNCTION private.extract_allowed_text_value(
  p_payload jsonb,
  p_allowed_values text[],
  p_nullable boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_value text;
BEGIN
  v_value := private.extract_text_value(p_payload, p_nullable);

  IF v_value IS NOT NULL AND NOT (v_value = ANY (p_allowed_values)) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = format('Value "%s" is not allowed for this attribute.', v_value);
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION private.crm_attribute_is_allowed(
  p_target_type text,
  p_attribute_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN p_target_type = 'company' AND p_attribute_name = ANY (
      ARRAY['description', 'website', 'hq_location', 'sector', 'employee_count', 'revenue']
    ) THEN true
    WHEN p_target_type = 'contact' AND p_attribute_name = ANY (
      ARRAY['job_title', 'department', 'relationship_role']
    ) THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION private.fact_attribute_definition(
  p_attribute_name text,
  OUT fact_type text,
  OUT fact_subtype text,
  OUT cardinality text
)
RETURNS record
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  CASE p_attribute_name
    WHEN 'business_model' THEN
      fact_type := 'business_model';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'primary_activity' THEN
      fact_type := 'primary_activity';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'technology' THEN
      fact_type := 'technology';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'competitor' THEN
      fact_type := 'competitor';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'partner' THEN
      fact_type := 'partner';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'market' THEN
      fact_type := 'market';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'strategic_priority' THEN
      fact_type := 'strategic_priority';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'transformation_program' THEN
      fact_type := 'transformation_program';
      fact_subtype := NULL;
      cardinality := 'multi';
    ELSE
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'attribute_not_allowed',
        DETAIL = format('Attribute "%s" is not supported by the MVP application API.', p_attribute_name);
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION private.copy_proposal_links_to_fact(
  p_proposal_id uuid,
  p_fact_id uuid,
  p_workspace_id uuid,
  p_primary_source_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.intelligence_source_links (
    workspace_id,
    source_id,
    object_type,
    object_id,
    link_role
  )
  SELECT
    p_workspace_id,
    isl.source_id,
    'fact',
    p_fact_id,
    isl.link_role
  FROM public.intelligence_source_links isl
  WHERE isl.workspace_id = p_workspace_id
    AND isl.object_type = 'proposal'
    AND isl.object_id = p_proposal_id
    AND (p_primary_source_id IS NULL OR isl.source_id <> p_primary_source_id)
  ON CONFLICT (source_id, object_type, object_id, link_role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION private.make_proposal_result(
  p_proposal_id uuid,
  p_status text,
  p_operation text,
  p_target_type text,
  p_target_id uuid,
  p_target_field text,
  p_fact_id uuid,
  p_previous_value jsonb,
  p_applied_value jsonb,
  p_conflict jsonb,
  p_message text
)
RETURNS public.proposal_operation_result
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT (
    p_proposal_id,
    p_status,
    p_operation,
    p_target_type,
    p_target_id,
    p_target_field,
    p_fact_id,
    p_previous_value,
    p_applied_value,
    p_conflict,
    p_message
  )::public.proposal_operation_result;
$$;

CREATE OR REPLACE FUNCTION private.perform_proposal_decision(
  p_proposal_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
)
RETURNS public.proposal_operation_result
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id uuid;
  v_workspace_id uuid;
  v_proposal public.enrichment_proposals%ROWTYPE;
  v_existing_workspace uuid;
BEGIN
  IF p_decision NOT IN ('validated', 'rejected') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_decision',
      DETAIL = 'The decision must be either validated or rejected.';
  END IF;

  v_actor_id := private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();

  SELECT workspace_id
  INTO v_existing_workspace
  FROM public.enrichment_proposals
  WHERE id = p_proposal_id;

  IF v_existing_workspace IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'proposal_not_found',
      DETAIL = format('Proposal %s does not exist.', p_proposal_id);
  END IF;

  IF v_existing_workspace <> v_workspace_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'wrong_workspace',
      DETAIL = 'The proposal does not belong to the current workspace.';
  END IF;

  SELECT *
  INTO v_proposal
  FROM public.enrichment_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF v_proposal.status IN ('validated', 'rejected') THEN
    IF v_proposal.status = p_decision THEN
      RETURN private.make_proposal_result(
        v_proposal.id,
        v_proposal.status,
        CASE WHEN p_decision = 'validated' THEN 'already_validated' ELSE 'already_rejected' END,
        v_proposal.target_type,
        v_proposal.target_id,
        v_proposal.attribute_name,
        NULL,
        v_proposal.old_value,
        NULL,
        v_proposal.application_conflict,
        'The proposal was already decided with the same outcome.'
      );
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'decision_conflict',
      DETAIL = format('Proposal %s is already %s and cannot be changed to %s.', v_proposal.id, v_proposal.status, p_decision);
  END IF;

  IF v_proposal.status IN ('applied', 'outdated') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_status',
      DETAIL = format('Proposal %s is in terminal status %s.', v_proposal.id, v_proposal.status);
  END IF;

  IF v_proposal.status NOT IN ('proposed', 'needs_review', 'conflicting') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_status',
      DETAIL = format('Proposal %s cannot be decided from status %s.', v_proposal.id, v_proposal.status);
  END IF;

  UPDATE public.enrichment_proposals
  SET status = p_decision,
      decided_by = v_actor_id,
      decision_at = now(),
      decision_reason = p_reason,
      application_error = CASE WHEN p_decision = 'validated' THEN NULL ELSE application_error END,
      application_conflict = CASE WHEN p_decision = 'validated' THEN NULL ELSE application_conflict END
  WHERE id = v_proposal.id;

  v_proposal.status := p_decision;
  v_proposal.decided_by := v_actor_id;
  v_proposal.decision_at := now();
  v_proposal.decision_reason := p_reason;

  RETURN private.make_proposal_result(
    v_proposal.id,
    v_proposal.status,
    p_decision,
    v_proposal.target_type,
    v_proposal.target_id,
    v_proposal.attribute_name,
    NULL,
    v_proposal.old_value,
    NULL,
    NULL,
    CASE WHEN p_decision = 'validated' THEN 'Proposal validated.' ELSE 'Proposal rejected.' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.perform_proposal_apply(
  p_proposal_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.proposal_operation_result
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id uuid;
  v_workspace_id uuid;
  v_proposal public.enrichment_proposals%ROWTYPE;
  v_existing_workspace uuid;
  v_payload jsonb;
  v_expected jsonb;
  v_current jsonb;
  v_applied jsonb;
  v_conflict jsonb;
  v_company public.companies%ROWTYPE;
  v_contact public.contacts%ROWTYPE;
  v_target_workspace uuid;
  v_text_value text;
  v_int_value integer;
  v_fact_type text;
  v_fact_subtype text;
  v_cardinality text;
  v_fact public.account_facts%ROWTYPE;
  v_fact_current public.account_facts%ROWTYPE;
  v_fact_id uuid;
  v_expected_text text;
  v_expected_norm text;
  v_proposed_norm text;
BEGIN
  v_actor_id := private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();

  SELECT workspace_id
  INTO v_existing_workspace
  FROM public.enrichment_proposals
  WHERE id = p_proposal_id;

  IF v_existing_workspace IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'proposal_not_found',
      DETAIL = format('Proposal %s does not exist.', p_proposal_id);
  END IF;

  IF v_existing_workspace <> v_workspace_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'wrong_workspace',
      DETAIL = 'The proposal does not belong to the current workspace.';
  END IF;

  SELECT *
  INTO v_proposal
  FROM public.enrichment_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF v_proposal.status = 'applied' THEN
    -- Vérification idempotente ci-dessous.
    NULL;
  ELSIF v_proposal.status <> 'validated' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_status',
      DETAIL = format('Proposal %s must be validated before application. Current status: %s.', v_proposal.id, v_proposal.status);
  END IF;

  v_payload := private.proposal_application_payload(v_proposal.proposed_value, v_proposal.normalized_value);
  v_expected := private.proposal_expected_value(v_proposal.old_value, v_proposal.initial_snapshot);
  v_target_workspace := private.resolve_intelligence_object_workspace(v_proposal.target_type, v_proposal.target_id);

  IF v_target_workspace IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'target_not_found',
      DETAIL = 'The proposal target no longer exists.';
  END IF;

  IF v_target_workspace <> v_workspace_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'wrong_workspace',
      DETAIL = 'The proposal target does not belong to the current workspace.';
  END IF;

  IF private.crm_attribute_is_allowed(v_proposal.target_type, v_proposal.attribute_name) THEN
    IF v_proposal.target_type = 'company' THEN
      SELECT *
      INTO v_company
      FROM public.companies
      WHERE id = v_proposal.target_id
      FOR UPDATE;

      CASE v_proposal.attribute_name
        WHEN 'description' THEN
          v_text_value := private.extract_text_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.description);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'website' THEN
          v_text_value := private.extract_text_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.website);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'hq_location' THEN
          v_text_value := private.extract_text_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.hq_location);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'sector' THEN
          v_text_value := private.extract_text_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.sector);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'employee_count' THEN
          v_int_value := private.extract_integer_value(v_payload, true);
          v_current := private.jsonb_nullable_integer(v_company.employee_count);
          v_applied := private.jsonb_nullable_integer(v_int_value);
        WHEN 'revenue' THEN
          v_text_value := private.extract_text_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.revenue);
          v_applied := private.jsonb_nullable_text(v_text_value);
        ELSE
          RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'attribute_not_allowed',
            DETAIL = format('Attribute %s is not supported.', v_proposal.attribute_name);
      END CASE;

      IF v_expected IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'proposal_snapshot_missing',
          DETAIL = 'The proposal does not contain a usable initial snapshot for concurrency checks.';
      END IF;

      IF v_current = v_expected THEN
        UPDATE public.companies
        SET description = CASE WHEN v_proposal.attribute_name = 'description' THEN v_text_value ELSE description END,
            website = CASE WHEN v_proposal.attribute_name = 'website' THEN v_text_value ELSE website END,
            hq_location = CASE WHEN v_proposal.attribute_name = 'hq_location' THEN v_text_value ELSE hq_location END,
            sector = CASE WHEN v_proposal.attribute_name = 'sector' THEN v_text_value ELSE sector END,
            employee_count = CASE WHEN v_proposal.attribute_name = 'employee_count' THEN v_int_value ELSE employee_count END,
            revenue = CASE WHEN v_proposal.attribute_name = 'revenue' THEN v_text_value ELSE revenue END
        WHERE id = v_company.id;
      ELSIF v_current = v_applied THEN
        NULL;
      ELSE
        v_conflict := jsonb_build_object(
          'expectedValue', v_expected,
          'currentValue', v_current,
          'proposedValue', v_applied,
          'reason', 'concurrent_change_detected'
        );

        UPDATE public.enrichment_proposals
        SET status = 'conflicting',
            application_error = 'concurrent_change_detected',
            application_conflict = v_conflict
        WHERE id = v_proposal.id;

        RETURN private.make_proposal_result(
          v_proposal.id,
          'conflicting',
          'conflicting',
          v_proposal.target_type,
          v_proposal.target_id,
          v_proposal.attribute_name,
          NULL,
          v_expected,
          v_applied,
          v_conflict,
          'The target value changed concurrently and no longer matches the initial snapshot.'
        );
      END IF;
    ELSIF v_proposal.target_type = 'contact' THEN
      SELECT *
      INTO v_contact
      FROM public.contacts
      WHERE id = v_proposal.target_id
      FOR UPDATE;

      CASE v_proposal.attribute_name
        WHEN 'job_title' THEN
          v_text_value := private.extract_text_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_contact.job_title);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'department' THEN
          v_text_value := private.extract_allowed_text_value(
            v_payload,
            ARRAY[
              'general_management', 'sales', 'it', 'technical', 'it_operations',
              'cloud_devops', 'cybersecurity', 'data_bi', 'ai_innovation',
              'digital_transformation', 'procurement', 'business_unit', 'other'
            ],
            true
          );
          v_current := private.jsonb_nullable_text(v_contact.department);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'relationship_role' THEN
          v_text_value := private.extract_allowed_text_value(
            v_payload,
            ARRAY[
              'decideur', 'prescripteur', 'acheteur', 'operationnel', 'sponsor',
              'utilisateur_final', 'rh', 'manager_technique', 'dsi', 'direction_metier'
            ],
            true
          );
          v_current := private.jsonb_nullable_text(v_contact.relationship_role);
          v_applied := private.jsonb_nullable_text(v_text_value);
        ELSE
          RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'attribute_not_allowed',
            DETAIL = format('Attribute %s is not supported.', v_proposal.attribute_name);
      END CASE;

      IF v_expected IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'proposal_snapshot_missing',
          DETAIL = 'The proposal does not contain a usable initial snapshot for concurrency checks.';
      END IF;

      IF v_current = v_expected THEN
        UPDATE public.contacts
        SET job_title = CASE WHEN v_proposal.attribute_name = 'job_title' THEN v_text_value ELSE job_title END,
            department = CASE WHEN v_proposal.attribute_name = 'department' THEN v_text_value ELSE department END,
            relationship_role = CASE WHEN v_proposal.attribute_name = 'relationship_role' THEN v_text_value ELSE relationship_role END
        WHERE id = v_contact.id;
      ELSIF v_current = v_applied THEN
        NULL;
      ELSE
        v_conflict := jsonb_build_object(
          'expectedValue', v_expected,
          'currentValue', v_current,
          'proposedValue', v_applied,
          'reason', 'concurrent_change_detected'
        );

        UPDATE public.enrichment_proposals
        SET status = 'conflicting',
            application_error = 'concurrent_change_detected',
            application_conflict = v_conflict
        WHERE id = v_proposal.id;

        RETURN private.make_proposal_result(
          v_proposal.id,
          'conflicting',
          'conflicting',
          v_proposal.target_type,
          v_proposal.target_id,
          v_proposal.attribute_name,
          NULL,
          v_expected,
          v_applied,
          v_conflict,
          'The target value changed concurrently and no longer matches the initial snapshot.'
        );
      END IF;
    ELSE
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'attribute_not_allowed',
        DETAIL = format('Target type %s is not supported for CRM application.', v_proposal.target_type);
    END IF;

    UPDATE public.enrichment_proposals
    SET status = 'applied',
        applied_at = COALESCE(applied_at, now()),
        applied_by = COALESCE(applied_by, v_actor_id),
        application_error = NULL,
        application_conflict = NULL,
        decision_reason = COALESCE(p_reason, decision_reason)
    WHERE id = v_proposal.id;

    RETURN private.make_proposal_result(
      v_proposal.id,
      'applied',
      CASE WHEN v_proposal.status = 'applied' THEN 'already_applied' ELSE 'applied' END,
      v_proposal.target_type,
      v_proposal.target_id,
      v_proposal.attribute_name,
      NULL,
      v_current,
      v_applied,
      NULL,
      CASE WHEN v_proposal.status = 'applied'
        THEN 'The proposal had already been applied and the target value is still consistent.'
        ELSE 'The proposal has been applied to the CRM target.'
      END
    );
  END IF;

  SELECT fact_type, fact_subtype, cardinality
  INTO v_fact_type, v_fact_subtype, v_cardinality
  FROM private.fact_attribute_definition(v_proposal.attribute_name);

  IF v_proposal.target_type NOT IN ('company', 'contact', 'person') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'attribute_not_allowed',
      DETAIL = format('Target type %s is not supported for fact application.', v_proposal.target_type);
  END IF;

  v_text_value := private.extract_text_value(v_payload, false);
  v_proposed_norm := private.normalize_text_value(v_text_value);

  IF v_proposed_norm IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = 'A fact value must normalize to a non-empty string.';
  END IF;

  IF v_expected IS NOT NULL THEN
    v_expected_text := private.extract_text_value(v_expected, true);
    v_expected_norm := private.normalize_text_value(v_expected_text);
  ELSE
    v_expected_norm := NULL;
  END IF;

  IF v_cardinality = 'single' THEN
    SELECT *
    INTO v_fact_current
    FROM public.account_facts
    WHERE workspace_id = v_workspace_id
      AND target_type = v_proposal.target_type
      AND target_id = v_proposal.target_id
      AND fact_type = v_fact_type
      AND COALESCE(fact_subtype, '') = COALESCE(v_fact_subtype, '')
      AND is_current = true
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_current := private.jsonb_nullable_text(v_fact_current.normalized_value);
    v_applied := private.jsonb_nullable_text(v_proposed_norm);

    IF v_fact_current.id IS NULL THEN
      IF v_expected IS NOT NULL AND v_expected_norm IS NOT NULL THEN
        v_conflict := jsonb_build_object(
          'expectedValue', private.jsonb_nullable_text(v_expected_norm),
          'currentValue', 'null'::jsonb,
          'proposedValue', v_applied,
          'reason', 'concurrent_change_detected'
        );

        UPDATE public.enrichment_proposals
        SET status = 'conflicting',
            application_error = 'concurrent_change_detected',
            application_conflict = v_conflict
        WHERE id = v_proposal.id;

        RETURN private.make_proposal_result(
          v_proposal.id,
          'conflicting',
          'conflicting',
          v_proposal.target_type,
          v_proposal.target_id,
          v_proposal.attribute_name,
          NULL,
          private.jsonb_nullable_text(v_expected_norm),
          v_applied,
          v_conflict,
          'The current fact set no longer matches the initial snapshot.'
        );
      END IF;
    ELSIF v_expected IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'proposal_snapshot_missing',
        DETAIL = 'A single-value fact proposal requires an initial snapshot to detect concurrent changes.';
    ELSIF v_fact_current.normalized_value = v_expected_norm THEN
      NULL;
    ELSIF v_fact_current.normalized_value = v_proposed_norm THEN
      UPDATE public.enrichment_proposals
      SET status = 'applied',
          applied_at = COALESCE(applied_at, now()),
          applied_by = COALESCE(applied_by, v_actor_id),
          application_error = NULL,
          application_conflict = NULL,
          decision_reason = COALESCE(p_reason, decision_reason)
      WHERE id = v_proposal.id;

      RETURN private.make_proposal_result(
        v_proposal.id,
        'applied',
        'already_applied',
        v_proposal.target_type,
        v_proposal.target_id,
        v_proposal.attribute_name,
        v_fact_current.id,
        v_current,
        v_applied,
        NULL,
        'The current fact already matches the proposed value.'
      );
    ELSE
      v_conflict := jsonb_build_object(
        'expectedValue', private.jsonb_nullable_text(v_expected_norm),
        'currentValue', v_current,
        'proposedValue', v_applied,
        'reason', 'concurrent_change_detected'
      );

      UPDATE public.enrichment_proposals
      SET status = 'conflicting',
          application_error = 'concurrent_change_detected',
          application_conflict = v_conflict
      WHERE id = v_proposal.id;

      RETURN private.make_proposal_result(
        v_proposal.id,
        'conflicting',
        'conflicting',
        v_proposal.target_type,
        v_proposal.target_id,
        v_proposal.attribute_name,
        NULL,
        private.jsonb_nullable_text(v_expected_norm),
        v_applied,
        v_conflict,
        'The current fact set no longer matches the initial snapshot.'
      );
    END IF;

    IF v_fact_current.id IS NOT NULL AND v_fact_current.normalized_value = v_proposed_norm THEN
      v_fact_id := v_fact_current.id;
    ELSE
      IF v_fact_current.id IS NOT NULL THEN
        UPDATE public.account_facts
        SET is_current = false,
            expires_at = COALESCE(expires_at, now())
        WHERE id = v_fact_current.id;
      END IF;

      INSERT INTO public.account_facts (
        workspace_id,
        target_type,
        target_id,
        fact_type,
        fact_subtype,
        cardinality,
        value_text,
        value_json,
        normalized_value,
        normalized_value_hash,
        origin,
        confidence_score,
        primary_source_id,
        source_proposal_id,
        effective_at,
        verified_at,
        is_current
      )
      VALUES (
        v_workspace_id,
        v_proposal.target_type,
        v_proposal.target_id,
        v_fact_type,
        v_fact_subtype,
        v_cardinality,
        v_text_value,
        NULL,
        v_proposed_norm,
        COALESCE(v_proposal.normalized_value_hash, md5(v_proposed_norm)),
        'native',
        v_proposal.confidence_score,
        v_proposal.primary_source_id,
        v_proposal.id,
        now(),
        now(),
        true
      )
      RETURNING id INTO v_fact_id;
    END IF;
  ELSE
    SELECT *
    INTO v_fact
    FROM public.account_facts
    WHERE workspace_id = v_workspace_id
      AND target_type = v_proposal.target_type
      AND target_id = v_proposal.target_id
      AND fact_type = v_fact_type
      AND COALESCE(fact_subtype, '') = COALESCE(v_fact_subtype, '')
      AND normalized_value_hash = COALESCE(v_proposal.normalized_value_hash, md5(v_proposed_norm))
      AND is_current = true
    LIMIT 1
    FOR UPDATE;

    v_current := CASE
      WHEN v_fact.id IS NULL THEN 'null'::jsonb
      ELSE private.jsonb_nullable_text(v_fact.normalized_value)
    END;
    v_applied := private.jsonb_nullable_text(v_proposed_norm);

    IF v_fact.id IS NOT NULL THEN
      v_fact_id := v_fact.id;
    ELSE
      INSERT INTO public.account_facts (
        workspace_id,
        target_type,
        target_id,
        fact_type,
        fact_subtype,
        cardinality,
        value_text,
        value_json,
        normalized_value,
        normalized_value_hash,
        origin,
        confidence_score,
        primary_source_id,
        source_proposal_id,
        effective_at,
        verified_at,
        is_current
      )
      VALUES (
        v_workspace_id,
        v_proposal.target_type,
        v_proposal.target_id,
        v_fact_type,
        v_fact_subtype,
        v_cardinality,
        v_text_value,
        NULL,
        v_proposed_norm,
        COALESCE(v_proposal.normalized_value_hash, md5(v_proposed_norm)),
        'native',
        v_proposal.confidence_score,
        v_proposal.primary_source_id,
        v_proposal.id,
        now(),
        now(),
        true
      )
      RETURNING id INTO v_fact_id;
    END IF;
  END IF;

  PERFORM private.copy_proposal_links_to_fact(
    v_proposal.id,
    v_fact_id,
    v_workspace_id,
    v_proposal.primary_source_id
  );

  UPDATE public.enrichment_proposals
  SET status = 'applied',
      applied_at = COALESCE(applied_at, now()),
      applied_by = COALESCE(applied_by, v_actor_id),
      application_error = NULL,
      application_conflict = NULL,
      decision_reason = COALESCE(p_reason, decision_reason)
  WHERE id = v_proposal.id;

  RETURN private.make_proposal_result(
    v_proposal.id,
    'applied',
    CASE WHEN v_proposal.status = 'applied' THEN 'already_applied' ELSE 'applied' END,
    v_proposal.target_type,
    v_proposal.target_id,
    v_proposal.attribute_name,
    v_fact_id,
    v_current,
    v_applied,
    NULL,
    CASE WHEN v_proposal.status = 'applied'
      THEN 'The proposal had already been applied and the current fact is still consistent.'
      ELSE 'The proposal has been published as a native fact.'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_enrichment_proposal(
  p_proposal_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
)
RETURNS public.proposal_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN private.perform_proposal_decision(p_proposal_id, p_decision, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_enrichment_proposal(
  p_proposal_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.proposal_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN private.perform_proposal_apply(p_proposal_id, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_and_apply_enrichment_proposal(
  p_proposal_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.proposal_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_decision_result public.proposal_operation_result;
BEGIN
  v_decision_result := private.perform_proposal_decision(p_proposal_id, 'validated', p_reason);

  IF v_decision_result.status = 'rejected' THEN
    RETURN v_decision_result;
  END IF;

  RETURN private.perform_proposal_apply(p_proposal_id, p_reason);
END;
$$;

COMMENT ON FUNCTION public.decide_enrichment_proposal(uuid, text, text) IS
  'Decides an enrichment proposal inside a single transaction. Allowed decisions: validated, rejected.';

COMMENT ON FUNCTION public.apply_enrichment_proposal(uuid, text) IS
  'Applies a validated enrichment proposal atomically to an allowed CRM attribute or native account fact.';

COMMENT ON FUNCTION public.validate_and_apply_enrichment_proposal(uuid, text) IS
  'Convenience RPC for one-step validation followed by atomic application.';

REVOKE ALL ON FUNCTION public.decide_enrichment_proposal(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_enrichment_proposal(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_and_apply_enrichment_proposal(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.decide_enrichment_proposal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_enrichment_proposal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_apply_enrichment_proposal(uuid, text) TO authenticated;

COMMIT;
