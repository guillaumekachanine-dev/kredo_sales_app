"use client"

import { create } from "zustand"

type CrmDrawerTarget =
  | { kind: "company"; id: string; returnTo?: { kind: "contact"; id: string } }
  | { kind: "contact"; id: string; returnTo?: { kind: "company"; id: string } }
  | null

interface CrmDrawerState {
  target: CrmDrawerTarget
  openCompany: (companyId: string, returnTo?: { kind: "contact"; id: string }) => void
  openContact: (contactId: string, returnTo?: { kind: "company"; id: string }) => void
  close: () => void
}

export const useCrmDrawer = create<CrmDrawerState>((set, get) => ({
  target: null,

  openCompany: (companyId, returnTo) =>
    set({ target: { kind: "company", id: companyId, returnTo } }),

  openContact: (contactId, returnTo) =>
    set({ target: { kind: "contact", id: contactId, returnTo } }),

  close: () => {
    const current = get().target
    if (current?.returnTo) {
      if (current.returnTo.kind === "company") {
        set({ target: { kind: "company", id: current.returnTo.id } })
      } else {
        set({ target: { kind: "contact", id: current.returnTo.id } })
      }
    } else {
      set({ target: null })
    }
  },
}))
