begin;

alter table public.offer_practices
  add constraint offer_practices_id_workspace_key
  unique (id, workspace_id);

alter table public.candidates
  add column practice_id uuid,
  add column experience_years numeric(4,1),
  add column highest_degree_level text,
  add column sector_context text,
  add column last_mission_title text,
  add column last_mission_contribution text,
  add column search_reason text,
  add column last_salary numeric(12,2),
  add column available_from date,
  add column notice_period_days smallint,
  add column availability_notes text,
  add column has_vehicle boolean,
  add column desired_workload_pct smallint,
  add column max_commute_minutes smallint,
  add column remote_preference text,
  add column remote_days_per_week smallint,
  add column active_offer_status text,
  add column active_offer_deadline date,
  add column active_offer_notes text,
  add column constraints_notes text;

alter table public.candidates
  add constraint candidates_practice_workspace_fkey
    foreign key (practice_id, workspace_id)
    references public.offer_practices (id, workspace_id)
    on delete set null,
  add constraint candidates_experience_years_check
    check (experience_years is null or (experience_years >= 0 and experience_years <= 60)),
  add constraint candidates_highest_degree_level_check
    check (
      highest_degree_level is null
      or highest_degree_level = any (
        array['none', 'cap_bep', 'bac', 'bac_2', 'bac_3', 'bac_5', 'doctorate', 'other']::text[]
      )
    ),
  add constraint candidates_last_salary_check
    check (last_salary is null or last_salary >= 0),
  add constraint candidates_expected_salary_non_negative_check
    check (expected_salary is null or expected_salary >= 0),
  add constraint candidates_expected_daily_rate_non_negative_check
    check (expected_daily_rate is null or expected_daily_rate >= 0),
  add constraint candidates_notice_period_days_check
    check (notice_period_days is null or notice_period_days between 0 and 365),
  add constraint candidates_desired_workload_pct_check
    check (desired_workload_pct is null or desired_workload_pct between 10 and 100),
  add constraint candidates_max_commute_minutes_check
    check (max_commute_minutes is null or max_commute_minutes between 0 and 300),
  add constraint candidates_remote_preference_check
    check (
      remote_preference is null
      or remote_preference = any (array['onsite', 'hybrid', 'remote', 'flexible']::text[])
    ),
  add constraint candidates_remote_days_per_week_check
    check (remote_days_per_week is null or remote_days_per_week between 0 and 5),
  add constraint candidates_active_offer_status_check
    check (
      active_offer_status is null
      or active_offer_status = any (
        array['none', 'exploring', 'interviewing', 'offer_received', 'offer_accepted', 'offer_declined', 'other']::text[]
      )
    );

comment on column public.candidates.availability is
  'Champ historique conservé temporairement pour compatibilité. Utiliser available_from, notice_period_days et availability_notes.';
comment on column public.candidates.summary is
  'Synthèse dérivée ou éditoriale. Ne remplace pas les champs structurés du profil candidat.';
comment on column public.candidates.practice_id is
  'Practice principale du profil candidat, indépendante des opportunités sur lesquelles il est positionné.';

update public.candidates
set availability_notes = availability
where availability_notes is null
  and availability is not null;

create index idx_candidates_practice
  on public.candidates (workspace_id, practice_id)
  where practice_id is not null;

create index idx_candidates_available_from
  on public.candidates (workspace_id, available_from)
  where available_from is not null;

alter table public.person_skills
  add column profile_rank smallint;

alter table public.person_skills
  add constraint person_skills_profile_rank_check
  check (profile_rank is null or profile_rank between 1 and 3);

create unique index uq_person_skills_profile_rank
  on public.person_skills (workspace_id, person_id, profile_rank)
  where profile_rank is not null;

comment on column public.person_skills.profile_rank is
  'Rang 1 à 3 des compétences mises en avant sur la fiche de référence de la personne.';

create or replace function public.upsert_candidate_reference_profile(
  p_candidate_id uuid default null,
  p_person jsonb default '{}'::jsonb,
  p_candidate jsonb default '{}'::jsonb,
  p_profile_skills jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_workspace_id uuid := private.current_workspace_id();
  v_candidate_id uuid;
  v_person_id uuid;
  v_practice_id uuid;
  v_skill jsonb;
  v_skill_id uuid;
  v_rank smallint;
begin
  if v_workspace_id is null then
    raise exception 'Workspace courant introuvable';
  end if;

  if p_candidate ? 'practice_id' and nullif(p_candidate->>'practice_id', '') is not null then
    v_practice_id := (p_candidate->>'practice_id')::uuid;

    if not exists (
      select 1
      from public.offer_practices op
      where op.id = v_practice_id
        and op.workspace_id = v_workspace_id
        and op.is_active = true
    ) then
      raise exception 'Practice invalide pour le workspace courant';
    end if;
  end if;

  if p_candidate_id is null then
    if nullif(btrim(p_person->>'first_name'), '') is null
       or nullif(btrim(p_person->>'last_name'), '') is null then
      raise exception 'Le prénom et le nom sont obligatoires';
    end if;

    insert into public.persons (
      workspace_id,
      first_name,
      last_name,
      primary_email,
      phone,
      linkedin_url,
      location,
      notes
    )
    values (
      v_workspace_id,
      nullif(btrim(p_person->>'first_name'), ''),
      nullif(btrim(p_person->>'last_name'), ''),
      nullif(btrim(p_person->>'primary_email'), ''),
      nullif(btrim(p_person->>'phone'), ''),
      nullif(btrim(p_person->>'linkedin_url'), ''),
      nullif(btrim(p_person->>'location'), ''),
      nullif(btrim(p_person->>'notes'), '')
    )
    returning id into v_person_id;

    insert into public.candidates (
      workspace_id,
      person_id,
      status,
      current_title,
      seniority,
      source,
      practice_id,
      experience_years,
      highest_degree_level,
      sector_context,
      last_mission_title,
      last_mission_contribution,
      search_reason,
      expected_daily_rate,
      expected_salary,
      last_salary,
      available_from,
      notice_period_days,
      availability_notes,
      availability,
      mobility,
      has_vehicle,
      desired_workload_pct,
      max_commute_minutes,
      remote_preference,
      remote_days_per_week,
      active_offer_status,
      active_offer_deadline,
      active_offer_notes,
      constraints_notes,
      notes
    )
    values (
      v_workspace_id,
      v_person_id,
      coalesce(nullif(p_candidate->>'status', ''), 'nouveau'),
      nullif(btrim(p_candidate->>'current_title'), ''),
      nullif(p_candidate->>'seniority', ''),
      nullif(p_candidate->>'source', ''),
      v_practice_id,
      nullif(p_candidate->>'experience_years', '')::numeric,
      nullif(p_candidate->>'highest_degree_level', ''),
      nullif(btrim(p_candidate->>'sector_context'), ''),
      nullif(btrim(p_candidate->>'last_mission_title'), ''),
      nullif(btrim(p_candidate->>'last_mission_contribution'), ''),
      nullif(btrim(p_candidate->>'search_reason'), ''),
      nullif(p_candidate->>'expected_daily_rate', '')::numeric,
      nullif(p_candidate->>'expected_salary', '')::numeric,
      nullif(p_candidate->>'last_salary', '')::numeric,
      nullif(p_candidate->>'available_from', '')::date,
      nullif(p_candidate->>'notice_period_days', '')::smallint,
      nullif(btrim(p_candidate->>'availability_notes'), ''),
      nullif(btrim(p_candidate->>'availability_notes'), ''),
      nullif(btrim(p_candidate->>'mobility'), ''),
      nullif(p_candidate->>'has_vehicle', '')::boolean,
      nullif(p_candidate->>'desired_workload_pct', '')::smallint,
      nullif(p_candidate->>'max_commute_minutes', '')::smallint,
      nullif(p_candidate->>'remote_preference', ''),
      nullif(p_candidate->>'remote_days_per_week', '')::smallint,
      coalesce(nullif(p_candidate->>'active_offer_status', ''), 'none'),
      nullif(p_candidate->>'active_offer_deadline', '')::date,
      nullif(btrim(p_candidate->>'active_offer_notes'), ''),
      nullif(btrim(p_candidate->>'constraints_notes'), ''),
      nullif(btrim(p_candidate->>'notes'), '')
    )
    returning id into v_candidate_id;
  else
    select c.id, c.person_id
      into v_candidate_id, v_person_id
    from public.candidates c
    where c.id = p_candidate_id
      and c.workspace_id = v_workspace_id
    for update;

    if not found then
      raise exception 'Candidat introuvable dans le workspace courant';
    end if;

    update public.persons p
    set
      first_name = case when p_person ? 'first_name' then nullif(btrim(p_person->>'first_name'), '') else p.first_name end,
      last_name = case when p_person ? 'last_name' then nullif(btrim(p_person->>'last_name'), '') else p.last_name end,
      primary_email = case when p_person ? 'primary_email' then nullif(btrim(p_person->>'primary_email'), '') else p.primary_email end,
      phone = case when p_person ? 'phone' then nullif(btrim(p_person->>'phone'), '') else p.phone end,
      linkedin_url = case when p_person ? 'linkedin_url' then nullif(btrim(p_person->>'linkedin_url'), '') else p.linkedin_url end,
      location = case when p_person ? 'location' then nullif(btrim(p_person->>'location'), '') else p.location end,
      notes = case when p_person ? 'notes' then nullif(btrim(p_person->>'notes'), '') else p.notes end,
      updated_at = now()
    where p.id = v_person_id
      and p.workspace_id = v_workspace_id;

    update public.candidates c
    set
      status = case when p_candidate ? 'status' then coalesce(nullif(p_candidate->>'status', ''), c.status) else c.status end,
      current_title = case when p_candidate ? 'current_title' then nullif(btrim(p_candidate->>'current_title'), '') else c.current_title end,
      seniority = case when p_candidate ? 'seniority' then nullif(p_candidate->>'seniority', '') else c.seniority end,
      source = case when p_candidate ? 'source' then nullif(p_candidate->>'source', '') else c.source end,
      practice_id = case when p_candidate ? 'practice_id' then v_practice_id else c.practice_id end,
      experience_years = case when p_candidate ? 'experience_years' then nullif(p_candidate->>'experience_years', '')::numeric else c.experience_years end,
      highest_degree_level = case when p_candidate ? 'highest_degree_level' then nullif(p_candidate->>'highest_degree_level', '') else c.highest_degree_level end,
      sector_context = case when p_candidate ? 'sector_context' then nullif(btrim(p_candidate->>'sector_context'), '') else c.sector_context end,
      last_mission_title = case when p_candidate ? 'last_mission_title' then nullif(btrim(p_candidate->>'last_mission_title'), '') else c.last_mission_title end,
      last_mission_contribution = case when p_candidate ? 'last_mission_contribution' then nullif(btrim(p_candidate->>'last_mission_contribution'), '') else c.last_mission_contribution end,
      search_reason = case when p_candidate ? 'search_reason' then nullif(btrim(p_candidate->>'search_reason'), '') else c.search_reason end,
      expected_daily_rate = case when p_candidate ? 'expected_daily_rate' then nullif(p_candidate->>'expected_daily_rate', '')::numeric else c.expected_daily_rate end,
      expected_salary = case when p_candidate ? 'expected_salary' then nullif(p_candidate->>'expected_salary', '')::numeric else c.expected_salary end,
      last_salary = case when p_candidate ? 'last_salary' then nullif(p_candidate->>'last_salary', '')::numeric else c.last_salary end,
      available_from = case when p_candidate ? 'available_from' then nullif(p_candidate->>'available_from', '')::date else c.available_from end,
      notice_period_days = case when p_candidate ? 'notice_period_days' then nullif(p_candidate->>'notice_period_days', '')::smallint else c.notice_period_days end,
      availability_notes = case when p_candidate ? 'availability_notes' then nullif(btrim(p_candidate->>'availability_notes'), '') else c.availability_notes end,
      availability = case when p_candidate ? 'availability_notes' then nullif(btrim(p_candidate->>'availability_notes'), '') else c.availability end,
      mobility = case when p_candidate ? 'mobility' then nullif(btrim(p_candidate->>'mobility'), '') else c.mobility end,
      has_vehicle = case when p_candidate ? 'has_vehicle' then nullif(p_candidate->>'has_vehicle', '')::boolean else c.has_vehicle end,
      desired_workload_pct = case when p_candidate ? 'desired_workload_pct' then nullif(p_candidate->>'desired_workload_pct', '')::smallint else c.desired_workload_pct end,
      max_commute_minutes = case when p_candidate ? 'max_commute_minutes' then nullif(p_candidate->>'max_commute_minutes', '')::smallint else c.max_commute_minutes end,
      remote_preference = case when p_candidate ? 'remote_preference' then nullif(p_candidate->>'remote_preference', '') else c.remote_preference end,
      remote_days_per_week = case when p_candidate ? 'remote_days_per_week' then nullif(p_candidate->>'remote_days_per_week', '')::smallint else c.remote_days_per_week end,
      active_offer_status = case when p_candidate ? 'active_offer_status' then nullif(p_candidate->>'active_offer_status', '') else c.active_offer_status end,
      active_offer_deadline = case when p_candidate ? 'active_offer_deadline' then nullif(p_candidate->>'active_offer_deadline', '')::date else c.active_offer_deadline end,
      active_offer_notes = case when p_candidate ? 'active_offer_notes' then nullif(btrim(p_candidate->>'active_offer_notes'), '') else c.active_offer_notes end,
      constraints_notes = case when p_candidate ? 'constraints_notes' then nullif(btrim(p_candidate->>'constraints_notes'), '') else c.constraints_notes end,
      notes = case when p_candidate ? 'notes' then nullif(btrim(p_candidate->>'notes'), '') else c.notes end,
      updated_at = now()
    where c.id = v_candidate_id
      and c.workspace_id = v_workspace_id;
  end if;

  if p_profile_skills is not null then
    if jsonb_typeof(p_profile_skills) <> 'array' then
      raise exception 'p_profile_skills doit être un tableau JSON';
    end if;

    if jsonb_array_length(p_profile_skills) > 3 then
      raise exception 'Trois compétences principales maximum';
    end if;

    update public.person_skills
    set profile_rank = null
    where workspace_id = v_workspace_id
      and person_id = v_person_id
      and profile_rank is not null;

    for v_skill in
      select value from jsonb_array_elements(p_profile_skills)
    loop
      v_skill_id := nullif(v_skill->>'skill_id', '')::uuid;
      v_rank := nullif(v_skill->>'profile_rank', '')::smallint;

      if v_skill_id is null or v_rank is null then
        raise exception 'Chaque compétence principale doit fournir skill_id et profile_rank';
      end if;

      if not exists (
        select 1 from public.skills s
        where s.id = v_skill_id
          and s.workspace_id = v_workspace_id
      ) then
        raise exception 'Compétence invalide pour le workspace courant';
      end if;

      insert into public.person_skills (
        workspace_id,
        person_id,
        skill_id,
        level,
        years,
        last_used_year,
        source,
        confidence,
        comment,
        profile_rank
      )
      values (
        v_workspace_id,
        v_person_id,
        v_skill_id,
        nullif(v_skill->>'level', '')::smallint,
        nullif(v_skill->>'years', '')::smallint,
        nullif(v_skill->>'last_used_year', '')::smallint,
        coalesce(nullif(v_skill->>'source', ''), 'manuel'),
        nullif(v_skill->>'confidence', '')::numeric,
        nullif(btrim(v_skill->>'comment'), ''),
        v_rank
      )
      on conflict (person_id, skill_id)
      do update set
        level = coalesce(excluded.level, public.person_skills.level),
        years = coalesce(excluded.years, public.person_skills.years),
        last_used_year = coalesce(excluded.last_used_year, public.person_skills.last_used_year),
        source = coalesce(excluded.source, public.person_skills.source),
        confidence = coalesce(excluded.confidence, public.person_skills.confidence),
        comment = coalesce(excluded.comment, public.person_skills.comment),
        profile_rank = excluded.profile_rank;
    end loop;
  end if;

  return v_candidate_id;
end;
$$;

revoke all on function public.upsert_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.upsert_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) from anon;
grant execute on function public.upsert_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.upsert_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) to service_role;

commit;
