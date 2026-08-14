-- Migration: 077_source_management
-- Lot 1 - Gestion des sources

CREATE TYPE public.source_origin AS ENUM ('system','manual','corpus');
CREATE TYPE public.source_content_temporality AS ENUM ('static','periodic','continuous');
CREATE TYPE public.corpus_scope_kind AS ENUM ('system','sector');
CREATE TYPE public.corpus_activation_state AS ENUM ('draft','active');
CREATE TYPE public.corpus_quality_verdict AS ENUM ('production_ready','usable_with_caveats','rejected');
CREATE TYPE public.corpus_pack_type AS ENUM ('minimal','enrichi');
CREATE TYPE public.corpus_automation_fit AS ENUM ('high','medium','low','manual_only');
CREATE TYPE public.corpus_source_role AS ENUM ('proof','corroboration','discovery','watch');

CREATE TABLE public.source_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id() REFERENCES public.workspaces(id),
  source_key text NOT NULL,
  name text NOT NULL,
  publisher text,
  domain text,
  search_domain text NOT NULL,
  collection_url text,
  homepage_url text,
  family text,
  kredo_category text CHECK (kredo_category IN ('marche-esn','ia-appliquee','frontier','strategie','reglementaire','vertical')),
  origin public.source_origin NOT NULL DEFAULT 'manual',
  content_temporality public.source_content_temporality NOT NULL DEFAULT 'periodic',
  usage_scopes text[] NOT NULL DEFAULT '{}',
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','valid','rejected','unreachable')),
  is_active boolean NOT NULL DEFAULT true,
  is_locked boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  last_error text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_key)
);

CREATE TABLE public.source_corpora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id() REFERENCES public.workspaces(id),
  scope_kind public.corpus_scope_kind NOT NULL,
  sector_id uuid REFERENCES public.sector_intelligence(id),
  slug text NOT NULL,
  version text NOT NULL,
  snapshot_date date NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  quality_verdict public.corpus_quality_verdict NOT NULL DEFAULT 'usable_with_caveats',
  activation_state public.corpus_activation_state NOT NULL DEFAULT 'draft',
  enabled_for_news boolean NOT NULL DEFAULT true,
  enabled_for_account_watch boolean NOT NULL DEFAULT true,
  source_document_path text,
  source_document_hash text,
  gaps jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug, version)
);

CREATE TABLE public.source_corpus_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id() REFERENCES public.workspaces(id),
  corpus_id uuid NOT NULL REFERENCES public.source_corpora(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.source_catalog(id) ON DELETE CASCADE,
  external_src_id text,
  pack public.corpus_pack_type NOT NULL,
  tier text,
  primary_role public.corpus_source_role,
  utility_score integer,
  automation_fit public.corpus_automation_fit,
  familles_couvertes text[] NOT NULL DEFAULT '{}',
  atteste text,
  news_eligible boolean NOT NULL DEFAULT false,
  account_watch_eligible boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  exclusion_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (corpus_id, source_id)
);

ALTER TABLE public.account_watch_settings ADD COLUMN include_sector_corpus boolean NOT NULL DEFAULT true;
ALTER TABLE public.veille_articles ADD COLUMN source_catalog_id uuid NULL REFERENCES public.source_catalog(id) ON DELETE SET NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.source_catalog FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.source_corpora FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.source_corpus_items FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.source_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_corpora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_corpus_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for workspace users" ON public.source_catalog FOR SELECT TO authenticated USING (workspace_id = (select private.current_workspace_id()));
CREATE POLICY "Enable insert for workspace admin" ON public.source_catalog FOR INSERT TO authenticated WITH CHECK (workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin()) AND origin <> 'system');
CREATE POLICY "Enable update for workspace admin" ON public.source_catalog FOR UPDATE TO authenticated USING (workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin()) AND origin <> 'system' AND NOT is_locked) WITH CHECK (workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin()) AND origin <> 'system' AND NOT is_locked);
CREATE POLICY "Enable delete for workspace admin" ON public.source_catalog FOR DELETE TO authenticated USING (workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin()) AND origin <> 'system' AND NOT is_locked);

CREATE POLICY "Enable read for workspace users" ON public.source_corpora FOR SELECT TO authenticated USING (workspace_id = (select private.current_workspace_id()));
CREATE POLICY "Enable insert for workspace admin" ON public.source_corpora FOR INSERT TO authenticated WITH CHECK (workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin()) AND scope_kind <> 'system');
CREATE POLICY "Enable update for workspace admin" ON public.source_corpora FOR UPDATE TO authenticated USING (workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin()) AND scope_kind <> 'system') WITH CHECK (workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin()) AND scope_kind <> 'system');
CREATE POLICY "Enable delete for workspace admin" ON public.source_corpora FOR DELETE TO authenticated USING (workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin()) AND scope_kind <> 'system');

CREATE POLICY "Enable read for workspace users" ON public.source_corpus_items FOR SELECT TO authenticated USING (workspace_id = (select private.current_workspace_id()));
CREATE POLICY "Enable insert for workspace admin" ON public.source_corpus_items FOR INSERT TO authenticated WITH CHECK (
  workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin())
  AND EXISTS (SELECT 1 FROM public.source_corpora corp WHERE corp.id = corpus_id AND corp.workspace_id = workspace_id AND corp.scope_kind <> 'system')
  AND EXISTS (SELECT 1 FROM public.source_catalog sc WHERE sc.id = source_id AND sc.workspace_id = workspace_id)
);
CREATE POLICY "Enable update for workspace admin" ON public.source_corpus_items FOR UPDATE TO authenticated USING (
  workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin())
  AND EXISTS (SELECT 1 FROM public.source_corpora corp WHERE corp.id = corpus_id AND corp.workspace_id = workspace_id AND corp.scope_kind <> 'system')
  AND EXISTS (SELECT 1 FROM public.source_catalog sc WHERE sc.id = source_id AND sc.workspace_id = workspace_id)
) WITH CHECK (
  workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin())
  AND EXISTS (SELECT 1 FROM public.source_corpora corp WHERE corp.id = corpus_id AND corp.workspace_id = workspace_id AND corp.scope_kind <> 'system')
  AND EXISTS (SELECT 1 FROM public.source_catalog sc WHERE sc.id = source_id AND sc.workspace_id = workspace_id)
);
CREATE POLICY "Enable delete for workspace admin" ON public.source_corpus_items FOR DELETE TO authenticated USING (
  workspace_id = (select private.current_workspace_id()) AND (select private.is_workspace_admin())
  AND EXISTS (SELECT 1 FROM public.source_corpora corp WHERE corp.id = corpus_id AND corp.workspace_id = workspace_id AND corp.scope_kind <> 'system')
  AND EXISTS (SELECT 1 FROM public.source_catalog sc WHERE sc.id = source_id AND sc.workspace_id = workspace_id)
);

CREATE OR REPLACE VIEW public.v_effective_watch_sources WITH (security_invoker = true) AS
SELECT DISTINCT ON (usage_scope, company_id, source_id)
  usage_scope, company_id, source_id, source_key, source_name, publisher, domain, search_domain, collection_url, collection_mode, family, kredo_category, origin, corpus_id, utility_score, priority
FROM (
  SELECT 'news'::text AS usage_scope, NULL::uuid AS company_id, sc.id AS source_id, sc.source_key, sc.name AS source_name, sc.publisher, sc.domain, sc.search_domain, sc.collection_url, CASE WHEN sc.collection_url IS NOT NULL THEN 'rss' ELSE 'site_search' END AS collection_mode, sc.family, sc.kredo_category, sc.origin, NULL::uuid AS corpus_id, 0 AS utility_score, CASE WHEN sc.origin = 'system' THEN 0 ELSE 1 END AS priority
  FROM public.source_catalog sc
  WHERE sc.content_temporality <> 'static' AND sc.is_active = true AND sc.validation_status NOT IN ('rejected','unreachable') AND 'news' = ANY(sc.usage_scopes) AND sc.origin IN ('manual','system')
  UNION ALL
  SELECT 'news'::text, NULL::uuid, sc.id, sc.source_key, sc.name, sc.publisher, sc.domain, sc.search_domain, sc.collection_url, CASE WHEN sc.collection_url IS NOT NULL THEN 'rss' ELSE 'site_search' END, sc.family, sc.kredo_category, sc.origin, corp.id, COALESCE(sci.utility_score,0), CASE WHEN sci.pack = 'minimal' THEN 2 ELSE 3 END + CASE WHEN sci.automation_fit = 'manual_only' THEN 1 ELSE 0 END
  FROM public.source_corpora corp JOIN public.source_corpus_items sci ON sci.corpus_id = corp.id JOIN public.source_catalog sc ON sc.id = sci.source_id
  WHERE corp.activation_state='active' AND corp.is_current=true AND corp.enabled_for_news=true AND sci.is_enabled=true AND sci.news_eligible=true AND sc.content_temporality <> 'static' AND sc.is_active=true AND sc.validation_status NOT IN ('rejected','unreachable')
  UNION ALL
  SELECT 'account_watch'::text, c.id, sc.id, sc.source_key, sc.name, sc.publisher, sc.domain, sc.search_domain, sc.collection_url, CASE WHEN sc.collection_url IS NOT NULL THEN 'rss' ELSE 'site_search' END, sc.family, sc.kredo_category, sc.origin, corp.id, COALESCE(sci.utility_score,0), CASE WHEN sci.pack = 'minimal' THEN 2 ELSE 3 END + CASE WHEN sci.automation_fit = 'manual_only' THEN 1 ELSE 0 END
  FROM public.companies c JOIN public.account_watch_settings aws ON aws.company_id = c.id JOIN public.sector_intelligence seg ON seg.id = c.segment_id
  JOIN public.source_corpora corp ON corp.id = COALESCE(
    (SELECT id FROM public.source_corpora WHERE sector_id=seg.id AND activation_state='active' AND is_current=true AND enabled_for_account_watch=true ORDER BY snapshot_date DESC, created_at DESC, id LIMIT 1),
    (SELECT id FROM public.source_corpora WHERE sector_id=seg.parent_id AND activation_state='active' AND is_current=true AND enabled_for_account_watch=true ORDER BY snapshot_date DESC, created_at DESC, id LIMIT 1)
  )
  JOIN public.source_corpus_items sci ON sci.corpus_id = corp.id JOIN public.source_catalog sc ON sc.id = sci.source_id
  WHERE aws.is_enabled=true AND aws.include_sector_corpus=true AND corp.activation_state='active' AND corp.is_current=true AND corp.enabled_for_account_watch=true AND sci.is_enabled=true AND sci.account_watch_eligible=true AND sc.content_temporality <> 'static' AND sc.is_active=true AND sc.validation_status NOT IN ('rejected','unreachable')
) combined
ORDER BY usage_scope, company_id, source_id, priority ASC, utility_score DESC;

CREATE OR REPLACE FUNCTION public.ingest_source_corpus(p_payload jsonb, p_segment_slug text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_workspace_id uuid; v_sector_id uuid; v_corpus_id uuid; v_source record; v_source_id uuid; v_inserted_sources integer := 0; v_inserted_items integer := 0;
BEGIN
  PERFORM private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();
  IF NOT private.is_workspace_admin() THEN RAISE EXCEPTION 'Permission denied: workspace admin required'; END IF;
  IF p_payload IS NULL OR NOT (p_payload ? 'slug') OR NOT (p_payload ? 'version') OR NOT (p_payload ? 'snapshot_date') OR NOT (p_payload ? 'sources') OR jsonb_typeof(p_payload->'sources') <> 'array' THEN RAISE EXCEPTION 'Invalid payload structure'; END IF;
  SELECT id INTO v_sector_id FROM public.sector_intelligence WHERE slug = p_segment_slug AND workspace_id = v_workspace_id AND level = 'segment';
  IF v_sector_id IS NULL THEN RAISE EXCEPTION 'Sector segment not found for slug: %', p_segment_slug; END IF;
  INSERT INTO public.source_corpora (workspace_id,scope_kind,sector_id,slug,version,snapshot_date,is_current,quality_verdict,activation_state,enabled_for_news,enabled_for_account_watch,source_document_path,source_document_hash,gaps,metadata)
  VALUES (v_workspace_id,'sector',v_sector_id,p_payload->>'slug',p_payload->>'version',(p_payload->>'snapshot_date')::date,true,COALESCE(p_payload->>'quality_verdict','usable_with_caveats')::public.corpus_quality_verdict,COALESCE(p_payload->>'activation_state','draft')::public.corpus_activation_state,true,true,p_payload->>'source_document_path',p_payload->>'source_document_hash',p_payload->'gaps',COALESCE(p_payload->'metadata','{}'::jsonb) || jsonb_build_object('reason',p_reason,'updated_at',now()))
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
END; $$;

DO $$
DECLARE v_workspace_id uuid; v_corpus_id uuid; v_sources jsonb; v_source jsonb; v_source_id uuid;
BEGIN
  v_sources := '[
    {"name":"LeMagIT","rssUrl":"https://www.lemagit.fr/rss/ContentSyndication.xml","homepage":"https://www.lemagit.fr","search_domain":"lemagit.fr","categorieDefaut":"marche-esn"},
    {"name":"ChannelNews","rssUrl":"https://www.channelnews.fr/feed/","homepage":"https://www.channelnews.fr","search_domain":"channelnews.fr","categorieDefaut":"marche-esn"},
    {"name":"L''Usine Digitale","rssUrl":"https://www.usine-digitale.fr/arc/outboundfeeds/rss/","homepage":"https://www.usine-digitale.fr","search_domain":"usine-digitale.fr","categorieDefaut":"vertical"},
    {"name":"The Batch (DeepLearning.AI)","rssUrl":null,"homepage":"https://www.deeplearning.ai/the-batch/","search_domain":"deeplearning.ai","categorieDefaut":"ia-appliquee"},
    {"name":"One Useful Thing","rssUrl":"https://www.oneusefulthing.org/feed","homepage":"https://www.oneusefulthing.org/","search_domain":"oneusefulthing.org","categorieDefaut":"ia-appliquee"},
    {"name":"VentureBeat AI","rssUrl":"https://venturebeat.com/category/ai/feed/","homepage":"https://venturebeat.com/ai/","search_domain":"venturebeat.com","categorieDefaut":"ia-appliquee"},
    {"name":"Anthropic News","rssUrl":null,"homepage":"https://www.anthropic.com/news","search_domain":"anthropic.com","categorieDefaut":"frontier"},
    {"name":"OpenAI News","rssUrl":"https://openai.com/news/rss.xml","homepage":"https://openai.com/news/","search_domain":"openai.com","categorieDefaut":"frontier"},
    {"name":"The Neuron","rssUrl":null,"homepage":"https://www.theneuron.ai/","search_domain":"theneuron.ai","categorieDefaut":"frontier"},
    {"name":"a16z","rssUrl":null,"homepage":"https://a16z.com","search_domain":"a16z.com","categorieDefaut":"strategie"},
    {"name":"Journal du Net — IA","rssUrl":"https://www.journaldunet.com/intelligence-artificielle/rss/","homepage":"https://www.journaldunet.com/intelligence-artificielle/","search_domain":"journaldunet.com","categorieDefaut":"strategie"},
    {"name":"ActuIA","rssUrl":"https://www.actuia.com/feed/","homepage":"https://www.actuia.com","search_domain":"actuia.com","categorieDefaut":"reglementaire"},
    {"name":"Finextra","rssUrl":"https://www.finextra.com/rss/headlines.aspx","homepage":"https://www.finextra.com","search_domain":"finextra.com","categorieDefaut":"vertical"},
    {"name":"Premium Beauty News","rssUrl":"https://www.premiumbeautynews.com/spip.php?page=backend","homepage":"https://www.premiumbeautynews.com","search_domain":"premiumbeautynews.com","categorieDefaut":"vertical"}
  ]'::jsonb;
  FOR v_workspace_id IN SELECT id FROM public.workspaces ORDER BY id LOOP
    INSERT INTO public.source_corpora (workspace_id,scope_kind,slug,version,snapshot_date,activation_state,quality_verdict,enabled_for_news,enabled_for_account_watch)
    VALUES (v_workspace_id,'system','socle-sources-editoriales','1.0',CURRENT_DATE,'active','production_ready',true,false)
    ON CONFLICT (workspace_id, slug, version) DO UPDATE SET activation_state=EXCLUDED.activation_state, quality_verdict=EXCLUDED.quality_verdict, updated_at=now()
    RETURNING id INTO v_corpus_id;
    FOR v_source IN SELECT * FROM jsonb_array_elements(v_sources) LOOP
      INSERT INTO public.source_catalog (workspace_id,source_key,name,search_domain,collection_url,homepage_url,kredo_category,origin,content_temporality,usage_scopes,is_active,is_locked,validation_status)
      VALUES (v_workspace_id,v_source->>'name',v_source->>'name',v_source->>'search_domain',v_source->>'rssUrl',v_source->>'homepage',v_source->>'categorieDefaut','system','continuous',ARRAY['news'],true,true,'valid')
      ON CONFLICT (workspace_id, source_key) DO UPDATE SET search_domain=EXCLUDED.search_domain, collection_url=EXCLUDED.collection_url, homepage_url=EXCLUDED.homepage_url, kredo_category=EXCLUDED.kredo_category, updated_at=now()
      RETURNING id INTO v_source_id;
      INSERT INTO public.source_corpus_items (workspace_id,corpus_id,source_id,pack,primary_role,news_eligible,is_enabled)
      VALUES (v_workspace_id,v_corpus_id,v_source_id,'minimal','watch',true,true)
      ON CONFLICT (corpus_id, source_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_source_corpora_sector_id ON public.source_corpora(sector_id);
CREATE INDEX IF NOT EXISTS idx_source_corpus_items_source_id ON public.source_corpus_items(source_id);
CREATE INDEX IF NOT EXISTS idx_source_corpus_items_workspace_id ON public.source_corpus_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_veille_articles_source_catalog_id ON public.veille_articles(source_catalog_id);
REVOKE EXECUTE ON FUNCTION public.ingest_source_corpus(jsonb, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ingest_source_corpus(jsonb, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ingest_source_corpus(jsonb, text, text) TO authenticated;
