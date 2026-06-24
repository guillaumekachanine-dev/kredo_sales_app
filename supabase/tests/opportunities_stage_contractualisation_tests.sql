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

CREATE OR REPLACE FUNCTION pg_temp.expect_check_violation(
  p_sql text,
  p_context text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_state text;
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'assertion_failed: % (expected check violation)', p_context;
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
    IF v_state IS DISTINCT FROM '23514' THEN
      RAISE EXCEPTION 'assertion_failed: % (sqlstate %, expected 23514)', p_context, v_state;
    END IF;
END;
$$;

DO $$
DECLARE
  v_constraint_def text;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
  INTO v_constraint_def
  FROM pg_constraint c
  WHERE c.conname = 'opportunities_stage_check'
    AND c.conrelid = 'public.opportunities'::regclass;

  PERFORM pg_temp.assert_true(v_constraint_def IS NOT NULL, 'opportunities_stage_check must exist');
  PERFORM pg_temp.assert_true(position('contractualisation' in v_constraint_def) > 0, 'constraint must include contractualisation');

  EXECUTE 'CREATE TEMP TABLE pg_temp.opportunity_stage_probe (stage text)';
  EXECUTE format(
    'ALTER TABLE pg_temp.opportunity_stage_probe ADD CONSTRAINT opportunity_stage_probe_check %s',
    v_constraint_def
  );

  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('contractualisation')$$;
  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('qualification')$$;
  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('recherche_profil')$$;
  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('cv_envoyes')$$;
  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('entretien_client')$$;
  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('gagne')$$;
  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('perdu')$$;
  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('abandonne')$$;
  EXECUTE $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('non_traitee')$$;

  PERFORM pg_temp.expect_check_violation(
    $$INSERT INTO pg_temp.opportunity_stage_probe(stage) VALUES ('stage_inconnue')$$,
    'unknown stages must still be rejected'
  );
END;
$$;

ROLLBACK;
