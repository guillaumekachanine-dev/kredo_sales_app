-- Migration Lot 1: Ajout des types de faits d'identité France pour les comptes (A1)
-- Les faits 'establishment' et 'executive' sont de cardinalité 'multi', les autres sont 'single'.

CREATE OR REPLACE FUNCTION private.fact_attribute_definition(
  p_attribute_name text,
  OUT fact_type text,
  OUT fact_subtype text,
  OUT cardinality text
)
RETURNS record
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  CASE p_attribute_name
    WHEN 'business_model' THEN
      fact_type := 'business_model';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'primary_activity' THEN
      fact_type := 'primary_activity';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'technology' THEN
      fact_type := 'technology';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'competitor' THEN
      fact_type := 'competitor';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'partner' THEN
      fact_type := 'partner';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'market' THEN
      fact_type := 'market';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'strategic_priority' THEN
      fact_type := 'strategic_priority';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'transformation_program' THEN
      fact_type := 'transformation_program';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'establishment_count' THEN
      fact_type := 'establishment_count';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'growth_trend' THEN
      fact_type := 'growth_trend';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'geographic_reach' THEN
      fact_type := 'geographic_reach';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'value_proposition' THEN
      fact_type := 'value_proposition';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'differentiators' THEN
      fact_type := 'differentiators';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'market_position' THEN
      fact_type := 'market_position';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'marketing_position' THEN
      fact_type := 'marketing_position';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'target_customers' THEN
      fact_type := 'target_customers';
      fact_subtype := NULL;
      cardinality := 'multi';
      
    -- Nouveaux faits A1 (Lot 1)
    WHEN 'legal_id' THEN
      fact_type := 'legal_id';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'collective_agreement' THEN
      fact_type := 'collective_agreement';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'headcount_france' THEN
      fact_type := 'headcount_france';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'incorporation_date' THEN
      fact_type := 'incorporation_date';
      fact_subtype := NULL;
      cardinality := 'single';
    WHEN 'establishment' THEN
      fact_type := 'establishment';
      fact_subtype := NULL;
      cardinality := 'multi';
    WHEN 'executive' THEN
      fact_type := 'executive';
      fact_subtype := NULL;
      cardinality := 'multi';
      
    ELSE
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'attribute_not_allowed',
        DETAIL = format('Attribute "%s" is not supported by the MVP application API.', p_attribute_name);
  END CASE;
END;
$$;
