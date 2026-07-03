-- ADR-0009 — RPC unique d'hydratation de contexte pour la génération de pitch
-- (onglet "Stratégie" de la fiche compte, canaux spoken_pitch_30s/meeting_briefing
-- du workflow n8n intel-020-communication).
--
-- Deux appelants :
--   1. Server Action getSuggestedOffers() (session utilisateur, p_offer_id NULL) —
--      peuple l'OfferPicker avant que l'utilisateur ait confirmé une offre.
--   2. n8n, nœud "Hydrate Context" (service_role, p_offer_id renseigné) — une fois
--      l'offre confirmée dans le CommunicationBrief (context.offerRef).
--
-- Matching offre v1 par règles (ADR-0009 §2.4) : missions.practice est un texte
-- libre historique (Cloud/Cybersecurity/Data/Design/Digital/Mobile/Product
-- Management/Project Management/QA) qui ne correspond à aucun offer_practices.slug
-- réel — dette documentée, aucune FK missions.practice_id -> offer_practices.id
-- n'existe. Le mapping ci-dessous est un pont heuristique volontairement explicite,
-- pas une vérité absolue ; il sert à suggérer, jamais à trancher à la place du BM.

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
        'ai_score', c.ai_score,
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
