-- Additive migration: correct_rpc_sqlstate
-- Replace RPCs to use standard 5-character SQLSTATE codes for custom business exceptions.

begin;

create or replace function public.save_financial_model_snapshot(
  p_model_id uuid,
  p_expected_updated_at timestamptz,
  p_model jsonb,
  p_expenses jsonb
)
returns table (
  id uuid,
  status text,
  updated_at timestamptz
)
language plpgsql
security invoker
as $$
declare
  v_workspace_id uuid;
  v_user_id uuid;
  v_model_id uuid;
  v_current_status text;
  v_current_updated_at timestamptz;
  v_status text;
  v_validated_by uuid;
  v_validated_at timestamptz;
  v_res_id uuid;
  v_res_status text;
  v_res_updated_at timestamptz;
begin
  v_workspace_id := private.current_workspace_id();
  v_user_id := auth.uid();

  -- Get current state if model exists
  if p_model_id is not null then
    select public.financial_models.status, public.financial_models.updated_at
    into v_current_status, v_current_updated_at
    from public.financial_models
    where public.financial_models.id = p_model_id
      and public.financial_models.workspace_id = v_workspace_id;
  end if;

  if v_current_status is null then
    -- CREATION
    v_model_id := coalesce(p_model_id, gen_random_uuid());
    v_status := coalesce(p_model->>'status', 'draft');
    
    if v_status = 'validated' then
      v_validated_by := v_user_id;
      v_validated_at := now();
    else
      v_validated_by := null;
      v_validated_at := null;
    end if;

    insert into public.financial_models (
      id, workspace_id, title, mode, status, calculation_version, currency,
      resource_type, resource_cost_model, collaborator_id, candidate_id, resource_label,
      job_profile_id, profile_name_snapshot, seniority_snapshot, employment_status_snapshot, location_snapshot,
      gross_annual_snapshot, variable_pay_snapshot, charges_rate_snapshot, annual_working_days_snapshot,
      external_daily_cost_snapshot, external_fixed_cost_snapshot,
      historical_activity_rate, forecast_activity_rate,
      company_id, opportunity_id, pricing_agreement_id, precedent_mission_id, precedent_opportunity_id,
      start_date, end_date, projection_end_date, projection_basis, manual_business_days,
      business_days, production_days, sale_daily_rate,
      annual_employer_cost, base_daily_cost, productive_daily_cost,
      resource_cost_total, salary_cost_total, expenses_total, total_costs, revenue_total,
      daily_margin_amount, gross_margin_amount, gross_margin_pct, acv, tcv,
      warnings, assumptions, created_by, validated_by, validated_at
    ) values (
      v_model_id, v_workspace_id,
      p_model->>'title',
      p_model->>'mode',
      v_status,
      p_model->>'calculation_version',
      coalesce(p_model->>'currency', 'EUR'),
      p_model->>'resource_type',
      p_model->>'resource_cost_model',
      (p_model->>'collaborator_id')::uuid,
      (p_model->>'candidate_id')::uuid,
      p_model->>'resource_label',
      (p_model->>'job_profile_id')::uuid,
      p_model->>'profile_name_snapshot',
      p_model->>'seniority_snapshot',
      p_model->>'employment_status_snapshot',
      p_model->>'location_snapshot',
      (p_model->>'gross_annual_snapshot')::numeric,
      (p_model->>'variable_pay_snapshot')::numeric,
      (p_model->>'charges_rate_snapshot')::numeric,
      (p_model->>'annual_working_days_snapshot')::integer,
      (p_model->>'external_daily_cost_snapshot')::numeric,
      (p_model->>'external_fixed_cost_snapshot')::numeric,
      (p_model->>'historical_activity_rate')::numeric,
      (p_model->>'forecast_activity_rate')::numeric,
      (p_model->>'company_id')::uuid,
      (p_model->>'opportunity_id')::uuid,
      (p_model->>'pricing_agreement_id')::uuid,
      (p_model->>'precedent_mission_id')::uuid,
      (p_model->>'precedent_opportunity_id')::uuid,
      (p_model->>'start_date')::date,
      (p_model->>'end_date')::date,
      (p_model->>'projection_end_date')::date,
      p_model->>'projection_basis',
      (p_model->>'manual_business_days')::numeric,
      (p_model->>'business_days')::numeric,
      (p_model->>'production_days')::numeric,
      (p_model->>'sale_daily_rate')::numeric,
      (p_model->>'annual_employer_cost')::numeric,
      (p_model->>'base_daily_cost')::numeric,
      (p_model->>'productive_daily_cost')::numeric,
      (p_model->>'resource_cost_total')::numeric,
      (p_model->>'salary_cost_total')::numeric,
      (p_model->>'expenses_total')::numeric,
      (p_model->>'total_costs')::numeric,
      (p_model->>'revenue_total')::numeric,
      (p_model->>'daily_margin_amount')::numeric,
      (p_model->>'gross_margin_amount')::numeric,
      (p_model->>'gross_margin_pct')::numeric,
      (p_model->>'acv')::numeric,
      (p_model->>'tcv')::numeric,
      coalesce((p_model->'warnings'), '[]'::jsonb),
      coalesce((p_model->'assumptions'), '{}'::jsonb),
      v_user_id,
      v_validated_by,
      v_validated_at
    );
  else
    -- UPDATE
    v_model_id := p_model_id;
    
    if v_current_status = 'converted' or v_current_status = 'archived' then
      raise exception 'Le modèle financier est verrouillé (converti ou archivé) et ne peut plus être modifié.' using errcode = 'L0001';
    end if;

    if p_expected_updated_at is not null and v_current_updated_at <> p_expected_updated_at then
      raise exception 'Conflit de mise à jour : la simulation a été modifiée entre-temps.' using errcode = 'V0001';
    end if;

    v_status := coalesce(p_model->>'status', v_current_status);
    
    select public.financial_models.validated_by, public.financial_models.validated_at
    into v_validated_by, v_validated_at
    from public.financial_models
    where public.financial_models.id = v_model_id and public.financial_models.workspace_id = v_workspace_id;

    if v_status = 'validated' then
      v_validated_by := v_user_id;
      v_validated_at := now();
    elsif v_status = 'draft' then
      v_validated_by := null;
      v_validated_at := null;
    end if;

    update public.financial_models
    set
      title = p_model->>'title',
      mode = p_model->>'mode',
      status = v_status,
      calculation_version = p_model->>'calculation_version',
      currency = coalesce(p_model->>'currency', 'EUR'),
      resource_type = p_model->>'resource_type',
      resource_cost_model = p_model->>'resource_cost_model',
      collaborator_id = (p_model->>'collaborator_id')::uuid,
      candidate_id = (p_model->>'candidate_id')::uuid,
      resource_label = p_model->>'resource_label',
      job_profile_id = (p_model->>'job_profile_id')::uuid,
      profile_name_snapshot = p_model->>'profile_name_snapshot',
      seniority_snapshot = p_model->>'seniority_snapshot',
      employment_status_snapshot = p_model->>'employment_status_snapshot',
      location_snapshot = p_model->>'location_snapshot',
      gross_annual_snapshot = (p_model->>'gross_annual_snapshot')::numeric,
      variable_pay_snapshot = (p_model->>'variable_pay_snapshot')::numeric,
      charges_rate_snapshot = (p_model->>'charges_rate_snapshot')::numeric,
      annual_working_days_snapshot = (p_model->>'annual_working_days_snapshot')::integer,
      external_daily_cost_snapshot = (p_model->>'external_daily_cost_snapshot')::numeric,
      external_fixed_cost_snapshot = (p_model->>'external_fixed_cost_snapshot')::numeric,
      historical_activity_rate = (p_model->>'historical_activity_rate')::numeric,
      forecast_activity_rate = (p_model->>'forecast_activity_rate')::numeric,
      company_id = (p_model->>'company_id')::uuid,
      opportunity_id = (p_model->>'opportunity_id')::uuid,
      pricing_agreement_id = (p_model->>'pricing_agreement_id')::uuid,
      precedent_mission_id = (p_model->>'precedent_mission_id')::uuid,
      precedent_opportunity_id = (p_model->>'precedent_opportunity_id')::uuid,
      start_date = (p_model->>'start_date')::date,
      end_date = (p_model->>'end_date')::date,
      projection_end_date = (p_model->>'projection_end_date')::date,
      projection_basis = p_model->>'projection_basis',
      manual_business_days = (p_model->>'manual_business_days')::numeric,
      business_days = (p_model->>'business_days')::numeric,
      production_days = (p_model->>'production_days')::numeric,
      sale_daily_rate = (p_model->>'sale_daily_rate')::numeric,
      annual_employer_cost = (p_model->>'annual_employer_cost')::numeric,
      base_daily_cost = (p_model->>'base_daily_cost')::numeric,
      productive_daily_cost = (p_model->>'productive_daily_cost')::numeric,
      resource_cost_total = (p_model->>'resource_cost_total')::numeric,
      salary_cost_total = (p_model->>'salary_cost_total')::numeric,
      expenses_total = (p_model->>'expenses_total')::numeric,
      total_costs = (p_model->>'total_costs')::numeric,
      revenue_total = (p_model->>'revenue_total')::numeric,
      daily_margin_amount = (p_model->>'daily_margin_amount')::numeric,
      gross_margin_amount = (p_model->>'gross_margin_amount')::numeric,
      gross_margin_pct = (p_model->>'gross_margin_pct')::numeric,
      acv = (p_model->>'acv')::numeric,
      tcv = (p_model->>'tcv')::numeric,
      warnings = coalesce((p_model->'warnings'), '[]'::jsonb),
      assumptions = coalesce((p_model->'assumptions'), '{}'::jsonb),
      validated_by = v_validated_by,
      validated_at = v_validated_at,
      updated_at = now()
    where public.financial_models.id = v_model_id
      and public.financial_models.workspace_id = v_workspace_id;
  end if;

  -- Replace expenses
  delete from public.financial_model_expenses
  where public.financial_model_expenses.financial_model_id = v_model_id
    and public.financial_model_expenses.workspace_id = v_workspace_id;

  if p_expenses is not null and jsonb_array_length(p_expenses) > 0 then
    insert into public.financial_model_expenses (
      financial_model_id, workspace_id, category, label, calculation_mode, unit_amount, quantity, total_amount_snapshot, notes, sort_order
    )
    select
      v_model_id,
      v_workspace_id,
      x.category,
      x.label,
      x.calculation_mode,
      x.unit_amount,
      coalesce(x.quantity, 1.00),
      x.total_amount_snapshot,
      x.notes,
      coalesce(x.sort_order, 0)
    from jsonb_to_recordset(p_expenses) as x(
      category text,
      label text,
      calculation_mode text,
      unit_amount numeric,
      quantity numeric,
      total_amount_snapshot numeric,
      notes text,
      sort_order integer
    );
  end if;

  -- Return updated/inserted summary
  select public.financial_models.id, public.financial_models.status, public.financial_models.updated_at
  into v_res_id, v_res_status, v_res_updated_at
  from public.financial_models
  where public.financial_models.id = v_model_id
    and public.financial_models.workspace_id = v_workspace_id;

  id := v_res_id;
  status := v_res_status;
  updated_at := v_res_updated_at;
  return next;
end;
$$;

create or replace function public.archive_financial_model(
  p_model_id uuid
)
returns table (
  id uuid,
  status text,
  updated_at timestamptz
)
language plpgsql
security invoker
as $$
declare
  v_workspace_id uuid;
  v_status text;
  v_res_id uuid;
  v_res_status text;
  v_res_updated_at timestamptz;
begin
  v_workspace_id := private.current_workspace_id();

  select public.financial_models.status into v_status
  from public.financial_models
  where public.financial_models.id = p_model_id
    and public.financial_models.workspace_id = v_workspace_id;

  if v_status is null then
    raise exception 'Simulation introuvable dans ce workspace.' using errcode = 'P0002';
  end if;

  if v_status = 'converted' then
    raise exception 'Impossible d''archiver une simulation déjà convertie.' using errcode = 'L0001';
  end if;

  update public.financial_models
  set
    status = 'archived',
    updated_at = now()
  where public.financial_models.id = p_model_id
    and public.financial_models.workspace_id = v_workspace_id;

  select public.financial_models.id, public.financial_models.status, public.financial_models.updated_at
  into v_res_id, v_res_status, v_res_updated_at
  from public.financial_models
  where public.financial_models.id = p_model_id
    and public.financial_models.workspace_id = v_workspace_id;

  id := v_res_id;
  status := v_res_status;
  updated_at := v_res_updated_at;
  return next;
end;
$$;

commit;
