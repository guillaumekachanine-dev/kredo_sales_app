import React from "react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { MobileOverviewShell } from "./MobileOverviewShell"

function renderShell() {
  return renderToStaticMarkup(
    MobileOverviewShell({
      tone: "home",
      heroLabel: "Accueil KREDO",
      surfaceLabel: "Contenu de la homepage mobile",
      icon: React.createElement("svg", { "data-slot": "icon" }),
      artwork: React.createElement("img", { "data-slot": "artwork", alt: "" }),
      artworkClassName: "artwork-adjustment",
      decorativeShapeClassName: "shape-adjustment",
      heroContent: React.createElement("button", { type: "button" }, "Créer"),
      children: React.createElement("p", null, "Contenu métier"),
    }),
  )
}

describe("MobileOverviewShell", () => {
  it("expose la tonalité sémantique et les deux régions accessibles", () => {
    const html = renderShell()

    expect(html).toContain('data-tone="home"')
    expect(html).toContain('aria-label="Accueil KREDO"')
    expect(html).toContain('aria-label="Contenu de la homepage mobile"')
  })

  it("compose les slots sans connaître le contenu métier", () => {
    const html = renderShell()

    expect(html).toContain('data-slot="icon"')
    expect(html).toContain('data-slot="artwork"')
    expect(html).toContain("shape-adjustment")
    expect(html).toContain("artwork-adjustment")
    expect(html).toContain(">Créer<")
    expect(html).toContain(">Contenu métier<")
  })

  it("verrouille la géométrie canonique et dérive la forme depuis la couleur de page", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/layout/MobileOverviewShell.module.css"),
      "utf8",
    )

    expect(css).toContain("height: 258px")
    expect(css).toContain("min-height: calc(100dvh - 198px)")
    expect(css).toContain("margin: -60px auto 0")
    expect(css).toContain("width: min(calc(100% - 38px), 352px)")
    expect(css).toContain("border-radius: 28px 28px 0 0")
    expect(css).toContain("color-mix(in srgb, var(--mobile-overview-page-color)")
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i)
  })
})
