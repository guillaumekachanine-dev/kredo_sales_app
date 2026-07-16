-- Migration: lot1_immutable_references_lifecycle
-- Corrects and hardens save_financial_model_snapshot, archive_financial_model, and promote_financial_model_to_reference

BEGIN;

-- 1. Hardened save_financial_model_snapshot
CREATE OR REPLACE FUNCTION public.save_financial_model_snapshot(
  p_model_id uuid,
  p_expected_updated_at timestamptz,
  p_model jsonb,
  p_expenses jsonb
)
RETURNS TABLE (
  id uuid,
  status text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
  v_model_id uuid;
  v_current_status text;
  v_current_updated_at timestamptz;
  v_status text;
  v_existing_validated_by uuid;
  v_existing_validated_at timestamptz;
  v_validated_by uuid;
  v_validated_at timestamptz;
  v_res_id uuid;
  v_res_status text;
  v_res_updated_at timestamptz;
BEGIN
  v_workspace_id := private.current_workspace_id();
  v_user_id := auth.uid();

  -- Get current state if model id is provided
  IF p_model_id IS NOT NULL THEN
    SELECT public.financial_models.status, public.financial_models.updated_at
    INTO v_current_status, v_current_updated_at
    FROM public.financial_models
    WHERE public.financial_models.id = p_model_id
      AND public.financial_models.workspace_id = v_workspace_id;

    -- Update mode: model must exist in current workspace
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'Simulation introuvable dans ce workspace.' USING errcode = 'P0002';
    END IF;
  END IF;

  -- Allowed target status validation (only draft and validated are allowed for save)
  v_status := coalesce(p_model->>'status', 'draft');
  IF v_status NOT IN ('draft', 'validated') THEN
    RAISE EXCEPTION 'Statut de simulation non autorisé pour la sauvegarde (doit être draft ou validated).' USING errcode = 'L0001';
  END IF;

  IF p_model_id IS NULL THEN
    -- CREATION
    v_model_id := gen_random_uuid();

    IF v_status = 'validated' THEN
      v_validated_by := v_user_id;
      v_validated_at := now();
    ELSE
      v_validated_by := NULL;
      v_validated_at := NULL;
    END IF;

    INSERT INTO public.financial_models (
      id, workspace_id, title, mode, status, calculation_version, currency,
      resource_type, resource_cost_model, collaborator_id, candidate_id, resource_label,
      job_profile_id, profile_name_snapshot, seniority_snapshot, employment_status_snapshot, location_snapshot,
      gross_annual_snapshot, variable_pay_snapshot, charges_rate_snapshot, annual_working_days_snapshot,
      external_daily_cost_snapshot, external_fixed_cost_snapshot,
      historical_activity_rate, forecast_activity_rate,
      company_id, opportunity_id, pricing_agreement_id, precedent_mission_id, precedent_opportunity_id,
      start_date, end_date, projection_end_date, projection_basis, manual_business_days,
      business_days, production_days, sale_daily_rate,
      annual_employer_cost, base_daily_cost, productive_daily_cost,
      resource_cost_total, salary_cost_total, expenses_total, total_costs, revenue_total,
      daily_margin_amount, gross_margin_amount, gross_margin_pct, acv, tcv,
      warnings, assumptions, created_by, validated_by, validated_at
    ) VALUES (
      v_model_id, v_workspace_id,
      p_model->>'title',
      p_model->>'mode',
      v_status,
      p_model->>'calculation_version',
      coalesce(p_model->>'currency', 'EUR'),
      p_model->>'resource_type',
      p_model->>'resource_cost_model',
      (p_model->>'collaborator_id')::uuid,
      (p_model->>'candidate_id')::uuid,
      p_model->>'resource_label',
      (p_model->>'job_profile_id')::uuid,
      p_model->>'profile_name_snapshot',
      p_model->>'seniority_snapshot',
      p_model->>'employment_status_snapshot',
      p_model->>'location_snapshot',
      (p_model->>'gross_annual_snapshot')::numeric,
      (p_model->>'variable_pay_snapshot')::numeric,
      (p_model->>'charges_rate_snapshot')::numeric,
      (p_model->>'annual_working_days_snapshot')::integer,
      (p_model->>'external_daily_cost_snapshot')::numeric,
      (p_model->>'external_fixed_cost_snapshot')::numeric,
      (p_model->>'historical_activity_rate')::numeric,
      (p_model->>'forecast_activity_rate')::numeric,
      (p_model->>'company_id')::uuid,
      (p_model->>'opportunity_id')::uuid,
      (p_model->>'pricing_agreement_id')::uuid,
      (p_model->>'precedent_mission_id')::uuid,
      (p_model->>'precedent_opportunity_id')::uuid,
      (p_model->>'start_date')::date,
      (p_model->>'end_date')::date,
      (p_model->>'projection_end_date')::date,
      p_model->>'projection_basis',
      (p_model->>'manual_business_days')::numeric,
      (p_model->>'business_days')::numeric,
      (p_model->>'production_days')::numeric,
      (p_model->>'sale_daily_rate')::numeric,
      (p_model->>'annual_employer_cost')::numeric,
      (p_model->>'base_daily_cost')::numeric,
      (p_model->>'productive_daily_cost')::numeric,
      (p_model->>'resource_cost_total')::numeric,
      (p_model->>'salary_cost_total')::numeric,
      (p_model->>'expenses_total')::numeric,
      (p_model->>'total_costs')::numeric,
      (p_model->>'revenue_total')::numeric,
      (p_model->>'daily_margin_amount')::numeric,
      (p_model->>'gross_margin_amount')::numeric,
      (p_model->>'gross_margin_pct')::numeric,
      (p_model->>'acv')::numeric,
      (p_model->>'tcv')::numeric,
      coalesce((p_model->'warnings'), '[]'::jsonb),
      coalesce((p_model->'assumptions'), '{}'::jsonb),
      v_user_id,
      v_validated_by,
      v_validated_at
    );
  ELSE
    -- UPDATE
    v_model_id := p_model_id;

    -- Immutable reference state checks
    IF v_current_status IN ('reference', 'superseded', 'converted', 'archived') THEN
      RAISE EXCEPTION 'Cette référence financière est immuable. Dupliquez-la pour créer une nouvelle révision.' USING errcode = 'L0001';
    END IF;

    IF p_expected_updated_at IS NOT NULL AND v_current_updated_at <> p_expected_updated_at THEN
      RAISE EXCEPTION 'Conflit de mise à jour : la simulation a été modifiée entre-temps.' USING errcode = 'V0001';
    END IF;

    -- Fetch existing validation metadata
    SELECT public.financial_models.validated_by, public.financial_models.validated_at
    INTO v_existing_validated_by, v_existing_validated_at
    FROM public.financial_models
    WHERE public.financial_models.id = v_model_id AND public.financial_models.workspace_id = v_workspace_id;

    -- Transition rules
    IF v_current_status = 'draft' AND v_status = 'validated' THEN
      v_validated_by := v_user_id;
      v_validated_at := now();
    ELSIF v_current_status = 'validated' AND v_status = 'validated' THEN
      v_validated_by := v_existing_validated_by;
      v_validated_at := v_existing_validated_at;
    ELSIF v_status = 'draft' THEN
      v_validated_by := NULL;
      v_validated_at := NULL;
    ELSE
      v_validated_by := v_existing_validated_by;
      v_validated_at := v_existing_validated_at;
    END IF;

    UPDATE public.financial_models
    SET
      title = p_model->>'title',
      mode = p_model->>'mode',
      status = v_status,
      calculation_version = p_model->>'calculation_version',
      currency = coalesce(p_model->>'currency', 'EUR'),
      resource_type = p_model->>'resource_type',
      resource_cost_model = p_model->>'resource_cost_model',
      collaborator_id = (p_model->>'collaborator_id')::uuid,
      candidate_id = (p_model->>'candidate_id')::uuid,
      resource_label = p_model->>'resource_label',
      job_profile_id = (p_model->>'job_profile_id')::uuid,
      profile_name_snapshot = p_model->>'profile_name_snapshot',
      seniority_snapshot = p_model->>'seniority_snapshot',
      employment_status_snapshot = p_model->>'employment_status_snapshot',
      location_snapshot = p_model->>'location_snapshot',
      gross_annual_snapshot = (p_model->>'gross_annual_snapshot')::numeric,
      variable_pay_snapshot = (p_model->>'variable_pay_snapshot')::numeric,
      charges_rate_snapshot = (p_model->>'charges_rate_snapshot')::numeric,
      annual_working_days_snapshot = (p_model->>'annual_working_days_snapshot')::integer,
      external_daily_cost_snapshot = (p_model->>'external_daily_cost_snapshot')::numeric,
      external_fixed_cost_snapshot = (p_model->>'external_fixed_cost_snapshot')::numeric,
      historical_activity_rate = (p_model->>'historical_activity_rate')::numeric,
      forecast_activity_rate = (p_model->>'forecast_activity_rate')::numeric,
      company_id = (p_model->>'company_id')::uuid,
      opportunity_id = (p_model->>'opportunity_id')::uuid,
      pricing_agreement_id = (p_model->>'pricing_agreement_id')::uuid,
      precedent_mission_id = (p_model->>'precedent_mission_id')::uuid,
      precedent_opportunity_id = (p_model->>'precedent_opportunity_id')::uuid,
      start_date = (p_model->>'start_date')::date,
      end_date = (p_model->>'end_date')::date,
      projection_end_date = (p_model->>'projection_end_date')::date,
      projection_basis = p_model->>'projection_basis',
      manual_business_days = (p_model->>'manual_business_days')::numeric,
      business_days = (p_model->>'business_days')::numeric,
      production_days = (p_model->>'production_days')::numeric,
      sale_daily_rate = (p_model->>'sale_daily_rate')::numeric,
      annual_employer_cost = (p_model->>'annual_employer_cost')::numeric,
      base_daily_cost = (p_model->>'base_daily_cost')::numeric,
      productive_daily_cost = (p_model->>'productive_daily_cost')::numeric,
      resource_cost_total = (p_model->>'resource_cost_total')::numeric,
      salary_cost_total = (p_model->>'salary_cost_total')::numeric,
      expenses_total = (p_model->>'expenses_total')::numeric,
      total_costs = (p_model->>'total_costs')::numeric,
      revenue_total = (p_model->>'revenue_total')::numeric,
      daily_margin_amount = (p_model->>'daily_margin_amount')::numeric,
      gross_margin_amount = (p_model->>'gross_margin_amount')::numeric,
      gross_margin_pct = (p_model->>'gross_margin_pct')::numeric,
      acv = (p_model->>'acv')::numeric,
      tcv = (p_model->>'tcv')::numeric,
      warnings = coalesce((p_model->'warnings'), '[]'::jsonb),
      assumptions = coalesce((p_model->'assumptions'), '{}'::jsonb),
      validated_by = v_validated_by,
      validated_at = v_validated_at,
      updated_at = now()
    WHERE public.financial_models.id = v_model_id
      AND public.financial_models.workspace_id = v_workspace_id;
  END IF;

  -- Replace expenses
  DELETE FROM public.financial_model_expenses
  WHERE public.financial_model_expenses.financial_model_id = v_model_id
    AND public.financial_model_expenses.workspace_id = v_workspace_id;

  IF p_expenses IS NOT NULL AND jsonb_array_length(p_expenses) > 0 THEN
    INSERT INTO public.financial_model_expenses (
      financial_model_id, workspace_id, category, label, calculation_mode, unit_amount, quantity, total_amount_snapshot, notes, sort_order
    )
    SELECT
      v_model_id,
      v_workspace_id,
      x.category,
      x.label,
      x.calculation_mode,
      x.unit_amount,
      coalesce(x.quantity, 1.00),
      x.total_amount_snapshot,
      x.notes,
      coalesce(x.sort_order, 0)
    FROM jsonb_to_recordset(p_expenses) AS x(
      category text,
      label text,
      calculation_mode text,
      unit_amount numeric,
      quantity numeric,
      total_amount_snapshot numeric,
      notes text,
      sort_order integer
    );
  END IF;

  -- Return updated/inserted summary
  SELECT public.financial_models.id, public.financial_models.status, public.financial_models.updated_at
  INTO v_res_id, v_res_status, v_res_updated_at
  FROM public.financial_models
  WHERE public.financial_models.id = v_model_id
    AND public.financial_models.workspace_id = v_workspace_id;

  id := v_res_id;
  status := v_res_status;
  updated_at := v_res_updated_at;
  RETURN NEXT;
END;
$$;


-- 2. Hardened archive_financial_model
CREATE OR REPLACE FUNCTION public.archive_financial_model(
  p_model_id uuid
)
RETURNS TABLE (
  id uuid,
  status text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_workspace_id uuid;
  v_status text;
  v_res_id uuid;
  v_res_status text;
  v_res_updated_at timestamptz;
BEGIN
  v_workspace_id := private.current_workspace_id();

  SELECT public.financial_models.status INTO v_status
  FROM public.financial_models
  WHERE public.financial_models.id = p_model_id
    AND public.financial_models.workspace_id = v_workspace_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Simulation introuvable dans ce workspace.' USING errcode = 'P0002';
  END IF;

  -- Strictly allow archiving draft and validated only
  IF v_status NOT IN ('draft', 'validated') THEN
    RAISE EXCEPTION 'Impossible d''archiver une simulation avec le statut %.', v_status USING errcode = 'L0001';
  END IF;

  UPDATE public.financial_models
  SET
    status = 'archived',
    updated_at = now()
  WHERE public.financial_models.id = p_model_id
    AND public.financial_models.workspace_id = v_workspace_id;

  SELECT public.financial_models.id, public.financial_models.status, public.financial_models.updated_at
  INTO v_res_id, v_res_status, v_res_updated_at
  FROM public.financial_models
  WHERE public.financial_models.id = p_model_id
    AND public.financial_models.workspace_id = v_workspace_id;

  id := v_res_id;
  status := v_res_status;
  updated_at := v_res_updated_at;
  RETURN NEXT;
END;
$$;


-- 3. Hardened and idempotent promote_financial_model_to_reference
CREATE OR REPLACE FUNCTION public.promote_financial_model_to_reference(p_model_id uuid)
RETURNS TABLE (
  model_id uuid,
  document_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
  v_model public.financial_models%ROWTYPE;
  v_old_ref_id uuid;
  v_doc_id uuid;
  v_company_name text;
  v_opportunity_name text;
  v_profile_name text;
  v_promoted_by_name text;
  v_content_text text;
  v_content_json jsonb;
BEGIN
  -- 1. vérifier utilisateur, workspace et droits administrateur
  v_workspace_id := private.current_workspace_id();
  v_user_id := auth.uid();

  IF v_user_id IS NULL OR v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié ou workspace manquant.' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND workspace_id = v_workspace_id
  ) THEN
    RAISE EXCEPTION 'Utilisateur non autorisé dans ce workspace.' USING errcode = '42501';
  END IF;

  -- Validation explicite des droits administrateur
  IF NOT private.is_workspace_admin() THEN
    RAISE EXCEPTION 'Non autorisé : droits administrateur requis.' USING errcode = '42501';
  END IF;

  -- 2. verrouiller la simulation cible
  SELECT * INTO v_model
  FROM public.financial_models
  WHERE id = p_model_id AND workspace_id = v_workspace_id
  FOR UPDATE;

  IF v_model.id IS NULL THEN
    RAISE EXCEPTION 'Simulation introuvable dans ce workspace.' USING errcode = 'P0002';
  END IF;

  -- 3. vérifier strictement les transitions
  IF v_model.status = 'reference' THEN
    -- Idempotence: retrouver le document de référence financière actif
    SELECT id INTO v_doc_id
    FROM public.intelligence_documents
    WHERE source_financial_model_id = p_model_id
      AND document_type = 'financial_reference'
      AND workspace_id = v_workspace_id;

    -- Si manquant anormalement, le créer
    IF v_doc_id IS NULL THEN
      -- Calculer les noms pour le document
      SELECT name INTO v_company_name FROM public.companies WHERE id = v_model.company_id AND workspace_id = v_workspace_id;
      SELECT title INTO v_opportunity_name FROM public.opportunities WHERE id = v_model.opportunity_id AND workspace_id = v_workspace_id;
      SELECT title INTO v_profile_name FROM public.job_profiles WHERE id = v_model.job_profile_id AND workspace_id = v_workspace_id;
      IF v_profile_name IS NULL THEN
        v_profile_name := v_model.profile_name_snapshot;
      END IF;
      SELECT full_name INTO v_promoted_by_name FROM public.profiles WHERE id = v_model.promoted_by AND workspace_id = v_workspace_id;

      v_content_json := jsonb_build_object(
        'company_id', v_model.company_id,
        'company_name', v_company_name,
        'opportunity_id', v_model.opportunity_id,
        'opportunity_name', v_opportunity_name,
        'resource_type', v_model.resource_type,
        'resource_label', v_model.resource_label,
        'profile_name', v_profile_name,
        'start_date', v_model.start_date,
        'end_date', v_model.end_date,
        'business_days', v_model.business_days,
        'production_days', v_model.production_days,
        'sale_daily_rate', v_model.sale_daily_rate,
        'revenue_total', v_model.revenue_total,
        'expenses_total', v_model.expenses_total,
        'gross_margin_pct', v_model.gross_margin_pct,
        'warnings', v_model.warnings,
        'calculation_version', v_model.calculation_version,
        'promoted_at', v_model.promoted_at,
        'promoted_by_name', v_promoted_by_name
      );

      v_content_text := '# Référence Financière : ' || v_model.title || E'\n\n' ||
        '**Compte Client** : ' || coalesce(v_company_name, 'Non renseigné') || E'\n' ||
        '**Opportunité** : ' || coalesce(v_opportunity_name, 'Non renseignée') || E'\n' ||
        '**Ressource** : ' || coalesce(v_model.resource_label, 'Non renseignée') || ' (' || coalesce(v_model.resource_type, '') || ')' || E'\n' ||
        '**Profil / Rôle** : ' || coalesce(v_profile_name, 'Non renseigné') || E'\n\n' ||
        '## Paramètres de la Mission' || E'\n' ||
        '- **Date de Début** : ' || coalesce(to_char(v_model.start_date, 'DD/MM/YYYY'), 'Non renseignée') || E'\n' ||
        '- **Date de Fin** : ' || coalesce(to_char(v_model.end_date, 'DD/MM/YYYY'), 'Non renseignée') || E'\n' ||
        '- **Jours Ouvrés** : ' || coalesce(v_model.business_days::text, '0') || E'\n' ||
        '- **Jours de Production** : ' || coalesce(v_model.production_days::text, '0') || E'\n\n' ||
        '## Éléments Financiers' || E'\n' ||
        '- **Taux Journalier Moyen (TJM) Vente** : ' || coalesce(v_model.sale_daily_rate::text, '0') || ' EUR' || E'\n' ||
        '- **Chiffre d''Affaires Projeté** : ' || coalesce(v_model.revenue_total::text, '0') || ' EUR' || E'\n' ||
        '- **Total Frais Mission** : ' || coalesce(v_model.expenses_total::text, '0') || ' EUR' || E'\n' ||
        '- **Pourcentage de Marge Commerciale** : ' || coalesce(v_model.gross_margin_pct::text, '0') || ' %' || E'\n\n' ||
        '## Traçabilité' || E'\n' ||
        '- **Version du Moteur** : ' || coalesce(v_model.calculation_version, 'N/A') || E'\n' ||
        '- **Promu le** : ' || to_char(v_model.promoted_at, 'DD/MM/YYYY HH24:MI:SS') || ' par ' || coalesce(v_promoted_by_name, 'N/A') || E'\n';

      INSERT INTO public.intelligence_documents (
        workspace_id,
        owner_id,
        title,
        document_type,
        status,
        current_content_text,
        current_content_json,
        primary_entity_type,
        primary_entity_id,
        source_financial_model_id
      ) VALUES (
        v_workspace_id,
        v_user_id,
        v_model.title,
        'financial_reference',
        'ready',
        v_content_text,
        v_content_json,
        'opportunity',
        v_model.opportunity_id,
        p_model_id
      ) RETURNING id INTO v_doc_id;

      -- Créer la version
      INSERT INTO public.intelligence_document_versions (
        workspace_id,
        document_id,
        version_number,
        origin,
        content_text,
        content_json,
        created_by
      ) VALUES (
        v_workspace_id,
        v_doc_id,
        1,
        'generated',
        v_content_text,
        v_content_json,
        v_user_id
      );

      -- Créer les liens
      INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
      VALUES (v_workspace_id, v_doc_id, 'company', v_model.company_id)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
      VALUES (v_workspace_id, v_doc_id, 'opportunity', v_model.opportunity_id)
      ON CONFLICT DO NOTHING;

      IF v_model.resource_type = 'collaborator' AND v_model.collaborator_id IS NOT NULL THEN
        INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
        VALUES (v_workspace_id, v_doc_id, 'collaborator', v_model.collaborator_id)
        ON CONFLICT DO NOTHING;
      ELSIF v_model.resource_type = 'candidate' AND v_model.candidate_id IS NOT NULL THEN
        INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
        VALUES (v_workspace_id, v_doc_id, 'candidate', v_model.candidate_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- Retour direct sans modifications de promoted_at/promoted_by ni nouvelles versions
    RETURN QUERY SELECT p_model_id, v_doc_id;
    RETURN;
  END IF;

  -- Les transitions interdites
  IF v_model.status IN ('superseded', 'converted', 'archived') THEN
    RAISE EXCEPTION 'Impossible de promouvoir cette simulation dans son statut actuel (%).', v_model.status USING errcode = 'L0001';
  END IF;

  -- 4. vérifier tous les critères d'éligibilité pour les statuts draft et validated
  IF v_model.mode != 'full' THEN
    RAISE EXCEPTION 'La simulation doit être en mode complet (full) pour être promue.' USING errcode = 'L0001';
  END IF;

  IF v_model.company_id IS NULL THEN
    RAISE EXCEPTION 'Le compte client est obligatoire.' USING errcode = 'L0001';
  END IF;

  IF v_model.opportunity_id IS NULL THEN
    RAISE EXCEPTION 'L''opportunité est obligatoire.' USING errcode = 'L0001';
  END IF;

  -- vérifier l'appartenance de l'opportunité au compte
  IF NOT EXISTS (
    SELECT 1 FROM public.opportunities
    WHERE id = v_model.opportunity_id AND company_id = v_model.company_id AND workspace_id = v_workspace_id
  ) THEN
    RAISE EXCEPTION 'L''opportunité sélectionnée n''appartient pas au compte client choisi.' USING errcode = 'L0001';
  END IF;

  -- vérifier ressource valide
  IF v_model.resource_type = 'collaborator' AND v_model.collaborator_id IS NULL THEN
    RAISE EXCEPTION 'Un collaborateur valide doit être renseigné.' USING errcode = 'L0001';
  ELSIF v_model.resource_type = 'candidate' AND v_model.candidate_id IS NULL THEN
    RAISE EXCEPTION 'Un candidat valide doit être renseigné.' USING errcode = 'L0001';
  ELSIF v_model.resource_type = 'external' AND (v_model.resource_label IS NULL OR trim(v_model.resource_label) = '') THEN
    RAISE EXCEPTION 'Le libellé de la ressource externe est obligatoire.' USING errcode = 'L0001';
  END IF;

  -- vérifier profil ou rôle renseigné
  IF v_model.job_profile_id IS NULL THEN
    RAISE EXCEPTION 'Le profil ou rôle de la ressource est obligatoire.' USING errcode = 'L0001';
  END IF;

  -- vérifier start_date et end_date explicites
  IF v_model.start_date IS NULL OR v_model.end_date IS NULL THEN
    RAISE EXCEPTION 'Les dates de début et de fin de la mission doivent être explicites.' USING errcode = 'L0001';
  END IF;

  -- vérifier non simple projection de fin d'année
  IF v_model.projection_basis = 'year_end_default' THEN
    RAISE EXCEPTION 'La date de fin ne doit pas être une simple projection de fin d''année.' USING errcode = 'L0001';
  END IF;

  -- vérifier sale_daily_rate > 0
  IF v_model.sale_daily_rate IS NULL OR v_model.sale_daily_rate <= 0 THEN
    RAISE EXCEPTION 'Le TJM de vente doit être supérieur à zéro.' USING errcode = 'L0001';
  END IF;

  -- vérifier production_days > 0
  IF v_model.production_days IS NULL OR v_model.production_days <= 0 THEN
    RAISE EXCEPTION 'Le nombre de jours de production doit être supérieur à zéro.' USING errcode = 'L0001';
  END IF;

  -- vérifier warnings bloquants
  IF v_model.warnings @> '[{"code": "negative_margin"}]'::jsonb THEN
    RAISE EXCEPTION 'La marge commerciale est négative.' USING errcode = 'L0001';
  END IF;

  IF v_model.warnings @> '[{"code": "sales_rate_below_productive_cost"}]'::jsonb THEN
    RAISE EXCEPTION 'Le TJM de vente est inférieur au CJM productif calculé.' USING errcode = 'L0001';
  END IF;

  -- 5. verrouiller l'éventuelle référence active de l'opportunité
  SELECT id INTO v_old_ref_id
  FROM public.financial_models
  WHERE opportunity_id = v_model.opportunity_id
    AND workspace_id = v_workspace_id
    AND status = 'reference'
  FOR UPDATE;

  -- 6. passer l'ancienne référence en superseded
  IF v_old_ref_id IS NOT NULL AND v_old_ref_id != p_model_id THEN
    UPDATE public.financial_models
    SET status = 'superseded',
        superseded_by_id = p_model_id,
        superseded_at = now()
    WHERE id = v_old_ref_id;
  END IF;

  -- 7. passer la nouvelle simulation en reference
  UPDATE public.financial_models
  SET status = 'reference',
      promoted_by = v_user_id,
      promoted_at = now()
  WHERE id = p_model_id;

  -- 8. Récupérer les noms pour le document assaini
  SELECT name INTO v_company_name FROM public.companies WHERE id = v_model.company_id AND workspace_id = v_workspace_id;
  SELECT title INTO v_opportunity_name FROM public.opportunities WHERE id = v_model.opportunity_id AND workspace_id = v_workspace_id;
  SELECT title INTO v_profile_name FROM public.job_profiles WHERE id = v_model.job_profile_id AND workspace_id = v_workspace_id;
  IF v_profile_name IS NULL THEN
    v_profile_name := v_model.profile_name_snapshot;
  END IF;
  SELECT full_name INTO v_promoted_by_name FROM public.profiles WHERE id = v_user_id AND workspace_id = v_workspace_id;

  -- 9. Construire les données assainies
  v_content_json := jsonb_build_object(
    'company_id', v_model.company_id,
    'company_name', v_company_name,
    'opportunity_id', v_model.opportunity_id,
    'opportunity_name', v_opportunity_name,
    'resource_type', v_model.resource_type,
    'resource_label', v_model.resource_label,
    'profile_name', v_profile_name,
    'start_date', v_model.start_date,
    'end_date', v_model.end_date,
    'business_days', v_model.business_days,
    'production_days', v_model.production_days,
    'sale_daily_rate', v_model.sale_daily_rate,
    'revenue_total', v_model.revenue_total,
    'expenses_total', v_model.expenses_total,
    'gross_margin_pct', v_model.gross_margin_pct,
    'warnings', v_model.warnings,
    'calculation_version', v_model.calculation_version,
    'promoted_at', now(),
    'promoted_by_name', v_promoted_by_name
  );

  v_content_text := '# Référence Financière : ' || v_model.title || E'\n\n' ||
    '**Compte Client** : ' || coalesce(v_company_name, 'Non renseigné') || E'\n' ||
    '**Opportunité** : ' || coalesce(v_opportunity_name, 'Non renseignée') || E'\n' ||
    '**Ressource** : ' || coalesce(v_model.resource_label, 'Non renseignée') || ' (' || coalesce(v_model.resource_type, '') || ')' || E'\n' ||
    '**Profil / Rôle** : ' || coalesce(v_profile_name, 'Non renseigné') || E'\n\n' ||
    '## Paramètres de la Mission' || E'\n' ||
    '- **Date de Début** : ' || coalesce(to_char(v_model.start_date, 'DD/MM/YYYY'), 'Non renseignée') || E'\n' ||
    '- **Date de Fin** : ' || coalesce(to_char(v_model.end_date, 'DD/MM/YYYY'), 'Non renseignée') || E'\n' ||
    '- **Jours Ouvrés** : ' || coalesce(v_model.business_days::text, '0') || E'\n' ||
    '- **Jours de Production** : ' || coalesce(v_model.production_days::text, '0') || E'\n\n' ||
    '## Éléments Financiers' || E'\n' ||
    '- **Taux Journalier Moyen (TJM) Vente** : ' || coalesce(v_model.sale_daily_rate::text, '0') || ' EUR' || E'\n' ||
    '- **Chiffre d''Affaires Projeté** : ' || coalesce(v_model.revenue_total::text, '0') || ' EUR' || E'\n' ||
    '- **Total Frais Mission** : ' || coalesce(v_model.expenses_total::text, '0') || ' EUR' || E'\n' ||
    '- **Pourcentage de Marge Commerciale** : ' || coalesce(v_model.gross_margin_pct::text, '0') || ' %' || E'\n\n' ||
    '## Traçabilité' || E'\n' ||
    '- **Version du Moteur** : ' || coalesce(v_model.calculation_version, 'N/A') || E'\n' ||
    '- **Promu le** : ' || to_char(now(), 'DD/MM/YYYY HH24:MI:SS') || ' par ' || coalesce(v_promoted_by_name, 'N/A') || E'\n';

  -- 10. créer ou retrouver le document de référence financière
  SELECT id INTO v_doc_id
  FROM public.intelligence_documents
  WHERE source_financial_model_id = p_model_id
    AND document_type = 'financial_reference'
    AND workspace_id = v_workspace_id;

  IF v_doc_id IS NULL THEN
    INSERT INTO public.intelligence_documents (
      workspace_id,
      owner_id,
      title,
      document_type,
      status,
      current_content_text,
      current_content_json,
      primary_entity_type,
      primary_entity_id,
      source_financial_model_id
    ) VALUES (
      v_workspace_id,
      v_user_id,
      v_model.title,
      'financial_reference',
      'ready',
      v_content_text,
      v_content_json,
      'opportunity',
      v_model.opportunity_id,
      p_model_id
    ) RETURNING id INTO v_doc_id;
  ELSE
    UPDATE public.intelligence_documents
    SET title = v_model.title,
        status = 'ready',
        current_content_text = v_content_text,
        current_content_json = v_content_json,
        updated_at = now()
    WHERE id = v_doc_id;
  END IF;

  -- 11. créer la version
  DECLARE
    v_next_version integer;
    v_latest_content_text text;
  BEGIN
    -- Ne pas créer de version si identique
    SELECT content_text INTO v_latest_content_text
    FROM public.intelligence_document_versions
    WHERE public.intelligence_document_versions.document_id = v_doc_id AND workspace_id = v_workspace_id
    ORDER BY version_number DESC
    LIMIT 1;

    IF v_latest_content_text IS NULL OR v_latest_content_text <> v_content_text THEN
      SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
      FROM public.intelligence_document_versions
      WHERE public.intelligence_document_versions.document_id = v_doc_id AND workspace_id = v_workspace_id;

      INSERT INTO public.intelligence_document_versions (
        workspace_id,
        document_id,
        version_number,
        origin,
        content_text,
        content_json,
        created_by
      ) VALUES (
        v_workspace_id,
        v_doc_id,
        v_next_version,
        'generated',
        v_content_text,
        v_content_json,
        v_user_id
      );
    END IF;
  END;

  -- 12. créer les liens
  INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
  VALUES (v_workspace_id, v_doc_id, 'company', v_model.company_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
  VALUES (v_workspace_id, v_doc_id, 'opportunity', v_model.opportunity_id)
  ON CONFLICT DO NOTHING;

  IF v_model.resource_type = 'collaborator' AND v_model.collaborator_id IS NOT NULL THEN
    INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
    VALUES (v_workspace_id, v_doc_id, 'collaborator', v_model.collaborator_id)
    ON CONFLICT DO NOTHING;
  ELSIF v_model.resource_type = 'candidate' AND v_model.candidate_id IS NOT NULL THEN
    INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
    VALUES (v_workspace_id, v_doc_id, 'candidate', v_model.candidate_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT p_model_id, v_doc_id;
END;
$$;


-- 4. RPC permissions restrictions
REVOKE EXECUTE ON FUNCTION public.promote_financial_model_to_reference(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.promote_financial_model_to_reference(uuid) TO authenticated, service_role;

COMMIT;
