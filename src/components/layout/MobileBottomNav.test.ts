import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { MobileBottomNav } from "./MobileBottomNav"

describe("MobileBottomNav (rendu et composition)", () => {
  it("affiche exactement 5 emplacements dans l'ordre exact : Retour, Cockpit, Menu, CRM, Suivant (Cas 1, 2, 3)", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileBottomNav, {
        pathname: "/cockpit",
        isRailOpen: false,
        activeHasRail: false,
        onActiveModulePress: () => {},
        isMenuOpen: false,
        onMenuToggle: () => {},
        canGoBack: false,
        canGoForward: false,
      }),
    )

    // Vérifier l'ordre des emplacements via les libellés et aria-labels
    const labelsInOrder = ["Revenir en arrière", "Cockpit", "Menu", "CRM", "Aller en avant"]
    let lastIndex = -1

    for (const label of labelsInOrder) {
      const index = html.indexOf(label)
      expect(index, `Aria-label/Label "${label}" doit être présent dans MobileBottomNav`).toBeGreaterThan(-1)
      expect(index, `Aria-label/Label "${label}" doit apparaître après le précédent`).toBeGreaterThan(lastIndex)
      lastIndex = index
    }

    // Vérifier l'absence de Staffing et Intelligence
    expect(html).not.toContain("Staffing")
    expect(html).not.toContain("Intelligence")
  })

  it("désactive les boutons Retour et Suivant lorsque canGoBack / canGoForward sont false (Cas 6, 7)", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileBottomNav, {
        pathname: "/cockpit",
        isRailOpen: false,
        activeHasRail: false,
        onActiveModulePress: () => {},
        isMenuOpen: false,
        onMenuToggle: () => {},
        canGoBack: false,
        canGoForward: false,
      }),
    )

    expect(html).toContain('aria-label="Revenir en arrière"')
    expect(html).toContain('aria-label="Aller en avant"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-disabled="true"')
  })

  it("active le bouton Retour lorsque canGoBack est true", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileBottomNav, {
        pathname: "/cockpit",
        isRailOpen: false,
        activeHasRail: false,
        onActiveModulePress: () => {},
        isMenuOpen: false,
        onMenuToggle: () => {},
        canGoBack: true,
        canGoForward: false,
      }),
    )

    expect(html).toContain('aria-label="Revenir en arrière"')
    // Vérifier que le bouton Retour n'a pas disabled
    const backBtnMatch = html.match(/<button[^>]*aria-label="Revenir en arrière"[^>]*>/)
    expect(backBtnMatch).not.toBeNull()
    expect(backBtnMatch![0]).not.toContain("disabled")
  })
})
