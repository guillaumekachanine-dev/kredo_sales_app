import { describe, expect, it } from "vitest"
import {
  EMPTY_CURRENT_COMPANY_FACTS,
  getCurrentMultiFactTexts,
  getCurrentSingleFact,
  getCurrentSingleFactText,
  indexCurrentCompanyFacts,
  type CurrentCompanyFact,
} from "./company-facts-contract"

function fact(overrides: Partial<CurrentCompanyFact> = {}): CurrentCompanyFact {
  return {
    id: "fact-1",
    factType: "primary_activity",
    factSubtype: null,
    cardinality: "single",
    isCurrent: true,
    valueText: "Conseil opérationnel",
    valueJson: null,
    normalizedValue: "conseil operationnel",
    confidence: 0.92,
    primarySourceId: "source-1",
    sourceProposalId: "proposal-1",
    effectiveAt: "2026-08-01T00:00:00.000Z",
    expiresAt: null,
    verifiedAt: "2026-08-02T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  }
}

describe("indexCurrentCompanyFacts", () => {
  it("expose un single courant unique et conserve sa provenance", () => {
    const facts = indexCurrentCompanyFacts([fact()])
    const primaryActivity = getCurrentSingleFact(facts, "primary_activity")

    expect(getCurrentSingleFactText(facts, "primary_activity")).toBe("Conseil opérationnel")
    expect(primaryActivity).toMatchObject({
      confidence: 0.92,
      primarySourceId: "source-1",
      sourceProposalId: "proposal-1",
      verifiedAt: "2026-08-02T00:00:00.000Z",
    })
  })

  it("préserve plusieurs valeurs multi distinctes", () => {
    const facts = indexCurrentCompanyFacts([
      fact({ id: "market-1", factType: "market", cardinality: "multi", valueText: "France" }),
      fact({ id: "market-2", factType: "market", cardinality: "multi", valueText: "Europe" }),
    ])

    expect(getCurrentMultiFactTexts(facts, "market")).toEqual(["France", "Europe"])
  })

  it("ignore les facts non courants", () => {
    const facts = indexCurrentCompanyFacts([
      fact({ id: "obsolete", isCurrent: false, valueText: "Ancienne activité" }),
      fact({ id: "current", valueText: "Activité actuelle" }),
    ])

    expect(getCurrentSingleFactText(facts, "primary_activity")).toBe("Activité actuelle")
  })

  it("retourne une structure vide propre quand aucun fact n'est disponible", () => {
    expect(indexCurrentCompanyFacts([])).toEqual(EMPTY_CURRENT_COMPANY_FACTS)
    expect(getCurrentSingleFactText(EMPTY_CURRENT_COMPANY_FACTS, "primary_activity")).toBeNull()
    expect(getCurrentMultiFactTexts(EMPTY_CURRENT_COMPANY_FACTS, "market")).toEqual([])
  })
})
