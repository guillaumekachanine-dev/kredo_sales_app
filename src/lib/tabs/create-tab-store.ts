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

export function createTabStore(moduleKey: string) {
  return create<TabStore>()(
    persist(
      (set, get) => ({
        tabs: [],
        activeTabId: "home",

        openTab: (tabData) => {
          const { tabs } = get()
          const existing = tabs.find((t) => t.entityId === tabData.entityId)
          if (existing) {
            set({ activeTabId: existing.id })
            return
          }
          const newTabs = tabs.length >= MAX_TABS ? tabs.slice(1) : tabs
          const newTab: SectionTab = { ...tabData, id: crypto.randomUUID() }
          set({ tabs: [...newTabs, newTab], activeTabId: newTab.id })
        },

        closeTab: (id) => {
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

        setActiveTab: (id) => set({ activeTabId: id }),

        closeAllTabs: () => set({ tabs: [], activeTabId: "home" }),
      }),
      { name: `kredo-${moduleKey}-tabs`, storage: sessionStorageAdapter }
    )
  )
}
