-- ============================================================
--  KREDO — Migration 006 : MOTEUR D'INTELLIGENCE COMMERCIALE
--  Cible : PostgreSQL 17 / Supabase  —  Schéma : public
--  ADR-0007  |  Lots 0→5
--
--  3 tables  :  ai_intelligence_runs
--               ai_intelligence_results
--               ai_intelligence_logs
--  2 enums   :  ai_run_status  |  ai_result_status
--  1 vue     :  v_ai_intelligence_summary  (security_invoker)
--
--  Idempotente (if not exists / or replace / DO blocks).
--  RLS : workspace_id = current_workspace_id()  (wrappé en SELECT
--        pour éviter l'évaluation par ligne — best practice Supabase).
-- ============================================================


-- ------------------------------------------------------------
--  1. ENUMS
--     Listes fermées → enum préfixé (CONVENTIONS.md)
-- ------------------------------------------------------------

do $$ begin
  create type public.ai_run_status as enum (
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ai_result_status as enum (
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;


-- ------------------------------------------------------------
--  2. TABLE : ai_intelligence_runs
--     Une ligne = une exécution d'analyse pour un compte.
-- ------------------------------------------------------------

create table if not exists public.ai_intelligence_runs (
  id                   uuid        primary key default gen_random_uuid(),

  workspace_id         uuid        not null default current_workspace_id(),
  owner_id             uuid        not null default auth.uid(),
  company_id           uuid        not null references public.companies(id)
                                     on delete cascade,

  run_type             text        not null default 'full_prospection_analysis',
  status               ai_run_status not null default 'queued',
  needs_review         boolean     not null default false,
  current_phase        smallint    not null default 1,

  trigger_source       text        not null default 'manual',

  input_snapshot       jsonb       not null default '{}'::jsonb,
  config               jsonb       not null default '{}'::jsonb,

  started_at           timestamptz null,
  completed_at         timestamptz null,
  failed_at            timestamptz null,

  total_tokens_input   integer     not null default 0,
  total_tokens_output  integer     not null default 0,
  total_cost_estimate  numeric     not null default 0,

  error_message        text        null,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Indexes
create index if not exists ai_intelligence_runs_workspace_id_idx
  on public.ai_intelligence_runs (workspace_id);

create index if not exists ai_intelligence_runs_company_id_idx
  on public.ai_intelligence_runs (company_id);

create index if not exists ai_intelligence_runs_status_idx
  on public.ai_intelligence_runs (status)
  where status in ('queued', 'running');

-- RLS
alter table public.ai_intelligence_runs enable row level security;

create policy ai_intelligence_runs_select
  on public.ai_intelligence_runs as permissive
  for select to public
  using ((select current_workspace_id()) = workspace_id);

create policy ai_intelligence_runs_insert
  on public.ai_intelligence_runs as permissive
  for insert to public
  with check ((select current_workspace_id()) = workspace_id);

create policy ai_intelligence_runs_update
  on public.ai_intelligence_runs as permissive
  for update to public
  using  ((select current_workspace_id()) = workspace_id)
  with check ((select current_workspace_id()) = workspace_id);

create policy ai_intelligence_runs_delete
  on public.ai_intelligence_runs as permissive
  for delete to public
  using ((select current_workspace_id()) = workspace_id);

-- Trigger updated_at
do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_updated_at_ai_intelligence_runs'
  ) then
    create trigger set_updated_at_ai_intelligence_runs
      before update on public.ai_intelligence_runs
      for each row execute function public.set_updated_at();
  end if;
end $$;


-- ------------------------------------------------------------
--  3. TABLE : ai_intelligence_results
--     Une ligne = un résultat de phase.
--     content_json est l'unique source de vérité — pas de html.
-- ------------------------------------------------------------

create table if not exists public.ai_intelligence_results (
  id                   uuid        primary key default gen_random_uuid(),

  workspace_id         uuid        not null default current_workspace_id(),
  owner_id             uuid        not null default auth.uid(),
  company_id           uuid        not null references public.companies(id)
                                     on delete cascade,
  run_id               uuid        not null references public.ai_intelligence_runs(id)
                                     on delete cascade,

  phase                smallint    not null,
  result_type          text        not null,
  status               ai_result_status not null default 'queued',
  needs_review         boolean     not null default false,

  title                text        null,
  content_json         jsonb       not null default '{}'::jsonb,
  content_text         text        null,

  model_provider       text        null,
  model_used           text        null,
  tokens_input         integer     null,
  tokens_output        integer     null,
  cost_estimate        numeric     null,
  duration_ms          integer     null,

  started_at           timestamptz null,
  completed_at         timestamptz null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  metadata             jsonb       not null default '{}'::jsonb,

  constraint ai_intelligence_results_phase_check
    check (phase between 1 and 10),

  constraint ai_intelligence_results_unique_run_phase
    unique (run_id, phase)
);

-- Indexes
create index if not exists ai_intelligence_results_workspace_id_idx
  on public.ai_intelligence_results (workspace_id);

create index if not exists ai_intelligence_results_company_id_idx
  on public.ai_intelligence_results (company_id);

-- FK index : run_id (non créé automatiquement par Postgres)
create index if not exists ai_intelligence_results_run_id_idx
  on public.ai_intelligence_results (run_id);

create index if not exists ai_intelligence_results_phase_idx
  on public.ai_intelligence_results (phase);

create index if not exists ai_intelligence_results_status_idx
  on public.ai_intelligence_results (status)
  where status in ('queued', 'running');

-- GIN sur content_json pour les requêtes de containment (@>)
create index if not exists ai_intelligence_results_content_json_gin
  on public.ai_intelligence_results using gin (content_json jsonb_path_ops);

-- RLS
alter table public.ai_intelligence_results enable row level security;

create policy ai_intelligence_results_select
  on public.ai_intelligence_results as permissive
  for select to public
  using ((select current_workspace_id()) = workspace_id);

create policy ai_intelligence_results_insert
  on public.ai_intelligence_results as permissive
  for insert to public
  with check ((select current_workspace_id()) = workspace_id);

create policy ai_intelligence_results_update
  on public.ai_intelligence_results as permissive
  for update to public
  using  ((select current_workspace_id()) = workspace_id)
  with check ((select current_workspace_id()) = workspace_id);

create policy ai_intelligence_results_delete
  on public.ai_intelligence_results as permissive
  for delete to public
  using ((select current_workspace_id()) = workspace_id);

-- Trigger updated_at
do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_updated_at_ai_intelligence_results'
  ) then
    create trigger set_updated_at_ai_intelligence_results
      before update on public.ai_intelligence_results
      for each row execute function public.set_updated_at();
  end if;
end $$;


-- ------------------------------------------------------------
--  4. TABLE : ai_intelligence_logs
--     Une ligne = événement technique ou métier.
--     Pas de updated_at (append-only).
-- ------------------------------------------------------------

create table if not exists public.ai_intelligence_logs (
  id                   uuid        primary key default gen_random_uuid(),

  workspace_id         uuid        not null default current_workspace_id(),
  company_id           uuid        null references public.companies(id)
                                     on delete cascade,
  run_id               uuid        null references public.ai_intelligence_runs(id)
                                     on delete cascade,
  result_id            uuid        null references public.ai_intelligence_results(id)
                                     on delete set null,

  phase                smallint    null,
  action               text        not null,
  status               text        not null default 'success',

  message              text        null,
  error_message        text        null,

  model_provider       text        null,
  model_used           text        null,
  tokens_input         integer     null,
  tokens_output        integer     null,
  cost_estimate        numeric     null,
  duration_ms          integer     null,

  metadata             jsonb       not null default '{}'::jsonb,

  created_at           timestamptz not null default now(),

  constraint ai_intelligence_logs_status_check
    check (status in ('success', 'warning', 'error', 'retry', 'cancelled'))
);

-- Indexes
create index if not exists ai_intelligence_logs_workspace_id_idx
  on public.ai_intelligence_logs (workspace_id);

create index if not exists ai_intelligence_logs_run_id_idx
  on public.ai_intelligence_logs (run_id);

create index if not exists ai_intelligence_logs_company_id_idx
  on public.ai_intelligence_logs (company_id);

-- Index partiel : erreurs récentes (les plus consultées)
create index if not exists ai_intelligence_logs_errors_idx
  on public.ai_intelligence_logs (run_id, created_at desc)
  where status = 'error';

-- RLS
alter table public.ai_intelligence_logs enable row level security;

create policy ai_intelligence_logs_select
  on public.ai_intelligence_logs as permissive
  for select to public
  using ((select current_workspace_id()) = workspace_id);

create policy ai_intelligence_logs_insert
  on public.ai_intelligence_logs as permissive
  for insert to public
  with check ((select current_workspace_id()) = workspace_id);

-- Logs = append-only : pas de policy update/delete côté client
-- (le service-role peut écrire sans RLS)


-- ------------------------------------------------------------
--  5. VUE : v_ai_intelligence_summary
--     Par compte : présence par phase, dernier statut, compteurs.
--     security_invoker = true → le RLS du compte appelant s'applique,
--     pas celui du définisseur. Essentiel en multi-tenant.
-- ------------------------------------------------------------

create or replace view public.v_ai_intelligence_summary
  with (security_invoker = true)
as
select
  c.id                                                        as company_id,
  c.name                                                      as company_name,
  c.sector,
  c.priority,
  c.ai_score,

  -- Présence par phase (dans les tables dédiées)
  bool_or(r.phase = 1 and r.status = 'succeeded')            as has_client_analysis,
  bool_or(r.phase = 2 and r.status = 'succeeded')            as has_sector_analysis,
  bool_or(r.phase = 3 and r.status = 'succeeded')            as has_process_diagnostic,
  bool_or(r.phase = 4 and r.status = 'succeeded')            as has_roadmap,

  -- Fallback : données importées depuis FOLIO (metadata)
  (c.metadata ? 'analysis_data')                             as has_legacy_analysis,
  (c.metadata ? 'sector_analysis')                           as has_legacy_sector,
  (c.metadata ? 'pitches')                                   as has_legacy_pitches,

  -- Dernier run
  max(run.created_at)                                        as latest_run_at,
  (array_agg(run.status order by run.created_at desc))[1]    as latest_run_status,

  -- Compteurs
  count(distinct run.id)                                     as count_runs,
  count(distinct r.id)                                       as count_results

from public.companies c
left join public.ai_intelligence_runs   run on run.company_id = c.id
left join public.ai_intelligence_results r  on r.company_id  = c.id
                                            and r.status = 'succeeded'
group by c.id, c.name, c.sector, c.priority, c.ai_score, c.metadata;
