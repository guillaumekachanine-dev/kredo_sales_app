-- Migration 035: candidate_hiring_processes + candidate_hiring_milestones
-- ADR-0010 — Modélisation du processus de recrutement interne
--
-- Deux tables additives, 0 breaking change sur candidates.status.
-- Étapes : prequalification → entretien_manager → tests_techniques
--        → proposition → signature → integration

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  TABLE 1 — candidate_hiring_processes                          ║
-- ╚══════════════════════════════════════════════════════════════════╝

create table if not exists public.candidate_hiring_processes (
  id             uuid        default gen_random_uuid() primary key,
  workspace_id   uuid        default private.current_workspace_id() not null
                              references public.workspaces(id),
  candidate_id   uuid        not null
                              references public.candidates(id) on delete cascade,
  job_profile_id uuid        references public.job_profiles(id) on delete set null,
  recruiter_id   uuid        references public.profiles(id) on delete set null,
  status         text        not null default 'active'
                              check (status in (
                                'active', 'hired', 'rejected', 'withdrawn', 'cancelled'
                              )),
  current_step   text        not null default 'prequalification'
                              check (current_step in (
                                'prequalification', 'entretien_manager', 'tests_techniques',
                                'proposition', 'signature', 'integration'
                              )),
  started_at     timestamptz default now() not null,
  closed_at      timestamptz,
  close_reason   text,
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null
);

comment on table public.candidate_hiring_processes is
  'Une tentative de recrutement interne. Un candidat peut avoir plusieurs processus (relances).';

-- Un seul processus actif par candidat à la fois
create unique index if not exists uq_one_active_hiring_process
  on public.candidate_hiring_processes (workspace_id, candidate_id)
  where status = 'active';

-- FK indexes (Postgres ne les crée pas automatiquement)
create index if not exists idx_chp_candidate
  on public.candidate_hiring_processes (candidate_id);

create index if not exists idx_chp_job_profile
  on public.candidate_hiring_processes (job_profile_id)
  where job_profile_id is not null;

create index if not exists idx_chp_recruiter
  on public.candidate_hiring_processes (recruiter_id)
  where recruiter_id is not null;

-- Partial index : processus actifs (requête la plus fréquente)
create index if not exists idx_chp_active
  on public.candidate_hiring_processes (workspace_id, status)
  where status = 'active';

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  TABLE 2 — candidate_hiring_milestones                         ║
-- ╚══════════════════════════════════════════════════════════════════╝

create table if not exists public.candidate_hiring_milestones (
  id                 uuid        default gen_random_uuid() primary key,
  workspace_id       uuid        default private.current_workspace_id() not null
                                  references public.workspaces(id),
  hiring_process_id  uuid        not null
                                  references public.candidate_hiring_processes(id)
                                  on delete cascade,
  step               text        not null
                                  check (step in (
                                    'prequalification', 'entretien_manager', 'tests_techniques',
                                    'proposition', 'signature', 'integration'
                                  )),
  result             text        not null default 'en_attente'
                                  check (result in (
                                    'en_attente', 'valide', 'refuse', 'annule'
                                  )),
  scheduled_at       timestamptz,
  completed_at       timestamptz,
  calendar_event_id  uuid        references public.calendar_events(id) on delete set null,
  notes              text,
  created_at         timestamptz default now() not null,
  updated_at         timestamptz default now() not null
);

comment on table public.candidate_hiring_milestones is
  'Jalon d''un processus de recrutement. Plusieurs jalons possibles par étape (reports, retries).';

-- FK indexes
create index if not exists idx_chm_process
  on public.candidate_hiring_milestones (hiring_process_id);

create index if not exists idx_chm_calendar
  on public.candidate_hiring_milestones (calendar_event_id)
  where calendar_event_id is not null;

-- Lookup par étape (pour le planning)
create index if not exists idx_chm_step
  on public.candidate_hiring_milestones (step);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  RLS — motif uniforme workspace                                ║
-- ╚══════════════════════════════════════════════════════════════════╝

alter table public.candidate_hiring_processes enable row level security;

create policy "chp_select" on public.candidate_hiring_processes
  for select using (workspace_id = private.current_workspace_id());
create policy "chp_insert" on public.candidate_hiring_processes
  for insert with check (true);
create policy "chp_update" on public.candidate_hiring_processes
  for update using (workspace_id = private.current_workspace_id());
create policy "chp_delete" on public.candidate_hiring_processes
  for delete using (workspace_id = private.current_workspace_id());

alter table public.candidate_hiring_milestones enable row level security;

create policy "chm_select" on public.candidate_hiring_milestones
  for select using (workspace_id = private.current_workspace_id());
create policy "chm_insert" on public.candidate_hiring_milestones
  for insert with check (true);
create policy "chm_update" on public.candidate_hiring_milestones
  for update using (workspace_id = private.current_workspace_id());
create policy "chm_delete" on public.candidate_hiring_milestones
  for delete using (workspace_id = private.current_workspace_id());

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Triggers                                                      ║
-- ╚══════════════════════════════════════════════════════════════════╝

create trigger trg_chp_updated_at
  before update on public.candidate_hiring_processes
  for each row execute function private.set_updated_at();

create trigger trg_chp_audit
  after insert or update or delete on public.candidate_hiring_processes
  for each row execute function private.log_audit();

create trigger trg_chm_updated_at
  before update on public.candidate_hiring_milestones
  for each row execute function private.set_updated_at();

create trigger trg_chm_audit
  after insert or update or delete on public.candidate_hiring_milestones
  for each row execute function private.log_audit();

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Grants (PostgREST / anon + authenticated)                     ║
-- ╚══════════════════════════════════════════════════════════════════╝

grant select, insert, update, delete on public.candidate_hiring_processes to authenticated;
grant select on public.candidate_hiring_processes to anon;

grant select, insert, update, delete on public.candidate_hiring_milestones to authenticated;
grant select on public.candidate_hiring_milestones to anon;
