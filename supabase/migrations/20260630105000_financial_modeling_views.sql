-- Lot 1 financial modeling views
-- Read-only canonical views for hydration and pricing anchors.

begin;

create or replace view public.v_financial_model_collaborator_costs
with (security_invoker = true) as
with current_compensation as (
  select distinct on (cc.collaborator_id)
    cc.id as compensation_id,
    cc.workspace_id,
    cc.collaborator_id,
    cc.effective_from,
    cc.effective_to,
    cc.gross_annual,
    coalesce(cc.variable_pay, 0) as variable_pay,
    cc.charges_rate,
    cc.working_days_per_year,
    cc.taci,
    cc.cjm as legacy_cjm
  from public.collaborator_compensation cc
  where cc.effective_from <= current_date
    and (cc.effective_to is null or cc.effective_to >= current_date)
  order by
    cc.collaborator_id,
    coalesce(cc.effective_to, date '9999-12-31') desc,
    cc.effective_from desc,
    cc.created_at desc
)
select
  c.workspace_id,
  c.id as collaborator_id,
  c.job_profile_id,
  c.employment_status,
  cc.compensation_id,
  cc.effective_from,
  cc.effective_to,
  cc.gross_annual,
  cc.variable_pay,
  cc.charges_rate,
  cc.working_days_per_year,
  cc.taci,
  cc.legacy_cjm,
  round((cc.gross_annual + cc.variable_pay) * (1 + cc.charges_rate), 2) as annual_employer_cost,
  round(
    ((cc.gross_annual + cc.variable_pay) * (1 + cc.charges_rate))
    / nullif(cc.working_days_per_year, 0),
    2
  ) as base_daily_cost,
  round(
    ((cc.gross_annual + cc.variable_pay) * (1 + cc.charges_rate))
    / nullif(cc.working_days_per_year * cc.taci, 0),
    2
  ) as productive_daily_cost
from public.collaborators c
join current_compensation cc
  on cc.collaborator_id = c.id
 and cc.workspace_id = c.workspace_id;

comment on view public.v_financial_model_collaborator_costs is
  'Current collaborator compensation view for financial modeling. legacy_cjm exposes collaborator_compensation.cjm explicitly to avoid hiding the historical taci-based denominator.';

create or replace view public.v_financial_model_activity_rates
with (security_invoker = true) as
with current_year_reports as (
  select
    mar.workspace_id,
    mar.collaborator_id,
    mar.period_start,
    mar.period_end,
    mar.business_days,
    mar.billable_days
  from public.mission_activity_reports mar
  where mar.status = 'validated'
    and mar.period_start >= date_trunc('year', current_date)::date
    and mar.period_start < (date_trunc('year', current_date) + interval '1 year')::date
)
select
  c.workspace_id,
  c.id as collaborator_id,
  max(cyr.period_end) as latest_period,
  count(distinct date_trunc('month', cyr.period_start))::integer as covered_months,
  coalesce(sum(cyr.business_days), 0)::numeric as business_days,
  coalesce(sum(cyr.billable_days), 0)::numeric as billable_days,
  case
    when coalesce(sum(cyr.business_days), 0) > 0 then
      round(sum(cyr.billable_days) / nullif(sum(cyr.business_days), 0), 4)
    else null
  end as historical_activity_rate
from public.collaborators c
left join current_year_reports cyr
  on cyr.workspace_id = c.workspace_id
 and cyr.collaborator_id = c.id
group by c.workspace_id, c.id;

comment on view public.v_financial_model_activity_rates is
  'Weighted historical collaborator activity rates for the current civil year, based only on validated CRA.';

create or replace view public.v_financial_model_pricing_anchors
with (security_invoker = true) as
select
  a.workspace_id,
  a.company_id,
  'agreement'::text as source_type,
  l.id as source_id,
  concat(a.name, ' · ', l.profile_name_snapshot) as source_label,
  l.job_profile_id,
  l.profile_name_snapshot as profile_name,
  l.seniority_level,
  l.location,
  coalesce(
    l.tjm_recommended,
    case
      when l.tjm_min is not null and l.tjm_max is not null
        then round((l.tjm_min + l.tjm_max) / 2, 2)
      else null
    end
  ) as tjm,
  a.valid_from,
  a.valid_to,
  a.status
from public.client_pricing_agreements a
join public.client_pricing_agreement_lines l
  on l.workspace_id = a.workspace_id
 and l.agreement_id = a.id
where coalesce(
        l.tjm_recommended,
        case
          when l.tjm_min is not null and l.tjm_max is not null
            then round((l.tjm_min + l.tjm_max) / 2, 2)
          else null
        end
      ) is not null

union all

select
  m.workspace_id,
  m.company_id,
  'mission'::text as source_type,
  m.id as source_id,
  m.title as source_label,
  c.job_profile_id,
  coalesce(m.role_title, jp.title, m.title) as profile_name,
  m.seniority as seniority_level,
  null::text as location,
  m.tjm,
  m.start_date as valid_from,
  m.end_date as valid_to,
  m.status
from public.missions m
left join public.collaborators c
  on c.workspace_id = m.workspace_id
 and c.id = m.collaborator_id
left join public.job_profiles jp
  on jp.workspace_id = m.workspace_id
 and jp.id = c.job_profile_id

union all

select
  o.workspace_id,
  o.company_id,
  'opportunity'::text as source_type,
  o.id as source_id,
  o.title as source_label,
  null::uuid as job_profile_id,
  o.title as profile_name,
  o.seniority as seniority_level,
  o.location,
  o.target_daily_rate as tjm,
  coalesce(o.start_date, o.opened_at::date) as valid_from,
  o.target_close_date as valid_to,
  o.stage as status
from public.opportunities o
where o.company_id is not null
  and o.target_daily_rate is not null;

comment on view public.v_financial_model_pricing_anchors is
  'Unified pricing anchors for financial modeling. agreement rows come from explicit client pricing agreements, while mission and opportunity rows remain historical or commercial anchors only.';

grant select on public.v_financial_model_collaborator_costs to authenticated;
grant select on public.v_financial_model_activity_rates to authenticated;
grant select on public.v_financial_model_pricing_anchors to authenticated;

commit;
