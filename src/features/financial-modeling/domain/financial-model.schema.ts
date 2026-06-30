import {
  DEFAULT_EMPLOYER_CHARGES_RATE,
  parseIsoDate,
} from "./financial-model.constants"
import type {
  FinancialExpenseInput,
  FinancialModelInput,
  ValidationIssue,
  ValidationResult,
} from "./financial-model.types"

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function pushIssue(issues: ValidationIssue[], path: string, message: string) {
  issues.push({ path, message })
}

function validateExpenseLine(
  value: unknown,
  index: number,
  issues: ValidationIssue[]
): value is FinancialExpenseInput {
  const path = `expenses[${index}]`
  if (!isObject(value)) {
    pushIssue(issues, path, "Une ligne de frais doit etre un objet.")
    return false
  }

  if (!isNonEmptyString(value.label)) {
    pushIssue(issues, `${path}.label`, "Le libelle du frais est obligatoire.")
  }

  if (
    value.calculationMode !== "fixed" &&
    value.calculationMode !== "per_business_day" &&
    value.calculationMode !== "per_production_day" &&
    value.calculationMode !== "monthly" &&
    value.calculationMode !== "annual"
  ) {
    pushIssue(
      issues,
      `${path}.calculationMode`,
      "Le mode de calcul du frais est invalide."
    )
  }

  if (!isFiniteNumber(value.unitAmount) || value.unitAmount < 0) {
    pushIssue(
      issues,
      `${path}.unitAmount`,
      "Le montant unitaire du frais doit etre positif ou nul."
    )
  }

  if (
    value.quantity !== undefined &&
    (!isFiniteNumber(value.quantity) || value.quantity < 0)
  ) {
    pushIssue(
      issues,
      `${path}.quantity`,
      "La quantite du frais doit etre positive ou nulle."
    )
  }

  return true
}

function validateBaseInput(
  input: Record<string, unknown>,
  issues: ValidationIssue[]
) {
  if (input.mode !== "flash" && input.mode !== "full") {
    pushIssue(issues, "mode", "Le mode doit etre 'flash' ou 'full'.")
  }

  if (
    input.resourceType !== "collaborator" &&
    input.resourceType !== "candidate" &&
    input.resourceType !== "external"
  ) {
    pushIssue(
      issues,
      "resourceType",
      "Le type de ressource doit etre collaborator, candidate ou external."
    )
  }

  if (!isFiniteNumber(input.annualWorkingDays) || input.annualWorkingDays <= 0) {
    pushIssue(
      issues,
      "annualWorkingDays",
      "Les jours ouvres annuels doivent etre strictement positifs."
    )
  }

  if (!isNonEmptyString(input.startDate) || !parseIsoDate(input.startDate)) {
    pushIssue(
      issues,
      "startDate",
      "La date de debut doit etre renseignee au format YYYY-MM-DD."
    )
  }

  if (
    input.endDate !== undefined &&
    input.endDate !== null &&
    (!isNonEmptyString(input.endDate) || !parseIsoDate(input.endDate))
  ) {
    pushIssue(
      issues,
      "endDate",
      "La date de fin doit etre au format YYYY-MM-DD lorsqu'elle est renseignee."
    )
  }

  if (
    isNonEmptyString(input.startDate) &&
    parseIsoDate(input.startDate) &&
    input.endDate !== undefined &&
    input.endDate !== null &&
    isNonEmptyString(input.endDate) &&
    parseIsoDate(input.endDate) &&
    parseIsoDate(input.endDate)!.getTime() < parseIsoDate(input.startDate)!.getTime()
  ) {
    pushIssue(
      issues,
      "endDate",
      "La date de fin doit etre posterieure ou egale a la date de debut."
    )
  }

  if (
    input.manualBusinessDays !== undefined &&
    input.manualBusinessDays !== null &&
    (!isFiniteNumber(input.manualBusinessDays) || input.manualBusinessDays < 0)
  ) {
    pushIssue(
      issues,
      "manualBusinessDays",
      "Le nombre manuel de jours ouvres doit etre positif ou nul."
    )
  }

  if (!isFiniteNumber(input.salesDailyRate) || input.salesDailyRate < 0) {
    pushIssue(
      issues,
      "salesDailyRate",
      "Le TJM de vente doit etre positif ou nul."
    )
  }

  if (
    !isFiniteNumber(input.forecastActivityRate) ||
    input.forecastActivityRate <= 0 ||
    input.forecastActivityRate > 1
  ) {
    pushIssue(
      issues,
      "forecastActivityRate",
      "Le taux d'activite previsionnel doit etre strictement superieur a 0 et inferieur ou egal a 1."
    )
  }

  if (
    input.historicalActivityRate !== undefined &&
    input.historicalActivityRate !== null &&
    (!isFiniteNumber(input.historicalActivityRate) ||
      input.historicalActivityRate <= 0 ||
      input.historicalActivityRate > 1)
  ) {
    pushIssue(
      issues,
      "historicalActivityRate",
      "Le taux d'activite historique doit etre strictement superieur a 0 et inferieur ou egal a 1."
    )
  }

  if (!isNonEmptyString(input.currency)) {
    pushIssue(issues, "currency", "La devise est obligatoire.")
  }

  if (input.expenses !== undefined) {
    if (!Array.isArray(input.expenses)) {
      pushIssue(issues, "expenses", "Les frais doivent etre fournis sous forme de liste.")
    } else {
      input.expenses.forEach((expense, index) => {
        validateExpenseLine(expense, index, issues)
      })
    }
  }
}

export function validateFinancialModelInput(
  input: FinancialModelInput
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const raw = input as unknown as Record<string, unknown>

  validateBaseInput(raw, issues)

  if (input.costModel === "salaried") {
    if (input.resourceType !== "collaborator" && input.resourceType !== "candidate") {
      pushIssue(
        issues,
        "resourceType",
        "Une ressource salariee doit etre de type collaborator ou candidate."
      )
    }

    if (!isFiniteNumber(input.annualGrossSalary) || input.annualGrossSalary < 0) {
      pushIssue(
        issues,
        "annualGrossSalary",
        "Le salaire brut annuel doit etre positif ou nul."
      )
    }

    if (
      input.annualVariablePay !== undefined &&
      (!isFiniteNumber(input.annualVariablePay) || input.annualVariablePay < 0)
    ) {
      pushIssue(
        issues,
        "annualVariablePay",
        "Le variable annuel doit etre positif ou nul."
      )
    }

    const chargesRate =
      input.employerChargesRate === undefined || input.employerChargesRate === null
        ? DEFAULT_EMPLOYER_CHARGES_RATE
        : input.employerChargesRate

    if (!isFiniteNumber(chargesRate) || chargesRate < 0) {
      pushIssue(
        issues,
        "employerChargesRate",
        "Le taux de charges doit etre positif ou nul."
      )
    }
  }

  if (input.costModel === "subcontractor_daily_rate") {
    if (input.resourceType !== "external") {
      pushIssue(
        issues,
        "resourceType",
        "Un cout d'achat journalier externe exige une ressource de type external."
      )
    }

    if (!isFiniteNumber(input.purchaseDailyRate) || input.purchaseDailyRate < 0) {
      pushIssue(
        issues,
        "purchaseDailyRate",
        "Le cout d'achat journalier doit etre positif ou nul."
      )
    }
  }

  if (input.costModel === "fixed_external_cost") {
    if (input.resourceType !== "external") {
      pushIssue(
        issues,
        "resourceType",
        "Un cout externe fixe exige une ressource de type external."
      )
    }

    if (!isFiniteNumber(input.fixedExternalCost) || input.fixedExternalCost < 0) {
      pushIssue(
        issues,
        "fixedExternalCost",
        "Le cout externe fixe doit etre positif ou nul."
      )
    }
  }

  return issues
}

export function financialModelInputSchema(
  value: unknown
): ValidationResult<FinancialModelInput> {
  const issues: ValidationIssue[] = []

  if (!isObject(value)) {
    return {
      success: false,
      issues: [{ path: "", message: "Le modele financier doit etre un objet." }],
    }
  }

  validateBaseInput(value, issues)

  const costModel = value.costModel
  if (
    costModel !== "salaried" &&
    costModel !== "subcontractor_daily_rate" &&
    costModel !== "fixed_external_cost"
  ) {
    pushIssue(
      issues,
      "costModel",
      "Le modele de cout doit etre salaried, subcontractor_daily_rate ou fixed_external_cost."
    )
  }

  if (issues.length > 0) {
    return { success: false, issues }
  }

  return {
    success: true,
    data: value as unknown as FinancialModelInput,
  }
}
