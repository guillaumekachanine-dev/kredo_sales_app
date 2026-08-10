import { describe, expect, it } from "vitest"
import { CLIENT_INTELLIGENCE_NAV_ITEMS } from "./ClientIntelligenceSidebar"

describe("ClientIntelligenceSidebar", () => {
  it("préserve les clés métier derrière les sept libellés Desktop", () => {
    expect(CLIENT_INTELLIGENCE_NAV_ITEMS.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "accueil", label: "Accueil" },
      { key: "socle", label: "Socle" },
      { key: "connaissance", label: "Entreprise" },
      { key: "secteur", label: "Secteur" },
      { key: "enjeux", label: "Enjeux" },
      { key: "strategie", label: "Stratégie" },
      { key: "roadmap", label: "Roadmap" },
    ])
  })

  it("associe un pictogramme à chaque entrée", () => {
    expect(CLIENT_INTELLIGENCE_NAV_ITEMS.every((item) => item.icon.length > 0)).toBe(true)
  })
})
