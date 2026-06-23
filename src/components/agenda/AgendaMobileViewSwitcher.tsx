"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type AgendaViewMode = "day" | "week" | "month"

interface AgendaMobileViewSwitcherProps {
  view: AgendaViewMode
  onChange: (view: AgendaViewMode) => void
}

export function AgendaMobileViewSwitcher({
  view,
  onChange,
}: AgendaMobileViewSwitcherProps) {
  const options: { id: AgendaViewMode; label: string }[] = [
    { id: "day", label: "Jour" },
    { id: "week", label: "Semaine" },
    { id: "month", label: "Mois" },
  ]

  return (
    <div className="flex bg-canvas border border-border rounded-lg p-1 w-full" role="tablist" aria-label="Modes d'affichage de l'agenda">
      {options.map((opt) => {
        const isActive = view === opt.id

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer min-h-[36px]",
              isActive
                ? "bg-surface text-heading shadow-[var(--shadow-button)] border border-border/20"
                : "text-body hover:text-heading active:bg-canvas/50"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
