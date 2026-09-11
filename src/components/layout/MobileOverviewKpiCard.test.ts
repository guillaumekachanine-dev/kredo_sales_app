import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { MobileOverviewKpiCard } from "./MobileOverviewKpiCard"
import { MobileOverviewKpiGrid } from "./MobileOverviewKpiGrid"

describe("MobileOverview KPI cards", () => {
  it("compose deux actions accessibles sans introduire de bouton imbriqué", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MobileOverviewKpiGrid,
        { label: "Indicateurs de test" },
        React.createElement(MobileOverviewKpiCard, {
          label: "CA facturé",
          value: "1,24 M€",
          icon: React.createElement("svg", { "aria-hidden": true }),
          tone: "primary",
          onClick: () => {},
          ariaLabel: "Voir le détail du chiffre d’affaires facturé",
        }),
        React.createElement(MobileOverviewKpiCard, {
          label: "Marge moyenne",
          value: "32 %",
          icon: React.createElement("svg", { "aria-hidden": true }),
          tone: "brass",
          onClick: () => {},
          ariaLabel: "Voir le détail de la marge moyenne",
        }),
      ),
    )

    expect(html).toContain('aria-label="Indicateurs de test"')
    expect(html.match(/<button/g)).toHaveLength(2)
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('data-tone="brass"')
  })
})
