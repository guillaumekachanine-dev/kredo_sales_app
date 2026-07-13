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
    <div 
      className="inline-flex items-center gap-1.5 bg-surface-raised border border-border/50 p-1.5 rounded-full" 
      role="tablist" 
      aria-label="Sections Automatisations"
    >
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
              "cursor-pointer px-5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ease-out",
              isActive 
                ? "bg-surface text-heading shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.03)] border border-border/30 font-bold" 
                : "text-muted hover:text-body border border-transparent"
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
