import type { Tables } from "@/types/database"

export type FinancialModelVersion = string

export type FinancialModelMode = "flash" | "full"

export type ResourceType = "collaborator" | "candidate" | "external"

export type ResourceCostModel =
  | "salaried"
  | "subcontractor_daily_rate"
  | "fixed_external_cost"

export type ExpenseCalculationMode =
  | "fixed"
  | "per_business_day"
  | "per_production_day"
  | "monthly"
  | "annual"

export type ProjectionBasis =
  | "explicit_end_date"
  | "year_end_default"
  | "manual_business_days"

export type FinancialWarningCode =
  | "low_activity_rate"
  | "sales_rate_below_productive_cost"
  | "negative_margin"
  | "low_mco"
  | "year_end_projection"
  | "estimated_resource_cost"
  | "default_charges_rate"

export interface FinancialExpenseInput {
  id?: string
  label: string
  category?: string
  calculationMode: ExpenseCalculationMode
  unitAmount: number
  quantity?: number
}

export interface FinancialInputFlags {
  annualGrossSalaryEstimated?: boolean
  annualVariablePayEstimated?: boolean
  resourceCostEstimated?: boolean
  employerChargesRateEstimated?: boolean
  employerChargesRateDefaulted?: boolean
  salesDailyRateEstimated?: boolean
  salesDailyRateFromDatabase?: boolean
  purchaseDailyRateEstimated?: boolean
  fixedExternalCostEstimated?: boolean
  manualBusinessDaysEstimated?: boolean
}

export interface FinancialModelBaseInput {
  mode: FinancialModelMode
  resourceType: ResourceType
  annualWorkingDays: number
  historicalActivityRate?: number | null
  startDate: string
  endDate?: string | null
  manualBusinessDays?: number | null
  salesDailyRate: number
  forecastActivityRate: number
  expenses?: FinancialExpenseInput[]
  currency: string
  flags?: FinancialInputFlags
  calculationVersion?: FinancialModelVersion
}

export interface SalariedFinancialModelInput extends FinancialModelBaseInput {
  resourceType: "collaborator" | "candidate"
  costModel: "salaried"
  annualGrossSalary: number
  annualVariablePay?: number
  employerChargesRate?: number | null
}

export interface SubcontractorDailyRateFinancialModelInput
  extends FinancialModelBaseInput {
  resourceType: "external"
  costModel: "subcontractor_daily_rate"
  purchaseDailyRate: number
}

export interface FixedExternalCostFinancialModelInput
  extends FinancialModelBaseInput {
  resourceType: "external"
  costModel: "fixed_external_cost"
  fixedExternalCost: number
}

export type FinancialModelInput =
  | SalariedFinancialModelInput
  | SubcontractorDailyRateFinancialModelInput
  | FixedExternalCostFinancialModelInput

export interface FinancialModelWarning {
  code: FinancialWarningCode
  message: string
}

export interface FinancialExpenseResult {
  id?: string
  label: string
  category?: string
  calculationMode: ExpenseCalculationMode
  unitAmount: number
  quantity: number
  appliedUnits: number
  amount: number
}

export interface FinancialModelResult {
  mode: FinancialModelMode
  resourceType: ResourceType
  costModel: ResourceCostModel
  currency: string
  historicalActivityRate: number | null
  forecastActivityRate: number
  endDate: string | null
  projectionEndDate: string
  projectionBasis: ProjectionBasis
  periodBusinessDays: number
  producedDays: number
  annualEmployerCost: number | null
  loadedDailyCost: number | null
  productiveDailyCost: number | null
  resourceCostPeriod: number
  salaryCostPeriod: number | null
  totalExpenses: number
  totalCosts: number
  periodRevenue: number
  marginPerProducedDay: number | null
  commercialMargin: number
  totalMargin: number
  mcoValue: number
  mcoPercent: number | null
  acv: number
  tcv: number
  expenseBreakdown: FinancialExpenseResult[]
  warnings: FinancialModelWarning[]
  engineVersion: FinancialModelVersion
  calculationVersion: FinancialModelVersion
}

export interface ValidationIssue {
  path: string
  message: string
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: ValidationIssue[] }

export type CollaboratorCompensationRow = Tables<"collaborator_compensation">
export type MissionRow = Tables<"missions">
export type MissionActivityReportRow = Tables<"mission_activity_reports">
export type OfferPricingGridRow = Tables<"offer_pricing_grids">
