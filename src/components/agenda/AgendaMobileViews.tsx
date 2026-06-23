"use client"

import React, { useMemo } from "react"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { getDaysOfWeek, getStartOfWeek, isSameDay } from "@/lib/agenda/agenda-date-utils"
import { AgendaMobileEventCard } from "./AgendaMobileEventCard"
import { cn } from "@/lib/utils"

interface ViewProps {
  referenceDate: Date
  events: AgendaEvent[]
  onEventClick: (event: AgendaEvent) => void
  onCreateClick: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. JOUR VIEW
// ─────────────────────────────────────────────────────────────────────────────
export function AgendaMobileDayView({
  referenceDate,
  events,
  onEventClick,
  onCreateClick,
}: ViewProps) {
  const dayEvents = useMemo(() => {
    return events.filter((e) => isSameDay(new Date(e.starts_at), referenceDate))
  }, [events, referenceDate])

  if (dayEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-12 px-4 text-center shadow-sm">
        <div className="size-10 rounded-full bg-canvas flex items-center justify-center mb-3">
          <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-heading">Aucun événement</h4>
        <p className="mt-1 text-xs text-body max-w-[200px]">
          Il n'y a pas d'événement programmé pour cette journée.
        </p>
        <button
          type="button"
          onClick={onCreateClick}
          className="mt-4 px-3.5 py-2 text-xs font-bold text-primary bg-primary/8 hover:bg-primary/12 active:bg-primary/16 rounded-md transition-all cursor-pointer"
        >
          Créer un événement
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {dayEvents.map((event) => (
        <AgendaMobileEventCard
          key={event.id}
          event={event}
          onClick={() => onEventClick(event)}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SEMAINE VIEW
// ─────────────────────────────────────────────────────────────────────────────
export function AgendaMobileWeekView({
  referenceDate,
  events,
  onEventClick,
  onCreateClick,
}: ViewProps) {
  const startOfWeek = useMemo(() => getStartOfWeek(referenceDate), [referenceDate])
  const days = useMemo(() => getDaysOfWeek(startOfWeek), [startOfWeek])

  // Group events by day of week
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>()
    days.forEach((day) => {
      map.set(day.toDateString(), [])
    })

    events.forEach((event) => {
      const dateStr = new Date(event.starts_at).toDateString()
      if (map.has(dateStr)) {
        map.get(dateStr)!.push(event)
      }
    })

    return map
  }, [events, days])

  const totalEventsInWeek = events.length

  if (totalEventsInWeek === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-12 px-4 text-center shadow-sm">
        <div className="size-10 rounded-full bg-canvas flex items-center justify-center mb-3">
          <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-heading">Semaine vide</h4>
        <p className="mt-1 text-xs text-body max-w-[200px]">
          Aucun événement prévu du lundi au vendredi.
        </p>
        <button
          type="button"
          onClick={onCreateClick}
          className="mt-4 px-3.5 py-2 text-xs font-bold text-primary bg-primary/8 hover:bg-primary/12 active:bg-primary/16 rounded-md transition-all cursor-pointer"
        >
          Planifier un événement
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {days.map((day) => {
        const dateStr = day.toDateString()
        const dayEvents = eventsByDay.get(dateStr) || []
        const isToday = isSameDay(day, new Date())
        const dayName = day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        const formattedDayName = dayName.replace(/^\w/, (c) => c.toUpperCase())

        const isEmpty = dayEvents.length === 0

        return (
          <div key={day.toISOString()} className="flex flex-col gap-2">
            {/* Header for the day */}
            <div className="flex items-center justify-between border-b border-border pb-1 px-1">
              <span className={cn(
                "text-xs font-bold font-heading",
                isToday ? "text-primary" : "text-heading"
              )}>
                {formattedDayName} {isToday && "· Aujourd'hui"}
              </span>
              <span className="text-[10px] font-bold text-muted bg-canvas px-2 py-0.5 rounded-full border border-border/40">
                {dayEvents.length} {dayEvents.length > 1 ? "événements" : "événement"}
              </span>
            </div>

            {/* Event list or collapsed discrete line */}
            {isEmpty ? (
              <div className="py-2.5 px-3 bg-surface/50 border border-border/40 rounded-lg text-center text-xs text-muted/80">
                Aucun événement
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {dayEvents.map((event) => (
                  <AgendaMobileEventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MOIS VIEW
// ─────────────────────────────────────────────────────────────────────────────
export function AgendaMobileMonthView({
  referenceDate,
  events,
  onEventClick,
  onCreateClick,
}: ViewProps) {
  // Group events by day for days that actually have events in the active month
  const groupedEvents = useMemo(() => {
    const map = new Map<string, { date: Date; items: AgendaEvent[] }>()
    
    events.forEach((event) => {
      const d = new Date(event.starts_at)
      // Check if event is in the same month/year as the reference date
      if (d.getMonth() === referenceDate.getMonth() && d.getFullYear() === referenceDate.getFullYear()) {
        const dateStr = d.toDateString()
        if (!map.has(dateStr)) {
          map.set(dateStr, { date: d, items: [] })
        }
        map.get(dateStr)!.items.push(event)
      }
    })

    // Sort by date key ascending
    return Array.from(map.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    )
  }, [events, referenceDate])

  if (groupedEvents.length === 0) {
    const monthLabel = referenceDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-12 px-4 text-center shadow-sm">
        <div className="size-10 rounded-full bg-canvas flex items-center justify-center mb-3">
          <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-heading">Mois vide</h4>
        <p className="mt-1 text-xs text-body max-w-[220px]">
          Aucun événement prévu en {monthLabel}.
        </p>
        <button
          type="button"
          onClick={onCreateClick}
          className="mt-4 px-3.5 py-2 text-xs font-bold text-primary bg-primary/8 hover:bg-primary/12 active:bg-primary/16 rounded-md transition-all cursor-pointer"
        >
          Créer un événement
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groupedEvents.map(({ date, items }) => {
        const isToday = isSameDay(date, new Date())
        const dayName = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        const formattedDayName = dayName.replace(/^\w/, (c) => c.toUpperCase())

        return (
          <div key={date.toISOString()} className="flex flex-col gap-2">
            {/* Header for useful days */}
            <div className="flex items-center justify-between border-b border-border pb-1 px-1">
              <span className={cn(
                "text-xs font-bold font-heading",
                isToday ? "text-primary" : "text-heading"
              )}>
                {formattedDayName} {isToday && "· Aujourd'hui"}
              </span>
              <span className="text-[10px] font-bold text-muted bg-canvas px-2 py-0.5 rounded-full border border-border/40">
                {items.length} {items.length > 1 ? "événements" : "événement"}
              </span>
            </div>

            {/* Event list */}
            <div className="flex flex-col gap-2.5">
              {items.map((event) => (
                <AgendaMobileEventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
