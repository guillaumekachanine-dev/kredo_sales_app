"use client"

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { MobileFilterTrigger } from "@/components/ui/mobile/MobileFilterTrigger"
import { MobileDecisionFooter } from "@/components/ui/mobile/MobileDecisionFooter"
import { Button } from "@/components/ui/Button"

import { getAgendaEvents } from "@/lib/agenda/agenda-actions"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { getStartOfWeek, getLocalIsoDateString } from "@/lib/agenda/agenda-date-utils"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"

import { AgendaMobileHeader } from "./AgendaMobileHeader"
import { AgendaMobileDateStrip } from "./AgendaMobileDateStrip"
import { AgendaMobileViewSwitcher, type AgendaViewMode } from "./AgendaMobileViewSwitcher"
import { AgendaMobileDayView, AgendaMobileWeekView, AgendaMobileMonthView } from "./AgendaMobileViews"
import { AgendaMobileFilterDrawer } from "./AgendaMobileFilterDrawer"
import { AgendaMobileEventDrawer } from "./AgendaMobileEventDrawer"

export function AgendaMobilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 1. Sync search params
  const viewParam = searchParams.get("view") || "day"
  const view = (["day", "week", "month"].includes(viewParam) ? viewParam : "day") as AgendaViewMode

  const dateParam = searchParams.get("date")
  const referenceDate = useMemo(() => {
    if (dateParam) {
      const parsed = new Date(dateParam)
      if (!isNaN(parsed.getTime())) return parsed
    }
    return new Date()
  }, [dateParam])

  const typeFilter = searchParams.get("type") || "all"
  const companyFilter = searchParams.get("company") || "all"
  const taskFilter = searchParams.get("task") || "all"

  const activeFilters = useMemo(
    () => ({
      type: typeFilter,
      companyId: companyFilter,
      task: taskFilter,
    }),
    [typeFilter, companyFilter, taskFilter]
  )

  // 2. Fetch/Data state
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // 3. Drawers state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null)

  // 4. Period range computation
  const { startRangeIso, endRangeIso } = useMemo(() => {
    let start: Date
    let end: Date

    if (view === "day") {
      start = new Date(referenceDate)
      start.setHours(0, 0, 0, 0)
      end = new Date(referenceDate)
      end.setHours(23, 59, 59, 999)
    } else if (view === "week") {
      start = getStartOfWeek(referenceDate)
      end = new Date(start)
      end.setDate(start.getDate() + 4) // Friday
      end.setHours(23, 59, 59, 999)
    } else {
      // Month
      start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
      end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
    }

    return {
      startRangeIso: start.toISOString(),
      endRangeIso: end.toISOString(),
    }
  }, [referenceDate, view])

  // 5. Load data on range change
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAgendaEvents(startRangeIso, endRangeIso)
      startTransition(() => {
        setEvents(data)
      })
    } catch (err) {
      console.error("Error loading agenda events:", err)
    } finally {
      setLoading(false)
    }
  }, [endRangeIso, startTransition, startRangeIso])

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [startRangeIso, endRangeIso])

  // 6. Local filtering & company extraction
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (activeFilters.type !== "all" && e.event_type !== activeFilters.type) {
        return false
      }
      if (activeFilters.companyId !== "all" && e.company_id !== activeFilters.companyId) {
        return false
      }
      if (activeFilters.task !== "all") {
        const hasTask = !!e.preparatory_task
        const isTaskCompleted =
          hasTask &&
          !!e.preparatory_task &&
          (e.preparatory_task.status === "completed" ||
            e.preparatory_task.status === "fait" ||
            e.preparatory_task.status === "done")
        const isTaskPending = hasTask && !isTaskCompleted

        if (activeFilters.task === "has_task" && !isTaskPending) return false
        if (activeFilters.task === "no_task" && isTaskPending) return false
      }

      return true
    })
  }, [events, activeFilters])

  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>()
    events.forEach((e) => {
      if (e.company) {
        map.set(e.company.id, e.company.name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [events])

  // 7. Navigation helper
  const updateUrlParams = (updates: {
    view?: AgendaViewMode
    date?: string
    type?: string
    company?: string
    task?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (updates.view !== undefined) params.set("view", updates.view)
    if (updates.date !== undefined) params.set("date", updates.date)
    if (updates.type !== undefined) params.set("type", updates.type)
    if (updates.company !== undefined) params.set("company", updates.company)
    if (updates.task !== undefined) params.set("task", updates.task)
    router.push(`/agenda?${params.toString()}`)
  }

  const handleNavigate = (direction: "prev" | "today" | "next") => {
    if (direction === "today") {
      updateUrlParams({ date: getLocalIsoDateString(new Date()) })
      return
    }

    const nextDate = new Date(referenceDate)
    if (view === "day") {
      nextDate.setDate(referenceDate.getDate() + (direction === "next" ? 1 : -1))
    } else if (view === "week") {
      nextDate.setDate(referenceDate.getDate() + (direction === "next" ? 7 : -7))
    } else {
      nextDate.setMonth(referenceDate.getMonth() + (direction === "next" ? 1 : -1))
    }
    updateUrlParams({ date: getLocalIsoDateString(nextDate) })
  }

  const handleDaySelect = (day: Date) => {
    updateUrlParams({
      date: getLocalIsoDateString(day),
      view: "day", // auto switch to day view for single date inspection
    })
  }

  // 8. Filters details
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (activeFilters.type !== "all") count++
    if (activeFilters.companyId !== "all") count++
    if (activeFilters.task !== "all") count++
    return count
  }, [activeFilters])

  const activeChips = useMemo(() => {
    const list = []
    if (activeFilters.type !== "all") {
      const opt = AGENDA_EVENT_TYPES[activeFilters.type]
      list.push({
        id: "type",
        label: `Nature : ${opt?.shortLabel || activeFilters.type}`,
        reset: () => updateUrlParams({ type: "all" }),
      })
    }
    if (activeFilters.companyId !== "all") {
      const comp = uniqueCompanies.find((c) => c.id === activeFilters.companyId)
      list.push({
        id: "company",
        label: `Client : ${comp?.name || "Inconnu"}`,
        reset: () => updateUrlParams({ company: "all" }),
      })
    }
    if (activeFilters.task !== "all") {
      list.push({
        id: "task",
        label: activeFilters.task === "has_task" ? "Avec tâche" : "Sans tâche",
        reset: () => updateUrlParams({ task: "all" }),
      })
    }
    return list
  }, [activeFilters, uniqueCompanies])

  const handleFilterApply = (newFilters: typeof activeFilters) => {
    updateUrlParams({
      type: newFilters.type,
      company: newFilters.companyId,
      task: newFilters.task,
    })
  }

  // 9. Drawer opening callbacks
  const handleEventClick = (event: AgendaEvent) => {
    setSelectedEvent(event)
    setEventDrawerOpen(true)
  }

  const handleCreateClick = () => {
    setSelectedEvent(null)
    setEventDrawerOpen(true)
  }

  return (
    <>
      <MobileActionPage
        header={
          <AgendaMobileHeader
            view={view}
            referenceDate={referenceDate}
            onNavigate={handleNavigate}
            onCreateClick={handleCreateClick}
          />
        }
        context={
          <div className="flex flex-col gap-3">
            {/* View Mode Toggle Switcher */}
            <AgendaMobileViewSwitcher
              view={view}
              onChange={(v) => updateUrlParams({ view: v })}
            />

            {/* horizontal working days selector */}
            <AgendaMobileDateStrip
              referenceDate={referenceDate}
              events={events}
              onDaySelect={handleDaySelect}
            />
          </div>
        }
        decisionFooter={
          <MobileDecisionFooter
            primaryAction={
              <Button
                variant="primary"
                fullWidth
                onClick={handleCreateClick}
                className="font-bold flex items-center justify-center gap-1.5 h-11"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Créer un événement
              </Button>
            }
          />
        }
      >
        <div className="flex flex-col gap-4">
          {/* Filters controls bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Événements ({filteredEvents.length})
              </h2>
              <MobileFilterTrigger
                activeCount={activeFiltersCount}
                onClick={() => setFilterDrawerOpen(true)}
                className="h-9 px-3 py-1 text-xs"
              />
            </div>

            {/* Horizontal summaries chips */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                {activeChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1 bg-surface border border-border px-2.5 py-1 rounded-full text-[11px] font-semibold text-body shadow-sm"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.reset}
                      className="text-muted hover:text-heading cursor-pointer size-4 flex items-center justify-center rounded-full active:bg-canvas"
                      aria-label={`Supprimer le filtre ${chip.label}`}
                    >
                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Loading status indicator */}
          <div className="relative min-h-[140px]">
            {loading && (
              <div className="absolute inset-0 z-10 bg-canvas/30 backdrop-blur-[0.5px] flex items-center justify-center rounded-md" aria-busy="true">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {/* Switch Views */}
            {view === "day" && (
              <AgendaMobileDayView
                referenceDate={referenceDate}
                events={filteredEvents}
                onEventClick={handleEventClick}
                onCreateClick={handleCreateClick}
              />
            )}
            {view === "week" && (
              <AgendaMobileWeekView
                referenceDate={referenceDate}
                events={filteredEvents}
                onEventClick={handleEventClick}
                onCreateClick={handleCreateClick}
              />
            )}
            {view === "month" && (
              <AgendaMobileMonthView
                referenceDate={referenceDate}
                events={filteredEvents}
                onEventClick={handleEventClick}
                onCreateClick={handleCreateClick}
              />
            )}
          </div>
        </div>
      </MobileActionPage>

      {/* Slide up Filters Drawer */}
      <AgendaMobileFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        activeFilters={activeFilters}
        uniqueCompanies={uniqueCompanies}
        onApply={handleFilterApply}
      />

      {/* Guided steps Event Drawer */}
      <AgendaMobileEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={selectedEvent}
        onSaved={loadData}
      />
    </>
  )
}
