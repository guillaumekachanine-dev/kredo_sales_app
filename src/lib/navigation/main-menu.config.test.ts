import { describe, expect, it } from "vitest"
import {
  getMobileTabsForPath,
  getModuleTabs,
  getSectionTabsForPath,
} from "./main-menu.config"

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

  it("résout les regroupements mobiles vers leurs URLs canoniques", () => {
    expect(getMobileTabsForPath("/missions/opps")).toEqual([
      {
        label: "Besoins & Staffing",
        shortLabel: "Besoins",
        href: "/missions/opps?scope=needs",
      },
      {
        label: "Recrutement",
        shortLabel: "Recrutement",
        href: "/recruitment",
      },
    ])

    expect(getMobileTabsForPath("/consultants")).toEqual(
      getModuleTabs("/consultants"),
    )
  })
})
