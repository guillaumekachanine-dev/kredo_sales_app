import { describe, expect, it } from "vitest"

import {
  MISSION_COMPOSER_ACTION_CONFIGS,
  MONTHLY_WATCH_MISSION_ACTION_ID,
} from "@/features/intelligence-missions/components/mission-composer-model"
import { isDeterministicIntelligenceAction } from "@/components/intelligence/action-results/IntelligenceActionResultContent"
import { MODULE_LAUNCHERS } from "@/components/intelligence/cockpit-mobile/CockpitIntelligenceMobileContent"
import {
  PAGE_COCKPIT_CONFIGS,
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
      expect.objectContaining({ id: "cross_analysis", status: "active" }),
    ])
    expect(veille.modules).toEqual([
      expect.objectContaining({ id: "source_management", status: "coming_soon", kind: "launcher" }),
    ])
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
      expect.objectContaining({ id: "portfolio_atlas", status: "coming_soon", kind: "launcher" }),
      expect.objectContaining({
        id: "activity_leave",
        status: "active",
        kind: "route",
        href: "/consultants/activite-conges",
      }),
    ])
  })

  // Lot A — invariant de non-régression : toute entrée du registre porte un handler
  // réel. `coming_soon` reste autorisé (l'inverse serait un bouton actif fictif),
  // mais un id `active` sans moteur déterministe, sans composeur de mission et sans
  // handler nommé dans IntelligenceActionCard est exactement ce que le programme
  // interdit.
  it("never exposes an active action without a real handler", () => {
    const HANDLED_WITHOUT_ENGINE = new Set([
      "common_report",
      "activity_report",
      "weekly_brief",
      "common_write_email",
      // Lot D — composeur de matching (picker de besoin + moteur déterministe).
      "match_profiles",
      // Adaptateurs Lot C — handlers nommés dans IntelligenceActionCard.
      "prepare_meeting",
      "prepare_candidate",
      "candidate_communication",
      "manual_analysis",
      "cross_analysis",
    ])

    const pathnames = PAGE_COCKPIT_CONFIGS.map((config) => config.pattern.replace(/:[^/]+/g, "sample"))

    for (const pathname of pathnames) {
      for (const action of resolvePageCockpitConfig(pathname).actions) {
        if (action.status !== "active") continue

        const isHandled =
          isDeterministicIntelligenceAction(action.id) ||
          action.id in MISSION_COMPOSER_ACTION_CONFIGS ||
          HANDLED_WITHOUT_ENGINE.has(action.id)

        expect(isHandled, `${action.id} (${pathname}) est actif sans handler`).toBe(true)
      }
    }
  })

  // Lot B — pendant module de l'invariant d'action : un module `route` doit avoir
  // une destination, et un module `launcher` actif doit avoir une implémentation
  // montable depuis le panneau. Sans ça on livre une carte cliquable sans effet.
  it("never exposes a module without a real destination", () => {
    for (const config of PAGE_COCKPIT_CONFIGS) {
      for (const entry of resolvePageCockpitConfig(config.pattern.replace(/:[^/]+/g, "sample")).modules) {
        if (entry.kind === "route") {
          expect(entry.href, `${entry.id} est une route sans href`).toBeTruthy()
          continue
        }
        if (entry.status !== "active") continue
        expect(
          entry.id in MODULE_LAUNCHERS,
          `${entry.id} est un launcher actif sans implémentation`,
        ).toBe(true)
      }
    }
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

  it("aligns the Équipe and Recrutement configurations on the target matrix", () => {
    expect(resolvePageCockpitConfig("/consultants").actions.map((action) => action.id)).toEqual([
      "forecast_availability",
      "analyze_needs",
      "match_profiles",
      "analyze_activity",
    ])
    expect(resolvePageCockpitConfig("/recruitment").actions.map((action) => action.id)).toEqual([
      "analyze_hiring_delays",
      "analyze_needs",
      "candidate_communication",
      "match_profiles",
      "analyze_funnel",
    ])
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
