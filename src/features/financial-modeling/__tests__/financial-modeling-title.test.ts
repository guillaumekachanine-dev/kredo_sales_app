import { describe, expect, it } from "vitest"
import { buildFinancialModelTitle } from "../domain/financial-modeling-launch-preset"

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
})
