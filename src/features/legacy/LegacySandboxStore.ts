import { create } from "zustand"

interface LegacySandboxState {
  isOpen: boolean
  open: () => void
  close: () => void
  setOpen: (open: boolean) => void
}

export const useLegacySandboxStore = create<LegacySandboxState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (open: boolean) => set({ isOpen: open }),
}))
