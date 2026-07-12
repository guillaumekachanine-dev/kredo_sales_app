BEGIN;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_persons_workspace_linkedin
  ON public.persons (workspace_id, lower(linkedin_url))
  WHERE linkedin_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_company_person
  ON public.contacts (workspace_id, company_id, person_id)
  WHERE company_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.import_account_scan_contacts(
  p_result_id uuid,
  p_candidate_keys text[],
  p_allow_existing_updates boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id uuid;
  v_workspace_id uuid;
  v_result record;
  v_candidates jsonb;
  v_candidate jsonb;
  v_candidate_key text;
  v_requested_keys text[];
  v_found_keys text[];
  v_missing_keys text[];
  v_company_id uuid;
  v_person_id uuid;
  v_contact_id uuid;
  v_existing_contact_id uuid;
  v_email text;
  v_email_status text;
  v_linkedin_url text;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_job_title text;
  v_department text;
  v_relationship_role text;
  v_phone text;
  v_source_keys jsonb;
  v_provenance jsonb;
  v_operation text;
  v_created_count integer := 0;
  v_linked_count integer := 0;
  v_updated_count integer := 0;
  v_ignored_count integer := 0;
  v_conflict_count integer := 0;
  v_error_count integer := 0;
  v_items jsonb := '[]'::jsonb;
BEGIN
  v_actor_id := private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();

  IF p_result_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'result_required';
  END IF;

  IF COALESCE(array_length(p_candidate_keys, 1), 0) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'empty_contact_candidate_batch';
  END IF;

  SELECT air.id, air.workspace_id, air.company_id, air.content_json, air.result_type, air.status
  INTO v_result
  FROM public.ai_intelligence_results air
  WHERE air.id = p_result_id
  FOR UPDATE;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'result_not_found';
  END IF;

  IF v_result.workspace_id <> v_workspace_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'wrong_workspace';
  END IF;

  IF v_result.result_type <> 'account_scan' OR v_result.status <> 'succeeded' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_result_state';
  END IF;

  v_company_id := v_result.company_id;
  v_candidates := COALESCE(v_result.content_json -> 'contactCandidates', '[]'::jsonb);

  IF jsonb_typeof(v_candidates) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_contact_candidates';
  END IF;

  SELECT array_agg(DISTINCT btrim(k))
  INTO v_requested_keys
  FROM unnest(p_candidate_keys) AS k
  WHERE btrim(k) <> '';

  IF COALESCE(array_length(v_requested_keys, 1), 0) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'empty_contact_candidate_batch';
  END IF;

  SELECT array_agg(candidate ->> 'candidateKey')
  INTO v_found_keys
  FROM jsonb_array_elements(v_candidates) AS candidate
  WHERE candidate ->> 'candidateKey' = ANY(v_requested_keys);

  SELECT array_agg(key)
  INTO v_missing_keys
  FROM unnest(v_requested_keys) AS key
  WHERE NOT (key = ANY(COALESCE(v_found_keys, ARRAY[]::text[])));

  IF COALESCE(array_length(v_missing_keys, 1), 0) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'candidate_not_found',
      DETAIL = array_to_string(v_missing_keys, ', ');
  END IF;

  FOR v_candidate IN
    SELECT candidate
    FROM jsonb_array_elements(v_candidates) AS candidate
    WHERE candidate ->> 'candidateKey' = ANY(v_requested_keys)
    ORDER BY array_position(v_requested_keys, candidate ->> 'candidateKey')
  LOOP
    v_candidate_key := v_candidate ->> 'candidateKey';

    IF COALESCE(v_candidate ->> 'suggestedAction', 'create') = 'ignore' THEN
      v_ignored_count := v_ignored_count + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'candidateKey', v_candidate_key,
        'operation', 'ignored',
        'personId', NULL,
        'contactId', NULL,
        'message', 'Candidate suggested action is ignore.'
      ));
      CONTINUE;
    END IF;

    v_email_status := COALESCE(v_candidate ->> 'emailStatus', 'unknown');
    v_email := CASE
      WHEN v_email_status IN ('public', 'confirmed') THEN NULLIF(lower(btrim(v_candidate ->> 'email')), '')
      ELSE NULL
    END;
    v_linkedin_url := NULLIF(btrim(v_candidate ->> 'linkedinUrl'), '');
    v_first_name := NULLIF(btrim(v_candidate ->> 'firstName'), '');
    v_last_name := NULLIF(btrim(v_candidate ->> 'lastName'), '');
    v_full_name := NULLIF(btrim(COALESCE(v_candidate ->> 'fullName', concat_ws(' ', v_first_name, v_last_name))), '');
    v_job_title := NULLIF(btrim(v_candidate ->> 'jobTitle'), '');
    v_department := NULLIF(btrim(v_candidate ->> 'department'), '');
    v_phone := NULLIF(btrim(v_candidate ->> 'phone'), '');
    v_source_keys := COALESCE(v_candidate -> 'sourceKeys', '[]'::jsonb);
    v_relationship_role := CASE
      WHEN lower(COALESCE(v_candidate ->> 'relationshipRole', '')) LIKE '%achat%' THEN 'acheteur'
      WHEN lower(COALESCE(v_candidate ->> 'relationshipRole', '')) LIKE '%sponsor%' THEN 'sponsor'
      WHEN lower(COALESCE(v_candidate ->> 'relationshipRole', '')) LIKE '%prescrip%' THEN 'prescripteur'
      WHEN lower(COALESCE(v_candidate ->> 'relationshipRole', '')) LIKE '%décid%'
        OR lower(COALESCE(v_candidate ->> 'relationshipRole', '')) LIKE '%decid%'
        OR lower(COALESCE(v_candidate ->> 'relationshipRole', '')) LIKE '%direction%' THEN 'decideur'
      ELSE 'operationnel'
    END;

    v_provenance := jsonb_build_object(
      'accountScan', jsonb_build_object(
        'resultId', p_result_id,
        'candidateKey', v_candidate_key,
        'sourceKeys', v_source_keys,
        'evidence', NULLIF(v_candidate ->> 'evidence', ''),
        'confidenceScore', COALESCE((v_candidate ->> 'confidenceScore')::numeric, 0),
        'importedAt', now(),
        'importedBy', v_actor_id,
        'emailStatus', v_email_status
      )
    );

    v_person_id := NULL;
    v_contact_id := NULL;
    v_operation := 'created';

    IF v_email IS NOT NULL THEN
      SELECT p.id INTO v_person_id
      FROM public.persons p
      WHERE p.workspace_id = v_workspace_id
        AND lower(p.primary_email) = v_email
      ORDER BY p.created_at ASC
      LIMIT 1;
    END IF;

    IF v_person_id IS NULL AND v_linkedin_url IS NOT NULL THEN
      SELECT p.id INTO v_person_id
      FROM public.persons p
      WHERE p.workspace_id = v_workspace_id
        AND lower(p.linkedin_url) = lower(v_linkedin_url)
      ORDER BY p.created_at ASC
      LIMIT 1;
    END IF;

    IF v_person_id IS NULL AND v_full_name IS NOT NULL THEN
      SELECT p.id INTO v_person_id
      FROM public.persons p
      JOIN public.contacts c ON c.person_id = p.id
      WHERE p.workspace_id = v_workspace_id
        AND c.workspace_id = v_workspace_id
        AND c.company_id = v_company_id
        AND lower(p.full_name) = lower(v_full_name)
      ORDER BY p.created_at ASC
      LIMIT 1;
    END IF;

    IF v_person_id IS NULL THEN
      INSERT INTO public.persons (
        workspace_id, first_name, last_name, primary_email, phone, linkedin_url, metadata
      )
      VALUES (
        v_workspace_id,
        COALESCE(v_first_name, split_part(v_full_name, ' ', 1)),
        COALESCE(v_last_name, NULLIF(btrim(regexp_replace(COALESCE(v_full_name, ''), '^\S+\s*', '')), '')),
        v_email,
        v_phone,
        v_linkedin_url,
        v_provenance
      )
      RETURNING id INTO v_person_id;

      v_operation := 'created';
    ELSE
      UPDATE public.persons p
      SET
        first_name = COALESCE(NULLIF(p.first_name, ''), v_first_name),
        last_name = COALESCE(NULLIF(p.last_name, ''), v_last_name),
        primary_email = COALESCE(NULLIF(p.primary_email, ''), v_email),
        phone = COALESCE(NULLIF(p.phone, ''), v_phone),
        linkedin_url = COALESCE(NULLIF(p.linkedin_url, ''), v_linkedin_url),
        metadata = p.metadata || v_provenance
      WHERE p.id = v_person_id
        AND p.workspace_id = v_workspace_id;

      v_operation := 'linked';
    END IF;

    SELECT c.id INTO v_existing_contact_id
    FROM public.contacts c
    WHERE c.workspace_id = v_workspace_id
      AND c.company_id = v_company_id
      AND c.person_id = v_person_id
    LIMIT 1;

    IF v_existing_contact_id IS NULL THEN
      INSERT INTO public.contacts (
        workspace_id, person_id, company_id, job_title, department, relationship_role, status, metadata
      )
      VALUES (
        v_workspace_id, v_person_id, v_company_id, v_job_title, v_department, v_relationship_role, 'actif', v_provenance
      )
      RETURNING id INTO v_contact_id;

      IF v_operation = 'created' THEN
        v_created_count := v_created_count + 1;
      ELSE
        v_linked_count := v_linked_count + 1;
      END IF;
    ELSE
      v_contact_id := v_existing_contact_id;

      IF p_allow_existing_updates THEN
        UPDATE public.contacts c
        SET
          job_title = COALESCE(NULLIF(c.job_title, ''), v_job_title),
          department = COALESCE(NULLIF(c.department, ''), v_department),
          relationship_role = COALESCE(NULLIF(c.relationship_role, ''), v_relationship_role),
          metadata = c.metadata || v_provenance
        WHERE c.id = v_contact_id
          AND c.workspace_id = v_workspace_id;
        v_updated_count := v_updated_count + 1;
        v_operation := 'updated';
      ELSE
        UPDATE public.contacts c
        SET metadata = c.metadata || v_provenance
        WHERE c.id = v_contact_id
          AND c.workspace_id = v_workspace_id;
        v_linked_count := v_linked_count + 1;
        v_operation := 'linked';
      END IF;
    END IF;

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'candidateKey', v_candidate_key,
      'operation', v_operation,
      'personId', v_person_id,
      'contactId', v_contact_id,
      'message', CASE WHEN v_email_status = 'inferred' THEN 'Inferred email was not imported.' ELSE NULL END
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created_count,
    'linked', v_linked_count,
    'updated', v_updated_count,
    'ignored', v_ignored_count,
    'conflict', v_conflict_count,
    'error', v_error_count,
    'items', v_items
  );
END;
$$;

COMMENT ON FUNCTION public.import_account_scan_contacts(uuid, text[], boolean) IS
  'Imports selected account_scan contact candidates from ai_intelligence_results.content_json transactionally and idempotently.';

REVOKE ALL ON FUNCTION public.import_account_scan_contacts(uuid, text[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_account_scan_contacts(uuid, text[], boolean) TO authenticated;

COMMIT;
