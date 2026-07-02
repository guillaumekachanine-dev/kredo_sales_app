"use client"

import { create } from "zustand"

// Coordonne le repli automatique de la sidebar principale avec le panneau
// Cockpit Intelligence (les deux rails ne doivent jamais être dépliés en
// même temps). DesktopSidebar reste seul maître de son état affiché (via
// son propre useState, pour préserver le rendu sans flash au premier tour
// piloté par le cookie serveur) — ce store n'est qu'un bus de requêtes que
// DesktopSidebar écoute et applique lui-même à son état local, en lui
// reportant son état réel après coup (reportState).
interface SidebarCollapseState {
  isCollapsed: boolean
  pendingRequest: boolean | null
  wasExpandedBeforePanel: boolean
  reportState: (collapsed: boolean) => void
  requestCollapse: () => void
  requestRestore: () => void
  consumeRequest: () => void
}

export const useSidebarCollapse = create<SidebarCollapseState>((set, get) => ({
  isCollapsed: false,
  pendingRequest: null,
  wasExpandedBeforePanel: false,

  reportState: (collapsed) => set({ isCollapsed: collapsed }),

  requestCollapse: () => {
    const wasExpanded = !get().isCollapsed
    set({ wasExpandedBeforePanel: wasExpanded, pendingRequest: wasExpanded ? true : null })
  },

  requestRestore: () => {
    const shouldExpand = get().wasExpandedBeforePanel
    set({ pendingRequest: shouldExpand ? false : null, wasExpandedBeforePanel: false })
  },

  consumeRequest: () => set({ pendingRequest: null }),
}))
