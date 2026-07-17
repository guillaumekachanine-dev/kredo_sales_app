"use client"

import { cn } from "@/lib/utils"

export type OpportunityDetailTabId = "overview" | "staffing" | "timeline" | "finance"

interface OpportunityDetailTabsProps {
  activeTab: OpportunityDetailTabId
  isMobile: boolean
  onTabChange: (tab: OpportunityDetailTabId) => void
}

const DESKTOP_TABS: Array<{ id: OpportunityDetailTabId; label: string }> = [
  { id: "overview", label: "Vue d’ensemble" },
  { id: "staffing", label: "Staffing" },
  { id: "timeline", label: "Timeline" },
  { id: "finance", label: "Finance" },
]

const MOBILE_TABS: Array<{ id: OpportunityDetailTabId; label: string }> = [
  { id: "overview", label: "Synthèse" },
  { id: "staffing", label: "Staffing" },
  { id: "timeline", label: "Timeline" },
  { id: "finance", label: "Finance" },
]

export function OpportunityDetailTabs({
  activeTab,
  isMobile,
  onTabChange,
}: OpportunityDetailTabsProps) {
  const tabs = isMobile ? MOBILE_TABS : DESKTOP_TABS

  return (
    <nav
      aria-label="Onglets de l’opportunité"
      className="grid grid-cols-4 border-b border-border/80"
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`opportunity-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`opportunity-panel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "-mb-px min-w-0 border-b-2 px-2 py-3 text-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:px-4",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-body hover:text-heading",
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
