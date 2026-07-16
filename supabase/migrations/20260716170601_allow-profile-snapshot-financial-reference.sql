-- The métier is now sourced from collaborators.current_title / candidates.current_title.
-- Keep the legacy job profile when present, but make the persisted métier snapshot
-- the authoritative reference value and accept it when the legacy ID is absent.
DO $migration$
DECLARE
  v_definition text;
  v_legacy_validation text := $sql$
  -- vérifier profil ou rôle renseigné
  IF v_model.job_profile_id IS NULL THEN
    RAISE EXCEPTION 'Le profil ou rôle de la ressource est obligatoire.' USING errcode = 'L0001';
  END IF;$sql$;
  v_snapshot_validation text := $sql$
  -- vérifier métier renseigné, via le snapshot ou le référentiel historique
  IF v_model.job_profile_id IS NULL
     AND nullif(trim(v_model.profile_name_snapshot), '') IS NULL THEN
    RAISE EXCEPTION 'Le métier de la ressource est obligatoire.' USING errcode = 'L0001';
  END IF;$sql$;
  v_legacy_profile_lookup text := $sql$
      SELECT title INTO v_profile_name FROM public.job_profiles WHERE id = v_model.job_profile_id AND workspace_id = v_workspace_id;
      IF v_profile_name IS NULL THEN
        v_profile_name := v_model.profile_name_snapshot;
      END IF;$sql$;
  v_snapshot_profile_lookup text := $sql$
      v_profile_name := nullif(trim(v_model.profile_name_snapshot), '');
      IF v_profile_name IS NULL THEN
        SELECT title INTO v_profile_name FROM public.job_profiles WHERE id = v_model.job_profile_id AND workspace_id = v_workspace_id;
      END IF;$sql$;
  v_legacy_profile_lookup_main text := $sql$
  SELECT title INTO v_profile_name FROM public.job_profiles WHERE id = v_model.job_profile_id AND workspace_id = v_workspace_id;
  IF v_profile_name IS NULL THEN
    v_profile_name := v_model.profile_name_snapshot;
  END IF;$sql$;
  v_snapshot_profile_lookup_main text := $sql$
  v_profile_name := nullif(trim(v_model.profile_name_snapshot), '');
  IF v_profile_name IS NULL THEN
    SELECT title INTO v_profile_name FROM public.job_profiles WHERE id = v_model.job_profile_id AND workspace_id = v_workspace_id;
  END IF;$sql$;
BEGIN
  SELECT pg_get_functiondef('public.promote_financial_model_to_reference(uuid)'::regprocedure)
  INTO v_definition;

  IF position(v_legacy_validation IN v_definition) = 0 THEN
    RAISE EXCEPTION 'La validation métier attendue est introuvable dans promote_financial_model_to_reference.';
  END IF;

  IF position(v_legacy_profile_lookup IN v_definition) = 0 THEN
    RAISE EXCEPTION 'La résolution métier attendue est introuvable dans promote_financial_model_to_reference.';
  END IF;

  IF position(v_legacy_profile_lookup_main IN v_definition) = 0 THEN
    RAISE EXCEPTION 'La résolution métier principale est introuvable dans promote_financial_model_to_reference.';
  END IF;

  v_definition := replace(v_definition, v_legacy_validation, v_snapshot_validation);
  v_definition := replace(v_definition, v_legacy_profile_lookup, v_snapshot_profile_lookup);
  v_definition := replace(v_definition, v_legacy_profile_lookup_main, v_snapshot_profile_lookup_main);
  EXECUTE v_definition;
END;
$migration$;
