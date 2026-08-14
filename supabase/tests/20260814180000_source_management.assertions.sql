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
  v_workspace_id uuid;
  v_profile_id uuid;
  v_segment_slug text;
  v_count integer;
  v_result jsonb;
BEGIN
  SELECT id INTO v_workspace_id FROM public.workspaces LIMIT 1;
  SELECT id INTO v_profile_id FROM public.profiles WHERE workspace_id = v_workspace_id AND role IN ('owner','admin') LIMIT 1;
  SELECT slug INTO v_segment_slug FROM public.sector_intelligence WHERE workspace_id = v_workspace_id AND level = 'segment' LIMIT 1;

  PERFORM pg_temp.assert_true(v_workspace_id IS NOT NULL, 'workspace required');
  PERFORM pg_temp.assert_true(v_profile_id IS NOT NULL, 'admin profile required');
  PERFORM pg_temp.assert_true(v_segment_slug IS NOT NULL, 'segment required');

  PERFORM pg_temp.assert_true(to_regclass('public.source_catalog') IS NOT NULL, 'source_catalog exists');
  PERFORM pg_temp.assert_true(to_regclass('public.source_corpora') IS NOT NULL, 'source_corpora exists');
  PERFORM pg_temp.assert_true(to_regclass('public.source_corpus_items') IS NOT NULL, 'source_corpus_items exists');
  PERFORM pg_temp.assert_true(to_regclass('public.v_effective_watch_sources') IS NOT NULL, 'effective source view exists');

  PERFORM pg_temp.assert_true(
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account_watch_settings' AND column_name='include_sector_corpus' AND column_default='true'),
    'account_watch_settings.include_sector_corpus exists with default true'
  );
  PERFORM pg_temp.assert_true(
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veille_articles' AND column_name='source_catalog_id'),
    'veille_articles.source_catalog_id exists'
  );
  PERFORM pg_temp.assert_true(
    EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='v_effective_watch_sources' AND 'security_invoker=true'=ANY(c.reloptions)),
    'v_effective_watch_sources is security_invoker'
  );

  SELECT count(*) INTO v_count FROM public.source_catalog WHERE workspace_id = v_workspace_id AND origin = 'system';
  PERFORM pg_temp.assert_true(v_count = 14, '14 system sources seeded');
  PERFORM pg_temp.assert_true((SELECT collection_url FROM public.source_catalog WHERE workspace_id=v_workspace_id AND source_key='LeMagIT') = 'https://www.lemagit.fr/rss/ContentSyndication.xml', 'LeMagIT feed corrected');
  PERFORM pg_temp.assert_true((SELECT collection_url FROM public.source_catalog WHERE workspace_id=v_workspace_id AND source_key='Premium Beauty News') = 'https://www.premiumbeautynews.com/spip.php?page=backend', 'Premium Beauty News feed corrected');
  PERFORM pg_temp.assert_true((SELECT search_domain FROM public.source_catalog WHERE workspace_id=v_workspace_id AND source_key='The Neuron') = 'theneuron.ai', 'The Neuron domain corrected');
  PERFORM pg_temp.assert_true((SELECT count(*) FROM public.source_catalog WHERE workspace_id=v_workspace_id AND source_key IN ('The Batch (DeepLearning.AI)','Anthropic News','The Neuron','a16z') AND collection_url IS NULL) = 4, 'four site_search sources have no RSS URL');
  PERFORM pg_temp.assert_true((SELECT count(*) FROM public.source_catalog WHERE workspace_id=v_workspace_id AND origin='system' AND search_domain ~ '^https?://') = 0, 'search_domain has no protocol');

  PERFORM pg_temp.assert_true(NOT has_function_privilege('anon','public.ingest_source_corpus(jsonb,text,text)','execute'), 'anon cannot execute ingest_source_corpus');
  PERFORM pg_temp.assert_true(has_function_privilege('authenticated','public.ingest_source_corpus(jsonb,text,text)','execute'), 'authenticated can execute ingest_source_corpus');

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_profile_id), true);
  SET LOCAL ROLE authenticated;

  SELECT public.ingest_source_corpus(
    '{"slug":"test-source-management","version":"1.0","snapshot_date":"2026-08-14","activation_state":"active","sources":[{"source_key":"test-source-management-source","name":"Test Source Management","search_domain":"example.com","collection_url":null,"kredo_category":"strategie","content_temporality":"periodic","usage_scopes":["news"],"pack":"minimal","primary_role":"watch","utility_score":10,"automation_fit":"high","familles_couvertes":["test"],"news_eligible":true,"account_watch_eligible":true,"is_enabled":true}]}',
    v_segment_slug,
    'source management assertion'
  ) INTO v_result;
  SELECT public.ingest_source_corpus(
    '{"slug":"test-source-management","version":"1.0","snapshot_date":"2026-08-14","activation_state":"active","sources":[{"source_key":"test-source-management-source","name":"Test Source Management","search_domain":"example.com","collection_url":null,"kredo_category":"strategie","content_temporality":"periodic","usage_scopes":["news"],"pack":"minimal","primary_role":"watch","utility_score":10,"automation_fit":"high","familles_couvertes":["test"],"news_eligible":true,"account_watch_eligible":true,"is_enabled":true}]}',
    v_segment_slug,
    'source management assertion repeat'
  ) INTO v_result;

  RESET ROLE;

  PERFORM pg_temp.assert_true((SELECT count(*) FROM public.source_corpora WHERE workspace_id=v_workspace_id AND slug='test-source-management') = 1, 'RPC corpus import is idempotent');
  PERFORM pg_temp.assert_true((SELECT count(*) FROM public.source_catalog WHERE workspace_id=v_workspace_id AND source_key='test-source-management-source') = 1, 'RPC source import is idempotent');
  PERFORM pg_temp.assert_true((SELECT count(*) FROM public.source_corpus_items sci JOIN public.source_corpora corp ON corp.id=sci.corpus_id WHERE corp.workspace_id=v_workspace_id AND corp.slug='test-source-management') = 1, 'RPC item import is idempotent');

  PERFORM pg_temp.assert_true((SELECT count(*) FROM public.v_effective_watch_sources WHERE source_key='test-source-management-source' AND collection_mode='site_search') >= 1, 'imported source is visible in site_search mode');
END;
$$;

ROLLBACK;
