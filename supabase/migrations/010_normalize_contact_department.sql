-- Normalize contacts.department + contacts.relationship_level to controlled vocabularies.
-- Matches the pattern used by relationship_role, lifecycle_status, etc.

-- ── 1. department ──────────────────────────────────────────────────────────────

-- Null out free-text values that don't match the canonical list
-- (field was previously an unvalidated text input)
UPDATE contacts
  SET department = NULL
  WHERE department IS NOT NULL
    AND department NOT IN (
      'general_management', 'sales', 'it', 'technical', 'it_operations',
      'cloud_devops', 'cybersecurity', 'data_bi', 'ai_innovation',
      'digital_transformation', 'procurement', 'business_unit', 'other'
    );

ALTER TABLE contacts
  ADD CONSTRAINT contacts_department_check
  CHECK (department = ANY (ARRAY[
    'general_management'::text,
    'sales'::text,
    'it'::text,
    'technical'::text,
    'it_operations'::text,
    'cloud_devops'::text,
    'cybersecurity'::text,
    'data_bi'::text,
    'ai_innovation'::text,
    'digital_transformation'::text,
    'procurement'::text,
    'business_unit'::text,
    'other'::text
  ]));

-- ── 2. relationship_level (intimité) ──────────────────────────────────────────

-- No existing constraint — simply add it with the 4 values including 'inexistant'
ALTER TABLE contacts
  ADD CONSTRAINT contacts_relationship_level_check
  CHECK (relationship_level = ANY (ARRAY[
    'inexistant'::text,
    'faible'::text,
    'moyen'::text,
    'fort'::text
  ]));
