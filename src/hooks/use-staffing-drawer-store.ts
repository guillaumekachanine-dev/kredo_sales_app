"use client"

import { create } from "zustand"

export type AssistanceCasePerspective = "candidate" | "opportunity"
export type AssistanceCaseTab = "subject" | "staffing" | "recruitment"
export type StaffingDrawerTab = "profil" | "staffing" | "recrutement"
export type OpportunityDrawerTab = "besoin" | "staffing" | "recrutement"

interface CaseContext {
  opportunityId?: string | null
  candidateId?: string | null
  staffingId?: string | null
}

interface StaffingDrawerState {
  isOpen: boolean
  staffingId: string | null
  opportunityId: string | null
  candidateId: string | null
  perspective: AssistanceCasePerspective
  activeTab: AssistanceCaseTab
  openStaffingDrawer: (staffingId: string, tab?: StaffingDrawerTab) => void
  openOpportunityDrawer: (opportunityId: string, tab?: OpportunityDrawerTab) => void
  closeStaffingDrawer: () => void
  setActiveTab: (tab: AssistanceCaseTab) => void
  setPerspective: (perspective: AssistanceCasePerspective) => void
  hydrateCaseContext: (context: CaseContext) => void
  selectPositioning: (staffingId: string, candidateId: string) => void
}

function normalizeCandidateTab(tab: StaffingDrawerTab): AssistanceCaseTab {
  if (tab === "profil") return "subject"
  if (tab === "recrutement") return "recruitment"
  return "staffing"
}

function normalizeOpportunityTab(tab: OpportunityDrawerTab): AssistanceCaseTab {
  if (tab === "besoin") return "subject"
  if (tab === "recrutement") return "recruitment"
  return "staffing"
}

export const useStaffingDrawerStore = create<StaffingDrawerState>((set) => ({
  isOpen: false,
  staffingId: null,
  opportunityId: null,
  candidateId: null,
  perspective: "candidate",
  activeTab: "subject",
  openStaffingDrawer: (staffingId, tab = "profil") =>
    set({
      isOpen: true,
      staffingId,
      opportunityId: null,
      candidateId: null,
      perspective: "candidate",
      activeTab: normalizeCandidateTab(tab),
    }),
  openOpportunityDrawer: (opportunityId, tab = "besoin") =>
    set({
      isOpen: true,
      staffingId: null,
      opportunityId,
      candidateId: null,
      perspective: "opportunity",
      activeTab: normalizeOpportunityTab(tab),
    }),
  closeStaffingDrawer: () =>
    set({
      isOpen: false,
      staffingId: null,
      opportunityId: null,
      candidateId: null,
      perspective: "candidate",
      activeTab: "subject",
    }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setPerspective: (perspective) => set({ perspective }),
  hydrateCaseContext: (context) =>
    set((state) => ({
      staffingId: context.staffingId === undefined ? state.staffingId : context.staffingId,
      opportunityId:
        context.opportunityId === undefined ? state.opportunityId : context.opportunityId,
      candidateId: context.candidateId === undefined ? state.candidateId : context.candidateId,
    })),
  selectPositioning: (staffingId, candidateId) => set({ staffingId, candidateId }),
}))
