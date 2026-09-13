import { create } from "zustand"
import { persist } from "zustand/middleware"
import { SectionTab } from "./tab-types"

const MAX_TABS = 10

type TabStore = {
  tabs: SectionTab[]
  activeTabId: string
  openTab: (tab: Omit<SectionTab, "id">) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  closeAllTabs: () => void
}

type PersistedTabState = Pick<TabStore, "tabs">

const sessionStorageAdapter = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return null
    const item = sessionStorage.getItem(name)
    return item ? JSON.parse(item) : null
  },
  setItem: (name: string, value: unknown) => {
    if (typeof window === "undefined") return
    sessionStorage.setItem(name, JSON.stringify(value))
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return
    sessionStorage.removeItem(name)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hydratation — audit d'ouverture des pages (O-4)
//
//  Le stockage étant synchrone, `persist` hydratait le store AU MOMENT DE SA
//  CRÉATION, donc avant le premier rendu client, alors que le serveur avait rendu
//  l'état initial. Avec un onglet ouvert, le HTML serveur (la liste) et le premier
//  rendu client (le cockpit) divergeaient : erreur d'hydratation, re-rendu client
//  complet, et l'utilisateur voyait une page puis une autre.
//
//  Désormais :
//   - `skipHydration` : le premier rendu client reproduit le rendu serveur ;
//     `TabStoresHydrator` (monté dans AppShell) réhydrate juste après ;
//   - seule la LISTE des onglets est persistée. L'onglet actif n'est plus restauré
//     au rechargement : c'est l'URL qui décide de ce qui s'affiche, jamais un état
//     de session invisible (les anciennes entrées `activeTabId` sont ignorées) ;
//   - toute mutation antérieure à la réhydratation la déclenche d'abord, pour ne
//     jamais écraser les onglets stockés par un état encore vide.
// ─────────────────────────────────────────────────────────────────────────────

export function createTabStore(moduleKey: string, onOpenTab?: (tab: SectionTab) => void) {
  return create<TabStore>()(
    persist(
      (set, get, api) => {
        const ensureHydrated = () => {
          if (!api.persist.hasHydrated()) void api.persist.rehydrate()
        }

        return {
          tabs: [],
          activeTabId: "home",

          openTab: (tabData) => {
            ensureHydrated()
            const { tabs } = get()
            const existing = tabs.find((t) => t.entityId === tabData.entityId)
            if (existing) {
              set({ activeTabId: existing.id })
              onOpenTab?.(existing)
              return
            }
            const newTabs = tabs.length >= MAX_TABS ? tabs.slice(1) : tabs
            const newTab: SectionTab = { ...tabData, id: crypto.randomUUID() }
            set({ tabs: [...newTabs, newTab], activeTabId: newTab.id })
            onOpenTab?.(newTab)
          },

          closeTab: (id) => {
            ensureHydrated()
            const { tabs, activeTabId } = get()
            const index = tabs.findIndex((t) => t.id === id)
            if (index === -1) return
            const newTabs = tabs.filter((t) => t.id !== id)
            let nextActiveId = activeTabId
            if (activeTabId === id) {
              nextActiveId = newTabs.length === 0 ? "home" : newTabs[Math.max(0, index - 1)].id
            }
            set({ tabs: newTabs, activeTabId: nextActiveId })
          },

          setActiveTab: (id) => {
            ensureHydrated()
            set({ activeTabId: id })
          },

          closeAllTabs: () => {
            ensureHydrated()
            set({ tabs: [], activeTabId: "home" })
          },
        }
      },
      {
        name: `kredo-${moduleKey}-tabs`,
        storage: sessionStorageAdapter,
        skipHydration: true,
        partialize: (state): PersistedTabState => ({ tabs: state.tabs }),
        merge: (persisted, current) => {
          const tabs = (persisted as Partial<PersistedTabState> | undefined)?.tabs
          if (!Array.isArray(tabs)) return current
          const activeTabId = tabs.some((tab) => tab.id === current.activeTabId)
            ? current.activeTabId
            : "home"
          return { ...current, tabs, activeTabId }
        },
      },
    ),
  )
}
