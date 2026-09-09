import { readFileSync } from "node:fs"
import { resolve as resolvePath } from "node:path"
import { describe, expect, it } from "vitest"
import {
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

describe("resolveDesktopSidebarCollapsed", () => {
  const resolve = (
    preferredCollapsed: boolean,
    workspaceAutoCollapsed: boolean,
    intelligencePanelOpen: boolean,
    externalCollapseRequestCount: number,
  ) =>
    resolveDesktopSidebarCollapsed({
      preferredCollapsed,
      workspaceAutoCollapsed,
      intelligencePanelOpen,
      externalCollapseRequestCount,
    })

  it("aucune contrainte → suit la préférence utilisateur", () => {
    expect(resolve(false, false, false, 0)).toBe(false)
    expect(resolve(true, false, false, 0)).toBe(true)
  })

  it("workspace auto-replié → replié quelle que soit la préférence", () => {
    expect(resolve(false, true, false, 0)).toBe(true)
    expect(resolve(true, true, false, 0)).toBe(true)
  })

  it("Cockpit Intelligence ouvert → replié quelle que soit la préférence", () => {
    expect(resolve(false, false, true, 0)).toBe(true)
    expect(resolve(true, false, true, 0)).toBe(true)
  })

  it("un ou plusieurs verrous externes → replié", () => {
    expect(resolve(false, false, false, 1)).toBe(true)
    expect(resolve(false, false, false, 2)).toBe(true)
  })

  it("Cockpit Intelligence + verrou CRM sont composables et indépendants", () => {
    // les deux contraintes actives
    expect(resolve(false, false, true, 1)).toBe(true)
    // Cockpit Intelligence fermé, verrou CRM encore actif → toujours replié
    expect(resolve(false, false, false, 1)).toBe(true)
    // verrou CRM retombé, Cockpit Intelligence encore ouvert → toujours replié
    expect(resolve(false, false, true, 0)).toBe(true)
  })

  it("toutes les contraintes retombées → restauration de la préférence, sans mémorisation", () => {
    expect(resolve(false, false, false, 0)).toBe(false)
    expect(resolve(true, false, false, 0)).toBe(true)
  })
})

describe("Découplage Shell ↔ Cockpit Intelligence (SHELL 6.6)", () => {
  const read = (relPath: string) =>
    readFileSync(resolvePath(repoRoot, relPath), "utf8")

  it("IntelligencePanel n'importe plus useSidebarCollapse ni n'émet de verrou", () => {
    const source = read("src/components/intelligence/IntelligencePanel.tsx")
    expect(source).not.toContain("useSidebarCollapse")
    expect(source).not.toContain("requestCollapse")
    expect(source).not.toContain("requestRestore")
  })

  it("DesktopSidebar observe directement useIntelligencePanel", () => {
    const source = read("src/components/layout/DesktopSidebar.tsx")
    expect(source).toContain("useIntelligencePanel")
    expect(source).toContain("state.isOpen")
  })

  it("CrmTabbedShell reste le seul émetteur applicatif de verrous externes", () => {
    const source = read("src/components/accounts-contacts/CrmTabbedShell.tsx")
    expect(source).toContain("requestCollapse")
    expect(source).toContain("requestRestore")
  })
})
