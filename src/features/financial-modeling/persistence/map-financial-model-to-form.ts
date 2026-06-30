import type { FinancialModelRow, FinancialModelExpenseRow, FinancialModelFormState } from "./financial-model-persistence.types"
import type { FinancialModelInput, FinancialExpenseInput } from "../domain"

export function mapDbToFormState(
  model: FinancialModelRow,
  expenses: FinancialModelExpenseRow[]
): FinancialModelFormState {
  const resourceType = model.resource_type as "collaborator" | "candidate" | "external"
  const costModel = model.resource_cost_model as "salaried" | "subcontractor_daily_rate" | "fixed_external_cost"
  const status = model.status as "draft" | "validated" | "archived"

  const assumptions = (model.assumptions || {}) as Record<string, unknown>
  const flags = (assumptions.flags || {}) as Record<string, unknown>

  const mappedExpenses: FinancialExpenseInput[] = (expenses || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((exp) => ({
      id: exp.id,
      label: exp.label,
      category: exp.category ?? undefined,
      calculationMode: exp.calculation_mode as "fixed" | "per_business_day" | "per_production_day" | "monthly" | "annual",
      unitAmount: Number(exp.unit_amount),
      quantity: exp.quantity ? Number(exp.quantity) : undefined
    }))

  const baseInput = {
    mode: model.mode as "flash" | "full",
    resourceType,
    annualWorkingDays: model.annual_working_days_snapshot ?? 218,
    historicalActivityRate: model.historical_activity_rate ? Number(model.historical_activity_rate) : null,
    startDate: model.start_date,
    endDate: model.end_date ?? null,
    manualBusinessDays: model.manual_business_days ? Number(model.manual_business_days) : null,
    salesDailyRate: Number(model.sale_daily_rate),
    forecastActivityRate: Number(model.forecast_activity_rate),
    expenses: mappedExpenses,
    currency: model.currency,
    flags,
    calculationVersion: model.calculation_version
  }

  let input: FinancialModelInput

  if (costModel === "salaried") {
    input = {
      ...baseInput,
      resourceType: resourceType as "collaborator" | "candidate",
      costModel: "salaried",
      annualGrossSalary: Number(model.gross_annual_snapshot ?? 0),
      annualVariablePay: Number(model.variable_pay_snapshot ?? 0),
      employerChargesRate: model.charges_rate_snapshot ? Number(model.charges_rate_snapshot) : null
    }
  } else if (costModel === "subcontractor_daily_rate") {
    input = {
      ...baseInput,
      resourceType: "external",
      costModel: "subcontractor_daily_rate",
      purchaseDailyRate: Number(model.external_daily_cost_snapshot ?? 0)
    }
  } else {
    input = {
      ...baseInput,
      resourceType: "external",
      costModel: "fixed_external_cost",
      fixedExternalCost: Number(model.external_fixed_cost_snapshot ?? 0)
    }
  }

  return {
    id: model.id,
    title: model.title,
    status,
    updated_at: model.updated_at,
    expected_updated_at: model.updated_at,
    collaboratorId: model.collaborator_id,
    candidateId: model.candidate_id,
    resourceLabel: model.resource_label,
    jobProfileId: model.job_profile_id,
    profileNameSnapshot: model.profile_name_snapshot,
    senioritySnapshot: model.seniority_snapshot,
    employmentStatusSnapshot: model.employment_status_snapshot,
    locationSnapshot: model.location_snapshot,
    companyId: model.company_id,
    opportunityId: model.opportunity_id,
    pricingAgreementId: model.pricing_agreement_id,
    precedentMissionId: model.precedent_mission_id,
    precedentOpportunityId: model.precedent_opportunity_id,
    input
  }
}
