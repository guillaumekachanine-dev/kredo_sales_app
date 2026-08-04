-- Lot 0 « Intelligence Entreprise / Intelligence Sectorielle » — correctif.
-- Migration distincte de 062 (déjà déployée en prod) : celle-ci REMPLACE les
-- deux fonctions, elle ne les recrée pas depuis zéro. Corps complets requis
-- par `create or replace function` — pas de diff possible en SQL.
--
-- 1. get_account_knowledge_context : + company.legal_name / revenue /
--    size_band. Toutes les clés existantes (y compris les 9 lues par le
--    workflow n8n intel-030-account-knowledge déployé) sont conservées à
--    l'identique — vérifié en direct après application.
--
-- 2. get_sector_intelligence_context :
--    - approvedFacts filtre désormais sur `verified_at is not null` en plus
--      de `is_current = true` : un fait courant mais jamais vérifié n'est pas
--      "approuvé" (D-4), seulement "pas périmé".
--    - factSources expose canonical_url.
--    - factSourceLinks (nouvelle clé) : association fact_id/source_id/link_role,
--      même forme que sur get_account_knowledge_context. La sous-requête des
--      faits du secteur (scoped_facts) est factorisée en CTE pour ne pas la
--      tripler entre approvedFacts/factSources/factSourceLinks.
--
-- Vérifié en direct (fixtures temporaires insérées puis supprimées dans la
-- même session, aucune trace résiduelle) :
--   - association exacte 1 fait -> 2 sources secondaires (link_role distincts
--     "supporting"/"context"), retrouvée telle quelle dans factSourceLinks ;
--   - un fait avec verified_at IS NULL est absent de approvedFacts ;
--   - les 13 clés de get_account_knowledge_context et les 13 clés de
--     get_sector_intelligence_context (12 précédentes + factSourceLinks) sont
--     toutes présentes après application.
--
-- PRÉREQUIS LOT 2 (détail complet : sector-intelligence-contracts.ts) : cette
-- RPC renvoie encore `news`/`events`/`regulatoryItems` avec leur URL brute
-- (sector_news.url, sector_events.source_url, sector_regulatory_items.source_url),
-- AUCUNE reliée à `intelligence_sources`. Un `Claim` exige un `source_refs`
-- pointant vers `intelligence_sources.id`, pas une URL ni l'UUID de la ligne
-- sector_*. Le workflow Lot 2 devra upserter ces URL dans `intelligence_sources`
-- avant de pouvoir les citer comme source d'un Claim.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Connaissance compte — + legal_name / revenue / size_band
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_account_knowledge_context(
  p_workspace_id uuid,
  p_company_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'company', (
      select jsonb_build_object(
        'id', c.id, 'name', c.name, 'legal_name', c.legal_name,
        'lifecycle_status', c.lifecycle_status,
        'sector', c.sector, 'sector_id', c.sector_id, 'segment', c.segment,
        'hq_location', c.hq_location, 'employee_count', c.employee_count,
        'revenue', c.revenue, 'size_band', c.size_band,
        'priority', c.priority, 'description', c.description, 'website', c.website
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'contacts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ct.id, 'person_id', ct.person_id, 'full_name', p.full_name,
        'job_title', ct.job_title, 'department', ct.department,
        'relationship_role', ct.relationship_role, 'decision_power', ct.decision_power,
        'relationship_level', ct.relationship_level, 'is_priority', ct.is_priority
      )), '[]'::jsonb)
      from (
        select * from public.contacts
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by is_priority desc, relationship_level desc nulls last
        limit 50
      ) ct
      join public.persons p on p.id = ct.person_id
    ),
    'recentInteractions', (
      select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
      from (
        select id, contact_id, type, occurred_at, summary, sentiment, next_action
        from public.interactions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by occurred_at desc limit 15
      ) i
    ),
    'opportunities', (
      select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
      from (
        select id, title, stage, opportunity_type, estimated_gain, weighted_gain,
               target_daily_rate, next_action_label, next_action_at, closed_at,
               win_reason, loss_reason
        from public.opportunities
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by created_at desc limit 20
      ) o
    ),
    'missions', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from (
        select id, title, role_title, practice, status, start_date, end_date, gross_margin_pct
        from public.missions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by start_date desc nulls last limit 20
      ) m
    ),
    'signals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'category', s.signal_category, 'type', s.signal_type,
        'title', s.title, 'summary', s.summary,
        'confidence_score', s.confidence_score, 'relevance_score', s.relevance_score,
        'urgency_score', s.urgency_score, 'detected_at', s.detected_at,
        'expires_at', s.expires_at, 'primary_source_id', s.primary_source_id
      ) order by s.detected_at desc), '[]'::jsonb)
      from (
        select * from public.account_signals
        where company_id = p_company_id and workspace_id = p_workspace_id
          and status not in ('dismissed', 'false_positive', 'expired', 'archived')
          and (expires_at is null or expires_at >= now())
        order by detected_at desc limit 30
      ) s
    ),
    'accountFacts', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.fact_type, f.fact_subtype nulls first), '[]'::jsonb)
      from (
        select af.id, af.fact_type, af.fact_subtype, af.cardinality,
               af.value_text, af.value_json, af.normalized_value, af.origin,
               af.confidence_score, af.primary_source_id, af.effective_at,
               af.verified_at, af.expires_at
        from public.account_facts af
        where af.workspace_id = p_workspace_id
          and af.target_type = 'company'
          and af.target_id = p_company_id
          and af.is_current = true
      ) f
    ),
    'factSources', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.collected_at desc), '[]'::jsonb)
      from (
        select src.id, src.source_type, src.source_name, src.source_url,
               src.canonical_url, src.published_at, src.collected_at,
               src.reliability_score, src.collection_method, src.evidence_excerpt
        from public.intelligence_sources src
        where src.workspace_id = p_workspace_id
          and (
            src.id in (
              select af.primary_source_id from public.account_facts af
              where af.workspace_id = p_workspace_id and af.target_type = 'company'
                and af.target_id = p_company_id and af.is_current = true
                and af.primary_source_id is not null
            )
            or src.id in (
              select l.source_id from public.intelligence_source_links l
              where l.workspace_id = p_workspace_id and l.object_type = 'fact'
                and l.object_id in (
                  select af.id from public.account_facts af
                  where af.workspace_id = p_workspace_id and af.target_type = 'company'
                    and af.target_id = p_company_id and af.is_current = true
                )
            )
          )
      ) s
    ),
    'factSourceLinks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fact_id', l.object_id, 'source_id', l.source_id, 'link_role', l.link_role
      )), '[]'::jsonb)
      from public.intelligence_source_links l
      where l.workspace_id = p_workspace_id and l.object_type = 'fact'
        and l.object_id in (
          select af.id from public.account_facts af
          where af.workspace_id = p_workspace_id and af.target_type = 'company'
            and af.target_id = p_company_id and af.is_current = true
        )
    ),
    'folioAnalysisData', (
      select c.metadata->'analysis_data'
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'folioSectorAnalysis', (
      select c.metadata->'sector_analysis'
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'processDiagnostic', (
      select r.content_json
      from public.ai_intelligence_results r
      where r.company_id = p_company_id and r.workspace_id = p_workspace_id
        and r.result_type = 'process_diagnostic' and r.status = 'succeeded'
      order by r.created_at desc limit 1
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_account_knowledge_context(uuid, uuid) from public;
revoke execute on function public.get_account_knowledge_context(uuid, uuid) from anon, authenticated;
grant execute on function public.get_account_knowledge_context(uuid, uuid) to service_role;

comment on function public.get_account_knowledge_context(uuid, uuid) is
  'Lot 0 Intelligence (corrigé) — hydratation compte pour intel-030-account-knowledge et les futurs artefacts account_knowledge V2. + legal_name/revenue/size_band sur company. Appelée en service_role : l''isolation repose sur p_workspace_id, filtré dans chaque sous-requête.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Intelligence sectorielle — factSourceLinks, canonical_url, approvedFacts vérifiés
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_sector_intelligence_context(
  p_workspace_id uuid,
  p_sector_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with scoped_companies as (
    select c.id, c.name, c.legal_name, c.lifecycle_status, c.segment,
           c.hq_location, c.employee_count, c.priority, c.website
    from public.companies c
    where c.workspace_id = p_workspace_id
      and c.sector_id = p_sector_id
  ),
  -- Faits du secteur portés par account_facts (target_type='company',
  -- target_id d'un compte du secteur). Factorisé en CTE pour ne pas tripler
  -- la sous-requête entre approvedFacts/factSources/factSourceLinks.
  scoped_facts as (
    select af.id, af.target_id as company_id, af.fact_type, af.fact_subtype,
           af.cardinality, af.value_text, af.value_json, af.normalized_value,
           af.origin, af.confidence_score, af.primary_source_id,
           af.effective_at, af.verified_at
    from public.account_facts af
    where af.workspace_id = p_workspace_id
      and af.target_type = 'company'
      and af.is_current = true
      and af.target_id in (select id from scoped_companies)
  )
  select jsonb_build_object(
    'sector', (
      select to_jsonb(s)
      from (
        select si.id, si.name, si.slug, si.description, si.status,
               si.attractiveness_score, si.market_size_eur_bn, si.market_growth_pct,
               si.digital_maturity, si.practices_fit, si.key_players_paca,
               si.key_players_national, si.avg_tjm_min, si.avg_tjm_max,
               si.playbook, si.caveats, si.updated_at
        from public.sector_intelligence si
        where si.id = p_sector_id and si.workspace_id = p_workspace_id
      ) s
    ),
    'companies', (
      select coalesce(jsonb_agg(to_jsonb(sc) order by sc.name), '[]'::jsonb)
      from scoped_companies sc
    ),
    -- approvedFacts = faits COURANTS ET VÉRIFIÉS. verified_at is not null est
    -- la marque explicite d'une vérification humaine (D-4) ; un fait courant
    -- mais jamais vérifié n'est pas "approuvé", il est juste "pas périmé".
    'approvedFacts', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.company_id, f.fact_type), '[]'::jsonb)
      from scoped_facts f
      where f.verified_at is not null
    ),
    'factSources', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.collected_at desc), '[]'::jsonb)
      from (
        select src.id, src.source_type, src.source_name, src.source_url,
               src.canonical_url, src.published_at, src.collected_at,
               src.reliability_score, src.collection_method, src.evidence_excerpt
        from public.intelligence_sources src
        where src.workspace_id = p_workspace_id
          and (
            src.id in (
              select primary_source_id from scoped_facts where primary_source_id is not null
            )
            or src.id in (
              select l.source_id
              from public.intelligence_source_links l
              where l.workspace_id = p_workspace_id
                and l.object_type = 'fact'
                and l.object_id in (select id from scoped_facts)
            )
          )
      ) s
    ),
    -- Association exacte fait->source(s) secondaire(s), même forme que sur
    -- get_account_knowledge_context (fact_id/source_id/link_role) : une source
    -- peut être liée à plusieurs faits, un fait à plusieurs sources.
    'factSourceLinks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fact_id', l.object_id, 'source_id', l.source_id, 'link_role', l.link_role
      )), '[]'::jsonb)
      from public.intelligence_source_links l
      where l.workspace_id = p_workspace_id
        and l.object_type = 'fact'
        and l.object_id in (select id from scoped_facts)
    ),
    'accountSignals', (
      select coalesce(jsonb_agg(to_jsonb(sg) order by sg.detected_at desc), '[]'::jsonb)
      from (
        select s.id, s.company_id, s.signal_category, s.signal_type, s.title,
               s.summary, s.confidence_score, s.relevance_score, s.urgency_score,
               s.global_score, s.detected_at, s.expires_at, s.primary_source_id
        from public.account_signals s
        where s.workspace_id = p_workspace_id
          and s.company_id in (select id from scoped_companies)
          and s.status not in ('dismissed', 'false_positive', 'expired', 'archived')
          and (s.expires_at is null or s.expires_at >= now())
        order by s.detected_at desc
        limit 200
      ) sg
    ),
    'painPoints', (
      select coalesce(jsonb_agg(to_jsonb(pp) order by pp.frequency_count desc), '[]'::jsonb)
      from (
        select p.id, p.title, p.description, p.frequency_count,
               p.source_company_ids, p.kredo_practice, p.verbatim
        from public.sector_pain_points p
        where p.sector_id = p_sector_id and p.workspace_id = p_workspace_id
      ) pp
    ),
    'regulatoryItems', (
      select coalesce(jsonb_agg(to_jsonb(ri) order by ri.deadline_date nulls last), '[]'::jsonb)
      from (
        select r.id, r.name, r.authority, r.description, r.deadline_date,
               r.urgency, r.kredo_practice, r.commercial_angle,
               r.is_commercial_window, r.source_url
        from public.sector_regulatory_items r
        where r.sector_id = p_sector_id and r.workspace_id = p_workspace_id
      ) ri
    ),
    'events', (
      select coalesce(jsonb_agg(to_jsonb(ev) order by ev.event_date desc nulls last), '[]'::jsonb)
      from (
        select e.id, e.title, e.event_type, e.description, e.event_date,
               e.source_url, e.commercial_opportunity, e.status
        from public.sector_events e
        where e.sector_id = p_sector_id and e.workspace_id = p_workspace_id
      ) ev
    ),
    'news', (
      select coalesce(jsonb_agg(to_jsonb(nw) order by nw.published_at desc nulls last), '[]'::jsonb)
      from (
        select n.id, n.title, n.source, n.url, n.summary, n.published_at,
               n.relevance_score, n.tags, n.is_trigger_event
        from public.sector_news n
        where n.sector_id = p_sector_id and n.workspace_id = p_workspace_id
        order by n.published_at desc nulls last
        limit 100
      ) nw
    ),
    'commercialWindowRefs', (
      select coalesce(jsonb_agg(windows.w), '[]'::jsonb)
      from (
        select jsonb_build_object('source_table', 'sector_regulatory_items', 'id', r.id) as w
        from public.sector_regulatory_items r
        where r.sector_id = p_sector_id and r.workspace_id = p_workspace_id
          and r.is_commercial_window = true
        union all
        select jsonb_build_object('source_table', 'sector_events', 'id', e.id)
        from public.sector_events e
        where e.sector_id = p_sector_id and e.workspace_id = p_workspace_id
          and e.commercial_opportunity is not null
      ) windows
    ),
    'recentAccountKnowledge', (
      select coalesce(jsonb_agg(to_jsonb(ak)), '[]'::jsonb)
      from (
        select distinct on (r.company_id)
          r.company_id, r.id as result_id, r.created_at, r.content_json
        from public.ai_intelligence_results r
        where r.workspace_id = p_workspace_id
          and r.result_type = 'account_knowledge'
          and r.status = 'succeeded'
          and r.company_id in (select id from scoped_companies)
        order by r.company_id, r.created_at desc
      ) ak
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_sector_intelligence_context(uuid, uuid) from public;
revoke execute on function public.get_sector_intelligence_context(uuid, uuid) from anon, authenticated;
grant execute on function public.get_sector_intelligence_context(uuid, uuid) to service_role;

comment on function public.get_sector_intelligence_context(uuid, uuid) is
  'Lot 0 Intelligence (corrigé) — hydratation sectorielle. approvedFacts filtre désormais verified_at IS NOT NULL en plus de is_current ; + factSourceLinks (fact_id/source_id/link_role) ; + canonical_url dans factSources. Appelée en service_role : l''isolation repose sur p_workspace_id, filtré dans chaque sous-requête.';
