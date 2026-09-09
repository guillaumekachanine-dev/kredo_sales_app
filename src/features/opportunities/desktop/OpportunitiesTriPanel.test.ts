import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { OpportunitiesTriPanel } from "./OpportunitiesTriPanel"

function render(props: Partial<React.ComponentProps<typeof OpportunitiesTriPanel>>) {
  return renderToStaticMarkup(
    React.createElement(OpportunitiesTriPanel, {
      list: React.createElement("div", null, "LISTE"),
      main: React.createElement("div", null, "PRINCIPALE"),
      ...props,
    }),
  )
}

describe("OpportunitiesTriPanel — primitive de layout 3 panneaux", () => {
  it("rend la grille 3 colonnes canonique (230-280 │ 0-1fr │ 238-300)", () => {
    const html = render({})
    expect(html).toContain(
      "grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)]",
    )
  })

  it("rend les slots list et main", () => {
    const html = render({})
    expect(html).toContain("LISTE")
    expect(html).toContain("PRINCIPALE")
  })

  it("ne déborde jamais horizontalement (overflow-hidden + min-w-0 par panneau)", () => {
    const html = render({})
    expect(html).toContain("overflow-hidden")
    expect(html).toContain("min-w-0")
    expect(html).not.toContain("overflow-x")
  })

  it("dégrade le rail droit en <aside aria-hidden /> quand details est absent", () => {
    const html = render({})
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain("border-l border-border bg-surface")
    expect(html).not.toContain("DÉTAILS")
  })

  it("rend le rail droit avec le contenu details quand il est fourni", () => {
    const html = render({ details: React.createElement("div", null, "DÉTAILS") })
    expect(html).toContain("DÉTAILS")
    expect(html).toContain("<aside")
    // Le rail porteur de contenu n'est pas aria-hidden
    expect(html).not.toContain('aria-hidden="true"')
  })

  it("utilise detailsEmpty à la place du rail neutre par défaut", () => {
    const html = render({
      detailsEmpty: React.createElement("aside", null, "RIEN SÉLECTIONNÉ"),
    })
    expect(html).toContain("RIEN SÉLECTIONNÉ")
    expect(html).not.toContain('aria-hidden="true"')
  })

  it("fusionne className et ariaLabel sur le conteneur", () => {
    const html = render({ className: "test-marker", ariaLabel: "Besoins & staffing" })
    expect(html).toContain("test-marker")
    expect(html).toContain('aria-label="Besoins &amp; staffing"')
  })
})
