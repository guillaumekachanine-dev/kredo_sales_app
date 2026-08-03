import { describe, expect, it } from "vitest"
import type { FinancialResourceCatalogData } from "../data/get-financial-resource-catalog"
import {
  applyFinancialModelingLaunchPreset,
  buildFinancialModelTitle,
} from "../domain/financial-modeling-launch-preset"
import type { FinancialModelFormState } from "../persistence"

const emptyCatalog: FinancialResourceCatalogData = {
  collaborators: [],
  candidates: [],
  provenance: {
    collaborators: [
      "collaborators",
      "persons",
      "job_profiles",
      "v_financial_model_collaborator_costs",
    ],
    candidates: ["candidates", "persons", "job_profiles"],
  },
}

function makeBaseState(): FinancialModelFormState {
  return {
    title: "Nouvelle simulation",
    status: "draft",
    resourceLabel: "",
    input: {
      mode: "flash",
      resourceType: "candidate",
      costModel: "salaried",
      annualGrossSalary: 0,
      annualVariablePay: 0,
      employerChargesRate: null,
      annualWorkingDays: 218,
      startDate: "2026-08-03",
      endDate: "2026-12-31",
      salesDailyRate: 0,
      forecastActivityRate: 0.9,
      expenses: [],
      currency: "EUR",
    },
  }
}

describe("buildFinancialModelTitle", () => {
  it("uses the client, consultant and need nomenclature", () => {
    expect(buildFinancialModelTitle({
      companyName: "CHU de Nice",
      consultantName: "Alexandre G.",
      opportunityTitle: "Interopérabilité SIRH",
    })).toBe("CHU de Nice - Alexandre G. - Interopérabilité SIRH")
  })

  it("normalizes surrounding and repeated whitespace", () => {
    expect(buildFinancialModelTitle({
      companyName: "  CHU   de Nice ",
      consultantName: " Alexandre G. ",
      opportunityTitle: " Interopérabilité   SIRH ",
    })).toBe("CHU de Nice - Alexandre G. - Interopérabilité SIRH")
  })

  it("returns null until all three naming parts are available", () => {
    expect(buildFinancialModelTitle({
      companyName: "CHU de Nice",
      consultantName: "",
      opportunityTitle: "Interopérabilité SIRH",
    })).toBeNull()
  })

  it("builds the canonical title from a staffing launch preset", () => {
    const state = applyFinancialModelingLaunchPreset(makeBaseState(), {
      companyId: "company-1",
      companyName: "CHU de Nice",
      opportunityId: "opportunity-1",
      opportunityTitle: "Interopérabilité SIRH",
      candidateId: "candidate-1",
      candidateName: "Alexandre G.",
    }, emptyCatalog)

    expect(state.title).toBe("CHU de Nice - Alexandre G. - Interopérabilité SIRH")
    expect(state.companyId).toBe("company-1")
    expect(state.opportunityId).toBe("opportunity-1")
    expect(state.candidateId).toBe("candidate-1")
  })

  it("recomputes the canonical title when the selected consultant changes", () => {
    expect(buildFinancialModelTitle({
      companyName: "CHU de Nice",
      consultantName: "Marie Dupont",
      opportunityTitle: "Interopérabilité SIRH",
    })).toBe("CHU de Nice - Marie Dupont - Interopérabilité SIRH")
  })
})
