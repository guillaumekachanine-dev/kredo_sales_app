import { readFileSync } from "node:fs"
import { resolve as resolvePath } from "node:path"
import { describe, expect, it } from "vitest"
import {
  isAccountCockpitPathname,
  resolveDesktopSidebarCollapsed,
  shouldAutoCollapseDesktopSidebar,
} from "./desktop-sidebar-policy"

const repoRoot = process.cwd()

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

describe("isAccountCockpitPathname", () => {
  it.each([
    "/prospection/accounts/company-id",
    "/prospection/accounts/company-id?aiSection=secteur",
    "/prospection/accounts/company-id/contacts",
  ])("reconnaît la fiche compte ouverte par URL %s", (pathname) => {
    expect(isAccountCockpitPathname(pathname)).toBe(true)
  })

  it.each(["", "/prospection/accounts", "/prospection/accounts?tab=contacts", "/prospection-intelligence"])(
    "ne reconnaît pas %s",
    (pathname) => {
      expect(isAccountCockpitPathname(pathname)).toBe(false)
    },
  )
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

  it("verrou CRM retombé → restauration de la préférence, sans mémorisation", () => {
    expect(resolve(false, false, 0)).toBe(false)
    expect(resolve(true, false, 0)).toBe(true)
  })
})

describe("Découplage Shell ↔ Cockpit Intelligence (overlay)", () => {
  const read = (relPath: string) =>
    readFileSync(resolvePath(repoRoot, relPath), "utf8")

  it("IntelligencePanel n'importe plus useSidebarCollapse ni n'émet de verrou", () => {
    const source = read("src/components/intelligence/IntelligencePanel.tsx")
    expect(source).not.toContain("useSidebarCollapse")
    expect(source).not.toContain("requestCollapse")
    expect(source).not.toContain("requestRestore")
  })

  it("DesktopSidebar n'observe plus useIntelligencePanel — l'ouverture du Cockpit ne pilote plus son repli", () => {
    const source = read("src/components/layout/DesktopSidebar.tsx")
    expect(source).not.toContain("useIntelligencePanel")
  })

  it("IntelligencePanel est un overlay absolute hors flux, pas un sibling flex", () => {
    const source = read("src/components/intelligence/IntelligencePanel.tsx")
    expect(source).toContain("absolute")
    expect(source).toContain("inset-y-0")
    expect(source).not.toContain("shrink-0 overflow-y-auto")
  })

  it("CrmTabbedShell reste le seul émetteur applicatif de verrous externes", () => {
    const source = read("src/components/accounts-contacts/CrmTabbedShell.tsx")
    expect(source).toContain("requestCollapse")
    expect(source).toContain("requestRestore")
  })
})
