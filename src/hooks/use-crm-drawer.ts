"use client"

import { create } from "zustand"
import { recordCrmLauncherVisit } from "@/lib/crm/account-launcher-preferences"

type CrmDrawerCompanyOptions = {
  returnTo?: { kind: "contact"; id: string }
  /** ADR-0019 — déclenche l'ouverture immédiate du scan à l'affichage du drawer. */
  autoOpenScan?: boolean
}

type CrmDrawerTarget =
  | { kind: "company"; id: string; returnTo?: { kind: "contact"; id: string }; autoOpenScan?: boolean }
  | { kind: "contact"; id: string; returnTo?: { kind: "company"; id: string } }
  | null

interface CrmDrawerState {
  target: CrmDrawerTarget
  openCompany: (companyId: string, options?: CrmDrawerCompanyOptions) => void
  openContact: (contactId: string, returnTo?: { kind: "company"; id: string }) => void
  close: () => void
}

export const useCrmDrawer = create<CrmDrawerState>((set, get) => ({
  target: null,

  openCompany: (companyId, options) => {
    recordCrmLauncherVisit(companyId)
    set({
      target: {
        kind: "company",
        id: companyId,
        returnTo: options?.returnTo,
        autoOpenScan: options?.autoOpenScan,
      },
    })
  },

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
