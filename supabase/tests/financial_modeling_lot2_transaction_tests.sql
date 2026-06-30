BEGIN;

-- Helper assertions
CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_condition boolean, p_message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT COALESCE(p_condition, false) THEN
    RAISE EXCEPTION 'assertion_failed: %', p_message;
  END IF;
END;
$$;

DO $$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
  v_other_user_id uuid;
  
  v_model_id uuid;
  v_status text;
  v_updated_at timestamptz;
  
  v_model_id2 uuid;
  v_status2 text;
  v_updated_at2 timestamptz;
  
  v_draft_id uuid;
  v_draft_status text;
  v_draft_updated_at timestamptz;
  v_draft_id2 uuid;
  v_draft_status2 text;
  v_draft_updated_at2 timestamptz;
  
  v_val_id uuid;
  v_val_status text;
  v_val_updated_at timestamptz;
  v_val_id2 uuid;
  v_val_status2 text;
  v_val_updated_at2 timestamptz;
  
  v_val_by uuid;
  v_val_at timestamptz;
  v_val_by2 uuid;
  v_val_at2 timestamptz;
  v_draft_by uuid;
  v_draft_at timestamptz;
  
  v_model_id_arch uuid;
  v_status_arch text;
  v_updated_at_arch timestamptz;
  
  v_model jsonb;
  v_expenses jsonb;
  v_count integer;
  v_err_msg text;
  v_err_code text;
  v_title text;
BEGIN
  -- Retrieve existing workspace and profile to run tests within correct tenant context
  SELECT id INTO v_workspace_id FROM public.workspaces LIMIT 1;
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  
  PERFORM pg_temp.assert_true(v_workspace_id IS NOT NULL, 'Require at least one workspace to run tests');
  PERFORM pg_temp.assert_true(v_user_id IS NOT NULL, 'Require at least one profile/user to run tests');

  -- Set session variables for tenant context simulation
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_user_id), true);

  -- Base model payload
  v_model := format('{
    "title": "Simulation Test SQL",
    "mode": "full",
    "status": "draft",
    "calculation_version": "financial-model-v1",
    "currency": "EUR",
    "resource_type": "external",
    "resource_cost_model": "subcontractor_daily_rate",
    "resource_label": "Prestataire SQL",
    "forecast_activity_rate": 1.0,
    "start_date": "2026-01-01",
    "end_date": "2026-03-31",
    "projection_end_date": "2026-03-31",
    "projection_basis": "explicit_end_date",
    "business_days": 65,
    "production_days": 65,
    "sale_daily_rate": 700,
    "external_daily_cost_snapshot": 450,
    "resource_cost_total": 29250,
    "expenses_total": 0,
    "total_costs": 29250,
    "revenue_total": 45500,
    "gross_margin_amount": 16250,
    "gross_margin_pct": 35.71,
    "acv": 152600,
    "tcv": 45500
  }')::jsonb;
  v_expenses := '[]'::jsonb;

  -- =========================================================================
  -- Scenario 1 : création avec p_model_id = null
  -- =========================================================================
  SELECT id, status, updated_at
  INTO v_model_id, v_status, v_updated_at
  FROM public.save_financial_model_snapshot(null, null, v_model, v_expenses);

  PERFORM pg_temp.assert_true(v_model_id IS NOT NULL, 'S1: RPC save must return generated id');
  PERFORM pg_temp.assert_true(v_status = 'draft', 'S1: status should be draft');

  SELECT COUNT(*) INTO v_count FROM public.financial_models WHERE id = v_model_id;
  PERFORM pg_temp.assert_true(v_count = 1, 'S1: model must exist in table');

  -- =========================================================================
  -- Scenario 2 : mise à jour d’un modèle existant
  -- =========================================================================
  v_model := jsonb_set(v_model, '{title}', '"Simulation Test SQL Modified"'::jsonb);
  
  SELECT id, status, updated_at
  INTO v_model_id2, v_status2, v_updated_at2
  FROM public.save_financial_model_snapshot(v_model_id, v_updated_at, v_model, v_expenses);

  PERFORM pg_temp.assert_true(v_model_id2 = v_model_id, 'S2: ID must not change during update');
  
  SELECT title INTO v_title FROM public.financial_models WHERE id = v_model_id;
  PERFORM pg_temp.assert_true(v_title = 'Simulation Test SQL Modified', 'S2: title must be updated in DB');

  -- =========================================================================
  -- Scenario 3 : identifiant fourni mais introuvable dans le workspace courant -> P0002
  -- =========================================================================
  BEGIN
    SELECT id, status, updated_at
    FROM public.save_financial_model_snapshot(gen_random_uuid(), null, v_model, v_expenses);
    RAISE EXCEPTION 'Expected error P0002 for missing ID';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT, v_err_code = RETURNED_SQLSTATE;
    IF v_err_code <> 'P0002' THEN
      RAISE EXCEPTION 'S3: Expected P0002, got % (%)', v_err_msg, v_err_code;
    END IF;
  END;

  -- =========================================================================
  -- Scenario 4 : statut converted refusé lors de la sauvegarde -> L0001
  -- =========================================================================
  BEGIN
    v_model := jsonb_set(v_model, '{status}', '"converted"'::jsonb);
    SELECT id, status, updated_at
    FROM public.save_financial_model_snapshot(v_model_id, v_updated_at2, v_model, v_expenses);
    RAISE EXCEPTION 'Expected error L0001 for converted status';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT, v_err_code = RETURNED_SQLSTATE;
    IF v_err_code <> 'L0001' THEN
      RAISE EXCEPTION 'S4: Expected L0001, got % (%)', v_err_msg, v_err_code;
    END IF;
  END;

  -- =========================================================================
  -- Scenario 5 : statut archived refusé par la RPC de sauvegarde -> L0001
  -- =========================================================================
  BEGIN
    v_model := jsonb_set(v_model, '{status}', '"archived"'::jsonb);
    SELECT id, status, updated_at
    FROM public.save_financial_model_snapshot(v_model_id, v_updated_at2, v_model, v_expenses);
    RAISE EXCEPTION 'Expected error L0001 for archived status';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT, v_err_code = RETURNED_SQLSTATE;
    IF v_err_code <> 'L0001' THEN
      RAISE EXCEPTION 'S5: Expected L0001, got % (%)', v_err_msg, v_err_code;
    END IF;
  END;

  -- =========================================================================
  -- Scenario 6 : archivage possible via archive_financial_model
  -- =========================================================================
  SELECT id, status, updated_at
  INTO v_model_id_arch, v_status_arch, v_updated_at_arch
  FROM public.archive_financial_model(v_model_id);

  PERFORM pg_temp.assert_true(v_status_arch = 'archived', 'S6: Status must become archived');

  -- =========================================================================
  -- Scenario 7 : draft -> validated renseigne les métadonnées
  -- =========================================================================
  -- Create a new draft
  v_model := jsonb_set(v_model, '{status}', '"draft"'::jsonb);
  v_model := jsonb_set(v_model, '{title}', '"Simulation Transition Test"'::jsonb);
  SELECT id, status, updated_at
  INTO v_draft_id, v_draft_status, v_draft_updated_at
  FROM public.save_financial_model_snapshot(null, null, v_model, v_expenses);

  -- Transition draft -> validated
  v_model := jsonb_set(v_model, '{status}', '"validated"'::jsonb);
  SELECT id, status, updated_at
  INTO v_val_id, v_val_status, v_val_updated_at
  FROM public.save_financial_model_snapshot(v_draft_id, v_draft_updated_at, v_model, v_expenses);

  SELECT validated_by, validated_at INTO v_val_by, v_val_at
  FROM public.financial_models WHERE id = v_draft_id;

  PERFORM pg_temp.assert_true(v_val_by = v_user_id, 'S7: validated_by must be current user');
  PERFORM pg_temp.assert_true(v_val_at IS NOT NULL, 'S7: validated_at must be populated');

  -- =========================================================================
  -- Scenario 8 : validated -> validated conserve la date validated_at initiale
  -- =========================================================================
  v_model := jsonb_set(v_model, '{title}', '"Simulation Transition Test Modified"'::jsonb);
  
  -- Run a non-status-changing update
  SELECT id, status, updated_at
  INTO v_val_id2, v_val_status2, v_val_updated_at2
  FROM public.save_financial_model_snapshot(v_draft_id, v_val_updated_at, v_model, v_expenses);

  SELECT validated_by, validated_at INTO v_val_by2, v_val_at2
  FROM public.financial_models WHERE id = v_draft_id;

  PERFORM pg_temp.assert_true(v_val_by2 = v_val_by, 'S8: validated_by must not change');
  PERFORM pg_temp.assert_true(v_val_at2 = v_val_at, 'S8: validated_at must be conserved');

  -- =========================================================================
  -- Scenario 9 : validated -> draft efface les métadonnées
  -- =========================================================================
  v_model := jsonb_set(v_model, '{status}', '"draft"'::jsonb);
  
  SELECT id, status, updated_at
  INTO v_draft_id2, v_draft_status2, v_draft_updated_at2
  FROM public.save_financial_model_snapshot(v_draft_id, v_val_updated_at2, v_model, v_expenses);

  SELECT validated_by, validated_at INTO v_draft_by, v_draft_at
  FROM public.financial_models WHERE id = v_draft_id;

  PERFORM pg_temp.assert_true(v_draft_by IS NULL, 'S9: validated_by must be cleared');
  PERFORM pg_temp.assert_true(v_draft_at IS NULL, 'S9: validated_at must be cleared');

  -- =========================================================================
  -- Scenario 10 : rollback intégral si une dépense est invalide
  -- =========================================================================
  -- We add a negative unit amount expense which violates check constraints on financial_model_expenses
  v_expenses := '[
    {
      "category": "travel",
      "label": "Invalid Expense",
      "calculation_mode": "fixed",
      "unit_amount": -100.00,
      "quantity": 1.00,
      "total_amount_snapshot": -100.00,
      "sort_order": 0
    }
  ]'::jsonb;

  BEGIN
    -- Try updating draft model with invalid expense
    SELECT id, status, updated_at
    FROM public.save_financial_model_snapshot(v_draft_id, v_draft_updated_at2, v_model, v_expenses);
    RAISE EXCEPTION 'Expected constraint check error on invalid expense';
  EXCEPTION WHEN OTHERS THEN
    -- Verify constraint failure was caught
    GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT, v_err_code = RETURNED_SQLSTATE;
    IF v_err_code <> '23514' THEN
      RAISE EXCEPTION 'S10: Expected CHECK violation (23514), got % (%)', v_err_msg, v_err_code;
    END IF;
  END;

  -- Verify no expenses were actually written (rollback check)
  SELECT COUNT(*) INTO v_count FROM public.financial_model_expenses WHERE financial_model_id = v_draft_id;
  PERFORM pg_temp.assert_true(v_count = 0, 'S10: No expenses should exist due to transactional rollback');

  -- =========================================================================
  -- Scenario 11 : absence d’accès anon
  -- =========================================================================
  PERFORM pg_temp.assert_true(
    NOT has_function_privilege('anon', 'public.save_financial_model_snapshot(uuid, timestamptz, jsonb, jsonb)', 'execute'),
    'S11: anon must not execute save_financial_model_snapshot'
  );
  PERFORM pg_temp.assert_true(
    NOT has_function_privilege('anon', 'public.archive_financial_model(uuid)', 'execute'),
    'S11: anon must not execute archive_financial_model'
  );

  -- =========================================================================
  -- Scenario 12 : contrôle du workspace (multi-tenant isolation)
  -- =========================================================================
  v_other_user_id := gen_random_uuid();

  -- Switch context to a non-existent user profile, causing private.current_workspace_id() to resolve to null
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_other_user_id), true);

  -- Try updating model belonging to the first workspace
  BEGIN
    SELECT id, status, updated_at
    FROM public.save_financial_model_snapshot(v_draft_id, v_draft_updated_at2, v_model, '[]'::jsonb);
    RAISE EXCEPTION 'Expected error P0002 for cross-workspace update attempt';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT, v_err_code = RETURNED_SQLSTATE;
    IF v_err_code <> 'P0002' THEN
      RAISE EXCEPTION 'S12: Expected P0002, got % (%)', v_err_msg, v_err_code;
    END IF;
  END;

END;
$$;

ROLLBACK;
