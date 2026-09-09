import { describe, expect, it } from "vitest"
import {
  getActiveModuleHref,
  getMobileTabsForPath,
  mainMenuItems,
  type MainMenuItem,
} from "./main-menu.config"
import { getNavigationIcon } from "@/components/layout/navigation-icons"

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

    // Phase 7.2 : libellés produit synchronisés avec CONSULTANTS_SECTIONS.
    // Le Mobile garde ses 5 accès, dont « Pool de compétences » (SEPARATE IMPLEMENTATION).
    expect(getMobileTabsForPath("/consultants")).toEqual([
      { label: "Vue d’ensemble", href: "/consultants" },
      { label: "Collaborateurs", href: "/consultants?section=collaborateurs" },
      { label: "Activité & Congés", href: "/consultants?section=activite-conges" },
      { label: "Vivier Candidats", href: "/consultants?section=candidats" },
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

describe("menu principal Desktop — taxonomie cible (SHELL 6.4B)", () => {
  const groupLabels = () => mainMenuItems.map((item) => item.label)
  const itemsOf = (label: string) =>
    mainMenuItems.find((group) => group.label === label)?.items?.map((i) => i.label)
  const flat = () => mainMenuItems.flatMap((group) => group.items ?? [group])
  const entry = (label: string) => flat().find((item) => item.label === label)

  it("le premier niveau est exactement Accueil · Agenda · CRM · Intelligence · Outils", () => {
    expect(groupLabels()).toEqual(["Accueil", "Agenda", "CRM", "Intelligence", "Outils"])
  })

  it("Accueil remplace Cockpit sans changer de pathname et porte l'icône home", () => {
    const accueil = mainMenuItems.find((item) => item.label === "Accueil")
    expect(accueil).toBeDefined()
    expect(accueil?.href).toBe("/cockpit")
    expect(accueil?.icon).toBe("home")
    expect(accueil?.primary).toBe(true)
    expect(mainMenuItems.some((item) => item.label === "Cockpit")).toBe(false)
  })

  it("Agenda est inchangé", () => {
    const agenda = mainMenuItems.find((item) => item.label === "Agenda")
    expect(agenda?.href).toBe("/agenda")
    expect(agenda?.icon).toBe("calendar")
  })

  it("CRM contient exactement Comptes & Contacts, Opportunités, Engagements, Consultants, Finance", () => {
    expect(itemsOf("CRM")).toEqual([
      "Comptes & Contacts",
      "Opportunités",
      "Engagements",
      "Consultants",
      "Finance",
    ])
    expect(entry("Comptes & Contacts")?.href).toBe("/prospection/accounts")
    expect(entry("Comptes & Contacts")?.icon).toBe("crm")
    expect(entry("Opportunités")?.href).toBe("/missions/opps")
    expect(entry("Opportunités")?.icon).toBe("staffing")
    expect(entry("Engagements")?.href).toBe("/missions")
    expect(entry("Consultants")?.href).toBe("/consultants")
    expect(entry("Finance")?.href).toBe("/finance")
    expect(entry("Finance")?.icon).toBe("finance")
  })

  it("Intelligence est inchangé", () => {
    expect(itemsOf("Intelligence")).toEqual([
      "Business Intelligence",
      "Prospection",
      "Rapports & Rédaction",
      "Veille & Actualités",
    ])
  })

  it("Outils contient exactement Knowledge Hub, Automatisations, Paramètres", () => {
    expect(itemsOf("Outils")).toEqual([
      "Knowledge Hub",
      "Automatisations",
      "Paramètres",
    ])
    expect(entry("Paramètres")?.href).toBe("/settings")
    expect(entry("Paramètres")?.icon).toBe("settings")
  })

  it("Finance et Paramètres ne sont plus des entrées / groupes racines", () => {
    expect(mainMenuItems.some((group) => group.label === "Finance")).toBe(false)
    expect(mainMenuItems.some((group) => group.label === "Ressources")).toBe(false)
    expect(mainMenuItems.some((item) => item.label === "Paramètres" && item.href)).toBe(false)
  })

  it("ne comporte plus d'entrée globale Recrutement", () => {
    expect(flat().find((item) => item.label === "Recrutement")).toBeUndefined()
  })

  it("le déplacement visuel de Finance et Paramètres ne change aucun contrat URL", () => {
    const cases: Array<[string, string]> = [
      ["/cockpit", "/cockpit"],
      ["/prospection/accounts", "/prospection/accounts"],
      ["/missions/opps", "/missions/opps"],
      ["/missions", "/missions"],
      ["/consultants", "/consultants"],
      ["/finance", "/finance"],
      ["/intelligence", "/intelligence"],
      ["/settings", "/settings"],
    ]
    for (const [pathname, expected] of cases) {
      expect(getActiveModuleHref(pathname)).toBe(expected)
    }
  })
})

describe("pictogramme Accueil", () => {
  it("getNavigationIcon(\"home\") retourne un SVG", () => {
    const icon = getNavigationIcon("home")
    expect(icon).not.toBeNull()
    expect(icon).toMatchObject({ type: "svg" })
  })
})
