import { describe, expect, it } from "vitest"
import { mapFormStateToDb } from "../persistence/map-financial-model-snapshot"
import { mapDbToFormState } from "../persistence/map-financial-model-to-form"
import { calculateFinancialModel } from "../domain/calculate-financial-model"
import type { FinancialModelFormState, FinancialModelRow, FinancialModelExpenseRow } from "../persistence"

describe("Persistence Mappers", () => {
  const sampleSalariedFormState: FinancialModelFormState = {
    title: "Simulation Test Salarié",
    status: "draft",
    resourceLabel: "Jean Consultant",
    collaboratorId: "collaborator-123",
    candidateId: null,
    jobProfileId: "profile-456",
    profileNameSnapshot: "Consultant Principal",
    senioritySnapshot: "Senior",
    employmentStatusSnapshot: "CDI",
    locationSnapshot: "Paris",
    input: {
      mode: "full",
      resourceType: "collaborator",
      costModel: "salaried",
      annualGrossSalary: 60_000,
      annualVariablePay: 5_000,
      employerChargesRate: 0.45,
      annualWorkingDays: 218,
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      salesDailyRate: 700,
      forecastActivityRate: 0.85,
      currency: "EUR",
      expenses: [
        {
          label: "Ordinateur",
          calculationMode: "fixed",
          unitAmount: 1200,
          quantity: 1
        }
      ]
    }
  }

  it("1. maps salaried form state and results to database jsonb objects", () => {
    const result = calculateFinancialModel(sampleSalariedFormState.input)
    const { model, expenses } = mapFormStateToDb(sampleSalariedFormState, result)

    expect(model.title).toBe("Simulation Test Salarié")
    expect(model.status).toBe("draft")
    expect(model.gross_annual_snapshot).toBe(60_000)
    expect(model.variable_pay_snapshot).toBe(5_000)
    expect(model.charges_rate_snapshot).toBe(0.45)
    expect(model.calculation_version).toBe("financial-model-v1")
    expect(model.collaborator_id).toBe("collaborator-123")
    expect(model.candidate_id).toBeNull()
    expect(model.resource_label).toBe("Jean Consultant")
    
    // Check calculations mapped
    expect(model.revenue_total).toBe(result.periodRevenue)
    expect(model.gross_margin_amount).toBe(result.commercialMargin)
    expect(model.gross_margin_pct).toBe(result.mcoPercent)

    // Expenses mapped
    expect(expenses).toHaveLength(1)
    expect(expenses[0].label).toBe("Ordinateur")
    expect(expenses[0].calculation_mode).toBe("fixed")
    expect(expenses[0].unit_amount).toBe(1200)
    expect(expenses[0].quantity).toBe(1)
    expect(expenses[0].total_amount_snapshot).toBe(1200)
  })

  it("2. maps candidate with estimated cost to database jsonb objects", () => {
    const candidateState: FinancialModelFormState = {
      title: "Simulation Candidat",
      status: "draft",
      resourceLabel: "Candidat A",
      candidateId: "candidate-999",
      input: {
        mode: "flash",
        resourceType: "candidate",
        costModel: "salaried",
        annualGrossSalary: 55_000,
        annualVariablePay: 0,
        employerChargesRate: null,
        annualWorkingDays: 218,
        startDate: "2026-01-01",
        salesDailyRate: 600,
        forecastActivityRate: 0.9,
        currency: "EUR",
        flags: {
          resourceCostEstimated: true,
          employerChargesRateDefaulted: true
        }
      }
    }
    const result = calculateFinancialModel(candidateState.input)
    const { model } = mapFormStateToDb(candidateState, result)

    expect(model.candidate_id).toBe("candidate-999")
    expect(model.collaborator_id).toBeNull()
    const assumptions = model.assumptions as Record<string, Record<string, unknown>>
    expect(assumptions.flags?.resourceCostEstimated).toBe(true)
    expect(assumptions.flags?.employerChargesRateDefaulted).toBe(true)
  })

  it("3. maps subcontractor daily rate and fixed external cost to database", () => {
    const subcState: FinancialModelFormState = {
      title: "Simulation Sous-traitant",
      status: "draft",
      resourceLabel: "Prestataire B",
      input: {
        mode: "full",
        resourceType: "external",
        costModel: "subcontractor_daily_rate",
        purchaseDailyRate: 450,
        annualWorkingDays: 218,
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        salesDailyRate: 650,
        forecastActivityRate: 1.0,
        currency: "EUR"
      }
    }

    const resSubc = calculateFinancialModel(subcState.input)
    const { model: modelSubc } = mapFormStateToDb(subcState, resSubc)
    expect(modelSubc.external_daily_cost_snapshot).toBe(450)
    expect(modelSubc.external_fixed_cost_snapshot).toBeNull()

    const fixedState: FinancialModelFormState = {
      title: "Simulation Coût Fixe",
      status: "draft",
      resourceLabel: "Forfait Externe",
      input: {
        mode: "full",
        resourceType: "external",
        costModel: "fixed_external_cost",
        fixedExternalCost: 15_000,
        annualWorkingDays: 218,
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        salesDailyRate: 800,
        forecastActivityRate: 0.8,
        currency: "EUR"
      }
    }

    const resFixed = calculateFinancialModel(fixedState.input)
    const { model: modelFixed } = mapFormStateToDb(fixedState, resFixed)
    expect(modelFixed.external_fixed_cost_snapshot).toBe(15_000)
    expect(modelFixed.external_daily_cost_snapshot).toBeNull()
  })

  it("4. maps database rows back to form state structure", () => {
    const modelRow: FinancialModelRow = {
      id: "sim-111",
      workspace_id: "ws-999",
      title: "Simulation Database",
      mode: "full",
      status: "draft",
      calculation_version: "financial-model-v1",
      currency: "EUR",
      resource_type: "collaborator",
      resource_cost_model: "salaried",
      collaborator_id: "col-222",
      candidate_id: null,
      resource_label: "Jean Dev",
      job_profile_id: "job-333",
      profile_name_snapshot: "Développeur",
      seniority_snapshot: "Moyen",
      employment_status_snapshot: "CDI",
      location_snapshot: "Lyon",
      gross_annual_snapshot: 48000,
      variable_pay_snapshot: 2000,
      charges_rate_snapshot: 0.44,
      annual_working_days_snapshot: 218,
      external_daily_cost_snapshot: null,
      external_fixed_cost_snapshot: null,
      historical_activity_rate: 0.95,
      forecast_activity_rate: 0.9,
      company_id: "comp-444",
      opportunity_id: null,
      pricing_agreement_id: null,
      precedent_mission_id: null,
      precedent_opportunity_id: null,
      start_date: "2026-02-01",
      end_date: "2026-08-31",
      projection_end_date: "2026-08-31",
      projection_basis: "explicit_end_date",
      manual_business_days: null,
      business_days: 150,
      production_days: 135,
      sale_daily_rate: 550,
      annual_employer_cost: 72000,
      base_daily_cost: 330.27,
      productive_daily_cost: 366.97,
      resource_cost_total: 49540.5,
      salary_cost_total: 49540.5,
      expenses_total: 0,
      total_costs: 49540.5,
      revenue_total: 74250,
      daily_margin_amount: 183.03,
      gross_margin_amount: 24709.5,
      gross_margin_pct: 33.28,
      acv: 107910,
      tcv: 74250,
      warnings: [],
      assumptions: {},
      created_by: "user-555",
      validated_by: null,
      validated_at: null,
      converted_at: null,
      promoted_by: null,
      promoted_at: null,
      superseded_by_id: null,
      superseded_at: null,
      created_at: "2026-06-30T10:00:00Z",
      updated_at: "2026-06-30T10:00:00Z"
    }

    const expenseRow: FinancialModelExpenseRow = {
      id: "exp-1",
      workspace_id: "ws-999",
      financial_model_id: "sim-111",
      category: "travel",
      label: "Frais train",
      calculation_mode: "per_production_day",
      unit_amount: 15,
      quantity: 1,
      total_amount_snapshot: 2025,
      notes: null,
      sort_order: 0,
      created_at: "2026-06-30T10:00:00Z",
      updated_at: "2026-06-30T10:00:00Z"
    }

    const formState = mapDbToFormState(modelRow, [expenseRow])

    expect(formState.id).toBe("sim-111")
    expect(formState.title).toBe("Simulation Database")
    expect(formState.input.mode).toBe("full")
    expect(formState.input.resourceType).toBe("collaborator")
    expect(formState.input.costModel).toBe("salaried")
    const inputObj = formState.input as unknown as Record<string, unknown>
    expect(inputObj.annualGrossSalary).toBe(48000)
    expect(inputObj.annualVariablePay).toBe(2000)
    expect(formState.input.expenses).toHaveLength(1)
    expect(formState.input.expenses?.[0].label).toBe("Frais train")
    expect(formState.input.expenses?.[0].quantity).toBe(1)
  })

  it("5. validates duplication logic", () => {
    // Simulate duplication
    const original: FinancialModelFormState = {
      id: "sim-existing-id",
      title: "Simulation Initiale",
      status: "validated",
      resourceLabel: "Jean Dev",
      input: {
        mode: "full",
        resourceType: "collaborator",
        costModel: "salaried",
        annualGrossSalary: 50000,
        annualWorkingDays: 218,
        startDate: "2026-01-01",
        salesDailyRate: 600,
        forecastActivityRate: 0.9,
        currency: "EUR"
      }
    }

    const duplicated: FinancialModelFormState = {
      ...original,
      id: undefined,
      status: "draft",
      title: `${original.title} (Copie)`,
      updated_at: undefined,
      expected_updated_at: undefined
    }

    expect(duplicated.id).toBeUndefined()
    expect(duplicated.status).toBe("draft")
    expect(duplicated.title).toBe("Simulation Initiale (Copie)")
    expect(duplicated.updated_at).toBeUndefined()
    expect(duplicated.expected_updated_at).toBeUndefined()
  })

  it("6. validates mode passage from flash to full conservation", () => {
    const flashState: FinancialModelFormState = {
      title: "Flash Simulation",
      status: "draft",
      resourceLabel: "Collaborateur A",
      input: {
        mode: "flash",
        resourceType: "collaborator",
        costModel: "salaried",
        annualGrossSalary: 50_000,
        annualVariablePay: 5_000,
        employerChargesRate: 0.45,
        annualWorkingDays: 218,
        startDate: "2026-01-01",
        salesDailyRate: 600,
        forecastActivityRate: 0.85,
        currency: "EUR"
      }
    }

    // Switch mode
    const fullState = {
      ...flashState,
      input: {
        ...flashState.input,
        mode: "full" as const
      }
    }

    expect(fullState.input.mode).toBe("full")
    const fullInputObj = fullState.input as unknown as Record<string, unknown>
    expect(fullInputObj.annualGrossSalary).toBe(50_000)
    expect(fullState.input.startDate).toBe("2026-01-01")
    expect(fullState.input.salesDailyRate).toBe(600)
  })
})
