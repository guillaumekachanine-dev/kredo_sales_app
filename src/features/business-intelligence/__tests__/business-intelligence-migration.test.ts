import { existsSync, readFileSync } from "node:fs"
import { LEGACY_PERMANENT_REDIRECTS } from "@/lib/navigation/legacy-redirects"
import { describe, expect, it } from "vitest"
import {
  getActiveModuleHref,
  mainMenuItems,
} from "@/lib/navigation/main-menu.config"

const read = (path: string) => readFileSync(path, "utf8")

describe("Business Intelligence migration", () => {
  it("conserve Intelligence sur Desktop et applique le contrat mobile LOT 3", () => {
    const intelligenceItems = mainMenuItems
      .flatMap((item) => item.items ?? [item])
      .filter((item) => item.href === "/intelligence")

    expect(intelligenceItems).toHaveLength(1)
    expect(intelligenceItems[0]?.disabled).not.toBe(true)
    expect(intelligenceItems[0]?.comingSoon).not.toBe(true)
    expect(getActiveModuleHref("/intelligence")).toBe("/intelligence")

    const mobileMenu = read("src/components/layout/MobileNavigationMenu.tsx")
    const mobileBottomNav = read("src/components/layout/MobileBottomNav.tsx")
    expect(mobileMenu).not.toContain('href: "/intelligence", icon: "bi"')
    expect(mobileMenu).toContain('href: "/prospection-intelligence"')
    expect(mobileMenu).toContain('href: "/veille"')
    // Intelligence a été retirée de la bottom bar fixe au profit de la navigation 5 slots avec historique
    expect(mobileBottomNav).not.toContain('label: "Intelligence"')
  })

  // Audit d'ouverture des pages (O-5) : redirections servies par next.config.ts,
  // avant tout rendu, au lieu d'une page.tsx rendue sous (app)/loading.tsx.
  it.each([
    ["/prospection", "src/app/(app)/prospection/page.tsx"],
    ["/prospection/approche-sectorielle", "src/app/(app)/prospection/approche-sectorielle/page.tsx"],
    ["/prospection/approche-sectorielle/:slug", "src/app/(app)/prospection/approche-sectorielle/[slug]/page.tsx"],
    ["/prospection/sector-studies", "src/app/(app)/prospection/sector-studies/page.tsx"],
  ])("redirige définitivement la route legacy %s", (source, pagePath) => {
    expect(LEGACY_PERMANENT_REDIRECTS).toContainEqual({ source, destination: "/intelligence" })
    expect(existsSync(pagePath)).toBe(false)
  })

  it("migre les liens legacy sans toucher aux sous-routes CRM", () => {
    const migratedFiles = [
      "src/app/(app)/prospection/dashboard-lab/page.tsx",
      "src/app/(app)/ressources/playbook/[slug]/page.tsx",
      "src/components/prospection/dashboard-lab/AccountIntelligenceLab.tsx",
      "src/components/prospection/dashboard-lab/CommandCenterLab.tsx",
      "src/components/prospection/dashboard-lab/SectorSignalLab.tsx",
      "src/components/sector/PlaybookPage.tsx",
    ]

    for (const path of migratedFiles) {
      if (existsSync(path)) {
        expect(read(path)).not.toContain("/prospection/approche-sectorielle")
      }
    }
    expect(existsSync("src/app/(app)/prospection/accounts/page.tsx")).toBe(true)
    expect(existsSync("src/app/(app)/prospection/accounts/[companyId]/page.tsx")).toBe(true)
  })

  it("ne référence plus les composants legacy supprimés", () => {
    expect(existsSync("src/components/prospection/synthese/index.tsx")).toBe(false)
    expect(existsSync("src/components/prospection/sector-activation/SectorActivationDesktopView.tsx")).toBe(false)
    expect(existsSync("src/components/prospection/sector/index.tsx")).toBe(false)
    expect(existsSync("src/components/sector/SectorDetailView.tsx")).toBe(false)
    expect(existsSync("src/lib/prospection/prospection-summary-data.ts")).toBe(false)
    expect(existsSync("src/lib/prospection/sector-activation-data.ts")).toBe(false)
  })
})
