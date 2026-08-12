import { describe, expect, it } from "vitest"
import { classifyCompetitiveMapResolution, type CompetitiveMapCandidate } from "./resolve-competitive-map-account"

function candidate(overrides: Partial<CompetitiveMapCandidate> = {}): CompetitiveMapCandidate {
  return {
    companyId: "c1",
    name: "Groupe Services France",
    siren: null,
    matchMethod: "fuzzy_name",
    matchScore: 0.5,
    ...overrides,
  }
}

describe("classifyCompetitiveMapResolution", () => {
  it("aucun candidat -> not_found", () => {
    expect(classifyCompetitiveMapResolution([])).toBe("not_found")
  })

  it("un candidat siren -> resolved", () => {
    expect(classifyCompetitiveMapResolution([candidate({ matchMethod: "siren", matchScore: 1 })])).toBe("resolved")
  })

  it("un candidat exact_name -> resolved", () => {
    expect(classifyCompetitiveMapResolution([candidate({ matchMethod: "exact_name", matchScore: 1 })])).toBe(
      "resolved",
    )
  })

  it("deux candidats exacts (doublon de raison sociale) -> ambiguous", () => {
    const candidates = [
      candidate({ companyId: "c1", matchMethod: "exact_name", matchScore: 1 }),
      candidate({ companyId: "c2", matchMethod: "exact_name", matchScore: 1 }),
    ]
    expect(classifyCompetitiveMapResolution(candidates)).toBe("ambiguous")
  })

  it("un seul candidat flou avec un score net (>=0.7) -> resolved", () => {
    expect(classifyCompetitiveMapResolution([candidate({ matchScore: 0.85 })])).toBe("resolved")
  })

  it("un candidat flou sous le seuil de confiance -> ambiguous", () => {
    expect(classifyCompetitiveMapResolution([candidate({ matchScore: 0.4 })])).toBe("ambiguous")
  })

  it("deux candidats flous aux scores proches -> ambiguous", () => {
    const candidates = [
      candidate({ companyId: "c1", matchScore: 0.75 }),
      candidate({ companyId: "c2", matchScore: 0.7 }),
    ]
    expect(classifyCompetitiveMapResolution(candidates)).toBe("ambiguous")
  })

  it("deux candidats flous avec un écart net -> resolved sur le meilleur", () => {
    const candidates = [
      candidate({ companyId: "c1", matchScore: 0.8 }),
      candidate({ companyId: "c2", matchScore: 0.4 }),
    ]
    expect(classifyCompetitiveMapResolution(candidates)).toBe("resolved")
  })

  it("l'ordre des candidats en entrée n'affecte pas le résultat", () => {
    const candidates = [
      candidate({ companyId: "c2", matchScore: 0.4 }),
      candidate({ companyId: "c1", matchScore: 0.8 }),
    ]
    expect(classifyCompetitiveMapResolution(candidates)).toBe("resolved")
  })
})
