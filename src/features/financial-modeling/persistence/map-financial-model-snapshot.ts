import { DEFAULT_EMPLOYER_CHARGES_RATE } from "../domain/financial-model.constants"
import type { FinancialModelResult } from "../domain"
import type { FinancialModelFormState } from "./financial-model-persistence.types"

export function mapFormStateToDb(
  state: FinancialModelFormState,
  result: FinancialModelResult
) {
  const input = state.input

  // Persist the effective calculation assumptions, not only the raw form values.
  // The engine applies the default employer charges rate when the input is null;
  // validated rows must therefore snapshot that same rate to remain complete.
  const grossAnnualSnapshot = input.costModel === "salaried" ? input.annualGrossSalary : null
  const variablePaySnapshot = input.costModel === "salaried" ? (input.annualVariablePay ?? 0) : null
  const chargesRateSnapshot = input.costModel === "salaried"
    ? (input.employerChargesRate ?? DEFAULT_EMPLOYER_CHARGES_RATE)
    : null
  const annualWorkingDaysSnapshot = input.annualWorkingDays
  const externalDailyCostSnapshot = input.costModel === "subcontractor_daily_rate" ? input.purchaseDailyRate : null
  const externalFixedCostSnapshot = input.costModel === "fixed_external_cost" ? input.fixedExternalCost : null

  // Build model jsonb payload
  const model: Record<string, unknown> = {
    title: state.title,
    mode: input.mode,
    status: state.status,
    calculation_version: result.engineVersion,
    currency: input.currency,
    resource_type: input.resourceType,
    resource_cost_model: input.costModel,
    collaborator_id: state.collaboratorId ?? null,
    candidate_id: state.candidateId ?? null,
    resource_label: state.resourceLabel,
    job_profile_id: state.jobProfileId ?? null,
    profile_name_snapshot: state.profileNameSnapshot ?? null,
    seniority_snapshot: state.senioritySnapshot ?? null,
    employment_status_snapshot: state.employmentStatusSnapshot ?? null,
    location_snapshot: state.locationSnapshot ?? null,
    gross_annual_snapshot: grossAnnualSnapshot,
    variable_pay_snapshot: variablePaySnapshot,
    charges_rate_snapshot: chargesRateSnapshot,
    annual_working_days_snapshot: annualWorkingDaysSnapshot,
    external_daily_cost_snapshot: externalDailyCostSnapshot,
    external_fixed_cost_snapshot: externalFixedCostSnapshot,
    historical_activity_rate: input.historicalActivityRate ?? null,
    forecast_activity_rate: input.forecastActivityRate,
    company_id: state.companyId ?? null,
    opportunity_id: state.opportunityId ?? null,
    pricing_agreement_id: state.pricingAgreementId ?? null,
    precedent_mission_id: state.precedentMissionId ?? null,
    precedent_opportunity_id: state.precedentOpportunityId ?? null,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
    projection_end_date: result.projectionEndDate,
    projection_basis: result.projectionBasis,
    manual_business_days: input.manualBusinessDays ?? null,
    business_days: result.periodBusinessDays,
    production_days: result.producedDays,
    sale_daily_rate: input.salesDailyRate,
    annual_employer_cost: result.annualEmployerCost,
    base_daily_cost: result.loadedDailyCost,
    productive_daily_cost: result.productiveDailyCost,
    resource_cost_total: result.resourceCostPeriod,
    salary_cost_total: result.salaryCostPeriod,
    expenses_total: result.totalExpenses,
    total_costs: result.totalCosts,
    revenue_total: result.periodRevenue,
    daily_margin_amount: result.marginPerProducedDay,
    gross_margin_amount: result.commercialMargin,
    gross_margin_pct: result.mcoPercent,
    acv: result.acv,
    tcv: result.tcv,
    warnings: result.warnings,
    assumptions: {
      flags: input.flags ?? {},
      historicalActivityRate: input.historicalActivityRate ?? null,
      annualWorkingDays: input.annualWorkingDays,
      forecastActivityRate: input.forecastActivityRate,
      charges_rate_snapshot: chargesRateSnapshot,
    }
  }

  // Build expenses jsonb payload
  const expenses = (input.expenses || []).map((exp, idx) => {
    // get total amount from result breakdown if available, else calculate simple fallback
    const resultExp = result.expenseBreakdown?.find((re) => re.label === exp.label)
    return {
      category: exp.category ?? null,
      label: exp.label,
      calculation_mode: exp.calculationMode,
      unit_amount: exp.unitAmount,
      quantity: exp.quantity ?? 1,
      total_amount_snapshot: resultExp?.amount ?? (exp.unitAmount * (exp.quantity ?? 1)),
      notes: null,
      sort_order: idx
    }
  })

  return { model, expenses }
}
