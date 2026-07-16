import { describe, expect, it } from "vitest"
import { validateFinancialReferenceEligibility } from "../domain/financial-reference.validator"
import type { FinancialModelFormState } from "../persistence/financial-model-persistence.types"
import { FINANCIAL_MODEL_ENGINE_VERSION } from "../domain/financial-model.constants"

function makeValidFormState(): FinancialModelFormState {
  return {
    title: "Simulation valide",
    status: "draft",
    companyId: "c389bf40-410a-48fa-8480-1a1a1a1a1a1a",
    opportunityId: "o589bf40-410a-48fa-8480-2b2b2b2b2b2b",
    collaboratorId: "col-12345",
    resourceLabel: "Jean Dupont",
    jobProfileId: "prof-12345",
    input: {
      mode: "full",
      resourceType: "collaborator",
      costModel: "salaried",
      annualGrossSalary: 50000,
      employerChargesRate: 0.45,
      annualWorkingDays: 218,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      salesDailyRate: 600,
      forecastActivityRate: 0.85,
      expenses: [],
      currency: "EUR",
      calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION,
    },
  }
}

describe("validateFinancialReferenceEligibility", () => {
  it("passes when all eligibility criteria are satisfied", () => {
    const state = makeValidFormState()
    const res = validateFinancialReferenceEligibility(state, {
      opportunityCompanyId: state.companyId,
      warnings: [],
      producedDays: 185.3,
    })

    expect(res.eligible).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it("fails when not in complet (full) mode", () => {
    const state = makeValidFormState()
    state.input.mode = "flash"
    const res = validateFinancialReferenceEligibility(state)

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("La simulation doit être en mode complet (full).")
  })

  it("fails when company or opportunity are missing", () => {
    const state = makeValidFormState()
    state.companyId = null
    state.opportunityId = null
    const res = validateFinancialReferenceEligibility(state)

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("Le compte client est obligatoire.")
    expect(res.errors).toContain("L'opportunité est obligatoire.")
  })

  it("fails when opportunity does not belong to selected company", () => {
    const state = makeValidFormState()
    const res = validateFinancialReferenceEligibility(state, {
      opportunityCompanyId: "another-company-id",
    })

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("L'opportunité sélectionnée n'appartient pas au compte client choisi.")
  })

  it("fails when collaborator/candidate is missing based on type", () => {
    const state1 = makeValidFormState()
    state1.collaboratorId = null
    const res1 = validateFinancialReferenceEligibility(state1)
    expect(res1.errors).toContain("Un collaborateur valide doit être renseigné.")

    const state2 = makeValidFormState()
    state2.input.resourceType = "candidate"
    state2.candidateId = null
    const res2 = validateFinancialReferenceEligibility(state2)
    expect(res2.errors).toContain("Un candidat valide doit être renseigné.")

    const state3 = makeValidFormState()
    state3.input.resourceType = "external"
    state3.resourceLabel = ""
    const res3 = validateFinancialReferenceEligibility(state3)
    expect(res3.errors).toContain("Le libellé de la ressource externe est obligatoire.")
  })

  it("accepts the métier snapshot when the legacy job profile is absent", () => {
    const state = makeValidFormState()
    state.jobProfileId = null
    state.profileNameSnapshot = "Consultant data"
    const res = validateFinancialReferenceEligibility(state)

    expect(res.eligible).toBe(true)
    expect(res.errors).not.toContain("Le métier de la ressource est obligatoire.")
  })

  it("fails when both the métier snapshot and legacy job profile are missing", () => {
    const state = makeValidFormState()
    state.jobProfileId = null
    state.profileNameSnapshot = "  "
    const res = validateFinancialReferenceEligibility(state)

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("Le métier de la ressource est obligatoire.")
  })

  it("fails when start or end date are missing", () => {
    const state = makeValidFormState()
    state.input.startDate = ""
    state.input.endDate = null
    const res = validateFinancialReferenceEligibility(state)

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("La date de début de mission est obligatoire.")
    expect(res.errors).toContain("La date de fin de mission doit être explicite.")
  })

  it("treats a provided input end date as explicit", () => {
    const state = makeValidFormState()
    state.input.endDate = "2026-12-31"
    const res = validateFinancialReferenceEligibility(state)

    expect(res.eligible).toBe(true)
    expect(res.errors).not.toContain("La date de fin de mission doit être explicite.")
  })

  it("fails when TJM is zero or negative", () => {
    const state = makeValidFormState()
    state.input.salesDailyRate = 0
    const res = validateFinancialReferenceEligibility(state)

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("Le TJM de vente doit être supérieur à zéro.")
  })

  it("fails when produced days is zero or negative", () => {
    const state = makeValidFormState()
    const res = validateFinancialReferenceEligibility(state, {
      producedDays: 0,
    })

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("Le nombre de jours de production doit être supérieur à zéro.")
  })

  it("fails when negative margin warning is present", () => {
    const state = makeValidFormState()
    const res = validateFinancialReferenceEligibility(state, {
      warnings: [{ code: "negative_margin", message: "Marge négative" }],
    })

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("La marge commerciale est négative.")
  })

  it("fails when sales rate is below productive cost", () => {
    const state = makeValidFormState()
    const res = validateFinancialReferenceEligibility(state, {
      warnings: [{ code: "sales_rate_below_productive_cost", message: "TJM insuffisant" }],
    })

    expect(res.eligible).toBe(false)
    expect(res.errors).toContain("Le TJM de vente est inférieur au CJM productif calculé.")
  })
})
