import { describe, expect, it } from "vitest"

import { MONTHLY_WATCH_MISSION_ACTION_ID } from "@/features/intelligence-missions/components/mission-composer-model"
import {
  doesCockpitPatternMatch,
  resolveCockpitDisplayMode,
  resolveEntityActions,
  resolvePageCockpitConfig,
} from "./intelligence-registry"

describe("Cockpit Intelligence registry", () => {
  it("exposes only the explicitly configured actions and modules", () => {
    const veille = resolvePageCockpitConfig("/veille")
    expect(veille.actions).toEqual([
      expect.objectContaining({
        id: MONTHLY_WATCH_MISSION_ACTION_ID,
        label: "Analyse mensuelle de la veille",
        status: "active",
      }),
    ])
    expect(veille.modules).toEqual([])
    expect(veille).not.toHaveProperty("commonActions")
  })

  it.each(["/cockpit", "/prospection-intelligence", "/finance", "/reports"])(
    "does not inject the monthly watch mission on %s",
    (pathname) => {
      expect(resolvePageCockpitConfig(pathname).actions.map((action) => action.id))
        .not.toContain(MONTHLY_WATCH_MISSION_ACTION_ID)
    },
  )

  it("keeps actions and modules attached to one page configuration", () => {
    const finance = resolvePageCockpitConfig("/finance/previsions")

    expect(finance.label).toBe("Finance")
    expect(finance.actions.map((action) => action.id)).toEqual([
      "analyze_margins",
      "forecast_revenue",
      "detect_anomalies",
    ])
    expect(finance.modules).toEqual([
      expect.objectContaining({ id: "financial_modeling", status: "active", href: "/finance" }),
    ])
  })

  it("returns a factual empty configuration for an unmapped page", () => {
    expect(resolvePageCockpitConfig("/unknown")).toEqual({
      config: null,
      label: "Navigation",
      actions: [],
      modules: [],
    })
  })
})

describe("Cockpit Intelligence route resolution", () => {
  it("matches route boundaries instead of arbitrary prefixes", () => {
    expect(doesCockpitPatternMatch("/prospection", "/prospection")).toBe(true)
    expect(doesCockpitPatternMatch("/prospection/accounts", "/prospection")).toBe(true)
    expect(doesCockpitPatternMatch("/prospection-intelligence", "/prospection")).toBe(false)
    expect(resolvePageCockpitConfig("/prospection-intelligence").label).toBe("Prospection Intelligence")
  })

  it("lets the most specific route win", () => {
    expect(resolvePageCockpitConfig("/missions/opps").label).toBe("Besoins & Staffing")
    expect(resolvePageCockpitConfig("/missions/opps/abc").label).toBe("Besoins & Staffing")
    expect(resolvePageCockpitConfig("/missions/actives").label).toBe("Engagements")
  })

  it("supports one dynamic segment without swallowing its listing page", () => {
    expect(resolvePageCockpitConfig("/prospection/accounts").label).toBe("Comptes & contacts")
    expect(resolvePageCockpitConfig("/prospection/accounts/company-123").label).toBe("Fiche compte")
    expect(resolvePageCockpitConfig("/prospection/accounts/company-123/contacts").label).toBe("Fiche compte")
  })

  it("keeps all consultants tabs in the Équipe family", () => {
    const parent = resolvePageCockpitConfig("/consultants")

    for (const pathname of [
      "/consultants/pool-competences",
      "/consultants/activite-conges",
      "/consultants/activite-conges?tab=absences",
    ]) {
      const child = resolvePageCockpitConfig(pathname)
      expect(child.label).toBe("Équipe")
      expect(child.actions.map((action) => action.id)).toEqual(parent.actions.map((action) => action.id))
      expect(child.modules.map((module) => module.id)).toEqual(parent.modules.map((module) => module.id))
    }
  })
})

describe("Cockpit Intelligence transition guards", () => {
  it("never resolves a company context to the generic page registry", () => {
    expect(resolveCockpitDisplayMode("company")).toBe("company")
    expect(resolveCockpitDisplayMode("mission")).toBe("entity")
    expect(resolveCockpitDisplayMode(null)).toBe("page")
  })

  it("does not inject universal actions in entity mode", () => {
    const mission = resolveEntityActions("mission")
    expect(mission.actions.map((action) => action.id)).toEqual([
      "detect_risks",
      "analyze_margins",
      "forecast_revenue",
    ])
    expect(mission).not.toHaveProperty("commonActions")
  })
})
