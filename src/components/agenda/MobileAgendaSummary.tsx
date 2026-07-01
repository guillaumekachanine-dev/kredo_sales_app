import React from "react"
import { cn } from "@/lib/utils"
import type { AgendaSnapshot } from "@/lib/agenda/agenda-types"

interface MobileAgendaSummaryProps {
  summary: AgendaSnapshot["summary"]
  className?: string
}

export function MobileAgendaSummary({ summary, className }: MobileAgendaSummaryProps) {
  const items = [
    {
      label: "Retards",
      count: summary.totalOverdue,
      active: summary.totalOverdue > 0,
      activeClass: "border-danger/30 bg-danger-muted/10 text-danger",
      inactiveClass: "border-border bg-surface text-muted",
      icon: (
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Aujourd'hui",
      count: summary.totalToday,
      active: summary.totalToday > 0,
      activeClass: "border-primary/30 bg-primary/5 text-primary",
      inactiveClass: "border-border bg-surface text-muted",
      icon: (
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
    },
    {
      label: "Conflits",
      count: summary.totalConflicts,
      active: summary.totalConflicts > 0,
      activeClass: "border-warning/40 bg-warning/5 text-warning",
      inactiveClass: "border-border bg-surface text-muted",
      icon: (
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
    },
    {
      label: "Sous tension",
      value: summary.hasWeekTension ? "Oui" : "Non",
      active: summary.hasWeekTension,
      activeClass: "border-danger/30 bg-danger-muted/10 text-danger animate-pulse",
      inactiveClass: "border-border bg-surface text-muted",
      icon: (
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
        </svg>
      ),
    },
  ]

  return (
    <div className={cn("grid grid-cols-4 gap-1.5", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
            item.active ? item.activeClass : item.inactiveClass
          )}
        >
          <div className="flex items-center gap-1 mb-0.5">
            {item.icon}
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {item.label}
            </span>
          </div>
          <span className="text-xs font-bold leading-none">
            {item.count !== undefined ? item.count : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
