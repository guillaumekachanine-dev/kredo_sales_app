import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"

const root = process.cwd()

describe("CrmSectionTabBar — onglet fixe Liste et cycle de vie", () => {
  const componentPath = resolve(
    root,
    "src/components/accounts-contacts/CrmSectionTabBar.tsx",
  )
  const source = readFileSync(componentPath, "utf8")

  beforeEach(() => {
    useCrmTabStore.setState({ tabs: [], activeTabId: "home" })
  })

  describe("Comportement du store et transitions de navigation", () => {
    it("démarre sur la page Comptes & Contacts avec activeTabId='home' et aucun compte ouvert", () => {
      const state = useCrmTabStore.getState()
      expect(state.activeTabId).toBe("home")
      expect(state.tabs).toHaveLength(0)
    })

    it("l'ouverture d'un premier compte active ce compte sans ajouter 'Liste' au store tabs", () => {
      const store = useCrmTabStore.getState()
      store.openTab({
        title: "Société A",
        entityType: "company-intelligence",
        entityId: "comp-a",
      })

      const updated = useCrmTabStore.getState()
      expect(updated.tabs).toHaveLength(1)
      expect(updated.tabs[0].title).toBe("Société A")
      expect(updated.tabs[0].id).not.toBe("home")
      expect(updated.activeTabId).toBe(updated.tabs[0].id)
    })

    it("l'ouverture de plusieurs comptes préserve l'état et l'ordre des comptes", () => {
      const store = useCrmTabStore.getState()
      store.openTab({
        title: "Société A",
        entityType: "company-intelligence",
        entityId: "comp-a",
      })
      store.openTab({
        title: "Société B",
        entityType: "company-intelligence",
        entityId: "comp-b",
      })

      const state = useCrmTabStore.getState()
      expect(state.tabs).toHaveLength(2)
      expect(state.tabs[0].title).toBe("Société A")
      expect(state.tabs[1].title).toBe("Société B")
      expect(state.activeTabId).toBe(state.tabs[1].id)
    })

    it("le clic sur Liste (setActiveTab('home')) revient à la liste sans fermer les comptes", () => {
      const store = useCrmTabStore.getState()
      store.openTab({
        title: "Société A",
        entityType: "company-intelligence",
        entityId: "comp-a",
      })
      store.openTab({
        title: "Société B",
        entityType: "company-intelligence",
        entityId: "comp-b",
      })

      store.setActiveTab("home")

      const state = useCrmTabStore.getState()
      expect(state.activeTabId).toBe("home")
      expect(state.tabs).toHaveLength(2)
      expect(state.tabs[0].title).toBe("Société A")
      expect(state.tabs[1].title).toBe("Société B")
    })

    it("enchaîne le parcours A -> Liste -> B -> Liste -> A en gardant les comptes intacts", () => {
      const store = useCrmTabStore.getState()
      store.openTab({
        title: "Société A",
        entityType: "company-intelligence",
        entityId: "comp-a",
      })
      const tabAId = useCrmTabStore.getState().tabs[0].id

      store.openTab({
        title: "Société B",
        entityType: "company-intelligence",
        entityId: "comp-b",
      })
      const tabBId = useCrmTabStore.getState().tabs[1].id

      // A actif
      store.setActiveTab(tabAId)
      expect(useCrmTabStore.getState().activeTabId).toBe(tabAId)

      // Retour Liste
      store.setActiveTab("home")
      expect(useCrmTabStore.getState().activeTabId).toBe("home")

      // Passage à B
      store.setActiveTab(tabBId)
      expect(useCrmTabStore.getState().activeTabId).toBe(tabBId)

      // Retour Liste
      store.setActiveTab("home")
      expect(useCrmTabStore.getState().activeTabId).toBe("home")

      // Retour A
      store.setActiveTab(tabAId)
      expect(useCrmTabStore.getState().activeTabId).toBe(tabAId)

      // Les 2 comptes sont toujours là
      expect(useCrmTabStore.getState().tabs).toHaveLength(2)
    })

    it("fermeture successive de A puis B : le store repasse à 'home' et vide tabs", () => {
      const store = useCrmTabStore.getState()
      store.openTab({
        title: "Société A",
        entityType: "company-intelligence",
        entityId: "comp-a",
      })
      store.openTab({
        title: "Société B",
        entityType: "company-intelligence",
        entityId: "comp-b",
      })

      const [tabA, tabB] = useCrmTabStore.getState().tabs

      // Fermeture A
      store.closeTab(tabA.id)
      let state = useCrmTabStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].id).toBe(tabB.id)

      // Fermeture B (dernier compte)
      store.closeTab(tabB.id)
      state = useCrmTabStore.getState()
      expect(state.tabs).toHaveLength(0)
      expect(state.activeTabId).toBe("home")
    })
  })

  describe("Contrat JSX et invariants visuels de CrmSectionTabBar", () => {
    it("ne rend rien (null) lorsqu'aucun compte n'est ouvert", () => {
      expect(source).toContain("if (tabs.length === 0) {")
      expect(source).toContain("return null")
    })

    it("place l'onglet Liste systématiquement en premier AVANT tabs.map", () => {
      const listButtonIndex = source.indexOf('<button')
      const tabsMapIndex = source.indexOf('{tabs.map((tab)')

      expect(listButtonIndex).toBeGreaterThan(0)
      expect(tabsMapIndex).toBeGreaterThan(listButtonIndex)
    })

    it("utilise le sentinel 'home' pour aria-selected et setActiveTab", () => {
      expect(source).toContain('const isHomeActive = activeTabId === "home"')
      expect(source).toContain('aria-selected={isHomeActive}')
      expect(source).toContain('onClick={() => setActiveTab("home")}')
      expect(source).toContain('handleKeyDown(e, "home")')
    })

    it("n'applique aucun HEX en dur", () => {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,6}/)
    })

    it("n'a plus de fond Bleu Pétrole, écrit 'Liste' en bleu navy et ne dessine que la bordure droite", () => {
      const listButtonSlice = source.slice(
        source.indexOf('<button'),
        source.indexOf('{tabs.map'),
      )
      expect(listButtonSlice).not.toContain("bg-page-accounts-contacts")
      expect(listButtonSlice).not.toContain("text-white")
      expect(listButtonSlice).toContain("text-edito-navy")
      expect(listButtonSlice).toContain("border-r border-border")
      expect(listButtonSlice).not.toMatch(/border-b-\w/)
    })

    it("affiche le libellé 'Liste' et l'icône de liste à lignes horizontales", () => {
      expect(source).toContain('<span className="leading-none">Liste</span>')
      expect(source).toContain("<ListIcon />")
      expect(source).toContain("d=\"M4 6h16M4 10h16M4 14h16M4 18h16\"")
    })

    it("n'affiche jamais de bouton de fermeture sur l'onglet Liste", () => {
      // Le bouton Liste est un <button>, et le seul IconButton est dans tabs.map
      const listButtonSlice = source.slice(
        source.indexOf('<button'),
        source.indexOf('{tabs.map'),
      )
      expect(listButtonSlice).not.toContain("<IconButton")
      expect(listButtonSlice).not.toContain("closeTab")
      expect(listButtonSlice).not.toContain("Fermer")
    })

    it("reste accessible au clavier avec rôle tab et tabIndex={0}", () => {
      const listButtonSlice = source.slice(
        source.indexOf('<button'),
        source.indexOf('{tabs.map'),
      )
      expect(listButtonSlice).toContain('role="tab"')
      expect(listButtonSlice).toContain("tabIndex={0}")
      expect(listButtonSlice).toContain("onKeyDown=")
    })

    it("ne réutilise pas sectionTabHomeClasses qui contient des gradients incompatibles", () => {
      expect(source).not.toContain("sectionTabHomeClasses")
    })
  })
})
