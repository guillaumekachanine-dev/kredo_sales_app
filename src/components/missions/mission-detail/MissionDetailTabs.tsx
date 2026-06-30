"use client"

import { cn } from "@/lib/utils"
import { MISSION_DETAIL_TABS } from "./mission-detail-types"
import type { MissionDetailTabId } from "./mission-detail-types"

interface MissionDetailTabsProps {
  activeTab: MissionDetailTabId
  onTabChange: (tab: MissionDetailTabId) => void
  className?: string
}

export function MissionDetailTabs({ activeTab, onTabChange, className }: MissionDetailTabsProps) {
  return (
    <nav
      className={cn("flex items-center border-b border-border/60 overflow-x-auto scrollbar-none", className)}
      aria-label="Onglets de la mission"
    >
      {MISSION_DETAIL_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-[2px] transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-body"
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
