"use client"

import React from "react"
import { IconButton } from "@/components/ui/IconButton"
import { isSameDay, TIMEZONE_FALLBACK } from "@/lib/agenda/agenda-date-utils"

interface AgendaMobileHeaderProps {
  view: "day" | "week" | "month"
  referenceDate: Date
  onNavigate: (direction: "prev" | "today" | "next") => void
  onCreateClick: () => void
}

export function AgendaMobileHeader({
  view,
  referenceDate,
  onNavigate,
  onCreateClick,
}: AgendaMobileHeaderProps) {
  const isTodayActive = isSameDay(referenceDate, new Date())

  const formatPeriodLabel = () => {
    if (view === "day") {
      return referenceDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: TIMEZONE_FALLBACK,
      }).replace(/^\w/, (c) => c.toUpperCase())
    } else if (view === "week") {
      // Find start of week (Monday)
      const monday = new Date(referenceDate)
      const day = monday.getDay()
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
      monday.setDate(diff)
      
      const friday = new Date(monday)
      friday.setDate(monday.getDate() + 4)

      const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: TIMEZONE_FALLBACK }
      return `Sem. du ${monday.toLocaleDateString("fr-FR", options)} au ${friday.toLocaleDateString("fr-FR", options)}`
    } else {
      return referenceDate.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
        timeZone: TIMEZONE_FALLBACK,
      }).replace(/^\w/, (c) => c.toUpperCase())
    }
  }

  return (
    <header className="flex flex-col gap-2 bg-surface border border-border rounded-[var(--radius-large)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Agenda</span>
          <h1 className="font-heading text-lg font-bold leading-tight text-heading truncate">
            {formatPeriodLabel()}
          </h1>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5">
          {/* Today Button */}
          {!isTodayActive && (
            <button
              type="button"
              onClick={() => onNavigate("today")}
              className="px-2.5 py-1.5 text-xs font-bold text-primary bg-primary/8 hover:bg-primary/12 active:bg-primary/16 rounded-md transition-colors cursor-pointer"
            >
              Aujourd'hui
            </button>
          )}

          {/* Navigation Prev/Next */}
          <div className="flex items-center border border-border rounded-md bg-canvas/40 overflow-hidden">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Période précédente"
              onClick={() => onNavigate("prev")}
              className="border-r border-border rounded-none cursor-pointer h-8 w-8"
            >
              <svg className="size-4 text-heading" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Période suivante"
              onClick={() => onNavigate("next")}
              className="rounded-none cursor-pointer h-8 w-8"
            >
              <svg className="size-4 text-heading" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </IconButton>
          </div>

          {/* Create Button */}
          <IconButton
            variant="primary"
            size="sm"
            aria-label="Créer un événement"
            onClick={onCreateClick}
            className="rounded-md cursor-pointer h-8 w-8 flex items-center justify-center bg-primary text-primary-fg shadow-sm"
          >
            <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </IconButton>
        </div>
      </div>
    </header>
  )
}
