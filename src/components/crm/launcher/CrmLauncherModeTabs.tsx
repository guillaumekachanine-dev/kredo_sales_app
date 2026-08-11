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
    { value: "recent", label: "Récents" },
    { value: "opportunities", label: "Opportunités" },
  ] as const

  return (
    <div className="flex w-full border-b border-border/50">
      {tabs.map((tab) => {
        const isActive = activeMode === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex-1 py-2 text-xs font-semibold border-b-2 transition-all -mb-px text-center",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-heading"
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
