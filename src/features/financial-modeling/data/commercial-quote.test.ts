import { describe, expect, it } from "vitest"
import {
  commercialQuoteContent,
  createCommercialQuoteDraft,
  isSameCommercialQuoteContent,
} from "./commercial-quote"

const reference = {
  modelId: "model-1", documentId: "reference-1", title: "Référence", account: "Compte", opportunity: "Opportunité", resource: "Alex Martin", profile: "Consultant", startDate: "2026-07-16", endDate: "2026-12-31", productionDays: 108, saleDailyRate: 600, projectedRevenue: 64800, grossMarginPct: 30, status: "reference",
}

describe("commercial quote draft", () => {
  it("keeps only commercial values from the financial reference", () => {
    const quote = createCommercialQuoteDraft(reference, "quote-1")
    expect(quote).toMatchObject({ documentId: "quote-1", modelId: "model-1", totalExcludingTax: 64800, dailyRate: 600, currency: "EUR" })
    expect(commercialQuoteContent(quote)).not.toHaveProperty("grossMarginPct")
  })

  it("detects whether a new document version is needed", () => {
    const quote = createCommercialQuoteDraft(reference, "quote-1")
    expect(isSameCommercialQuoteContent(commercialQuoteContent(quote), quote)).toBe(true)
    expect(isSameCommercialQuoteContent({ ...commercialQuoteContent(quote), notes: "modifié" }, quote)).toBe(false)
  })
})
