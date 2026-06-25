"use client"

import { create } from "zustand"

export type EventDrawerTab = "details" | "output" | "timeline"

interface EventDrawerState {
  isOpen: boolean
  eventId: string | null
  activeTab: EventDrawerTab
  openEventDrawer: (eventId: string, tab?: EventDrawerTab) => void
  closeEventDrawer: () => void
  setActiveTab: (tab: EventDrawerTab) => void
}

export const useEventDrawerStore = create<EventDrawerState>((set) => ({
  isOpen: false,
  eventId: null,
  activeTab: "details",
  openEventDrawer: (eventId, tab = "details") =>
    set({ isOpen: true, eventId, activeTab: tab }),
  closeEventDrawer: () => set({ isOpen: false, eventId: null }),
  setActiveTab: (activeTab) => set({ activeTab }),
}))
