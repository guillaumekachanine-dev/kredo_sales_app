-- ─── Account Intelligence — Support ChatGPT Work (Lot 2) ─────────────────────
--
-- 1. `producer` accepte désormais 'chatgpt_deep_research' (par défaut) et 'chatgpt_work'.
-- 2. Bucket `account_research_studies` autorise 'application/pdf' et 'application/json' (50 Mo, privé).
-- 3. Contrainte `account_research_studies_published_ready` adaptée :
--    - conditions communes : status = 'ready', knowledge_json, sources_registry_json, coverage non nuls,
--      et coverage.text.identical = true ;
--    - si producer = 'chatgpt_deep_research' : coverage.registry.importable = true (garantie E3 stricte conservée) ;
--    - si producer = 'chatgpt_work' : publication autorisée même si registry.importable = false (les critères E3
--      manquants dans Work n'étant pas inventés, la distribution de sources est différée au Lot 3).

-- ── 1. Évolution de la contrainte producer ───────────────────────────────────

alter table public.account_research_studies
  drop constraint if exists account_research_studies_producer_check;

alter table public.account_research_studies
  add constraint account_research_studies_producer_check
  check (producer in ('chatgpt_deep_research', 'chatgpt_work'));

-- ── 2. Storage : acceptation de PDF et JSON ─────────────────────────────────

update storage.buckets
   set allowed_mime_types = array['application/pdf', 'application/json']
 where id = 'account_research_studies';

-- ── 3. Évolution de la contrainte published_ready ───────────────────────────

alter table public.account_research_studies
  drop constraint if exists account_research_studies_published_ready;

alter table public.account_research_studies
  add constraint account_research_studies_published_ready check (
    published_at is null
    or (
      status = 'ready'
      and knowledge_json is not null
      and sources_registry_json is not null
      and coverage is not null
      and coverage #>> '{text,identical}' = 'true'
      and (
        (producer = 'chatgpt_deep_research' and coverage #>> '{registry,importable}' = 'true')
        or (producer = 'chatgpt_work')
      )
    )
  );

comment on constraint account_research_studies_published_ready on public.account_research_studies is
  'Une étude publiée doit être ready, intègre textuellement, et si producer=chatgpt_deep_research son registre E3 doit être importable.';
