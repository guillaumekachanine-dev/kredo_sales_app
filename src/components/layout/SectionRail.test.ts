import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { SectionRail } from "./SectionRail"

function icon(name: string) {
  return React.createElement("svg", { "data-icon": name })
}

function renderRail(options?: { modules?: boolean }) {
  return renderToStaticMarkup(
    React.createElement(SectionRail, {
      ariaLabel: "Navigation Engagements",
      title: "Engagements",
      home: { href: "/missions" },
      chapters: [
        {
          key: "overview",
          label: "Synthèse",
          icon: icon("overview"),
          href: "/missions?vue=synthese",
        },
        {
          key: "missions-at",
          label: "Missions AT",
          icon: icon("missions"),
          href: "/missions?vue=missions-at",
          active: true,
        },
        {
          key: "planning",
          label: "Planning des engagements avec un libellé volontairement long",
          icon: icon("planning"),
          onSelect: () => {},
        },
      ],
      contextualModules: options?.modules
        ? [
            {
              key: "activity",
              label: "Analyse d'activité",
              icon: icon("activity"),
              onSelect: () => {},
            },
          ]
        : [],
    }),
  )
}

describe("SectionRail", () => {
  it("rend le chapeau canonique navy avec titre blanc, gras et centré", () => {
    const html = renderRail()

    expect(html).toContain("w-[11.5rem]")
    expect(html).toContain("bg-edito-navy")
    expect(html).toContain("text-white")
    expect(html).toContain("font-bold")
    expect(html).toContain("justify-center")
    expect(html).toContain("text-center")
    expect(html).toContain(">Engagements<")
  })

  it("rend toujours la section Chapitres et marque l'entrée active", () => {
    const html = renderRail()

    expect(html).toContain(">Chapitres<")
    expect(html).toContain('aria-current="page"')
    expect(html).toContain("border-l-edito-brass")
    expect(html).toContain(">Missions AT<")
  })

  it("préserve les liens URL-addressables et accepte un callback de migration", () => {
    const html = renderRail()

    expect(html).toContain('href="/missions?vue=synthese"')
    expect(html).toContain('href="/missions?vue=missions-at"')
    expect(html).toContain("Planning des engagements avec un libellé volontairement long")
    expect(html).toContain("line-clamp-2")
  })

  it("n'affiche aucune section Modules lorsqu'aucun module contextuel n'existe", () => {
    const html = renderRail()

    expect(html).not.toContain(">Modules<")
  })

  it("affiche uniquement la zone Modules contextuels lorsqu'elle est fournie, après les chapitres", () => {
    const html = renderRail({ modules: true })
    const chaptersIndex = html.indexOf(">Chapitres<")
    const modulesIndex = html.indexOf(">Modules<")

    expect(chaptersIndex).toBeGreaterThan(-1)
    expect(modulesIndex).toBeGreaterThan(chaptersIndex)
    expect(html).toContain("mt-auto")
    expect(html).toContain("Analyse d&#x27;activité")
  })
})
