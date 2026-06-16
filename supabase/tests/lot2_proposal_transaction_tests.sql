BEGIN;

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

CREATE OR REPLACE FUNCTION pg_temp.assert_eq_text(p_actual text, p_expected text, p_message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'assertion_failed: % (actual=%, expected=%)', p_message, p_actual, p_expected;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_eq_jsonb(p_actual jsonb, p_expected jsonb, p_message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'assertion_failed: % (actual=%, expected=%)', p_message, p_actual, p_expected;
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
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      v_state = RETURNED_SQLSTATE,
      v_message = MESSAGE_TEXT;

    IF p_expected_sqlstate IS NOT NULL AND v_state IS DISTINCT FROM p_expected_sqlstate THEN
      RAISE EXCEPTION
        'assertion_failed: % (sqlstate %, expected %, message=%)',
        p_context,
        v_state,
        p_expected_sqlstate,
        v_message;
    END IF;

    IF position(p_expected_message IN v_message) = 0 THEN
      RAISE EXCEPTION
        'assertion_failed: % (message %, expected substring %)',
        p_context,
        v_message,
        p_expected_message;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.make_source(
  p_workspace_id uuid,
  p_suffix text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.intelligence_sources (
    id,
    workspace_id,
    source_type,
    source_name,
    source_url,
    canonical_url,
    source_key,
    evidence_excerpt,
    reliability_score,
    collection_method
  )
  VALUES (
    v_source_id,
    p_workspace_id,
    'official_site',
    'Lot2 Test Source ' || p_suffix,
    'https://example.test/' || p_suffix,
    'https://example.test/' || p_suffix,
    'lot2-source-' || p_suffix,
    'Evidence for ' || p_suffix,
    0.8,
    'manual'
  );

  RETURN v_source_id;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.make_proposal(
  p_workspace_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_attribute_name text,
  p_old_value jsonb,
  p_proposed_value jsonb,
  p_normalized_value jsonb,
  p_status text,
  p_primary_source_id uuid,
  p_requested_by uuid,
  p_initial_snapshot jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_proposal_id uuid := gen_random_uuid();
  v_snapshot jsonb;
  v_hash_source text;
BEGIN
  v_snapshot := COALESCE(p_initial_snapshot, COALESCE(p_old_value, 'null'::jsonb));
  v_hash_source := COALESCE(NULLIF(p_normalized_value::text, '{}'::jsonb::text), p_proposed_value::text, 'null');

  INSERT INTO public.enrichment_proposals (
    id,
    workspace_id,
    target_type,
    target_id,
    attribute_name,
    old_value,
    proposed_value,
    normalized_value,
    normalized_value_hash,
    initial_snapshot,
    primary_source_id,
    origin,
    confidence_score,
    justification,
    status,
    requested_by,
    proposal_key
  )
  VALUES (
    v_proposal_id,
    p_workspace_id,
    p_target_type,
    p_target_id,
    p_attribute_name,
    p_old_value,
    p_proposed_value,
    COALESCE(p_normalized_value, '{}'::jsonb),
    md5(v_hash_source),
    v_snapshot,
    p_primary_source_id,
    'external',
    0.75,
    'Lot2 test proposal',
    p_status,
    p_requested_by,
    md5(
      p_workspace_id::text || '|' ||
      p_target_type || '|' ||
      p_target_id::text || '|' ||
      p_attribute_name || '|' ||
      v_hash_source || '|' ||
      COALESCE(p_primary_source_id::text, '') || '|' ||
      v_proposal_id::text
    )
  );

  RETURN v_proposal_id;
END;
$$;

CREATE TEMP TABLE pg_temp.test_context (
  actor_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  other_workspace_id uuid NOT NULL,
  company_id uuid NOT NULL,
  other_company_id uuid NOT NULL,
  person_id uuid NOT NULL,
  contact_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp.test_context (
  actor_id,
  workspace_id,
  other_workspace_id,
  company_id,
  other_company_id,
  person_id,
  contact_id
)
SELECT
  p.id,
  p.workspace_id,
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid()
FROM public.profiles p
WHERE p.workspace_id IS NOT NULL
LIMIT 1;

SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM pg_temp.test_context), 'A test profile with workspace is required.');

GRANT SELECT ON pg_temp.test_context TO authenticated, anon;

INSERT INTO public.workspaces (id, name, owner_id)
SELECT other_workspace_id, 'Lot2 Secondary Workspace', actor_id
FROM pg_temp.test_context;

INSERT INTO public.companies (
  id,
  workspace_id,
  owner_id,
  name,
  description,
  website,
  hq_location,
  sector,
  employee_count,
  revenue
)
SELECT
  company_id,
  workspace_id,
  actor_id,
  'Lot2 Test Company',
  'Initial description',
  'https://initial.example.test',
  'Paris',
  'ESN',
  100,
  '10M'
FROM pg_temp.test_context;

INSERT INTO public.companies (
  id,
  workspace_id,
  owner_id,
  name,
  description
)
SELECT
  other_company_id,
  other_workspace_id,
  actor_id,
  'Lot2 Other Workspace Company',
  'Other workspace description'
FROM pg_temp.test_context;

INSERT INTO public.persons (
  id,
  workspace_id,
  first_name,
  last_name
)
SELECT
  person_id,
  workspace_id,
  'Lot2',
  'Contact'
FROM pg_temp.test_context;

INSERT INTO public.contacts (
  id,
  workspace_id,
  person_id,
  company_id,
  job_title,
  department,
  relationship_role,
  status
)
SELECT
  contact_id,
  workspace_id,
  person_id,
  company_id,
  'Architect',
  'it',
  'prescripteur',
  'actif'
FROM pg_temp.test_context;

SELECT set_config('request.jwt.claim.sub', (SELECT actor_id::text FROM pg_temp.test_context), true);

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
  v_actor_id uuid;
BEGIN
  SELECT actor_id INTO v_actor_id FROM pg_temp.test_context;
  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'decision-validate');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'description',
    to_jsonb('Initial description'::text),
    to_jsonb('Validated description'::text),
    to_jsonb('Validated description'::text),
    'proposed',
    v_source_id,
    v_actor_id
  );

  SELECT * INTO v_result
  FROM public.decide_enrichment_proposal(v_proposal_id, 'validated', 'validated in test');

  PERFORM pg_temp.assert_eq_text(v_result.status, 'validated', 'validate decision should set validated status');
  PERFORM pg_temp.assert_eq_text(v_result.operation, 'validated', 'validate decision should report validated operation');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.enrichment_proposals ep
      WHERE ep.id = v_proposal_id
        AND ep.status = 'validated'
        AND ep.decided_by = v_actor_id
        AND ep.decision_reason = 'validated in test'
        AND ep.decision_at IS NOT NULL
    ),
    'validated proposal should record actor, reason and timestamp'
  );
END;
$$;

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
  v_actor_id uuid;
BEGIN
  SELECT actor_id INTO v_actor_id FROM pg_temp.test_context;
  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'decision-reject');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'website',
    to_jsonb('https://initial.example.test'::text),
    to_jsonb('https://rejected.example.test'::text),
    to_jsonb('https://rejected.example.test'::text),
    'proposed',
    v_source_id,
    v_actor_id
  );

  SELECT * INTO v_result
  FROM public.decide_enrichment_proposal(v_proposal_id, 'rejected', 'rejected in test');

  PERFORM pg_temp.assert_eq_text(v_result.status, 'rejected', 'reject decision should set rejected status');
  PERFORM pg_temp.assert_eq_text(v_result.operation, 'rejected', 'reject decision should report rejected operation');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.enrichment_proposals ep
      WHERE ep.id = v_proposal_id
        AND ep.status = 'rejected'
        AND ep.decided_by = v_actor_id
        AND ep.decision_reason = 'rejected in test'
        AND ep.decision_at IS NOT NULL
    ),
    'rejected proposal should record actor, reason and timestamp'
  );
END;
$$;

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_first public.proposal_operation_result;
  v_second public.proposal_operation_result;
BEGIN
  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'decision-idempotent');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'sector',
    to_jsonb('ESN'::text),
    to_jsonb('Conseil'::text),
    to_jsonb('Conseil'::text),
    'proposed',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_first
  FROM public.decide_enrichment_proposal(v_proposal_id, 'validated', 'first validation');

  SELECT * INTO v_second
  FROM public.decide_enrichment_proposal(v_proposal_id, 'validated', 'first validation');

  PERFORM pg_temp.assert_eq_text(v_first.operation, 'validated', 'first validation should apply');
  PERFORM pg_temp.assert_eq_text(v_second.operation, 'already_validated', 'second identical validation should be idempotent');
END;
$$;

SELECT pg_temp.expect_exception(
  format(
    'select * from public.decide_enrichment_proposal(%L::uuid, %L, %L)',
    pg_temp.make_proposal(
      (SELECT workspace_id FROM pg_temp.test_context),
      'company',
      (SELECT company_id FROM pg_temp.test_context),
      'description',
      to_jsonb('Initial description'::text),
      to_jsonb('Another description'::text),
      to_jsonb('Another description'::text),
      'validated',
      pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'decision-conflict'),
      (SELECT actor_id FROM pg_temp.test_context)
    ),
    'rejected',
    'contradictory decision'
  ),
  'decision_conflict',
  'contradictory decision must fail',
  'P0001'
);

SELECT pg_temp.expect_exception(
  format(
    'select * from public.decide_enrichment_proposal(%L::uuid, %L, %L)',
    pg_temp.make_proposal(
      (SELECT other_workspace_id FROM pg_temp.test_context),
      'company',
      (SELECT other_company_id FROM pg_temp.test_context),
      'description',
      to_jsonb('Other workspace description'::text),
      to_jsonb('Blocked cross-workspace update'::text),
      to_jsonb('Blocked cross-workspace update'::text),
      'proposed',
      pg_temp.make_source((SELECT other_workspace_id FROM pg_temp.test_context), 'decision-wrong-workspace'),
      (SELECT actor_id FROM pg_temp.test_context)
    ),
    'validated',
    'cross workspace decision'
  ),
  'wrong_workspace',
  'wrong workspace decision must fail',
  'P0001'
);

SELECT pg_temp.expect_exception(
  format(
    'select * from public.decide_enrichment_proposal(%L::uuid, %L, %L)',
    pg_temp.make_proposal(
      (SELECT workspace_id FROM pg_temp.test_context),
      'company',
      (SELECT company_id FROM pg_temp.test_context),
      'description',
      to_jsonb('Initial description'::text),
      to_jsonb('Terminal status test'::text),
      to_jsonb('Terminal status test'::text),
      'applied',
      pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'decision-terminal'),
      (SELECT actor_id FROM pg_temp.test_context)
    ),
    'validated',
    'terminal decision'
  ),
  'invalid_status',
  'terminal proposal decision must fail',
  'P0001'
);

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  UPDATE public.companies
  SET description = 'CRM old description'
  WHERE id = (SELECT company_id FROM pg_temp.test_context);

  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'apply-company-text');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'description',
    to_jsonb('CRM old description'::text),
    to_jsonb('CRM new description'::text),
    to_jsonb('CRM new description'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_proposal_id, 'apply text test');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'company text proposal should apply');
  PERFORM pg_temp.assert_eq_jsonb(v_result.previous_value, to_jsonb('CRM old description'::text), 'previous CRM text value should be returned');
  PERFORM pg_temp.assert_eq_jsonb(v_result.applied_value, to_jsonb('CRM new description'::text), 'applied CRM text value should be returned');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = (SELECT company_id FROM pg_temp.test_context)
        AND c.description = 'CRM new description'
    ),
    'company description should be updated'
  );
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.enrichment_proposals ep
      WHERE ep.id = v_proposal_id
        AND ep.status = 'applied'
        AND ep.applied_at IS NOT NULL
        AND ep.applied_by = (SELECT actor_id FROM pg_temp.test_context)
    ),
    'applied proposal should record application metadata'
  );
END;
$$;

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  UPDATE public.companies
  SET employee_count = 100
  WHERE id = (SELECT company_id FROM pg_temp.test_context);

  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'apply-company-integer');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'employee_count',
    to_jsonb(100),
    to_jsonb(125),
    to_jsonb(125),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_proposal_id, 'apply integer test');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'company integer proposal should apply');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = (SELECT company_id FROM pg_temp.test_context)
        AND c.employee_count = 125
    ),
    'company employee_count should be updated'
  );
END;
$$;

SELECT pg_temp.expect_exception(
  format(
    'select * from public.apply_enrichment_proposal(%L::uuid, %L)',
    pg_temp.make_proposal(
      (SELECT workspace_id FROM pg_temp.test_context),
      'company',
      (SELECT company_id FROM pg_temp.test_context),
      'priority',
      to_jsonb('normale'::text),
      to_jsonb('haute'::text),
      to_jsonb('haute'::text),
      'validated',
      pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'apply-disallowed-attribute'),
      (SELECT actor_id FROM pg_temp.test_context)
    ),
    'disallowed attribute'
  ),
  'attribute_not_allowed',
  'disallowed CRM attribute must fail',
  'P0001'
);

SELECT pg_temp.expect_exception(
  format(
    'select * from public.apply_enrichment_proposal(%L::uuid, %L)',
    pg_temp.make_proposal(
      (SELECT workspace_id FROM pg_temp.test_context),
      'company',
      (SELECT company_id FROM pg_temp.test_context),
      'employee_count',
      to_jsonb(125),
      to_jsonb('not-an-integer'::text),
      to_jsonb('not-an-integer'::text),
      'validated',
      pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'apply-invalid-type'),
      (SELECT actor_id FROM pg_temp.test_context)
    ),
    'invalid integer value'
  ),
  'invalid_value',
  'invalid integer payload must fail',
  'P0001'
);

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_first public.proposal_operation_result;
  v_second public.proposal_operation_result;
BEGIN
  UPDATE public.companies
  SET website = 'https://once.example.test'
  WHERE id = (SELECT company_id FROM pg_temp.test_context);

  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'apply-repeat');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'website',
    to_jsonb('https://once.example.test'::text),
    to_jsonb('https://twice.example.test'::text),
    to_jsonb('https://twice.example.test'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_first
  FROM public.apply_enrichment_proposal(v_proposal_id, 'repeat apply first');

  SELECT * INTO v_second
  FROM public.apply_enrichment_proposal(v_proposal_id, 'repeat apply second');

  PERFORM pg_temp.assert_eq_text(v_first.operation, 'applied', 'first apply should mutate CRM');
  PERFORM pg_temp.assert_eq_text(v_second.operation, 'already_applied', 'second apply should be idempotent');
END;
$$;

DO $$
DECLARE
  v_company_id uuid := gen_random_uuid();
  v_source_id uuid;
  v_proposal_id uuid;
BEGIN
  INSERT INTO public.companies (id, workspace_id, owner_id, name, description)
  VALUES (
    v_company_id,
    (SELECT workspace_id FROM pg_temp.test_context),
    (SELECT actor_id FROM pg_temp.test_context),
    'Lot2 Missing Target Company',
    'Will be deleted before apply'
  );

  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'apply-missing-target');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    v_company_id,
    'description',
    to_jsonb('Will be deleted before apply'::text),
    to_jsonb('Missing target'::text),
    to_jsonb('Missing target'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  DELETE FROM public.companies
  WHERE id = v_company_id;

  PERFORM pg_temp.expect_exception(
    format(
      'select * from public.apply_enrichment_proposal(%L::uuid, %L)',
      v_proposal_id,
      'missing target'
    ),
    'target_not_found',
    'missing target must fail',
    'P0001'
  );
END;
$$;

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  UPDATE public.companies
  SET description = 'Already proposed description'
  WHERE id = (SELECT company_id FROM pg_temp.test_context);

  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'apply-current-equals-proposed');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'description',
    to_jsonb('Outdated description'::text),
    to_jsonb('Already proposed description'::text),
    to_jsonb('Already proposed description'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_proposal_id, 'current equals proposed');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'already current value should still mark proposal applied');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.enrichment_proposals ep
      WHERE ep.id = v_proposal_id
        AND ep.status = 'applied'
        AND ep.application_error IS NULL
    ),
    'proposal should be marked applied without conflict when current value already equals proposed'
  );
END;
$$;

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  UPDATE public.companies
  SET description = 'Concurrent actual value'
  WHERE id = (SELECT company_id FROM pg_temp.test_context);

  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'apply-concurrent-conflict');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'description',
    to_jsonb('Snapshot description'::text),
    to_jsonb('Proposed conflict description'::text),
    to_jsonb('Proposed conflict description'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_proposal_id, 'concurrent conflict');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'conflicting', 'concurrent CRM change should create a conflict');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.enrichment_proposals ep
      WHERE ep.id = v_proposal_id
        AND ep.status = 'conflicting'
        AND ep.application_error = 'concurrent_change_detected'
    ),
    'conflicting proposal should persist application conflict metadata'
  );
END;
$$;

DO $$
DECLARE
  v_primary_source_id uuid;
  v_support_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  v_primary_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'fact-single-create-primary');
  v_support_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'fact-single-create-support');

  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'business_model',
    'null'::jsonb,
    to_jsonb('recurring services'::text),
    to_jsonb('recurring services'::text),
    'validated',
    v_primary_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  INSERT INTO public.intelligence_source_links (workspace_id, source_id, object_type, object_id, link_role)
  VALUES (
    (SELECT workspace_id FROM pg_temp.test_context),
    v_support_source_id,
    'proposal',
    v_proposal_id,
    'supporting'
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_proposal_id, 'fact single create');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'single fact should be created');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.account_facts af
      WHERE af.id = v_result.fact_id
        AND af.fact_type = 'business_model'
        AND af.cardinality = 'single'
        AND af.normalized_value = 'recurring services'
        AND af.is_current = true
        AND af.source_proposal_id = v_proposal_id
    ),
    'single fact should be current and linked to its proposal'
  );
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.intelligence_source_links isl
      WHERE isl.workspace_id = (SELECT workspace_id FROM pg_temp.test_context)
        AND isl.source_id = v_support_source_id
        AND isl.object_type = 'fact'
        AND isl.object_id = v_result.fact_id
        AND isl.link_role = 'supporting'
    ),
    'supporting source links should be copied from proposal to fact'
  );
END;
$$;

DO $$
DECLARE
  v_company_id uuid := gen_random_uuid();
  v_existing_fact_id uuid := gen_random_uuid();
  v_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
  v_new_fact_id uuid;
BEGIN
  INSERT INTO public.companies (id, workspace_id, owner_id, name, description)
  VALUES (
    v_company_id,
    (SELECT workspace_id FROM pg_temp.test_context),
    (SELECT actor_id FROM pg_temp.test_context),
    'Lot2 Fact Replace Company',
    'Dedicated company for single fact replacement'
  );

  INSERT INTO public.account_facts (
    id,
    workspace_id,
    target_type,
    target_id,
    fact_type,
    cardinality,
    value_text,
    normalized_value,
    normalized_value_hash,
    origin,
    confidence_score,
    is_current
  )
  VALUES (
    v_existing_fact_id,
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    v_company_id,
    'business_model',
    'single',
    'project services',
    'project services',
    md5('project services'),
    'native',
    0.8,
    true
  );

  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'fact-single-replace');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    v_company_id,
    'business_model',
    to_jsonb('project services'::text),
    to_jsonb('managed services'::text),
    to_jsonb('managed services'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_proposal_id, 'fact single replace');

  v_new_fact_id := v_result.fact_id;

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'single fact replacement should apply');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.account_facts af
      WHERE af.id = v_existing_fact_id
        AND af.is_current = false
        AND af.expires_at IS NOT NULL
    ),
    'previous single fact should remain in history and be closed'
  );
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.account_facts af
      WHERE af.id = v_new_fact_id
        AND af.is_current = true
        AND af.normalized_value = 'managed services'
    ),
    'replacement single fact should become current'
  );
END;
$$;

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'fact-multi-create');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'technology',
    'null'::jsonb,
    to_jsonb('AWS'::text),
    to_jsonb('AWS'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_proposal_id, 'fact multi create');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'multi fact should be created');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.account_facts af
      WHERE af.id = v_result.fact_id
        AND af.fact_type = 'technology'
        AND af.cardinality = 'multi'
        AND af.is_current = true
        AND af.normalized_value = 'aws'
    ),
    'technology fact should be stored as normalized multi-value'
  );
END;
$$;

DO $$
DECLARE
  v_source_id uuid;
  v_proposal_id uuid;
  v_first public.proposal_operation_result;
  v_second public.proposal_operation_result;
  v_count integer;
BEGIN
  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'fact-multi-dedupe');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'technology',
    'null'::jsonb,
    to_jsonb('Azure'::text),
    to_jsonb('Azure'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_first
  FROM public.apply_enrichment_proposal(v_proposal_id, 'fact multi first apply');

  SELECT * INTO v_second
  FROM public.apply_enrichment_proposal(v_proposal_id, 'fact multi second apply');

  SELECT count(*)
  INTO v_count
  FROM public.account_facts af
  WHERE af.workspace_id = (SELECT workspace_id FROM pg_temp.test_context)
    AND af.target_type = 'company'
    AND af.target_id = (SELECT company_id FROM pg_temp.test_context)
    AND af.fact_type = 'technology'
    AND af.normalized_value = 'azure'
    AND af.is_current = true;

  PERFORM pg_temp.assert_eq_text(v_first.operation, 'applied', 'first multi-value apply should create the fact');
  PERFORM pg_temp.assert_eq_text(v_second.operation, 'already_applied', 'second multi-value apply should be idempotent');
  PERFORM pg_temp.assert_true(v_count = 1, 'multi-value fact deduplication should keep a single current value');
END;
$$;

DO $$
DECLARE
  v_company_id uuid := gen_random_uuid();
  v_proposal_id uuid;
  v_source_id uuid;
BEGIN
  INSERT INTO public.companies (id, workspace_id, owner_id, name, description)
  VALUES (
    v_company_id,
    (SELECT workspace_id FROM pg_temp.test_context),
    (SELECT actor_id FROM pg_temp.test_context),
    'Lot2 Fact Cardinality Conflict Company',
    'Dedicated company for cardinality conflict'
  );

  INSERT INTO public.account_facts (
    id,
    workspace_id,
    target_type,
    target_id,
    fact_type,
    cardinality,
    value_text,
    normalized_value,
    normalized_value_hash,
    origin,
    confidence_score,
    is_current
  )
  VALUES (
    gen_random_uuid(),
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    v_company_id,
    'business_model',
    'multi',
    'legacy value',
    'legacy value',
    md5('legacy value'),
    'native',
    0.5,
    true
  );

  v_source_id := pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'fact-cardinality-conflict');
  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    v_company_id,
    'business_model',
    to_jsonb('legacy value'::text),
    to_jsonb('clean model'::text),
    to_jsonb('clean model'::text),
    'validated',
    v_source_id,
    (SELECT actor_id FROM pg_temp.test_context)
  );

  PERFORM pg_temp.expect_exception(
    format(
      'select * from public.apply_enrichment_proposal(%L::uuid, %L)',
      v_proposal_id,
      'fact cardinality conflict'
    ),
    'fact_cardinality_conflict',
    'fact cardinality mismatch must fail',
    'P0001'
  );
END;
$$;

CREATE TEMP TABLE pg_temp.security_context (
  anon_proposal_id uuid NOT NULL,
  direct_update_proposal_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp.security_context (anon_proposal_id, direct_update_proposal_id)
VALUES (
  pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'description',
    to_jsonb('Anon old'::text),
    to_jsonb('Anon new'::text),
    to_jsonb('Anon new'::text),
    'proposed',
    pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'security-anon'),
    (SELECT actor_id FROM pg_temp.test_context)
  ),
  pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'description',
    to_jsonb('Direct update old'::text),
    to_jsonb('Direct update new'::text),
    to_jsonb('Direct update new'::text),
    'proposed',
    pg_temp.make_source((SELECT workspace_id FROM pg_temp.test_context), 'security-direct-update'),
    (SELECT actor_id FROM pg_temp.test_context)
  )
);

GRANT SELECT ON pg_temp.security_context TO authenticated, anon;

RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);

DO $$
BEGIN
  PERFORM public.decide_enrichment_proposal(
    (SELECT anon_proposal_id FROM pg_temp.security_context),
    'validated',
    'anon denied'
  );

  RAISE EXCEPTION 'assertion_failed: anon role must not execute proposal RPC';
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END;
$$;

RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT actor_id::text FROM pg_temp.test_context), true);

DO $$
BEGIN
  UPDATE public.enrichment_proposals
  SET status = 'validated'
  WHERE id = (SELECT direct_update_proposal_id FROM pg_temp.security_context);

  RAISE EXCEPTION 'assertion_failed: authenticated role must not update enrichment_proposals directly';
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END;
$$;

RESET ROLE;
ROLLBACK;
