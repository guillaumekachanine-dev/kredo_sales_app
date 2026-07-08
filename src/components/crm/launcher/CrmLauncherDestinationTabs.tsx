"use client"

import { cn } from "@/lib/utils"
import type { CrmLauncherDestination } from "./CrmAccountLauncher"

interface CrmLauncherDestinationTabsProps {
  activeDestination: CrmLauncherDestination
  onChange: (destination: CrmLauncherDestination) => void
}

export function CrmLauncherDestinationTabs({
  activeDestination,
  onChange,
}: CrmLauncherDestinationTabsProps) {
  const destinations = [
    { value: "cockpit", label: "Cockpit" },
    { value: "contacts", label: "Contacts" },
    { value: "opportunities", label: "Opportunités" },
  ] as const

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0">
        Destination :
      </span>
      <div className="inline-flex rounded-[var(--radius-medium)] bg-canvas p-0.5 border border-border/80 w-fit">
        {destinations.map((dest) => {
          const isActive = activeDestination === dest.value
          return (
            <button
              key={dest.value}
              type="button"
              onClick={() => onChange(dest.value)}
              className={cn(
                "rounded-[var(--radius-small)] px-3 py-1.5 text-xs font-semibold transition-all",
                isActive
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted hover:text-heading"
              )}
            >
              {dest.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
