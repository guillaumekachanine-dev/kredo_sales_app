import { describe, expect, it } from "vitest"
import { buildNeedsHref } from "../needs-url"

describe("buildNeedsHref — contrat URL du chapitre Besoins", () => {
  it("pose toujours section=besoins et retire scope/view", () => {
    expect(buildNeedsHref("")).toBe("/missions/opps?section=besoins")
    expect(buildNeedsHref("scope=staffing&view=kanban")).toBe("/missions/opps?section=besoins")
    expect(buildNeedsHref("section=synthese")).toBe("/missions/opps?section=besoins")
  })

  it("pose / met à jour / retire ?opp=", () => {
    expect(buildNeedsHref("section=besoins", { opp: "n1" })).toBe(
      "/missions/opps?section=besoins&opp=n1",
    )
    expect(buildNeedsHref("section=besoins&opp=n1", { opp: "n2" })).toBe(
      "/missions/opps?section=besoins&opp=n2",
    )
    expect(buildNeedsHref("section=besoins&opp=n1", { opp: null })).toBe(
      "/missions/opps?section=besoins",
    )
    // opp absent du patch → inchangé
    expect(buildNeedsHref("section=besoins&opp=n1", { filters: { stage: "gagne" } })).toBe(
      "/missions/opps?section=besoins&opp=n1&stage=gagne",
    )
  })

  it("applique les filtres présents dans le patch, retire ceux mis à null", () => {
    expect(
      buildNeedsHref("section=besoins", {
        filters: { stage: "cv_envoyes", priority: "haute", sort: "acv", direction: "asc" },
      }),
    ).toBe("/missions/opps?section=besoins&stage=cv_envoyes&priority=haute&sort=acv&direction=asc")

    expect(
      buildNeedsHref("section=besoins&stage=gagne&priority=haute&practice=Data", {
        filters: { stage: null, priority: null, practice: null, sort: null, direction: null },
      }),
    ).toBe("/missions/opps?section=besoins")

    // une clé absente du patch de filtres n'est pas touchée
    expect(
      buildNeedsHref("section=besoins&stage=gagne&priority=haute", { filters: { stage: null } }),
    ).toBe("/missions/opps?section=besoins&priority=haute")
  })

  it("préserve les query params tiers", () => {
    expect(buildNeedsHref("theme=dark&debug=1", { opp: "n1" })).toBe(
      "/missions/opps?theme=dark&debug=1&section=besoins&opp=n1",
    )
  })
})
