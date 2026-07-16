import type { FinancialModelFormState } from "../persistence/financial-model-persistence.types"
import type { FinancialModelWarning } from "./financial-model.types"

export interface EligibilityResult {
  eligible: boolean
  errors: string[]
}

/**
 * Validates whether a financial simulation is eligible to be promoted to a financial reference.
 */
export function validateFinancialReferenceEligibility(
  state: FinancialModelFormState,
  options?: {
    opportunityCompanyId?: string | null
    warnings?: FinancialModelWarning[]
    producedDays?: number
  }
): EligibilityResult {
  const errors: string[] = []
  const input = state.input

  if (input.mode !== "full") {
    errors.push("La simulation doit être en mode complet (full).")
  }

  if (!state.companyId) {
    errors.push("Le compte client est obligatoire.")
  }

  if (!state.opportunityId) {
    errors.push("L'opportunité est obligatoire.")
  }

  if (state.companyId && state.opportunityId && options?.opportunityCompanyId) {
    if (state.companyId !== options.opportunityCompanyId) {
      errors.push("L'opportunité sélectionnée n'appartient pas au compte client choisi.")
    }
  }

  if (input.resourceType === "collaborator" && !state.collaboratorId) {
    errors.push("Un collaborateur valide doit être renseigné.")
  } else if (input.resourceType === "candidate" && !state.candidateId) {
    errors.push("Un candidat valide doit être renseigné.")
  } else if (input.resourceType === "external" && (!state.resourceLabel || !state.resourceLabel.trim())) {
    errors.push("Le libellé de la ressource externe est obligatoire.")
  }

  const profileName = state.profileNameSnapshot?.trim()
  if (!state.jobProfileId && !profileName) {
    errors.push("Le métier de la ressource est obligatoire.")
  }

  if (!input.startDate) {
    errors.push("La date de début de mission est obligatoire.")
  }
  if (!input.endDate) {
    errors.push("La date de fin de mission doit être explicite.")
  }

  if (input.salesDailyRate === undefined || input.salesDailyRate === null || input.salesDailyRate <= 0) {
    errors.push("Le TJM de vente doit être supérieur à zéro.")
  }

  const producedDays = options?.producedDays
  if (producedDays !== undefined && producedDays <= 0) {
    errors.push("Le nombre de jours de production doit être supérieur à zéro.")
  }

  if (options?.warnings) {
    const hasNegativeMargin = options.warnings.some((w) => w.code === "negative_margin")
    if (hasNegativeMargin) {
      errors.push("La marge commerciale est négative.")
    }
    const hasRateBelowCost = options.warnings.some((w) => w.code === "sales_rate_below_productive_cost")
    if (hasRateBelowCost) {
      errors.push("Le TJM de vente est inférieur au CJM productif calculé.")
    }
  }

  return {
    eligible: errors.length === 0,
    errors,
  }
}
