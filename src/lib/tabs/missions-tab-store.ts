import { create } from "zustand"
import { persist } from "zustand/middleware"
import { SectionTab } from "./tab-types"

const MAX_TABS = 10

type MissionsTabStore = {
  tabs: SectionTab[]
  activeTabId: string // "home" | tab.id
  openTab: (tab: Omit<SectionTab, "id">) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  closeAllTabs: () => void
}

export const useMissionsTabStore = create<MissionsTabStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: "home",

      openTab: (tabData) => {
        const { tabs } = get()

        // Dédoublonnage : si l'entité est déjà ouverte, on switch simplement
        const existing = tabs.find((t) => t.entityId === tabData.entityId)
        if (existing) {
          set({ activeTabId: existing.id })
          return
        }

        // LRU cap : ferme le plus ancien si on dépasse MAX_TABS
        const newTabs = tabs.length >= MAX_TABS ? tabs.slice(1) : tabs

        const newTab: SectionTab = {
          ...tabData,
          id: crypto.randomUUID(),
        }

        set({
          tabs: [...newTabs, newTab],
          activeTabId: newTab.id,
        })
      },

      closeTab: (id) => {
        const { tabs, activeTabId } = get()
        const index = tabs.findIndex((t) => t.id === id)
        if (index === -1) return

        const newTabs = tabs.filter((t) => t.id !== id)

        // Activation du tab adjacent ou retour à "home"
        let nextActiveId = activeTabId
        if (activeTabId === id) {
          if (newTabs.length === 0) {
            nextActiveId = "home"
          } else {
            // Préférer le tab à gauche, sinon le premier disponible
            const prevTab = newTabs[Math.max(0, index - 1)]
            nextActiveId = prevTab.id
          }
        }

        set({ tabs: newTabs, activeTabId: nextActiveId })
      },

      setActiveTab: (id) => {
        set({ activeTabId: id })
      },

      closeAllTabs: () => {
        set({ tabs: [], activeTabId: "home" })
      },
    }),
    {
      name: "kredo-missions-tabs",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null
          const item = sessionStorage.getItem(name)
          return item ? JSON.parse(item) : null
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return
          sessionStorage.removeItem(name)
        },
      },
    }
  )
)
