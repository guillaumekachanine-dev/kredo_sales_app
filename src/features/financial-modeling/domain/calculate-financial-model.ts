import {
  DEFAULT_EMPLOYER_CHARGES_RATE,
  FINANCIAL_MODEL_ENGINE_VERSION,
  WARNING_THRESHOLDS,
  countInclusiveCalendarDays,
  createUtcDate,
  endOfYearUtc,
  parseIsoDate,
  roundCurrency,
  roundDays,
  roundPercent,
  toIsoDate,
} from "./financial-model.constants"
import { calculateBusinessDays } from "./calculate-business-days"
import { validateFinancialModelInput } from "./financial-model.schema"
import type {
  FinancialExpenseInput,
  FinancialExpenseResult,
  FinancialModelInput,
  FinancialModelResult,
  FinancialModelWarning,
  ProjectionBasis,
  ValidationIssue,
} from "./financial-model.types"

export class FinancialModelValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"))
    this.name = "FinancialModelValidationError"
    this.issues = issues
  }
}

function getResolvedEndDate(input: FinancialModelInput): Date {
  const startDate = parseIsoDate(input.startDate)
  if (!startDate) {
    throw new FinancialModelValidationError([
      {
        path: "startDate",
        message: "La date de debut doit etre renseignee au format YYYY-MM-DD.",
      },
    ])
  }

  if (input.endDate) {
    const parsedEndDate = parseIsoDate(input.endDate)
    if (!parsedEndDate) {
      throw new FinancialModelValidationError([
        {
          path: "endDate",
          message: "La date de fin doit etre au format YYYY-MM-DD.",
        },
      ])
    }
    return parsedEndDate
  }

  return endOfYearUtc(startDate)
}

function getProjectionBasis(input: FinancialModelInput): ProjectionBasis {
  if (!input.endDate) return "year_end_default"
  if (input.manualBusinessDays !== undefined && input.manualBusinessDays !== null) {
    return "manual_business_days"
  }
  return "explicit_end_date"
}

function getExpenseQuantity(expense: FinancialExpenseInput): number {
  return expense.quantity ?? 1
}

function getExpenseAppliedUnits(
  expense: FinancialExpenseInput,
  businessDays: number,
  producedDays: number,
  startDate: Date,
  endDate: Date
): number {
  const quantity = getExpenseQuantity(expense)

  switch (expense.calculationMode) {
    case "fixed":
      return quantity
    case "per_business_day":
      return businessDays * quantity
    case "per_production_day":
      return producedDays * quantity
    case "monthly":
      return getMonthlyAppliedUnits(startDate, endDate) * quantity
    case "annual":
      return getAnnualAppliedUnits(startDate, endDate) * quantity
  }
}

function getMonthlyAppliedUnits(startDate: Date, endDate: Date): number {
  let total = 0
  let cursor = createUtcDate(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + 1,
    1
  )

  while (cursor.getTime() <= endDate.getTime()) {
    const year = cursor.getUTCFullYear()
    const monthIndex = cursor.getUTCMonth()
    const monthStart = createUtcDate(year, monthIndex + 1, 1)
    const monthEnd = createUtcDate(year, monthIndex + 2, 0)
    const coveredStart =
      startDate.getTime() > monthStart.getTime() ? startDate : monthStart
    const coveredEnd = endDate.getTime() < monthEnd.getTime() ? endDate : monthEnd

    if (coveredStart.getTime() <= coveredEnd.getTime()) {
      total +=
        countInclusiveCalendarDays(coveredStart, coveredEnd) /
        countInclusiveCalendarDays(monthStart, monthEnd)
    }

    cursor = createUtcDate(year, monthIndex + 2, 1)
  }

  return total
}

function getAnnualAppliedUnits(startDate: Date, endDate: Date): number {
  let total = 0
  let year = startDate.getUTCFullYear()

  while (year <= endDate.getUTCFullYear()) {
    const yearStart = createUtcDate(year, 1, 1)
    const yearEnd = createUtcDate(year, 12, 31)
    const coveredStart =
      startDate.getTime() > yearStart.getTime() ? startDate : yearStart
    const coveredEnd = endDate.getTime() < yearEnd.getTime() ? endDate : yearEnd

    if (coveredStart.getTime() <= coveredEnd.getTime()) {
      total +=
        countInclusiveCalendarDays(coveredStart, coveredEnd) /
        countInclusiveCalendarDays(yearStart, yearEnd)
    }

    year += 1
  }

  return total
}

function buildExpenseBreakdown(
  expenses: FinancialExpenseInput[],
  businessDays: number,
  producedDays: number,
  startDate: Date,
  endDate: Date
): FinancialExpenseResult[] {
  return expenses.map((expense) => {
    const quantity = getExpenseQuantity(expense)
    const appliedUnits = getExpenseAppliedUnits(
      expense,
      businessDays,
      producedDays,
      startDate,
      endDate
    )
    const amount = expense.unitAmount * appliedUnits

    return {
      id: expense.id,
      label: expense.label,
      category: expense.category,
      calculationMode: expense.calculationMode,
      unitAmount: roundCurrency(expense.unitAmount),
      quantity: roundDays(quantity),
      appliedUnits: roundDays(appliedUnits),
      amount: roundCurrency(amount),
    }
  })
}

function buildWarnings(
  input: FinancialModelInput,
  productiveDailyCost: number | null,
  commercialMargin: number,
  mcoPercent: number | null,
  projectionEndDate: string
): FinancialModelWarning[] {
  const warnings: FinancialModelWarning[] = []

  if (input.forecastActivityRate < WARNING_THRESHOLDS.lowActivityRate) {
    warnings.push({
      code: "low_activity_rate",
      message: "Le taux d'activite previsionnel est inferieur au seuil de 70 %.",
    })
  }

  if (
    productiveDailyCost !== null &&
    input.salesDailyRate < productiveDailyCost
  ) {
    warnings.push({
      code: "sales_rate_below_productive_cost",
      message: "Le TJM de vente est inferieur au CJM productif calcule.",
    })
  }

  if (commercialMargin < 0) {
    warnings.push({
      code: "negative_margin",
      message: "La marge commerciale est negative.",
    })
  }

  if (
    mcoPercent !== null &&
    mcoPercent < WARNING_THRESHOLDS.lowMcoPercent
  ) {
    warnings.push({
      code: "low_mco",
      message: "Le MCO est inferieur au seuil de 15 %.",
    })
  }

  if (!input.endDate) {
    warnings.push({
      code: "year_end_projection",
      message: `Le resultat repose sur une projection jusqu'au ${projectionEndDate}.`,
    })
  }

  const flags = input.flags ?? {}
  const isEstimatedResourceCost =
    flags.resourceCostEstimated === true ||
    flags.annualGrossSalaryEstimated === true ||
    flags.purchaseDailyRateEstimated === true ||
    flags.fixedExternalCostEstimated === true

  if (isEstimatedResourceCost) {
    warnings.push({
      code: "estimated_resource_cost",
      message: "Le cout ressource repose sur une valeur estimee.",
    })
  }

  const defaultChargesWereUsed =
    input.costModel === "salaried" &&
    (input.employerChargesRate === undefined || input.employerChargesRate === null)

  if (defaultChargesWereUsed || flags.employerChargesRateDefaulted === true) {
    warnings.push({
      code: "default_charges_rate",
      message: "Le taux de charges repose sur une hypothese par defaut.",
    })
  }

  return warnings
}

export function calculateFinancialModel(
  input: FinancialModelInput
): FinancialModelResult {
  const issues = validateFinancialModelInput(input)
  if (issues.length > 0) {
    throw new FinancialModelValidationError(issues)
  }

  const startDate = parseIsoDate(input.startDate)
  if (!startDate) {
    throw new FinancialModelValidationError([
      {
        path: "startDate",
        message: "La date de debut doit etre renseignee au format YYYY-MM-DD.",
      },
    ])
  }

  const resolvedEndDate = getResolvedEndDate(input)
  const projectionEndDate = toIsoDate(resolvedEndDate)
  const projectionBasis = getProjectionBasis(input)
  const businessDays =
    input.manualBusinessDays !== undefined && input.manualBusinessDays !== null
      ? input.manualBusinessDays
      : calculateBusinessDays(input.startDate, projectionEndDate)
  const producedDays = businessDays * input.forecastActivityRate
  const expenses = input.expenses ?? []
  const expenseBreakdown = buildExpenseBreakdown(
    expenses,
    businessDays,
    producedDays,
    startDate,
    resolvedEndDate
  )
  const totalExpenses = expenses.reduce((sum, expense) => {
    return (
      sum +
      expense.unitAmount *
        getExpenseAppliedUnits(
          expense,
          businessDays,
          producedDays,
          startDate,
          resolvedEndDate
        )
    )
  }, 0)

  let annualEmployerCost: number | null = null
  let loadedDailyCost: number | null = null
  let productiveDailyCost: number | null = null
  let salaryCostPeriod: number | null = null
  let resourceCostPeriod = 0

  if (input.costModel === "salaried") {
    const annualVariablePay = input.annualVariablePay ?? 0
    const employerChargesRate =
      input.employerChargesRate ?? DEFAULT_EMPLOYER_CHARGES_RATE

    annualEmployerCost =
      (input.annualGrossSalary + annualVariablePay) * (1 + employerChargesRate)
    loadedDailyCost = annualEmployerCost / input.annualWorkingDays
    productiveDailyCost = loadedDailyCost / input.forecastActivityRate
    salaryCostPeriod = loadedDailyCost * businessDays
    resourceCostPeriod = salaryCostPeriod
  }

  if (input.costModel === "subcontractor_daily_rate") {
    resourceCostPeriod = input.purchaseDailyRate * producedDays
  }

  if (input.costModel === "fixed_external_cost") {
    resourceCostPeriod = input.fixedExternalCost
  }

  const periodRevenue = input.salesDailyRate * producedDays
  const totalCosts = resourceCostPeriod + totalExpenses
  const commercialMargin = periodRevenue - totalCosts
  const marginPerProducedDay =
    producedDays > 0 ? commercialMargin / producedDays : null
  const mcoPercent =
    periodRevenue > 0 ? (commercialMargin / periodRevenue) * 100 : null
  const acv =
    input.salesDailyRate *
    input.annualWorkingDays *
    input.forecastActivityRate
  const tcv = input.salesDailyRate * producedDays
  const warnings = buildWarnings(
    input,
    productiveDailyCost,
    commercialMargin,
    mcoPercent,
    projectionEndDate
  )

  return {
    mode: input.mode,
    resourceType: input.resourceType,
    costModel: input.costModel,
    currency: input.currency,
    historicalActivityRate: input.historicalActivityRate ?? null,
    forecastActivityRate: roundPercent(input.forecastActivityRate * 100) / 100,
    endDate: input.endDate ?? null,
    projectionEndDate,
    projectionBasis,
    periodBusinessDays: roundDays(businessDays),
    producedDays: roundDays(producedDays),
    annualEmployerCost:
      annualEmployerCost === null ? null : roundCurrency(annualEmployerCost),
    loadedDailyCost:
      loadedDailyCost === null ? null : roundCurrency(loadedDailyCost),
    productiveDailyCost:
      productiveDailyCost === null ? null : roundCurrency(productiveDailyCost),
    resourceCostPeriod: roundCurrency(resourceCostPeriod),
    salaryCostPeriod:
      salaryCostPeriod === null ? null : roundCurrency(salaryCostPeriod),
    totalExpenses: roundCurrency(totalExpenses),
    totalCosts: roundCurrency(totalCosts),
    periodRevenue: roundCurrency(periodRevenue),
    marginPerProducedDay:
      marginPerProducedDay === null ? null : roundCurrency(marginPerProducedDay),
    commercialMargin: roundCurrency(commercialMargin),
    totalMargin: roundCurrency(commercialMargin),
    mcoValue: roundCurrency(commercialMargin),
    mcoPercent: mcoPercent === null ? null : roundPercent(mcoPercent),
    acv: roundCurrency(acv),
    tcv: roundCurrency(tcv),
    expenseBreakdown,
    warnings,
    engineVersion: FINANCIAL_MODEL_ENGINE_VERSION,
    calculationVersion:
      input.calculationVersion ?? FINANCIAL_MODEL_ENGINE_VERSION,
  }
}
