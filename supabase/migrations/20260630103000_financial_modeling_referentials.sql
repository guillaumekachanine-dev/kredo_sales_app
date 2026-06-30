-- Lot 1 financial modeling referentials
-- Additive schema only. The TypeScript engine remains the source of truth
-- for financial calculations; PostgreSQL stores references, snapshots, and
-- traceability.

begin;

-- Composite uniqueness helpers for strict multi-workspace foreign keys.
create unique index if not exists uq_profiles_id_workspace
  on public.profiles (id, workspace_id);

create unique index if not exists uq_collaborators_id_workspace
  on public.collaborators (id, workspace_id);

create unique index if not exists uq_candidates_id_workspace
  on public.candidates (id, workspace_id);

create unique index if not exists uq_companies_id_workspace
  on public.companies (id, workspace_id);

create unique index if not exists uq_opportunities_id_workspace
  on public.opportunities (id, workspace_id);

create unique index if not exists uq_missions_id_workspace
  on public.missions (id, workspace_id);

create unique index if not exists uq_job_profiles_id_workspace
  on public.job_profiles (id, workspace_id);

create unique index if not exists uq_offer_engagement_types_id_workspace
  on public.offer_engagement_types (id, workspace_id);

-- Minimal normalization hooks for financial modeling inputs.
alter table public.collaborators
  add column if not exists job_profile_id uuid,
  add column if not exists employment_status text;

alter table public.candidates
  add column if not exists job_profile_id uuid,
  add column if not exists cost_model text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'collaborators_employment_status_check'
      and conrelid = 'public.collaborators'::regclass
  ) then
    alter table public.collaborators
      add constraint collaborators_employment_status_check
      check (
        employment_status is null
        or employment_status in ('technicien', 'cadre', 'external', 'other')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidates_cost_model_check'
      and conrelid = 'public.candidates'::regclass
  ) then
    alter table public.candidates
      add constraint candidates_cost_model_check
      check (
        cost_model is null
        or cost_model in ('salaried', 'subcontractor_daily_rate', 'fixed_external_cost')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'collaborators_job_profile_workspace_fkey'
      and conrelid = 'public.collaborators'::regclass
  ) then
    alter table public.collaborators
      add constraint collaborators_job_profile_workspace_fkey
      foreign key (job_profile_id, workspace_id)
      references public.job_profiles (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidates_job_profile_workspace_fkey'
      and conrelid = 'public.candidates'::regclass
  ) then
    alter table public.candidates
      add constraint candidates_job_profile_workspace_fkey
      foreign key (job_profile_id, workspace_id)
      references public.job_profiles (id, workspace_id);
  end if;
end
$$;

create index if not exists idx_collaborators_job_profile_id
  on public.collaborators (job_profile_id)
  where job_profile_id is not null;

create index if not exists idx_candidates_job_profile_id
  on public.candidates (job_profile_id)
  where job_profile_id is not null;

comment on column public.collaborators.job_profile_id is
  'Optional job profile reference used to hydrate the financial modeling engine without fuzzy matching.';

comment on column public.collaborators.employment_status is
  'Employment status used to select workspace charge-rate assumptions for financial modeling.';

comment on column public.candidates.job_profile_id is
  'Optional job profile reference used to connect a candidate to pricing and financial referentials.';

comment on column public.candidates.cost_model is
  'Optional cost model hint for future financial modeling (salaried, subcontractor_daily_rate, fixed_external_cost).';

-- Workspace-level financial assumptions.
create table if not exists public.financial_assumption_sets (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null default private.current_workspace_id()
                          references public.workspaces(id) on delete cascade,
  name                  text not null,
  country_code          text not null default 'FR',
  currency              text not null default 'EUR',
  valid_from            date not null,
  valid_to              date,
  default_activity_rate numeric(5,4) not null,
  default_working_days  integer not null,
  is_default            boolean not null default false,
  notes                 text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint financial_assumption_sets_period_check
    check (valid_to is null or valid_to >= valid_from),
  constraint financial_assumption_sets_activity_rate_check
    check (default_activity_rate > 0 and default_activity_rate <= 1),
  constraint financial_assumption_sets_working_days_check
    check (default_working_days > 0),
  constraint financial_assumption_sets_name_not_blank
    check (length(trim(name)) > 0),
  constraint financial_assumption_sets_country_code_not_blank
    check (length(trim(country_code)) > 0),
  constraint financial_assumption_sets_currency_not_blank
    check (length(trim(currency)) > 0),
  constraint uq_financial_assumption_sets_id_workspace
    unique (id, workspace_id)
);

comment on table public.financial_assumption_sets is
  'Workspace-scoped financial assumption sets used to choose explicit defaults for the financial modeling engine.';

comment on column public.financial_assumption_sets.default_activity_rate is
  'Default forecast activity rate fallback for future simulations. Stored as a fraction between 0 and 1.';

comment on column public.financial_assumption_sets.default_working_days is
  'Default reference working days per year for financial modeling.';

create unique index if not exists uq_financial_assumption_sets_default_active
  on public.financial_assumption_sets (workspace_id)
  where is_default and valid_to is null;

create index if not exists idx_financial_assumption_sets_workspace
  on public.financial_assumption_sets (workspace_id);

create index if not exists idx_financial_assumption_sets_validity
  on public.financial_assumption_sets (workspace_id, valid_from, valid_to);

create table if not exists public.financial_charge_rates (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null default private.current_workspace_id()
                      references public.workspaces(id) on delete cascade,
  assumption_set_id uuid not null,
  employment_status text not null,
  charges_rate      numeric(5,4) not null,
  source            text not null,
  is_estimate       boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint financial_charge_rates_charges_rate_check
    check (charges_rate >= 0),
  constraint financial_charge_rates_employment_status_check
    check (employment_status in ('technicien', 'cadre', 'external', 'other')),
  constraint uq_financial_charge_rates_assumption_status
    unique (assumption_set_id, employment_status),
  constraint uq_financial_charge_rates_id_workspace
    unique (id, workspace_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_charge_rates_assumption_set_workspace_fkey'
      and conrelid = 'public.financial_charge_rates'::regclass
  ) then
    alter table public.financial_charge_rates
      add constraint financial_charge_rates_assumption_set_workspace_fkey
      foreign key (assumption_set_id, workspace_id)
      references public.financial_assumption_sets (id, workspace_id)
      on delete cascade;
  end if;
end
$$;

comment on table public.financial_charge_rates is
  'Charge-rate referential attached to a financial assumption set. Values may remain estimated until an explicit HR/finance source is provided.';

comment on column public.financial_charge_rates.source is
  'Business provenance of the charge-rate line, for example legacy_compensation_default.';

create index if not exists idx_financial_charge_rates_workspace
  on public.financial_charge_rates (workspace_id);

create index if not exists idx_financial_charge_rates_assumption_set
  on public.financial_charge_rates (assumption_set_id);

-- Client-specific pricing agreements, distinct from benchmark pricing grids.
create table if not exists public.client_pricing_agreements (
  id          uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default private.current_workspace_id()
                references public.workspaces(id) on delete cascade,
  company_id  uuid not null,
  name        text not null,
  status      text not null,
  currency    text not null default 'EUR',
  valid_from  date,
  valid_to    date,
  source      text,
  notes       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint client_pricing_agreements_status_check
    check (status in ('draft', 'active', 'expired', 'archived')),
  constraint client_pricing_agreements_period_check
    check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint client_pricing_agreements_name_not_blank
    check (length(trim(name)) > 0),
  constraint client_pricing_agreements_currency_not_blank
    check (length(trim(currency)) > 0),
  constraint uq_client_pricing_agreements_id_workspace
    unique (id, workspace_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_pricing_agreements_company_workspace_fkey'
      and conrelid = 'public.client_pricing_agreements'::regclass
  ) then
    alter table public.client_pricing_agreements
      add constraint client_pricing_agreements_company_workspace_fkey
      foreign key (company_id, workspace_id)
      references public.companies (id, workspace_id);
  end if;
end
$$;

comment on table public.client_pricing_agreements is
  'Client-specific pricing agreements. This table stores explicit commercial agreements and must not be confused with generic benchmark pricing grids.';

create index if not exists idx_client_pricing_agreements_workspace
  on public.client_pricing_agreements (workspace_id);

create index if not exists idx_client_pricing_agreements_company
  on public.client_pricing_agreements (company_id);

create index if not exists idx_client_pricing_agreements_company_status_dates
  on public.client_pricing_agreements (workspace_id, company_id, status, valid_from, valid_to);

create table if not exists public.client_pricing_agreement_lines (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null default private.current_workspace_id()
                        references public.workspaces(id) on delete cascade,
  agreement_id        uuid not null,
  job_profile_id      uuid,
  profile_name_snapshot text not null,
  seniority_level     text,
  location            text,
  engagement_type_id  uuid,
  tjm_min             numeric(10,2),
  tjm_recommended     numeric(10,2),
  tjm_max             numeric(10,2),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint client_pricing_agreement_lines_seniority_check
    check (
      seniority_level is null
      or seniority_level in ('junior', 'confirme', 'senior', 'expert', 'lead')
    ),
  constraint client_pricing_agreement_lines_tjm_positive_check
    check (
      (tjm_min is null or tjm_min >= 0)
      and (tjm_recommended is null or tjm_recommended >= 0)
      and (tjm_max is null or tjm_max >= 0)
    ),
  constraint client_pricing_agreement_lines_tjm_range_check
    check (tjm_max is null or tjm_min is null or tjm_max >= tjm_min),
  constraint client_pricing_agreement_lines_tjm_recommended_check
    check (
      tjm_recommended is null
      or (
        (tjm_min is null or tjm_recommended >= tjm_min)
        and (tjm_max is null or tjm_recommended <= tjm_max)
      )
    ),
  constraint client_pricing_agreement_lines_profile_name_not_blank
    check (length(trim(profile_name_snapshot)) > 0),
  constraint uq_client_pricing_agreement_lines_id_workspace
    unique (id, workspace_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_pricing_agreement_lines_agreement_workspace_fkey'
      and conrelid = 'public.client_pricing_agreement_lines'::regclass
  ) then
    alter table public.client_pricing_agreement_lines
      add constraint client_pricing_agreement_lines_agreement_workspace_fkey
      foreign key (agreement_id, workspace_id)
      references public.client_pricing_agreements (id, workspace_id)
      on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_pricing_agreement_lines_job_profile_workspace_fkey'
      and conrelid = 'public.client_pricing_agreement_lines'::regclass
  ) then
    alter table public.client_pricing_agreement_lines
      add constraint client_pricing_agreement_lines_job_profile_workspace_fkey
      foreign key (job_profile_id, workspace_id)
      references public.job_profiles (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_pricing_agreement_lines_engagement_type_workspace_fkey'
      and conrelid = 'public.client_pricing_agreement_lines'::regclass
  ) then
    alter table public.client_pricing_agreement_lines
      add constraint client_pricing_agreement_lines_engagement_type_workspace_fkey
      foreign key (engagement_type_id, workspace_id)
      references public.offer_engagement_types (id, workspace_id);
  end if;
end
$$;

comment on table public.client_pricing_agreement_lines is
  'Workspace-scoped pricing agreement lines used as contractual or quasi-contractual pricing anchors.';

create index if not exists idx_client_pricing_agreement_lines_workspace
  on public.client_pricing_agreement_lines (workspace_id);

create index if not exists idx_client_pricing_agreement_lines_agreement
  on public.client_pricing_agreement_lines (agreement_id);

create index if not exists idx_client_pricing_agreement_lines_job_profile
  on public.client_pricing_agreement_lines (job_profile_id)
  where job_profile_id is not null;

create index if not exists idx_client_pricing_agreement_lines_engagement_type
  on public.client_pricing_agreement_lines (engagement_type_id)
  where engagement_type_id is not null;

-- Triggers and audit.
create trigger trg_financial_assumption_sets_updated_at
  before update on public.financial_assumption_sets
  for each row execute function private.set_updated_at();

create trigger trg_financial_assumption_sets_audit
  after insert or update or delete on public.financial_assumption_sets
  for each row execute function private.log_audit();

create trigger trg_financial_charge_rates_updated_at
  before update on public.financial_charge_rates
  for each row execute function private.set_updated_at();

create trigger trg_financial_charge_rates_audit
  after insert or update or delete on public.financial_charge_rates
  for each row execute function private.log_audit();

create trigger trg_client_pricing_agreements_updated_at
  before update on public.client_pricing_agreements
  for each row execute function private.set_updated_at();

create trigger trg_client_pricing_agreements_audit
  after insert or update or delete on public.client_pricing_agreements
  for each row execute function private.log_audit();

create trigger trg_client_pricing_agreement_lines_updated_at
  before update on public.client_pricing_agreement_lines
  for each row execute function private.set_updated_at();

create trigger trg_client_pricing_agreement_lines_audit
  after insert or update or delete on public.client_pricing_agreement_lines
  for each row execute function private.log_audit();

-- RLS.
alter table public.financial_assumption_sets enable row level security;
alter table public.financial_charge_rates enable row level security;
alter table public.client_pricing_agreements enable row level security;
alter table public.client_pricing_agreement_lines enable row level security;

create policy financial_assumption_sets_select_admin on public.financial_assumption_sets
  for select using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy financial_assumption_sets_insert_admin on public.financial_assumption_sets
  for insert with check (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy financial_assumption_sets_update_admin on public.financial_assumption_sets
  for update using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  )
  with check (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy financial_assumption_sets_delete_admin on public.financial_assumption_sets
  for delete using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy financial_charge_rates_select_admin on public.financial_charge_rates
  for select using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy financial_charge_rates_insert_admin on public.financial_charge_rates
  for insert with check (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy financial_charge_rates_update_admin on public.financial_charge_rates
  for update using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  )
  with check (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy financial_charge_rates_delete_admin on public.financial_charge_rates
  for delete using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy client_pricing_agreements_select_admin on public.client_pricing_agreements
  for select using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy client_pricing_agreements_insert_admin on public.client_pricing_agreements
  for insert with check (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy client_pricing_agreements_update_admin on public.client_pricing_agreements
  for update using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  )
  with check (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy client_pricing_agreements_delete_admin on public.client_pricing_agreements
  for delete using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy client_pricing_agreement_lines_select_admin on public.client_pricing_agreement_lines
  for select using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy client_pricing_agreement_lines_insert_admin on public.client_pricing_agreement_lines
  for insert with check (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy client_pricing_agreement_lines_update_admin on public.client_pricing_agreement_lines
  for update using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  )
  with check (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

create policy client_pricing_agreement_lines_delete_admin on public.client_pricing_agreement_lines
  for delete using (
    workspace_id = private.current_workspace_id()
    and private.is_workspace_admin()
  );

grant select, insert, update, delete on public.financial_assumption_sets to authenticated;
grant select, insert, update, delete on public.financial_charge_rates to authenticated;
grant select, insert, update, delete on public.client_pricing_agreements to authenticated;
grant select, insert, update, delete on public.client_pricing_agreement_lines to authenticated;

-- Default referential bootstrap per workspace.
insert into public.financial_assumption_sets (
  workspace_id,
  name,
  country_code,
  currency,
  valid_from,
  default_activity_rate,
  default_working_days,
  is_default,
  notes,
  created_by
)
select
  w.id,
  'Assistance technique — Référence 2026',
  'FR',
  'EUR',
  date '2026-01-01',
  0.85,
  218,
  true,
  'Seeded from Lot 1. Default values are workspace assumptions and remain editable.',
  w.owner_id
from public.workspaces w
where not exists (
  select 1
  from public.financial_assumption_sets fas
  where fas.workspace_id = w.id
    and fas.is_default
    and fas.valid_to is null
);

insert into public.financial_charge_rates (
  workspace_id,
  assumption_set_id,
  employment_status,
  charges_rate,
  source,
  is_estimate,
  notes
)
select
  fas.workspace_id,
  fas.id,
  seeded.employment_status,
  0.45,
  'legacy_compensation_default',
  true,
  'Seeded from collaborator_compensation historical default. This is an editable estimate, not a legal truth.'
from public.financial_assumption_sets fas
cross join (
  values ('cadre'::text), ('technicien'::text)
) as seeded(employment_status)
where fas.name = 'Assistance technique — Référence 2026'
  and fas.valid_from = date '2026-01-01'
on conflict (assumption_set_id, employment_status) do nothing;

commit;
