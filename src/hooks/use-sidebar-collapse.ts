"use client"

import { create } from "zustand"

// ─────────────────────────────────────────────────────────────────────────────
//  useSidebarCollapse — registre de verrous temporaires externes (SHELL 6.5)
//
//  Ce store n'est PLUS un bus d'ordre de repli/dépli, ni une source de vérité
//  sur l'état visuel de la sidebar. `DesktopSidebar` dérive lui-même son état
//  effectif (préférence utilisateur cookie + politique pathname du Shell +
//  ce compteur de verrous — voir `resolveDesktopSidebarCollapsed`).
//
//  Chaque consommateur légitime (Cockpit Intelligence, cockpit CRM) est
//  responsable d'un couple équilibré :
//     requestCollapse()  à l'acquisition du verrou
//     requestRestore()   au nettoyage (unmount / condition retombée)
//
//  Le compteur autorise plusieurs verrous simultanés (Cockpit CRM + Cockpit
//  Intelligence = 2). La sidebar reste repliée tant que
//  `collapseRequestCount > 0`. `requestRestore` est protégé contre l'underflow.
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarCollapseState {
  collapseRequestCount: number
  requestCollapse: () => void
  requestRestore: () => void
}

export const useSidebarCollapse = create<SidebarCollapseState>((set) => ({
  collapseRequestCount: 0,

  requestCollapse: () =>
    set((state) => ({ collapseRequestCount: state.collapseRequestCount + 1 })),

  requestRestore: () =>
    set((state) => ({
      collapseRequestCount: Math.max(0, state.collapseRequestCount - 1),
    })),
}))
