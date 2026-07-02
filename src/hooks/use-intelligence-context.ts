"use client"

import { create } from "zustand"
import type { AccountIntelligencePanelData } from "@/lib/intelligence/account-panel-types"

export type IntelligenceEntityContext = {
  entityType: "company"
  entityId: string
  label: string
  pathname: string
}

type IntelligenceContextState = {
  entityContext: IntelligenceEntityContext | null
  panelData: AccountIntelligencePanelData | null
  panelDataKey: string | null

  registerEntity: (ctx: IntelligenceEntityContext) => void
  clearEntity: () => void
  hydratePanelData: (key: string, data: AccountIntelligencePanelData) => void
  clearPanelData: () => void
}

export const useIntelligenceContext = create<IntelligenceContextState>((set) => ({
  entityContext: null,
  panelData: null,
  panelDataKey: null,

  registerEntity: (ctx) => set({ entityContext: ctx }),
  clearEntity: () => set({ entityContext: null, panelData: null, panelDataKey: null }),
  hydratePanelData: (key, data) => set({ panelData: data, panelDataKey: key }),
  clearPanelData: () => set({ panelData: null, panelDataKey: null }),
}))
