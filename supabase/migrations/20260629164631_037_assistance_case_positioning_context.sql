begin;

-- Assistance-case hub foundation:
-- opportunity_candidates is the operational pivot between a need and a profile.

alter table public.opportunity_candidates
  add constraint opportunity_candidates_id_candidate_workspace_key
  unique (id, candidate_id, workspace_id);

alter table public.candidate_hiring_processes
  add column opportunity_candidate_id uuid;

comment on column public.candidate_hiring_processes.opportunity_candidate_id is
  'Positionnement candidat-besoin ayant déclenché ce processus de recrutement. Nullable uniquement pour les données historiques non rattachables avec certitude.';

-- Safe backfill only: a historical process is linked when its candidate has
-- exactly one positioning. Ambiguous or orphan historical rows remain null.
with candidate_positionings as (
  select
    candidate_id,
    count(*) as positioning_count,
    (array_agg(id order by created_at))[1] as positioning_id
  from public.opportunity_candidates
  group by candidate_id
)
update public.candidate_hiring_processes chp
set opportunity_candidate_id = cp.positioning_id
from candidate_positionings cp
where chp.opportunity_candidate_id is null
  and chp.candidate_id = cp.candidate_id
  and cp.positioning_count = 1;

alter table public.candidate_hiring_processes
  add constraint candidate_hiring_processes_positioning_context_fkey
  foreign key (opportunity_candidate_id, candidate_id, workspace_id)
  references public.opportunity_candidates (id, candidate_id, workspace_id)
  on delete restrict;

create index idx_chp_opportunity_candidate
  on public.candidate_hiring_processes (opportunity_candidate_id)
  where opportunity_candidate_id is not null;

-- The recruitment invariant now follows the positioning, not the candidate.
drop index if exists public.uq_one_active_hiring_process;

create unique index uq_active_hiring_process_per_positioning
  on public.candidate_hiring_processes (workspace_id, opportunity_candidate_id)
  where status = 'active' and opportunity_candidate_id is not null;

-- Preserve the legacy invariant until every historical process is attached.
create unique index uq_active_legacy_hiring_process_per_candidate
  on public.candidate_hiring_processes (workspace_id, candidate_id)
  where status = 'active' and opportunity_candidate_id is null;

-- Enforce workspace consistency between a process and its milestones.
alter table public.candidate_hiring_processes
  add constraint candidate_hiring_processes_id_workspace_key
  unique (id, workspace_id);

alter table public.candidate_hiring_milestones
  drop constraint candidate_hiring_milestones_hiring_process_id_fkey;

alter table public.candidate_hiring_milestones
  add constraint candidate_hiring_milestones_process_workspace_fkey
  foreign key (hiring_process_id, workspace_id)
  references public.candidate_hiring_processes (id, workspace_id)
  on delete cascade;

-- Candidate/opportunity events can now point at the exact staffing context.
alter table public.calendar_events
  add column opportunity_candidate_id uuid
  references public.opportunity_candidates(id)
  on delete set null;

comment on column public.calendar_events.opportunity_candidate_id is
  'Positionnement précis auquel se rattache l’événement de staffing ou de recrutement.';

update public.calendar_events ce
set opportunity_candidate_id = oc.id
from public.opportunity_candidates oc
where ce.opportunity_candidate_id is null
  and ce.candidate_id = oc.candidate_id
  and ce.opportunity_id = oc.opportunity_id;

create index idx_calendar_events_opportunity_candidate
  on public.calendar_events (opportunity_candidate_id, starts_at)
  where opportunity_candidate_id is not null;

create or replace function private.sync_calendar_event_positioning_context()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  linked_workspace_id uuid;
  linked_candidate_id uuid;
  linked_opportunity_id uuid;
begin
  if new.opportunity_candidate_id is null then
    return new;
  end if;

  select workspace_id, candidate_id, opportunity_id
    into linked_workspace_id, linked_candidate_id, linked_opportunity_id
  from public.opportunity_candidates
  where id = new.opportunity_candidate_id;

  if not found then
    raise exception 'Positionnement introuvable: %', new.opportunity_candidate_id;
  end if;

  if new.workspace_id is distinct from linked_workspace_id then
    raise exception 'Le workspace de l’événement ne correspond pas au positionnement';
  end if;

  if new.candidate_id is not null and new.candidate_id <> linked_candidate_id then
    raise exception 'Le candidat de l’événement ne correspond pas au positionnement';
  end if;

  if new.opportunity_id is not null and new.opportunity_id <> linked_opportunity_id then
    raise exception 'L’opportunité de l’événement ne correspond pas au positionnement';
  end if;

  new.candidate_id := linked_candidate_id;
  new.opportunity_id := linked_opportunity_id;

  return new;
end;
$$;

create trigger trg_calendar_events_positioning_context
  before insert or update of opportunity_candidate_id, candidate_id, opportunity_id, workspace_id
  on public.calendar_events
  for each row
  execute function private.sync_calendar_event_positioning_context();

-- Align insert policies with the workspace isolation already used elsewhere.
drop policy if exists chp_insert on public.candidate_hiring_processes;
create policy chp_insert on public.candidate_hiring_processes
  for insert
  with check (workspace_id = private.current_workspace_id());

drop policy if exists chm_insert on public.candidate_hiring_milestones;
create policy chm_insert on public.candidate_hiring_milestones
  for insert
  with check (workspace_id = private.current_workspace_id());

commit;
