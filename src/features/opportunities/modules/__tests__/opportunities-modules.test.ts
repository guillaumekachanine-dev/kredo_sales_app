import { describe, expect, it } from "vitest"
import {
  buildOpportunitiesModuleHref,
  OPPORTUNITIES_MODULE_KEYS,
  OPPORTUNITIES_MODULE_LABELS,
  parseOpportunitiesModule,
} from "../opportunities-modules"
import { OPPORTUNITIES_CANONICAL_PATH } from "../../navigation/opportunities-sections"

const sp = (q: string) => new URLSearchParams(q)

describe("modules — les 3 sont constamment disponibles (indépendants de l'onglet)", () => {
  it("ordre canonique stable du rail", () => {
    expect([...OPPORTUNITIES_MODULE_KEYS]).toEqual(["matching", "simulation", "post-mortem"])
  })

  it("chaque module a un libellé conforme à la cible", () => {
    expect(OPPORTUNITIES_MODULE_LABELS).toEqual({
      matching: "Matching profils",
      simulation: "Simulation financière",
      "post-mortem": "Revue post-mortem",
    })
  })
})

describe("parseOpportunitiesModule — déterministe, sans dépendance au chapitre", () => {
  it("valeur absente / vide / inconnue → null", () => {
    expect(parseOpportunitiesModule({})).toBeNull()
    expect(parseOpportunitiesModule({ module: "" })).toBeNull()
    expect(parseOpportunitiesModule({ module: "inconnu" })).toBeNull()
    expect(parseOpportunitiesModule(sp("module=matchingx"))).toBeNull()
  })

  it("module valide → le module, quel que soit le contexte", () => {
    expect(parseOpportunitiesModule({ module: "matching" })).toBe("matching")
    expect(parseOpportunitiesModule(sp("section=synthese&module=matching"))).toBe("matching")
    expect(parseOpportunitiesModule(sp("module=simulation"))).toBe("simulation")
    expect(parseOpportunitiesModule({ module: "post-mortem" })).toBe("post-mortem")
  })

  it("lit la première valeur d'un paramètre répété", () => {
    expect(parseOpportunitiesModule({ module: ["simulation", "matching"] })).toBe("simulation")
  })
})

describe("buildOpportunitiesModuleHref — orthogonal à section / opp / tiers", () => {
  it("pose module en préservant section, opp et les params tiers", () => {
    expect(
      buildOpportunitiesModuleHref(
        OPPORTUNITIES_CANONICAL_PATH,
        sp("section=besoins&opp=need-1&debug=1"),
        "matching",
      ),
    ).toBe("/missions/opps?section=besoins&opp=need-1&debug=1&module=matching")
  })

  it("disponible aussi depuis la Synthèse (aucune section requise)", () => {
    expect(
      buildOpportunitiesModuleHref(OPPORTUNITIES_CANONICAL_PATH, sp(""), "post-mortem"),
    ).toBe("/missions/opps?module=post-mortem")
  })

  it("remplace un module déjà posé", () => {
    expect(
      buildOpportunitiesModuleHref(
        OPPORTUNITIES_CANONICAL_PATH,
        sp("section=planning&opp=o1&module=matching"),
        "simulation",
      ),
    ).toBe("/missions/opps?section=planning&opp=o1&module=simulation")
  })

  it("nextModule null = closeHref : retire module, garde le reste", () => {
    expect(
      buildOpportunitiesModuleHref(
        OPPORTUNITIES_CANONICAL_PATH,
        sp("section=besoins&opp=need-1&module=matching"),
        null,
      ),
    ).toBe("/missions/opps?section=besoins&opp=need-1")
  })

  it("closeHref depuis la racine nue → chemin sans query", () => {
    expect(
      buildOpportunitiesModuleHref(OPPORTUNITIES_CANONICAL_PATH, sp("module=post-mortem"), null),
    ).toBe("/missions/opps")
  })
})
