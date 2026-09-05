import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { BusinessIntelligenceMobileHeader } from "../BusinessIntelligenceMobileHeader"
import { BI_CHAPTERS } from "../../navigation/business-intelligence-chapters"

const EXPECTED_TITLES = {
  home: "Discours terrain",
  "sector-analysis": "Analyse sectorielle",
  "competitive-environment": "Paysage concurrentiel",
  "regulatory-calendar": "Calendrier réglementaire",
  "value-chain": "Chaîne de valeur",
  "sector-news": "Actualité sectorielle",
} as const

describe("BusinessIntelligenceMobileHeader", () => {
  it("affiche le titre dynamique long correspondant à chaque chapitre actif", () => {
    const segmentName = "COMPOSITIONS & INGRÉDIENTS B2B"
    const noop = vi.fn()

    for (const chapter of BI_CHAPTERS) {
      const markup = renderToStaticMarkup(
        createElement(BusinessIntelligenceMobileHeader, {
          segmentName,
          activeChapter: chapter.id,
          onChangeSegment: noop,
        }),
      )

      expect(markup).toContain(EXPECTED_TITLES[chapter.id])
      expect(markup).toContain("COMPOSITIONS &amp; INGRÉDIENTS B2B")
      expect(markup).toContain("Business")
      expect(markup).toContain("Intelligence")
      expect(markup).toContain("Changer")
    }
  })

  it("propose l'action accessible de changement de segment", () => {
    const markup = renderToStaticMarkup(
      createElement(BusinessIntelligenceMobileHeader, {
        segmentName: "Segment Test",
        activeChapter: "sector-analysis",
        onChangeSegment: vi.fn(),
      }),
    )

    expect(markup).toContain("Changer")
    expect(markup).toContain('aria-label="Changer le segment actif, actuellement Segment Test"')
    expect(markup).toContain("Analyse sectorielle")
    expect(markup).not.toContain("Discours terrain")
  })
})
