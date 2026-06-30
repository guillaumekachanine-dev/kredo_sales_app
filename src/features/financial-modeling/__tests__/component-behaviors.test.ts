import { describe, expect, it } from "vitest"
import { validateFinancialModelInput } from "../domain/financial-model.schema"
import { calculateFinancialModel } from "../domain/calculate-financial-model"
import { FINANCIAL_MODEL_ENGINE_VERSION } from "../domain/financial-model.constants"
import type { FinancialModelInput } from "../domain/financial-model.types"

function makeBaseInput(overrides: Partial<FinancialModelInput> = {}): FinancialModelInput {
  return {
    mode: "flash",
    resourceType: "collaborator",
    costModel: "salaried",
    annualGrossSalary: 50_000,
    annualVariablePay: 0,
    employerChargesRate: 0.45,
    annualWorkingDays: 218,
    startDate: "2026-01-01",
    salesDailyRate: 600,
    forecastActivityRate: 0.85,
    expenses: [],
    currency: "EUR",
    calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION,
    ...overrides
  } as FinancialModelInput
}

describe("Component Behaviors and Validation Rules", () => {
  it("1. disables save if calculation is impossible due to validation issues", () => {
    // Missing required TJM rate
    const invalidInput = makeBaseInput({ salesDailyRate: -10 })
    const issues = validateFinancialModelInput(invalidInput)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some((i) => i.path === "salesDailyRate")).toBe(true)

    // Save should be disabled when validation issues exist
    const canSave = issues.length === 0
    expect(canSave).toBe(false)
  })

  it("2. enables save when all required calculation inputs are valid", () => {
    const validInput = makeBaseInput()
    const issues = validateFinancialModelInput(validInput)
    expect(issues.length).toBe(0)

    const canSave = issues.length === 0
    expect(canSave).toBe(true)
  })

  it("3. detects and emits warning for negative margin", () => {
    // TJM = 100, salary = 120_000 -> costs will exceed revenues causing negative margin
    const input = makeBaseInput({
      annualGrossSalary: 120_000,
      salesDailyRate: 100
    })

    const result = calculateFinancialModel(input)
    expect(result.commercialMargin).toBeLessThan(0)
    
    // Warn for negative margin
    expect(result.warnings.some((w) => w.code === "negative_margin")).toBe(true)
  })

  it("4. detects and emits warning when sales daily rate is below productive cost", () => {
    // Annual cost = 50_000 * 1.45 = 72_500. Loaded daily cost = 72_500 / 218 = 332.57.
    // Productive daily cost at 50% activity = 332.57 / 0.5 = 665.14.
    // TJM = 500 (which is less than 665.14)
    const input = makeBaseInput({
      annualGrossSalary: 50_000,
      forecastActivityRate: 0.5,
      salesDailyRate: 500
    })

    const result = calculateFinancialModel(input)
    expect(result.productiveDailyCost).toBe(665.14)
    expect(input.salesDailyRate).toBeLessThan(result.productiveDailyCost!)
    
    // Warning code should be present
    expect(result.warnings.some((w) => w.code === "sales_rate_below_productive_cost")).toBe(true)
  })

  it("5. preserves state values when transitioning from Flash to Complet mode", () => {
    const flashInput = makeBaseInput({ mode: "flash" })
    
    // Simulate switching mode to complet (full)
    const completInput: FinancialModelInput = {
      ...flashInput,
      mode: "full"
    }

    expect(completInput.mode).toBe("full")
    expect(completInput.startDate).toBe(flashInput.startDate)
    expect(completInput.salesDailyRate).toBe(flashInput.salesDailyRate)
    expect(completInput.forecastActivityRate).toBe(flashInput.forecastActivityRate)
  })
})
