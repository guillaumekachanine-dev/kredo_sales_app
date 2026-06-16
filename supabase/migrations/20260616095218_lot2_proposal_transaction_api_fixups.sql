-- Lot 2 — correctifs additifs
-- 1. sécurise l'idempotence des propositions déjà appliquées ;
-- 2. détecte les incohérences de cardinalité sur account_facts ;
-- 3. évite les écritures parasites lors d'une ré-application.

BEGIN;

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
  v_status text;
BEGIN
  SELECT status
  INTO v_status
  FROM public.enrichment_proposals
  WHERE id = p_proposal_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'proposal_not_found',
      DETAIL = format('Proposal %s does not exist.', p_proposal_id);
  END IF;

  IF v_status IN ('applied', 'validated') THEN
    RETURN private.perform_proposal_apply(p_proposal_id, p_reason);
  END IF;

  v_decision_result := private.perform_proposal_decision(p_proposal_id, 'validated', p_reason);

  IF v_decision_result.status = 'rejected' THEN
    RETURN v_decision_result;
  END IF;

  RETURN private.perform_proposal_apply(p_proposal_id, p_reason);
END;
$$;

COMMIT;
