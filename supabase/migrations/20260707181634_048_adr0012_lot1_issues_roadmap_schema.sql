-- ADR-0012 Lot 1 — Contrats & spine de données de la chaîne de décision commerciale.
--
-- Deux tables normalisées (D-5) : contrairement aux artefacts de génération
-- (account_knowledge, sector_snapshot, commercial_strategy... stockés en
-- content_json, cf. ai_intelligence_results), les enjeux et les actions de
-- roadmap sont des ENTITÉS OPÉRATIONNELLES : mutées ligne à ligne (le manager
-- corrige/écarte/valide), requêtées transversalement (scoring, weekly brief).
-- Contrairement aux tables account_score_* (ADR-0011, append-only), celles-ci
-- ONT `updated_at` + trigger set_updated_at + log_audit : ce sont des lignes
-- vivantes, pas un historique de runs.
--
-- Aucune génération LLM dans ce lot : tables vides, contrats seulement.
--
-- Version réellement appliquée : 20260707181634 (Supabase utilise le timestamp
-- comme clé, pas le nom — cf. project-migration-drift).

-- ─── Enum partagé : provenance (D-3) ────────────────────────────────────────
-- Porté par tout fait/enjeu/action produit par la chaîne de décision. Rend la
-- confiance explicite plutôt que de simuler une traçabilité qu'on n'a pas.
create type public.intelligence_provenance as enum (
  'relational',       -- issu du relationnel KREDO (contact/opp/mission/interaction)
  'human_verified',   -- saisi ou confirmé par le manager
  'engine_researched', -- recherche n8n avec URL + date
  'folio_legacy',      -- import FOLIO 2026-06-09, sans source
  'inferred'           -- déduction LLM non sourcée
);

comment on type public.intelligence_provenance is
  'ADR-0012 D-3 : niveau de confiance explicite. folio_legacy et inferred ne doivent jamais être présentés en UI comme une vérité moteur.';

-- ─── account_issues (étape 3 — Cartographie des enjeux) ─────────────────────

create type public.account_issue_category as enum (
  'business', 'it', 'data', 'cloud', 'cyber', 'delivery', 'regulatory', 'people'
);

create type public.account_issue_evidence_level as enum ('observed', 'inferred', 'weak');

create type public.account_issue_status as enum ('open', 'dismissed', 'converted');

create table public.account_issues (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default private.current_workspace_id() references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,

  title text not null,
  category public.account_issue_category not null,
  problem_statement text not null,

  evidence_level public.account_issue_evidence_level not null default 'weak',
  provenance public.intelligence_provenance not null,
  source_refs jsonb not null default '[]'::jsonb,

  importance smallint not null check (importance between 1 and 5),
  urgency smallint not null check (urgency between 1 and 5),
  criticality smallint not null check (criticality between 1 and 5),
  business_impact smallint not null check (business_impact between 1 and 5),
  accessibility smallint not null check (accessibility between 1 and 5),
  kredo_fit smallint not null check (kredo_fit between 1 and 5),

  contact_ids uuid[] not null default '{}'::uuid[],
  recommended_next_probe text,

  status public.account_issue_status not null default 'open',
  generated_by_run_id uuid references public.ai_intelligence_runs(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.account_issues is
  'ADR-0012 Lot 4 (génération) / Lot 1 (schéma) : enjeux priorisés par compte. Table normalisée (D-5) car mutée ligne à ligne (curation D-4) et lue transversalement (scoring C3, weekly brief).';

create index idx_account_issues_company_status on public.account_issues (workspace_id, company_id, status);
create index idx_account_issues_run on public.account_issues (generated_by_run_id) where generated_by_run_id is not null;

alter table public.account_issues enable row level security;

create policy account_issues_select on public.account_issues
  for select using (workspace_id = private.current_workspace_id());
create policy account_issues_insert on public.account_issues
  for insert with check (true);
create policy account_issues_update on public.account_issues
  for update using (workspace_id = private.current_workspace_id());
create policy account_issues_delete on public.account_issues
  for delete using (workspace_id = private.current_workspace_id());

create trigger trg_account_issues_updated_at
  before update on public.account_issues
  for each row execute function private.set_updated_at();

create trigger trg_audit_account_issues
  after insert or update or delete on public.account_issues
  for each row execute function private.log_audit();

create function private.validate_account_issue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_workspace uuid;
  v_run_workspace uuid;
begin
  select workspace_id into v_company_workspace from public.companies where id = new.company_id;

  if v_company_workspace is null then
    raise exception 'Invalid issue company: %', new.company_id;
  end if;

  if new.workspace_id <> v_company_workspace then
    raise exception 'Workspace mismatch between issue and company';
  end if;

  if new.generated_by_run_id is not null then
    select workspace_id into v_run_workspace from public.ai_intelligence_runs where id = new.generated_by_run_id;

    if v_run_workspace is null or v_run_workspace <> new.workspace_id then
      raise exception 'Workspace mismatch between issue and generating run';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validate_account_issues
  before insert or update on public.account_issues
  for each row execute function private.validate_account_issue();

-- ─── account_roadmap_actions (étape 5 — Roadmap commerciale) ───────────────
-- Draft avant matérialisation (D-2 de l'ADR / garde-fou "IA propose, manager
-- valide, KREDO matérialise"). action_type = cible de matérialisation (D-7 /
-- Lot 7), pas la nature métier fine (relance/appel/RDV vivent dans title).

create type public.account_roadmap_action_type as enum ('task', 'calendar_event', 'campaign', 'opportunity');

create type public.account_roadmap_action_status as enum ('draft', 'validated', 'dismissed', 'materialized', 'done');

create table public.account_roadmap_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default private.current_workspace_id() references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  issue_id uuid references public.account_issues(id) on delete set null,

  title text not null,
  description text,
  action_type public.account_roadmap_action_type not null,
  status public.account_roadmap_action_status not null default 'draft',

  target_contact_id uuid references public.contacts(id) on delete set null,
  due_date date,
  sequence_order smallint,

  materialized_task_id uuid references public.tasks(id) on delete set null,
  materialized_calendar_event_id uuid references public.calendar_events(id) on delete set null,
  materialized_opportunity_id uuid references public.opportunities(id) on delete set null,

  provenance public.intelligence_provenance not null,
  source_refs jsonb not null default '[]'::jsonb,
  generated_by_run_id uuid references public.ai_intelligence_runs(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.account_roadmap_actions is
  'ADR-0012 Lot 6 (génération) / Lot 1 (schéma) : plan d''actions draft par compte. Matérialisation (écriture tasks/calendar_events/opportunities) strictement gated Lot 7 — jamais automatique (D-2).';

create index idx_account_roadmap_actions_company_status on public.account_roadmap_actions (workspace_id, company_id, status);
create index idx_account_roadmap_actions_issue on public.account_roadmap_actions (issue_id) where issue_id is not null;
create index idx_account_roadmap_actions_run on public.account_roadmap_actions (generated_by_run_id) where generated_by_run_id is not null;

alter table public.account_roadmap_actions enable row level security;

create policy account_roadmap_actions_select on public.account_roadmap_actions
  for select using (workspace_id = private.current_workspace_id());
create policy account_roadmap_actions_insert on public.account_roadmap_actions
  for insert with check (true);
create policy account_roadmap_actions_update on public.account_roadmap_actions
  for update using (workspace_id = private.current_workspace_id());
create policy account_roadmap_actions_delete on public.account_roadmap_actions
  for delete using (workspace_id = private.current_workspace_id());

create trigger trg_account_roadmap_actions_updated_at
  before update on public.account_roadmap_actions
  for each row execute function private.set_updated_at();

create trigger trg_audit_account_roadmap_actions
  after insert or update or delete on public.account_roadmap_actions
  for each row execute function private.log_audit();

create function private.validate_account_roadmap_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_workspace uuid;
  v_issue_workspace uuid;
  v_contact_workspace uuid;
  v_run_workspace uuid;
begin
  select workspace_id into v_company_workspace from public.companies where id = new.company_id;

  if v_company_workspace is null then
    raise exception 'Invalid roadmap action company: %', new.company_id;
  end if;

  if new.workspace_id <> v_company_workspace then
    raise exception 'Workspace mismatch between roadmap action and company';
  end if;

  if new.issue_id is not null then
    select workspace_id into v_issue_workspace from public.account_issues where id = new.issue_id;

    if v_issue_workspace is null or v_issue_workspace <> new.workspace_id then
      raise exception 'Workspace mismatch between roadmap action and issue';
    end if;
  end if;

  if new.target_contact_id is not null then
    select workspace_id into v_contact_workspace from public.contacts where id = new.target_contact_id;

    if v_contact_workspace is null or v_contact_workspace <> new.workspace_id then
      raise exception 'Workspace mismatch between roadmap action and target contact';
    end if;
  end if;

  if new.generated_by_run_id is not null then
    select workspace_id into v_run_workspace from public.ai_intelligence_runs where id = new.generated_by_run_id;

    if v_run_workspace is null or v_run_workspace <> new.workspace_id then
      raise exception 'Workspace mismatch between roadmap action and generating run';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validate_account_roadmap_actions
  before insert or update on public.account_roadmap_actions
  for each row execute function private.validate_account_roadmap_action();
