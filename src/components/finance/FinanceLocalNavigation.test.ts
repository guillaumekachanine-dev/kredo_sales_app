import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  FINANCE_DESKTOP_CHAPTERS,
  FINANCE_CONTEXTUAL_MODULES,
  FinanceLocalNavigation,
  buildFinanceHref,
  buildFinanceModuleHref,
  buildFinanceRailProps,
  getFinanceDesktopChapterLabel,
  parseFinanceTab,
  parseFinanceModule,
  type FinanceTabId,
  type FinanceModuleId,
} from "./FinanceLocalNavigation"
import { MissionProfitabilityTable } from "./MissionProfitabilityTable"
import type { MissionProfitabilityRow } from "@/lib/finance/finance-data"

const root = process.cwd()

function renderNavigation(options?: {
  active?: FinanceTabId
  activeModule?: FinanceModuleId | null
  onChange?: (tab: FinanceTabId) => void
  onModuleSelect?: (module: FinanceModuleId) => void
}) {
  return renderToStaticMarkup(
    React.createElement(FinanceLocalNavigation, {
      active: options?.active ?? "synthesis",
      activeModule: options?.activeModule,
      onChange: options?.onChange ?? (() => {}),
      onModuleSelect: options?.onModuleSelect ?? (() => {}),
    }),
  )
}

describe("FinanceLocalNavigation", () => {
  const desktopSource = readFileSync(
    resolve(root, "src/components/finance/FinanceDesktopDashboard.tsx"),
    "utf8",
  )
  const navigationSource = readFileSync(
    resolve(root, "src/components/finance/FinanceLocalNavigation.tsx"),
    "utf8",
  )
  const indexSource = readFileSync(
    resolve(root, "src/components/finance/index.tsx"),
    "utf8",
  )
  const mobileSource = readFileSync(
    resolve(root, "src/components/finance/FinanceMobileDashboard.tsx"),
    "utf8",
  )

  it("utilise le SectionRail canonique avec le chapeau Finance", () => {
    const html = renderNavigation()

    expect(navigationSource).toContain("<SectionRail")
    expect(html).toContain('aria-label="Navigation locale Finance"')
    expect(html).toContain("w-[11.5rem]")
    expect(html).toContain("bg-edito-navy")
    expect(html).toContain("Finance")
    expect(html).toContain(">Chapitres<")
  })

  it("ramène l'action Home à la section racine synthesis", () => {
    const onChange = vi.fn()
    const model = buildFinanceRailProps({ active: "profitability", onChange })

    model.home.onSelect?.()

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("synthesis")
  })

  it("préserve les trois chapitres cibles dans l'ordre exact avec les labels cibles", () => {
    expect(FINANCE_DESKTOP_CHAPTERS.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "synthesis", label: "Synthèse" },
      { key: "profitability", label: "Rentabilité P&L" },
      { key: "forecast", label: "Forecast" },
    ])

    const model = buildFinanceRailProps({ active: "synthesis", onChange: () => {} })
    expect(model.chapters.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "synthesis", label: "Synthèse" },
      { key: "profitability", label: "Rentabilité P&L" },
      { key: "forecast", label: "Forecast" },
    ])
  })

  it("expose le module Simulation financière comme seul module contextuel REUSE", () => {
    expect(FINANCE_CONTEXTUAL_MODULES.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "simulation", label: "Simulation financière" },
    ])

    const model = buildFinanceRailProps({ active: "synthesis", onChange: () => {} })
    expect(model.contextualModules?.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "simulation", label: "Simulation financière" },
    ])
  })

  it("reflète correctement l'attribut aria-current='page' selon l'état actif", () => {
    const modelSynthesis = buildFinanceRailProps({
      active: "synthesis",
      onChange: () => {},
    })
    expect(modelSynthesis.chapters.find((c) => c.key === "synthesis")?.active).toBe(true)
    expect(modelSynthesis.chapters.find((c) => c.key === "profitability")?.active).toBe(false)
    expect(modelSynthesis.chapters.find((c) => c.key === "forecast")?.active).toBe(false)

    const htmlSynthesis = renderNavigation({ active: "synthesis" })
    expect(htmlSynthesis).toMatch(/aria-current="page"[^>]*><span[^>]*>Synthèse<\/span>/)

    const modelProfitability = buildFinanceRailProps({
      active: "profitability",
      onChange: () => {},
    })
    expect(modelProfitability.chapters.find((c) => c.key === "profitability")?.active).toBe(true)
    expect(modelProfitability.chapters.find((c) => c.key === "synthesis")?.active).toBe(false)

    const htmlProfitability = renderNavigation({ active: "profitability" })
    expect(htmlProfitability).toMatch(
      /aria-current="page"[^>]*><span[^>]*>Rentabilité P&amp;L<\/span>/,
    )

    const modelForecast = buildFinanceRailProps({
      active: "forecast",
      onChange: () => {},
    })
    expect(modelForecast.chapters.find((c) => c.key === "forecast")?.active).toBe(true)
    expect(modelForecast.chapters.find((c) => c.key === "synthesis")?.active).toBe(false)

    const htmlForecast = renderNavigation({ active: "forecast" })
    expect(htmlForecast).toMatch(
      /aria-current="page"[^>]*><span[^>]*>Forecast<\/span>/,
    )
  })

  it("rend la section Modules avec le module Simulation financière", () => {
    const html = renderNavigation()
    expect(html).toContain(">Modules<")
    expect(html).toContain("Simulation financière")
  })

  it("résout le titre actif via getFinanceDesktopChapterLabel", () => {
    expect(getFinanceDesktopChapterLabel("synthesis")).toBe("Synthèse")
    expect(getFinanceDesktopChapterLabel("profitability")).toBe("Rentabilité P&L")
    expect(getFinanceDesktopChapterLabel("forecast")).toBe("Forecast")
    expect(getFinanceDesktopChapterLabel("unknown" as unknown as FinanceTabId)).toBe("Synthèse")
  })

  it("constate l'absence de barre horizontale FinanceTabs Desktop après migration et la suppression du fichier legacy", () => {
    expect(existsSync(resolve(root, "src/components/finance/FinanceTabs.tsx"))).toBe(false)
    expect(desktopSource).not.toContain("FinanceTabs")
    expect(desktopSource).not.toContain("<FinanceTabs")
  })

  it("résout l'état actif depuis l'URL avec parseFinanceTab", () => {
    expect(parseFinanceTab(null)).toBe("synthesis")
    expect(parseFinanceTab(undefined)).toBe("synthesis")
    expect(parseFinanceTab("")).toBe("synthesis")
    expect(parseFinanceTab("synthesis")).toBe("synthesis")
    expect(parseFinanceTab("profitability")).toBe("profitability")
    expect(parseFinanceTab("forecast")).toBe("forecast")
    expect(parseFinanceTab("unknown")).toBe("synthesis")
    expect(parseFinanceTab("other_tab")).toBe("synthesis")
  })

  it("résout le module depuis l'URL avec parseFinanceModule", () => {
    expect(parseFinanceModule(null)).toBeNull()
    expect(parseFinanceModule(undefined)).toBeNull()
    expect(parseFinanceModule("")).toBeNull()
    expect(parseFinanceModule("simulation")).toBe("simulation")
    expect(parseFinanceModule("unknown")).toBeNull()
  })

  it("construit l'URL avec buildFinanceHref (suppression de tab pour synthesis et préservation des autres params)", () => {
    expect(buildFinanceHref("/finance", "tab=profitability", "synthesis")).toBe("/finance")
    expect(buildFinanceHref("/finance", "tab=forecast", "synthesis")).toBe("/finance")
    expect(buildFinanceHref("/finance", "tab=synthesis", "synthesis")).toBe("/finance")
    expect(buildFinanceHref("/finance", "", "synthesis")).toBe("/finance")
    expect(buildFinanceHref("/finance", null, "synthesis")).toBe("/finance")

    expect(buildFinanceHref("/finance", "", "profitability")).toBe("/finance?tab=profitability")
    expect(buildFinanceHref("/finance", "", "forecast")).toBe("/finance?tab=forecast")

    expect(buildFinanceHref("/finance", "year=2026&tab=profitability", "synthesis")).toBe(
      "/finance?year=2026",
    )
    expect(buildFinanceHref("/finance", "year=2026&tab=profitability", "forecast")).toBe(
      "/finance?year=2026&tab=forecast",
    )
    expect(
      buildFinanceHref(
        "/finance",
        new URLSearchParams("view=expanded&tab=profitability"),
        "forecast",
      ),
    ).toBe("/finance?view=expanded&tab=forecast")
  })

  it("construit l'URL avec buildFinanceModuleHref de manière orthogonale à ?tab=", () => {
    expect(buildFinanceModuleHref("/finance", "", "simulation")).toBe("/finance?module=simulation")
    expect(buildFinanceModuleHref("/finance", "tab=forecast", "simulation")).toBe(
      "/finance?tab=forecast&module=simulation",
    )
    expect(buildFinanceModuleHref("/finance", "tab=forecast&module=simulation", null)).toBe(
      "/finance?tab=forecast",
    )
    expect(buildFinanceModuleHref("/finance", "module=simulation", null)).toBe("/finance")
  })

  it("dérive le header principal du chapitre actif dans FinanceDesktopDashboard", () => {
    expect(desktopSource).toContain("title={getFinanceDesktopChapterLabel(activeTab)}")
    expect(desktopSource).not.toContain('title="Cockpit Financier & Rentabilité"')
  })

  it("garantit que le branchement serveur Desktop/Mobile de src/components/finance/index.tsx reste intact", () => {
    expect(indexSource).toContain("const device = await getDashboardDevice()")
    expect(indexSource).toContain('if (device === "desktop")')
    expect(indexSource).toContain("const data = await getFinanceDashboardData()")
    expect(indexSource).toContain("<FinanceDesktopDashboard data={data} />")
    expect(indexSource).toContain("const data = await getFinanceMobileDashboardData()")
    expect(indexSource).toContain("<FinanceMobileDashboard data={data} />")

    expect(indexSource).not.toContain("FinanceLocalNavigation")
    expect(mobileSource).not.toContain("FinanceLocalNavigation")
  })

  describe("Sémantique rentabilité MissionProfitabilityTable", () => {
    it("distingue explicitement marge réelle, marge théorique et écart (pas de confusion quand pas de CRA)", () => {
      const mockRows: MissionProfitabilityRow[] = [
        {
          id: "m-with-cra",
          clientName: "Acme Corp",
          missionTitle: "Lead Architect",
          consultantName: "Alice Dupont",
          practice: "Cloud Engineering",
          status: "active",
          tjm: 900,
          cjm: 500,
          billableDays: 20,
          revenue: 18000,
          marginValue: 8000,
          marginPct: 44.44,
          realMarginPct: 44.44,
          theoreticalMarginPct: 44.44,
          marginGapPoints: 0.0,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        },
        {
          id: "m-without-cra",
          clientName: "Beta Corp",
          missionTitle: "DevOps Consultant",
          consultantName: "Bob Martin",
          practice: "Cybersecurity",
          status: "active",
          tjm: 800,
          cjm: 520,
          billableDays: 0,
          revenue: 0,
          marginValue: 0,
          marginPct: 35.0,
          realMarginPct: null,
          theoreticalMarginPct: 35.0,
          marginGapPoints: null,
          startDate: "2026-03-01",
          endDate: null,
        },
      ]

      const html = renderToStaticMarkup(
        React.createElement(MissionProfitabilityTable, { rows: mockRows }),
      )

      // Vérification en-têtes explicites
      expect(html).toContain("Marge théo")
      expect(html).toContain("Marge réelle")
      expect(html).toContain("% Réel")
      expect(html).toContain("Écart")

      // Vérification mission avec CRA
      expect(html).toContain("18 k€")
      expect(html).toContain("8 k€")
      expect(html).toContain("0.0 pts")

      // Vérification mission sans CRA : la marge réelle n'affiche PAS la marge théorique comme réelle
      expect(html).toContain("Sans CRA")
      expect(html).toContain("35.0%")
    })
  })
})
