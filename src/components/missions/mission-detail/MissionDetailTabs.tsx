"use client"

import { cn } from "@/lib/utils"
import { MISSION_MOBILE_TABS } from "./mission-detail-types"
import type { MissionMobileTabId } from "./mission-detail-types"

// Onglets Mobile de la fiche mission — langage visuel repris de ReportsMobileView
// (nav pleine largeur, grid-cols-3, min-h-12, onglet actif souligné brand-brass).
// Le Desktop n'utilise pas ce composant (MissionOverviewDesktop porte sa propre
// navigation par étapes).

interface MissionDetailTabsProps {
  activeTab: MissionMobileTabId
  onTabChange: (tab: MissionMobileTabId) => void
  className?: string
}

export function MissionDetailTabs({ activeTab, onTabChange, className }: MissionDetailTabsProps) {
  return (
    <nav
      className={cn("grid grid-cols-3 border-y border-border bg-surface", className)}
      aria-label="Onglets de la mission"
    >
      {MISSION_MOBILE_TABS.map((tab) => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative min-h-12 px-2 text-sm font-semibold text-heading outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
              active
                ? "bg-primary/[0.04] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-brand-brass"
                : "hover:bg-surface-hover/60",
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
