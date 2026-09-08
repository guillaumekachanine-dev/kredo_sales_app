import { describe, expect, it } from "vitest"
import {
  parseAutomationsSection,
  buildAutomationsSectionHref,
} from "./automations-desktop-navigation"

describe("automations-desktop-navigation", () => {
  describe("parseAutomationsSection", () => {
    it("résout null et undefined vers journal", () => {
      expect(parseAutomationsSection(null)).toBe("journal")
      expect(parseAutomationsSection(undefined)).toBe("journal")
    })

    it("résout les sections valides journal, sante et couts", () => {
      expect(parseAutomationsSection("journal")).toBe("journal")
      expect(parseAutomationsSection("sante")).toBe("sante")
      expect(parseAutomationsSection("couts")).toBe("couts")
    })

    it("retombe sur journal pour toute valeur inconnue", () => {
      expect(parseAutomationsSection("inconnu")).toBe("journal")
      expect(parseAutomationsSection("123")).toBe("journal")
      expect(parseAutomationsSection("SANTE")).toBe("journal")
    })
  })

  describe("buildAutomationsSectionHref", () => {
    it("supprime le paramètre section pour le chapitre journal (racine canonique)", () => {
      expect(buildAutomationsSectionHref("/automations", "", "journal")).toBe("/automations")
      expect(buildAutomationsSectionHref("/automations", "section=sante", "journal")).toBe("/automations")
    })

    it("ajoute section=sante et section=couts pour les autres chapitres", () => {
      expect(buildAutomationsSectionHref("/automations", "", "sante")).toBe("/automations?section=sante")
      expect(buildAutomationsSectionHref("/automations", "", "couts")).toBe("/automations?section=couts")
    })

    it("préserve les query params tiers (ex: run, filter, owner)", () => {
      const hrefSante = buildAutomationsSectionHref("/automations", "run=abc&owner=guillaume", "sante")
      expect(hrefSante).toBe("/automations?run=abc&owner=guillaume&section=sante")

      const hrefJournal = buildAutomationsSectionHref("/automations", "run=abc&section=sante", "journal")
      expect(hrefJournal).toBe("/automations?run=abc")
    })

    it("gère le scénario critique /automations?run=abc + sante puis retour journal", () => {
      const initialUrlParams = "run=abc"
      const urlApresSante = buildAutomationsSectionHref("/automations", initialUrlParams, "sante")
      expect(urlApresSante).toBe("/automations?run=abc&section=sante")

      const urlApresRetourJournal = buildAutomationsSectionHref("/automations", "run=abc&section=sante", "journal")
      expect(urlApresRetourJournal).toBe("/automations?run=abc")
    })
  })
})
