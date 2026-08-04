import { describe, expect, it } from "vitest"
import { getModuleTabs, getSectionTabsForPath } from "./main-menu.config"

describe("navigation de section", () => {
  it("ne rend plus de navigation de section dans CRM - Comptes", () => {
    expect(getModuleTabs("/prospection/accounts")).toEqual([])
    expect(getSectionTabsForPath("/prospection/accounts")).toEqual([])
    expect(getSectionTabsForPath("/prospection/accounts/company-id")).toEqual([])
  })

  it("conserve les onglets de section des autres modules", () => {
    expect(getModuleTabs("/missions").map((tab) => tab.label)).toEqual([
      "Synthèse",
      "Missions",
      "Projets",
    ])
  })
})
