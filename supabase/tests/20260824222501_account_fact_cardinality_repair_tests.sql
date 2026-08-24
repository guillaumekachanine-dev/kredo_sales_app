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
    RAISE EXCEPTION 'assertion_failed: %', p_message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.expect_exception(
  p_sql text,
  p_expected_message text,
  p_context text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_message text;
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'assertion_failed: % (expected exception %)', p_context, p_expected_message;
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF position(p_expected_message IN v_message) = 0 THEN
      RAISE EXCEPTION 'assertion_failed: % (message %, expected substring %)', p_context, v_message, p_expected_message;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.make_source(p_workspace_id uuid, p_suffix text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.intelligence_sources (
    id, workspace_id, source_type, source_name, source_url, canonical_url,
    source_key, evidence_excerpt, reliability_score, collection_method
  )
  VALUES (
    v_source_id, p_workspace_id, 'official_site', 'Cardinality test ' || p_suffix,
    'https://example.test/cardinality/' || p_suffix,
    'https://example.test/cardinality/' || p_suffix,
    'cardinality-test-' || p_suffix || '-' || gen_random_uuid()::text,
    'Test evidence', 0.8, 'manual'
  );
  RETURN v_source_id;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.make_proposal(
  p_workspace_id uuid,
  p_target_id uuid,
  p_attribute_name text,
  p_old_value jsonb,
  p_value text,
  p_suffix text,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_proposal_id uuid := gen_random_uuid();
  v_source_id uuid := pg_temp.make_source(p_workspace_id, p_suffix);
BEGIN
  INSERT INTO public.enrichment_proposals (
    id, workspace_id, target_type, target_id, attribute_name,
    old_value, proposed_value, normalized_value, normalized_value_hash,
    initial_snapshot, primary_source_id, origin, confidence_score,
    justification, status, requested_by, proposal_key
  )
  VALUES (
    v_proposal_id, p_workspace_id, 'company', p_target_id, p_attribute_name,
    p_old_value, to_jsonb(p_value), to_jsonb(p_value), md5(p_value),
    COALESCE(p_old_value, 'null'::jsonb), v_source_id, 'external', 0.75,
    'Cardinality repair test proposal', 'proposed', p_actor_id,
    md5(v_proposal_id::text || p_suffix)
  );
  RETURN v_proposal_id;
END;
$$;

CREATE TEMP TABLE pg_temp.test_context (
  actor_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  sector_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp.test_context (actor_id, workspace_id, sector_id)
SELECT id, workspace_id, gen_random_uuid()
FROM public.profiles
WHERE workspace_id IS NOT NULL
LIMIT 1;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_temp.test_context),
  'A profile with a workspace is required.'
);

INSERT INTO public.sector_intelligence (id, workspace_id, name, slug, status, level)
SELECT sector_id, workspace_id, 'Cardinality Test Sector', 'cardinality-test-' || left(sector_id::text, 8), 'watch', 'macro'
FROM pg_temp.test_context;

SELECT set_config('request.jwt.claim.sub', (SELECT actor_id::text FROM pg_temp.test_context), true);

DO $$
DECLARE
  v_company_id uuid := gen_random_uuid();
  v_attribute text;
  v_first_id uuid;
  v_second_id uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_result public.proposal_operation_result;
  v_result_count integer := 0;
BEGIN
  INSERT INTO public.companies (id, workspace_id, owner_id, name, description, segment_id, relation_type)
  VALUES (
    v_company_id,
    (SELECT workspace_id FROM pg_temp.test_context),
    (SELECT actor_id FROM pg_temp.test_context),
    'Cardinality multi facts test',
    'Test company',
    (SELECT sector_id FROM pg_temp.test_context),
    'prospect'
  );

  FOREACH v_attribute IN ARRAY ARRAY[
    'technology', 'competitor', 'partner', 'market', 'strategic_priority',
    'transformation_program', 'differentiators', 'target_customers'
  ]
  LOOP
    v_first_id := pg_temp.make_proposal(
      (SELECT workspace_id FROM pg_temp.test_context), v_company_id, v_attribute,
      'null'::jsonb, v_attribute || ' one', v_attribute || '-one',
      (SELECT actor_id FROM pg_temp.test_context)
    );
    v_second_id := pg_temp.make_proposal(
      (SELECT workspace_id FROM pg_temp.test_context), v_company_id, v_attribute,
      'null'::jsonb, v_attribute || ' two', v_attribute || '-two',
      (SELECT actor_id FROM pg_temp.test_context)
    );
    v_ids := array_append(v_ids, v_first_id);
    v_ids := array_append(v_ids, v_second_id);
  END LOOP;

  FOR v_result IN
    SELECT * FROM public.validate_and_apply_enrichment_proposals(v_ids, 'all multi facts')
  LOOP
    v_result_count := v_result_count + 1;
    PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'every multi-value proposal must apply');
  END LOOP;

  PERFORM pg_temp.assert_true(v_result_count = 16, 'the multi-value batch must return all sixteen results');

  FOREACH v_attribute IN ARRAY ARRAY[
    'technology', 'competitor', 'partner', 'market', 'strategic_priority',
    'transformation_program', 'differentiators', 'target_customers'
  ]
  LOOP
    PERFORM pg_temp.assert_true(
      (
        SELECT count(*) = 2
        FROM public.account_facts
        WHERE target_id = v_company_id
          AND fact_type = v_attribute
          AND cardinality = 'multi'
          AND is_current = true
          AND primary_source_id IS NOT NULL
          AND source_proposal_id IS NOT NULL
      ),
      'both values and provenance must be retained for ' || v_attribute
    );
  END LOOP;

  SELECT * INTO v_result
  FROM public.apply_enrichment_proposal(v_ids[1], 'multi idempotence');
  PERFORM pg_temp.assert_eq_text(v_result.operation, 'already_applied', 'a repeated multi proposal must be idempotent');
END;
$$;

DO $$
DECLARE
  v_company_id uuid := gen_random_uuid();
  v_proposal_id uuid;
  v_source_id uuid;
  v_before jsonb;
  v_result public.proposal_operation_result;
BEGIN
  INSERT INTO public.companies (id, workspace_id, owner_id, name, description, segment_id, relation_type)
  VALUES (
    v_company_id,
    (SELECT workspace_id FROM pg_temp.test_context),
    (SELECT actor_id FROM pg_temp.test_context),
    'Cardinality repair test',
    'Test company',
    (SELECT sector_id FROM pg_temp.test_context),
    'prospect'
  );

  v_proposal_id := pg_temp.make_proposal(
    (SELECT workspace_id FROM pg_temp.test_context), v_company_id, 'market',
    'null'::jsonb, 'historic market', 'historic-market',
    (SELECT actor_id FROM pg_temp.test_context)
  );
  SELECT primary_source_id INTO v_source_id
  FROM public.enrichment_proposals WHERE id = v_proposal_id;

  INSERT INTO public.account_facts (
    workspace_id, target_type, target_id, fact_type, cardinality, value_text,
    value_json, normalized_value, normalized_value_hash, origin, confidence_score,
    primary_source_id, source_proposal_id, effective_at, verified_at, is_current
  )
  VALUES (
    (SELECT workspace_id FROM pg_temp.test_context), 'company', v_company_id,
    'market', 'single', 'historic market', jsonb_build_object('preserved', true),
    'historic market', md5('historic market'), 'external', 0.61,
    v_source_id, v_proposal_id, '2024-01-02 03:04:05+00'::timestamptz,
    '2024-02-03 04:05:06+00'::timestamptz, true
  );

  SELECT to_jsonb(account_fact) - 'cardinality' INTO v_before
  FROM public.account_facts AS account_fact
  WHERE account_fact.target_id = v_company_id AND account_fact.fact_type = 'market';

  ALTER TABLE public.account_facts DISABLE TRIGGER trg_account_facts_updated_at;
  WITH canonical AS (
    SELECT definition.fact_type, definition.cardinality
    FROM (VALUES ('market')) AS affected(attribute_name)
    CROSS JOIN LATERAL private.fact_attribute_definition(affected.attribute_name) AS definition
  )
  UPDATE public.account_facts AS account_fact
  SET cardinality = canonical.cardinality
  FROM canonical
  WHERE account_fact.target_id = v_company_id
    AND account_fact.fact_type = canonical.fact_type
    AND account_fact.cardinality <> canonical.cardinality;
  ALTER TABLE public.account_facts ENABLE TRIGGER trg_account_facts_updated_at;

  PERFORM pg_temp.assert_true(
    (SELECT cardinality = 'multi' FROM public.account_facts WHERE target_id = v_company_id AND fact_type = 'market'),
    'the repair must use the contract cardinality'
  );
  PERFORM pg_temp.assert_eq_jsonb(
    (SELECT to_jsonb(account_fact) - 'cardinality' FROM public.account_facts AS account_fact
     WHERE account_fact.target_id = v_company_id AND account_fact.fact_type = 'market'),
    v_before,
    'the repair may change only cardinality'
  );

  SELECT * INTO v_result
  FROM public.validate_and_apply_enrichment_proposal(
    pg_temp.make_proposal(
      (SELECT workspace_id FROM pg_temp.test_context), v_company_id, 'market',
      'null'::jsonb, 'market after repair', 'market-after-repair',
      (SELECT actor_id FROM pg_temp.test_context)
    ),
    'apply after repair'
  );
  PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'a repaired multi fact must accept a new value');
END;
$$;

DO $$
DECLARE
  v_success_id uuid := gen_random_uuid();
  v_failure_id uuid := gen_random_uuid();
  v_success_proposals uuid[];
  v_failure_proposals uuid[];
  v_result public.proposal_operation_result;
  v_result_count integer := 0;
BEGIN
  INSERT INTO public.companies (id, workspace_id, owner_id, name, description, segment_id, relation_type)
  VALUES
    (v_success_id, (SELECT workspace_id FROM pg_temp.test_context), (SELECT actor_id FROM pg_temp.test_context), 'Cardinality transaction success', 'before success', (SELECT sector_id FROM pg_temp.test_context), 'prospect'),
    (v_failure_id, (SELECT workspace_id FROM pg_temp.test_context), (SELECT actor_id FROM pg_temp.test_context), 'Cardinality transaction failure', 'before failure', (SELECT sector_id FROM pg_temp.test_context), 'prospect');

  v_success_proposals := ARRAY[
    pg_temp.make_proposal((SELECT workspace_id FROM pg_temp.test_context), v_success_id, 'description', to_jsonb('before success'::text), 'after success', 'success-crm', (SELECT actor_id FROM pg_temp.test_context)),
    pg_temp.make_proposal((SELECT workspace_id FROM pg_temp.test_context), v_success_id, 'business_model', 'null'::jsonb, 'subscription', 'success-single', (SELECT actor_id FROM pg_temp.test_context)),
    pg_temp.make_proposal((SELECT workspace_id FROM pg_temp.test_context), v_success_id, 'technology', 'null'::jsonb, 'kubernetes', 'success-technology', (SELECT actor_id FROM pg_temp.test_context)),
    pg_temp.make_proposal((SELECT workspace_id FROM pg_temp.test_context), v_success_id, 'competitor', 'null'::jsonb, 'competitor', 'success-competitor', (SELECT actor_id FROM pg_temp.test_context)),
    pg_temp.make_proposal((SELECT workspace_id FROM pg_temp.test_context), v_success_id, 'market', 'null'::jsonb, 'market', 'success-market', (SELECT actor_id FROM pg_temp.test_context))
  ];

  FOR v_result IN
    SELECT * FROM public.validate_and_apply_enrichment_proposals(v_success_proposals, 'success batch')
  LOOP
    v_result_count := v_result_count + 1;
    PERFORM pg_temp.assert_eq_text(v_result.operation, 'applied', 'every success batch proposal must apply');
  END LOOP;
  PERFORM pg_temp.assert_true(v_result_count = 5, 'the success batch must apply CRM, single, and multi proposals');
  PERFORM pg_temp.assert_true(
    (SELECT description = 'after success' FROM public.companies WHERE id = v_success_id),
    'the success batch must write its CRM field'
  );

  INSERT INTO public.account_facts (
    workspace_id, target_type, target_id, fact_type, cardinality, value_text,
    normalized_value, normalized_value_hash, origin, confidence_score, is_current
  )
  VALUES (
    (SELECT workspace_id FROM pg_temp.test_context), 'company', v_failure_id,
    'technology', 'single', 'legacy incompatible technology', 'legacy incompatible technology',
    md5('legacy incompatible technology'), 'external', 0.5, true
  );

  v_failure_proposals := ARRAY[
    pg_temp.make_proposal((SELECT workspace_id FROM pg_temp.test_context), v_failure_id, 'description', to_jsonb('before failure'::text), 'after failure', 'failure-crm', (SELECT actor_id FROM pg_temp.test_context)),
    pg_temp.make_proposal((SELECT workspace_id FROM pg_temp.test_context), v_failure_id, 'business_model', 'null'::jsonb, 'should rollback', 'failure-single', (SELECT actor_id FROM pg_temp.test_context)),
    pg_temp.make_proposal((SELECT workspace_id FROM pg_temp.test_context), v_failure_id, 'technology', 'null'::jsonb, 'should conflict', 'failure-technology', (SELECT actor_id FROM pg_temp.test_context))
  ];

  PERFORM pg_temp.expect_exception(
    format(
      'select * from public.validate_and_apply_enrichment_proposals(ARRAY[%L::uuid, %L::uuid, %L::uuid], %L)',
      v_failure_proposals[1], v_failure_proposals[2], v_failure_proposals[3], 'failed batch'
    ),
    'fact_cardinality_conflict',
    'a cardinality error must roll back the complete batch'
  );
  PERFORM pg_temp.assert_true(
    (SELECT description = 'before failure' FROM public.companies WHERE id = v_failure_id),
    'a failed batch must roll back its CRM write'
  );
  PERFORM pg_temp.assert_true(
    NOT EXISTS (SELECT 1 FROM public.account_facts WHERE target_id = v_failure_id AND fact_type = 'business_model'),
    'a failed batch must roll back its preceding single fact'
  );
  PERFORM pg_temp.assert_true(
    (SELECT count(*) = 3 FROM public.enrichment_proposals
     WHERE id = ANY(v_failure_proposals) AND status = 'proposed'),
    'a failed batch must roll back proposal decisions'
  );

  WITH canonical AS (
    SELECT definition.fact_type, definition.cardinality
    FROM (VALUES ('technology')) AS affected(attribute_name)
    CROSS JOIN LATERAL private.fact_attribute_definition(affected.attribute_name) AS definition
  )
  UPDATE public.account_facts AS account_fact
  SET cardinality = canonical.cardinality
  FROM canonical
  WHERE account_fact.target_id = v_failure_id
    AND account_fact.fact_type = canonical.fact_type
    AND account_fact.cardinality <> canonical.cardinality;
END;
$$;

DO $$
BEGIN
  PERFORM pg_temp.assert_true(
    NOT EXISTS (
      WITH affected(attribute_name) AS (
        VALUES
          ('technology'), ('competitor'), ('partner'), ('market'),
          ('strategic_priority'), ('transformation_program'),
          ('differentiators'), ('target_customers')
      )
      SELECT 1
      FROM public.account_facts AS account_fact
      JOIN affected ON affected.attribute_name = account_fact.fact_type
      CROSS JOIN LATERAL private.fact_attribute_definition(affected.attribute_name) AS definition
      WHERE account_fact.cardinality <> definition.cardinality
    ),
    'all persisted affected facts must match the SQL cardinality contract'
  );
END;
$$;

ROLLBACK;
