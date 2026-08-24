-- Migration : Neutralisation définitive des signaux FOLIO dans les traitements IA KREDO (Lot 2).
--
-- 1. v_active_account_signals : verrou explicite excluant les signatures FOLIO (signal_type folio_% ou dedupe_key folio:%).
-- 2. get_account_knowledge_context : expurge la clé 'signaux' de folioAnalysisData ((metadata->'analysis_data') - 'signaux').
-- 3. get_account_issues_context : expurge la clé 'signaux' de folioAnalysisData ((metadata->'analysis_data') - 'signaux').
-- 4. account_issues : neutralisation ciblée (status = 'dismissed') des 5 enjeux legacy fondés exclusivement sur les signaux FOLIO sans preuve KREDO actuelle.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Vue canonique des signaux actifs
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_active_account_signals
with (security_invoker = true)
as
select
  id,
  workspace_id,
  company_id,
  signal_category,
  signal_type,
  title,
  summary,
  event_at,
  detected_at,
  last_evidence_at,
  expires_at,
  dedupe_key,
  confidence_score,
  relevance_score,
  urgency_score,
  potential_value_score,
  global_score,
  score_details,
  score_justification,
  taxonomy_version,
  scoring_rules_version,
  recommended_action,
  recommended_practice_id,
  suggested_contact_id,
  status,
  run_id,
  primary_source_id,
  created_at,
  updated_at
from public.account_signals
where status not in ('archived', 'dismissed')
  and detected_at >= current_timestamp - interval '2 months'
  and coalesce(signal_type, '') not like 'folio_%'
  and coalesce(dedupe_key, '') not like 'folio:%';

comment on view public.v_active_account_signals is
  'Signals still actionable: archived/dismissed, signals strictly older than two calendar months, and legacy FOLIO signals are excluded.';

revoke all on public.v_active_account_signals from public, anon;
grant select on public.v_active_account_signals to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_account_knowledge_context (intel-030)
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
      select case
        when c.metadata->'analysis_data' is not null
        then (c.metadata->'analysis_data') - 'signaux'
        else null
      end
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
  'Lot 2 Neutralisation FOLIO — hydratation compte pour intel-030-account-knowledge. folioAnalysisData est expurgé de la section signaux ((metadata->analysis_data) - signaux).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. get_account_issues_context (intel-031)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_account_issues_context(
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
        'id', c.id,
        'name', c.name,
        'lifecycle_status', c.lifecycle_status,
        'sector', c.sector,
        'sector_id', c.sector_id,
        'segment', c.segment,
        'employee_count', c.employee_count,
        'description', c.description
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'contacts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ct.id,
        'full_name', p.full_name,
        'job_title', ct.job_title,
        'relationship_role', ct.relationship_role,
        'decision_power', ct.decision_power,
        'is_priority', ct.is_priority
      )), '[]'::jsonb)
      from (
        select *
        from public.contacts
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
        order by occurred_at desc
        limit 15
      ) i
    ),
    'opportunities', (
      select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
      from (
        select id, title, stage, opportunity_type, estimated_gain, weighted_gain,
               target_daily_rate, next_action_label, next_action_at
        from public.opportunities
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by created_at desc
        limit 20
      ) o
    ),
    'missions', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from (
        select id, title, role_title, practice, status, start_date, end_date, gross_margin_pct
        from public.missions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by start_date desc nulls last
        limit 20
      ) m
    ),
    'signals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'category', s.signal_category,
        'type', s.signal_type,
        'title', s.title,
        'summary', s.summary,
        'urgency_score', s.urgency_score,
        'detected_at', s.detected_at
      ) order by s.detected_at desc), '[]'::jsonb)
      from (
        select *
        from public.account_signals
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and status not in ('dismissed', 'false_positive', 'expired', 'archived')
          and (expires_at is null or expires_at >= now())
        order by detected_at desc
        limit 30
      ) s
    ),
    'folioAnalysisData', (
      select case
        when c.metadata->'analysis_data' is not null
        then (c.metadata->'analysis_data') - 'signaux'
        else null
      end
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'processDiagnostic', (
      select r.content_json
      from public.ai_intelligence_results r
      where r.company_id = p_company_id
        and r.workspace_id = p_workspace_id
        and r.result_type = 'process_diagnostic'
        and r.status = 'succeeded'
      order by r.created_at desc
      limit 1
    ),
    'sectorContext', (
      select jsonb_build_object(
        'name', si.name,
        'painPoints', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'title', spp.title, 'description', spp.description,
            'frequency_count', spp.frequency_count, 'kredo_practice', spp.kredo_practice
          ) order by spp.frequency_count desc), '[]'::jsonb)
          from public.sector_pain_points spp
          where spp.sector_id = si.id
          limit 8
        ),
        'regulatoryDeadlines', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'name', sri.name, 'deadline_date', sri.deadline_date,
            'urgency', sri.urgency, 'is_commercial_window', sri.is_commercial_window
          ) order by sri.deadline_date asc nulls last), '[]'::jsonb)
          from public.sector_regulatory_items sri
          where sri.sector_id = si.id
          limit 5
        )
      )
      from public.companies c
      join public.sector_intelligence si on si.id = c.sector_id
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'offersCatalog', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'practice', op.name
      )), '[]'::jsonb)
      from public.offers o
      join public.offer_practices op on op.id = o.practice_id
      where o.workspace_id = p_workspace_id and o.is_active
    ),
    'existingOpenIssues', (
      select coalesce(jsonb_agg(jsonb_build_object('title', ai.title, 'category', ai.category)), '[]'::jsonb)
      from public.account_issues ai
      where ai.company_id = p_company_id and ai.workspace_id = p_workspace_id and ai.status = 'open'
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_account_issues_context(uuid, uuid) from public;
grant execute on function public.get_account_issues_context(uuid, uuid) to service_role;

comment on function public.get_account_issues_context(uuid, uuid) is
  'Lot 2 Neutralisation FOLIO — hydratation déterministe pour intel-031-issues-map. folioAnalysisData est expurgé de la section signaux ((metadata->analysis_data) - signaux).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Neutralisation des résidus account_issues issus exclusivement de signaux FOLIO
-- ─────────────────────────────────────────────────────────────────────────────

update public.account_issues
set status = 'dismissed'
where id in (
  '56244722-b2b2-4f26-ab94-86d909bbcb59', -- Voyage Privé (signaux.indices_maturite_digitale)
  '89891fbc-9877-4ca1-a142-dfb1fccb3719', -- Naphtachimie (signaux.indices_maturite_digitale via signal folio_digital_maturity)
  '400462fa-24d4-4322-a697-c646ba06a76d', -- Audemard (indices_maturite_digitale)
  'dad7b813-f305-4e46-ba4f-28ad4e9b9412', -- Audemard (recrutements_recents via signal folio_hiring)
  '23ea5e63-659e-4027-92fe-c6fb146e50ac'  -- Richardson (signaux.indices_maturite_digitale)
)
and status = 'open'
and provenance = 'folio_legacy';
