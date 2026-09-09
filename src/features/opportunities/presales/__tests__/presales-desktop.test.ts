import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PresalesDesktop } from "../PresalesDesktop"

describe("PresalesDesktop — chapitre Avant-vente (structure seule)", () => {
  const html = renderToStaticMarkup(createElement(PresalesDesktop))

  it("rend la grille 3 panneaux de OpportunitiesTriPanel", () => {
    expect(html).toContain(
      "grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)]",
    )
    expect(html).toContain('aria-label="Avant-vente"')
  })

  it("rend trois EmptyState authentiques (liste / surface / détails)", () => {
    expect(html).toContain("Aucun projet avant-vente")
    expect(html).toContain("Avant-vente à structurer")
    expect(html).toContain("Aucune sélection")
    // rail Détails visible et libellé
    expect(html).toContain('aria-label="Détails du projet avant-vente"')
  })

  it("n'affiche aucune donnée fictive ni bouton d'action", () => {
    expect(html).not.toMatch(/<button|<a\s+href|Nouveau|Créer/i)
    expect(html.toLowerCase()).toContain("question produit ouverte")
  })
})
