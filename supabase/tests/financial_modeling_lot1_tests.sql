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

create or replace function pg_temp.assert_eq_text(p_actual text, p_expected text, p_message text)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'assertion_failed: % (actual=%, expected=%)', p_message, p_actual, p_expected;
  end if;
end;
$$;

create or replace function pg_temp.assert_eq_numeric(p_actual numeric, p_expected numeric, p_message text)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'assertion_failed: % (actual=%, expected=%)', p_message, p_actual, p_expected;
  end if;
end;
$$;

create or replace function pg_temp.expect_exception(
  p_sql text,
  p_expected_message text,
  p_context text,
  p_expected_sqlstate text default null
)
returns void
language plpgsql
as $$
declare
  v_state text;
  v_message text;
begin
  execute p_sql;

  raise exception 'assertion_failed: % (expected exception %)', p_context, p_expected_message;
exception
  when others then
    get stacked diagnostics
      v_state = returned_sqlstate,
      v_message = message_text;

    if p_expected_sqlstate is not null and v_state is distinct from p_expected_sqlstate then
      raise exception
        'assertion_failed: % (sqlstate %, expected %, message=%)',
        p_context,
        v_state,
        p_expected_sqlstate,
        v_message;
    end if;

    if position(p_expected_message in v_message) = 0 then
      raise exception
        'assertion_failed: % (message %, expected substring %)',
        p_context,
        v_message,
        p_expected_message;
    end if;
end;
$$;

create temp table pg_temp.financial_modeling_test_context (
  actor_id uuid not null,
  workspace_id uuid not null,
  practice_id uuid not null,
  other_workspace_id uuid not null,
  other_company_id uuid not null
) on commit drop;

insert into pg_temp.financial_modeling_test_context (
  actor_id,
  workspace_id,
  practice_id,
  other_workspace_id,
  other_company_id
)
select
  p.id,
  p.workspace_id,
  op.id,
  gen_random_uuid(),
  gen_random_uuid()
from public.profiles p
join public.offer_practices op
  on op.workspace_id = p.workspace_id
 and op.is_active = true
where p.workspace_id is not null
limit 1;

select pg_temp.assert_true(
  (select count(*) = 1 from pg_temp.financial_modeling_test_context),
  'A profile, workspace and practice are required for the financial modeling tests.'
);

grant select on pg_temp.financial_modeling_test_context to authenticated;

insert into public.workspaces (id, name, owner_id)
select
  other_workspace_id,
  'Other workspace for financial lot1 tests',
  actor_id
from pg_temp.financial_modeling_test_context;

insert into public.companies (id, workspace_id, owner_id, name)
select
  other_company_id,
  other_workspace_id,
  actor_id,
  'Other client'
from pg_temp.financial_modeling_test_context;

select set_config(
  'request.jwt.claim.sub',
  (select actor_id::text from pg_temp.financial_modeling_test_context),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
declare
  v_actor_id uuid := (select actor_id from pg_temp.financial_modeling_test_context);
  v_workspace_id uuid := (select workspace_id from pg_temp.financial_modeling_test_context);
  v_practice_id uuid := (select practice_id from pg_temp.financial_modeling_test_context);
  v_other_workspace_id uuid := (select other_workspace_id from pg_temp.financial_modeling_test_context);
  v_other_company_id uuid := (select other_company_id from pg_temp.financial_modeling_test_context);

  v_person_id uuid := gen_random_uuid();
  v_candidate_person_id uuid := gen_random_uuid();
  v_company_id uuid := gen_random_uuid();
  v_job_profile_id uuid := gen_random_uuid();
  v_collaborator_id uuid := gen_random_uuid();
  v_candidate_id uuid := gen_random_uuid();
  v_opportunity_id uuid := gen_random_uuid();
  v_precedent_opportunity_id uuid := gen_random_uuid();
  v_mission_id uuid := gen_random_uuid();

  v_agreement_id uuid;
  v_assumption_set_id uuid;
  v_draft_model_id uuid;
  v_expense_id uuid;

  v_anchor_types text[];
  v_updated_at_before timestamptz;
  v_updated_at_after timestamptz;
  v_view_count integer;
begin
  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relname = 'financial_assumption_sets'
    ),
    'financial_assumption_sets must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relname = 'financial_charge_rates'
    ),
    'financial_charge_rates must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relname = 'client_pricing_agreements'
    ),
    'client_pricing_agreements must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relname = 'client_pricing_agreement_lines'
    ),
    'client_pricing_agreement_lines must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relname = 'financial_models'
    ),
    'financial_models must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relname = 'financial_model_expenses'
    ),
    'financial_model_expenses must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_views
      where schemaname = 'public'
        and viewname = 'v_financial_model_collaborator_costs'
    ),
    'v_financial_model_collaborator_costs must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_views
      where schemaname = 'public'
        and viewname = 'v_financial_model_activity_rates'
    ),
    'v_financial_model_activity_rates must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_views
      where schemaname = 'public'
        and viewname = 'v_financial_model_pricing_anchors'
    ),
    'v_financial_model_pricing_anchors must exist.'
  );

  perform pg_temp.assert_true(
    (select relrowsecurity from pg_class where oid = 'public.financial_assumption_sets'::regclass),
    'RLS must be enabled on financial_assumption_sets.'
  );

  perform pg_temp.assert_true(
    (select relrowsecurity from pg_class where oid = 'public.financial_models'::regclass),
    'RLS must be enabled on financial_models.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'financial_models'
        and policyname = 'financial_models_select_admin'
    ),
    'financial_models_select_admin policy must exist.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'client_pricing_agreements'
        and policyname = 'client_pricing_agreements_select_admin'
    ),
    'client_pricing_agreements_select_admin policy must exist.'
  );

  perform pg_temp.assert_true(
    (
      select count(*)
      from public.financial_assumption_sets
      where workspace_id = v_workspace_id
        and is_default
        and valid_to is null
    ) = 1,
    'Each workspace must have exactly one active default assumption set.'
  );

  perform pg_temp.assert_true(
    (
      select count(*)
      from public.financial_charge_rates fcr
      join public.financial_assumption_sets fas
        on fas.id = fcr.assumption_set_id
       and fas.workspace_id = fcr.workspace_id
      where fas.workspace_id = v_workspace_id
        and fas.is_default
        and fcr.source = 'legacy_compensation_default'
        and fcr.employment_status in ('cadre', 'technicien')
    ) = 2,
    'The default seeded charge rates must exist for cadre and technicien.'
  );

  select id
    into v_assumption_set_id
  from public.financial_assumption_sets
  where workspace_id = v_workspace_id
    and is_default
    and valid_to is null
  limit 1;

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.financial_assumption_sets (
        workspace_id, name, valid_from, default_activity_rate, default_working_days, is_default
      ) values ('%1$s', 'Invalid zero rate', date '2026-01-01', 0, 218, false)
      $sql$,
      v_workspace_id
    ),
    'financial_assumption_sets_activity_rate_check',
    'default_activity_rate must reject zero',
    '23514'
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.financial_assumption_sets (
        workspace_id, name, valid_from, default_activity_rate, default_working_days, is_default
      ) values ('%1$s', 'Invalid >1 rate', date '2026-01-01', 1.1, 218, false)
      $sql$,
      v_workspace_id
    ),
    'financial_assumption_sets_activity_rate_check',
    'default_activity_rate must reject values above 1',
    '23514'
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.financial_charge_rates (
        workspace_id, assumption_set_id, employment_status, charges_rate, source
      ) values ('%1$s', '%2$s', 'cadre', -0.1, 'invalid')
      $sql$,
      v_workspace_id,
      v_assumption_set_id
    ),
    'financial_charge_rates_charges_rate_check',
    'charges_rate must reject negative values',
    '23514'
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.financial_assumption_sets (
        workspace_id, name, valid_from, valid_to, default_activity_rate, default_working_days, is_default
      ) values ('%1$s', 'Invalid period', date '2026-02-01', date '2026-01-01', 0.85, 218, false)
      $sql$,
      v_workspace_id
    ),
    'financial_assumption_sets_period_check',
    'Assumption periods must reject valid_to before valid_from',
    '23514'
  );

  insert into public.persons (id, workspace_id, first_name, last_name)
  values (v_person_id, v_workspace_id, 'Financial', 'Collaborator');

  insert into public.persons (id, workspace_id, first_name, last_name)
  values (v_candidate_person_id, v_workspace_id, 'Financial', 'Candidate');

  insert into public.companies (id, workspace_id, name)
  values (v_company_id, v_workspace_id, 'Client financier test');

  insert into public.job_profiles (
    id, workspace_id, practice_id, title, main_mission, responsibilities, tech_stack, kpis, version, source
  )
  values (
    v_job_profile_id,
    v_workspace_id,
    v_practice_id,
    'Financial Modeling Consultant',
    'Build financial models',
    array['Modeling']::text[],
    array['TypeScript']::text[],
    array['margin']::text[],
    'v1',
    'internal'
  );

  insert into public.collaborators (
    id, workspace_id, person_id, current_title, seniority, status, job_profile_id, employment_status
  )
  values (
    v_collaborator_id,
    v_workspace_id,
    v_person_id,
    'Financial Modeling Consultant',
    'senior',
    'actif',
    v_job_profile_id,
    'cadre'
  );

  insert into public.candidates (
    id, workspace_id, person_id, current_title, seniority, status, job_profile_id, cost_model, expected_salary, expected_daily_rate
  )
  values (
    v_candidate_id,
    v_workspace_id,
    v_candidate_person_id,
    'Financial Candidate',
    'Senior',
    'nouveau',
    v_job_profile_id,
    'subcontractor_daily_rate',
    58000,
    480
  );

  insert into public.opportunities (
    id, workspace_id, title, company_id, stage, priority, conviction, target_daily_rate, start_date, target_close_date, seniority, location
  )
  values (
    v_opportunity_id,
    v_workspace_id,
    'Opportunity anchor test',
    v_company_id,
    'qualification',
    'haute',
    70,
    700,
    date '2026-02-01',
    date '2026-03-31',
    'senior',
    'Paris'
  );

  insert into public.opportunities (
    id, workspace_id, title, company_id, stage, priority, conviction, target_daily_rate, start_date
  )
  values (
    v_precedent_opportunity_id,
    v_workspace_id,
    'Opportunity precedent test',
    v_company_id,
    'gagne',
    'normale',
    90,
    650,
    date '2026-01-15'
  );

  insert into public.missions (
    id, workspace_id, title, collaborator_id, company_id, opportunity_id, tjm, cjm, start_date, end_date, status, role_title, seniority
  )
  values (
    v_mission_id,
    v_workspace_id,
    'Mission anchor test',
    v_collaborator_id,
    v_company_id,
    v_opportunity_id,
    720,
    390,
    date '2026-01-01',
    date '2026-06-30',
    'active',
    'Financial Modeling Consultant',
    'senior'
  );

  insert into public.collaborator_compensation (
    workspace_id,
    collaborator_id,
    effective_from,
    gross_annual,
    charges_rate,
    working_days_per_year,
    taci,
    variable_pay,
    notes
  )
  values (
    v_workspace_id,
    v_collaborator_id,
    date '2026-01-01',
    50000,
    0.45,
    218,
    0.85,
    10000,
    'Financial modeling lot1 test compensation'
  );

  insert into public.mission_activity_reports (
    workspace_id,
    mission_id,
    collaborator_id,
    period_start,
    period_end,
    billable_days,
    business_days,
    non_billable_days,
    pto_days,
    sick_days,
    tjm_snapshot,
    cjm_snapshot,
    status
  )
  values
    (
      v_workspace_id,
      v_mission_id,
      v_collaborator_id,
      date '2026-01-01',
      date '2026-01-31',
      10,
      20,
      0,
      0,
      0,
      720,
      390,
      'validated'
    ),
    (
      v_workspace_id,
      v_mission_id,
      v_collaborator_id,
      date '2026-02-01',
      date '2026-02-28',
      15,
      20,
      0,
      0,
      0,
      720,
      390,
      'validated'
    ),
    (
      v_workspace_id,
      v_mission_id,
      v_collaborator_id,
      date '2026-03-01',
      date '2026-03-31',
      20,
      20,
      0,
      0,
      0,
      720,
      390,
      'draft'
    );

  insert into public.client_pricing_agreements (
    workspace_id,
    company_id,
    name,
    status,
    currency,
    valid_from,
    valid_to,
    source,
    created_by
  )
  values (
    v_workspace_id,
    v_company_id,
    'Accord client financier 2026',
    'active',
    'EUR',
    date '2026-01-01',
    date '2026-12-31',
    'email',
    v_actor_id
  )
  returning id into v_agreement_id;

  insert into public.client_pricing_agreement_lines (
    workspace_id,
    agreement_id,
    job_profile_id,
    profile_name_snapshot,
    seniority_level,
    location,
    engagement_type_id,
    tjm_min,
    tjm_recommended,
    tjm_max
  )
  values (
    v_workspace_id,
    v_agreement_id,
    v_job_profile_id,
    'Financial Modeling Consultant',
    'senior',
    'Paris',
    null,
    680,
    700,
    740
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.client_pricing_agreement_lines (
        workspace_id, agreement_id, profile_name_snapshot, tjm_min, tjm_recommended, tjm_max
      ) values ('%1$s', '%2$s', 'Bad range', 700, 760, 750)
      $sql$,
      v_workspace_id,
      v_agreement_id
    ),
    'client_pricing_agreement_lines_tjm_recommended_check',
    'Recommended TJM must stay inside its range',
    '23514'
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.client_pricing_agreements (
        workspace_id, company_id, name, status
      ) values ('%1$s', '%2$s', 'Cross workspace agreement', 'draft')
      $sql$,
      v_workspace_id,
      v_other_company_id
    ),
    'client_pricing_agreements_company_workspace_fkey',
    'Cross-workspace agreement links must be rejected',
    '23503'
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.financial_models (
        workspace_id, title, mode, status, calculation_version, currency,
        resource_type, resource_cost_model, resource_label,
        forecast_activity_rate, start_date, projection_end_date, projection_basis,
        business_days, production_days, sale_daily_rate,
        resource_cost_total, expenses_total, total_costs, revenue_total, gross_margin_amount, acv, tcv
      ) values (
        '%1$s', 'Validated but incomplete', 'full', 'validated', 1, 'EUR',
        'collaborator', 'salaried', 'Incomplete collaborator',
        0.85, date '2026-01-01', date '2026-12-31', 'explicit_end_date',
        218, 185.3, 600,
        72500, 0, 72500, 111180, 38680, 111180, 111180
      )
      $sql$,
      v_workspace_id
    ),
    'financial_models_complete_when_not_draft_check',
    'Validated models must be complete for their cost model',
    '23514'
  );

  insert into public.financial_models (
    workspace_id, title, mode, status, calculation_version, currency,
    resource_type, resource_cost_model, collaborator_id, resource_label,
    company_id, opportunity_id,
    forecast_activity_rate, start_date, projection_end_date, projection_basis,
    business_days, production_days, sale_daily_rate,
    resource_cost_total, expenses_total, total_costs, revenue_total, gross_margin_amount, acv, tcv
  )
  values (
    v_workspace_id, 'Draft incomplete model', 'full', 'draft', 1, 'EUR',
    'collaborator', 'salaried', v_collaborator_id, 'Draft collaborator',
    v_company_id, v_opportunity_id,
    0.85, date '2026-01-01', date '2026-12-31', 'explicit_end_date',
    218, 185.3, 600,
    72500, 0, 72500, 111180, 38680, 111180, 111180
  )
  returning id into v_draft_model_id;

  perform pg_temp.assert_true(
    v_draft_model_id is not null,
    'A draft model may remain incomplete.'
  );

  insert into public.financial_models (
    workspace_id, title, mode, status, calculation_version, currency,
    resource_type, resource_cost_model, collaborator_id, resource_label,
    job_profile_id, profile_name_snapshot, seniority_snapshot, employment_status_snapshot,
    gross_annual_snapshot, variable_pay_snapshot, charges_rate_snapshot, annual_working_days_snapshot,
    historical_activity_rate, forecast_activity_rate,
    company_id, opportunity_id, pricing_agreement_id, precedent_mission_id, precedent_opportunity_id,
    start_date, end_date, projection_end_date, projection_basis, manual_business_days,
    business_days, production_days, sale_daily_rate,
    annual_employer_cost, base_daily_cost, productive_daily_cost,
    resource_cost_total, salary_cost_total, expenses_total, total_costs, revenue_total,
    daily_margin_amount, gross_margin_amount, gross_margin_pct, acv, tcv,
    warnings, assumptions, created_by, validated_by, validated_at
  )
  values (
    v_workspace_id, 'Validated salaried model', 'full', 'validated', 1, 'EUR',
    'collaborator', 'salaried', v_collaborator_id, 'Financial Modeling Consultant',
    v_job_profile_id, 'Financial Modeling Consultant', 'senior', 'cadre',
    50000, 10000, 0.45, 218,
    0.625, 0.85,
    v_company_id, v_opportunity_id, v_agreement_id, v_mission_id, v_precedent_opportunity_id,
    date '2026-01-01', date '2026-12-31', date '2026-12-31', 'explicit_end_date', 218,
    218, 185.3, 600,
    87000, 399.08, 469.51,
    72500, 72500, 2500, 75000, 111180,
    208.74, 36180, 32.54, 111180, 111180,
    '["warning"]'::jsonb,
    jsonb_build_object('assumptionSetId', v_assumption_set_id::text),
    v_actor_id, v_actor_id, now()
  );

  insert into public.financial_models (
    workspace_id, title, mode, status, calculation_version, currency,
    resource_type, resource_cost_model, candidate_id, resource_label,
    forecast_activity_rate,
    start_date, projection_end_date, projection_basis,
    business_days, production_days, sale_daily_rate,
    external_daily_cost_snapshot,
    resource_cost_total, expenses_total, total_costs, revenue_total, gross_margin_amount, acv, tcv,
    warnings, assumptions
  )
  values (
    v_workspace_id, 'Validated daily external model', 'flash', 'validated', 1, 'EUR',
    'candidate', 'subcontractor_daily_rate', v_candidate_id, 'Candidate subcontractor',
    0.85,
    date '2026-01-01', date '2026-12-31', 'year_end_default',
    218, 185.3, 600,
    420,
    77826, 0, 77826, 111180, 33354, 111180, 111180,
    '[]'::jsonb, '{}'::jsonb
  );

  insert into public.financial_models (
    workspace_id, title, mode, status, calculation_version, currency,
    resource_type, resource_cost_model, resource_label,
    forecast_activity_rate,
    start_date, projection_end_date, projection_basis,
    business_days, production_days, sale_daily_rate,
    external_fixed_cost_snapshot,
    resource_cost_total, expenses_total, total_costs, revenue_total, gross_margin_amount, acv, tcv,
    warnings, assumptions
  )
  values (
    v_workspace_id, 'Validated fixed external model', 'flash', 'validated', 1, 'EUR',
    'external', 'fixed_external_cost', 'External partner',
    1,
    date '2026-01-01', date '2026-01-31', 'explicit_end_date',
    22, 22, 700,
    9000,
    9000, 0, 9000, 15400, 6400, 15400, 15400,
    '[]'::jsonb, '{}'::jsonb
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.financial_models (
        workspace_id, title, mode, status, calculation_version, currency,
        resource_type, resource_cost_model, collaborator_id, resource_label,
        forecast_activity_rate, start_date, projection_end_date, projection_basis,
        business_days, production_days, sale_daily_rate,
        external_fixed_cost_snapshot,
        resource_cost_total, expenses_total, total_costs, revenue_total, gross_margin_amount, acv, tcv
      ) values (
        '%1$s', 'Invalid collaborator fixed cost model', 'flash', 'validated', 1, 'EUR',
        'collaborator', 'fixed_external_cost', '%2$s', 'Invalid combo',
        1, date '2026-01-01', date '2026-01-31', 'explicit_end_date',
        22, 22, 700,
        9000,
        9000, 0, 9000, 15400, 6400, 15400, 15400
      )
      $sql$,
      v_workspace_id,
      v_collaborator_id
    ),
    'financial_models_resource_type_cost_model_check',
    'resource_type and resource_cost_model combinations must stay coherent',
    '23514'
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.financial_models (
        workspace_id, title, mode, status, calculation_version, currency,
        resource_type, resource_cost_model, resource_label,
        forecast_activity_rate, start_date, projection_end_date, projection_basis,
        business_days, production_days, sale_daily_rate,
        gross_annual_snapshot, variable_pay_snapshot, charges_rate_snapshot, annual_working_days_snapshot,
        annual_employer_cost, base_daily_cost, productive_daily_cost, salary_cost_total,
        resource_cost_total, expenses_total, total_costs, revenue_total, gross_margin_amount, acv, tcv
      ) values (
        '%1$s', 'Missing collaborator id', 'full', 'validated', 1, 'EUR',
        'collaborator', 'salaried', 'Bad collaborator',
        1, date '2026-01-01', date '2026-01-31', 'explicit_end_date',
        22, 22, 700,
        50000, 0, 0.45, 218,
        72500, 332.57, 332.57, 72500,
        0, 0, 0, 15400, 15400, 15400, 15400
      )
      $sql$,
      v_workspace_id
    ),
    'financial_models_resource_reference_check',
    'Collaborator models must require collaborator_id',
    '23514'
  );

  perform pg_temp.expect_exception(
    format(
      $sql$
      insert into public.financial_models (
        workspace_id, title, mode, status, calculation_version, currency,
        resource_type, resource_cost_model, resource_label,
        forecast_activity_rate, start_date, projection_end_date, projection_basis,
        business_days, production_days, sale_daily_rate,
        external_daily_cost_snapshot,
        resource_cost_total, expenses_total, total_costs, revenue_total, gross_margin_amount, acv, tcv
      ) values (
        '%1$s', 'Missing candidate id', 'full', 'validated', 1, 'EUR',
        'candidate', 'subcontractor_daily_rate', 'Bad candidate',
        1, date '2026-01-01', date '2026-01-31', 'explicit_end_date',
        22, 22, 700,
        420,
        0, 0, 0, 15400, 15400, 15400, 15400
      )
      $sql$,
      v_workspace_id
    ),
    'financial_models_resource_reference_check',
    'Candidate models must require candidate_id',
    '23514'
  );

  insert into public.financial_model_expenses (
    workspace_id, financial_model_id, label, calculation_mode, unit_amount, quantity, total_amount_snapshot
  )
  values (
    v_workspace_id, v_draft_model_id, 'Travel', 'fixed', 200, 1, 200
  )
  returning id into v_expense_id;

  delete from public.financial_models
  where id = v_draft_model_id
    and workspace_id = v_workspace_id;

  perform pg_temp.assert_true(
    not exists (
      select 1
      from public.financial_model_expenses
      where id = v_expense_id
    ),
    'Deleting a financial model must cascade to its expenses.'
  );

  update public.financial_models
  set pricing_agreement_id = null
  where workspace_id = v_workspace_id
    and pricing_agreement_id = v_agreement_id;

  delete from public.client_pricing_agreements
  where id = v_agreement_id
    and workspace_id = v_workspace_id;

  perform pg_temp.assert_true(
    not exists (
      select 1
      from public.client_pricing_agreement_lines
      where agreement_id = v_agreement_id
    ),
    'Deleting an agreement must cascade to its lines.'
  );

  perform pg_temp.assert_true(
    exists (select 1 from public.companies where id = v_company_id),
    'Deleting financial objects must not delete companies.'
  );

  perform pg_temp.assert_true(
    exists (select 1 from public.job_profiles where id = v_job_profile_id),
    'Deleting financial objects must not delete job profiles.'
  );

  perform pg_temp.assert_true(
    exists (select 1 from public.opportunities where id = v_opportunity_id),
    'Deleting financial objects must not delete opportunities.'
  );

  insert into public.client_pricing_agreements (
    workspace_id,
    company_id,
    name,
    status,
    currency,
    valid_from,
    valid_to,
    source,
    created_by
  )
  values (
    v_workspace_id,
    v_company_id,
    'Accord client ancrage',
    'active',
    'EUR',
    date '2026-01-01',
    date '2026-12-31',
    'email',
    v_actor_id
  )
  returning id into v_agreement_id;

  insert into public.client_pricing_agreement_lines (
    workspace_id,
    agreement_id,
    job_profile_id,
    profile_name_snapshot,
    seniority_level,
    location,
    tjm_min,
    tjm_max
  )
  values (
    v_workspace_id,
    v_agreement_id,
    v_job_profile_id,
    'Financial Modeling Consultant',
    'senior',
    'Paris',
    680,
    740
  );

  select array_agg(distinct source_type order by source_type)
    into v_anchor_types
  from public.v_financial_model_pricing_anchors
  where company_id = v_company_id;

  perform pg_temp.assert_true(
    v_anchor_types = array['agreement', 'mission', 'opportunity']::text[],
    'The pricing anchor view must expose agreement, mission and opportunity sources.'
  );

  perform pg_temp.assert_eq_numeric(
    (select annual_employer_cost from public.v_financial_model_collaborator_costs where collaborator_id = v_collaborator_id),
    87000,
    'The collaborator cost view must expose annual employer cost.'
  );

  perform pg_temp.assert_eq_numeric(
    (select base_daily_cost from public.v_financial_model_collaborator_costs where collaborator_id = v_collaborator_id),
    399.08,
    'The collaborator cost view must expose the base daily cost.'
  );

  perform pg_temp.assert_eq_numeric(
    (select productive_daily_cost from public.v_financial_model_collaborator_costs where collaborator_id = v_collaborator_id),
    469.51,
    'The collaborator cost view must expose the productive daily cost.'
  );

  perform pg_temp.assert_eq_numeric(
    (select legacy_cjm from public.v_financial_model_collaborator_costs where collaborator_id = v_collaborator_id),
    391.26,
    'The collaborator cost view must expose the legacy cjm explicitly.'
  );

  perform pg_temp.assert_eq_numeric(
    (select historical_activity_rate from public.v_financial_model_activity_rates where collaborator_id = v_collaborator_id),
    0.6250,
    'The activity-rate view must use weighted billable_days / business_days on validated CRA only.'
  );

  v_updated_at_before := (
    select updated_at
    from public.financial_assumption_sets
    where id = v_assumption_set_id
  );

  perform pg_sleep(0.01);

  update public.financial_assumption_sets
  set notes = 'updated in test'
  where id = v_assumption_set_id;

  v_updated_at_after := (
    select updated_at
    from public.financial_assumption_sets
    where id = v_assumption_set_id
  );

  perform pg_temp.assert_true(
    v_updated_at_after > v_updated_at_before,
    'The updated_at trigger must refresh timestamps.'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from public.audit_log
      where entity_type = 'financial_assumption_sets'
        and entity_id = v_assumption_set_id
        and action in ('insert', 'update')
    ),
    'The audit trigger must record financial assumption set changes.'
  );

  reset role;
  update public.profiles
  set role = 'viewer'
  where id = v_actor_id;

  set local role authenticated;

  select count(*)
    into v_view_count
  from public.v_financial_model_collaborator_costs
  where collaborator_id = v_collaborator_id;

  perform pg_temp.assert_true(
    v_view_count = 0,
    'The collaborator cost view must respect underlying admin-only RLS.'
  );

  reset role;
  update public.profiles
  set role = 'owner'
  where id = v_actor_id;

  set local role authenticated;
end;
$$;

rollback;
