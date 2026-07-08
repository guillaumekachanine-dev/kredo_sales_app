import { create } from "zustand"

interface CrmAccountLauncherState {
  isOpen: boolean
  open: () => void
  close: () => void
}

/**
 * Store global léger pour contrôler l'état d'ouverture du CRM Account Launcher
 * depuis n'importe quel point de navigation desktop/mobile de KREDO.
 */
export const useCrmAccountLauncherStore = create<CrmAccountLauncherState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
