import { describe, expect, it } from "vitest"

import {
  filterMatchableOpportunities,
  selectMatchableOpportunities,
  type MatchableOpportunityRow,
} from "./matchable-opportunities"

function row(overrides: Partial<MatchableOpportunityRow> = {}): MatchableOpportunityRow {
  return {
    id: "opp-1",
    title: "Besoin Data Engineer",
    stage: "qualification",
    requires_staffing: true,
    updated_at: "2026-08-01T00:00:00.000Z",
    companies: { name: "Acme" },
    ...overrides,
  }
}

describe("selectMatchableOpportunities", () => {
  it("excludes closed needs", () => {
    const rows = [
      row({ id: "open", stage: "recherche_profil" }),
      row({ id: "won", stage: "gagne" }),
      row({ id: "lost", stage: "perdu" }),
      row({ id: "dropped", stage: "abandonne" }),
      row({ id: "legacy-won", stage: "win" }),
      row({ id: "legacy-lost", stage: "lost" }),
    ]

    expect(selectMatchableOpportunities(rows).map((o) => o.id)).toEqual(["open"])
  })

  // Le piège : `detection` et `besoin_confirme` sont canoniques côté base mais
  // absentes de OPPORTUNITY_STAGES. Une liste blanche d'étapes ouvertes les
  // ferait disparaître du sélecteur sans la moindre erreur.
  it("keeps canonical stages that the stage referential does not know", () => {
    const rows = [row({ id: "a", stage: "detection" }), row({ id: "b", stage: "besoin_confirme" })]

    expect(selectMatchableOpportunities(rows).map((o) => o.id)).toEqual(["a", "b"])
  })

  it("drops needs that explicitly require no staffing, and rows without a title", () => {
    const rows = [
      row({ id: "no-staffing", requires_staffing: false }),
      row({ id: "untitled", title: null }),
      row({ id: "kept" }),
    ]

    expect(selectMatchableOpportunities(rows).map((o) => o.id)).toEqual(["kept"])
  })

  it("orders by most recently updated and resolves company and stage labels", () => {
    const rows = [
      row({ id: "old", updated_at: "2026-01-01T00:00:00.000Z" }),
      row({ id: "recent", updated_at: "2026-09-01T00:00:00.000Z", companies: [{ name: "Globex" }] }),
    ]

    const selected = selectMatchableOpportunities(rows)
    expect(selected.map((o) => o.id)).toEqual(["recent", "old"])
    expect(selected[0].companyName).toBe("Globex")
    expect(selected[0].stageLabel).toBe("Qualification")
  })
})

describe("filterMatchableOpportunities", () => {
  const opportunities = selectMatchableOpportunities([
    row({ id: "a", title: "Data Engineer", companies: { name: "Acme" } }),
    row({ id: "b", title: "Architecte Cloud", companies: { name: "Globex" } }),
  ])

  it("returns everything on an empty query", () => {
    expect(filterMatchableOpportunities(opportunities, "  ")).toHaveLength(2)
  })

  it("matches on need title and on client name", () => {
    expect(filterMatchableOpportunities(opportunities, "cloud").map((o) => o.id)).toEqual(["b"])
    expect(filterMatchableOpportunities(opportunities, "acme").map((o) => o.id)).toEqual(["a"])
  })
})
