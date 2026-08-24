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
    'Account Scan Lot0 Test Source ' || p_suffix,
    'https://example.test/account-scan/' || p_suffix,
    'https://example.test/account-scan/' || p_suffix,
    'account-scan-lot0-source-' || p_suffix || '-' || gen_random_uuid()::text,
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
  p_suffix text,
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
    pg_temp.make_source(p_workspace_id, p_suffix),
    'external',
    0.75,
    'Account scan Lot0 test proposal',
    p_status,
    p_requested_by,
    md5(
      p_workspace_id::text || '|' ||
      p_target_type || '|' ||
      p_target_id::text || '|' ||
      p_attribute_name || '|' ||
      v_hash_source || '|' ||
      p_suffix || '|' ||
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
  sector_id uuid NOT NULL,
  test_run_id text NOT NULL,
  unique_siren text NOT NULL,
  applied_siren text NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp.test_context (
  actor_id,
  workspace_id,
  other_workspace_id,
  company_id,
  other_company_id,
  sector_id,
  test_run_id,
  unique_siren,
  applied_siren
)
SELECT *
FROM (
  SELECT
    p.id AS actor_id,
    p.workspace_id,
    gen_random_uuid() AS other_workspace_id,
    gen_random_uuid() AS company_id,
    gen_random_uuid() AS other_company_id,
    gen_random_uuid() AS sector_id,
    gen_random_uuid()::text AS test_run_id,
    to_char(floor(random() * 1000000000)::integer, 'FM000000000') AS unique_siren,
    to_char(floor(random() * 1000000000)::integer, 'FM000000000') AS applied_siren
  FROM public.profiles p
  WHERE p.workspace_id IS NOT NULL
  LIMIT 1
) candidate
WHERE candidate.unique_siren <> candidate.applied_siren;

SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM pg_temp.test_context), 'A test profile with workspace is required.');

GRANT SELECT ON pg_temp.test_context TO authenticated, anon;

INSERT INTO public.workspaces (id, name, owner_id)
SELECT other_workspace_id, 'Account Scan Lot0 Secondary Workspace', actor_id
FROM pg_temp.test_context;

INSERT INTO public.sector_intelligence (id, workspace_id, name, slug, status)
SELECT sector_id, workspace_id, 'Conseil IT', 'account-scan-lot0-' || left(test_run_id, 8), 'watch'
FROM pg_temp.test_context;

INSERT INTO public.companies (
  id,
  workspace_id,
  owner_id,
  name,
  legal_name,
  description,
  website,
  hq_location,
  sector,
  siren,
  naf_code,
  segment_id,
  relation_type
)
SELECT
  company_id,
  workspace_id,
  actor_id,
  'Account Scan Lot0 Company',
  'Initial Legal',
  'Initial description',
  'https://initial.example.test',
  'Paris',
  NULL,
  NULL,
  NULL,
  sector_id,
  'prospect'
FROM pg_temp.test_context;

INSERT INTO public.companies (
  id,
  workspace_id,
  owner_id,
  name,
  description,
  segment_id,
  relation_type
)
SELECT
  other_company_id,
  other_workspace_id,
  actor_id,
  'Account Scan Other Workspace Company',
  'Other workspace description',
  sector_id,
  'prospect'
FROM pg_temp.test_context;

SELECT set_config('request.jwt.claim.sub', (SELECT actor_id::text FROM pg_temp.test_context), true);

SELECT pg_temp.expect_exception(
  format(
    'insert into public.companies (id, workspace_id, owner_id, name, siren, segment_id, relation_type) values (gen_random_uuid(), %L::uuid, %L::uuid, %L, %L, %L::uuid, %L)',
    (SELECT workspace_id FROM pg_temp.test_context),
    (SELECT actor_id FROM pg_temp.test_context),
    'Invalid SIREN Company',
    '12345',
    (SELECT sector_id FROM pg_temp.test_context),
    'prospect'
  ),
  'companies_siren_format_check',
  'invalid SIREN format should be refused'
);

SELECT pg_temp.expect_exception(
  format(
    'insert into public.companies (id, workspace_id, owner_id, name, naf_code, segment_id, relation_type) values (gen_random_uuid(), %L::uuid, %L::uuid, %L, %L, %L::uuid, %L)',
    (SELECT workspace_id FROM pg_temp.test_context),
    (SELECT actor_id FROM pg_temp.test_context),
    'Invalid NAF Company',
    '620A',
    (SELECT sector_id FROM pg_temp.test_context),
    'prospect'
  ),
  'companies_naf_code_format_check',
  'invalid NAF format should be refused'
);

INSERT INTO public.companies (id, workspace_id, owner_id, name, siren, naf_code, segment_id, relation_type)
SELECT gen_random_uuid(), workspace_id, actor_id, 'Unique SIREN Company', unique_siren, '62.02A', sector_id, 'prospect'
FROM pg_temp.test_context;

SELECT pg_temp.expect_exception(
  format(
    'insert into public.companies (id, workspace_id, owner_id, name, siren, segment_id, relation_type) values (gen_random_uuid(), %L::uuid, %L::uuid, %L, %L, %L::uuid, %L)',
    (SELECT workspace_id FROM pg_temp.test_context),
    (SELECT actor_id FROM pg_temp.test_context),
    'Duplicate SIREN Company',
    (SELECT unique_siren FROM pg_temp.test_context),
    (SELECT sector_id FROM pg_temp.test_context),
    'prospect'
  ),
  'companies_workspace_siren_uniq',
  'duplicate SIREN in same workspace should be refused'
);

INSERT INTO public.companies (id, workspace_id, owner_id, name, siren, segment_id, relation_type)
SELECT gen_random_uuid(), other_workspace_id, actor_id, 'Same SIREN Other Workspace', unique_siren, sector_id, 'prospect'
FROM pg_temp.test_context;

DO $$
DECLARE
  v_legal_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  v_legal_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'legal_name',
    to_jsonb('Initial Legal'::text),
    to_jsonb('Kredo Conseil SAS'::text),
    to_jsonb('Kredo Conseil SAS'::text),
    'validated',
    'apply-legal-name',
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_legal_proposal_id, 'apply legal name');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'legal_name proposal should apply');
END;
$$;

DO $$
DECLARE
  v_siren_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  v_siren_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'siren',
    'null'::jsonb,
    to_jsonb((SELECT applied_siren FROM pg_temp.test_context)),
    to_jsonb((SELECT applied_siren FROM pg_temp.test_context)),
    'validated',
    'apply-siren',
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_siren_proposal_id, 'apply siren');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'siren proposal should apply');
END;
$$;

DO $$
DECLARE
  v_naf_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  v_naf_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'naf_code',
    'null'::jsonb,
    to_jsonb('62.02A'::text),
    to_jsonb('62.02A'::text),
    'validated',
    'apply-naf-code',
    (SELECT actor_id FROM pg_temp.test_context)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_naf_proposal_id, 'apply naf');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'naf_code proposal should apply');
END;
$$;

DO $$
DECLARE
  v_sector_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN

  v_sector_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'sector',
    jsonb_build_object('sector', NULL, 'sectorId', NULL),
    jsonb_build_object('sectorId', (SELECT sector_id::text FROM pg_temp.test_context), 'name', 'Conseil IT'),
    jsonb_build_object('sectorId', (SELECT sector_id::text FROM pg_temp.test_context), 'name', 'Conseil IT'),
    'validated',
    'apply-sector',
    (SELECT actor_id FROM pg_temp.test_context),
    jsonb_build_object('sector', NULL, 'sectorId', NULL)
  );

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_sector_proposal_id, 'apply sector');

  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'sector proposal should apply');
  PERFORM pg_temp.assert_eq_text(
    (SELECT c.legal_name FROM public.companies c WHERE c.id = (SELECT company_id FROM pg_temp.test_context)),
    'Kredo Conseil SAS',
    'legal_name should be persisted'
  );
  PERFORM pg_temp.assert_eq_text(
    (SELECT c.siren FROM public.companies c WHERE c.id = (SELECT company_id FROM pg_temp.test_context)),
    (SELECT applied_siren FROM pg_temp.test_context),
    'siren should be persisted'
  );
  PERFORM pg_temp.assert_eq_text(
    (SELECT c.naf_code FROM public.companies c WHERE c.id = (SELECT company_id FROM pg_temp.test_context)),
    '6202A',
    'naf_code should be normalized and persisted'
  );
  PERFORM pg_temp.assert_eq_text(
    (SELECT c.sector FROM public.companies c WHERE c.id = (SELECT company_id FROM pg_temp.test_context)),
    'Conseil IT',
    'sector label should be synchronized from taxonomy'
  );
  PERFORM pg_temp.assert_eq_text(
    (SELECT c.sector_id::text FROM public.companies c WHERE c.id = (SELECT company_id FROM pg_temp.test_context)),
    (SELECT sector_id::text FROM pg_temp.test_context),
    'sector_id should be synchronized from taxonomy'
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
      'siren',
      to_jsonb((SELECT applied_siren FROM pg_temp.test_context)),
      to_jsonb('bad-siren'::text),
      to_jsonb('bad-siren'::text),
      'validated',
      'invalid-siren-proposal',
      (SELECT actor_id FROM pg_temp.test_context)
    ),
    'invalid siren proposal'
  ),
  'invalid_value',
  'invalid SIREN proposal payload should be refused',
  'P0001'
);

DO $$
DECLARE
  v_success_id uuid;
  v_already_id uuid;
  v_conflict_id uuid;
BEGIN
  UPDATE public.companies
  SET legal_name = 'Batch Old Legal',
      website = 'https://already-old.example.test',
      hq_location = 'Actual location'
  WHERE id = (SELECT company_id FROM pg_temp.test_context);

  v_success_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'legal_name',
    to_jsonb('Batch Old Legal'::text),
    to_jsonb('Batch New Legal'::text),
    to_jsonb('Batch New Legal'::text),
    'proposed',
    'batch-success',
    (SELECT actor_id FROM pg_temp.test_context)
  );

  v_already_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'website',
    to_jsonb('https://already-old.example.test'::text),
    to_jsonb('https://already-new.example.test'::text),
    to_jsonb('https://already-new.example.test'::text),
    'validated',
    'batch-already',
    (SELECT actor_id FROM pg_temp.test_context)
  );

  PERFORM public.apply_enrichment_proposal(v_already_id, 'pre-apply before batch');

  v_conflict_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context),
    'company',
    (SELECT company_id FROM pg_temp.test_context),
    'hq_location',
    to_jsonb('Expected stale location'::text),
    to_jsonb('Batch location'::text),
    to_jsonb('Batch location'::text),
    'proposed',
    'batch-conflict',
    (SELECT actor_id FROM pg_temp.test_context)
  );

  CREATE TEMP TABLE batch_results ON COMMIT DROP AS
  SELECT row_number() OVER () AS ord, result.*
  FROM public.validate_and_apply_enrichment_proposals(
    ARRAY[v_success_id, v_already_id, v_conflict_id],
    'batch test'
  ) AS result;

  PERFORM pg_temp.assert_true((SELECT count(*) = 3 FROM batch_results), 'batch should return one result per proposal');
  PERFORM pg_temp.assert_eq_text((SELECT operation FROM batch_results WHERE ord = 1), 'applied', 'batch should apply proposed item');
  PERFORM pg_temp.assert_eq_text((SELECT operation FROM batch_results WHERE ord = 2), 'already_applied', 'batch should keep already applied item idempotent');
  PERFORM pg_temp.assert_eq_text((SELECT operation FROM batch_results WHERE ord = 3), 'conflicting', 'batch should preserve conflict detection');
  PERFORM pg_temp.assert_true(
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = (SELECT company_id FROM pg_temp.test_context)
        AND c.legal_name = 'Batch New Legal'
        AND c.website = 'https://already-new.example.test'
        AND c.hq_location = 'Actual location'
    ),
    'batch should mutate successful/idempotent fields and leave conflicting field unchanged'
  );
END;
$$;

SELECT pg_temp.expect_exception(
  'select * from public.validate_and_apply_enrichment_proposals(array[]::uuid[], ''empty batch'')',
  'empty_proposal_batch',
  'empty batch should be refused',
  'P0001'
);

SELECT pg_temp.expect_exception(
  format(
    'select * from public.validate_and_apply_enrichment_proposals(ARRAY[%L::uuid], %L)',
    pg_temp.make_proposal(
      (SELECT other_workspace_id FROM pg_temp.test_context),
      'company',
      (SELECT other_company_id FROM pg_temp.test_context),
      'description',
      to_jsonb('Other workspace description'::text),
      to_jsonb('Cross workspace blocked'::text),
      to_jsonb('Cross workspace blocked'::text),
      'proposed',
      'batch-cross-workspace',
      (SELECT actor_id FROM pg_temp.test_context)
    ),
    'cross workspace batch'
  ),
  'wrong_workspace',
  'cross workspace batch should be refused before application',
  'P0001'
);

DO $$
DECLARE
  v_attribute text;
  v_value text;
  v_expected_cardinality text;
  v_proposal_id uuid;
  v_result public.proposal_operation_result;
BEGIN
  FOR v_attribute, v_value, v_expected_cardinality IN
    SELECT *
    FROM (
      VALUES
        ('establishment_count', '12', 'single'),
        ('growth_trend', 'stable growth', 'single'),
        ('geographic_reach', 'France', 'single'),
        ('value_proposition', 'specialized delivery teams', 'single'),
        ('differentiators', 'certified experts', 'multi'),
        ('market_position', 'regional challenger', 'single'),
        ('marketing_position', 'premium specialist', 'single'),
        ('target_customers', 'mid-market CIOs', 'multi')
    ) AS facts(attribute_name, fact_value, expected_cardinality)
  LOOP
    v_proposal_id := pg_temp.make_proposal(
      (SELECT workspace_id FROM pg_temp.test_context),
      'company',
      (SELECT company_id FROM pg_temp.test_context),
      v_attribute,
      'null'::jsonb,
      to_jsonb(v_value),
      to_jsonb(v_value),
      'proposed',
      'fact-' || v_attribute,
      (SELECT actor_id FROM pg_temp.test_context)
    );

    SELECT * INTO v_result
    FROM public.validate_and_apply_enrichment_proposal(v_proposal_id, 'apply fact ' || v_attribute);

    PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'new fact proposal should apply: ' || v_attribute);
    PERFORM pg_temp.assert_true(
      EXISTS (
        SELECT 1
        FROM public.account_facts af
        WHERE af.id = v_result.fact_id
          AND af.fact_type = v_attribute
          AND af.cardinality = v_expected_cardinality
          AND af.normalized_value = private.normalize_text_value(v_value)
          AND af.is_current = true
          AND af.source_proposal_id = v_proposal_id
      ),
      'new account fact should be created for ' || v_attribute
    );
  END LOOP;
END;
$$;

RESET ROLE;
ROLLBACK;
