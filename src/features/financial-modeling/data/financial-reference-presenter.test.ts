import { describe, expect, it } from "vitest"
import { presentFinancialReference } from "./financial-reference-presenter"

describe("presentFinancialReference", () => {
  it("returns only the active reference fields consumed by the UI", () => {
    const reference = presentFinancialReference({
      id: "model-1",
      title: "Référence Product Owner",
      resource_label: "Élodie R.",
      profile_name_snapshot: "Product Owner",
      start_date: "2026-07-16",
      end_date: "2026-12-31",
      production_days: 108.9,
      sale_daily_rate: 600,
      revenue_total: 65340,
      gross_margin_pct: 39.09,
      status: "reference",
    }, {
      documentId: "document-1",
      account: "CHU de Nice",
      opportunity: "Interopérabilité SIH",
    })

    expect(reference).toEqual({
      modelId: "model-1",
      documentId: "document-1",
      title: "Référence Product Owner",
      account: "CHU de Nice",
      opportunity: "Interopérabilité SIH",
      resource: "Élodie R.",
      profile: "Product Owner",
      startDate: "2026-07-16",
      endDate: "2026-12-31",
      productionDays: 108.9,
      saleDailyRate: 600,
      projectedRevenue: 65340,
      grossMarginPct: 39.09,
      status: "reference",
    })
  })
})
