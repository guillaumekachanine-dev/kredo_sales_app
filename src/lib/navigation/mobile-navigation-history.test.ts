import { describe, expect, it } from "vitest"
import {
  canGoBack,
  canGoForward,
  createInitialMobileHistoryState,
  createSnapshot,
  extractMobileSnapshot,
  mergeHistoryState,
  parseUrlComponents,
  recordMobileNavigation,
  stepBack,
  stepForward,
  updateCurrentSnapshot,
  KREDO_MOBILE_NAV_KEY,
} from "./mobile-navigation-history"
import { mainItems } from "@/components/layout/MobileNavigationMenu"
import { useCrmAccountLauncherStore } from "@/hooks/use-crm-account-launcher"

describe("mobile-navigation-history (moteur pur et intégration)", () => {
  it("décompose correctement les URLs et leurs search params", () => {
    const parsed = parseUrlComponents("/intelligence?segment=retail&tab=sector-news#top")
    expect(parsed.pathname).toBe("/intelligence")
    expect(parsed.searchParams).toEqual({
      segment: "retail",
      tab: "sector-news",
    })
  })

  it("initialise l'état avec un unique checkpoint, Back et Forward disabled (Cas 6 & 7)", () => {
    const snapA = createSnapshot({
      url: "/cockpit",
      shell: { menuOpen: false, railOpen: false },
    })
    const state = createInitialMobileHistoryState(snapA)

    expect(state.entries).toHaveLength(1)
    expect(state.currentIndex).toBe(0)
    expect(canGoBack(state)).toBe(false)
    expect(canGoForward(state)).toBe(false)
  })

  it("gère une navigation simple A → B avec activation de Back (Cas 8 : A → B → Back)", () => {
    const snapA = createSnapshot({ url: "/cockpit" })
    let state = createInitialMobileHistoryState(snapA)

    const snapB = createSnapshot({ url: "/prospection/accounts" })
    state = recordMobileNavigation(state, snapA, snapB)

    expect(state.entries).toHaveLength(2)
    expect(state.currentIndex).toBe(1)
    expect(canGoBack(state)).toBe(true)
    expect(canGoForward(state)).toBe(false)

    // Retour arrière
    const back = stepBack(state, snapB)
    expect(back).not.toBeNull()
    expect(back!.nextState.currentIndex).toBe(0)
    expect(back!.targetSnapshot.url).toBe("/cockpit")
  })

  it("permet le retour A ← B avec restauration du snapshot de A et activation de Forward (Cas 9 & 11)", () => {
    const snapA = createSnapshot({
      url: "/cockpit",
      scroll: { main: 120 },
      shell: { menuOpen: true, railOpen: false, expandedMenuId: "intelligence" },
    })
    let state = createInitialMobileHistoryState(snapA)

    const snapB = createSnapshot({
      url: "/prospection/accounts",
      overlays: {
        crmLauncher: { open: true, mode: "clients", searchQuery: "Airbus" },
      },
    })
    state = recordMobileNavigation(state, snapA, snapB)

    // Retour arrière depuis B
    const stepBackResult = stepBack(state, snapB)
    expect(stepBackResult).not.toBeNull()

    const { nextState, targetSnapshot } = stepBackResult!
    expect(nextState.currentIndex).toBe(0)
    expect(canGoBack(nextState)).toBe(false)
    expect(canGoForward(nextState)).toBe(true)
    expect(targetSnapshot.url).toBe("/cockpit")
    expect(targetSnapshot.scroll?.main).toBe(120)
    expect(targetSnapshot.shell?.menuOpen).toBe(true)
    expect(targetSnapshot.shell?.expandedMenuId).toBe("intelligence")
  })

  it("permet d'avancer A → B (Forward) après un retour arrière avec restauration des search params (Cas 10)", () => {
    const snapA = createSnapshot({ url: "/cockpit" })
    let state = createInitialMobileHistoryState(snapA)

    const snapB = createSnapshot({
      url: "/intelligence?segment=retail&tab=sector-news",
      scroll: { main: 450 },
    })
    state = recordMobileNavigation(state, snapA, snapB)

    // Back
    const back = stepBack(state, snapB)
    state = back!.nextState

    // Forward
    const fwd = stepForward(state, snapA)
    expect(fwd).not.toBeNull()

    const { nextState, targetSnapshot } = fwd!
    expect(nextState.currentIndex).toBe(1)
    expect(canGoBack(nextState)).toBe(true)
    expect(canGoForward(nextState)).toBe(false)
    expect(targetSnapshot.url).toBe("/intelligence?segment=retail&tab=sector-news")
    expect(targetSnapshot.searchParams).toEqual({
      segment: "retail",
      tab: "sector-news",
    })
    expect(targetSnapshot.scroll?.main).toBe(450)
  })

  it("invalide la branche forward après une nouvelle navigation (Cas 12 : A → B → C → Back → D)", () => {
    const snapA = createSnapshot({ url: "/cockpit" })
    let state = createInitialMobileHistoryState(snapA)

    const snapB = createSnapshot({ url: "/agenda" })
    state = recordMobileNavigation(state, snapA, snapB)

    const snapC = createSnapshot({ url: "/finance" })
    state = recordMobileNavigation(state, snapB, snapC)

    expect(state.entries.map((e) => e.url)).toEqual(["/cockpit", "/agenda", "/finance"])
    expect(state.currentIndex).toBe(2)

    // Retour arrière vers B (/agenda)
    const back = stepBack(state, snapC)
    state = back!.nextState
    expect(state.currentIndex).toBe(1)
    expect(canGoForward(state)).toBe(true)

    // Nouvelle navigation vers D (/missions)
    const snapD = createSnapshot({ url: "/missions" })
    state = recordMobileNavigation(state, snapB, snapD)

    // La branche C (/finance) a été supprimée
    expect(state.entries.map((e) => e.url)).toEqual(["/cockpit", "/agenda", "/missions"])
    expect(state.currentIndex).toBe(2)
    expect(canGoForward(state)).toBe(false)
  })

  it("met à jour le snapshot in-place si l'URL reste la même", () => {
    const snap1 = createSnapshot({
      url: "/cockpit",
      shell: { menuOpen: false, railOpen: false },
    })
    let state = createInitialMobileHistoryState(snap1)

    const snap1Updated = createSnapshot({
      id: snap1.id,
      url: "/cockpit",
      shell: { menuOpen: true, railOpen: false },
    })
    state = recordMobileNavigation(state, snap1, snap1Updated)

    expect(state.entries).toHaveLength(1)
    expect(state.entries[0].snapshot.shell?.menuOpen).toBe(true)
  })

  it("fusionne proprement dans window.history.state sans corrompre Next.js (Cas 13)", () => {
    const nextJsState = {
      __NA: true,
      tree: ["/", { children: ["cockpit", {}] }],
      url: "/cockpit",
      customProp: 42,
    }

    const snapshot = createSnapshot({
      url: "/cockpit",
      scroll: { main: 80 },
    })

    const merged = mergeHistoryState(nextJsState, snapshot)

    expect(merged.__NA).toBe(true)
    expect(merged.tree).toEqual(["/", { children: ["cockpit", {}] }])
    expect(merged.url).toBe("/cockpit")
    expect(merged.customProp).toBe(42)
    expect(merged[KREDO_MOBILE_NAV_KEY]).toEqual(snapshot)
  })

  it("extrait et valide les snapshots KREDO depuis history.state", () => {
    const snapshot = createSnapshot({ url: "/cockpit" })
    const historyState = {
      __NA: true,
      [KREDO_MOBILE_NAV_KEY]: snapshot,
    }

    const extracted = extractMobileSnapshot(historyState)
    expect(extracted).toEqual(snapshot)

    expect(extractMobileSnapshot(null)).toBeNull()
    expect(extractMobileSnapshot({})).toBeNull()
    expect(extractMobileSnapshot({ [KREDO_MOBILE_NAV_KEY]: { invalid: true } })).toBeNull()
  })

  it("met à jour le snapshot courant avec updateCurrentSnapshot", () => {
    const snap = createSnapshot({ url: "/cockpit", scroll: { main: 0 } })
    let state = createInitialMobileHistoryState(snap)

    state = updateCurrentSnapshot(state, (prev) => ({
      ...prev,
      scroll: { main: 300 },
    }))

    expect(state.entries[0].snapshot.scroll?.main).toBe(300)
  })

  it("conserve Staffing et Intelligence dans le menu complet mobile (Cas 4)", () => {
    const itemIds = mainItems.map((item) => item.id)
    expect(itemIds).toContain("besoins") // Staffing / Besoins & Recrutement
    expect(itemIds).toContain("intelligence") // Intelligence / BI & Rapports & Veille

    const besoinsItem = mainItems.find((item) => item.id === "besoins")
    expect(besoinsItem?.tabs?.map((t) => t.href)).toContain("/missions/opps")
    expect(besoinsItem?.tabs?.map((t) => t.href)).toContain("/recruitment")

    const intelligenceItem = mainItems.find((item) => item.id === "intelligence")
    expect(intelligenceItem?.tabs?.map((t) => t.href)).toContain("/intelligence")
    expect(intelligenceItem?.tabs?.map((t) => t.href)).toContain("/reports")
    expect(intelligenceItem?.tabs?.map((t) => t.href)).toContain("/veille")
  })

  it("conserve et restaure l'état du launcher CRM (Cas 5 : shortcut CRM launcher)", () => {
    const store = useCrmAccountLauncherStore.getState()
    expect(store.isOpen).toBe(false)

    store.open({ mode: "clients", searchQuery: "Naval" })
    const snapshot1 = store.getStateSnapshot()
    expect(snapshot1.open).toBe(true)
    expect(snapshot1.mode).toBe("clients")
    expect(snapshot1.searchQuery).toBe("Naval")

    store.close()
    expect(store.getStateSnapshot().open).toBe(false)

    // Restauration
    store.restore({ open: true, mode: "clients", searchQuery: "Naval" })
    const snapshot2 = store.getStateSnapshot()
    expect(snapshot2.open).toBe(true)
    expect(snapshot2.mode).toBe("clients")
    expect(snapshot2.searchQuery).toBe("Naval")

    // Nettoyage
    store.close()
  })
})
