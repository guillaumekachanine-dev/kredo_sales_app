"use client"

import { create } from "zustand"

// ─────────────────────────────────────────────────────────────────────────────
//  useSidebarCollapse — registre de verrous externes exceptionnels (SHELL 6.5 / 6.6)
//
//  Ce store n'est PLUS un bus d'ordre de repli/dépli, ni une source de vérité
//  sur l'état visuel de la sidebar. `DesktopSidebar` dérive lui-même son état
//  effectif (préférence utilisateur cookie + politique pathname du Shell +
//  état d'ouverture du Cockpit Intelligence lu directement + ce compteur de
//  verrous — voir `resolveDesktopSidebarCollapsed`).
//
//  Il ne subsiste ici que les surfaces dont l'état ne peut pas être dérivé
//  proprement par le Shell — à date, le cockpit CRM (`CrmTabbedShell`), dont le
//  `isCockpitActive` dépend du pathname, de `activeTabId` et du mode embedded
//  multi-compte. Le Cockpit Intelligence n'est PLUS consommateur : le Shell lit
//  `useIntelligencePanel.isOpen` sans passer par ce registre.
//
//  Chaque consommateur légitime est responsable d'un couple équilibré :
//     requestCollapse()  à l'acquisition du verrou
//     requestRestore()   au nettoyage (unmount / condition retombée)
//
//  Le compteur autorise plusieurs verrous simultanés. La sidebar reste repliée
//  tant que `collapseRequestCount > 0`. `requestRestore` est protégé contre
//  l'underflow.
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
