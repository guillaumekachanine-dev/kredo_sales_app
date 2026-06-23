"use client"

import React, { useState, useMemo, useEffect, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { getAgendaEvents } from "@/lib/agenda/agenda-actions"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { formatDateRangeLabel, getStartOfWeek } from "@/lib/agenda/agenda-date-utils"
import { AgendaToolbar } from "./AgendaToolbar"
import { AgendaWeekView } from "./AgendaWeekView"
import { AgendaMonthView } from "./AgendaMonthView"
import { AgendaEventPreview } from "./AgendaEventPreview"
import { AgendaEventDrawer } from "./AgendaEventDrawer"

export function AgendaDesktopPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 1. Sync state with search params
  const viewParam = searchParams.get("view")
  const typeParam = searchParams.get("type")

  const view = (viewParam === "month" ? "month" : "week") as "week" | "month"
  const selectedType = typeParam || "all"

  // 2. Reference date for calendar navigation (default to today)
  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date())

  // 3. UI states
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null)

  // Hover preview state
  const [hoveredEvent, setHoveredEvent] = useState<AgendaEvent | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const [isPending, startTransition] = useTransition()

  // Calculate start/end range to query based on view & referenceDate
  const { startRange, endRange } = useMemo(() => {
    if (view === "week") {
      const start = getStartOfWeek(referenceDate)
      const end = new Date(start)
      end.setDate(start.getDate() + 4) // Friday
      end.setHours(23, 59, 59, 999)
      return {
        startRange: start.toISOString(),
        endRange: end.toISOString(),
      }
    } else {
      // Month view gets full month grid padding
      const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
      const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return {
        startRange: start.toISOString(),
        endRange: end.toISOString(),
      }
    }
  }, [referenceDate, view])

  // Fetch events
  const loadData = () => {
    setLoading(true)
    startTransition(async () => {
      const data = await getAgendaEvents(startRange, endRange)
      setEvents(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadData()
  }, [startRange, endRange])

  // Local filtering in memory
  const filteredEvents = useMemo(() => {
    if (selectedType === "all") return events
    return events.filter((e) => e.event_type === selectedType)
  }, [events, selectedType])

  // Navigations
  const handleNavigate = (direction: "prev" | "today" | "next") => {
    setHoveredEvent(null)
    setAnchorRect(null)

    if (direction === "today") {
      setReferenceDate(new Date())
      return
    }

    const step = view === "week" ? 7 : 0
    const nextDate = new Date(referenceDate)

    if (view === "week") {
      nextDate.setDate(referenceDate.getDate() + (direction === "next" ? step : -step))
    } else {
      nextDate.setMonth(referenceDate.getMonth() + (direction === "next" ? 1 : -1))
    }

    setReferenceDate(nextDate)
  }

  const updateUrlParams = (v: "week" | "month", t: string) => {
    const params = new URLSearchParams()
    params.set("view", v)
    params.set("type", t)
    router.push(`/agenda?${params.toString()}`)
  }

  const handleViewChange = (v: "week" | "month") => {
    updateUrlParams(v, selectedType)
  }

  const handleTypeChange = (t: string) => {
    updateUrlParams(view, t)
  }

  const handleEventClick = (event: AgendaEvent) => {
    setHoveredEvent(null)
    setAnchorRect(null)
    setSelectedEvent(event)
    setDrawerOpen(true)
  }

  const handleCreateNew = () => {
    setSelectedEvent(null)
    setDrawerOpen(true)
  }

  const handleSaved = () => {
    loadData()
  }

  return (
    <>
      <DesktopAnalyticalPage
        title={
          <div className="flex items-center gap-4">
            <span>Agenda</span>
            <span className="text-xs font-semibold text-body bg-canvas/60 border border-border px-3 py-1 rounded-[var(--radius-small)]">
              {formatDateRangeLabel(view, referenceDate)}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-4">
            {/* Calendar navigation controls */}
            <div className="flex items-center border border-border rounded-md bg-surface overflow-hidden">
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Période précédente"
                onClick={() => handleNavigate("prev")}
                className="border-r border-border rounded-none cursor-pointer"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </IconButton>
              <button
                type="button"
                onClick={() => handleNavigate("today")}
                className="px-3 py-1 text-xs font-bold text-heading hover:bg-canvas/50 border-r border-border transition-colors cursor-pointer"
              >
                Aujourd'hui
              </button>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Période suivante"
                onClick={() => handleNavigate("next")}
                className="rounded-none cursor-pointer"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </IconButton>
            </div>

            {/* Create event primary action button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateNew}
              className="flex items-center gap-1 cursor-pointer font-semibold shadow-[var(--shadow-button)]"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Créer un événement
            </Button>
          </div>
        }
        toolbar={
          <AgendaToolbar
            view={view}
            onViewChange={handleViewChange}
            selectedType={selectedType}
            onTypeChange={handleTypeChange}
          />
        }
      >
        {/* Loading overlay indicator */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-50 bg-canvas/30 backdrop-blur-[0.5px] flex items-center justify-center rounded-md" aria-busy="true">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {/* Render target calendar view */}
          {view === "week" ? (
            <AgendaWeekView
              referenceDate={referenceDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onEventHover={setHoveredEvent ? (evt, rect) => { setHoveredEvent(evt); setAnchorRect(rect); } : () => {}}
            />
          ) : (
            <AgendaMonthView
              referenceDate={referenceDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onEventHover={setHoveredEvent ? (evt, rect) => { setHoveredEvent(evt); setAnchorRect(rect); } : () => {}}
            />
          )}
        </div>
      </DesktopAnalyticalPage>

      {/* Floating Hover Card Preview */}
      {hoveredEvent && (
        <AgendaEventPreview
          event={hoveredEvent}
          anchorRect={anchorRect}
          onOpenDetails={() => handleEventClick(hoveredEvent)}
        />
      )}

      {/* Drawer Details/Edit Form */}
      <AgendaEventDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        event={selectedEvent}
        onSaved={handleSaved}
      />
    </>
  )
}
