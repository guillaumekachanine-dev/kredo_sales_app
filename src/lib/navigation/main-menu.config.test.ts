import { describe, expect, it } from "vitest"
import {
  getMobileTabsForPath,
  mainMenuItems,
  type MainMenuItem,
} from "./main-menu.config"

describe("navigation de section — legacy démantelé (SHELL 6.4A)", () => {
  it("aucune entrée de menu ne porte de navigation secondaire Desktop (`tabs`)", () => {
    const walk = (items: MainMenuItem[]): void => {
      for (const item of items) {
        expect(item).not.toHaveProperty("tabs")
        if (item.items) walk(item.items)
      }
    }
    walk(mainMenuItems)
  })

  it("n'exporte plus les helpers d'onglets Desktop legacy", async () => {
    const mod = await import("./main-menu.config")
    expect("getModuleTabs" in mod).toBe(false)
    expect("getSectionTabsForPath" in mod).toBe(false)
  })

  it("résout les regroupements mobiles vers leurs URLs canoniques", () => {
    expect(getMobileTabsForPath("/missions/opps")).toEqual([
      {
        label: "Besoins & Staffing",
        shortLabel: "Besoins",
        href: "/missions/opps?section=besoins",
      },
      {
        label: "Recrutement",
        shortLabel: "Recrutement",
        href: "/consultants?section=candidats",
      },
    ])

    expect(getMobileTabsForPath("/missions")).toEqual([
      { label: "Synthèse", shortLabel: "Synthèse", href: "/missions" },
      { label: "Missions", shortLabel: "Missions", href: "/missions?vue=missions-at" },
      { label: "Projets", shortLabel: "Projets", href: "/missions?vue=projets" },
    ])

    expect(getMobileTabsForPath("/consultants")).toEqual([
      { label: "Synthèse", href: "/consultants" },
      { label: "Collaborateurs", href: "/consultants?section=collaborateurs" },
      { label: "Activités & congés", href: "/consultants?section=activite-conges" },
      { label: "Candidats", href: "/consultants?section=candidats" },
      { label: "Pool de compétences", href: "/consultants?section=pool-competences" },
    ])

    expect(getMobileTabsForPath("/reports")).toEqual([
      { label: "Rapports & Rédaction", shortLabel: "Rapports", href: "/reports" },
      { label: "Veille & Actualités", shortLabel: "Veille", href: "/veille" },
    ])
    expect(getMobileTabsForPath("/veille")).toEqual(getMobileTabsForPath("/reports"))
  })

  it("ne produit aucun onglet mobile hors regroupement explicite", () => {
    expect(getMobileTabsForPath("/prospection/accounts")).toEqual([])
    expect(getMobileTabsForPath("/prospection/accounts/company-id")).toEqual([])
    expect(getMobileTabsForPath("/prospection-intelligence")).toEqual([])
    expect(getMobileTabsForPath("/finance")).toEqual([])
    expect(getMobileTabsForPath("/cockpit")).toEqual([])
  })
})

describe("menu principal — intégration CRM, Opportunités et Consultants (SHELL 6.2/6.3)", () => {
  it("contient le groupe CRM avec ses entrées canoniques dont Opportunités", () => {
    const crmGroup = mainMenuItems.find((group) => group.label === "CRM")
    expect(crmGroup).toBeDefined()
    expect(crmGroup?.items?.map((item) => item.label)).toEqual([
      "Comptes & contacts",
      "Opportunités",
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
    expect(consultantsItem).not.toHaveProperty("tabs")
  })

  it("intègre Engagements sous CRM sans tabs Desktop legacy (SHELL 6.3)", () => {
    const crmGroup = mainMenuItems.find((group) => group.label === "CRM")
    const engagementsItem = crmGroup?.items?.find((item) => item.label === "Engagements")

    expect(engagementsItem).toBeDefined()
    expect(engagementsItem?.href).toBe("/missions")
    expect(engagementsItem?.icon).toBe("engagements")
    expect(engagementsItem).not.toHaveProperty("tabs")
  })

  it("ne comporte plus d'entrée globale Recrutement", () => {
    const allItems = mainMenuItems.flatMap((group) => group.items ?? [group])
    expect(allItems.find((item) => item.label === "Recrutement")).toBeUndefined()
  })
})
