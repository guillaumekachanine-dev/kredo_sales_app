-- Migration 2/2 : Colonne study_id sur source_corpora, contrainte de scope,
-- index partiel d'unicité et mise à jour de public.ingest_source_corpus pour le scope 'account'.

-- 1. Ajout de la colonne study_id
ALTER TABLE public.source_corpora
  ADD COLUMN IF NOT EXISTS study_id uuid NULL REFERENCES public.account_research_studies(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.source_corpora.study_id IS
  'Rattachement relationnel strict à une étude Account Intelligence ChatGPT Work.';

-- 2. Contrainte d'intégrité de portée (scope consistency)
ALTER TABLE public.source_corpora
  DROP CONSTRAINT IF EXISTS source_corpora_scope_consistency;

ALTER TABLE public.source_corpora
  ADD CONSTRAINT source_corpora_scope_consistency CHECK (
    (scope_kind = 'sector' AND sector_id IS NOT NULL AND study_id IS NULL)
    OR
    (scope_kind = 'account' AND study_id IS NOT NULL AND sector_id IS NULL)
    OR
    (scope_kind = 'thematic' AND sector_id IS NULL AND study_id IS NULL)
    OR
    (scope_kind = 'system' AND sector_id IS NULL AND study_id IS NULL)
  );

-- 3. Index partiel d'unicité : une seule occurrence de corpus Account Intelligence par étude
CREATE UNIQUE INDEX IF NOT EXISTS source_corpora_unique_account_study
  ON public.source_corpora (workspace_id, study_id)
  WHERE scope_kind = 'account';

-- 4. Évolution de la RPC ingest_source_corpus
CREATE OR REPLACE FUNCTION public.ingest_source_corpus(
  p_payload jsonb,
  p_segment_slug text,
  p_reason text,
  p_scope_kind public.corpus_scope_kind default 'sector'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path to ''
AS $function$
DECLARE
  v_workspace_id uuid; v_sector_id uuid; v_study_id uuid; v_study_record record;
  v_corpus_id uuid; v_source record; v_source_id uuid;
  v_inserted_sources integer := 0; v_inserted_items integer := 0;
  v_enabled_for_news boolean; v_enabled_for_account_watch boolean;
BEGIN
  PERFORM private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();
  IF NOT private.is_workspace_admin() THEN RAISE EXCEPTION 'Permission denied: workspace admin required'; END IF;
  IF p_payload IS NULL OR NOT (p_payload ? 'slug') OR NOT (p_payload ? 'version') OR NOT (p_payload ? 'snapshot_date') OR NOT (p_payload ? 'sources') OR jsonb_typeof(p_payload->'sources') <> 'array' THEN RAISE EXCEPTION 'Invalid payload structure'; END IF;

  IF p_scope_kind = 'system' THEN
    RAISE EXCEPTION 'scope_kind ''system'' is not importable';
  END IF;

  IF p_scope_kind = 'sector' THEN
    SELECT id INTO v_sector_id FROM public.sector_intelligence
      WHERE slug = p_segment_slug AND workspace_id = v_workspace_id AND level = 'segment';
    IF v_sector_id IS NULL THEN RAISE EXCEPTION 'Sector segment not found for slug: %', p_segment_slug; END IF;
    v_study_id := NULL;
    v_enabled_for_news := true;
    v_enabled_for_account_watch := true;
  ELSIF p_scope_kind = 'thematic' THEN
    IF p_segment_slug IS NOT NULL AND btrim(p_segment_slug) <> '' THEN
      RAISE EXCEPTION 'A thematic corpus must not target a sector segment (received: %)', p_segment_slug;
    END IF;
    v_sector_id := NULL;
    v_study_id := NULL;
    v_enabled_for_news := false;
    v_enabled_for_account_watch := false;
  ELSIF p_scope_kind = 'account' THEN
    IF p_segment_slug IS NOT NULL AND btrim(p_segment_slug) <> '' THEN
      RAISE EXCEPTION 'An account corpus must not target a sector segment (received: %)', p_segment_slug;
    END IF;
    IF NOT (p_payload ? 'study_id') OR (p_payload->>'study_id') IS NULL OR btrim(p_payload->>'study_id') = '' THEN
      RAISE EXCEPTION 'study_id is required in payload for an account corpus';
    END IF;
    v_study_id := (p_payload->>'study_id')::uuid;

    SELECT id, workspace_id, producer, status INTO v_study_record
      FROM public.account_research_studies
      WHERE id = v_study_id;

    IF v_study_record.id IS NULL THEN
      RAISE EXCEPTION 'Account research study % not found', v_study_id;
    END IF;
    IF v_study_record.workspace_id <> v_workspace_id THEN
      RAISE EXCEPTION 'Account research study % does not belong to current workspace', v_study_id;
    END IF;
    IF v_study_record.producer <> 'chatgpt_work' THEN
      RAISE EXCEPTION 'Account corpus distribution is only allowed for chatgpt_work studies (received: %)', v_study_record.producer;
    END IF;
    IF v_study_record.status <> 'ready' THEN
      RAISE EXCEPTION 'Account research study % is not ready (status: %)', v_study_id, v_study_record.status;
    END IF;

    v_sector_id := NULL;
    v_enabled_for_news := false;
    v_enabled_for_account_watch := false;
  ELSE
    RAISE EXCEPTION 'Unsupported scope_kind: %', p_scope_kind;
  END IF;

  INSERT INTO public.source_corpora (
    workspace_id,
    scope_kind,
    sector_id,
    study_id,
    slug,
    version,
    snapshot_date,
    is_current,
    quality_verdict,
    activation_state,
    enabled_for_news,
    enabled_for_account_watch,
    source_document_path,
    source_document_hash,
    gaps,
    metadata
  )
  VALUES (
    v_workspace_id,
    p_scope_kind,
    v_sector_id,
    v_study_id,
    p_payload->>'slug',
    p_payload->>'version',
    (p_payload->>'snapshot_date')::date,
    true,
    COALESCE(p_payload->>'quality_verdict','usable_with_caveats')::public.corpus_quality_verdict,
    COALESCE(p_payload->>'activation_state','draft')::public.corpus_activation_state,
    v_enabled_for_news,
    v_enabled_for_account_watch,
    p_payload->>'source_document_path',
    p_payload->>'source_document_hash',
    p_payload->'gaps',
    COALESCE(p_payload->'metadata','{}'::jsonb) || jsonb_build_object('reason',p_reason,'updated_at',now())
  )
  ON CONFLICT (workspace_id, slug, version) DO UPDATE SET
    is_current=EXCLUDED.is_current,
    quality_verdict=EXCLUDED.quality_verdict,
    activation_state=EXCLUDED.activation_state,
    study_id=EXCLUDED.study_id,
    sector_id=EXCLUDED.sector_id,
    gaps=EXCLUDED.gaps,
    metadata=EXCLUDED.metadata,
    updated_at=now()
  RETURNING id INTO v_corpus_id;

  UPDATE public.source_corpora SET is_current=false WHERE workspace_id=v_workspace_id AND slug=p_payload->>'slug' AND id<>v_corpus_id;

  FOR v_source IN SELECT * FROM jsonb_array_elements(p_payload->'sources') LOOP
    INSERT INTO public.source_catalog (
      workspace_id,
      source_key,
      name,
      publisher,
      domain,
      search_domain,
      collection_url,
      homepage_url,
      family,
      kredo_category,
      origin,
      content_temporality,
      usage_scopes,
      is_active
    )
    VALUES (
      v_workspace_id,
      v_source.value->>'source_key',
      v_source.value->>'name',
      v_source.value->>'publisher',
      v_source.value->>'domain',
      v_source.value->>'search_domain',
      v_source.value->>'collection_url',
      v_source.value->>'homepage_url',
      v_source.value->>'family',
      v_source.value->>'kredo_category',
      'corpus',
      COALESCE(v_source.value->>'content_temporality','periodic')::public.source_content_temporality,
      ARRAY(SELECT jsonb_array_elements_text(v_source.value->'usage_scopes')),
      true
    )
    ON CONFLICT (workspace_id, source_key) DO UPDATE SET
      name = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.name ELSE EXCLUDED.name END,
      publisher = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.publisher ELSE COALESCE(source_catalog.publisher, EXCLUDED.publisher) END,
      domain = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.domain ELSE COALESCE(source_catalog.domain, EXCLUDED.domain) END,
      search_domain = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.search_domain ELSE source_catalog.search_domain END,
      collection_url = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.collection_url ELSE COALESCE(source_catalog.collection_url, EXCLUDED.collection_url) END,
      homepage_url = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.homepage_url ELSE COALESCE(source_catalog.homepage_url, EXCLUDED.homepage_url) END,
      family = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.family ELSE COALESCE(source_catalog.family, EXCLUDED.family) END,
      kredo_category = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.kredo_category ELSE COALESCE(source_catalog.kredo_category, EXCLUDED.kredo_category) END,
      content_temporality = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.content_temporality ELSE COALESCE(source_catalog.content_temporality, EXCLUDED.content_temporality) END,
      usage_scopes = CASE
        WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.usage_scopes
        ELSE ARRAY(SELECT DISTINCT u FROM unnest(COALESCE(source_catalog.usage_scopes, '{}'::text[]) || COALESCE(EXCLUDED.usage_scopes, '{}'::text[])) AS u)
      END,
      updated_at = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.updated_at ELSE now() END
    RETURNING id INTO v_source_id;
    v_inserted_sources := v_inserted_sources + 1;

    INSERT INTO public.source_corpus_items (
      workspace_id,
      corpus_id,
      source_id,
      external_src_id,
      pack,
      tier,
      primary_role,
      utility_score,
      automation_fit,
      familles_couvertes,
      atteste,
      news_eligible,
      account_watch_eligible,
      is_enabled,
      exclusion_reason
    )
    VALUES (
      v_workspace_id,
      v_corpus_id,
      v_source_id,
      v_source.value->>'external_src_id',
      (v_source.value->>'pack')::public.corpus_pack_type,
      v_source.value->>'tier',
      (v_source.value->>'primary_role')::public.corpus_source_role,
      (v_source.value->>'utility_score')::integer,
      (v_source.value->>'automation_fit')::public.corpus_automation_fit,
      ARRAY(SELECT jsonb_array_elements_text(v_source.value->'familles_couvertes')),
      v_source.value->>'atteste',
      COALESCE((v_source.value->>'news_eligible')::boolean,false),
      COALESCE((v_source.value->>'account_watch_eligible')::boolean,false),
      COALESCE((v_source.value->>'is_enabled')::boolean,true),
      v_source.value->>'exclusion_reason'
    )
    ON CONFLICT (corpus_id, source_id) DO UPDATE SET
      external_src_id=EXCLUDED.external_src_id,
      pack=EXCLUDED.pack,
      tier=EXCLUDED.tier,
      primary_role=EXCLUDED.primary_role,
      utility_score=EXCLUDED.utility_score,
      automation_fit=EXCLUDED.automation_fit,
      familles_couvertes=EXCLUDED.familles_couvertes,
      atteste=EXCLUDED.atteste,
      news_eligible=EXCLUDED.news_eligible,
      account_watch_eligible=EXCLUDED.account_watch_eligible,
      is_enabled=EXCLUDED.is_enabled,
      exclusion_reason=EXCLUDED.exclusion_reason,
      updated_at=now();
    v_inserted_items := v_inserted_items + 1;
  END LOOP;

  RETURN jsonb_build_object('corpus_id',v_corpus_id,'sources_upserted',v_inserted_sources,'items_upserted',v_inserted_items);
END;
$function$;

REVOKE ALL ON FUNCTION public.ingest_source_corpus(jsonb, text, text, public.corpus_scope_kind) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ingest_source_corpus(jsonb, text, text, public.corpus_scope_kind) FROM anon;
GRANT EXECUTE ON FUNCTION public.ingest_source_corpus(jsonb, text, text, public.corpus_scope_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_source_corpus(jsonb, text, text, public.corpus_scope_kind) TO service_role;
