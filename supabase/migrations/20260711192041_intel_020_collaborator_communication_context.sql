-- INTEL-020 Lot 4 — fondations Supabase du scope collaborator.
-- Le rattachement manager applicatif complète manager_id (hiérarchie entre
-- collaborateurs) ; il ne le remplace jamais.

alter table public.collaborators
  add column if not exists manager_profile_id uuid
  references public.profiles(id)
  on delete set null;

create index if not exists collaborators_manager_profile_id_idx
  on public.collaborators(manager_profile_id)
  where manager_profile_id is not null;

-- Backfill strictement déterministe : seul un workspace ayant exactement un
-- profil peut recevoir ce profil comme manager applicatif. Les valeurs déjà
-- renseignées restent intactes.
with single_profile_workspace as (
  select workspace_id, (array_agg(id order by id))[1] as profile_id
  from public.profiles
  group by workspace_id
  having count(*) = 1
)
update public.collaborators c
set manager_profile_id = spw.profile_id
from single_profile_workspace spw
where c.workspace_id = spw.workspace_id
  and c.manager_profile_id is null;

create or replace function public.get_collaborator_communication_context(
  p_workspace_id uuid,
  p_collaborator_id uuid,
  p_mission_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with target as (
    select c.*
    from public.collaborators c
    where c.id = p_collaborator_id
      and c.workspace_id = p_workspace_id
  ),
  selected_mission as (
    select m.*
    from public.missions m
    join target c on c.id = m.collaborator_id
      and c.workspace_id = m.workspace_id
    where m.workspace_id = p_workspace_id
      and (
        (p_mission_id is not null and m.id = p_mission_id)
        or (
          p_mission_id is null
          and m.status = 'active'
        )
      )
    order by
      case when m.status = 'active' then 0 else 1 end,
      m.start_date desc nulls last,
      m.created_at desc
    limit 1
  )
  select case
    when not exists (select 1 from target) then null
    else jsonb_build_object(
      'collaborator', (
        select jsonb_build_object(
          'id', c.id,
          'employeeRef', c.employee_ref,
          'status', c.status,
          'employmentStatus', c.employment_status,
          'currentTitle', c.current_title,
          'seniority', c.seniority,
          'practice', c.practice,
          'entryDate', c.entry_date,
          'availability', c.availability
        )
        from target c
      ),
      'person', (
        select jsonb_build_object(
          'id', p.id,
          'fullName', p.full_name,
          'firstName', p.first_name,
          'lastName', p.last_name,
          'primaryEmail', p.primary_email,
          'phone', p.phone,
          'linkedinUrl', p.linkedin_url,
          'location', p.location
        )
        from target c
        join public.persons p on p.id = c.person_id
          and p.workspace_id = c.workspace_id
      ),
      'managerProfile', (
        select jsonb_build_object(
          'id', mp.id,
          'fullName', mp.full_name,
          'email', mp.email,
          'role', mp.role
        )
        from target c
        join public.profiles mp on mp.id = c.manager_profile_id
          and mp.workspace_id = c.workspace_id
      ),
      'currentMission', (
        select jsonb_build_object(
          'id', m.id,
          'companyId', m.company_id,
          'opportunityId', m.opportunity_id,
          'title', m.title,
          'status', m.status,
          'roleTitle', m.role_title,
          'practice', m.practice,
          'seniority', m.seniority,
          'startDate', m.start_date,
          'endDate', m.end_date
        )
        from selected_mission m
      ),
      'recentMissions', (
        select coalesce(jsonb_agg(to_jsonb(rm)), '[]'::jsonb)
        from (
          select m.id, m.company_id as "companyId", m.title, m.status,
            m.role_title as "roleTitle", m.practice, m.start_date as "startDate",
            m.end_date as "endDate"
          from public.missions m
          join target c on c.id = m.collaborator_id
            and c.workspace_id = m.workspace_id
          where m.workspace_id = p_workspace_id
          order by m.end_date desc nulls last, m.start_date desc nulls last, m.created_at desc
          limit 5
        ) rm
      ),
      'jobProfile', (
        select jsonb_build_object(
          'id', jp.id,
          'title', jp.title,
          'mainMission', jp.main_mission,
          'responsibilities', jp.responsibilities,
          'techStack', jp.tech_stack,
          'kpis', jp.kpis,
          'isActive', jp.is_active
        )
        from target c
        join public.job_profiles jp on jp.id = c.job_profile_id
          and jp.workspace_id = c.workspace_id
      ),
      'skills', (
        select coalesce(jsonb_agg(to_jsonb(sk)), '[]'::jsonb)
        from (
          select s.id, s.name, s.category, ps.level, ps.years,
            ps.last_used_year as "lastUsedYear", ps.confidence
          from target c
          join public.person_skills ps on ps.person_id = c.person_id
            and ps.workspace_id = c.workspace_id
          join public.skills s on s.id = ps.skill_id
            and s.workspace_id = ps.workspace_id
          order by ps.profile_rank asc nulls last, ps.level desc nulls last, s.name
          limit 20
        ) sk
      ),
      'availability', (
        select jsonb_build_object(
          'status', c.status,
          'availability', c.availability,
          'employmentStatus', c.employment_status
        )
        from target c
      ),
      'recentActivity', (
        select coalesce(jsonb_agg(to_jsonb(ra)), '[]'::jsonb)
        from (
          select mar.id, mar.mission_id as "missionId", mar.period_start as "periodStart",
            mar.period_end as "periodEnd", mar.status, mar.business_days as "businessDays",
            mar.billable_days as "billableDays", mar.non_billable_days as "nonBillableDays"
          from public.mission_activity_reports mar
          join target c on c.id = mar.collaborator_id
            and c.workspace_id = mar.workspace_id
          where mar.workspace_id = p_workspace_id
          order by mar.period_end desc, mar.created_at desc
          limit 5
        ) ra
      ),
      'recentAbsences', (
        select coalesce(jsonb_agg(to_jsonb(ra)), '[]'::jsonb)
        from (
          select a.id, a.absence_type as "absenceType", a.start_date as "startDate",
            a.end_date as "endDate", a.duration_days as "durationDays"
          from public.collaborator_absences a
          join target c on c.id = a.collaborator_id
            and c.workspace_id = a.workspace_id
          where a.workspace_id = p_workspace_id
          order by a.start_date desc, a.created_at desc
          limit 5
        ) ra
      )
    )
  end;
$$;

revoke all on function public.get_collaborator_communication_context(uuid, uuid, uuid) from public;
revoke all on function public.get_collaborator_communication_context(uuid, uuid, uuid) from anon, authenticated;
grant execute on function public.get_collaborator_communication_context(uuid, uuid, uuid) to service_role;

comment on function public.get_collaborator_communication_context(uuid, uuid, uuid) is
  'INTEL-020 Lot 4 — contexte de communication management d''un collaborateur. SECURITY INVOKER, filtrage workspace explicite, réservé à service_role.';
