alter table public.candidates
  add column if not exists current_title text,
  add column if not exists seniority text;

update public.candidates
set seniority = case
  when seniority is null then null
  when btrim(seniority) = '' then null
  when lower(btrim(seniority)) = 'junior' then 'Junior'
  when lower(btrim(seniority)) in ('confirme', 'confirmé') then 'Confirmé'
  when lower(btrim(seniority)) = 'senior' then 'Senior'
  when lower(btrim(seniority)) = 'lead' then 'Lead'
  when lower(btrim(seniority)) = 'expert' then 'Expert'
  else btrim(seniority)
end
where seniority is not null;

update public.candidates
set current_title = nullif(btrim(current_title), '')
where current_title is not null;

update public.candidates
set current_title = case
  when summary ilike '%Data Engineer%' then 'Data Engineer'
  when summary ilike '%Coach Agile%' then 'Agile Coach'
  when summary ilike '%Backend JS%' or summary ilike '%Backend JavaScript%' then 'Backend Developer'
  when summary ilike '%Développeur Fullstack%' or summary ilike '%Developpeur Fullstack%' then 'Fullstack Developer'
  when summary ilike '%Product Owner%' then 'Product Owner'
  when summary ilike '%Scrum master%' then 'Scrum Master'
  else null
end
where current_title is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidates_current_title_not_blank_chk'
      and conrelid = 'public.candidates'::regclass
  ) then
    alter table public.candidates
      add constraint candidates_current_title_not_blank_chk
      check (current_title is null or btrim(current_title) <> '');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidates_current_title_length_chk'
      and conrelid = 'public.candidates'::regclass
  ) then
    alter table public.candidates
      add constraint candidates_current_title_length_chk
      check (current_title is null or char_length(btrim(current_title)) between 2 and 80);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidates_seniority_not_blank_chk'
      and conrelid = 'public.candidates'::regclass
  ) then
    alter table public.candidates
      add constraint candidates_seniority_not_blank_chk
      check (seniority is null or btrim(seniority) <> '');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidates_seniority_allowed_chk'
      and conrelid = 'public.candidates'::regclass
  ) then
    alter table public.candidates
      add constraint candidates_seniority_allowed_chk
      check (
        seniority is null
        or seniority = any (array['Junior', 'Confirmé', 'Senior', 'Lead', 'Expert'])
      );
  end if;
end
$$;
