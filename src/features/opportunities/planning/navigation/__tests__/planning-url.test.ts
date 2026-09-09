import { describe, expect, it } from "vitest"
import { buildPlanningHref } from "../planning-url"

describe("buildPlanningHref", () => {
  it("pose le chapitre planning et la sélection", () => {
    expect(buildPlanningHref("", "o1")).toBe("/missions/opps?section=planning&opp=o1")
    expect(buildPlanningHref("section=planning&opp=o1", "o2")).toBe(
      "/missions/opps?section=planning&opp=o2",
    )
  })

  it("retire l'état des chapitres frères sans perdre les paramètres tiers", () => {
    expect(
      buildPlanningHref(
        "section=besoins&scope=needs&view=planning&stage=qualification&theme=dark",
        "o1",
      ),
    ).toBe("/missions/opps?section=planning&theme=dark&opp=o1")
  })

  it("permet de retirer une sélection", () => {
    expect(buildPlanningHref("section=planning&opp=o1", null)).toBe(
      "/missions/opps?section=planning",
    )
  })
})
