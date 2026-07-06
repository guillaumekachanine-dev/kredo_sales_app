-- ============================================================
-- ADR-0011 Lot 0 — Dépréciation du score FOLIO hérité.
--
-- companies.ai_score (numeric 1-5, jamais historisé, jamais
-- expliqué) est renommé companies.legacy_folio_score pour
-- qu'aucun code futur ne le confonde avec le futur Score de
-- Priorité Commerciale (account_score_runs, Lot 2+).
--
-- Portée volontairement limitée : les 4 objets SQL qui lisaient
-- déjà c.ai_score sont repointés sur la colonne renommée SANS
-- changer leurs clés JSON de sortie ('ai_score' / 'aiScore'),
-- car ces clés sont des contrats consommés par des workflows
-- n8n déployés sur le VPS (get_pitch_context,
-- get_communication_context, get_account_summary_facts) que
-- cette session ne peut pas réimporter/retester de bout en bout.
-- Renommer la colonne source suffit à l'objectif du Lot 0
-- (empêcher toute nouvelle lecture confuse côté app) sans
-- casser un contrat externe non vérifiable aujourd'hui.
--
-- v_ai_intelligence_summary est DROP + recréée (pas
-- CREATE OR REPLACE) car Postgres refuse de renommer une colonne
-- de vue existante via REPLACE (42P16). Vérifié avant migration :
-- aucun objet ne dépend de cette vue (pg_depend), et aucun code
-- front ne sélectionne sa colonne ai_score.
-- ============================================================

ALTER TABLE public.companies RENAME COLUMN ai_score TO legacy_folio_score;

COMMENT ON COLUMN public.companies.legacy_folio_score IS
  'DEPRECATED — score potentiel FOLIO /5, jamais historisé ni expliqué (voir ADR-0011). Ne plus utiliser pour de nouvelles fonctionnalités : lire account_score_current une fois le Score de Priorité Commerciale livré (Lot 2+).';

DROP VIEW public.v_ai_intelligence_summary;

create view public.v_ai_intelligence_summary
  with (security_invoker = true)
as
select
  c.id                                                        as company_id,
  c.name                                                      as company_name,
  c.sector,
  c.priority,
  c.legacy_folio_score,

  bool_or(r.phase = 1 and r.status = 'succeeded')            as has_client_analysis,
  bool_or(r.phase = 2 and r.status = 'succeeded')            as has_sector_analysis,
  bool_or(r.phase = 3 and r.status = 'succeeded')            as has_process_diagnostic,
  bool_or(r.phase = 4 and r.status = 'succeeded')            as has_roadmap,

  (c.metadata ? 'analysis_data')                             as has_legacy_analysis,
  (c.metadata ? 'sector_analysis')                           as has_legacy_sector,
  (c.metadata ? 'pitches')                                   as has_legacy_pitches,

  max(run.created_at)                                        as latest_run_at,
  (array_agg(run.status order by run.created_at desc))[1]    as latest_run_status,

  count(distinct run.id)                                     as count_runs,
  count(distinct r.id)                                       as count_results

from public.companies c
left join public.ai_intelligence_runs   run on run.company_id = c.id
left join public.ai_intelligence_results r  on r.company_id  = c.id
                                            and r.status = 'succeeded'
group by c.id, c.name, c.sector, c.priority, c.legacy_folio_score, c.metadata;

-- ------------------------------------------------------------
-- get_account_summary_facts (20260703150000) — clé JSON 'aiScore'
-- conservée à l'identique, contrat consommé par le workflow n8n
-- report-account-summary + AccountSummaryReportView.tsx.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_account_summary_facts(
  p_workspace_id uuid,
  p_company_id uuid,
  p_as_of_date date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'identity', (
      SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'lifecycleStatus', c.lifecycle_status,
        'sector', c.sector,
        'sectorId', c.sector_id,
        'segment', c.segment,
        'aiScore', c.legacy_folio_score,
        'priority', c.priority
      )
      FROM public.companies c
      WHERE c.id = p_company_id AND c.workspace_id = p_workspace_id
    ),
    'potential', (
      SELECT jsonb_build_object(
        'openPipeWeighted', coalesce(sum(o.weighted_gain), 0),
        'openOpportunitiesCount', count(*) FILTER (WHERE o.stage NOT IN ('gagne', 'perdu', 'abandonne')),
        'wonOpportunitiesCount', count(*) FILTER (WHERE o.stage = 'gagne'),
        'totalOpportunitiesCount', count(*)
      )
      FROM public.opportunities o
      WHERE o.company_id = p_company_id AND o.workspace_id = p_workspace_id
    ),
    'relation', (
      SELECT jsonb_build_object(
        'activeMissionsCount', (
          SELECT count(*) FROM public.missions m
          WHERE m.company_id = p_company_id AND m.workspace_id = p_workspace_id AND m.status = 'active'
        ),
        'avgTheoreticalMarginPct', (
          SELECT round(avg(m.gross_margin_pct), 1) FROM public.missions m
          WHERE m.company_id = p_company_id AND m.workspace_id = p_workspace_id AND m.status = 'active'
        ),
        'totalRevenueProduced', (
          SELECT coalesce(sum(mar.billable_days * mar.tjm_snapshot), 0)
          FROM public.mission_activity_reports mar
          JOIN public.missions m ON m.id = mar.mission_id
          WHERE m.company_id = p_company_id AND m.workspace_id = p_workspace_id
        ),
        'ytdRevenueProduced', (
          SELECT coalesce(sum(mar.billable_days * mar.tjm_snapshot), 0)
          FROM public.mission_activity_reports mar
          JOIN public.missions m ON m.id = mar.mission_id
          WHERE m.company_id = p_company_id AND m.workspace_id = p_workspace_id
            AND mar.period_start >= date_trunc('year', now())
        ),
        'contactsCount', (
          SELECT count(*) FROM public.contacts ct
          WHERE ct.company_id = p_company_id AND ct.workspace_id = p_workspace_id
        )
      )
    ),
    'activity', (
      SELECT jsonb_build_object(
        'needsTreatedCount', (
          SELECT count(*) FROM public.opportunities o
          WHERE o.company_id = p_company_id AND o.workspace_id = p_workspace_id
        ),
        'meetingsRealizedLast12m', (
            SELECT count(*) FROM public.interactions i
          WHERE i.company_id = p_company_id AND i.workspace_id = p_workspace_id
            AND i.occurred_at >= now() - interval '12 months'
        ),
        'nextActions', (
          SELECT coalesce(jsonb_agg(jsonb_build_object(
            'opportunityId', o.id,
            'label', o.next_action_label,
            'at', o.next_action_at,
            'isOverdue', (o.next_action_at::date < p_as_of_date)
          ) ORDER BY o.next_action_at ASC), '[]'::jsonb)
          FROM (
            SELECT id, next_action_label, next_action_at FROM public.opportunities
            WHERE company_id = p_company_id AND workspace_id = p_workspace_id
              AND stage NOT IN ('gagne', 'perdu', 'abandonne')
              AND next_action_at IS NOT NULL
            ORDER BY next_action_at ASC
            LIMIT 3
          ) o
        )
      )
    ),
    'signals', jsonb_build_object(
      'news', (
        SELECT jsonb_build_object(
          'title', sn.title,
          'summary', sn.summary,
          'publishedAt', sn.published_at,
          'isTriggerEvent', sn.is_trigger_event
        )
        FROM public.sector_news sn
        JOIN public.companies c ON c.sector_id = sn.sector_id
        WHERE c.id = p_company_id AND sn.workspace_id = p_workspace_id
        ORDER BY sn.relevance_score DESC NULLS LAST, sn.published_at DESC
        LIMIT 1
      ),
      'regulatoryDeadline', (
        SELECT jsonb_build_object(
          'name', sri.name,
          'description', sri.description,
          'deadlineDate', sri.deadline_date,
          'urgency', sri.urgency,
          'isCommercialWindow', sri.is_commercial_window
        )
        FROM public.sector_regulatory_items sri
        JOIN public.companies c ON c.sector_id = sri.sector_id
        WHERE c.id = p_company_id AND sri.workspace_id = p_workspace_id
          AND (sri.deadline_date IS NULL OR sri.deadline_date >= current_date)
        ORDER BY sri.deadline_date ASC NULLS LAST
        LIMIT 1
      )
    ),
    'scores', jsonb_build_object(
      'conviction', public.compute_conviction_score_v1(p_company_id),
      'investment', public.compute_investment_score_v1(p_company_id)
    ),
    'dataCutoffAt', now(),
    'caveats', (
      SELECT coalesce(jsonb_agg(caveat), '[]'::jsonb)
      FROM (
        SELECT 'Aucun secteur structuré rattaché au compte — signaux et échéances réglementaires indisponibles.' AS caveat
        WHERE NOT EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = p_company_id AND c.workspace_id = p_workspace_id AND c.sector_id IS NOT NULL
        )
      ) caveats
    )
  )
$$;

REVOKE ALL ON FUNCTION public.get_account_summary_facts(uuid, uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_account_summary_facts(uuid, uuid, date) TO service_role;

COMMENT ON FUNCTION public.get_account_summary_facts(uuid, uuid, date) IS
  'Hydratation déterministe pour le workflow n8n report-account-summary (REPORT-001 Lot 1). Un seul appel POST /rest/v1/rpc/get_account_summary_facts (service_role, filtrage workspace explicite car hors RLS) remplace 8+ requêtes REST séparées. Le LLM ne reçoit que ce JSON et ne peut citer que les valeurs qui y figurent. Clé aiScore lit désormais companies.legacy_folio_score (ADR-0011 Lot 0).';

-- ------------------------------------------------------------
-- get_communication_context (20260702090000) — clé JSON 'ai_score'
-- conservée à l'identique, contrat consommé par le workflow n8n
-- intel-020-communication.
-- ------------------------------------------------------------
create or replace function public.get_communication_context(
  p_workspace_id uuid,
  p_company_id uuid default null,
  p_contact_id uuid default null,
  p_opportunity_id uuid default null,
  p_mission_id uuid default null
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
        'legal_name', c.legal_name,
        'lifecycle_status', c.lifecycle_status,
        'sector', c.sector,
        'segment', c.segment,
        'hq_location', c.hq_location,
        'employee_count', c.employee_count,
        'priority', c.priority,
        'ai_score', c.legacy_folio_score,
        'description', c.description,
        'website', c.website,
        'next_action_label', c.next_action_label
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'contact', (
      select jsonb_build_object(
        'id', ct.id,
        'job_title', ct.job_title,
        'relationship_role', ct.relationship_role,
        'decision_power', ct.decision_power,
        'full_name', p.full_name,
        'primary_email', p.primary_email
      )
      from public.contacts ct
      join public.persons p on p.id = ct.person_id
      where ct.id = p_contact_id and ct.workspace_id = p_workspace_id
    ),
    'recentInteractions', (
      select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
      from (
        select id, type, summary, sentiment, occurred_at from public.interactions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by occurred_at desc
        limit 5
      ) i
    ),
    'activeOpportunities', (
      select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
      from (
        select id, title, stage, opportunity_type, need_summary, target_daily_rate, estimated_gain
        from public.opportunities
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and stage not in ('gagne', 'perdu', 'abandonne')
      ) o
    ),
    'activeMissions', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from (
        select id, title, role_title, practice, start_date, end_date
        from public.missions
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and status = 'active'
      ) m
    ),
    'sectorIntelligence', (
      select jsonb_build_object('name', si.name, 'slug', si.slug, 'playbook', si.playbook)
      from public.sector_intelligence si
      join public.companies c on c.sector_id = si.id
      where c.id = p_company_id and si.workspace_id = p_workspace_id
    ),
    'sectorNews', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', n.title,
        'summary', n.summary,
        'published_at', n.published_at,
        'is_trigger_event', n.is_trigger_event
      )), '[]'::jsonb)
      from (
        select sn.* from public.sector_news sn
        join public.companies c on c.sector_id = sn.sector_id
        where c.id = p_company_id
          and sn.workspace_id = p_workspace_id
        order by sn.published_at desc
        limit 3
      ) n
    ),
    'previousCommunications', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'content_json', r.content_json,
        'created_at', r.created_at
      )), '[]'::jsonb)
      from (
        select * from public.ai_intelligence_results
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and result_type = 'communication'
        order by created_at desc
        limit 3
      ) r
    )
  );
$$;

revoke all on function public.get_communication_context(uuid, uuid, uuid, uuid, uuid) from public;
grant execute on function public.get_communication_context(uuid, uuid, uuid, uuid, uuid) to service_role;

-- ------------------------------------------------------------
-- get_pitch_context (20260704180000) — clé JSON 'ai_score'
-- conservée à l'identique, contrat consommé par le workflow n8n
-- intel-020-communication (canaux pitch).
-- ------------------------------------------------------------
create or replace function public.get_pitch_context(
  p_workspace_id uuid,
  p_company_id uuid,
  p_offer_id uuid default null,
  p_opportunity_id uuid default null,
  p_mission_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with delivered_practice_slugs as (
    select distinct
      case m.practice
        when 'Cloud' then 'cloud-engineering'
        when 'Cybersecurity' then 'cybersecurity'
        when 'Data' then 'data-ai'
        when 'Design' then 'digital-experience'
        when 'Digital' then 'digital-business-solutions'
        when 'Mobile' then 'digital-experience'
        when 'Product Management' then 'digital-experience'
        when 'Project Management' then 'project-agile-delivery'
        when 'QA' then 'quality-engineering-testing'
        else null
      end as slug
    from public.missions m
    where m.company_id = p_company_id
      and m.workspace_id = p_workspace_id
      and m.status = 'active'
  )
  select jsonb_build_object(
    'company', (
      select jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'legal_name', c.legal_name,
        'lifecycle_status', c.lifecycle_status,
        'sector', c.sector,
        'segment', c.segment,
        'hq_location', c.hq_location,
        'employee_count', c.employee_count,
        'priority', c.priority,
        'ai_score', c.legacy_folio_score,
        'description', c.description,
        'website', c.website,
        'next_action_label', c.next_action_label
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'offer', (
      select jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'practice', op.name,
        'practice_slug', op.slug,
        'short_description', o.short_description,
        'full_description', o.full_description,
        'typical_deliverables', o.typical_deliverables,
        'typical_profiles', o.typical_profiles,
        'use_cases', o.use_cases,
        'keywords', o.keywords
      )
      from public.offers o
      join public.offer_practices op on op.id = o.practice_id
      where o.id = p_offer_id and o.workspace_id = p_workspace_id
    ),
    'pricingGrid', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'profile_name', g.profile_name,
        'seniority_level', g.seniority_level,
        'engagement_type', et.name,
        'tjm_min', g.tjm_min,
        'tjm_max', g.tjm_max,
        'tjm_recommended', g.tjm_recommended,
        'currency', g.currency
      )), '[]'::jsonb)
      from (
        select g.*
        from public.offer_pricing_grids g
        join public.offers o on o.practice_id = g.practice_id
        where o.id = p_offer_id and g.workspace_id = p_workspace_id
        limit 8
      ) g
      left join public.offer_engagement_types et on et.id = g.engagement_type_id
    ),
    'engagementTypes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', et.name,
        'billing_model', et.billing_model,
        'typical_duration', et.typical_duration
      )), '[]'::jsonb)
      from public.offer_engagement_types et
      where et.workspace_id = p_workspace_id and et.is_active
    ),
    'deliveredPractices', (
      select coalesce(jsonb_agg(distinct dps.slug), '[]'::jsonb)
      from delivered_practice_slugs dps
      where dps.slug is not null
    ),
    'suggestedPractices', (
      select coalesce(jsonb_agg(jsonb_build_object('name', op.name, 'slug', op.slug)), '[]'::jsonb)
      from public.offer_practices op
      where op.workspace_id = p_workspace_id
        and op.is_active
        and op.slug not in (select slug from delivered_practice_slugs where slug is not null)
    ),
    'anchorOpportunity', (
      select jsonb_build_object(
        'id', o.id, 'title', o.title, 'stage', o.stage, 'opportunity_type', o.opportunity_type,
        'need_summary', o.need_summary, 'target_daily_rate', o.target_daily_rate, 'estimated_gain', o.estimated_gain
      )
      from public.opportunities o
      where o.id = p_opportunity_id and o.workspace_id = p_workspace_id
    ),
    'activeOpportunities', (
      select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
      from (
        select id, title, stage, opportunity_type, need_summary, target_daily_rate, estimated_gain
        from public.opportunities
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and stage not in ('gagne', 'perdu', 'abandonne')
      ) o
    ),
    'anchorMission', (
      select jsonb_build_object(
        'id', m.id, 'title', m.title, 'role_title', m.role_title, 'practice', m.practice,
        'start_date', m.start_date, 'end_date', m.end_date
      )
      from public.missions m
      where m.id = p_mission_id and m.workspace_id = p_workspace_id
    ),
    'activeMissions', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from (
        select id, title, role_title, practice, start_date, end_date
        from public.missions
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and status = 'active'
      ) m
    ),
    'recentInteractions', (
      select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
      from (
        select id, type, summary, sentiment, occurred_at from public.interactions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by occurred_at desc
        limit 3
      ) i
    ),
    'sectorIntelligence', (
      select jsonb_build_object(
        'name', si.name,
        'slug', si.slug,
        'practices_fit', si.practices_fit,
        'playbook', si.playbook
      )
      from public.sector_intelligence si
      join public.companies c on c.sector_id = si.id
      where c.id = p_company_id and si.workspace_id = p_workspace_id
    ),
    'sectorNews', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', n.title,
        'summary', n.summary,
        'published_at', n.published_at,
        'is_trigger_event', n.is_trigger_event
      )), '[]'::jsonb)
      from (
        select sn.* from public.sector_news sn
        join public.companies c on c.sector_id = sn.sector_id
        where c.id = p_company_id and sn.workspace_id = p_workspace_id
        order by sn.published_at desc
        limit 3
      ) n
    ),
    'legacyPitches', (
      select coalesce(
        (select jsonb_agg(elem) from (
          select elem from jsonb_array_elements(coalesce(c.metadata->'pitches', '[]'::jsonb)) elem limit 2
        ) x),
        '[]'::jsonb
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'previousPitches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'content_json', r.content_json,
        'created_at', r.created_at
      )), '[]'::jsonb)
      from (
        select * from public.ai_intelligence_results
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and result_type = 'commercial_pitch'
        order by created_at desc
        limit 2
      ) r
    ),
    'scores', jsonb_build_object(
      'conviction', public.compute_conviction_score_v1(p_company_id),
      'investment', public.compute_investment_score_v1(p_company_id)
    )
  );
$$;

revoke all on function public.get_pitch_context(uuid, uuid, uuid, uuid, uuid) from public;
grant execute on function public.get_pitch_context(uuid, uuid, uuid, uuid, uuid) to service_role;
