-- ADR-0022 §3.9 — la RPC d'ingestion accepte un corpus THEMATIQUE (sans segment).
--
-- Avant : `scope_kind` etait code en dur a 'sector' et le segment obligatoire
-- (RAISE 'Sector segment not found'). Un corpus thematique (Folio AI Tech...) ne
-- pouvait donc pas s'ecrire, alors que le SEUL chemin d'ecriture autorise sur
-- source_catalog / source_corpora / source_corpus_items est cette fonction.
--
-- DROP puis CREATE, et non CREATE OR REPLACE : ajouter un parametre cree une
-- SURCHARGE, et l'appel a 3 arguments deviendrait ambigu (42725) cote PostgREST.
-- Le 4e parametre porte un DEFAULT 'sector' : l'appelant TypeScript existant
-- (`ingestSourceCorpusAction`, 3 arguments nommes) continue de fonctionner a
-- l'identique, sans modification.
--
-- Le corps est repris a l'identique de la version precedente, a trois exceptions
-- pres, toutes gouvernees par `p_scope_kind` : la resolution du segment, la valeur
-- ecrite dans `scope_kind`/`sector_id`, et les deux drapeaux d'activation.

drop function if exists public.ingest_source_corpus(jsonb, text, text);

create or replace function public.ingest_source_corpus(
  p_payload jsonb,
  p_segment_slug text,
  p_reason text,
  p_scope_kind public.corpus_scope_kind default 'sector'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
DECLARE
  v_workspace_id uuid; v_sector_id uuid; v_corpus_id uuid; v_source record; v_source_id uuid;
  v_inserted_sources integer := 0; v_inserted_items integer := 0;
  v_enabled_for_news boolean; v_enabled_for_account_watch boolean;
BEGIN
  PERFORM private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();
  IF NOT private.is_workspace_admin() THEN RAISE EXCEPTION 'Permission denied: workspace admin required'; END IF;
  IF p_payload IS NULL OR NOT (p_payload ? 'slug') OR NOT (p_payload ? 'version') OR NOT (p_payload ? 'snapshot_date') OR NOT (p_payload ? 'sources') OR jsonb_typeof(p_payload->'sources') <> 'array' THEN RAISE EXCEPTION 'Invalid payload structure'; END IF;

  -- Le socle editorial ne s'importe pas : il est maintenu a la main.
  IF p_scope_kind = 'system' THEN
    RAISE EXCEPTION 'scope_kind ''system'' is not importable';
  END IF;

  IF p_scope_kind = 'sector' THEN
    SELECT id INTO v_sector_id FROM public.sector_intelligence
      WHERE slug = p_segment_slug AND workspace_id = v_workspace_id AND level = 'segment';
    IF v_sector_id IS NULL THEN RAISE EXCEPTION 'Sector segment not found for slug: %', p_segment_slug; END IF;
    v_enabled_for_news := true;
    v_enabled_for_account_watch := true;
  ELSE
    -- thematic : aucun segment, et surtout PAS d'entree automatique dans le digest
    -- du cron. `enabled_for_news = false` empeche la branche 2 de
    -- v_effective_watch_sources d'elargir le digest hebdomadaire en silence
    -- (ADR-0022 §3.6). Le mode corpus lit v_corpus_news_sources, qui ignore ce drapeau.
    IF p_segment_slug IS NOT NULL AND btrim(p_segment_slug) <> '' THEN
      RAISE EXCEPTION 'A thematic corpus must not target a sector segment (received: %)', p_segment_slug;
    END IF;
    v_sector_id := NULL;
    v_enabled_for_news := false;
    v_enabled_for_account_watch := false;
  END IF;

  INSERT INTO public.source_corpora (workspace_id,scope_kind,sector_id,slug,version,snapshot_date,is_current,quality_verdict,activation_state,enabled_for_news,enabled_for_account_watch,source_document_path,source_document_hash,gaps,metadata)
  VALUES (v_workspace_id,p_scope_kind,v_sector_id,p_payload->>'slug',p_payload->>'version',(p_payload->>'snapshot_date')::date,true,COALESCE(p_payload->>'quality_verdict','usable_with_caveats')::public.corpus_quality_verdict,COALESCE(p_payload->>'activation_state','draft')::public.corpus_activation_state,v_enabled_for_news,v_enabled_for_account_watch,p_payload->>'source_document_path',p_payload->>'source_document_hash',p_payload->'gaps',COALESCE(p_payload->'metadata','{}'::jsonb) || jsonb_build_object('reason',p_reason,'updated_at',now()))
  ON CONFLICT (workspace_id, slug, version) DO UPDATE SET is_current=EXCLUDED.is_current, quality_verdict=EXCLUDED.quality_verdict, activation_state=EXCLUDED.activation_state, gaps=EXCLUDED.gaps, metadata=EXCLUDED.metadata, updated_at=now()
  RETURNING id INTO v_corpus_id;

  UPDATE public.source_corpora SET is_current=false WHERE workspace_id=v_workspace_id AND slug=p_payload->>'slug' AND id<>v_corpus_id;

  FOR v_source IN SELECT * FROM jsonb_array_elements(p_payload->'sources') LOOP
    INSERT INTO public.source_catalog (workspace_id,source_key,name,publisher,domain,search_domain,collection_url,homepage_url,family,kredo_category,origin,content_temporality,usage_scopes,is_active)
    VALUES (v_workspace_id,v_source.value->>'source_key',v_source.value->>'name',v_source.value->>'publisher',v_source.value->>'domain',v_source.value->>'search_domain',v_source.value->>'collection_url',v_source.value->>'homepage_url',v_source.value->>'family',v_source.value->>'kredo_category','corpus',COALESCE(v_source.value->>'content_temporality','periodic')::public.source_content_temporality,ARRAY(SELECT jsonb_array_elements_text(v_source.value->'usage_scopes')),true)
    ON CONFLICT (workspace_id, source_key) DO UPDATE SET
      name = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.name ELSE EXCLUDED.name END,
      publisher = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.publisher ELSE EXCLUDED.publisher END,
      domain = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.domain ELSE EXCLUDED.domain END,
      search_domain = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.search_domain ELSE EXCLUDED.search_domain END,
      collection_url = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.collection_url ELSE EXCLUDED.collection_url END,
      homepage_url = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.homepage_url ELSE EXCLUDED.homepage_url END,
      family = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.family ELSE EXCLUDED.family END,
      kredo_category = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.kredo_category ELSE EXCLUDED.kredo_category END,
      content_temporality = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.content_temporality ELSE EXCLUDED.content_temporality END,
      usage_scopes = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.usage_scopes ELSE EXCLUDED.usage_scopes END,
      updated_at = CASE WHEN source_catalog.origin='system' OR source_catalog.is_locked THEN source_catalog.updated_at ELSE now() END
    RETURNING id INTO v_source_id;
    v_inserted_sources := v_inserted_sources + 1;

    INSERT INTO public.source_corpus_items (workspace_id,corpus_id,source_id,external_src_id,pack,tier,primary_role,utility_score,automation_fit,familles_couvertes,atteste,news_eligible,account_watch_eligible,is_enabled,exclusion_reason)
    VALUES (v_workspace_id,v_corpus_id,v_source_id,v_source.value->>'external_src_id',(v_source.value->>'pack')::public.corpus_pack_type,v_source.value->>'tier',(v_source.value->>'primary_role')::public.corpus_source_role,(v_source.value->>'utility_score')::integer,(v_source.value->>'automation_fit')::public.corpus_automation_fit,ARRAY(SELECT jsonb_array_elements_text(v_source.value->'familles_couvertes')),v_source.value->>'atteste',COALESCE((v_source.value->>'news_eligible')::boolean,false),COALESCE((v_source.value->>'account_watch_eligible')::boolean,false),COALESCE((v_source.value->>'is_enabled')::boolean,true),v_source.value->>'exclusion_reason')
    ON CONFLICT (corpus_id, source_id) DO UPDATE SET external_src_id=EXCLUDED.external_src_id, pack=EXCLUDED.pack, tier=EXCLUDED.tier, primary_role=EXCLUDED.primary_role, utility_score=EXCLUDED.utility_score, automation_fit=EXCLUDED.automation_fit, familles_couvertes=EXCLUDED.familles_couvertes, atteste=EXCLUDED.atteste, news_eligible=EXCLUDED.news_eligible, account_watch_eligible=EXCLUDED.account_watch_eligible, is_enabled=EXCLUDED.is_enabled, exclusion_reason=EXCLUDED.exclusion_reason, updated_at=now();
    v_inserted_items := v_inserted_items + 1;
  END LOOP;

  RETURN jsonb_build_object('corpus_id',v_corpus_id,'sources_upserted',v_inserted_sources,'items_upserted',v_inserted_items);
END;
$function$;

-- Les grants sont perdus par le DROP : ils sont reposes a l'identique de la version
-- precedente. `anon` n'en avait pas et n'en recoit pas.
revoke all on function public.ingest_source_corpus(jsonb, text, text, public.corpus_scope_kind) from public;
grant execute on function public.ingest_source_corpus(jsonb, text, text, public.corpus_scope_kind) to authenticated;
grant execute on function public.ingest_source_corpus(jsonb, text, text, public.corpus_scope_kind) to service_role;
