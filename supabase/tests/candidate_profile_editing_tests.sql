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

create temp table pg_temp.candidate_edit_context (
  actor_id uuid not null,
  workspace_id uuid not null,
  practice_id uuid not null,
  skill_id uuid not null
) on commit drop;

insert into pg_temp.candidate_edit_context (
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
  (select count(*) = 1 from pg_temp.candidate_edit_context),
  'A profile, practice and skill are required for the candidate editing test.'
);

grant select on pg_temp.candidate_edit_context to authenticated;

select set_config(
  'request.jwt.claim.sub',
  (select actor_id::text from pg_temp.candidate_edit_context),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
declare
  v_candidate_id uuid;
  v_person_id uuid;
  v_language_name text := 'Langue test candidate editing';
  v_certification_name text := 'Certification test candidate editing';
begin
  v_candidate_id := public.upsert_candidate_reference_profile(
    null,
    jsonb_build_object(
      'first_name', 'Candidate',
      'last_name', 'Editing Test',
      'primary_email', 'candidate.editing.test@example.invalid'
    ),
    jsonb_build_object(
      'status', 'nouveau',
      'current_title', 'Profil avant édition',
      'source', 'other',
      'practice_id', (select practice_id::text from pg_temp.candidate_edit_context)
    ),
    null
  );

  select person_id
    into v_person_id
  from public.candidates
  where id = v_candidate_id;

  perform public.save_candidate_reference_profile(
    v_candidate_id,
    jsonb_build_object(
      'first_name', 'Candidate',
      'last_name', 'Editing Test',
      'location', 'Nice'
    ),
    jsonb_build_object(
      'status', 'qualifie',
      'current_title', 'Profil après édition',
      'experience_years', 7,
      'expected_salary', 56000,
      'remote_preference', 'hybrid'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'skill_id', (select skill_id::text from pg_temp.candidate_edit_context),
        'profile_rank', 1,
        'level', 5,
        'years', 7,
        'source', 'manuel'
      ),
      jsonb_build_object(
        'name', v_language_name,
        'category', 'langue',
        'level', 4,
        'source', 'manuel'
      ),
      jsonb_build_object(
        'name', v_certification_name,
        'category', 'certification',
        'source', 'manuel'
      )
    )
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from public.candidates c
      join public.persons p on p.id = c.person_id
      where c.id = v_candidate_id
        and c.status = 'qualifie'
        and c.current_title = 'Profil après édition'
        and c.experience_years = 7
        and c.expected_salary = 56000
        and c.remote_preference = 'hybrid'
        and p.location = 'Nice'
    ),
    'The person and candidate fields must be updated atomically.'
  );

  perform pg_temp.assert_true(
    (select count(*) = 3 from public.person_skills where person_id = v_person_id),
    'The exhaustive skill list must contain the three submitted entries.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from public.person_skills ps
      join public.skills s on s.id = ps.skill_id
      where ps.person_id = v_person_id
        and s.name = v_language_name
        and s.category = 'langue'
        and ps.level = 4
    ),
    'A language created from the editor must be linked to the candidate.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from public.person_skills ps
      where ps.person_id = v_person_id
        and ps.skill_id = (select skill_id from pg_temp.candidate_edit_context)
        and ps.profile_rank = 1
    ),
    'The top-three rank must be persisted.'
  );

  perform public.save_candidate_reference_profile(
    v_candidate_id,
    '{}'::jsonb,
    '{}'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'name', v_language_name,
        'category', 'langue',
        'level', 5,
        'source', 'manuel'
      )
    )
  );

  perform pg_temp.assert_true(
    (select count(*) = 1 from public.person_skills where person_id = v_person_id),
    'Skills omitted from a later save must be removed from the person profile.'
  );
end;
$$;

rollback;
