import { describe, expect, it } from "vitest"
import type { FinanceMobileDashboardData, FinanceQuarterAmount } from "@/lib/finance/finance-mobile-model"
import { buildQuarterlyGridRows } from "./QuarterlyProductionGrid"
import { buildContributionItems } from "./RevenueContributionChart"

function quarters(value: number): Record<"q1" | "q2" | "q3" | "q4", FinanceQuarterAmount> {
  return {
    q1: { actual: value, projected: 0 },
    q2: { actual: 0, projected: 0 },
    q3: { actual: 0, projected: 0 },
    q4: { actual: 0, projected: 0 },
  }
}

function dataFixture(): FinanceMobileDashboardData {
  const clientItems = [300, 200, 100, 80, 70, 60, 50].map((amount, index) => ({
    id: `client-${index + 1}`,
    label: `Client ${index + 1}`,
    amount,
    sharePct: amount / 10,
  }))

  return {
    period: { fiscalYear: 2026, actualThrough: "2026-08-01", currency: "EUR" },
    objectives: { annualRevenue: 1_000, grossMarginPct: 32 },
    summary: { actualRevenue: 1_000, actualGrossMarginPct: 35, projectedLanding: 1_200, gapToTarget: 200, coveragePct: 120 },
    revenueByMonth: [],
    forecast: { securedProduction: 100, pipelineGross: 200, pipelineWeighted: 100 },
    distributions: {
      clients: {
        totalAmount: 1_000,
        attributedAmount: 860,
        unassignedAmount: 140,
        items: [...clientItems, { id: "non-attribue", label: "Non attribué", amount: 140, sharePct: 14 }],
      },
      practices: { totalAmount: 1_000, attributedAmount: 1_000, unassignedAmount: 0, items: [] },
      engagements: {
        totalAmount: 1_000,
        attributedAmount: 600,
        unassignedAmount: 400,
        items: [
          { id: "assistance_technique", label: "Assistance technique", amount: 500, sharePct: 50 },
          { id: "forfait", label: "Forfait", amount: 100, sharePct: 10 },
          { id: "non-attribue", label: "Non attribué", amount: 400, sharePct: 40 },
        ],
      },
    },
    productionByClient: [600, 500, 400, 300, 200, 100].map((value, index) => ({
      clientId: `client-${index + 1}`,
      clientName: `Client ${index + 1}`,
      quarters: quarters(value),
    })),
    risksAndGaps: [
      { id: "activity", kind: "activity", severity: "warning", title: "Activité", detail: "Sous cible", context: { clientId: "client-6", month: "2026-04-01" } },
      { id: "overdue", kind: "mission-ending", severity: "critical", title: "Retard", detail: "Actif", context: { clientId: "client-1", month: "2026-02-01" } },
    ],
  }
}

describe("visualisations Finance mobile", () => {
  it("conserve Top 5, agrège Autres et garde Non attribué", () => {
    const data = dataFixture()
    const items = buildContributionItems(data.distributions.clients, "clients")

    expect(items.map((item) => item.label)).toEqual([
      "Client 1",
      "Client 2",
      "Client 3",
      "Client 4",
      "Client 5",
      "Autres",
      "Non attribué",
    ])
    expect(items.find((item) => item.id === "autres")).toMatchObject({ amount: 110, sharePct: 11 })
  })

  it("nomme explicitement l’engagement non résolu Non classé", () => {
    const items = buildContributionItems(dataFixture().distributions.engagements, "engagements")
    expect(items.map((item) => item.label)).toEqual(["Assistance technique", "Forfait", "Non classé"])
  })

  it("agrège les clients secondaires sans perdre activité sous cible ni retard actif", () => {
    const rows = buildQuarterlyGridRows(dataFixture())
    const first = rows.find((row) => row.id === "client-1")
    const other = rows.find((row) => row.id === "autres")

    expect(rows).toHaveLength(6)
    expect(first?.overdueWarnings.has("q1")).toBe(true)
    expect(other?.quarters.q1.actual).toBe(100)
    expect(other?.activityWarnings.has("q2")).toBe(true)
  })
})
