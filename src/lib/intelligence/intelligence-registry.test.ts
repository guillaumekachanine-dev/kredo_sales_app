import { describe, expect, it } from "vitest"

import { MONTHLY_WATCH_MISSION_ACTION_ID } from "@/features/intelligence-missions/components/mission-composer-model"
import { resolveIntelligenceActions } from "./intelligence-registry"

describe("intelligence registry — monthly watch mission", () => {
  it("exposes the active mission only on /veille", () => {
    const veille = resolveIntelligenceActions("/veille")
    expect(veille.contextualActions).toContainEqual(expect.objectContaining({
      id: MONTHLY_WATCH_MISSION_ACTION_ID,
      label: "Analyse mensuelle de la veille",
      status: "active",
    }))
  })

  it.each(["/cockpit", "/prospection", "/finance", "/reports"])("does not inject the mission globally on %s", (pathname) => {
    expect(resolveIntelligenceActions(pathname).contextualActions.map((action) => action.id))
      .not.toContain(MONTHLY_WATCH_MISSION_ACTION_ID)
  })

  it("keeps the existing common actions on /veille", () => {
    expect(resolveIntelligenceActions("/veille").commonActions.length).toBeGreaterThan(0)
  })
})
