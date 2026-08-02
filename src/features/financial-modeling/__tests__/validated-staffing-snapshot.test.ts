import { describe, expect, it } from "vitest"
import { calculateFinancialModel } from "../domain/calculate-financial-model"
import { DEFAULT_EMPLOYER_CHARGES_RATE } from "../domain/financial-model.constants"
import { mapFormStateToDb } from "../persistence/map-financial-model-snapshot"
import type { FinancialModelFormState } from "../persistence/financial-model-persistence.types"

describe("validated staffing financial snapshots", () => {
  it("persists the default employer charges rate used by the engine", () => {
    const state: FinancialModelFormState = {
      title: "Simulation financière — Candidat",
      status: "validated",
      candidateId: "00000000-0000-0000-0000-000000000001",
      collaboratorId: null,
      resourceLabel: "Candidat",
      opportunityId: "00000000-0000-0000-0000-000000000002",
      input: {
        mode: "flash",
        resourceType: "candidate",
        costModel: "salaried",
        annualGrossSalary: 55_000,
        annualVariablePay: 0,
        employerChargesRate: null,
        annualWorkingDays: 218,
        startDate: "2026-08-03",
        endDate: "2026-12-31",
        salesDailyRate: 650,
        forecastActivityRate: 0.9,
        expenses: [],
        currency: "EUR",
      },
    }

    const result = calculateFinancialModel(state.input)
    const { model } = mapFormStateToDb(state, result)

    expect(model.status).toBe("validated")
    expect(model.charges_rate_snapshot).toBe(DEFAULT_EMPLOYER_CHARGES_RATE)
    expect(model.projection_end_date).toBeTruthy()
    expect(model.annual_employer_cost).toBe(result.annualEmployerCost)
    expect(model.base_daily_cost).toBe(result.loadedDailyCost)
    expect(model.productive_daily_cost).toBe(result.productiveDailyCost)
    expect(model.salary_cost_total).toBe(result.salaryCostPeriod)
  })
})
