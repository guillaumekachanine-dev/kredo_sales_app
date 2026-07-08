"use client"

import { cn } from "@/lib/utils"
import type { CrmLauncherMode } from "./CrmAccountLauncher"

interface CrmLauncherModeTabsProps {
  activeMode: CrmLauncherMode
  onChange: (mode: CrmLauncherMode) => void
}

export function CrmLauncherModeTabs({
  activeMode,
  onChange,
}: CrmLauncherModeTabsProps) {
  const tabs = [
    { value: "personal", label: "Favoris" },
    { value: "news", label: "Actualités" },
    { value: "opportunities", label: "Opportunités" },
  ] as const

  return (
    <div className="flex border-b border-border/50">
      {tabs.map((tab) => {
        const isActive = activeMode === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "px-4 py-2 text-xs font-semibold border-b-2 transition-all -mb-px",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-heading"
            )}
          >
            {tab.label}
          </button>
        )
      })}
      
      {/* Tab Campagne TODO discret et désactivé */}
      <button
        key="campaign"
        type="button"
        disabled
        title="Bientôt disponible"
        className="px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-muted/40 cursor-not-allowed flex items-center gap-1.5"
      >
        Campagnes
        <span className="text-[9px] bg-border px-1 py-0.5 rounded text-muted font-normal uppercase tracking-wider">
          TODO
        </span>
      </button>
    </div>
  )
}
