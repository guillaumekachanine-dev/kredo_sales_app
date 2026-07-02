-- INTEL-020 V1 — RPC unique d'hydratation de contexte pour le workflow n8n
-- intel-020-communication (nœud "Hydrate Context").
--
-- Remplace 8 requêtes REST séparées par un seul appel POST /rest/v1/rpc/get_communication_context
-- depuis n8n (HTTP Request node, credential Supabase service_role). Le service_role contourne
-- les RLS, donc le filtrage par workspace_id est fait explicitement dans chaque sous-requête
-- (SECURITY INVOKER + EXECUTE restreint à service_role, jamais à anon/authenticated).

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
        'ai_score', c.ai_score,
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
