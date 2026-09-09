import { describe, expect, it } from "vitest"
import {
  resolveDesktopSidebarCollapsed,
  shouldAutoCollapseDesktopSidebar,
} from "./desktop-sidebar-policy"

describe("shouldAutoCollapseDesktopSidebar", () => {
  const AUTO_COLLAPSED = [
    "/missions",
    "/missions/missions-at", // sous-route éventuelle
    "/missions/opps",
    "/missions/opps/some-id",
    "/consultants",
    "/consultants/pool-competences",
    "/finance",
    "/intelligence",
    "/intelligence/anything",
    "/prospection-intelligence",
    "/prospection-intelligence/xyz",
    "/reports",
    "/veille",
    "/knowledge",
    "/knowledge/expertise-kredo",
    "/automations",
  ]

  for (const pathname of AUTO_COLLAPSED) {
    it(`auto-replie ${pathname}`, () => {
      expect(shouldAutoCollapseDesktopSidebar(pathname)).toBe(true)
    })
  }

  const NOT_AUTO_COLLAPSED = [
    "/",
    "/cockpit",
    "/agenda",
    "/prospection/accounts",
    "/prospection/accounts/company-id",
    "/prospection", // redirige vers /prospection/accounts — pas un workspace secondaire
    "/settings",
  ]

  for (const pathname of NOT_AUTO_COLLAPSED) {
    it(`ne replie pas ${pathname}`, () => {
      expect(shouldAutoCollapseDesktopSidebar(pathname)).toBe(false)
    })
  }

  it("ignore le query/hash éventuel", () => {
    expect(shouldAutoCollapseDesktopSidebar("/missions?vue=missions-at")).toBe(true)
    expect(shouldAutoCollapseDesktopSidebar("/prospection/accounts?tab=home")).toBe(false)
  })

  it("gère un pathname vide", () => {
    expect(shouldAutoCollapseDesktopSidebar("")).toBe(false)
  })

  it("distingue /prospection-intelligence de /prospection/accounts", () => {
    expect(shouldAutoCollapseDesktopSidebar("/prospection-intelligence")).toBe(true)
    expect(shouldAutoCollapseDesktopSidebar("/prospection/accounts")).toBe(false)
  })
})

describe("resolveDesktopSidebarCollapsed", () => {
  const resolve = (
    preferredCollapsed: boolean,
    workspaceAutoCollapsed: boolean,
    externalCollapseRequestCount: number,
  ) =>
    resolveDesktopSidebarCollapsed({
      preferredCollapsed,
      workspaceAutoCollapsed,
      externalCollapseRequestCount,
    })

  it("aucune contrainte → suit la préférence utilisateur", () => {
    expect(resolve(false, false, 0)).toBe(false)
    expect(resolve(true, false, 0)).toBe(true)
  })

  it("workspace auto-replié → replié quelle que soit la préférence", () => {
    expect(resolve(false, true, 0)).toBe(true)
    expect(resolve(true, true, 0)).toBe(true)
  })

  it("un ou plusieurs verrous externes → replié", () => {
    expect(resolve(false, false, 1)).toBe(true)
    expect(resolve(false, false, 2)).toBe(true)
  })

  it("toutes les contraintes retombées → restauration de la préférence, sans mémorisation", () => {
    expect(resolve(false, false, 0)).toBe(false)
    expect(resolve(true, false, 0)).toBe(true)
  })
})
