-- Lot 1 financial modeling persistence
-- Snapshots only. The canonical calculations remain in TypeScript.

begin;

create table if not exists public.financial_models (
  id                           uuid primary key default gen_random_uuid(),
  workspace_id                 uuid not null default private.current_workspace_id()
                                 references public.workspaces(id) on delete cascade,

  title                        text not null,
  mode                         text not null,
  status                       text not null default 'draft',
  calculation_version          integer not null,
  currency                     text not null default 'EUR',

  resource_type                text not null,
  resource_cost_model          text not null,
  collaborator_id              uuid,
  candidate_id                 uuid,
  resource_label               text not null,

  job_profile_id               uuid,
  profile_name_snapshot        text,
  seniority_snapshot           text,
  employment_status_snapshot   text,
  location_snapshot            text,

  gross_annual_snapshot        numeric(12,2),
  variable_pay_snapshot        numeric(12,2),
  charges_rate_snapshot        numeric(5,4),
  annual_working_days_snapshot integer,
  external_daily_cost_snapshot numeric(10,2),
  external_fixed_cost_snapshot numeric(12,2),

  historical_activity_rate     numeric(5,4),
  forecast_activity_rate       numeric(5,4) not null,

  company_id                   uuid,
  opportunity_id               uuid,
  pricing_agreement_id         uuid,
  precedent_mission_id         uuid,
  precedent_opportunity_id     uuid,

  start_date                   date not null,
  end_date                     date,
  projection_end_date          date,
  projection_basis             text not null,
  manual_business_days         numeric(8,2),

  business_days                numeric(8,2) not null,
  production_days              numeric(8,2) not null,
  sale_daily_rate              numeric(10,2) not null,

  annual_employer_cost         numeric(12,2),
  base_daily_cost              numeric(10,2),
  productive_daily_cost        numeric(10,2),

  resource_cost_total          numeric(12,2) not null,
  salary_cost_total            numeric(12,2),
  expenses_total               numeric(12,2) not null,
  total_costs                  numeric(12,2) not null,
  revenue_total                numeric(12,2) not null,
  daily_margin_amount          numeric(10,2),
  gross_margin_amount          numeric(12,2) not null,
  gross_margin_pct             numeric(7,2),
  acv                          numeric(12,2) not null,
  tcv                          numeric(12,2) not null,

  warnings                     jsonb not null default '[]'::jsonb,
  assumptions                  jsonb not null default '{}'::jsonb,

  created_by                   uuid references public.profiles(id) on delete set null,
  validated_by                 uuid references public.profiles(id) on delete set null,
  validated_at                 timestamptz,
  converted_at                 timestamptz,

  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),

  constraint uq_financial_models_id_workspace
    unique (id, workspace_id),
  constraint financial_models_title_not_blank
    check (length(trim(title)) > 0),
  constraint financial_models_resource_label_not_blank
    check (length(trim(resource_label)) > 0),
  constraint financial_models_mode_check
    check (mode in ('flash', 'full')),
  constraint financial_models_status_check
    check (status in ('draft', 'validated', 'converted', 'archived')),
  constraint financial_models_resource_type_check
    check (resource_type in ('collaborator', 'candidate', 'external')),
  constraint financial_models_resource_cost_model_check
    check (resource_cost_model in ('salaried', 'subcontractor_daily_rate', 'fixed_external_cost')),
  constraint financial_models_projection_basis_check
    check (projection_basis in ('explicit_end_date', 'year_end_default', 'manual_business_days')),
  constraint financial_models_calculation_version_check
    check (calculation_version > 0),
  constraint financial_models_forecast_activity_rate_check
    check (forecast_activity_rate > 0 and forecast_activity_rate <= 1),
  constraint financial_models_historical_activity_rate_check
    check (
      historical_activity_rate is null
      or (historical_activity_rate > 0 and historical_activity_rate <= 1)
    ),
  constraint financial_models_period_check
    check (end_date is null or end_date >= start_date),
  constraint financial_models_projection_end_date_check
    check (projection_end_date is null or projection_end_date >= start_date),
  constraint financial_models_manual_business_days_check
    check (manual_business_days is null or manual_business_days >= 0),
  constraint financial_models_amounts_non_negative_check
    check (
      (gross_annual_snapshot is null or gross_annual_snapshot >= 0)
      and (variable_pay_snapshot is null or variable_pay_snapshot >= 0)
      and (charges_rate_snapshot is null or charges_rate_snapshot >= 0)
      and (annual_working_days_snapshot is null or annual_working_days_snapshot > 0)
      and (external_daily_cost_snapshot is null or external_daily_cost_snapshot >= 0)
      and (external_fixed_cost_snapshot is null or external_fixed_cost_snapshot >= 0)
      and business_days >= 0
      and production_days >= 0
      and sale_daily_rate >= 0
      and (annual_employer_cost is null or annual_employer_cost >= 0)
      and (base_daily_cost is null or base_daily_cost >= 0)
      and (productive_daily_cost is null or productive_daily_cost >= 0)
      and resource_cost_total >= 0
      and (salary_cost_total is null or salary_cost_total >= 0)
      and expenses_total >= 0
      and total_costs >= 0
      and revenue_total >= 0
      and acv >= 0
      and tcv >= 0
    ),
  constraint financial_models_warnings_is_array_check
    check (jsonb_typeof(warnings) = 'array'),
  constraint financial_models_assumptions_is_object_check
    check (jsonb_typeof(assumptions) = 'object'),
  constraint financial_models_resource_reference_check
    check (
      (resource_type = 'collaborator' and collaborator_id is not null and candidate_id is null)
      or (resource_type = 'candidate' and candidate_id is not null and collaborator_id is null)
      or (resource_type = 'external' and collaborator_id is null and candidate_id is null)
    ),
  constraint financial_models_complete_when_not_draft_check
    check (
      status = 'draft'
      or (
        projection_end_date is not null
        and (
          (
            resource_cost_model = 'salaried'
            and gross_annual_snapshot is not null
            and variable_pay_snapshot is not null
            and charges_rate_snapshot is not null
            and annual_working_days_snapshot is not null
            and annual_employer_cost is not null
            and base_daily_cost is not null
            and productive_daily_cost is not null
            and salary_cost_total is not null
            and external_daily_cost_snapshot is null
            and external_fixed_cost_snapshot is null
          )
          or (
            resource_cost_model = 'subcontractor_daily_rate'
            and external_daily_cost_snapshot is not null
            and external_fixed_cost_snapshot is null
            and gross_annual_snapshot is null
            and charges_rate_snapshot is null
            and annual_working_days_snapshot is null
            and annual_employer_cost is null
            and base_daily_cost is null
            and productive_daily_cost is null
            and salary_cost_total is null
          )
          or (
            resource_cost_model = 'fixed_external_cost'
            and external_fixed_cost_snapshot is not null
            and external_daily_cost_snapshot is null
            and gross_annual_snapshot is null
            and charges_rate_snapshot is null
            and annual_working_days_snapshot is null
            and annual_employer_cost is null
            and base_daily_cost is null
            and productive_daily_cost is null
            and salary_cost_total is null
          )
        )
      )
    )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_models_collaborator_workspace_fkey'
      and conrelid = 'public.financial_models'::regclass
  ) then
    alter table public.financial_models
      add constraint financial_models_collaborator_workspace_fkey
      foreign key (collaborator_id, workspace_id)
      references public.collaborators (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_models_candidate_workspace_fkey'
      and conrelid = 'public.financial_models'::regclass
  ) then
    alter table public.financial_models
      add constraint financial_models_candidate_workspace_fkey
      foreign key (candidate_id, workspace_id)
      references public.candidates (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_models_company_workspace_fkey'
      and conrelid = 'public.financial_models'::regclass
  ) then
    alter table public.financial_models
      add constraint financial_models_company_workspace_fkey
      foreign key (company_id, workspace_id)
      references public.companies (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_models_opportunity_workspace_fkey'
      and conrelid = 'public.financial_models'::regclass
  ) then
    alter table public.financial_models
      add constraint financial_models_opportunity_workspace_fkey
      foreign key (opportunity_id, workspace_id)
      references public.opportunities (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_models_pricing_agreement_workspace_fkey'
      and conrelid = 'public.financial_models'::regclass
  ) then
    alter table public.financial_models
      add constraint financial_models_pricing_agreement_workspace_fkey
      foreign key (pricing_agreement_id, workspace_id)
      references public.client_pricing_agreements (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_models_precedent_mission_workspace_fkey'
      and conrelid = 'public.financial_models'::regclass
  ) then
    alter table public.financial_models
      add constraint financial_models_precedent_mission_workspace_fkey
      foreign key (precedent_mission_id, workspace_id)
      references public.missions (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_models_precedent_opportunity_workspace_fkey'
      and conrelid = 'public.financial_models'::regclass
  ) then
    alter table public.financial_models
      add constraint financial_models_precedent_opportunity_workspace_fkey
      foreign key (precedent_opportunity_id, workspace_id)
      references public.opportunities (id, workspace_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_models_job_profile_workspace_fkey'
      and conrelid = 'public.financial_models'::regclass
  ) then
    alter table public.financial_models
      add constraint financial_models_job_profile_workspace_fkey
      foreign key (job_profile_id, workspace_id)
      references public.job_profiles (id, workspace_id);
  end if;
end
$$;

comment on table public.financial_models is
  'Snapshot persistence for the Assistance Technique financial modeling module. The stored values are outputs of the TypeScript engine, not generated in SQL.';

comment on column public.financial_models.warnings is
  'Non-blocking warnings emitted by the TypeScript engine, stored as a JSON array snapshot.';

comment on column public.financial_models.assumptions is
  'Structured assumptions and reference provenance used to produce the financial model snapshot.';

create index if not exists idx_financial_models_workspace
  on public.financial_models (workspace_id);

create index if not exists idx_financial_models_status
  on public.financial_models (workspace_id, status);

create index if not exists idx_financial_models_created_at
  on public.financial_models (workspace_id, created_at desc);

create index if not exists idx_financial_models_company
  on public.financial_models (company_id)
  where company_id is not null;

create index if not exists idx_financial_models_opportunity
  on public.financial_models (opportunity_id)
  where opportunity_id is not null;

create index if not exists idx_financial_models_collaborator
  on public.financial_models (collaborator_id)
  where collaborator_id is not null;

create index if not exists idx_financial_models_candidate
  on public.financial_models (candidate_id)
  where candidate_id is not null;

create index if not exists idx_financial_models_pricing_agreement
  on public.financial_models (pricing_agreement_id)
  where pricing_agreement_id is not null;

create table if not exists public.financial_model_expenses (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null default private.current_workspace_id()
                          references public.workspaces(id) on delete cascade,
  financial_model_id    uuid not null,
  category              text,
  label                 text not null,
  calculation_mode      text not null,
  unit_amount           numeric(12,2) not null,
  quantity              numeric(10,2) not null default 1,
  total_amount_snapshot numeric(12,2) not null,
  notes                 text,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint uq_financial_model_expenses_id_workspace
    unique (id, workspace_id),
  constraint financial_model_expenses_label_not_blank
    check (length(trim(label)) > 0),
  constraint financial_model_expenses_calculation_mode_check
    check (calculation_mode in ('fixed', 'per_business_day', 'per_production_day', 'monthly', 'annual')),
  constraint financial_model_expenses_non_negative_check
    check (
      unit_amount >= 0
      and quantity >= 0
      and total_amount_snapshot >= 0
    )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_model_expenses_model_workspace_fkey'
      and conrelid = 'public.financial_model_expenses'::regclass
  ) then
    alter table public.financial_model_expenses
      add constraint financial_model_expenses_model_workspace_fkey
      foreign key (financial_model_id, workspace_id)
      references public.financial_models (id, workspace_id)
      on delete cascade;
  end if;
end
$$;

comment on table public.financial_model_expenses is
  'Expense-line snapshots attached to a financial model. Totals are computed in TypeScript and stored as immutable outputs.';

create index if not exists idx_financial_model_expenses_workspace
  on public.financial_model_expenses (workspace_id);

create index if not exists idx_financial_model_expenses_financial_model
  on public.financial_model_expenses (financial_model_id);

create trigger trg_financial_models_updated_at
  before update on public.financial_models
  for each row execute function private.set_updated_at();

create trigger trg_financial_models_audit
  after insert or update or delete on public.financial_models
  for each row execute function private.log_audit();

create trigger trg_financial_model_expenses_updated_at
  before update on public.financial_model_expenses
  for each row execute function private.set_updated_at();

create trigger trg_financial_model_expenses_audit
  after insert or update or delete on public.financial_model_expenses
  for each row execute function private.log_audit();

alter table public.financial_models enable row level security;
alter table public.financial_model_expenses enable row level security;

create policy financial_models_select_admin on public.financial_models
  for select using (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  );

create policy financial_models_insert_admin on public.financial_models
  for insert with check (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  );

create policy financial_models_update_admin on public.financial_models
  for update using (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  )
  with check (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  );

create policy financial_models_delete_admin on public.financial_models
  for delete using (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  );

create policy financial_model_expenses_select_admin on public.financial_model_expenses
  for select using (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  );

create policy financial_model_expenses_insert_admin on public.financial_model_expenses
  for insert with check (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  );

create policy financial_model_expenses_update_admin on public.financial_model_expenses
  for update using (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  )
  with check (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  );

create policy financial_model_expenses_delete_admin on public.financial_model_expenses
  for delete using (
    workspace_id = private.current_workspace_id()
    and public.is_workspace_admin()
  );

grant select, insert, update, delete on public.financial_models to authenticated;
grant select, insert, update, delete on public.financial_model_expenses to authenticated;

commit;
