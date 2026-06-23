"use client"

import React, { useMemo } from "react"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { getMonthGrid, isSameDay, getStartOfMonth } from "@/lib/agenda/agenda-date-utils"
import { AgendaEventBlock } from "./AgendaEventBlock"
import { cn } from "@/lib/utils"

interface AgendaMonthViewProps {
  referenceDate: Date
  events: AgendaEvent[]
  onEventClick: (event: AgendaEvent) => void
  onEventHover: (event: AgendaEvent | null, rect: DOMRect | null) => void
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MAX_VISIBLE_EVENTS = 3

export function AgendaMonthView({
  referenceDate,
  events,
  onEventClick,
  onEventHover,
}: AgendaMonthViewProps) {
  const currentMonthStart = useMemo(() => getStartOfMonth(referenceDate), [referenceDate])
  const gridDays = useMemo(() => getMonthGrid(referenceDate), [referenceDate])

  return (
    <div className="flex flex-col border border-border bg-surface rounded-md overflow-hidden select-none">
      {/* Month View Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border bg-surface-raised/40">
        {WEEKDAYS.map((day, idx) => {
          const isWeekend = idx >= 5 // Saturday / Sunday
          return (
            <div
              key={day}
              className={cn(
                "p-3 text-center border-r border-border last:border-r-0 text-[10px] font-bold uppercase tracking-wider",
                isWeekend ? "text-muted/70 bg-surface-raised/10" : "text-muted"
              )}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Grid Days */}
      <div className="grid grid-cols-7 grid-rows-[repeat(6,minmax(100px,1fr))] border-t border-border">
        {gridDays.map((day, idx) => {
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = day.getMonth() === currentMonthStart.getMonth()
          const dayOfWeek = day.getDay() // 0: Sun, 1: Mon, etc.
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

          // Filter events for this day
          const dayEvents = events.filter((e) => isSameDay(new Date(e.occurred_at), day))
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS)
          const remainingCount = dayEvents.length - MAX_VISIBLE_EVENTS

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 border-r border-b border-border min-h-[100px] flex flex-col gap-1.5 transition-colors",
                // Remove right border on the 7th column (Sunday)
                (idx + 1) % 7 === 0 && "border-r-0",
                !isCurrentMonth && "bg-canvas/20",
                isWeekend && isCurrentMonth && "bg-surface-raised/20",
                isToday && "bg-primary/[0.03]"
              )}
            >
              {/* Day Number */}
              <div className="flex justify-between items-center mb-1">
                <span
                  className={cn(
                    "text-xs font-bold flex items-center justify-center h-5 w-5 rounded-full",
                    !isCurrentMonth && "text-muted/40",
                    isCurrentMonth && !isToday && (isWeekend ? "text-muted/80" : "text-heading"),
                    isToday && "bg-primary text-primary-fg"
                  )}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] font-bold text-muted bg-canvas px-1 rounded-[var(--radius-small)]">
                    {dayEvents.length} {dayEvents.length > 1 ? "évts" : "évt"}
                  </span>
                )}
              </div>

              {/* Event List */}
              <div className="flex flex-col gap-1 min-h-0 flex-1 overflow-hidden">
                {visibleEvents.map((event) => (
                  <AgendaEventBlock
                    key={event.id}
                    event={event}
                    view="month"
                    onClick={() => onEventClick(event)}
                    onHover={(rect) => onEventHover(rect ? event : null, rect)}
                  />
                ))}
                {remainingCount > 0 && (
                  <div className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-[var(--radius-small)] bg-primary/5 border border-primary/10 text-center">
                    + {remainingCount} autre{remainingCount > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
