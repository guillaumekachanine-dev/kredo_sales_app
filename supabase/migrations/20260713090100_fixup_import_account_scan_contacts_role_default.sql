BEGIN;

-- Correctif du fixup 20260713090000 : v_relationship_role retombait toujours sur
-- 'operationnel' même quand le candidat ne fournissait AUCUNE relationshipRole
-- (champ absent du JSON) — un candidat sans opinion sur le rôle se retrouvait
-- donc systématiquement en conflit avec le rôle réel déjà en CRM (ex: 'decideur')
-- dès que la nouvelle détection de conflit (§7) comparait les deux. Corrigé en
-- ne mappant vers 'operationnel' que lorsque le candidat a explicitement fourni
-- une valeur non reconnue — l'absence de valeur reste NULL (aucune prétention,
-- donc ni conflit ni remplissage sur ce champ). Détecté par le test SQL du Lot 3
-- (candidat "linkedin_dup" sans relationshipRole matchant un contact 'decideur'
-- existant, qui remontait à tort "conflicting" au lieu de "already_exists").

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
  v_person_row public.persons%ROWTYPE;
  v_contact_row public.contacts%ROWTYPE;
  v_person_is_new boolean;
  v_email text;
  v_email_status text;
  v_linkedin_url text;
  v_linkedin_norm text;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_name_norm text;
  v_job_title text;
  v_department text;
  v_relationship_role text;
  v_phone text;
  v_source_keys jsonb;
  v_provenance jsonb;
  v_operation text;
  v_conflict_fields text[];
  v_has_fill boolean;
  v_lock_key text;
  v_created_count integer := 0;
  v_linked_count integer := 0;
  v_updated_count integer := 0;
  v_already_exists_count integer := 0;
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
    v_linkedin_norm := private.normalize_linkedin_url(v_linkedin_url);
    v_first_name := NULLIF(btrim(v_candidate ->> 'firstName'), '');
    v_last_name := NULLIF(btrim(v_candidate ->> 'lastName'), '');
    v_full_name := NULLIF(btrim(COALESCE(v_candidate ->> 'fullName', concat_ws(' ', v_first_name, v_last_name))), '');
    v_name_norm := private.normalize_name_for_match(v_full_name);
    v_job_title := NULLIF(btrim(v_candidate ->> 'jobTitle'), '');
    v_department := NULLIF(btrim(v_candidate ->> 'department'), '');
    v_phone := NULLIF(btrim(v_candidate ->> 'phone'), '');
    v_source_keys := COALESCE(v_candidate -> 'sourceKeys', '[]'::jsonb);
    -- Correctif : NULL si le candidat n'a rien fourni (jamais 'operationnel' par
    -- défaut), pour ne jamais fabriquer un conflit sur un champ que le scan n'a
    -- pas réellement renseigné.
    v_relationship_role := CASE
      WHEN v_candidate ->> 'relationshipRole' IS NULL THEN NULL
      WHEN lower(v_candidate ->> 'relationshipRole') LIKE '%achat%' THEN 'acheteur'
      WHEN lower(v_candidate ->> 'relationshipRole') LIKE '%sponsor%' THEN 'sponsor'
      WHEN lower(v_candidate ->> 'relationshipRole') LIKE '%prescrip%' THEN 'prescripteur'
      WHEN lower(v_candidate ->> 'relationshipRole') LIKE '%décid%'
        OR lower(v_candidate ->> 'relationshipRole') LIKE '%decid%'
        OR lower(v_candidate ->> 'relationshipRole') LIKE '%direction%' THEN 'decideur'
      ELSE 'operationnel'
    END;

    IF v_email IS NULL AND v_linkedin_norm IS NULL AND v_name_norm IS NULL THEN
      v_error_count := v_error_count + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'candidateKey', v_candidate_key,
        'operation', 'error',
        'personId', NULL,
        'contactId', NULL,
        'message', 'Candidate has no email, LinkedIn URL or usable name to identify a person.'
      ));
      CONTINUE;
    END IF;

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

    v_lock_key := v_workspace_id::text || ':' || COALESCE(v_email, v_linkedin_norm, v_name_norm || ':' || v_company_id::text);
    PERFORM pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

    v_person_id := NULL;
    v_person_is_new := false;

    IF v_email IS NOT NULL THEN
      SELECT p.* INTO v_person_row
      FROM public.persons p
      WHERE p.workspace_id = v_workspace_id
        AND lower(p.primary_email) = v_email
      ORDER BY p.created_at ASC
      LIMIT 1
      FOR UPDATE;
      v_person_id := v_person_row.id;
    END IF;

    IF v_person_id IS NULL AND v_linkedin_norm IS NOT NULL THEN
      SELECT p.* INTO v_person_row
      FROM public.persons p
      WHERE p.workspace_id = v_workspace_id
        AND private.normalize_linkedin_url(p.linkedin_url) = v_linkedin_norm
      ORDER BY p.created_at ASC
      LIMIT 1
      FOR UPDATE;
      v_person_id := v_person_row.id;
    END IF;

    IF v_person_id IS NULL AND v_name_norm IS NOT NULL THEN
      SELECT p.* INTO v_person_row
      FROM public.persons p
      JOIN public.contacts c ON c.person_id = p.id
      WHERE p.workspace_id = v_workspace_id
        AND c.workspace_id = v_workspace_id
        AND c.company_id = v_company_id
        AND private.normalize_name_for_match(p.full_name) = v_name_norm
      ORDER BY p.created_at ASC
      LIMIT 1
      FOR UPDATE;
      v_person_id := v_person_row.id;
    END IF;

    IF v_person_id IS NULL THEN
      v_person_is_new := true;
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
    END IF;

    SELECT c.id INTO v_existing_contact_id
    FROM public.contacts c
    WHERE c.workspace_id = v_workspace_id
      AND c.company_id = v_company_id
      AND c.person_id = v_person_id
    LIMIT 1
    FOR UPDATE OF c;

    IF v_existing_contact_id IS NULL THEN
      INSERT INTO public.contacts (
        workspace_id, person_id, company_id, job_title, department, relationship_role, status, metadata
      )
      VALUES (
        v_workspace_id, v_person_id, v_company_id, v_job_title, v_department, v_relationship_role, 'actif', v_provenance
      )
      RETURNING id INTO v_contact_id;

      IF v_person_is_new THEN
        v_created_count := v_created_count + 1;
        v_operation := 'created';
      ELSE
        v_linked_count := v_linked_count + 1;
        v_operation := 'linked';
      END IF;
    ELSE
      v_contact_id := v_existing_contact_id;

      SELECT * INTO v_contact_row FROM public.contacts WHERE id = v_contact_id;

      v_conflict_fields := ARRAY[]::text[];
      IF v_job_title IS NOT NULL AND NULLIF(v_contact_row.job_title, '') IS NOT NULL AND v_contact_row.job_title <> v_job_title THEN
        v_conflict_fields := array_append(v_conflict_fields, 'job_title');
      END IF;
      IF v_department IS NOT NULL AND NULLIF(v_contact_row.department, '') IS NOT NULL AND v_contact_row.department <> v_department THEN
        v_conflict_fields := array_append(v_conflict_fields, 'department');
      END IF;
      IF v_relationship_role IS NOT NULL AND NULLIF(v_contact_row.relationship_role, '') IS NOT NULL AND v_contact_row.relationship_role <> v_relationship_role THEN
        v_conflict_fields := array_append(v_conflict_fields, 'relationship_role');
      END IF;

      v_has_fill :=
        (v_job_title IS NOT NULL AND NULLIF(v_contact_row.job_title, '') IS NULL)
        OR (v_department IS NOT NULL AND NULLIF(v_contact_row.department, '') IS NULL)
        OR (v_relationship_role IS NOT NULL AND NULLIF(v_contact_row.relationship_role, '') IS NULL);

      IF array_length(v_conflict_fields, 1) > 0 AND NOT p_allow_existing_updates THEN
        UPDATE public.contacts SET metadata = metadata || v_provenance WHERE id = v_contact_id;
        v_conflict_count := v_conflict_count + 1;
        v_operation := 'conflicting';
      ELSIF array_length(v_conflict_fields, 1) > 0 AND p_allow_existing_updates THEN
        UPDATE public.contacts c
        SET
          job_title = COALESCE(v_job_title, c.job_title),
          department = COALESCE(v_department, c.department),
          relationship_role = COALESCE(v_relationship_role, c.relationship_role),
          metadata = c.metadata || v_provenance
        WHERE c.id = v_contact_id;
        v_updated_count := v_updated_count + 1;
        v_operation := 'updated';
      ELSIF v_has_fill THEN
        UPDATE public.contacts c
        SET
          job_title = COALESCE(NULLIF(c.job_title, ''), v_job_title),
          department = COALESCE(NULLIF(c.department, ''), v_department),
          relationship_role = COALESCE(NULLIF(c.relationship_role, ''), v_relationship_role),
          metadata = c.metadata || v_provenance
        WHERE c.id = v_contact_id;
        v_updated_count := v_updated_count + 1;
        v_operation := 'updated';
      ELSE
        UPDATE public.contacts SET metadata = metadata || v_provenance WHERE id = v_contact_id;
        v_already_exists_count := v_already_exists_count + 1;
        v_operation := 'already_exists';
      END IF;
    END IF;

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'candidateKey', v_candidate_key,
      'operation', v_operation,
      'personId', v_person_id,
      'contactId', v_contact_id,
      'message', CASE
        WHEN v_email_status = 'inferred' THEN 'Inferred email was not imported.'
        WHEN v_operation = 'conflicting' THEN 'CRM values differ from scanned data (' || array_to_string(v_conflict_fields, ', ') || ') — re-import with allowExistingUpdates to overwrite.'
        ELSE NULL
      END
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created_count,
    'linked', v_linked_count,
    'updated', v_updated_count,
    'already_exists', v_already_exists_count,
    'ignored', v_ignored_count,
    'conflicting', v_conflict_count,
    'error', v_error_count,
    'items', v_items
  );
END;
$$;

COMMIT;
