import { describe, expect, it } from "vitest"
import {
  buildFinanceMobileDashboardData,
  normalizeFinanceEngagement,
  normalizeFinancePractice,
  type FinanceMobileModelInput,
} from "./finance-mobile-model"

const practices: FinanceMobileModelInput["practices"] = [
  { slug: "data-ai", name: "Data & AI", is_active: true },
  { slug: "cloud-engineering", name: "Cloud Engineering", is_active: true },
  { slug: "cybersecurity", name: "Cybersecurity", is_active: true },
  {
    slug: "digital-business-solutions",
    name: "Digital Business Solutions",
    is_active: true,
  },
  { slug: "digital-experience", name: "Digital Experience", is_active: true },
  {
    slug: "legacy-systems-mainframe",
    name: "Legacy Systems & Mainframe",
    is_active: true,
  },
  {
    slug: "project-agile-delivery",
    name: "Project & Agile Delivery",
    is_active: true,
  },
  {
    slug: "quality-engineering-testing",
    name: "Quality Engineering & Testing",
    is_active: true,
  },
]

const engagementTypes: FinanceMobileModelInput["engagementTypes"] = [
  { slug: "regie", name: "Régie", billing_model: "regie", is_active: true },
  { slug: "forfait", name: "Forfait", billing_model: "forfait", is_active: true },
  {
    slug: "centre_competences",
    name: "Centre de compétences",
    billing_model: "regie",
    is_active: true,
  },
  { slug: "conseil", name: "Conseil", billing_model: "forfait", is_active: true },
  { slug: "audit", name: "Audit", billing_model: "forfait", is_active: true },
]

function buildInput(): FinanceMobileModelInput {
  return {
    fiscalYear: 2026,
    asOfDate: "2026-02-26",
    plans: [
      {
        id: "plan-2026",
        fiscal_year: 2026,
        period_start: "2026-01-01",
        period_end: "2026-12-31",
        currency: "EUR",
        status: "active",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    criteria: [
      { plan_id: "plan-2026", code: "billed_revenue", target_value: 1_000 },
      { plan_id: "plan-2026", code: "gross_margin_pct", target_value: 30 },
    ],
    pnl: [
      {
        period_month: "2026-01-01",
        revenue_total: 400,
        gross_margin_value: 120,
        source: "import",
      },
      {
        period_month: "2026-02-01",
        revenue_total: 200,
        gross_margin_value: 40,
        source: "cra_derived",
      },
      {
        period_month: "2026-03-01",
        revenue_total: 999,
        gross_margin_value: 999,
        source: "budget",
      },
    ],
    activityReports: [
      {
        id: "report-jan",
        mission_id: "mission-a",
        period_start: "2026-01-01",
        billable_days: 1,
        tjm_snapshot: 100,
        activity_rate_percent: 100,
        status: "validated",
      },
      {
        id: "report-feb",
        mission_id: "mission-a",
        period_start: "2026-02-24",
        billable_days: 1,
        tjm_snapshot: 150,
        activity_rate_percent: 100,
        status: "validated",
      },
      {
        id: "report-mar",
        mission_id: "mission-a",
        period_start: "2026-03-01",
        billable_days: 3,
        tjm_snapshot: 100,
        activity_rate_percent: 100,
        status: "validated",
      },
      {
        id: "report-apr",
        mission_id: "mission-b",
        period_start: "2026-04-01",
        billable_days: 1,
        tjm_snapshot: 100,
        activity_rate_percent: 100,
        status: "validated",
      },
      {
        id: "report-rejected",
        mission_id: "mission-a",
        period_start: "2026-05-01",
        billable_days: 5,
        tjm_snapshot: 100,
        activity_rate_percent: 100,
        status: "rejected",
      },
    ],
    missions: [
      {
        id: "mission-a",
        title: "Mission A",
        company_id: "company-a",
        opportunity_id: "opportunity-mission-a",
        practice: "Data",
        status: "active",
        start_date: "2026-01-01",
        end_date: null,
        gross_margin_pct: 35,
      },
      {
        id: "mission-b",
        title: "Mission B",
        company_id: "company-b",
        opportunity_id: null,
        practice: "Valeur inconnue",
        status: "active",
        start_date: "2026-04-01",
        end_date: null,
        gross_margin_pct: 35,
      },
    ],
    opportunities: [
      {
        id: "opportunity-mission-a",
        company_id: "company-a",
        opportunity_type: "staffing",
        practice: "Data",
        stage: "gagnee",
        estimated_gain: 500,
        weighted_gain: 500,
        start_date: "2026-01-01",
        target_close_date: "2025-12-01",
      },
      {
        id: "opportunity-pipe",
        company_id: "company-a",
        opportunity_type: "forfait",
        practice: "QA",
        stage: "contractualisation",
        estimated_gain: 200,
        weighted_gain: 100,
        start_date: "2026-11-01",
        target_close_date: "2026-10-01",
      },
      {
        id: "opportunity-outside-year",
        company_id: "company-a",
        opportunity_type: "forfait",
        practice: "QA",
        stage: "qualification",
        estimated_gain: 999,
        weighted_gain: 999,
        start_date: "2027-01-01",
        target_close_date: "2026-12-01",
      },
    ],
    companies: [
      { id: "company-a", name: "Client A" },
      { id: "company-b", name: "Client B" },
    ],
    practices,
    engagementTypes,
  }
}

describe("buildFinanceMobileDashboardData", () => {
  it("sépare le P&L réel de la production future sécurisée jusqu'au mois", () => {
    const data = buildFinanceMobileDashboardData(buildInput())

    expect(data.period.actualThrough).toBe("2026-02-01")
    expect(data.summary.actualRevenue).toBe(600)
    expect(data.forecast.securedProduction).toBe(400)
    expect(data.revenueByMonth[1]).toMatchObject({
      month: "2026-02-01",
      actual: 200,
      projected: null,
      grossMarginPct: 20,
      source: "pnl",
    })
    expect(data.revenueByMonth[2]).toMatchObject({
      month: "2026-03-01",
      actual: null,
      projected: 300,
      grossMarginPct: null,
      source: "secured-production",
    })
  })

  it("exclut tout CRA futur de actualRevenue et ignore les CRA non validés", () => {
    const input = buildInput()
    input.activityReports.push({
      id: "future-large",
      mission_id: "mission-a",
      period_start: "2026-06-01",
      billable_days: 10,
      tjm_snapshot: 1_000,
      activity_rate_percent: 100,
      status: "validated",
    })

    const data = buildFinanceMobileDashboardData(input)

    expect(data.summary.actualRevenue).toBe(600)
    expect(data.forecast.securedProduction).toBe(10_400)
  })

  it("calcule séparément le pipe brut, pondéré, l'atterrissage et l'écart", () => {
    const data = buildFinanceMobileDashboardData(buildInput())

    expect(data.forecast).toEqual({
      securedProduction: 400,
      pipelineGross: 200,
      pipelineWeighted: 100,
    })
    expect(data.summary).toMatchObject({
      actualRevenue: 600,
      projectedLanding: 1_100,
      gapToTarget: 100,
      coveragePct: 110,
    })
    expect(data.objectives).toEqual({ annualRevenue: 1_000, grossMarginPct: 30 })
  })

  it("conserve actual et projected dans chaque trimestre client", () => {
    const data = buildFinanceMobileDashboardData(buildInput())
    const clientA = data.productionByClient.find((row) => row.clientId === "company-a")
    const clientB = data.productionByClient.find((row) => row.clientId === "company-b")

    expect(clientA?.quarters).toEqual({
      q1: { actual: 250, projected: 300 },
      q2: { actual: 0, projected: 0 },
      q3: { actual: 0, projected: 0 },
      q4: { actual: 0, projected: 0 },
    })
    expect(clientB?.quarters.q2).toEqual({ actual: 0, projected: 100 })
  })

  it("réconcilie chaque distribution sans redistribuer le Non attribué", () => {
    const data = buildFinanceMobileDashboardData(buildInput())

    expect(data.distributions.clients).toMatchObject({
      totalAmount: 600,
      attributedAmount: 250,
      unassignedAmount: 350,
    })
    expect(data.distributions.practices).toMatchObject({
      totalAmount: 600,
      attributedAmount: 250,
      unassignedAmount: 350,
    })
    expect(data.distributions.engagements).toMatchObject({
      totalAmount: 600,
      attributedAmount: 250,
      unassignedAmount: 350,
    })
    expect(
      data.distributions.practices.items.find((item) => item.id === "non-attribue"),
    ).toMatchObject({ label: "Non attribué", amount: 350 })
  })
})

describe("normalisations Finance mobile", () => {
  it("réutilise les 8 slugs canoniques et le mapping mission des RPC Cockpit", () => {
    expect(normalizeFinancePractice("Cloud", practices)).toBe("cloud-engineering")
    expect(normalizeFinancePractice("Product Management", practices)).toBe(
      "digital-experience",
    )
    expect(normalizeFinancePractice("Project Management", practices)).toBe(
      "project-agile-delivery",
    )
    expect(normalizeFinancePractice("Quality Engineering & Testing", practices)).toBe(
      "quality-engineering-testing",
    )
    expect(normalizeFinancePractice("Valeur inconnue", practices)).toBeNull()
  })

  it("normalise seulement les engagements résolus sans billing_condition", () => {
    expect(normalizeFinanceEngagement("staffing", engagementTypes)).toBe(
      "assistance_technique",
    )
    expect(normalizeFinanceEngagement("centre_de_service", engagementTypes)).toBe(
      "assistance_technique",
    )
    expect(normalizeFinanceEngagement("forfait", engagementTypes)).toBe("forfait")
    expect(normalizeFinanceEngagement("extension", engagementTypes)).toBeNull()
    expect(normalizeFinanceEngagement(null, engagementTypes)).toBeNull()
  })
})
