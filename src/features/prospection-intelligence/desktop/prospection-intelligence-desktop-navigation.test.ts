import { describe, expect, it } from "vitest"
import {
  parseProspectionSection,
  buildProspectionSectionHref,
} from "./prospection-intelligence-desktop-navigation"

describe("prospection-intelligence-desktop-navigation", () => {
  describe("parseProspectionSection", () => {
    it("résout null et undefined vers strategy", () => {
      expect(parseProspectionSection(null)).toBe("strategy")
      expect(parseProspectionSection(undefined)).toBe("strategy")
    })

    it("résout les sections valides strategy, chapter_1, chapter_2 et chapter_3", () => {
      expect(parseProspectionSection("strategy")).toBe("strategy")
      expect(parseProspectionSection("chapter_1")).toBe("chapter_1")
      expect(parseProspectionSection("chapter_2")).toBe("chapter_2")
      expect(parseProspectionSection("chapter_3")).toBe("chapter_3")
    })

    it("retombe sur strategy pour toute valeur inconnue", () => {
      expect(parseProspectionSection("inconnu")).toBe("strategy")
      expect(parseProspectionSection("123")).toBe("strategy")
      expect(parseProspectionSection("STRATEGY")).toBe("strategy")
    })
  })

  describe("buildProspectionSectionHref", () => {
    it("supprime le paramètre section pour la section strategy (racine canonique)", () => {
      expect(buildProspectionSectionHref("/prospection-intelligence", "", "strategy")).toBe("/prospection-intelligence")
      expect(buildProspectionSectionHref("/prospection-intelligence", "section=chapter_1", "strategy")).toBe("/prospection-intelligence")
    })

    it("ajoute section=chapter_1, section=chapter_2 et section=chapter_3 pour les autres chapitres", () => {
      expect(buildProspectionSectionHref("/prospection-intelligence", "", "chapter_1")).toBe("/prospection-intelligence?section=chapter_1")
      expect(buildProspectionSectionHref("/prospection-intelligence", "", "chapter_2")).toBe("/prospection-intelligence?section=chapter_2")
      expect(buildProspectionSectionHref("/prospection-intelligence", "", "chapter_3")).toBe("/prospection-intelligence?section=chapter_3")
    })

    it("préserve les query params tiers existants ou futurs", () => {
      const href = buildProspectionSectionHref("/prospection-intelligence", "foo=bar&period=90", "chapter_2")
      expect(href).toBe("/prospection-intelligence?foo=bar&period=90&section=chapter_2")

      const hrefStrategy = buildProspectionSectionHref("/prospection-intelligence", "foo=bar&section=chapter_2", "strategy")
      expect(hrefStrategy).toBe("/prospection-intelligence?foo=bar")
    })
  })
})
