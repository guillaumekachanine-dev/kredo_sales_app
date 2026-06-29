begin;

create unique index if not exists uq_skills_workspace_category_normalized_name
  on public.skills (
    workspace_id,
    coalesce(category, ''),
    lower(btrim(name))
  );

create or replace function public.save_candidate_reference_profile(
  p_candidate_id uuid,
  p_person jsonb default '{}'::jsonb,
  p_candidate jsonb default '{}'::jsonb,
  p_skills jsonb default '[]'::jsonb
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
  v_item jsonb;
  v_skill_id uuid;
  v_skill_name text;
  v_category text;
  v_rank smallint;
  v_seen_skill_ids uuid[] := '{}'::uuid[];
  v_seen_ranks smallint[] := '{}'::smallint[];
begin
  if v_workspace_id is null then
    raise exception 'Workspace courant introuvable';
  end if;

  if p_candidate_id is null then
    raise exception 'Le candidat à modifier est obligatoire';
  end if;

  if jsonb_typeof(coalesce(p_skills, '[]'::jsonb)) <> 'array' then
    raise exception 'p_skills doit être un tableau JSON';
  end if;

  if jsonb_array_length(coalesce(p_skills, '[]'::jsonb)) > 100 then
    raise exception 'Cent compétences maximum par profil';
  end if;

  v_candidate_id := public.upsert_candidate_reference_profile(
    p_candidate_id,
    coalesce(p_person, '{}'::jsonb),
    coalesce(p_candidate, '{}'::jsonb),
    null
  );

  select c.person_id
    into v_person_id
  from public.candidates c
  where c.id = v_candidate_id
    and c.workspace_id = v_workspace_id
  for update;

  if not found then
    raise exception 'Candidat introuvable dans le workspace courant';
  end if;

  update public.person_skills
  set profile_rank = null
  where workspace_id = v_workspace_id
    and person_id = v_person_id
    and profile_rank is not null;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_skills, '[]'::jsonb))
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Chaque compétence doit être un objet JSON';
    end if;

    v_skill_id := null;
    v_skill_name := nullif(btrim(v_item->>'name'), '');
    v_category := nullif(v_item->>'category', '');
    v_rank := nullif(v_item->>'profile_rank', '')::smallint;

    if nullif(v_item->>'skill_id', '') is not null then
      v_skill_id := (v_item->>'skill_id')::uuid;

      select s.name, s.category
        into v_skill_name, v_category
      from public.skills s
      where s.id = v_skill_id
        and s.workspace_id = v_workspace_id;

      if not found then
        raise exception 'Compétence invalide pour le workspace courant';
      end if;
    else
      if v_skill_name is null or v_category is null then
        raise exception 'Une nouvelle compétence doit fournir un nom et une catégorie';
      end if;

      if v_category <> all (
        array[
          'langage', 'framework', 'cloud', 'data', 'devops', 'methode',
          'fonctionnel', 'secteur', 'soft_skill', 'langue', 'certification'
        ]::text[]
      ) then
        raise exception 'Catégorie de compétence invalide';
      end if;

      select s.id
        into v_skill_id
      from public.skills s
      where s.workspace_id = v_workspace_id
        and coalesce(s.category, '') = coalesce(v_category, '')
        and lower(btrim(s.name)) = lower(v_skill_name)
      limit 1;

      if v_skill_id is null then
        insert into public.skills (
          workspace_id,
          name,
          category
        )
        values (
          v_workspace_id,
          v_skill_name,
          v_category
        )
        on conflict do nothing
        returning id into v_skill_id;

        if v_skill_id is null then
          select s.id
            into v_skill_id
          from public.skills s
          where s.workspace_id = v_workspace_id
            and coalesce(s.category, '') = coalesce(v_category, '')
            and lower(btrim(s.name)) = lower(v_skill_name)
          limit 1;
        end if;
      end if;
    end if;

    if v_skill_id = any(v_seen_skill_ids) then
      raise exception 'Une compétence ne peut apparaître qu’une fois dans le profil';
    end if;

    if v_rank is not null then
      if v_rank not between 1 and 3 then
        raise exception 'Le rang principal doit être compris entre 1 et 3';
      end if;

      if v_category = any(array['langue', 'certification', 'secteur']::text[]) then
        raise exception 'Les langues, certifications et secteurs ne peuvent pas être classés dans le top 3';
      end if;

      if v_rank = any(v_seen_ranks) then
        raise exception 'Chaque rang principal ne peut être attribué qu’une fois';
      end if;

      v_seen_ranks := array_append(v_seen_ranks, v_rank);
    end if;

    v_seen_skill_ids := array_append(v_seen_skill_ids, v_skill_id);

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
      nullif(v_item->>'level', '')::smallint,
      nullif(v_item->>'years', '')::smallint,
      nullif(v_item->>'last_used_year', '')::smallint,
      coalesce(nullif(v_item->>'source', ''), 'manuel'),
      nullif(v_item->>'confidence', '')::numeric,
      nullif(btrim(v_item->>'comment'), ''),
      v_rank
    )
    on conflict (person_id, skill_id)
    do update set
      level = excluded.level,
      years = excluded.years,
      last_used_year = excluded.last_used_year,
      source = excluded.source,
      confidence = excluded.confidence,
      comment = excluded.comment,
      profile_rank = excluded.profile_rank;
  end loop;

  if cardinality(v_seen_skill_ids) = 0 then
    delete from public.person_skills ps
    where ps.workspace_id = v_workspace_id
      and ps.person_id = v_person_id;
  else
    delete from public.person_skills ps
    where ps.workspace_id = v_workspace_id
      and ps.person_id = v_person_id
      and not (ps.skill_id = any(v_seen_skill_ids));
  end if;

  return v_candidate_id;
end;
$$;

revoke all on function public.save_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.save_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) from anon;
grant execute on function public.save_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.save_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) to service_role;

comment on function public.save_candidate_reference_profile(uuid, jsonb, jsonb, jsonb) is
  'Met à jour atomiquement la personne, le candidat et la liste exhaustive de compétences du dossier candidat.';

commit;
