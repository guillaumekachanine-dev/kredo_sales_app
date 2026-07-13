"use client"

import { cn } from "@/lib/utils"

export type AutomationsTabId = "sante" | "couts"

interface AutomationsTabsProps {
  activeTab: AutomationsTabId
  onChange: (tab: AutomationsTabId) => void
}

const TABS: { id: AutomationsTabId; label: string }[] = [
  { id: "sante", label: "Santé & exécution" },
  { id: "couts", label: "Coûts" },
]

export function AutomationsTabs({ activeTab, onChange }: AutomationsTabsProps) {
  return (
    <div className="mb-4 flex border-b border-border" role="tablist" aria-label="Sections Automatisations">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative cursor-pointer px-6 py-3 text-sm font-semibold transition-colors duration-200",
              isActive ? "text-primary" : "text-muted hover:text-body"
            )}
            style={{ marginBottom: "-1px" }}
          >
            {tab.label}
            {isActive ? <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-primary" /> : null}
          </button>
        )
      })}
    </div>
  )
}
