import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  FINANCE_DESKTOP_CHAPTERS,
  FinanceLocalNavigation,
  buildFinanceHref,
  buildFinanceRailProps,
  getFinanceDesktopChapterLabel,
  parseFinanceTab,
  type FinanceTabId,
} from "./FinanceLocalNavigation"

const root = process.cwd()

function renderNavigation(options?: {
  active?: FinanceTabId
  onChange?: (tab: FinanceTabId) => void
}) {
  return renderToStaticMarkup(
    React.createElement(FinanceLocalNavigation, {
      active: options?.active ?? "synthesis",
      onChange: options?.onChange ?? (() => {}),
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

  it("préserve les trois chapitres dans l'ordre exact avec les labels canoniques", () => {
    expect(FINANCE_DESKTOP_CHAPTERS.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "synthesis", label: "Synthèse" },
      { key: "profitability", label: "Rentabilité missions" },
      { key: "forecast", label: "Prévision & simulation" },
    ])

    const model = buildFinanceRailProps({ active: "synthesis", onChange: () => {} })
    expect(model.chapters.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "synthesis", label: "Synthèse" },
      { key: "profitability", label: "Rentabilité missions" },
      { key: "forecast", label: "Prévision & simulation" },
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
      /aria-current="page"[^>]*><span[^>]*>Rentabilité missions<\/span>/,
    )

    const modelForecast = buildFinanceRailProps({
      active: "forecast",
      onChange: () => {},
    })
    expect(modelForecast.chapters.find((c) => c.key === "forecast")?.active).toBe(true)
    expect(modelForecast.chapters.find((c) => c.key === "synthesis")?.active).toBe(false)

    const htmlForecast = renderNavigation({ active: "forecast" })
    expect(htmlForecast).toMatch(
      /aria-current="page"[^>]*><span[^>]*>Prévision &amp; simulation<\/span>/,
    )
  })

  it("omet la section Modules et ne contient aucun module artificiel", () => {
    const model = buildFinanceRailProps({ active: "synthesis", onChange: () => {} })
    const html = renderNavigation()

    expect(model.contextualModules).toBeUndefined()
    expect(html).not.toContain(">Modules<")
  })

  it("résout le titre actif via getFinanceDesktopChapterLabel", () => {
    expect(getFinanceDesktopChapterLabel("synthesis")).toBe("Synthèse")
    expect(getFinanceDesktopChapterLabel("profitability")).toBe("Rentabilité missions")
    expect(getFinanceDesktopChapterLabel("forecast")).toBe("Prévision & simulation")
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
})
