"use client"

import { create } from "zustand"

interface IntelligencePanelState {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

export const useIntelligencePanel = create<IntelligencePanelState>((set) => ({
  isOpen: false,
  toggle: () => set((s) => {
    const next = !s.isOpen
    persistOpen(next)
    return { isOpen: next }
  }),
  open: () => {
    persistOpen(true)
    set({ isOpen: true })
  },
  close: () => {
    persistOpen(false)
    set({ isOpen: false })
  },
}))

function persistOpen(open: boolean) {
  if (typeof document !== "undefined") {
    document.cookie = `kredo_intelligence_open=${open}; path=/; max-age=31536000; SameSite=Lax`
  }
}
