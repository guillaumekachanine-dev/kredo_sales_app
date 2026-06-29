begin;

create or replace function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'assertion_failed: %', p_message;
  end if;
end;
$$;

create temp table pg_temp.candidate_profile_context (
  actor_id uuid not null,
  workspace_id uuid not null,
  practice_id uuid not null,
  skill_id uuid not null
) on commit drop;

insert into pg_temp.candidate_profile_context (
  actor_id,
  workspace_id,
  practice_id,
  skill_id
)
select
  p.id,
  p.workspace_id,
  op.id,
  s.id
from public.profiles p
join public.offer_practices op
  on op.workspace_id = p.workspace_id
 and op.is_active = true
join public.skills s
  on s.workspace_id = p.workspace_id
where p.workspace_id is not null
limit 1;

select pg_temp.assert_true(
  (select count(*) = 1 from pg_temp.candidate_profile_context),
  'A profile, practice and skill are required for the candidate profile test.'
);

select set_config(
  'request.jwt.claim.sub',
  (select actor_id::text from pg_temp.candidate_profile_context),
  true
);

select set_config('request.jwt.claim.role', 'authenticated', true);

set local role authenticated;

do $$
declare
  v_candidate_id uuid;
  v_person_id uuid;
begin
  v_candidate_id := public.upsert_candidate_reference_profile(
    null,
    jsonb_build_object(
      'first_name', 'Candidate',
      'last_name', 'Reference Test',
      'primary_email', 'candidate.reference.test@example.invalid',
      'location', 'Nice'
    ),
    jsonb_build_object(
      'status', 'nouveau',
      'current_title', 'Développeur Full-Stack',
      'seniority', 'Confirmé',
      'source', 'other',
      'practice_id', (select practice_id::text from pg_temp.candidate_profile_context),
      'experience_years', 5,
      'highest_degree_level', 'bac_5',
      'expected_salary', 52000,
      'last_salary', 48000,
      'available_from', current_date::text,
      'notice_period_days', 30,
      'availability_notes', 'Disponible sous un mois',
      'mobility', 'Alpes-Maritimes',
      'has_vehicle', true,
      'desired_workload_pct', 100,
      'max_commute_minutes', 60,
      'remote_preference', 'hybrid',
      'remote_days_per_week', 2,
      'active_offer_status', 'interviewing'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'skill_id', (select skill_id::text from pg_temp.candidate_profile_context),
        'profile_rank', 1,
        'level', 4,
        'years', 5,
        'source', 'manuel'
      )
    )
  );

  perform pg_temp.assert_true(v_candidate_id is not null, 'The RPC must return a candidate id.');

  select person_id
    into v_person_id
  from public.candidates
  where id = v_candidate_id;

  perform pg_temp.assert_true(v_person_id is not null, 'The candidate must reference a person.');

  perform pg_temp.assert_true(
    exists (
      select 1
      from public.candidates c
      join public.persons p on p.id = c.person_id
      where c.id = v_candidate_id
        and c.workspace_id = (select workspace_id from pg_temp.candidate_profile_context)
        and p.primary_email = 'candidate.reference.test@example.invalid'
        and c.practice_id = (select practice_id from pg_temp.candidate_profile_context)
        and c.experience_years = 5
        and c.available_from = current_date
        and c.remote_preference = 'hybrid'
    ),
    'The person and candidate records must be created atomically with structured fields.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from public.person_skills ps
      where ps.person_id = v_person_id
        and ps.skill_id = (select skill_id from pg_temp.candidate_profile_context)
        and ps.profile_rank = 1
    ),
    'The primary skill rank must be persisted.'
  );

  perform public.upsert_candidate_reference_profile(
    v_candidate_id,
    jsonb_build_object('location', 'Sophia Antipolis'),
    jsonb_build_object(
      'expected_salary', 54000,
      'availability_notes', 'Date négociable'
    ),
    null
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from public.candidates c
      join public.persons p on p.id = c.person_id
      where c.id = v_candidate_id
        and c.expected_salary = 54000
        and c.availability_notes = 'Date négociable'
        and c.availability = 'Date négociable'
        and p.location = 'Sophia Antipolis'
    ),
    'The RPC must update person and candidate fields in the same transaction.'
  );
end;
$$;

rollback;
