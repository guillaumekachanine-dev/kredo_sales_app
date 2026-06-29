"use client"

import { create } from "zustand"

export type CasePerspective = "candidate" | "opportunity"
export type StaffingDrawerTab = "profil" | "staffing" | "recrutement"
export type OpportunityDrawerTab = "besoin" | "staffing" | "recrutement"
export type AssistanceCaseTab = StaffingDrawerTab | OpportunityDrawerTab

interface AssistanceCaseContext {
  opportunityId?: string | null
  candidateId?: string | null
  staffingId?: string | null
}

interface StaffingDrawerState {
  isOpen: boolean
  perspective: CasePerspective
  staffingId: string | null
  opportunityId: string | null
  candidateId: string | null
  activeTab: AssistanceCaseTab
  openStaffingDrawer: (staffingId: string, tab?: StaffingDrawerTab) => void
  openOpportunityDrawer: (opportunityId: string, tab?: OpportunityDrawerTab) => void
  closeStaffingDrawer: () => void
  setActiveTab: (tab: AssistanceCaseTab) => void
  setPerspective: (perspective: CasePerspective) => void
  hydrateCaseContext: (context: AssistanceCaseContext) => void
  selectPositioning: (staffingId: string, candidateId?: string | null) => void
}

export const useStaffingDrawerStore = create<StaffingDrawerState>((set) => ({
  isOpen: false,
  perspective: "candidate",
  staffingId: null,
  opportunityId: null,
  candidateId: null,
  activeTab: "profil",
  openStaffingDrawer: (staffingId, tab = "profil") =>
    set({
      isOpen: true,
      perspective: "candidate",
      staffingId,
      candidateId: null,
      opportunityId: null,
      activeTab: tab,
    }),
  openOpportunityDrawer: (opportunityId, tab = "besoin") =>
    set({
      isOpen: true,
      perspective: "opportunity",
      opportunityId,
      staffingId: null,
      candidateId: null,
      activeTab: tab,
    }),
  closeStaffingDrawer: () =>
    set({
      isOpen: false,
      staffingId: null,
      opportunityId: null,
      candidateId: null,
      perspective: "candidate",
      activeTab: "profil",
    }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setPerspective: (perspective) =>
    set((state) => ({
      perspective,
      activeTab:
        perspective === "opportunity"
          ? state.activeTab === "profil"
            ? "besoin"
            : state.activeTab
          : state.activeTab === "besoin"
            ? "profil"
            : state.activeTab,
    })),
  hydrateCaseContext: (context) =>
    set((state) => ({
      opportunityId:
        context.opportunityId === undefined
          ? state.opportunityId
          : context.opportunityId,
      candidateId:
        context.candidateId === undefined ? state.candidateId : context.candidateId,
      staffingId:
        context.staffingId === undefined ? state.staffingId : context.staffingId,
    })),
  selectPositioning: (staffingId, candidateId = null) =>
    set({
      staffingId,
      candidateId,
      perspective: "candidate",
      activeTab: "profil",
    }),
}))
