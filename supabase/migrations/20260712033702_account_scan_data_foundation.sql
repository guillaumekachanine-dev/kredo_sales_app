-- Account scan Lot 0 — data foundation and enrichment contracts.

BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS siren text,
  ADD COLUMN IF NOT EXISTS naf_code text;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_siren_format_check,
  DROP CONSTRAINT IF EXISTS companies_naf_code_format_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_siren_format_check
  CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$'),
  ADD CONSTRAINT companies_naf_code_format_check
  CHECK (naf_code IS NULL OR upper(naf_code) ~ '^[0-9]{2}[.]?[0-9]{2}[A-Z]$');

CREATE UNIQUE INDEX IF NOT EXISTS companies_workspace_siren_uniq
  ON public.companies (workspace_id, siren)
  WHERE siren IS NOT NULL;

CREATE OR REPLACE FUNCTION private.extract_siren_value(
  p_payload jsonb,
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

  IF v_value IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_value !~ '^[0-9]{9}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = 'SIREN must contain exactly 9 digits.';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION private.extract_naf_code_value(
  p_payload jsonb,
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

  IF v_value IS NULL THEN
    RETURN NULL;
  END IF;

  v_value := upper(v_value);

  IF v_value !~ '^[0-9]{2}[.]?[0-9]{2}[A-Z]$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = 'NAF code must use the French format, for example 6202A or 62.02A.';
  END IF;

  RETURN replace(v_value, '.', '');
END;
$$;

CREATE OR REPLACE FUNCTION private.company_sector_jsonb_value(
  p_sector text,
  p_sector_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object('sector', p_sector, 'sectorId', p_sector_id);
$$;

CREATE OR REPLACE FUNCTION private.company_sector_comparison_value(
  p_expected jsonb,
  p_sector text,
  p_sector_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN p_expected IS NOT NULL AND jsonb_typeof(p_expected) = 'object'
      THEN private.company_sector_jsonb_value(p_sector, p_sector_id)
    ELSE private.jsonb_nullable_text(p_sector)
  END;
$$;

DROP FUNCTION IF EXISTS private.resolve_company_sector_payload(uuid, jsonb);

CREATE OR REPLACE FUNCTION private.resolve_company_sector_payload(
  p_workspace_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_source jsonb;
  v_text text;
  v_id uuid;
  v_slug text;
  v_name text;
  v_resolved_id uuid;
  v_resolved_name text;
BEGIN
  IF p_payload IS NULL OR p_payload = 'null'::jsonb THEN
    RETURN jsonb_build_object('sectorId', NULL, 'sector', NULL);
  END IF;

  IF jsonb_typeof(p_payload) = 'object' THEN
    v_source := COALESCE(
      p_payload -> 'sectorId',
      p_payload -> 'sector_id',
      p_payload -> 'id'
    );

    IF v_source IS NOT NULL AND v_source <> 'null'::jsonb THEN
      IF jsonb_typeof(v_source) <> 'string' OR (v_source #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'invalid_value',
          DETAIL = 'Sector id must be a UUID string.';
      END IF;

      v_id := (v_source #>> '{}')::uuid;
    END IF;

    v_slug := NULLIF(btrim(COALESCE(p_payload ->> 'slug', '')), '');
    v_name := NULLIF(btrim(COALESCE(p_payload ->> 'name', p_payload ->> 'sector', p_payload ->> 'value', '')), '');
  ELSE
    v_text := private.extract_text_value(p_payload, true);

    IF v_text IS NULL THEN
      RETURN jsonb_build_object('sectorId', NULL, 'sector', NULL);
    END IF;

    IF v_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_id := v_text::uuid;
    ELSE
      v_slug := v_text;
      v_name := v_text;
    END IF;
  END IF;

  SELECT si.id, si.name
  INTO v_resolved_id, v_resolved_name
  FROM public.sector_intelligence si
  WHERE si.workspace_id = p_workspace_id
    AND (
      (v_id IS NOT NULL AND si.id = v_id)
      OR (v_id IS NULL AND v_slug IS NOT NULL AND si.slug = v_slug)
      OR (v_id IS NULL AND v_name IS NOT NULL AND lower(si.name) = lower(v_name))
    )
  ORDER BY
    CASE
      WHEN v_id IS NOT NULL AND si.id = v_id THEN 1
      WHEN v_slug IS NOT NULL AND si.slug = v_slug THEN 2
      ELSE 3
    END
  LIMIT 1;

  IF v_resolved_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_value',
      DETAIL = 'Sector proposals must reference an existing sector_intelligence row in the current workspace.';
  END IF;

  RETURN jsonb_build_object('sectorId', v_resolved_id, 'sector', v_resolved_name);
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
      ARRAY[
        'description',
        'website',
        'hq_location',
        'sector',
        'employee_count',
        'revenue',
        'legal_name',
        'siren',
        'naf_code'
      ]
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
    WHEN 'establishment_count' THEN
      fact_type := 'establishment_count';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'growth_trend' THEN
      fact_type := 'growth_trend';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'geographic_reach' THEN
      fact_type := 'geographic_reach';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'value_proposition' THEN
      fact_type := 'value_proposition';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'differentiators' THEN
      fact_type := 'differentiators';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'market_position' THEN
      fact_type := 'market_position';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'marketing_position' THEN
      fact_type := 'marketing_position';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'target_customers' THEN
      fact_type := 'target_customers';
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
  v_sector_id uuid;
  v_sector_payload jsonb;
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
          v_sector_payload := private.resolve_company_sector_payload(v_workspace_id, v_payload);
          v_sector_id := NULLIF(v_sector_payload ->> 'sectorId', '')::uuid;
          v_text_value := NULLIF(v_sector_payload ->> 'sector', '');
          v_current := private.company_sector_comparison_value(v_expected, v_company.sector, v_company.sector_id);
          v_applied := private.company_sector_comparison_value(v_expected, v_text_value, v_sector_id);
        WHEN 'employee_count' THEN
          v_int_value := private.extract_integer_value(v_payload, true);
          v_current := private.jsonb_nullable_integer(v_company.employee_count);
          v_applied := private.jsonb_nullable_integer(v_int_value);
        WHEN 'revenue' THEN
          v_text_value := private.extract_text_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.revenue);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'legal_name' THEN
          v_text_value := private.extract_text_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.legal_name);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'siren' THEN
          v_text_value := private.extract_siren_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.siren);
          v_applied := private.jsonb_nullable_text(v_text_value);
        WHEN 'naf_code' THEN
          v_text_value := private.extract_naf_code_value(v_payload, true);
          v_current := private.jsonb_nullable_text(v_company.naf_code);
          v_applied := private.jsonb_nullable_text(v_text_value);
        ELSE
          RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'attribute_not_allowed',
            DETAIL = format('Attribute %s is not supported.', v_proposal.attribute_name);
      END CASE;

      IF v_proposal.status = 'applied' THEN
        IF v_current = v_applied THEN
          RETURN private.make_proposal_result(
            v_proposal.id,
            'applied',
            'already_applied',
            v_proposal.target_type,
            v_proposal.target_id,
            v_proposal.attribute_name,
            NULL,
            v_current,
            v_applied,
            NULL,
            'The proposal was already applied and the target value is still consistent.'
          );
        END IF;

        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'applied_state_diverged',
          DETAIL = 'The proposal is marked as applied but the CRM target no longer carries the applied value.';
      END IF;

      IF v_expected IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'proposal_snapshot_missing',
          DETAIL = 'The proposal does not contain a usable initial snapshot for concurrency checks.';
      END IF;

      IF v_current = v_expected THEN
        IF v_proposal.attribute_name = 'description' THEN
          UPDATE public.companies SET description = v_text_value WHERE id = v_company.id;
        ELSIF v_proposal.attribute_name = 'website' THEN
          UPDATE public.companies SET website = v_text_value WHERE id = v_company.id;
        ELSIF v_proposal.attribute_name = 'hq_location' THEN
          UPDATE public.companies SET hq_location = v_text_value WHERE id = v_company.id;
        ELSIF v_proposal.attribute_name = 'sector' THEN
          UPDATE public.companies SET sector = v_text_value, sector_id = v_sector_id WHERE id = v_company.id;
        ELSIF v_proposal.attribute_name = 'employee_count' THEN
          UPDATE public.companies SET employee_count = v_int_value WHERE id = v_company.id;
        ELSIF v_proposal.attribute_name = 'revenue' THEN
          UPDATE public.companies SET revenue = v_text_value WHERE id = v_company.id;
        ELSIF v_proposal.attribute_name = 'legal_name' THEN
          UPDATE public.companies SET legal_name = v_text_value WHERE id = v_company.id;
        ELSIF v_proposal.attribute_name = 'siren' THEN
          UPDATE public.companies SET siren = v_text_value WHERE id = v_company.id;
        ELSIF v_proposal.attribute_name = 'naf_code' THEN
          UPDATE public.companies SET naf_code = v_text_value WHERE id = v_company.id;
        END IF;
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

      IF v_proposal.status = 'applied' THEN
        IF v_current = v_applied THEN
          RETURN private.make_proposal_result(
            v_proposal.id,
            'applied',
            'already_applied',
            v_proposal.target_type,
            v_proposal.target_id,
            v_proposal.attribute_name,
            NULL,
            v_current,
            v_applied,
            NULL,
            'The proposal was already applied and the target value is still consistent.'
          );
        END IF;

        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'applied_state_diverged',
          DETAIL = 'The proposal is marked as applied but the CRM target no longer carries the applied value.';
      END IF;

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
        application_conflict = NULL
    WHERE id = v_proposal.id;

    RETURN private.make_proposal_result(
      v_proposal.id,
      'applied',
      'applied',
      v_proposal.target_type,
      v_proposal.target_id,
      v_proposal.attribute_name,
      NULL,
      v_current,
      v_applied,
      NULL,
      'The proposal has been applied to the CRM target.'
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

    IF v_fact_current.id IS NOT NULL AND v_fact_current.cardinality <> 'single' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'fact_cardinality_conflict',
        DETAIL = 'A current fact exists for this key but with an incompatible cardinality.';
    END IF;

    IF v_proposal.status = 'applied' THEN
      IF v_fact_current.id IS NOT NULL AND v_fact_current.normalized_value = v_proposed_norm THEN
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
          'The proposal was already applied and the current fact is still consistent.'
        );
      END IF;

      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'applied_state_diverged',
        DETAIL = 'The proposal is marked as applied but the current fact no longer matches the applied value.';
    END IF;

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
          application_conflict = NULL
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
    IF EXISTS (
      SELECT 1
      FROM public.account_facts af
      WHERE af.workspace_id = v_workspace_id
        AND af.target_type = v_proposal.target_type
        AND af.target_id = v_proposal.target_id
        AND af.fact_type = v_fact_type
        AND COALESCE(af.fact_subtype, '') = COALESCE(v_fact_subtype, '')
        AND af.is_current = true
        AND af.cardinality <> 'multi'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'fact_cardinality_conflict',
        DETAIL = 'A current fact exists for this key but with an incompatible cardinality.';
    END IF;

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

    IF v_proposal.status = 'applied' THEN
      IF v_fact.id IS NOT NULL THEN
        RETURN private.make_proposal_result(
          v_proposal.id,
          'applied',
          'already_applied',
          v_proposal.target_type,
          v_proposal.target_id,
          v_proposal.attribute_name,
          v_fact.id,
          v_current,
          v_applied,
          NULL,
          'The proposal was already applied and the current fact is still consistent.'
        );
      END IF;

      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'applied_state_diverged',
        DETAIL = 'The proposal is marked as applied but the current fact no longer matches the applied value.';
    END IF;

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
      application_conflict = NULL
  WHERE id = v_proposal.id;

  RETURN private.make_proposal_result(
    v_proposal.id,
    'applied',
    'applied',
    v_proposal.target_type,
    v_proposal.target_id,
    v_proposal.attribute_name,
    v_fact_id,
    v_current,
    v_applied,
    NULL,
    'The proposal has been published as a native fact.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_and_apply_enrichment_proposals(
  p_proposal_ids uuid[],
  p_reason text DEFAULT NULL
)
RETURNS SETOF public.proposal_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id uuid;
  v_workspace_id uuid;
  v_proposal_id uuid;
  v_status text;
  v_result public.proposal_operation_result;
  v_decision_result public.proposal_operation_result;
BEGIN
  v_actor_id := private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();

  IF COALESCE(array_length(p_proposal_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'empty_proposal_batch',
      DETAIL = 'At least one proposal id is required.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_proposal_ids) AS proposal_id
    WHERE proposal_id IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_proposal_batch',
      DETAIL = 'Proposal id arrays cannot contain null entries.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_proposal_ids) AS proposal_id
    LEFT JOIN public.enrichment_proposals ep ON ep.id = proposal_id
    WHERE ep.id IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'proposal_not_found',
      DETAIL = 'Every proposal in the batch must exist before any application is attempted.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_proposal_ids) AS proposal_id
    JOIN public.enrichment_proposals ep ON ep.id = proposal_id
    WHERE ep.workspace_id <> v_workspace_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'wrong_workspace',
      DETAIL = 'Every proposal in the batch must belong to the current workspace.';
  END IF;

  FOR v_proposal_id IN
    SELECT proposal_id
    FROM unnest(p_proposal_ids) WITH ORDINALITY AS u(proposal_id, ord)
    ORDER BY ord
  LOOP
    SELECT status
    INTO v_status
    FROM public.enrichment_proposals
    WHERE id = v_proposal_id;

    IF v_status IN ('applied', 'validated') THEN
      v_result := private.perform_proposal_apply(v_proposal_id, p_reason);
    ELSE
      v_decision_result := private.perform_proposal_decision(v_proposal_id, 'validated', p_reason);

      IF v_decision_result.status = 'rejected' THEN
        v_result := v_decision_result;
      ELSE
        v_result := private.perform_proposal_apply(v_proposal_id, p_reason);
      END IF;
    END IF;

    RETURN NEXT v_result;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.validate_and_apply_enrichment_proposals(uuid[], text) IS
  'Batch validates and applies enrichment proposals atomically, returning one result per input proposal.';

REVOKE ALL ON FUNCTION public.validate_and_apply_enrichment_proposals(uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_and_apply_enrichment_proposals(uuid[], text) TO authenticated;

COMMIT;
