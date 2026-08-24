-- Repair the historical direct-batch cardinality drift without changing fact content,
-- lifecycle, provenance, or timestamps. Cardinality remains owned by the SQL contract.
BEGIN;

-- The only data mutation in this migration is account_facts.cardinality. The table's
-- normal updated_at trigger is suspended while the table is locked so this mechanical
-- correction does not rewrite operational timestamps. Any error rolls back both DDL
-- state and data because the migration is one transaction.
ALTER TABLE public.account_facts DISABLE TRIGGER trg_account_facts_updated_at;

WITH bounded_fact_types(attribute_name) AS (
  VALUES
    ('technology'),
    ('competitor'),
    ('partner'),
    ('market'),
    ('strategic_priority'),
    ('transformation_program'),
    ('differentiators'),
    ('target_customers')
),
canonical AS (
  SELECT definition.fact_type, definition.cardinality
  FROM bounded_fact_types
  CROSS JOIN LATERAL private.fact_attribute_definition(
    bounded_fact_types.attribute_name
  ) AS definition
)
UPDATE public.account_facts AS account_fact
SET cardinality = canonical.cardinality
FROM canonical
WHERE account_fact.fact_type = canonical.fact_type
  AND account_fact.cardinality <> canonical.cardinality;

ALTER TABLE public.account_facts ENABLE TRIGGER trg_account_facts_updated_at;

COMMIT;
