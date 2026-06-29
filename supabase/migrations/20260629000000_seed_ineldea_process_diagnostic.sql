-- Seed INELDEA process diagnostic (phase 3)
-- Creates ai_intelligence_run + ai_intelligence_result with diagnostic process PDF

DO $$
DECLARE
  v_ineldea_id UUID;
  v_workspace_id UUID;
  v_owner_id UUID;
  v_run_id UUID;
BEGIN
  -- Get workspace and owner
  SELECT id, owner_id INTO v_workspace_id, v_owner_id
  FROM workspaces
  LIMIT 1;

  -- Find INELDEA company
  SELECT id INTO v_ineldea_id
  FROM companies
  WHERE workspace_id = v_workspace_id AND LOWER(name) LIKE '%ineldea%'
  LIMIT 1;

  IF v_ineldea_id IS NULL THEN
    RAISE EXCEPTION 'INELDEA company not found in workspace %', v_workspace_id;
  END IF;

  -- Create ai_intelligence_run
  INSERT INTO ai_intelligence_runs (
    company_id,
    current_phase,
    status,
    input_snapshot,
    workspace_id,
    owner_id
  ) VALUES (
    v_ineldea_id,
    3,
    'succeeded',
    jsonb_build_object('company_name', 'INELDEA', 'phase', 3),
    v_workspace_id,
    v_owner_id
  )
  RETURNING id INTO v_run_id;

  -- Create ai_intelligence_result for phase 3 (process diagnostic)
  INSERT INTO ai_intelligence_results (
    run_id,
    company_id,
    phase,
    result_type,
    status,
    content_json,
    metadata,
    workspace_id,
    owner_id
  ) VALUES (
    v_run_id,
    v_ineldea_id,
    3,
    'process_diagnostic',
    'succeeded',
    jsonb_build_object('synthese', 'Document d''audit stratégique process — voir PDF joint.'),
    jsonb_build_object(
      'pdf_bucket', 'ai_intelligence_process_diagnostics',
      'pdf_storage_path', 'ineldea/ineldea_audit_strategique_process.pdf',
      'source', 'import'
    ),
    v_workspace_id,
    v_owner_id
  );

  RAISE NOTICE 'INELDEA process diagnostic seeded successfully';
END $$;
