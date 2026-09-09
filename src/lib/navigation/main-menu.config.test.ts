import { describe, expect, it } from "vitest"
import {
  getMobileTabsForPath,
  getModuleTabs,
  getSectionTabsForPath,
  mainMenuItems,
} from "./main-menu.config"

describe("navigation de section", () => {
  it("ne rend plus de navigation de section dans Comptes & contacts", () => {
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
        href: "/consultants?section=candidats",
      },
    ])

    expect(getMobileTabsForPath("/consultants")).toEqual([
      { label: "Synthèse", href: "/consultants" },
      { label: "Collaborateurs", href: "/consultants?section=collaborateurs" },
      { label: "Activités & congés", href: "/consultants?section=activite-conges" },
      { label: "Candidats", href: "/consultants?section=candidats" },
      { label: "Pool de compétences", href: "/consultants?section=pool-competences" },
    ])
  })
})

describe("menu principal — intégration CRM et Consultants (SHELL 6.2 / Lot 14)", () => {
  it("contient le groupe CRM avec ses entrées canoniques", () => {
    const crmGroup = mainMenuItems.find((group) => group.label === "CRM")
    expect(crmGroup).toBeDefined()
    expect(crmGroup?.items?.map((item) => item.label)).toEqual([
      "Comptes & contacts",
      "Besoins & Staffing",
      "Engagements",
      "Consultants",
    ])
  })

  it("ne contient plus de groupe Ressources", () => {
    const ressourcesGroup = mainMenuItems.find((group) => group.label === "Ressources")
    expect(ressourcesGroup).toBeUndefined()
  })

  it("intègre Consultants sous CRM sans tabs Desktop legacy", () => {
    const crmGroup = mainMenuItems.find((group) => group.label === "CRM")
    const consultantsItem = crmGroup?.items?.find((item) => item.label === "Consultants")

    expect(consultantsItem).toBeDefined()
    expect(consultantsItem?.href).toBe("/consultants")
    expect(consultantsItem?.icon).toBe("equipe")
    expect(consultantsItem?.tabs).toBeUndefined()
    expect(getModuleTabs("/consultants")).toEqual([])
    expect(getSectionTabsForPath("/consultants")).toEqual([])
  })

  it("ne comporte plus d'entrée globale Recrutement", () => {
    const allItems = mainMenuItems.flatMap((group) => group.items ?? [group])
    expect(allItems.find((item) => item.label === "Recrutement")).toBeUndefined()
  })
})
