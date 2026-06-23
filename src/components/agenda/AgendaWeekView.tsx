"use client"

import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { getDaysOfWeek, isSameDay, TIMEZONE_FALLBACK } from "@/lib/agenda/agenda-date-utils"
import { AgendaEventBlock } from "./AgendaEventBlock"

interface AgendaWeekViewProps {
  referenceDate: Date
  events: AgendaEvent[]
  onEventClick: (event: AgendaEvent) => void
  onEventHover: (event: AgendaEvent | null, rect: DOMRect | null) => void
}

const START_HOUR = 8
const END_HOUR = 19
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

function calculateEventPosition(occurredAt: string, endsAt: string) {
  const start = new Date(occurredAt)
  const end = new Date(endsAt)

  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()

  const startOffset = startMinutes - (START_HOUR * 60)
  const duration = endMinutes - startMinutes

  let topPct = (startOffset / TOTAL_MINUTES) * 100
  let heightPct = (duration / TOTAL_MINUTES) * 100

  // Bounds check
  if (topPct < 0) {
    heightPct += topPct
    topPct = 0
  }
  if (topPct + heightPct > 100) {
    heightPct = 100 - topPct
  }
  if (heightPct < 5) heightPct = 5

  return {
    top: `${topPct}%`,
    height: `${heightPct}%`,
  }
}

export function AgendaWeekView({
  referenceDate,
  events,
  onEventClick,
  onEventHover,
}: AgendaWeekViewProps) {
  // Generate Monday to Friday
  const weekDays = useMemo(() => {
    const monday = new Date(referenceDate)
    const day = monday.getDay()
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    return getDaysOfWeek(monday)
  }, [referenceDate])

  // Get current time marker position
  const timeMarker = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDay() // 0: Sun, 1: Mon, ..., 6: Sat

    if (currentDay < 1 || currentDay > 5) return null

    const currentHour = now.getHours()
    const currentMin = now.getMinutes()

    if (currentHour < START_HOUR || currentHour >= END_HOUR) return null

    const minutesSinceStart = (currentHour - START_HOUR) * 60 + currentMin
    const topPct = (minutesSinceStart / TOTAL_MINUTES) * 100

    return {
      dayIndex: currentDay - 1, // Mon is 0
      top: `${topPct}%`,
    }
  }, [referenceDate]) // re-evaluate when reference date shifts

  // Helper to place overlapping events side by side
  const positionedEventsByDay = useMemo(() => {
    return weekDays.map((day) => {
      const dayEvents = events.filter((e) => isSameDay(new Date(e.starts_at), day))
      
      // Sort dayEvents by occurred_at
      const sorted = [...dayEvents].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )

      // Layout columns array to detect overlaps
      const cols: AgendaEvent[][] = []

      sorted.forEach((event) => {
        let colIdx = 0
        while (colIdx < cols.length) {
          const colEvents = cols[colIdx]
          const hasOverlap = colEvents.some((existing) => {
            const estart = new Date(existing.starts_at).getTime()
            const eend = new Date(existing.ends_at).getTime()
            const vstart = new Date(event.starts_at).getTime()
            const vend = new Date(event.ends_at).getTime()
            return vstart < eend && vend > estart
          })
          if (!hasOverlap) {
            break
          }
          colIdx++
        }

        if (colIdx >= cols.length) {
          cols.push([])
        }
        cols[colIdx].push(event)
      })

      // Generate styles
      return sorted.map((event) => {
        const colIdx = cols.findIndex((col) => col.includes(event))
        
        // Find how many total overlapping columns exist in this specific timeframe
        let totalColsInGroup = 0
        cols.forEach((col) => {
          const hasOverlap = col.some((existing) => {
            const estart = new Date(existing.starts_at).getTime()
            const eend = new Date(existing.ends_at).getTime()
            const vstart = new Date(event.starts_at).getTime()
            const vend = new Date(event.ends_at).getTime()
            return vstart < eend && vend > estart
          })
          if (hasOverlap) {
            totalColsInGroup++
          }
        })

        if (totalColsInGroup === 0) totalColsInGroup = 1

        const width = 100 / totalColsInGroup
        const left = colIdx * width
        const pos = calculateEventPosition(event.starts_at, event.ends_at)

        return {
          event,
          style: {
            top: pos.top,
            height: pos.height,
            left: `${left}%`,
            width: `${width}%`,
          },
        }
      })
    })
  }, [weekDays, events])

  return (
    <div className="flex flex-col border border-border bg-surface rounded-md overflow-hidden select-none">
      {/* Week Header */}
      <div className="grid grid-cols-[5rem_repeat(5,1fr)] border-b border-border bg-surface-raised/40">
        <div className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted text-center border-r border-border">
          Heure
        </div>
        {weekDays.map((day, idx) => {
          const isToday = isSameDay(day, new Date())
          const formattedDay = day.toLocaleDateString("fr-FR", { weekday: "short" })
          const formattedDate = day.toLocaleDateString("fr-FR", { day: "numeric" })

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-3 text-center border-r border-border last:border-r-0 flex flex-col items-center justify-center gap-0.5",
                isToday && "bg-primary/5"
              )}
            >
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isToday ? "text-primary" : "text-muted")}>
                {formattedDay}
              </span>
              <span
                className={cn(
                  "text-sm font-bold flex items-center justify-center h-6 w-6 rounded-full",
                  isToday ? "bg-primary text-primary-fg" : "text-heading"
                )}
              >
                {formattedDate}
              </span>
            </div>
          )
        })}
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-[5rem_repeat(5,1fr)] relative" style={{ height: "660px" }}>
        {/* Hour Axis Column */}
        <div className="relative h-full border-r border-border bg-surface-raised/10">
          {HOURS.map((hour, idx) => {
            const topPct = (idx / (HOURS.length - 1)) * 100
            return (
              <div
                key={hour}
                style={{ top: `${topPct}%` }}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-bold text-muted"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            )
          })}
        </div>

        {/* Grid Background Horizontal Lines */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-[5rem_repeat(5,1fr)] h-full">
          <div className="col-start-2 col-span-5 relative h-full">
            {HOURS.map((hour, idx) => {
              if (idx === 0 || idx === HOURS.length - 1) return null
              const topPct = (idx / (HOURS.length - 1)) * 100
              return (
                <React.Fragment key={hour}>
                  {/* Hour line */}
                  <div
                    style={{ top: `${topPct}%` }}
                    className="absolute inset-x-0 border-t border-border/60"
                  />
                  {/* Half-hour dashed line */}
                  {idx < HOURS.length - 1 && (
                    <div
                      style={{ top: `${topPct + (1 / (HOURS.length - 1) / 2) * 100}%` }}
                      className="absolute inset-x-0 border-t border-dashed border-border/30"
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Day Columns */}
        {weekDays.map((day, dayIdx) => {
          const isToday = isSameDay(day, new Date())
          const items = positionedEventsByDay[dayIdx]

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "relative h-full border-r border-border last:border-r-0",
                isToday && "bg-primary/[0.01]"
              )}
            >
              {/* Event Blocks */}
              {items.map(({ event, style }) => (
                <AgendaEventBlock
                  key={event.id}
                  event={event}
                  view="week"
                  style={style}
                  onClick={() => onEventClick(event)}
                  onHover={(rect) => onEventHover(rect ? event : null, rect)}
                />
              ))}

              {/* Current Time Line Marker */}
              {timeMarker && timeMarker.dayIndex === dayIdx && (
                <div
                  style={{ top: timeMarker.top }}
                  className="absolute inset-x-0 flex items-center z-10 pointer-events-none"
                >
                  <div className="h-2 w-2 rounded-full bg-danger -ml-1" />
                  <div className="flex-1 h-[2px] bg-danger" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
