import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createTabStore } from "./create-tab-store"

// Audit d'ouverture des pages (O-4) : le premier rendu client doit reproduire le
// rendu serveur, et l'URL — pas un onglet actif mémorisé — décide de l'écran affiché.

const STORED_TAB = {
  id: "tab-a",
  title: "Société A",
  entityType: "company-intelligence",
  entityId: "comp-a",
}

let storage: Record<string, string>

beforeEach(() => {
  storage = {}
  const sessionStorageMock = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
  }
  vi.stubGlobal("window", { sessionStorage: sessionStorageMock })
  vi.stubGlobal("sessionStorage", sessionStorageMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function seed(moduleKey: string, state: Record<string, unknown>) {
  storage[`kredo-${moduleKey}-tabs`] = JSON.stringify({ state, version: 0 })
}

describe("createTabStore — hydratation différée", () => {
  it("n'hydrate pas à la création : l'état initial est celui du rendu serveur", () => {
    seed("t1", { tabs: [STORED_TAB], activeTabId: "tab-a" })
    const store = createTabStore("t1")

    expect(store.getState().tabs).toEqual([])
    expect(store.getState().activeTabId).toBe("home")
  })

  it("restaure la liste des onglets mais jamais l'onglet actif (l'URL fait foi)", async () => {
    seed("t2", { tabs: [STORED_TAB], activeTabId: "tab-a" })
    const store = createTabStore("t2")

    await store.persist.rehydrate()

    expect(store.getState().tabs).toEqual([STORED_TAB])
    expect(store.getState().activeTabId).toBe("home")
  })

  it("ne persiste que la liste des onglets", () => {
    const store = createTabStore("t3")
    store.getState().openTab({ title: "B", entityType: "company-intelligence", entityId: "comp-b" })

    const written = JSON.parse(storage["kredo-t3-tabs"]) as { state: Record<string, unknown> }
    expect(Object.keys(written.state)).toEqual(["tabs"])
  })

  it("une mutation avant réhydratation ne perd pas les onglets stockés", () => {
    seed("t4", { tabs: [STORED_TAB] })
    const store = createTabStore("t4")

    store.getState().openTab({ title: "B", entityType: "company-intelligence", entityId: "comp-b" })

    const { tabs, activeTabId } = store.getState()
    expect(tabs.map((tab) => tab.entityId)).toEqual(["comp-a", "comp-b"])
    expect(activeTabId).toBe(tabs[1].id)
  })
})
