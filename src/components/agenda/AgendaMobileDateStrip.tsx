"use client"

import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { getDaysOfWeek, getStartOfWeek, isSameDay } from "@/lib/agenda/agenda-date-utils"

interface AgendaMobileDateStripProps {
  referenceDate: Date
  events: AgendaEvent[]
  onDaySelect: (date: Date) => void
}

export function AgendaMobileDateStrip({
  referenceDate,
  events,
  onDaySelect,
}: AgendaMobileDateStripProps) {
  const startOfWeek = useMemo(() => getStartOfWeek(referenceDate), [referenceDate])
  const days = useMemo(() => getDaysOfWeek(startOfWeek), [startOfWeek])

  // Map events to days to see which day has at least one event
  const daysWithEvents = useMemo(() => {
    const counts = new Map<string, number>()
    events.forEach((event) => {
      const dateStr = new Date(event.occurred_at).toDateString()
      counts.set(dateStr, (counts.get(dateStr) || 0) + 1)
    })
    return counts
  }, [events])

  return (
    <div className="grid grid-cols-5 gap-1.5 bg-surface border border-border rounded-[var(--radius-large)] p-2 shadow-sm">
      {days.map((day) => {
        const isSelected = isSameDay(day, referenceDate)
        const isToday = isSameDay(day, new Date())
        const dayLabel = day.toLocaleDateString("fr-FR", { weekday: "short" }).substring(0, 1).toUpperCase()
        const dayNum = day.getDate()
        const hasEvents = daysWithEvents.has(day.toDateString())

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onDaySelect(day)}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all relative cursor-pointer min-h-[52px]",
              isSelected
                ? "bg-primary text-primary-fg font-bold"
                : "bg-canvas/30 hover:bg-canvas/50 text-body"
            )}
          >
            {/* Weekday letter */}
            <span className={cn(
              "text-[9px] font-semibold tracking-wider uppercase mb-0.5",
              isSelected ? "text-primary-fg/80" : isToday ? "text-primary font-bold" : "text-muted"
            )}>
              {dayLabel}
            </span>

            {/* Day number */}
            <span className="text-sm font-heading leading-tight tracking-tight">
              {dayNum}
            </span>

            {/* Indicator Dot for events */}
            {hasEvents && (
              <span className={cn(
                "absolute bottom-1 size-1.5 rounded-full",
                isSelected ? "bg-primary-fg" : "bg-primary/80"
              )} />
            )}

            {/* Today indicator ring */}
            {isToday && !isSelected && (
              <span className="absolute inset-0 rounded-md border border-primary/40 pointer-events-none" />
            )}
          </button>
        )
      })}
    </div>
  )
}
