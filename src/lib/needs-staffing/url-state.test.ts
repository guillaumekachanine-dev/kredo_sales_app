import { describe, expect, it } from "vitest"
import {
  buildNeedsStaffingUrl,
  parseNeedsStaffingUrlState,
  resolveLegacyStaffingRedirect,
  writeNeedsStaffingUrlState,
} from "./url-state"

describe("needs staffing url state", () => {
  it("parses default values when query is empty", () => {
    expect(parseNeedsStaffingUrlState(new URLSearchParams())).toEqual({
      scope: "needs",
      view: "list",
      stage: null,
      priority: null,
      practice: null,
      sort: null,
      direction: null,
    })
  })

  it("serializes the canonical missions/opps URL", () => {
    const url = buildNeedsStaffingUrl("/missions/opps", {
      scope: "staffing",
      view: "planning",
      stage: "envoye_client",
      priority: "haute",
      practice: "Data",
      sort: "acv",
      direction: "desc",
    })

    expect(url).toBe("/missions/opps?scope=staffing&view=planning&stage=envoye_client&priority=haute&practice=Data&sort=acv&direction=desc")
  })

  it("round-trips supported filters through URLSearchParams", () => {
    const params = writeNeedsStaffingUrlState({
      scope: "needs",
      view: "kanban",
      stage: "qualification",
      priority: "normale",
      practice: "Cloud",
      sort: "acv",
      direction: "asc",
    })

    expect(parseNeedsStaffingUrlState(params)).toEqual({
      scope: "needs",
      view: "kanban",
      stage: "qualification",
      priority: "normale",
      practice: "Cloud",
      sort: "acv",
      direction: "asc",
    })
  })

  it("redirects /staffing to /missions/opps while preserving deep-link params", () => {
    expect(resolveLegacyStaffingRedirect({
      view: "kanban",
      stage: "preselectionne",
      priority: "haute",
      practice: "Digital",
    })).toBe("/missions/opps?scope=staffing&view=kanban&stage=preselectionne&priority=haute&practice=Digital")
  })
})
