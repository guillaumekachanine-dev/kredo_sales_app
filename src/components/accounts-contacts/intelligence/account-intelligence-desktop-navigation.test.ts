import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  buildAccountIntelligenceHref,
  CLIENT_INTELLIGENCE_NAV_ITEMS,
  createEmbeddedAccountIntelligenceNavigationState,
  embeddedAccountIntelligenceNavigationReducer,
  getDisplayedAccountIntelligenceSection,
  getRememberedAccountIntelligenceSection,
  parseAccountIntelligenceSection,
} from "./account-intelligence-desktop-navigation"

const root = process.cwd()

describe("Account Intelligence Desktop navigation", () => {
  it.each([
    [undefined, "accueil"],
    [null, "accueil"],
    ["accueil", "accueil"],
    ["socle", "socle"],
    ["connaissance", "connaissance"],
    ["secteur", "secteur"],
    ["enjeux", "enjeux"],
    ["strategie", "strategie"],
    ["roadmap", "roadmap"],
    ["unknown", "accueil"],
  ] as const)("parse aiSection=%s as %s", (value, expected) => {
    expect(parseAccountIntelligenceSection(value)).toBe(expected)
  })

  it("réutilise l'ordre et les sept clés de la navigation Desktop", () => {
    expect(CLIENT_INTELLIGENCE_NAV_ITEMS.map((item) => item.key)).toEqual([
      "accueil",
      "socle",
      "connaissance",
      "secteur",
      "enjeux",
      "strategie",
      "roadmap",
    ])
  })

  it("construit l'état racine sans aiSection et préserve tous les autres paramètres", () => {
    const searchParams = new URLSearchParams(
      "tab=contacts&future=value&aiSection=strategie",
    )

    expect(
      buildAccountIntelligenceHref(
        "/prospection/accounts/company-a",
        searchParams,
        "accueil",
      ),
    ).toBe("/prospection/accounts/company-a?tab=contacts&future=value")
  })

  it("ne modifie que aiSection pour un chapitre non racine", () => {
    const searchParams = new URLSearchParams("tab=contacts&future=value")

    expect(
      buildAccountIntelligenceHref(
        "/prospection/accounts/company-a",
        searchParams,
        "secteur",
      ),
    ).toBe(
      "/prospection/accounts/company-a?tab=contacts&future=value&aiSection=secteur",
    )
  })

  it("retourne le pathname seul pour l'accueil canonique sans autre paramètre", () => {
    expect(
      buildAccountIntelligenceHref(
        "/prospection/accounts/company-a",
        new URLSearchParams("aiSection=accueil"),
        "accueil",
      ),
    ).toBe("/prospection/accounts/company-a")
  })

  it("préserve indépendamment Secteur pour A et Enjeux pour B lors de A → B → A", () => {
    let state = createEmbeddedAccountIntelligenceNavigationState("panel-a", "accueil")

    state = embeddedAccountIntelligenceNavigationReducer(state, {
      type: "navigate",
      panelId: "panel-a",
      section: "secteur",
    })
    state = embeddedAccountIntelligenceNavigationReducer(state, {
      type: "urlChanged",
      panelId: "panel-a",
      section: "secteur",
    })
    state = embeddedAccountIntelligenceNavigationReducer(state, {
      type: "activate",
      panelId: "panel-b",
      section: "accueil",
    })
    state = embeddedAccountIntelligenceNavigationReducer(state, {
      type: "navigate",
      panelId: "panel-b",
      section: "enjeux",
    })
    state = embeddedAccountIntelligenceNavigationReducer(state, {
      type: "urlChanged",
      panelId: "panel-b",
      section: "enjeux",
    })
    state = embeddedAccountIntelligenceNavigationReducer(state, {
      type: "activate",
      panelId: "panel-a",
      section: getRememberedAccountIntelligenceSection(state, "panel-a"),
    })

    expect(getRememberedAccountIntelligenceSection(state, "panel-b")).toBe("enjeux")
    expect(getRememberedAccountIntelligenceSection(state, "panel-a")).toBe("secteur")
    expect(getDisplayedAccountIntelligenceSection(
      state,
      "panel-a",
      "panel-a",
      "enjeux",
    )).toBe("secteur")
  })

  it("applique Back/Forward au seul panneau actif et ignore l'URL dans un panneau inactif", () => {
    let state = createEmbeddedAccountIntelligenceNavigationState("panel-a", "secteur")

    state = embeddedAccountIntelligenceNavigationReducer(state, {
      type: "urlChanged",
      panelId: "panel-a",
      section: "strategie",
    })
    const afterInactiveUrl = embeddedAccountIntelligenceNavigationReducer(state, {
      type: "urlChanged",
      panelId: "panel-b",
      section: "enjeux",
    })

    expect(getDisplayedAccountIntelligenceSection(
      state,
      "panel-a",
      "panel-a",
      "strategie",
    )).toBe("strategie")
    expect(afterInactiveUrl).toBe(state)
    expect(getRememberedAccountIntelligenceSection(state, "panel-b")).toBe("accueil")
  })

  it("pilote la route directe depuis useSearchParams avec un push commun au rail et au Home", () => {
    const desktop = readFileSync(
      resolve(root, "src/components/accounts-contacts/intelligence/ClientIntelligenceDesktopView.tsx"),
      "utf8",
    )

    expect(desktop).toContain("const searchParams = useSearchParams()")
    expect(desktop).toContain('parseAccountIntelligenceSection(searchParams.get("aiSection"))')
    expect(desktop).toContain("router.push(buildAccountIntelligenceHref(pathname, searchParams, section))")
    expect(desktop).toContain("onTabChange={navigateSection}")
    expect(desktop).toContain("onOpenTab={navigateSection}")
    expect(desktop).toContain("getClientIntelligenceDesktopTabLabel(activeTab)")
    expect(desktop).not.toContain("useState<ClientIntelligenceDesktopTabKey>")
  })

  it("garde les panneaux embedded montés et empêche un panneau inactif de piloter l'URL", () => {
    const shell = readFileSync(
      resolve(root, "src/components/accounts-contacts/CrmTabbedShell.tsx"),
      "utf8",
    )
    const panel = readFileSync(
      resolve(root, "src/components/accounts-contacts/CrmEntityPanel.tsx"),
      "utf8",
    )

    expect(shell).toContain("tabs.map((tab) =>")
    expect(shell).toContain('tab.id !== activeTabId && "hidden"')
    expect(shell).toContain("if (panelId !== activeTabId) return")
    expect(shell).toContain("router.push(buildAccountIntelligenceHref(pathname, searchParams, section))")
    expect(shell).toContain("getDisplayedAccountIntelligenceSection(")
    expect(panel).toContain("embeddedNavigation={desktopNavigation}")
  })
})
