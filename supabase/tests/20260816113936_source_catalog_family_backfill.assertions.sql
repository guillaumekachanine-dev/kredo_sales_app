-- Assertions post-migration 079_source_catalog_family_backfill.
-- À rejouer après application : vérifie que le backfill est complet et idempotent,
-- et qu'il n'a touché aucune source non-système.

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

DO $$
DECLARE
  v_null_system_family_count integer;
  v_manual_touched_count integer;
BEGIN
  SELECT count(*) INTO v_null_system_family_count
  FROM public.source_catalog
  WHERE origin = 'system' AND (family IS NULL OR btrim(family) = '');

  PERFORM pg_temp.assert_true(
    v_null_system_family_count = 0,
    'toutes les sources système portent une famille non vide après backfill'
  );

  -- Le backfill est scopé WHERE origin='system' : aucune source manuelle ne doit
  -- porter une des 6 valeurs de famille historiques comme effet de bord d'un futur rerun.
  SELECT count(*) INTO v_manual_touched_count
  FROM public.source_catalog
  WHERE origin <> 'system'
    AND family IN (
      'Marché IT / ESN France',
      'IA appliquée / ROI entreprise',
      'Frontier & acteurs IA',
      'Stratégie & marché',
      'Réglementaire & souveraineté',
      'Verticaux sectoriels'
    );

  PERFORM pg_temp.assert_true(
    v_manual_touched_count = 0,
    'le backfill famille ne touche jamais une source non-système'
  );
END $$;

ROLLBACK;
