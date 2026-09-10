import { describe, expect, it } from "vitest"
import {
  buildEngagementsModuleHref,
  buildEngagementsViewHref,
  ENGAGEMENTS_CONTEXTUAL_MODULES,
  ENGAGEMENTS_MODULE_LABELS,
  ENGAGEMENTS_VIEW_LABELS,
  ENGAGEMENTS_VIEWS,
  parseEngagementsModule,
  parseEngagementsView,
} from "../engagements-navigation"

describe("engagements-navigation — chapitres", () => {
  it("porte les 5 chapitres cibles dans l'ordre (SHELL-0018 §B.2)", () => {
    expect(ENGAGEMENTS_VIEWS).toEqual([
      "synthese",
      "missions-at",
      "projets",
      "activite-conges",
      "planning-at",
    ])
  })

  it("libellés produit alignés cible — clés techniques conservées", () => {
    expect(ENGAGEMENTS_VIEW_LABELS).toEqual({
      synthese: "Synthèse",
      "missions-at": "Missions AT",
      projets: "Projets",
      "activite-conges": "Rentabilité des engagements",
      "planning-at": "Planning & Échéances",
    })
  })

  it("parseEngagementsView : clés valides, fallback racine, compat historique", () => {
    expect(parseEngagementsView("activite-conges")).toBe("activite-conges")
    expect(parseEngagementsView("planning-at")).toBe("planning-at")
    expect(parseEngagementsView(undefined)).toBe("synthese")
    expect(parseEngagementsView("inconnu")).toBe("synthese")
    // Deep-link historique préservé
    expect(parseEngagementsView("planning-engagements")).toBe("planning-at")
    expect(parseEngagementsView(["projets", "x"])).toBe("projets")
  })

  it("buildEngagementsViewHref conserve le contrat ?vue=", () => {
    expect(buildEngagementsViewHref("activite-conges")).toBe("/missions?vue=activite-conges")
    expect(buildEngagementsViewHref("planning-at")).toBe("/missions?vue=planning-at")
  })
})

describe("engagements-navigation — modules contextuels", () => {
  it("expose exactement les 2 modules REUSE (pas de bouton mort « analyse des marges »)", () => {
    expect(ENGAGEMENTS_CONTEXTUAL_MODULES).toEqual(["production-conges", "atlas-portefeuille"])
    expect(ENGAGEMENTS_MODULE_LABELS).toEqual({
      "production-conges": "Production & Congés",
      "atlas-portefeuille": "Atlas du portefeuille",
    })
  })

  it("parseEngagementsModule : seules les clés connues sont acceptées", () => {
    expect(parseEngagementsModule("production-conges")).toBe("production-conges")
    expect(parseEngagementsModule("atlas-portefeuille")).toBe("atlas-portefeuille")
    expect(parseEngagementsModule("analyse-des-marges")).toBeNull()
    expect(parseEngagementsModule(undefined)).toBeNull()
    expect(parseEngagementsModule("")).toBeNull()
  })

  it("buildEngagementsModuleHref superpose ?module= à la vue courante et sait fermer", () => {
    expect(buildEngagementsModuleHref("synthese", "atlas-portefeuille")).toBe(
      "/missions?vue=synthese&module=atlas-portefeuille",
    )
    expect(buildEngagementsModuleHref("planning-at", "production-conges")).toBe(
      "/missions?vue=planning-at&module=production-conges",
    )
    // href de fermeture = retour à la vue nue
    expect(buildEngagementsModuleHref("activite-conges", null)).toBe(
      "/missions?vue=activite-conges",
    )
  })
})
