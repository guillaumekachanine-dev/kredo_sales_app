import { create } from "zustand"

export type CrmLauncherMode = "recent" | "clients" | "targets" | "search"

export interface CrmAccountLauncherSnapshotState {
  open: boolean
  mode?: CrmLauncherMode
  searchQuery?: string
}

interface CrmAccountLauncherState {
  isOpen: boolean
  mode: CrmLauncherMode
  searchQuery: string
  open: (options?: { mode?: CrmLauncherMode; searchQuery?: string }) => void
  close: () => void
  setMode: (mode: CrmLauncherMode) => void
  setSearchQuery: (query: string) => void
  restore: (state: CrmAccountLauncherSnapshotState) => void
  getStateSnapshot: () => { open: boolean; mode: CrmLauncherMode; searchQuery: string }
}

/**
 * Store global léger pour contrôler l'état d'ouverture, le mode et la recherche
 * du CRM Account Launcher depuis n'importe quel point de navigation desktop/mobile de KREDO.
 */
export const useCrmAccountLauncherStore = create<CrmAccountLauncherState>((set, get) => ({
  isOpen: false,
  mode: "recent",
  searchQuery: "",

  open: (options) =>
    set({
      isOpen: true,
      mode: options?.mode ?? "recent",
      searchQuery: options?.searchQuery ?? "",
    }),

  close: () =>
    set({
      isOpen: false,
      searchQuery: "",
    }),

  setMode: (mode) => set({ mode }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  restore: (state) =>
    set({
      isOpen: state.open,
      mode: state.mode ?? "recent",
      searchQuery: state.searchQuery ?? "",
    }),

  getStateSnapshot: () => ({
    open: get().isOpen,
    mode: get().mode,
    searchQuery: get().searchQuery,
  }),
}))
