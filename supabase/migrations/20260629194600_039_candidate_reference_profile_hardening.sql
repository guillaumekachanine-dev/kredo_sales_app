begin;

alter table public.candidates
  drop constraint candidates_practice_workspace_fkey;

alter table public.candidates
  add constraint candidates_practice_workspace_fkey
  foreign key (practice_id, workspace_id)
  references public.offer_practices (id, workspace_id)
  on delete restrict;

with ranked_skills as (
  select
    ps.id,
    row_number() over (
      partition by ps.workspace_id, ps.person_id
      order by
        ps.level desc nulls last,
        ps.years desc nulls last,
        ps.last_used_year desc nulls last,
        s.name asc
    ) as inferred_rank
  from public.person_skills ps
  join public.skills s
    on s.id = ps.skill_id
   and s.workspace_id = ps.workspace_id
  join public.candidates c
    on c.person_id = ps.person_id
   and c.workspace_id = ps.workspace_id
  where coalesce(s.category, '') not in ('langue', 'certification', 'secteur')
)
update public.person_skills ps
set profile_rank = ranked_skills.inferred_rank::smallint
from ranked_skills
where ps.id = ranked_skills.id
  and ranked_skills.inferred_rank <= 3
  and ps.profile_rank is null;

commit;
