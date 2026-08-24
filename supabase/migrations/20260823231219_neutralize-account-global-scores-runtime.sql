-- LOT 1 — neutralisation runtime des notes synthétiques de compte.
-- Forward-only et non destructive : les structures physiques historiques sont
-- volontairement conservées pour le LOT 2. Cette migration n'est pas appliquée
-- automatiquement par l'application.

-- PostgreSQL ne permet pas à CREATE OR REPLACE VIEW de retirer une colonne.
-- Le renommage maintient la position et le type numeric, puis la vue remplace sa
-- valeur par un fait explicite : le nombre d'opportunités actuellement ouvertes.
alter view public.v_ai_intelligence_summary
  rename column legacy_folio_score to open_opportunities_count;

create or replace view public.v_ai_intelligence_summary
with (security_invoker = true)
as
select c.id as company_id,
    c.name as company_name,
    c.sector,
    c.priority,
    (select count(*)::numeric
       from public.opportunities opportunity
      where opportunity.company_id = c.id
        and opportunity.stage not in ('gagne', 'perdu', 'abandonne', 'win', 'lost'))
      as open_opportunities_count,
    res.has_client_analysis,
    res.has_sector_analysis,
    res.has_process_diagnostic,
    res.has_roadmap,
    c.meta_has_analysis_data as has_legacy_analysis,
    c.meta_has_sector_analysis as has_legacy_sector,
    c.meta_has_pitches as has_legacy_pitches,
    runs.latest_run_at,
    runs.latest_run_status,
    coalesce(runs.count_runs, (0)::bigint) as count_runs,
    coalesce(res.count_results, (0)::bigint) as count_results
from ((companies c
left join lateral (
    select bool_or((r.phase = 1)) as has_client_analysis,
        bool_or((r.phase = 2)) as has_sector_analysis,
        bool_or((r.phase = 3)) as has_process_diagnostic,
        bool_or((r.phase = 4)) as has_roadmap,
        count(*) as count_results
    from ai_intelligence_results r
    where ((r.company_id = c.id)
      and (r.status = 'succeeded'::ai_result_status)
      and not exists (
        select 1
        from ai_intelligence_runs mission_run
        where mission_run.id = r.run_id
          and mission_run.run_type like 'mission:%'
      ))
) res on (true))
left join lateral (
    select max(run.created_at) as latest_run_at,
        (array_agg(run.status order by run.created_at desc))[1] as latest_run_status,
        count(*) as count_runs
    from ai_intelligence_runs run
    where ((run.company_id = c.id)
      and (run.run_type is null or run.run_type not like 'mission:%'))
) runs on (true));

alter view public.v_crm_account_list
  rename column legacy_folio_score to open_opportunities_count;

create or replace view public.v_crm_account_list
with (security_invoker = true) as
 SELECT c.id,
    c.name,
    c.sector,
    c.segment,
    c.revenue,
    c.employee_count,
    c.size_band,
    c.hq_location,
    c.priority,
    c.lifecycle_status,
    (select count(*)::numeric
       from public.opportunities opportunity
      where opportunity.company_id = c.id
        and opportunity.stage not in ('gagne', 'perdu', 'abandonne', 'win', 'lost'))
      as open_opportunities_count,
    c.website,
    c.description,
    c.meta_logo_path AS logo_path,
    (c.meta_contact_stats ->> 'nb_contacts'::text)::integer AS nb_contacts,
    (c.meta_contact_stats ->> 'nb_with_email'::text)::integer AS nb_with_email,
    c.meta_has_study AS has_study,
    si.name AS sector_attachment_name,
    COALESCE(aws.is_enabled, false) AS has_dedicated_watch,
    COALESCE(ais.has_client_analysis, false) AS has_client_analysis,
    COALESCE(ais.has_sector_analysis, false) AS has_sector_analysis,
    COALESCE(ais.has_process_diagnostic, false) AS has_process_diagnostic,
    COALESCE(ais.has_roadmap, false) AS has_roadmap,
    COALESCE(ais.has_legacy_analysis, false) AS has_legacy_analysis,
    COALESCE(ais.has_legacy_sector, false) AS has_legacy_sector,
    (EXISTS ( SELECT 1
           FROM account_issues ai
          WHERE ai.company_id = c.id AND ai.status = 'open'::account_issue_status)) AS has_account_issues,
    (EXISTS ( SELECT 1
           FROM ai_intelligence_results air
          WHERE air.company_id = c.id AND air.status = 'succeeded'::ai_result_status AND air.result_type = 'commercial_strategy'::text)) AS has_commercial_strategy,
    c.sector_id,
    c.segment_id,
    si.name  AS sector_name,
    seg.name AS segment_name,
    c.tier,
    c.regime_achat,
    c.relation_type,
    c.depth_level,
    c.origin
   FROM companies c
     LEFT JOIN sector_intelligence si  ON si.id  = c.sector_id
     LEFT JOIN sector_intelligence seg ON seg.id = c.segment_id
     LEFT JOIN account_watch_settings aws ON aws.company_id = c.id
     LEFT JOIN v_ai_intelligence_summary ais ON ais.company_id = c.id;

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
        'priority', c.priority
      )
      FROM public.companies c
      WHERE c.id = p_company_id AND c.workspace_id = p_workspace_id
    ),
    'opportunities', (
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

revoke all on function public.get_account_summary_facts(uuid, uuid, date) from public;
grant execute on function public.get_account_summary_facts(uuid, uuid, date) to service_role;
comment on function public.get_account_summary_facts(uuid, uuid, date) is
  'REPORT-001 — hydratation déterministe factuelle, sans note synthétique de compte.';

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
comment on function public.get_communication_context(uuid, uuid, uuid, uuid, uuid) is
  'INTEL-020 — contexte de communication factuel, sans note synthétique de compte.';

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
    )
  );
$$;

revoke all on function public.get_pitch_context(uuid, uuid, uuid, uuid, uuid) from public;
grant execute on function public.get_pitch_context(uuid, uuid, uuid, uuid, uuid) to service_role;
comment on function public.get_pitch_context(uuid, uuid, uuid, uuid, uuid) is
  'INTEL-020 — contexte de pitch factuel, sans note synthétique de compte.';

create or replace function public.get_commercial_strategy_context(
  p_workspace_id uuid,
  p_company_id uuid
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
    -- Le vrai nouvel input par rapport aux étapes précédentes : les enjeux
    -- déjà cartographiés et ouverts (Lot 4), source de vérité de la matrice.
    'openIssues', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ai.id,
        'title', ai.title,
        'category', ai.category,
        'problem_statement', ai.problem_statement,
        'evidence_level', ai.evidence_level,
        'importance', ai.importance,
        'urgency', ai.urgency,
        'kredo_fit', ai.kredo_fit,
        'contact_ids', ai.contact_ids
      ) order by ai.importance desc, ai.urgency desc), '[]'::jsonb)
      from public.account_issues ai
      where ai.company_id = p_company_id
        and ai.workspace_id = p_workspace_id
        and ai.status = 'open'
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
    -- Catalogue complet (pas allégé, cf. commentaire de tête).
    'offersCatalog', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'practice', op.name,
        'practice_slug', op.slug,
        'short_description', o.short_description,
        'use_cases', o.use_cases,
        'keywords', o.keywords
      ) order by op.sort_order, o.sort_order), '[]'::jsonb)
      from public.offers o
      join public.offer_practices op on op.id = o.practice_id
      where o.workspace_id = p_workspace_id and o.is_active
    ),
    'pricingByPractice', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'practice', agg.practice_name,
        'practice_slug', agg.practice_slug,
        'tjm_min', agg.tjm_min,
        'tjm_max', agg.tjm_max,
        'tjm_recommended_avg', agg.tjm_recommended_avg
      )), '[]'::jsonb)
      from (
        select
          op.id as practice_id,
          op.name as practice_name,
          op.slug as practice_slug,
          min(g.tjm_min) as tjm_min,
          max(g.tjm_max) as tjm_max,
          round(avg(g.tjm_recommended)) as tjm_recommended_avg
        from public.offer_pricing_grids g
        join public.offer_practices op on op.id = g.practice_id
        where g.workspace_id = p_workspace_id
        group by op.id, op.name, op.slug
      ) agg
    ),
    'deliveredPractices', (
      select coalesce(jsonb_agg(distinct dps.slug), '[]'::jsonb)
      from delivered_practice_slugs dps
      where dps.slug is not null
    ),
    -- Snapshot sectoriel mutualisé (D-6, déterministe) — pain points + calendrier
    -- réglementaire + playbook + practices_fit, seulement si sector_id renseigné.
    'sectorPlaybook', (
      select jsonb_build_object(
        'name', si.name,
        'practices_fit', si.practices_fit,
        'playbook', si.playbook,
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
    -- Anti-répétition best-effort sur refresh (comme existingOpenIssues au Lot 4).
    'previousStrategy', (
      select r.content_json
      from public.ai_intelligence_results r
      where r.company_id = p_company_id
        and r.workspace_id = p_workspace_id
        and r.result_type = 'commercial_strategy'
        and r.status = 'succeeded'
      order by r.created_at desc
      limit 1
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_commercial_strategy_context(uuid, uuid) from public;
grant execute on function public.get_commercial_strategy_context(uuid, uuid) to service_role;
comment on function public.get_commercial_strategy_context(uuid, uuid) is
  'INTEL-032 — contexte de stratégie commerciale factuel, sans note synthétique de compte.';

create or replace function public.get_workspace_diagnostic_context(
  p_workspace_id uuid,
  p_as_of_date date default current_date
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with
  open_opportunities as (
    select o.*
    from public.opportunities o
    where o.workspace_id = p_workspace_id
      and o.stage not in ('gagne', 'perdu', 'abandonne', 'win', 'lost')
  ),
  weighted_pipe as (
    select coalesce(sum(coalesce(o.weighted_gain, 0)), 0)::numeric as total
    from open_opportunities o
  ),
  previous_month_pipe as (
    -- Reconstruction best-effort du portefeuille qui existait à la fin du mois
    -- précédent. Le modèle ne possède pas d'historique de changement de stage ou
    -- de montant : cette valeur est donc explicitement caveatée dans la sortie.
    select coalesce(sum(coalesce(o.weighted_gain, 0)), 0)::numeric as total
    from public.opportunities o
    where o.workspace_id = p_workspace_id
      and o.created_at::date < date_trunc('month', p_as_of_date)::date
      and (
        o.closed_at is null
        or o.closed_at::date >= date_trunc('month', p_as_of_date)::date
      )
  ),
  latest_activity as (
    select distinct on (mar.collaborator_id, mar.mission_id)
      mar.collaborator_id,
      mar.mission_id,
      mar.status,
      mar.period_start,
      mar.business_days,
      mar.billable_days,
      mar.tjm_snapshot,
      mar.cjm_snapshot
    from public.mission_activity_reports mar
    where mar.workspace_id = p_workspace_id
      and mar.period_start <= p_as_of_date
    order by mar.collaborator_id, mar.mission_id, mar.period_start desc
  ),
  ytd_activity as (
    select
      mar.collaborator_id,
      round(
        sum(mar.billable_days) / nullif(sum(mar.business_days), 0) * 100,
        1
      ) as activity_rate
    from public.mission_activity_reports mar
    where mar.workspace_id = p_workspace_id
      and mar.period_start >= date_trunc('year', p_as_of_date)::date
      and mar.period_start <= p_as_of_date
    group by mar.collaborator_id
  ),
  skill_demand as (
    select
      os.skill_id,
      s.name as skill_name,
      round(sum(
        coalesce(os.weight, 0)
        * case os.importance
            when 'indispensable' then 1.5
            when 'souhaitee' then 1.15
            when 'bonus' then 0.75
            else 1
          end
      )::numeric, 2) as demand_score
    from public.opportunity_skills os
    join open_opportunities o on o.id = os.opportunity_id
    join public.skills s on s.id = os.skill_id
    where os.workspace_id = p_workspace_id
    group by os.skill_id, s.name
  ),
  skill_supply as (
    select
      ps.skill_id,
      round(sum(coalesce(ps.level, 0)::numeric / 5), 2) as supply_score
    from public.person_skills ps
    join public.collaborators c
      on c.person_id = ps.person_id
     and c.workspace_id = p_workspace_id
     and c.status in ('actif', 'en_mission', 'intercontrat', 'preavis')
    where ps.workspace_id = p_workspace_id
    group by ps.skill_id
  ),
  last_six_months as (
    select p.*
    from public.pnl_monthly p
    where p.workspace_id = p_workspace_id
      and p.period_month <= date_trunc('month', p_as_of_date)::date
    order by p.period_month desc
    limit 6
  ),
  finance_trend as (
    select
      count(*) as months_count,
      avg(revenue_total) filter (where recency_rank <= 3) as recent_avg,
      avg(revenue_total) filter (where recency_rank > 3) as prior_avg
    from (
      select
        lsm.revenue_total,
        row_number() over (order by lsm.period_month desc) as recency_rank
      from last_six_months lsm
    ) ranked
  )
  select jsonb_build_object(
    'workspace', (
      select jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'asOfDate', p_as_of_date,
        'dataCutoffAt', now(),
        'caveats', jsonb_build_array(
          'pipeWeightedPrevMonth est une reconstruction à partir du snapshot courant : les changements historiques de stage et de montant ne sont pas stockés.',
          'hiringFunnelSnapshot est une photographie des étapes actuelles, pas un taux de conversion temporel.',
          'Les marges exposées sont des pourcentages ; aucun salaire, CJM individuel ou coût employeur brut n''est transmis au modèle.'
        )
      )
      from public.workspaces w
      where w.id = p_workspace_id
    ),
    'commerce', jsonb_build_object(
      'pipeWeighted', (select wp.total from weighted_pipe wp),
      'pipeWeightedPrevMonth', (select pmp.total from previous_month_pipe pmp),
      'oppsByStage', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'stage', grouped.stage,
          'count', grouped.opportunity_count,
          'weighted', grouped.weighted
        ) order by grouped.weighted desc), '[]'::jsonb)
        from (
          select
            o.stage,
            count(*) as opportunity_count,
            coalesce(sum(coalesce(o.weighted_gain, 0)), 0) as weighted
          from open_opportunities o
          group by o.stage
        ) grouped
      ),
      'stagnatingOpps', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', stale.id,
          'title', stale.title,
          'companyName', stale.company_name,
          'stage', stale.stage,
          'weighted', stale.weighted_gain,
          'lastUpdatedAt', stale.updated_at
        ) order by stale.updated_at), '[]'::jsonb)
        from (
          select o.id, o.title, c.name as company_name, o.stage,
                 coalesce(o.weighted_gain, 0) as weighted_gain, o.updated_at
          from open_opportunities o
          left join public.companies c
            on c.id = o.company_id and c.workspace_id = p_workspace_id
          where o.updated_at::date < p_as_of_date - 30
          order by o.updated_at
          limit 10
        ) stale
      ),
      'topClientConcentration', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'companyName', concentration.company_name,
          'pctOfPipe', concentration.pct_of_pipe,
          'weighted', concentration.weighted
        ) order by concentration.weighted desc), '[]'::jsonb)
        from (
          select
            coalesce(c.name, 'Compte non renseigné') as company_name,
            sum(coalesce(o.weighted_gain, 0)) as weighted,
            round(
              sum(coalesce(o.weighted_gain, 0))
              / nullif((select wp.total from weighted_pipe wp), 0)
              * 100,
              1
            ) as pct_of_pipe
          from open_opportunities o
          left join public.companies c
            on c.id = o.company_id and c.workspace_id = p_workspace_id
          group by coalesce(c.name, 'Compte non renseigné')
          order by weighted desc
          limit 3
        ) concentration
      ),
      'oppsWithoutRecentAction', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', inactive.id,
          'title', inactive.title,
          'companyName', inactive.company_name,
          'stage', inactive.stage,
          'weighted', inactive.weighted_gain,
          'lastInteractionAt', inactive.last_interaction_at
        ) order by inactive.weighted_gain desc), '[]'::jsonb)
        from (
          select
            o.id,
            o.title,
            c.name as company_name,
            o.stage,
            coalesce(o.weighted_gain, 0) as weighted_gain,
            max(i.occurred_at) as last_interaction_at
          from open_opportunities o
          left join public.companies c
            on c.id = o.company_id and c.workspace_id = p_workspace_id
          left join public.interactions i
            on i.workspace_id = p_workspace_id
           and (i.opportunity_id = o.id or (i.opportunity_id is null and i.company_id = o.company_id))
          group by o.id, o.title, c.name, o.stage, o.weighted_gain
          having max(i.occurred_at)::date is null
              or max(i.occurred_at)::date < p_as_of_date - 15
          order by coalesce(o.weighted_gain, 0) desc
          limit 10
        ) inactive
      )
    ),
    'delivery', jsonb_build_object(
      'activeMissionsCount', (
        select count(*) from public.missions m
        where m.workspace_id = p_workspace_id and m.status = 'active'
      ),
      'missionsEndingSoon', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', ending.id,
          'title', ending.title,
          'client', ending.client,
          'practice', ending.practice,
          'endDate', ending.end_date,
          'marginPct', ending.gross_margin_pct
        ) order by ending.end_date), '[]'::jsonb)
        from (
          select m.id, m.title, c.name as client, m.practice, m.end_date, m.gross_margin_pct
          from public.missions m
          join public.companies c
            on c.id = m.company_id and c.workspace_id = p_workspace_id
          where m.workspace_id = p_workspace_id
            and m.status = 'active'
            and m.end_date between p_as_of_date and p_as_of_date + 60
          order by m.end_date
          limit 12
        ) ending
      ),
      'avgOccupancyRate', (
        select round(avg(ya.activity_rate), 1) from ytd_activity ya
      ),
      'marginAlerts', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'collaborator', alert.full_name,
          'mission', alert.mission_title,
          'marginPct', alert.margin_pct
        ) order by alert.margin_pct), '[]'::jsonb)
        from (
          select
            p.full_name,
            m.title as mission_title,
            round(
              (
                la.billable_days * la.tjm_snapshot
                - la.business_days * la.cjm_snapshot
              ) / nullif(la.billable_days * la.tjm_snapshot, 0) * 100,
              1
            ) as margin_pct
          from latest_activity la
          join public.collaborators c
            on c.id = la.collaborator_id and c.workspace_id = p_workspace_id
          join public.persons p
            on p.id = c.person_id and p.workspace_id = p_workspace_id
          join public.missions m
            on m.id = la.mission_id and m.workspace_id = p_workspace_id
          where m.status = 'active'
            and la.billable_days * la.tjm_snapshot > 0
            and (
              la.billable_days * la.tjm_snapshot
              - la.business_days * la.cjm_snapshot
            ) / nullif(la.billable_days * la.tjm_snapshot, 0) * 100 < 15
          order by margin_pct
          limit 12
        ) alert
      ),
      'craNotValidatedCount', (
        select count(*) from latest_activity la where la.status <> 'validated'
      ),
      'negativeMarginCount', (
        select count(*) from public.missions m
        where m.workspace_id = p_workspace_id
          and m.status = 'active'
          and m.gross_margin_pct < 0
      )
    ),
    'finance', jsonb_build_object(
      'last6Months', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'month', chronological.period_month,
          'revenue', chronological.revenue_total,
          'grossMargin', chronological.gross_margin_value,
          'grossMarginPct', chronological.gross_margin_percent,
          'opProfit', chronological.operating_profit_value
        ) order by chronological.period_month), '[]'::jsonb)
        from last_six_months chronological
      ),
      'ytdRevenue', (
        select coalesce(sum(p.revenue_total), 0)
        from public.pnl_monthly p
        where p.workspace_id = p_workspace_id
          and p.period_month >= date_trunc('year', p_as_of_date)::date
          and p.period_month <= date_trunc('month', p_as_of_date)::date
      ),
      'ytdGrossMarginPct', (
        select round(
          sum(coalesce(p.gross_margin_value, 0))
          / nullif(sum(p.revenue_total), 0)
          * 100,
          1
        )
        from public.pnl_monthly p
        where p.workspace_id = p_workspace_id
          and p.period_month >= date_trunc('year', p_as_of_date)::date
          and p.period_month <= date_trunc('month', p_as_of_date)::date
      ),
      'trend', (
        select case
          when ft.months_count < 6 or ft.prior_avg is null or ft.prior_avg = 0 then 'insufficient_data'
          when ft.recent_avg > ft.prior_avg * 1.05 then 'hausse'
          when ft.recent_avg < ft.prior_avg * 0.95 then 'baisse'
          else 'stable'
        end
        from finance_trend ft
      )
    ),
    'team', jsonb_build_object(
      'totalCollaborators', (
        select count(*) from public.collaborators c
        where c.workspace_id = p_workspace_id
          and c.status in ('actif', 'en_mission', 'intercontrat', 'preavis')
      ),
      'avgActivityRateYtd', (
        select round(avg(ya.activity_rate), 1) from ytd_activity ya
      ),
      'collaboratorsBelow70', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', low.collaborator_id,
          'name', low.full_name,
          'rate', low.activity_rate,
          'mission', low.mission_title
        ) order by low.activity_rate), '[]'::jsonb)
        from (
          select
            c.id as collaborator_id,
            p.full_name,
            ya.activity_rate,
            (
              select m.title
              from public.missions m
              where m.workspace_id = p_workspace_id
                and m.collaborator_id = c.id
                and m.status = 'active'
              order by m.end_date nulls last
              limit 1
            ) as mission_title
          from ytd_activity ya
          join public.collaborators c
            on c.id = ya.collaborator_id and c.workspace_id = p_workspace_id
          join public.persons p
            on p.id = c.person_id and p.workspace_id = p_workspace_id
          where c.status in ('actif', 'en_mission', 'intercontrat', 'preavis')
            and ya.activity_rate < 70
          order by ya.activity_rate
          limit 12
        ) low
      ),
      'intercontractRisk', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', risk.collaborator_id,
          'name', risk.full_name,
          'missionEndDate', risk.mission_end_date,
          'plannedAbsenceDays', risk.planned_absence_days
        ) order by risk.mission_end_date nulls first), '[]'::jsonb)
        from (
          select
            c.id as collaborator_id,
            p.full_name,
            max(m.end_date) as mission_end_date,
            coalesce((
              select sum(a.duration_days)
              from public.collaborator_absences a
              where a.workspace_id = p_workspace_id
                and a.collaborator_id = c.id
                and a.start_date <= p_as_of_date + 60
                and a.end_date >= p_as_of_date
            ), 0) as planned_absence_days
          from public.collaborators c
          join public.persons p
            on p.id = c.person_id and p.workspace_id = p_workspace_id
          left join public.missions m
            on m.workspace_id = p_workspace_id
           and m.collaborator_id = c.id
           and m.status = 'active'
          where c.workspace_id = p_workspace_id
            and c.status in ('actif', 'en_mission', 'intercontrat', 'preavis')
          group by c.id, p.full_name
          having max(m.end_date) is null
              or max(m.end_date) <= p_as_of_date + 60
          order by max(m.end_date) nulls first
          limit 12
        ) risk
      ),
      'topSkillGaps', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'skill', gaps.skill_name,
          'demandScore', gaps.demand_score,
          'supplyScore', gaps.supply_score
        ) order by gaps.gap desc), '[]'::jsonb)
        from (
          select
            sd.skill_name,
            sd.demand_score,
            coalesce(ss.supply_score, 0) as supply_score,
            sd.demand_score - coalesce(ss.supply_score, 0) as gap
          from skill_demand sd
          left join skill_supply ss on ss.skill_id = sd.skill_id
          order by gap desc
          limit 5
        ) gaps
      ),
      'upcomingAbsences', (
        select coalesce(sum(a.duration_days), 0)
        from public.collaborator_absences a
        where a.workspace_id = p_workspace_id
          and a.start_date <= p_as_of_date + 30
          and a.end_date >= p_as_of_date
      )
    ),
    'recruitment', jsonb_build_object(
      'hiringFunnelSnapshot', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'step', funnel.current_step,
          'count', funnel.process_count
        ) order by funnel.process_count desc), '[]'::jsonb)
        from (
          select hp.current_step, count(*) as process_count
          from public.candidate_hiring_processes hp
          where hp.workspace_id = p_workspace_id
            and hp.status = 'active'
          group by hp.current_step
        ) funnel
      ),
      'oppsWithoutCandidate', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', uncovered.id,
          'title', uncovered.title,
          'companyName', uncovered.company_name,
          'requiredHeadcount', uncovered.required_headcount
        ) order by uncovered.required_headcount desc), '[]'::jsonb)
        from (
          select o.id, o.title, c.name as company_name, o.required_headcount
          from public.opportunities o
          left join public.companies c
            on c.id = o.company_id and c.workspace_id = p_workspace_id
          where o.workspace_id = p_workspace_id
            and o.stage = 'recherche_profil'
            and not exists (
              select 1
              from public.opportunity_candidates oc
              where oc.workspace_id = p_workspace_id
                and oc.opportunity_id = o.id
                and oc.status not in ('refuse_client', 'refuse_candidat', 'abandonne')
            )
          order by o.required_headcount desc
          limit 10
        ) uncovered
      ),
      'openJobProfilesCount', (
        select count(*) from public.job_profiles jp
        where jp.workspace_id = p_workspace_id and jp.is_active
      )
    )
  )
$function$;

revoke all on function public.get_workspace_diagnostic_context(uuid, date) from public;
grant execute on function public.get_workspace_diagnostic_context(uuid, date) to service_role;
comment on function public.get_workspace_diagnostic_context(uuid, date) is
  'INTEL-040 — snapshot transverse factuel, sans distribution de notes synthétiques de compte.';
