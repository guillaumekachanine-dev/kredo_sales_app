"use client"

import React, { useCallback, useMemo, useState, useTransition } from "react"
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
} from "./agenda-mobile-model"
import { MobileAgendaSummary } from "./MobileAgendaSummary"
import { MobileAgendaFeed } from "./MobileAgendaFeed"
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
    if (nextFilters.type !== "all") params.set("type", nextFilters.type)
    if (nextFilters.company !== "all") params.set("company", nextFilters.company)
    if (nextFilters.task !== "all") params.set("task", nextFilters.task)

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

  // 3. Compute unique companies present in the snapshot
  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>()
    optimisticItems.forEach((item) => {
      if (item.companyId && item.companyLabel) {
        map.set(item.companyId, item.companyLabel)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [optimisticItems])

  // 4. In-memory grouping & filtering
  const relationGroups = useMemo(() => {
    return buildDisplayGroups(optimisticItems, snapshot.relationGroups)
  }, [optimisticItems, snapshot.relationGroups])

  // Filter display groups based on current fast filters and session hidden state
  const filteredGroups = useMemo(() => {
    return relationGroups.filter((group) => {
      // Hide if all items inside are hidden for this session
      const visibleItems = group.items.filter((item) => !hiddenItemIds.has(item.id))
      if (visibleItems.length === 0) return false

      // Filter 1: Type
      if (filters.type !== "all") {
        const hasMatchingEvent = visibleItems.some(
          (item) => item.type === "scheduled_event" && item.eventType === filters.type
        )
        if (!hasMatchingEvent) return false
      }

      // Filter 2: Company
      if (filters.company !== "all") {
        const hasMatchingCompany = visibleItems.some((item) => item.companyId === filters.company)
        if (!hasMatchingCompany) return false
      }

      // Filter 3: Preparatory Task
      if (filters.task !== "all") {
        const taskItem = visibleItems.find((item) => item.type === "task")
        const hasPendingTask = taskItem && taskItem.businessStatus !== "completed"

        if (filters.task === "has_task" && !hasPendingTask) return false
        if (filters.task === "no_task" && hasPendingTask) return false
      }

      return true
    })
  }, [relationGroups, filters, hiddenItemIds])

  // 5. Calendar day items
  const calendarDayGroups = useMemo(() => {
    return filteredGroups.filter((group) => {
      const { startDate, endDate } = getAgendaTimeboxDateRange(group.primaryItem.timebox, snapshot.query.timezone)
      return isDateWithinInclusiveRange(selectedDate, startDate, endDate)
    })
  }, [filteredGroups, selectedDate, snapshot.query.timezone])

  // 6. Sliding horizontal Date Strip (15 days around selectedDate)
  const dateStripDays = useMemo(() => {
    const parsed = new Date(selectedDate)
    const ref = isNaN(parsed.getTime()) ? new Date() : parsed
    return Array.from({ length: 15 }, (_, i) => {
      const d = new Date(ref)
      d.setDate(ref.getDate() - 7 + i)
      return d
    })
  }, [selectedDate])

  // Identify which days have items in the current snapshot
  const daysWithItems = useMemo(() => {
    const datesSet = new Set<string>()
    optimisticItems.forEach((item) => {
      if (hiddenItemIds.has(item.id)) return
      const { startDate, endDate } = getAgendaTimeboxDateRange(item.timebox, snapshot.query.timezone)
      enumerateDateRange(startDate, endDate).forEach((date) => datesSet.add(date))
    })
    return datesSet
  }, [optimisticItems, hiddenItemIds, snapshot.query.timezone])

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

  // Quick filters chips
  const activeChips = useMemo(() => {
    const list = []
    if (filters.type !== "all") {
      const opt = AGENDA_EVENT_TYPES[filters.type]
      list.push({
        id: "type",
        label: `Nature : ${opt?.shortLabel || filters.type}`,
        reset: () => handleFilterApply({ ...filters, type: "all" }),
      })
    }
    if (filters.company !== "all") {
      const comp = uniqueCompanies.find((c) => c.id === filters.company)
      list.push({
        id: "company",
        label: `Client : ${comp?.name || "Inconnu"}`,
        reset: () => handleFilterApply({ ...filters, company: "all" }),
      })
    }
    if (filters.task !== "all") {
      list.push({
        id: "task",
        label: filters.task === "has_task" ? "Avec tâche" : "Sans tâche",
        reset: () => handleFilterApply({ ...filters, task: "all" }),
      })
    }
    return list
  }, [filters, uniqueCompanies, handleFilterApply])

  const activeFiltersCount = activeChips.length

  const formattedSelectedMonth = useMemo(() => {
    const parsed = new Date(selectedDate)
    if (isNaN(parsed.getTime())) return ""
    return parsed.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())
  }, [selectedDate])

  return (
    <>
      <MobileActionPage
        header={
          <div className="flex flex-col gap-3 w-full px-4 pt-4 pb-2 border-b border-border bg-surface">
            {/* Header titles and loader */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h1 className="font-heading text-lg font-bold text-heading">
                  Agenda
                </h1>
                <p className="text-[10px] text-muted font-semibold tracking-wide uppercase">
                  {mode === "feed" ? "Fil d'agence" : formattedSelectedMonth}
                </p>
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
              </div>
            </div>

            {/* View switch tabs */}
            <div className="grid grid-cols-2 gap-1 bg-canvas p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => handleModeChange("feed")}
                className={cn(
                  "py-2 text-xs font-bold rounded-md transition-all duration-[150ms] ease-in-out select-none cursor-pointer flex items-center justify-center gap-1.5 h-9",
                  mode === "feed"
                    ? "bg-surface text-heading shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    : "text-muted hover:text-heading hover:bg-surface/30"
                )}
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
                Fil d&apos;Agence
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("calendar")}
                className={cn(
                  "py-2 text-xs font-bold rounded-md transition-all duration-[150ms] ease-in-out select-none cursor-pointer flex items-center justify-center gap-1.5 h-9",
                  mode === "calendar"
                    ? "bg-surface text-heading shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    : "text-muted hover:text-heading hover:bg-surface/30"
                )}
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                Calendrier
              </button>
            </div>
          </div>
        }
        context={
          <div className="flex flex-col gap-3 px-4 py-2 border-b border-border bg-surface/50 backdrop-blur-sm">
            {/* KPI Summary strip */}
            <MobileAgendaSummary summary={snapshot.summary} />

            {/* Horizontal date selector strip */}
            <div className="flex gap-2 items-center overflow-x-auto no-scrollbar py-1">
              {dateStripDays.map((day) => {
                const dayKey = day.toISOString().split("T")[0]
                const isSelected = selectedDate === dayKey
                const isToday = todayKey === dayKey
                const dayLetter = day.toLocaleDateString("fr-FR", { weekday: "short" }).substring(0, 1).toUpperCase()
                const dayNum = day.getDate()
                const hasItems = daysWithItems.has(dayKey)

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => handleDateChange(dayKey)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg transition-all relative cursor-pointer min-w-[42px] min-h-[48px]",
                      isSelected
                        ? "bg-primary text-primary-fg font-bold"
                        : "bg-surface border border-border text-body active:bg-canvas"
                    )}
                  >
                    <span className={cn(
                      "text-[9px] font-bold tracking-wider uppercase mb-0.5",
                      isSelected ? "text-primary-fg/80" : isToday ? "text-primary" : "text-muted"
                    )}>
                      {dayLetter}
                    </span>
                    <span className="text-xs font-heading font-bold leading-none">
                      {dayNum}
                    </span>

                    {/* Dot indicating items on that day */}
                    {hasItems && (
                      <span className={cn(
                        "absolute bottom-1 size-1 rounded-full",
                        isSelected ? "bg-primary-fg" : "bg-primary"
                      )} />
                    )}

                    {/* Highlight ring for today */}
                    {isToday && !isSelected && (
                      <span className="absolute inset-0 rounded-lg border border-primary/40 pointer-events-none" />
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
          />
        }
      >
        <div className="flex flex-col gap-4">
          {/* Filters controls bar */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3 px-1 pt-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {mode === "feed" ? "Actions à venir" : `Actions du ${selectedDate}`} ({mode === "feed" ? filteredGroups.length : calendarDayGroups.length})
              </h2>
              <MobileFilterTrigger
                activeCount={activeFiltersCount}
                onClick={() => setFilterDrawerOpen(true)}
                className="h-9 px-3 py-1 text-xs font-bold"
              />
            </div>

            {/* Active chips list */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center px-1">
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

          {/* Render Feed vs Calendar views */}
          {mode === "feed" ? (
            <MobileAgendaFeed
              groupedItems={filteredGroups}
              hiddenItemIds={hiddenItemIds}
              timezone={snapshot.query.timezone}
              now={snapshot.query.now}
              onItemClick={handleItemClick}
              onToggleTaskStatus={handleToggleTaskStatus}
            />
          ) : (
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
          )}
        </div>
      </MobileActionPage>

      {/* Slide-up Filters Drawer */}
      <AgendaMobileFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        activeFilters={{
          type: filters.type,
          companyId: filters.company,
          task: filters.task,
        }}
        uniqueCompanies={uniqueCompanies}
        onApply={(newLocalFilters) => {
          handleFilterApply({
            type: newLocalFilters.type,
            company: newLocalFilters.companyId,
            task: newLocalFilters.task,
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
    </>
  )
}
