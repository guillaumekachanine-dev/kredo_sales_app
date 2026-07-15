import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { dialogFocusTrapDestination, IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { AutomationMetricsFilters } from "./AutomationMetricsFilters"
import { AutomationMetricsMobileLayout } from "./AutomationMetricsMobileLayout"
import { AutomationMetricsMobileNavigation } from "./AutomationMetricsMobileNavigation"
import { AutomationMetricsTimelineChart } from "./AutomationMetricsTimelineChart"
import { AUTOMATION_METRICS_SECTIONS } from "./automation-metrics-navigation"
import type { AutomationMetricsTimelinePoint } from "./automation-metrics-types"

describe("automation metrics responsive and accessible contracts", () => {
  it("exposes the five mobile sections as one labelled tab set", () => {
    const markup = renderToStaticMarkup(createElement(AutomationMetricsMobileNavigation, {
      section: "performance",
      onChange: () => undefined,
    }))

    expect(AUTOMATION_METRICS_SECTIONS.map((section) => section.mobileTitle)).toEqual([
      "Vue d’ensemble",
      "Fiabilité",
      "Performance",
      "Coûts",
      "Incidents",
    ])
    expect(markup.match(/role="tab"/g)).toHaveLength(5)
    expect(markup).toContain('aria-label="Analyses disponibles"')
    expect(markup).toContain('aria-selected="true"')
    expect(markup).toContain('aria-controls="automation-metrics-mobile-panel"')
  })

  it("keeps the global mobile filters labelled, summarized and collapsible", () => {
    const markup = renderToStaticMarkup(createElement(AutomationMetricsFilters, {
      preset: "custom",
      workflow: "unknown_workflow",
      customRange: { from: "2026-06-01", to: "2026-06-18" },
      workflowOptions: ["unknown_workflow"],
      pending: true,
      hasSnapshot: true,
      mode: "mobile",
      onPresetChange: () => undefined,
      onWorkflowChange: () => undefined,
      onCustomRangeChange: () => undefined,
    }))

    expect(markup).toContain("Personnalisée · unknown_workflow")
    expect(markup).toContain("Mise à jour…")
    expect(markup).toContain("Date de début")
    expect(markup).toContain("Date de fin")
    expect(markup).toContain("Refermer les filtres")
  })

  it("marks the mobile panel busy without hiding its previous content", () => {
    const markup = renderToStaticMarkup(createElement(AutomationMetricsMobileLayout, {
      section: "overview",
      onSectionChange: () => undefined,
      filters: createElement("div", null, "Filtres actifs"),
      pending: true,
    }, createElement("p", null, "Snapshot précédent")))

    expect(markup).toContain('role="tabpanel"')
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain("Snapshot précédent")
  })

  it("labels the shared mobile dialog from its visible title and description", () => {
    const markup = renderToStaticMarkup(createElement(IntelligenceSplitModalShell, {
      open: true,
      title: "Analyse des métriques",
      subtitle: "Évolution de la fiabilité, des performances et des coûts",
      onClose: () => undefined,
      leftPane: null,
      rightPane: null,
      content: createElement("p", null, "Contenu mobile"),
      isMobile: true,
    }))

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain("aria-labelledby=")
    expect(markup).toContain("aria-describedby=")
    expect(markup).toContain('aria-label="Fermer la modale"')
  })

  it("cycles focus at both boundaries of the shared dialog", () => {
    expect(dialogFocusTrapDestination(3, 4, false)).toBe(0)
    expect(dialogFocusTrapDestination(0, 4, true)).toBe(3)
    expect(dialogFocusTrapDestination(1, 4, false)).toBeNull()
    expect(dialogFocusTrapDestination(-1, 4, false)).toBe(0)
    expect(dialogFocusTrapDestination(-1, 4, true)).toBe(3)
    expect(dialogFocusTrapDestination(-1, 0, false)).toBe(-1)
  })

  it("provides a scroll cue and a textual table for a dense timeline", () => {
    const timeline: AutomationMetricsTimelinePoint[] = Array.from({ length: 30 }, (_, index) => ({
      key: `2026-06-${String(index + 1).padStart(2, "0")}`,
      label: `${index + 1} juin`,
      succeeded: index % 3,
      failed: index % 5 === 0 ? 1 : 0,
      successRatePct: index % 3 === 0 ? null : 100,
    }))
    const markup = renderToStaticMarkup(createElement(AutomationMetricsTimelineChart, { timeline }))

    expect(markup).toContain("Faites défiler le graphique horizontalement")
    expect(markup).toContain("Exécutions et fiabilité dans le temps")
    expect(markup).toContain("Données détaillées du graphique")
    expect(markup.match(/<tr>/g)).toHaveLength(31)
  })

  it("renders an explicit empty state for a single empty bucket", () => {
    const timeline: AutomationMetricsTimelinePoint[] = [{
      key: "2026-07-15",
      label: "15 juil.",
      succeeded: 0,
      failed: 0,
      successRatePct: null,
    }]
    const markup = renderToStaticMarkup(createElement(AutomationMetricsTimelineChart, { timeline }))

    expect(markup).toContain("Aucune exécution sur cette période")
    expect(markup).not.toContain("Faites défiler le graphique horizontalement")
    expect(markup).toContain("15 juil.")
  })
})
