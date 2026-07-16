BEGIN;

-- Helper assertions
CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_condition boolean, p_message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT coalesce(p_condition, false) THEN
    RAISE EXCEPTION 'assertion_failed: %', p_message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.expect_exception(
  p_sql text,
  p_expected_message text,
  p_context text,
  p_expected_sqlstate text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_state text;
  v_message text;
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'assertion_failed: % (expected exception %)', p_context, p_expected_message;
EXCEPTION
  WHEN others THEN
    GET STACKED DIAGNOSTICS
      v_state = returned_sqlstate,
      v_message = message_text;

    IF p_expected_sqlstate IS NOT NULL AND v_state IS DISTINCT FROM p_expected_sqlstate THEN
      RAISE EXCEPTION 'assertion_failed: % (sqlstate %, expected %, message=%)', p_context, v_state, p_expected_sqlstate, v_message;
    END IF;

    IF position(p_expected_message IN v_message) = 0 THEN
      RAISE EXCEPTION 'assertion_failed: % (message %, expected substring %)', p_context, v_message, p_expected_message;
    END IF;
END;
$$;

-- Setup test context in session variables to avoid temp table grants
DO $$
DECLARE
  v_actor_id uuid;
  v_workspace_id uuid;
  v_practice_id uuid;
  v_other_workspace_id uuid := gen_random_uuid();
  v_other_company_id uuid := gen_random_uuid();
BEGIN
  SELECT p.id, p.workspace_id, op.id
  INTO v_actor_id, v_workspace_id, v_practice_id
  FROM public.profiles p
  JOIN public.offer_practices op ON op.workspace_id = p.workspace_id AND op.is_active = true
  WHERE p.workspace_id IS NOT NULL
    AND p.role IN ('owner', 'admin')
  LIMIT 1;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'An admin/owner profile, workspace and practice are required for the financial modeling tests.';
  END IF;

  PERFORM set_config('test.actor_id', v_actor_id::text, true);
  PERFORM set_config('test.workspace_id', v_workspace_id::text, true);
  PERFORM set_config('test.practice_id', v_practice_id::text, true);
  PERFORM set_config('test.other_workspace_id', v_other_workspace_id::text, true);
  PERFORM set_config('test.other_company_id', v_other_company_id::text, true);
END;
$$;

-- Seed other workspace for cross-tenant tests
INSERT INTO public.workspaces (id, name, owner_id)
VALUES (
  current_setting('test.other_workspace_id')::uuid,
  'Other workspace',
  current_setting('test.actor_id')::uuid
);

INSERT INTO public.companies (id, workspace_id, owner_id, name)
VALUES (
  current_setting('test.other_company_id')::uuid,
  current_setting('test.other_workspace_id')::uuid,
  current_setting('test.actor_id')::uuid,
  'Other company'
);

-- Create a valid model outside the actor's workspace before enabling RLS.
-- The call itself happens below as authenticated and must not see this row.
DO $$
DECLARE
  v_other_workspace_id uuid := current_setting('test.other_workspace_id')::uuid;
  v_other_company_id uuid := current_setting('test.other_company_id')::uuid;
  v_practice_id uuid := current_setting('test.practice_id')::uuid;
  v_other_opportunity_id uuid := gen_random_uuid();
  v_other_job_profile_id uuid := gen_random_uuid();
  v_other_model_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.opportunities (id, workspace_id, title, company_id, stage, target_daily_rate, start_date)
  VALUES (v_other_opportunity_id, v_other_workspace_id, 'Other opportunity', v_other_company_id, 'qualification', 600, date '2026-09-01');

  INSERT INTO public.job_profiles (id, workspace_id, practice_id, title, main_mission, version, source)
  VALUES (v_other_job_profile_id, v_other_workspace_id, v_practice_id, 'Other consultant', 'Mission', 'v1', 'internal');

  INSERT INTO public.financial_models (
    id, workspace_id, title, mode, status, resource_type, resource_cost_model, job_profile_id,
    company_id, opportunity_id, start_date, end_date, projection_basis, business_days, production_days, sale_daily_rate,
    external_daily_cost_snapshot, resource_cost_total, expenses_total, total_costs, revenue_total,
    gross_margin_amount, acv, tcv, warnings, assumptions, calculation_version, resource_label, forecast_activity_rate
  ) VALUES (
    v_other_model_id, v_other_workspace_id, 'Other workspace model', 'full', 'draft', 'external', 'subcontractor_daily_rate', v_other_job_profile_id,
    v_other_company_id, v_other_opportunity_id, date '2026-09-01', date '2026-12-31', 'explicit_end_date', 80, 70, 700,
    400, 28000, 1000, 29000, 49000,
    20000, 49000, 49000, '[]'::jsonb, '{}'::jsonb, 'v1.0', 'External subcontractor', 0.85
  );

  PERFORM set_config('test.other_model_id', v_other_model_id::text, true);
END;
$$;

-- Set up session configuration mimicking a logged in user
SELECT set_config(
  'request.jwt.claim.sub',
  current_setting('test.actor_id'),
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL role authenticated;

SELECT pg_temp.assert_true(
  pg_get_functiondef('public.promote_financial_model_to_reference(uuid)'::regprocedure)
    LIKE '%private.is_workspace_admin()%',
  'Promotion must retain the private.is_workspace_admin() authorization gate.'
);

DO $$
DECLARE
  v_actor_id uuid := current_setting('test.actor_id')::uuid;
  v_workspace_id uuid := current_setting('test.workspace_id')::uuid;
  v_practice_id uuid := current_setting('test.practice_id')::uuid;

  v_company_id uuid := gen_random_uuid();
  v_opportunity_id uuid := gen_random_uuid();
  v_job_profile_id uuid := gen_random_uuid();
  v_collaborator_id uuid := gen_random_uuid();
  v_person_id uuid := gen_random_uuid();

  -- Models
  v_draft_id uuid := gen_random_uuid();
  v_validated_id uuid := gen_random_uuid();
  v_model_json jsonb;

  v_ref_res record;
  v_ref2_res record;
  v_idem_res record;

  v_doc_count integer;
  v_ver_count integer;
  v_link_count integer;

  v_status text;
  v_superseded_by uuid;
  v_doc_json jsonb;
  v_doc_text text;
  v_promoted_at timestamptz;
  v_promoted_by uuid;
BEGIN
  -- 1. Create entities inside correct workspace
  INSERT INTO public.persons (id, workspace_id, first_name, last_name)
  VALUES (v_person_id, v_workspace_id, 'Test', 'Person');

  INSERT INTO public.companies (id, workspace_id, name)
  VALUES (v_company_id, v_workspace_id, 'Client Test');

  INSERT INTO public.opportunities (id, workspace_id, title, company_id, stage, target_daily_rate, start_date)
  VALUES (v_opportunity_id, v_workspace_id, 'Opp Test', v_company_id, 'qualification', 600, date '2026-09-01');

  INSERT INTO public.job_profiles (id, workspace_id, practice_id, title, main_mission, version, source)
  VALUES (v_job_profile_id, v_workspace_id, v_practice_id, 'Consultant', 'Mission', 'v1', 'internal');

  INSERT INTO public.collaborators (id, workspace_id, person_id, current_title, seniority, status, job_profile_id, employment_status)
  VALUES (v_collaborator_id, v_workspace_id, v_person_id, 'Consultant', 'senior', 'actif', v_job_profile_id, 'cadre');

  -- Base model JSON
  v_model_json := jsonb_build_object(
    'title', 'Simulation Test',
    'mode', 'full',
    'status', 'draft',
    'resource_type', 'collaborator',
    'resource_cost_model', 'salaried',
    'collaborator_id', v_collaborator_id,
    'job_profile_id', v_job_profile_id,
    'company_id', v_company_id,
    'opportunity_id', v_opportunity_id,
    'start_date', '2026-09-01',
    'end_date', '2026-12-31',
    'projection_basis', 'explicit_end_date',
    'business_days', 80,
    'production_days', 70,
    'sale_daily_rate', 700,
    'annual_employer_cost', 72500,
    'productive_daily_cost', 390,
    'gross_annual_snapshot', 50000,
    'charges_rate_snapshot', 0.45,
    'revenue_total', 49000,
    'expenses_total', 1000,
    'gross_margin_pct', 25,
    'warnings', '[]'::jsonb
  );

  -- Insert Draft Model (with all required fields so that it can transition to reference status successfully)
  INSERT INTO public.financial_models (
    id, workspace_id, title, mode, status, resource_type, resource_cost_model, collaborator_id, job_profile_id,
    company_id, opportunity_id, start_date, end_date, projection_basis, business_days, production_days, sale_daily_rate,
    annual_employer_cost, productive_daily_cost, gross_annual_snapshot, charges_rate_snapshot, revenue_total, expenses_total, gross_margin_pct, warnings, calculation_version, resource_label,
    forecast_activity_rate, resource_cost_total, total_costs, gross_margin_amount, acv, tcv, assumptions,
    projection_end_date, variable_pay_snapshot, annual_working_days_snapshot, base_daily_cost, salary_cost_total
  ) VALUES (
    v_draft_id, v_workspace_id, 'Simulation Draft', 'full', 'draft', 'collaborator', 'salaried', v_collaborator_id, v_job_profile_id,
    v_company_id, v_opportunity_id, date '2026-09-01', date '2026-12-31', 'explicit_end_date', 80, 70, 700,
    72500, 390, 50000, 0.45, 49000, 1000, 25, '[]'::jsonb, 'v1.0', 'Test Person',
    0.85, 72500, 73500, 12250, 49000, 49000, '{}'::jsonb,
    date '2026-12-31', 0, 218, 332.57, 72500
  );

  -- Insert Validated Model (fully completed for constraint check when reference)
  INSERT INTO public.financial_models (
    id, workspace_id, title, mode, status, resource_type, resource_cost_model, collaborator_id, job_profile_id,
    company_id, opportunity_id, start_date, end_date, projection_basis, business_days, production_days, sale_daily_rate,
    annual_employer_cost, productive_daily_cost, gross_annual_snapshot, charges_rate_snapshot, revenue_total, expenses_total, gross_margin_pct, warnings, calculation_version, resource_label,
    forecast_activity_rate, resource_cost_total, total_costs, gross_margin_amount, acv, tcv, assumptions,
    projection_end_date, variable_pay_snapshot, annual_working_days_snapshot, base_daily_cost, salary_cost_total
  ) VALUES (
    v_validated_id, v_workspace_id, 'Simulation Validated', 'full', 'validated', 'collaborator', 'salaried', v_collaborator_id, v_job_profile_id,
    v_company_id, v_opportunity_id, date '2026-09-01', date '2026-12-31', 'explicit_end_date', 80, 70, 700,
    72500, 390, 50000, 0.45, 49000, 1000, 25, '[]'::jsonb, 'v1.0', 'Test Person',
    0.85, 72500, 73500, 12250, 49000, 49000, '{}'::jsonb,
    date '2026-12-31', 0, 218, 332.57, 72500
  );


  -- --- TEST 1: Promote draft to reference ---
  SELECT * INTO v_ref_res FROM public.promote_financial_model_to_reference(v_draft_id);

  SELECT status INTO v_status FROM public.financial_models WHERE id = v_draft_id;
  PERFORM pg_temp.assert_true(v_status = 'reference', 'Draft should be promoted to reference.');

  -- Verify document was created
  SELECT count(*) INTO v_doc_count FROM public.intelligence_documents WHERE id = v_ref_res.document_id;
  PERFORM pg_temp.assert_true(v_doc_count = 1, 'Document should be created.');


  -- --- TEST 2: Assainissement checks (No salary, charges, CJM or internal costs) ---
  SELECT current_content_json, current_content_text INTO v_doc_json, v_doc_text FROM public.intelligence_documents WHERE id = v_ref_res.document_id;

  PERFORM pg_temp.assert_true(NOT (v_doc_json ? 'annual_employer_cost'), 'Should not contain annual_employer_cost');
  PERFORM pg_temp.assert_true(NOT (v_doc_json ? 'productive_daily_cost'), 'Should not contain productive_daily_cost');
  PERFORM pg_temp.assert_true(NOT (v_doc_json ? 'gross_annual_snapshot'), 'Should not contain gross_annual_snapshot');
  PERFORM pg_temp.assert_true(NOT (v_doc_json ? 'charges_rate_snapshot'), 'Should not contain charges_rate_snapshot');
  PERFORM pg_temp.assert_true(NOT (v_doc_json ? 'resource_cost_total'), 'Should not contain resource_cost_total');
  PERFORM pg_temp.assert_true(NOT (v_doc_json ? 'total_costs'), 'Should not contain total_costs');

  PERFORM pg_temp.assert_true(position('Salaire' in v_doc_text) = 0, 'Should not mention Salaire in text');
  PERFORM pg_temp.assert_true(position('CJM' in v_doc_text) = 0, 'Should not mention CJM in text');
  PERFORM pg_temp.assert_true(position('Charges' in v_doc_text) = 0, 'Should not mention Charges in text');
  PERFORM pg_temp.assert_true(position('Coût ressource' in v_doc_text) = 0, 'Should not mention resource cost in text');
  PERFORM pg_temp.assert_true(position('Coût total interne' in v_doc_text) = 0, 'Should not mention total internal cost in text');


  -- --- TEST 3: Idempotence of active reference ---
  SELECT count(*) INTO v_ver_count FROM public.intelligence_document_versions WHERE document_id = v_ref_res.document_id;
  SELECT count(*) INTO v_link_count FROM public.intelligence_document_links WHERE document_id = v_ref_res.document_id;
  SELECT promoted_at, promoted_by INTO v_promoted_at, v_promoted_by FROM public.financial_models WHERE id = v_draft_id;

  SELECT * INTO v_idem_res FROM public.promote_financial_model_to_reference(v_draft_id);
  PERFORM pg_temp.assert_true(v_idem_res.model_id = v_draft_id AND v_idem_res.document_id = v_ref_res.document_id, 'Idempotent call should return the same IDs.');

  -- Verify no new versions, documents or links were created
  SELECT count(*) INTO v_doc_count FROM public.intelligence_documents WHERE source_financial_model_id = v_draft_id;
  PERFORM pg_temp.assert_true(v_doc_count = 1, 'Should not create duplicate document.');

  SELECT count(*) INTO v_ver_count FROM public.intelligence_document_versions WHERE document_id = v_ref_res.document_id;
  PERFORM pg_temp.assert_true(v_ver_count = 1, 'Should not create duplicate version.');

  PERFORM pg_temp.assert_true(
    (SELECT count(*) FROM public.intelligence_document_links WHERE document_id = v_ref_res.document_id) = v_link_count,
    'Should not recreate document links.'
  );
  PERFORM pg_temp.assert_true(
    (SELECT promoted_at FROM public.financial_models WHERE id = v_draft_id) = v_promoted_at
    AND (SELECT promoted_by FROM public.financial_models WHERE id = v_draft_id) = v_promoted_by,
    'Idempotent promotion must preserve promoted_at and promoted_by.'
  );


  -- --- TEST 4: Promote validated to reference (Remplacement) ---
  SELECT * INTO v_ref2_res FROM public.promote_financial_model_to_reference(v_validated_id);

  -- Verify previous reference became superseded
  SELECT status, superseded_by_id INTO v_status, v_superseded_by FROM public.financial_models WHERE id = v_draft_id;
  PERFORM pg_temp.assert_true(v_status = 'superseded', 'Old reference status should be superseded.');
  PERFORM pg_temp.assert_true(v_superseded_by = v_validated_id, 'Old reference superseded_by_id should point to new reference.');

  -- Verify new reference is active
  SELECT status INTO v_status FROM public.financial_models WHERE id = v_validated_id;
  PERFORM pg_temp.assert_true(v_status = 'reference', 'New reference status should be reference.');


  -- --- TEST 5: Locked statuses cannot be promoted ---
  PERFORM pg_temp.expect_exception(
    format('SELECT public.promote_financial_model_to_reference(%L)', v_draft_id),
    'Impossible de promouvoir cette simulation dans son statut actuel (superseded)',
    'Should refuse promoting a superseded model'
  );

  DECLARE
    v_converted_id uuid := gen_random_uuid();
    v_archived_id uuid := gen_random_uuid();
  BEGIN
    INSERT INTO public.financial_models (
      id, workspace_id, title, mode, status, resource_type, resource_cost_model, collaborator_id, job_profile_id,
      company_id, opportunity_id, start_date, end_date, projection_basis, business_days, production_days, sale_daily_rate,
      annual_employer_cost, productive_daily_cost, gross_annual_snapshot, charges_rate_snapshot, revenue_total, expenses_total, gross_margin_pct, warnings, calculation_version, resource_label,
      forecast_activity_rate, resource_cost_total, total_costs, gross_margin_amount, acv, tcv, assumptions,
      projection_end_date, variable_pay_snapshot, annual_working_days_snapshot, base_daily_cost, salary_cost_total
    ) VALUES
      (v_converted_id, v_workspace_id, 'Converted', 'full', 'converted', 'collaborator', 'salaried', v_collaborator_id, v_job_profile_id,
       v_company_id, v_opportunity_id, date '2026-09-01', date '2026-12-31', 'explicit_end_date', 80, 70, 700,
       72500, 390, 50000, 0.45, 49000, 1000, 25, '[]'::jsonb, 'v1.0', 'Test Person',
       0.85, 72500, 73500, 12250, 49000, 49000, '{}'::jsonb,
       date '2026-12-31', 0, 218, 332.57, 72500),
      (v_archived_id, v_workspace_id, 'Archived', 'full', 'archived', 'collaborator', 'salaried', v_collaborator_id, v_job_profile_id,
       v_company_id, v_opportunity_id, date '2026-09-01', date '2026-12-31', 'explicit_end_date', 80, 70, 700,
       72500, 390, 50000, 0.45, 49000, 1000, 25, '[]'::jsonb, 'v1.0', 'Test Person',
       0.85, 72500, 73500, 12250, 49000, 49000, '{}'::jsonb,
       date '2026-12-31', 0, 218, 332.57, 72500);

    PERFORM pg_temp.expect_exception(
      format('SELECT public.promote_financial_model_to_reference(%L)', v_converted_id),
      'Impossible de promouvoir cette simulation dans son statut actuel (converted)',
      'Should refuse promoting a converted model'
    );
    PERFORM pg_temp.expect_exception(
      format('SELECT public.promote_financial_model_to_reference(%L)', v_archived_id),
      'Impossible de promouvoir cette simulation dans son statut actuel (archived)',
      'Should refuse promoting an archived model'
    );
  END;


  -- --- TEST 6: Immutability under save_financial_model_snapshot ---
  -- Refuse saving when current status is reference
  PERFORM pg_temp.expect_exception(
    format('SELECT public.save_financial_model_snapshot(%L, %L, %L, %L)', v_validated_id, now(), v_model_json, '[]'::jsonb),
    'Cette référence financière est immuable. Dupliquez-la pour créer une nouvelle révision.',
    'Should refuse saving changes to an active reference'
  );

  -- Refuse saving when current status is superseded
  PERFORM pg_temp.expect_exception(
    format('SELECT public.save_financial_model_snapshot(%L, %L, %L, %L)', v_draft_id, now(), v_model_json, '[]'::jsonb),
    'Cette référence financière est immuable. Dupliquez-la pour créer une nouvelle révision.',
    'Should refuse saving changes to a superseded reference'
  );


  -- --- TEST 7: Immutability under archive_financial_model ---
  -- Refuse archiving active reference
  PERFORM pg_temp.expect_exception(
    format('SELECT public.archive_financial_model(%L)', v_validated_id),
    'Impossible d''archiver une simulation avec le statut reference',
    'Should refuse archiving active reference'
  );

  -- Refuse archiving superseded reference
  PERFORM pg_temp.expect_exception(
    format('SELECT public.archive_financial_model(%L)', v_draft_id),
    'Impossible d''archiver une simulation avec le statut superseded',
    'Should refuse archiving superseded reference'
  );


  -- --- TEST 8: Archive draft and validated is allowed ---
  DECLARE
    v_draft_to_archive_id uuid := gen_random_uuid();
    v_validated_to_archive_id uuid := gen_random_uuid();
  BEGIN
    INSERT INTO public.financial_models (
      id, workspace_id, title, mode, status, resource_type, resource_cost_model, collaborator_id, job_profile_id,
      company_id, opportunity_id, start_date, end_date, projection_basis, business_days, production_days, sale_daily_rate,
      annual_employer_cost, productive_daily_cost, gross_annual_snapshot, charges_rate_snapshot, revenue_total, expenses_total, gross_margin_pct, warnings, calculation_version, resource_label,
      forecast_activity_rate, resource_cost_total, total_costs, gross_margin_amount, acv, tcv, assumptions,
      projection_end_date, variable_pay_snapshot, annual_working_days_snapshot, base_daily_cost, salary_cost_total
    ) VALUES
      (v_draft_to_archive_id, v_workspace_id, 'Draft To Archive', 'full', 'draft', 'collaborator', 'salaried', v_collaborator_id, v_job_profile_id,
       v_company_id, v_opportunity_id, date '2026-09-01', date '2026-12-31', 'explicit_end_date', 80, 70, 700,
       72500, 390, 50000, 0.45, 49000, 1000, 25, '[]'::jsonb, 'v1.0', 'Test Person',
       0.85, 72500, 73500, 12250, 49000, 49000, '{}'::jsonb,
       date '2026-12-31', 0, 218, 332.57, 72500),
      (v_validated_to_archive_id, v_workspace_id, 'Validated To Archive', 'full', 'validated', 'collaborator', 'salaried', v_collaborator_id, v_job_profile_id,
       v_company_id, v_opportunity_id, date '2026-09-01', date '2026-12-31', 'explicit_end_date', 80, 70, 700,
       72500, 390, 50000, 0.45, 49000, 1000, 25, '[]'::jsonb, 'v1.0', 'Test Person',
       0.85, 72500, 73500, 12250, 49000, 49000, '{}'::jsonb,
       date '2026-12-31', 0, 218, 332.57, 72500);

    PERFORM public.archive_financial_model(v_draft_to_archive_id);
    SELECT status INTO v_status FROM public.financial_models WHERE id = v_draft_to_archive_id;
    PERFORM pg_temp.assert_true(v_status = 'archived', 'Draft should be archivable.');

    PERFORM public.archive_financial_model(v_validated_to_archive_id);
    SELECT status INTO v_status FROM public.financial_models WHERE id = v_validated_to_archive_id;
    PERFORM pg_temp.assert_true(v_status = 'archived', 'Validated should be archivable.');
  END;


  -- --- TEST 9: Concurrency check: Never two active references ---
  SELECT count(*) INTO v_doc_count
  FROM public.financial_models
  WHERE opportunity_id = v_opportunity_id
    AND status = 'reference'
    AND workspace_id = v_workspace_id;
  PERFORM pg_temp.assert_true(v_doc_count = 1, 'Should have exactly one active reference for the opportunity.');


  -- --- TEST 10: RLS / cross-tenant validation ---
  -- Try promoting a model belonging to another workspace
  PERFORM pg_temp.expect_exception(
    format('SELECT public.promote_financial_model_to_reference(%L)', current_setting('test.other_model_id')),
    'Simulation introuvable dans ce workspace.',
    'Should not allow promoting a model from another workspace'
  );

END;
$$;

ROLLBACK;
