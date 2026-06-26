"use client"

import { create } from "zustand"

export type StaffingDrawerTab = "profil" | "staffing" | "recrutement" | "ressources"

interface StaffingDrawerState {
  isOpen: boolean
  staffingId: string | null
  activeTab: StaffingDrawerTab
  openStaffingDrawer: (staffingId: string, tab?: StaffingDrawerTab) => void
  closeStaffingDrawer: () => void
  setActiveTab: (tab: StaffingDrawerTab) => void
}

export const useStaffingDrawerStore = create<StaffingDrawerState>((set) => ({
  isOpen: false,
  staffingId: null,
  activeTab: "profil",
  openStaffingDrawer: (staffingId, tab = "profil") =>
    set({ isOpen: true, staffingId, activeTab: tab }),
  closeStaffingDrawer: () => set({ isOpen: false, staffingId: null }),
  setActiveTab: (activeTab) => set({ activeTab }),
}))
