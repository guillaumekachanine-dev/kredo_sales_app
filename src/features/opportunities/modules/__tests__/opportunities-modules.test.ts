import { describe, expect, it } from "vitest"
import {
  buildOpportunitiesModuleHref,
  OPPORTUNITIES_MODULE_KEYS,
  OPPORTUNITIES_MODULE_LABELS,
  opportunitiesModulesForSection,
  parseOpportunitiesModule,
} from "../opportunities-modules"
import { OPPORTUNITIES_CANONICAL_PATH } from "../../navigation/opportunities-sections"

const sp = (q: string) => new URLSearchParams(q)

describe("opportunitiesModulesForSection — applicabilité (§ 13, aucun bouton mort)", () => {
  it("Synthèse / Avant-vente : Simulation + Post-Mortem seulement (pas de contexte opportunité)", () => {
    expect(opportunitiesModulesForSection("synthese")).toEqual(["simulation", "post-mortem"])
    expect(opportunitiesModulesForSection("avant-vente")).toEqual(["simulation", "post-mortem"])
  })

  it("Besoins / Planning : les 3 modules (opportunité sélectionnée en contexte)", () => {
    expect(opportunitiesModulesForSection("besoins")).toEqual([
      "matching",
      "simulation",
      "post-mortem",
    ])
    expect(opportunitiesModulesForSection("planning")).toEqual([
      "matching",
      "simulation",
      "post-mortem",
    ])
  })

  it("respecte l'ordre canonique du rail", () => {
    expect([...OPPORTUNITIES_MODULE_KEYS]).toEqual(["matching", "simulation", "post-mortem"])
    for (const key of OPPORTUNITIES_MODULE_KEYS) {
      expect(OPPORTUNITIES_MODULE_LABELS[key]).toBeTruthy()
    }
  })
})

describe("parseOpportunitiesModule — déterministe + gardé par le chapitre", () => {
  it("valeur absente / vide / inconnue → null", () => {
    expect(parseOpportunitiesModule({}, "besoins")).toBeNull()
    expect(parseOpportunitiesModule({ module: "" }, "besoins")).toBeNull()
    expect(parseOpportunitiesModule({ module: "inconnu" }, "besoins")).toBeNull()
    expect(parseOpportunitiesModule(sp("module=matchingx"), "besoins")).toBeNull()
  })

  it("module valide et applicable → le module", () => {
    expect(parseOpportunitiesModule({ module: "matching" }, "besoins")).toBe("matching")
    expect(parseOpportunitiesModule(sp("module=simulation"), "synthese")).toBe("simulation")
    expect(parseOpportunitiesModule({ module: "post-mortem" }, "avant-vente")).toBe("post-mortem")
  })

  it("module valide mais NON applicable au chapitre → null (aucun overlay fantôme)", () => {
    expect(parseOpportunitiesModule({ module: "matching" }, "synthese")).toBeNull()
    expect(parseOpportunitiesModule({ module: "matching" }, "avant-vente")).toBeNull()
  })

  it("lit la première valeur d'un paramètre répété", () => {
    expect(parseOpportunitiesModule({ module: ["simulation", "matching"] }, "planning")).toBe(
      "simulation",
    )
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
