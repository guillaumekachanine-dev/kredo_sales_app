"use client"

import React, { useCallback, useMemo, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { MobileFilterTrigger } from "@/components/ui/mobile/MobileFilterTrigger"
import { MobileDecisionFooter } from "@/components/ui/mobile/MobileDecisionFooter"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

import {
  getTodayDateKey,
  getAgendaTimeboxDateRange,
  enumerateDateRange,
  isDateWithinInclusiveRange,
} from "@/lib/agenda/agenda-temporal"
import { buildDisplayGroups } from "@/lib/agenda/agenda-selectors"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { cn } from "@/lib/utils"

import type { AgendaItem, AgendaSnapshot } from "@/lib/agenda/agenda-types"
import {
  type AgendaMobileFilters,
  type AgendaMobileMode,
  addDays,
} from "./agenda-mobile-model"
import { getStartOfWeek, getDaysOfWeek, getLocalIsoDateString } from "@/lib/agenda/agenda-date-utils"
import { MobileAgendaItemSheet } from "./MobileAgendaItemSheet"
import { AgendaMobileFilterDrawer } from "./AgendaMobileFilterDrawer"
import { AgendaMobileEventDrawer } from "./AgendaMobileEventDrawer"
import { MobileScheduledEventCard } from "./MobileScheduledEventCard"
import { MobileTaskCard } from "./MobileTaskCard"
import { MobileEventTaskCard } from "./MobileEventTaskCard"
import { MobileDeadlineCard } from "./MobileDeadlineCard"
import { MobileAvailabilityCard } from "./MobileAvailabilityCard"
import { MobileAlertCard } from "./MobileAlertCard"
import { AgendaTaskCreateDrawer } from "./AgendaTaskCreateDrawer"
import { completeAgendaTask, reopenAgendaTask } from "@/lib/agenda/agenda-actions"
import { openReportGeneration } from "@/lib/reports/report-generation"

const CommercialActivityModal = dynamic(
  () => import("@/features/commercial-activity/CommercialActivityModal").then((module) => module.CommercialActivityModal),
  { ssr: false },
)

interface AgendaMobileWorkspaceProps {
  snapshot: AgendaSnapshot
  initialMode: AgendaMobileMode
  initialDate: string
  initialFilters: AgendaMobileFilters
}

export function AgendaMobileWorkspace({
  snapshot,
  initialMode,
  initialDate,
  initialFilters,
}: AgendaMobileWorkspaceProps) {
  const router = useRouter()
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  const [isPending, startTransition] = useTransition()

  // 1. Client-side states for instant interactions
  const [mode, setMode] = useState<AgendaMobileMode>(initialMode)
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [filters, setFilters] = useState<AgendaMobileFilters>(initialFilters)
  const [hiddenItemIds, setHiddenItemIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("kredo_agenda_hidden_items")
        if (stored) return new Set(JSON.parse(stored))
      } catch {
        // ignore
      }
    }
    return new Set()
  })
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, "completed" | "pending">>({})
  const [createTaskItem, setCreateTaskItem] = useState<AgendaItem | null>(null)
  const [commercialActivityOpen, setCommercialActivityOpen] = useState(false)

  // Apply optimistic status to snapshot items
  const optimisticItems = useMemo(() => {
    return snapshot.items.map((item) => {
      if (item.type === "task" && optimisticStatus[item.sourceId]) {
        const nextStatus = optimisticStatus[item.sourceId]
        return {
          ...item,
          businessStatus: nextStatus,
          metadata: {
            ...item.metadata,
            completedAt: nextStatus === "completed" ? new Date().toISOString() : null,
          },
        } as AgendaItem
      }
      return item
    })
  }, [snapshot.items, optimisticStatus])

  // Drawers open states
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // 2. Synchronization of state with search params (Non-blocking transition)
  const syncRouteState = useCallback((
    nextMode: AgendaMobileMode,
    nextDate: string,
    nextFilters: AgendaMobileFilters
  ) => {
    const params = new URLSearchParams()
    params.set("mode", nextMode)
    params.set("date", nextDate)

    const activeList: string[] = []
    if (nextFilters.showDeadlines) activeList.push("deadlines")
    if (nextFilters.showAbsences) activeList.push("absences")
    if (nextFilters.showActivity) activeList.push("activity")
    if (nextFilters.showInternal) activeList.push("internal")
    params.set("filters", activeList.join(","))

    startTransition(() => {
      router.replace(`/agenda?${params.toString()}`, { scroll: false })
    })
  }, [router])

  // Update callbacks
  const handleModeChange = (newMode: AgendaMobileMode) => {
    setMode(newMode)
    syncRouteState(newMode, selectedDate, filters)
  }

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    // Automatically switch to calendar mode when selecting a specific date
    setMode("calendar")
    syncRouteState("calendar", newDate, filters)
  }

  const handleFilterApply = useCallback((newFilters: AgendaMobileFilters) => {
    setFilters(newFilters)
    syncRouteState(mode, selectedDate, newFilters)
  }, [mode, selectedDate, syncRouteState])

  const handleItemHide = (itemId: string) => {
    setHiddenItemIds((prev) => {
      const next = new Set(prev)
      next.add(itemId)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("kredo_agenda_hidden_items", JSON.stringify(Array.from(next)))
      }
      return next
    })
  }

  // 4. In-memory grouping & filtering
  const relationGroups = useMemo(() => {
    return buildDisplayGroups(optimisticItems, snapshot.relationGroups)
  }, [optimisticItems, snapshot.relationGroups])

  // Filter display groups based on current checkbox filters and session hidden state
  const filteredGroups = useMemo(() => {
    return relationGroups.filter((group) => {
      // Hide if all items inside are hidden for this session
      const visibleItems = group.items.filter((item) => !hiddenItemIds.has(item.id))
      if (visibleItems.length === 0) return false

      // Group matches if at least one visible item inside it matches the active filters
      const hasMatchingItem = visibleItems.some((item) => {
        // 1. Échéances (Deadlines & Tasks)
        if (item.type === "deadline" || item.type === "task") {
          return filters.showDeadlines
        }
        
        // 2. Absences (Availability blocks / Collaborator absence)
        if (item.type === "availability_block") {
          return filters.showAbsences
        }

        // 3. Scheduled events
        if (item.type === "scheduled_event") {
          const cat = AGENDA_EVENT_TYPES[item.eventType]?.category
          if (cat === "interne") {
            return filters.showInternal
          }
          if (cat === "prospection" || cat === "client_actif" || cat === "recrutement" || cat === "management") {
            return filters.showActivity
          }
        }

        // 4. Alerts (system alerts)
        if (item.type === "alert") {
          return filters.showActivity
        }

        return true
      })

      return hasMatchingItem
    })
  }, [relationGroups, filters, hiddenItemIds])

  // 5. Calendar day items
  const calendarDayGroups = useMemo(() => {
    return filteredGroups.filter((group) => {
      const { startDate, endDate } = getAgendaTimeboxDateRange(group.primaryItem.timebox, snapshot.query.timezone)
      return isDateWithinInclusiveRange(selectedDate, startDate, endDate)
    })
  }, [filteredGroups, selectedDate, snapshot.query.timezone])

  // 6. Horizontal Date Strip (5 working days of the week containing selectedDate)
  const dateStripDays = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map((part) => Number.parseInt(part, 10))
    const localRef = !isNaN(year) && !isNaN(month) && !isNaN(day)
      ? new Date(year, month - 1, day)
      : new Date()
    const start = getStartOfWeek(localRef)
    return getDaysOfWeek(start)
  }, [selectedDate])

  // Count items/groups for each of the 5 days in dateStripDays
  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>()
    dateStripDays.forEach((day) => {
      const dayKey = getLocalIsoDateString(day)
      const dayGroups = filteredGroups.filter((group) => {
        const { startDate, endDate } = getAgendaTimeboxDateRange(group.primaryItem.timebox, snapshot.query.timezone)
        return isDateWithinInclusiveRange(dayKey, startDate, endDate)
      })
      counts.set(dayKey, dayGroups.length)
    })
    return counts
  }, [dateStripDays, filteredGroups, snapshot.query.timezone])

  // 7. Interactive actions
  const handleCompleteTask = useCallback(async (taskId: string) => {
    // 1. Optimistic update
    setOptimisticStatus((prev) => ({ ...prev, [taskId]: "completed" }))
    // 2. Call Server Action with try-catch wrapper
    try {
      const res = await completeAgendaTask(taskId)
      if (res && "error" in res && res.error) {
        setOptimisticStatus((prev) => ({ ...prev, [taskId]: "pending" }))
        alert(res.error)
      } else {
        router.refresh()
      }
    } catch (err) {
      setOptimisticStatus((prev) => ({ ...prev, [taskId]: "pending" }))
      console.error("completeAgendaTask error:", err)
      alert("Une erreur réseau est survenue.")
    }
  }, [router])

  const handleReopenTask = useCallback(async (taskId: string) => {
    // 1. Optimistic update
    setOptimisticStatus((prev) => ({ ...prev, [taskId]: "pending" }))
    // 2. Call Server Action with try-catch wrapper
    try {
      const res = await reopenAgendaTask(taskId)
      if (res && "error" in res && res.error) {
        setOptimisticStatus((prev) => ({ ...prev, [taskId]: "completed" }))
        alert(res.error)
      } else {
        router.refresh()
      }
    } catch (err) {
      setOptimisticStatus((prev) => ({ ...prev, [taskId]: "completed" }))
      console.error("reopenAgendaTask error:", err)
      alert("Une erreur réseau est survenue.")
    }
  }, [router])

  const handleCreateTaskClick = useCallback((item: AgendaItem) => {
    setCreateTaskItem(item)
  }, [])

  const handleToggleTaskStatus = useCallback((taskId: string) => {
    const task = optimisticItems.find((i) => i.sourceId === taskId)
    if (!task) return
    const currentStatus = optimisticStatus[taskId] || task.businessStatus
    if (currentStatus === "completed") {
      void handleReopenTask(taskId)
    } else {
      void handleCompleteTask(taskId)
    }
  }, [optimisticItems, optimisticStatus, handleReopenTask, handleCompleteTask])

  const handleItemClick = (item: AgendaItem) => {
    if (item.type === "scheduled_event") {
      openEventDrawer(item.sourceId)
    } else {
      setSelectedItemId(item.id)
    }
  }

  const selectedItem = selectedItemId
    ? optimisticItems.find((i) => i.id === selectedItemId) || null
    : null

  const selectedGroup = selectedItemId
    ? relationGroups.find((g) => g.items.some((i) => i.id === selectedItemId)) || null
    : null

  // Format date strip day values
  const todayKey = getTodayDateKey(new Date().toISOString(), snapshot.query.timezone)

  // Quick filters chips for disabled filters
  const activeChips = useMemo(() => {
    const list = []
    if (!filters.showDeadlines) {
      list.push({
        id: "deadlines",
        label: "Sans échéances",
        reset: () => handleFilterApply({ ...filters, showDeadlines: true }),
      })
    }
    if (!filters.showAbsences) {
      list.push({
        id: "absences",
        label: "Sans absences",
        reset: () => handleFilterApply({ ...filters, showAbsences: true }),
      })
    }
    if (!filters.showActivity) {
      list.push({
        id: "activity",
        label: "Sans activité",
        reset: () => handleFilterApply({ ...filters, showActivity: true }),
      })
    }
    if (!filters.showInternal) {
      list.push({
        id: "internal",
        label: "Sans interne",
        reset: () => handleFilterApply({ ...filters, showInternal: true }),
      })
    }
    return list
  }, [filters, handleFilterApply])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (!filters.showDeadlines) count++
    if (!filters.showAbsences) count++
    if (!filters.showActivity) count++
    if (!filters.showInternal) count++
    return count
  }, [filters])

  const formatDayMonth = (date: Date) => {
    const d = String(date.getDate()).padStart(2, "0")
    const m = String(date.getMonth() + 1).padStart(2, "0")
    return `${d}/${m}`
  }

  const handlePrevWeek = () => {
    const nextDate = addDays(selectedDate, -7)
    handleDateChange(nextDate)
  }

  const handleNextWeek = () => {
    const nextDate = addDays(selectedDate, 7)
    handleDateChange(nextDate)
  }

  return (
    <>
      <MobileActionPage
        header={
          <div className="flex flex-col gap-3 w-full px-4 py-4 border-b border-border bg-surface">
            {/* Header titles and loader */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h1 className="font-heading text-lg font-bold text-heading">
                  Agenda
                </h1>
              </div>

              <div className="flex items-center gap-1.5">
                {isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border border-primary border-t-transparent" />
                )}
                {snapshot.partial && (
                  <Badge variant="warning" size="sm">
                    Partiel
                  </Badge>
                )}
                <MobileFilterTrigger
                  activeCount={activeFiltersCount}
                  onClick={() => setFilterDrawerOpen(true)}
                  iconOnly
                  className="min-h-11 min-w-11 h-11 w-11"
                />
              </div>
            </div>
          </div>
        }
        context={
          <div className="flex flex-col gap-3 px-4 pt-1.5 pb-2 border-b border-border bg-surface/50 backdrop-blur-sm">
            {/* New section with 2 buttons: Métriques activité & Préparer ma semaine */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => setCommercialActivityOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white text-[10px] font-bold py-2 px-2 transition-colors hover:bg-primary-deep active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <Image src="/icons_set/agenda_metriques_activite.png" alt="" width={14} height={14} className="size-3.5 brightness-0 invert" />
                <span>Métriques activité</span>
              </button>
              <button
                type="button"
                onClick={() => openReportGeneration({ origin: "agenda", reportType: "weekly_manager" })}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white text-[10px] font-bold py-2 px-2 transition-colors hover:bg-primary-deep active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15M4.5 9h15m-15 6h15" />
                </svg>
                <span>Préparer ma semaine</span>
              </button>
            </div>

            {/* Week navigation header */}
            <div className="flex items-center justify-between px-2 pt-1">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1 rounded-full text-muted hover:text-heading active:bg-canvas transition-colors"
                aria-label="Semaine précédente"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="text-xs font-bold text-heading uppercase tracking-wide">
                du {formatDayMonth(dateStripDays[0])} au {formatDayMonth(dateStripDays[4])}
              </span>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-1 rounded-full text-muted hover:text-heading active:bg-canvas transition-colors"
                aria-label="Semaine suivante"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Horizontal date selector strip */}
            <div className="grid grid-cols-5 gap-2 py-1">
              {dateStripDays.map((day) => {
                const dayKey = getLocalIsoDateString(day)
                const isSelected = selectedDate === dayKey
                const dayLetter = day.toLocaleDateString("fr-FR", { weekday: "short" }).substring(0, 3).toUpperCase().replace(".", "")
                const dayNum = day.getDate()
                const dayCount = dayCounts.get(dayKey) || 0

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => handleDateChange(dayKey)}
                    className={cn(
                      "flex flex-col items-center justify-between py-2.5 px-1 rounded-xl transition-all duration-300 cursor-pointer border select-none min-h-[70px] focus:outline-none relative",
                      isSelected
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                        : "bg-surface border-border/50 text-body hover:bg-surface-hover hover:border-border"
                    )}
                  >
                    {/* Day Label (e.g., LUN) */}
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isSelected ? "text-white/80" : "text-muted"
                    )}>
                      {dayLetter}
                    </span>

                    {/* Date Number (e.g., 23) */}
                    <span className={cn(
                      "text-lg font-black leading-none my-1 font-heading",
                      isSelected ? "text-white" : "text-heading"
                    )}>
                      {dayNum}
                    </span>

                    {/* Count Indicator */}
                    {dayCount > 0 ? (
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full text-[10px] font-extrabold leading-none",
                        isSelected
                          ? "bg-white text-primary"
                          : "bg-primary/10 text-primary border border-primary/20"
                      )}>
                        {dayCount}
                      </span>
                    ) : (
                      <span className="w-[15px] h-[15px]" />
                    )}

                    {/* Visual connector caret pointing downwards */}
                    {isSelected && (
                      <span className="absolute -bottom-[12px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary z-20" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        }
        decisionFooter={
          <MobileDecisionFooter
            primaryAction={
              <Button
                variant="primary"
                fullWidth
                onClick={() => setCreateDrawerOpen(true)}
                className="font-bold flex items-center justify-center gap-1.5 h-11"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Créer un événement
              </Button>
            }
            secondaryAction={null}
          />
        }
      >
        <div className="flex flex-col gap-4">
          {/* Render Calendar view */}
          <div className="flex flex-col gap-3 pb-8">
            {calendarDayGroups.length > 0 ? (
              calendarDayGroups.map((group) => {
                // Check if it's an event-task pair
                if (group.kind === "event_task_pair" && group.items.length >= 2) {
                  const eventItem = group.items.find((item) => item.type === "scheduled_event")
                  const taskItem = group.items.find((item) => item.type === "task")

                  if (eventItem && taskItem) {
                    return (
                      <MobileEventTaskCard
                        key={group.id}
                        eventItem={eventItem}
                        taskItem={taskItem}
                        timezone={snapshot.query.timezone}
                        onClick={() => handleItemClick(eventItem)}
                        onToggleStatus={() => handleToggleTaskStatus(taskItem.sourceId)}
                      />
                    )
                  }
                }

                // Otherwise render elements individually
                return group.items.map((item) => {
                  if (hiddenItemIds.has(item.id)) return null
                  switch (item.type) {
                    case "scheduled_event":
                      return (
                        <MobileScheduledEventCard
                          key={item.id}
                          item={item}
                          timezone={snapshot.query.timezone}
                          onClick={() => handleItemClick(item)}
                        />
                      )
                    case "task":
                      return (
                        <MobileTaskCard
                          key={item.id}
                          item={item}
                          timezone={snapshot.query.timezone}
                          onClick={() => handleItemClick(item)}
                          onToggleStatus={() => handleToggleTaskStatus(item.sourceId)}
                        />
                      )
                    case "deadline":
                      return (
                        <MobileDeadlineCard
                          key={item.id}
                          item={item}
                          timezone={snapshot.query.timezone}
                          onClick={() => handleItemClick(item)}
                        />
                      )
                    case "availability_block":
                      return (
                        <MobileAvailabilityCard
                          key={item.id}
                          item={item}
                          timezone={snapshot.query.timezone}
                          onClick={() => handleItemClick(item)}
                        />
                      )
                    case "alert":
                      return (
                        <MobileAlertCard
                          key={item.id}
                          item={item}
                          timezone={snapshot.query.timezone}
                          onClick={() => handleItemClick(item)}
                        />
                      )
                    default:
                      return null
                  }
                })
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <svg className="size-10 text-muted/60 stroke-[1.5] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <h3 className="font-heading text-sm font-bold text-heading">Aucune action prévue</h3>
                <p className="text-xs text-muted mt-1 max-w-[200px]">Rien n&apos;est planifié dans votre agenda pour le {selectedDate}.</p>
              </div>
            )}
          </div>
        </div>
      </MobileActionPage>

      {/* Slide-up Filters Drawer */}
      <AgendaMobileFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        activeFilters={{
          showDeadlines: filters.showDeadlines,
          showAbsences: filters.showAbsences,
          showActivity: filters.showActivity,
          showInternal: filters.showInternal,
        }}
        onApply={(newLocalFilters) => {
          handleFilterApply({
            showDeadlines: newLocalFilters.showDeadlines,
            showAbsences: newLocalFilters.showAbsences,
            showActivity: newLocalFilters.showActivity,
            showInternal: newLocalFilters.showInternal,
          })
        }}
      />

      {/* Creation drawer */}
      <AgendaMobileEventDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        event={null}
        onSaved={() => {
          setCreateDrawerOpen(false)
          // Refresh the page data from the server
          router.refresh()
        }}
      />

      {/* Details drawer for items (tasks, deadlines, availability, alerts) */}
      <MobileAgendaItemSheet
        open={selectedItemId !== null}
        item={selectedItem}
        relatedGroup={selectedGroup}
        timezone={snapshot.query.timezone}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null)
        }}
        onHideForSession={handleItemHide}
        onCompleteTask={handleCompleteTask}
        onReopenTask={handleReopenTask}
        onCreateTaskClick={handleCreateTaskClick}
      />

      {/* Task creation drawer (lightweight form) */}
      <AgendaTaskCreateDrawer
        key={createTaskItem?.id || "empty"}
        open={createTaskItem !== null}
        item={createTaskItem}
        side="bottom"
        onOpenChange={(open) => {
          if (!open) setCreateTaskItem(null)
        }}
        onSaved={() => {
          setCreateTaskItem(null)
          router.refresh()
        }}
      />
      {commercialActivityOpen ? <CommercialActivityModal open={commercialActivityOpen} onClose={() => setCommercialActivityOpen(false)} displayMode="mobile" /> : null}
    </>
  )
}
