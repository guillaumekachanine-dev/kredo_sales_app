import { describe, expect, it } from "vitest"

import { calculateFinancialModel } from "../domain/calculate-financial-model"
import {
  DEFAULT_EMPLOYER_CHARGES_RATE,
  FINANCIAL_MODEL_ENGINE_VERSION,
} from "../domain/financial-model.constants"
import type {
  FinancialExpenseInput,
  FinancialModelInput,
} from "../domain/financial-model.types"

function makeBaseInput(
  overrides: Partial<FinancialModelInput> = {}
): FinancialModelInput {
  return {
    mode: "full",
    resourceType: "collaborator",
    costModel: "salaried",
    annualGrossSalary: 50_000,
    annualVariablePay: 0,
    employerChargesRate: 0.45,
    annualWorkingDays: 218,
    historicalActivityRate: 0.92,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    manualBusinessDays: 218,
    salesDailyRate: 600,
    forecastActivityRate: 0.85,
    expenses: [],
    currency: "EUR",
    calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION,
    ...overrides,
  } as FinancialModelInput
}

function makeExpense(
  overrides: Partial<FinancialExpenseInput> = {}
): FinancialExpenseInput {
  return {
    label: "Frais de structure",
    calculationMode: "fixed",
    unitAmount: 1_000,
    quantity: 1,
    ...overrides,
  }
}

describe("calculateFinancialModel", () => {
  it("calculates a salaried model without variable or expenses at 85%", () => {
    const result = calculateFinancialModel(makeBaseInput())

    expect(result.annualEmployerCost).toBe(72_500)
    expect(result.loadedDailyCost).toBe(332.57)
    expect(result.productiveDailyCost).toBe(391.26)
    expect(result.periodBusinessDays).toBe(218)
    expect(result.producedDays).toBe(185.3)
    expect(result.salaryCostPeriod).toBe(72_500)
    expect(result.periodRevenue).toBe(111_180)
    expect(result.commercialMargin).toBe(38_680)
    expect(result.mcoPercent).toBe(34.79)
  })

  it("includes annual variable pay in the employer cost", () => {
    const result = calculateFinancialModel(
      makeBaseInput({ annualVariablePay: 10_000 })
    )

    expect(result.annualEmployerCost).toBe(87_000)
    expect(result.salaryCostPeriod).toBe(87_000)
  })

  it("adds fixed expenses to total costs", () => {
    const result = calculateFinancialModel({
      ...makeBaseInput(),
      expenses: [makeExpense({ unitAmount: 2_500 })],
    })

    expect(result.totalExpenses).toBe(2_500)
    expect(result.totalCosts).toBe(75_000)
  })

  it("supports expenses billed per business day", () => {
    const result = calculateFinancialModel({
      ...makeBaseInput(),
      expenses: [makeExpense({ calculationMode: "per_business_day", unitAmount: 10 })],
    })

    expect(result.totalExpenses).toBe(2_180)
  })

  it("supports expenses billed per production day", () => {
    const result = calculateFinancialModel({
      ...makeBaseInput(),
      expenses: [makeExpense({ calculationMode: "per_production_day", unitAmount: 10 })],
    })

    expect(result.totalExpenses).toBe(1_853)
  })

  it("flags an estimated candidate salary without blocking the calculation", () => {
    const result = calculateFinancialModel({
      ...makeBaseInput({
        resourceType: "candidate",
        flags: { annualGrossSalaryEstimated: true, resourceCostEstimated: true },
      }),
    })

    expect(result.resourceType).toBe("candidate")
    expect(result.warnings.some((warning) => warning.code === "estimated_resource_cost")).toBe(true)
  })

  it("calculates an external subcontractor cost from the purchase daily rate", () => {
    const result = calculateFinancialModel({
      mode: "flash",
      resourceType: "external",
      costModel: "subcontractor_daily_rate",
      purchaseDailyRate: 350,
      annualWorkingDays: 218,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      salesDailyRate: 600,
      forecastActivityRate: 0.85,
      expenses: [],
      currency: "EUR",
    })

    expect(result.resourceCostPeriod).toBe(6_545)
    expect(result.loadedDailyCost).toBeNull()
  })

  it("keeps a fixed external cost untouched", () => {
    const result = calculateFinancialModel({
      mode: "flash",
      resourceType: "external",
      costModel: "fixed_external_cost",
      fixedExternalCost: 12_000,
      annualWorkingDays: 218,
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      salesDailyRate: 700,
      forecastActivityRate: 1,
      expenses: [],
      currency: "EUR",
    })

    expect(result.resourceCostPeriod).toBe(12_000)
  })

  it("supports a 100% activity rate", () => {
    const result = calculateFinancialModel(
      makeBaseInput({ forecastActivityRate: 1 })
    )

    expect(result.productiveDailyCost).toBe(result.loadedDailyCost)
    expect(result.producedDays).toBe(result.periodBusinessDays)
  })

  it("does not double count the activity rate when forecast activity is 85%", () => {
    const result = calculateFinancialModel(makeBaseInput())
    const doubleCountedCost = 50_000 * (1 + 0.45) * 0.85

    expect(result.salaryCostPeriod).toBe(72_500)
    expect(result.salaryCostPeriod).not.toBe(doubleCountedCost)
  })

  it("keeps salary cost independent from the historical activity rate", () => {
    const lowHistorical = calculateFinancialModel(
      makeBaseInput({ historicalActivityRate: 0.7 })
    )
    const highHistorical = calculateFinancialModel(
      makeBaseInput({ historicalActivityRate: 0.98 })
    )

    expect(lowHistorical.salaryCostPeriod).toBe(highHistorical.salaryCostPeriod)
  })

  it("uses an explicit end date when provided", () => {
    const result = calculateFinancialModel(
      makeBaseInput({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        manualBusinessDays: null,
      })
    )

    expect(result.projectionBasis).toBe("explicit_end_date")
    expect(result.projectionEndDate).toBe("2026-01-31")
    expect(result.periodBusinessDays).toBe(22)
  })

  it("projects to 31 december when no end date is provided", () => {
    const result = calculateFinancialModel(
      makeBaseInput({
        endDate: null,
      })
    )

    expect(result.endDate).toBeNull()
    expect(result.projectionBasis).toBe("year_end_default")
    expect(result.projectionEndDate).toBe("2026-12-31")
    expect(result.warnings.some((warning) => warning.code === "year_end_projection")).toBe(true)
  })

  it("keeps ACV and TCV different on a multi-year mission", () => {
    const result = calculateFinancialModel(
      makeBaseInput({
        startDate: "2026-01-01",
        endDate: "2027-12-31",
        manualBusinessDays: null,
        forecastActivityRate: 0.9,
      })
    )

    expect(result.acv).toBe(117_720)
    expect(result.tcv).toBe(281_880)
  })

  it("raises a warning on negative margin", () => {
    const result = calculateFinancialModel(
      makeBaseInput({
        salesDailyRate: 250,
      })
    )

    expect(result.commercialMargin).toBeLessThan(0)
    expect(result.warnings.some((warning) => warning.code === "negative_margin")).toBe(true)
  })

  it("reaches the exact break-even threshold without a price warning", () => {
    const breakEvenRate = (50_000 * 1.45) / 218 / 0.85
    const result = calculateFinancialModel(
      makeBaseInput({
        salesDailyRate: breakEvenRate,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        annualWorkingDays: 218,
      })
    )

    expect(result.commercialMargin).toBeCloseTo(0, 2)
    expect(
      result.warnings.some(
        (warning) => warning.code === "sales_rate_below_productive_cost"
      )
    ).toBe(false)
  })

  it("returns a null MCO when revenue is zero", () => {
    const result = calculateFinancialModel(
      makeBaseInput({
        startDate: "2026-06-06",
        endDate: "2026-06-07",
        manualBusinessDays: null,
      })
    )

    expect(result.periodBusinessDays).toBe(0)
    expect(result.periodRevenue).toBe(0)
    expect(result.mcoPercent).toBeNull()
  })

  it("rejects an end date earlier than the start date", () => {
    expect(() =>
      calculateFinancialModel(
        makeBaseInput({
          startDate: "2026-02-01",
          endDate: "2026-01-31",
        })
      )
    ).toThrow("La date de fin doit etre posterieure ou egale a la date de debut.")
  })

  it("rejects a zero activity rate", () => {
    expect(() =>
      calculateFinancialModel(
        makeBaseInput({
          forecastActivityRate: 0,
        })
      )
    ).toThrow(
      "forecastActivityRate: Le taux d'activite previsionnel doit etre strictement superieur a 0 et inferieur ou egal a 1."
    )
  })

  it("prorates monthly expenses month by month on calendar days", () => {
    const result = calculateFinancialModel({
      ...makeBaseInput({
        startDate: "2026-01-15",
        endDate: "2026-03-14",
        expenses: [
          makeExpense({
            calculationMode: "monthly",
            unitAmount: 300,
          }),
        ],
      }),
    })

    expect(result.totalExpenses).toBe(600)
  })

  it("applies a single centralized rounding strategy", () => {
    const result = calculateFinancialModel(
      makeBaseInput({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        manualBusinessDays: null,
        salesDailyRate: 601.337,
      })
    )

    expect(result.loadedDailyCost).toBe(332.57)
    expect(result.producedDays).toBe(18.7)
    expect(result.periodRevenue).toBe(11_245)
  })

  it("falls back to the default charges rate and warns about it", () => {
    const result = calculateFinancialModel(
      makeBaseInput({
        employerChargesRate: null,
      })
    )

    expect(result.annualEmployerCost).toBe(72_500)
    expect(
      result.warnings.some((warning) => warning.code === "default_charges_rate")
    ).toBe(true)
    expect(DEFAULT_EMPLOYER_CHARGES_RATE).toBe(0.45)
  })
})
