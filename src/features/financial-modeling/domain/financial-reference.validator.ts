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

  // 1. mode = full
  if (input.mode !== "full") {
    errors.push("La simulation doit être en mode complet (full).")
  }

  // 2. company_id
  if (!state.companyId) {
    errors.push("Le compte client est obligatoire.")
  }

  // 3. opportunity_id
  if (!state.opportunityId) {
    errors.push("L'opportunité est obligatoire.")
  }

  // 4. l'opportunité appartient au compte sélectionné
  if (state.companyId && state.opportunityId && options?.opportunityCompanyId) {
    if (state.companyId !== options.opportunityCompanyId) {
      errors.push("L'opportunité sélectionnée n'appartient pas au compte client choisi.")
    }
  }

  // 5. une ressource valide est renseignée
  if (input.resourceType === "collaborator" && !state.collaboratorId) {
    errors.push("Un collaborateur valide doit être renseigné.")
  } else if (input.resourceType === "candidate" && !state.candidateId) {
    errors.push("Un candidat valide doit être renseigné.")
  } else if (input.resourceType === "external" && (!state.resourceLabel || !state.resourceLabel.trim())) {
    errors.push("Le libellé de la ressource externe est obligatoire.")
  }

  // 6. un profil ou rôle est renseigné
  if (!state.jobProfileId) {
    errors.push("Le profil ou rôle de la ressource est obligatoire.")
  }

  // 7. start_date et end_date explicites
  if (!input.startDate) {
    errors.push("La date de début de mission est obligatoire.")
  }
  if (!input.endDate) {
    errors.push("La date de fin de mission doit être explicite.")
  }

  // 8. la date de fin n'est pas une simple projection automatique de fin d'année
  if (input.endDate && input.startDate) {
    // year_end_default can be checked via projectionBasis or calculation results
    // Let's check projectionBasis if present, or if options pass the projectionBasis.
    // In our FormState/database, projection_basis is set to 'year_end_default' if no explicit end date was entered.
    // Since we also check input.endDate, if the user explicitly typed an end date, getProjectionBasis returns 'explicit_end_date'.
    // If they have projectionBasis === 'year_end_default' (e.g. from DB mapping), it's blocked.
    // Let's check if the projection_basis is year_end_default or if they have not provided an endDate.
    const isYearEnd = (input as { projectionBasis?: string }).projectionBasis === "year_end_default" || !input.endDate;
    if (isYearEnd) {
      errors.push("La date de fin ne doit pas être une simple projection de fin d'année.")
    }
  }

  // 9. sale_daily_rate > 0
  if (input.salesDailyRate === undefined || input.salesDailyRate === null || input.salesDailyRate <= 0) {
    errors.push("Le TJM de vente doit être supérieur à zéro.")
  }

  // 10. production_days > 0
  // Wait, production_days is calculated on the server/client result. If we have a result, we can check its producedDays.
  // Or we can check it if the options or form state exposes it. In our FormState, the calculation returns clientResult.
  // Let's check if we have a calculated result or we can compute/check from the input or options.
  // If the options pass the calculated producedDays or if we check the calculations.
  // Let's also check if input has manualBusinessDays or if we can get it from calculated warnings/result.
  // Let's check if we can pass calculated values in options:
  // options?: { producedDays?: number; grossMarginAmount?: number }
  const producedDays = (options as { producedDays?: number })?.producedDays
  if (producedDays !== undefined && producedDays <= 0) {
    errors.push("Le nombre de jours de production doit être supérieur à zéro.")
  }

  // 11. aucun warning bloquant
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
