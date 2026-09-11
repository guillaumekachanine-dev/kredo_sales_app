import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { MobileOverviewCarousel } from "./MobileOverviewCarousel"

describe("MobileOverviewCarousel", () => {
  it("expose une pagination accessible pour les visualisations fournies par la page", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MobileOverviewCarousel,
        {
          ariaLabel: "Analyses de test",
          items: [{ label: "Première vue" }, { label: "Seconde vue" }],
        },
        React.createElement("p", null, "Premier graphique"),
        React.createElement("p", null, "Second graphique"),
      ),
    )

    expect(html).toContain('aria-label="Analyses de test"')
    expect(html).toContain('aria-label="Afficher Première vue"')
    expect(html).toContain('aria-current="page"')
    expect(html.match(/<article/g)).toHaveLength(2)
  })
})
