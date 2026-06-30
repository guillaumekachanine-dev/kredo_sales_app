-- ============================================================
-- KREDO — SNAPSHOT QUERY (à exécuter avant chaque session externe)
-- ============================================================
-- USAGE :
--   1. Exécute cette requête via le connecteur Supabase MCP (Claude)
--      ou directement dans le SQL Editor de Supabase Studio.
--   2. Copie le résultat JSON intégral.
--   3. Colle-le en début de conversation Gemini / Codex, juste après
--      avoir collé le contenu de SKILL.md et schema_map.md.
--
-- POURQUOI : Gemini et Codex n'ont pas de connexion live à Supabase.
-- Sans ce snapshot, ils risquent de réutiliser un UUID périmé,
-- recréer un nom de société qui existe déjà, ou casser la séquence
-- des emails de test (.test, cXX).
--
-- FRAÎCHEUR : ce snapshot a une durée de vie courte. Si la base a
-- évolué depuis (nouvelle migration, nouveau secteur, etc.),
-- relance la requête avant de générer.
-- ============================================================

SELECT jsonb_pretty(jsonb_build_object(
  'snapshot_date', now()::date,
  'workspace_id', (SELECT id FROM workspaces LIMIT 1),

  'reference_ids', jsonb_build_object(
    'offer_practices', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug)) FROM offer_practices),
    'offer_engagement_types', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'billing_model', billing_model)) FROM offer_engagement_types),
    'sector_intelligence', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug)) FROM sector_intelligence),
    'job_profiles', (SELECT jsonb_agg(jsonb_build_object('id', id, 'title', title, 'practice_id', practice_id)) FROM job_profiles),
    'offers', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'practice_id', practice_id)) FROM offers)
  ),

  'volumetrics', jsonb_build_object(
    'companies_total', (SELECT COUNT(*) FROM companies),
    'companies_client_actif', (SELECT COUNT(*) FROM companies WHERE lifecycle_status = 'client_actif'),
    'companies_prospect', (SELECT COUNT(*) FROM companies WHERE lifecycle_status = 'prospect'),
    'companies_ancien_client', (SELECT COUNT(*) FROM companies WHERE lifecycle_status = 'ancien_client'),
    'persons', (SELECT COUNT(*) FROM persons),
    'contacts', (SELECT COUNT(*) FROM contacts),
    'collaborators', (SELECT COUNT(*) FROM collaborators),
    'candidates', (SELECT COUNT(*) FROM candidates),
    'opportunities', (SELECT COUNT(*) FROM opportunities),
    'missions', (SELECT COUNT(*) FROM missions),
    'interactions', (SELECT COUNT(*) FROM interactions),
    'calendar_events', (SELECT COUNT(*) FROM calendar_events),
    'skills', (SELECT COUNT(*) FROM skills)
  ),

  'existing_company_names', (SELECT jsonb_agg(name ORDER BY name) FROM companies),

  'existing_emails', (SELECT jsonb_agg(primary_email) FROM persons WHERE primary_email IS NOT NULL),

  'next_kredo_test_sequence', (
    SELECT COALESCE(MAX((regexp_match(primary_email, 'c(\d+)@kredo\.test'))[1]::int), 0) + 1
    FROM persons
    WHERE primary_email LIKE '%@kredo.test'
  ),

  'opportunities_by_stage', (
    SELECT jsonb_object_agg(stage, cnt) FROM (
      SELECT stage, COUNT(*) AS cnt FROM opportunities WHERE stage IS NOT NULL GROUP BY stage
    ) x
  ),

  'collaborators_active_with_practice', (
    SELECT jsonb_agg(jsonb_build_object('practice', practice, 'seniority', seniority, 'status', status))
    FROM collaborators
  ),

  'tjm_benchmarks_by_seniority', (
    SELECT jsonb_object_agg(seniority_level, jsonb_build_object('tjm_min', mn, 'tjm_max', mx))
    FROM (
      SELECT seniority_level, MIN(tjm_min) AS mn, MAX(tjm_max) AS mx
      FROM offer_pricing_grids
      WHERE seniority_level IS NOT NULL
      GROUP BY seniority_level
    ) y
  ),

  'skills_by_category', (
    SELECT jsonb_object_agg(category, cnt) FROM (
      SELECT category, COUNT(*) AS cnt FROM skills WHERE category IS NOT NULL GROUP BY category
    ) z
  )
)) AS kredo_snapshot;
