"use client"

import React, { useCallback, useMemo, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { completeAgendaTask, reopenAgendaTask } from "@/lib/agenda/agenda-actions"
import { getAgendaTimeboxDateRange, isDateWithinInclusiveRange } from "@/lib/agenda/agenda-temporal"
import { buildDisplayGroups } from "@/lib/agenda/agenda-selectors"
import { getDaysOfWeek, getLocalIsoDateString, getStartOfWeek } from "@/lib/agenda/agenda-date-utils"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { cn } from "@/lib/utils"
import type { AgendaItem, AgendaSnapshot } from "@/lib/agenda/agenda-types"
import type { DeterministicIntelligenceActionId } from "@/components/intelligence/action-results/IntelligenceActionResultContent"
import { AgendaMobileEventDrawer } from "./AgendaMobileEventDrawer"
import { AgendaTaskCreateDrawer } from "./AgendaTaskCreateDrawer"
import { MobileAgendaItemSheet } from "./MobileAgendaItemSheet"
import { MobileAgendaTimeline } from "./MobileAgendaTimeline"
import { type AgendaMobileFilters, type AgendaMobileMode } from "./agenda-mobile-model"

const IntelligenceActionResultContent = dynamic(
  () => import("@/components/intelligence/action-results/IntelligenceActionResultContent").then((module) => module.IntelligenceActionResultContent),
  { ssr: false },
)

const FILTERS: Array<{ key: keyof AgendaMobileFilters; label: string }> = [
  { key: "showCommerce", label: "RDV commerce" },
  { key: "showRecruitment", label: "Entretien candidats" },
  { key: "showInternal", label: "Interne" },
  { key: "showDeadlines", label: "Échéances" },
  { key: "showAbsences", label: "Absences / fermetures" },
]

const CONSULT_ACTIONS: Array<{ id: "weekly" | DeterministicIntelligenceActionId; label: string; description: string }> = [
  { id: "weekly", label: "Brief hebdo", description: "Les priorités de la semaine" },
  { id: "prepare_day", label: "Ma journée", description: "Les actions à préparer aujourd’hui" },
  { id: "action_priorities", label: "Priorités", description: "Les prochaines actions recommandées" },
]

interface AgendaMobileWorkspaceProps {
  snapshot: AgendaSnapshot
  initialMode: AgendaMobileMode
  initialDate: string
  initialFilters: AgendaMobileFilters
}

function filterQuery(filters: AgendaMobileFilters) {
  const active: string[] = []
  if (filters.showCommerce) active.push("commerce")
  if (filters.showRecruitment) active.push("recruitment")
  if (filters.showInternal) active.push("internal")
  if (filters.showDeadlines) active.push("deadlines")
  if (filters.showAbsences) active.push("absences")
  return active.join(",")
}

function matchesMobileFilter(item: AgendaItem, filters: AgendaMobileFilters) {
  if (item.type === "scheduled_event") {
    const category = AGENDA_EVENT_TYPES[item.eventType]?.category
    if (category === "prospection" || category === "client_actif") return filters.showCommerce
    if (category === "recrutement") return filters.showRecruitment
    if (category === "management" || category === "interne") return filters.showInternal
    return false
  }
  if (item.type === "deadline" || item.type === "task") return filters.showDeadlines
  if (item.type === "availability_block") return filters.showAbsences
  if (item.type === "alert") return filters.showDeadlines && (item.alertKind === "overdue_task" || item.alertKind === "deadline_at_risk")
  return false
}

export function AgendaMobileWorkspace({ snapshot, initialMode, initialDate, initialFilters }: AgendaMobileWorkspaceProps) {
  const router = useRouter()
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  const [isPending, startTransition] = useTransition()
  const [mode] = useState<AgendaMobileMode>(initialMode)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [filters, setFilters] = useState(initialFilters)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [consultMenuOpen, setConsultMenuOpen] = useState(false)
  const [consultAction, setConsultAction] = useState<DeterministicIntelligenceActionId | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [createTaskItem, setCreateTaskItem] = useState<AgendaItem | null>(null)
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, "completed" | "pending">>({})

  const syncRouteState = useCallback((date: string, nextFilters: AgendaMobileFilters) => {
    const params = new URLSearchParams({ mode, date, filters: filterQuery(nextFilters) })
    startTransition(() => router.replace(`/agenda?${params.toString()}`, { scroll: false }))
  }, [mode, router])

  const optimisticItems = useMemo(() => snapshot.items.map((item) => {
    const status = item.type === "task" ? optimisticStatus[item.sourceId] : undefined
    return status ? { ...item, businessStatus: status } as AgendaItem : item
  }), [optimisticStatus, snapshot.items])
  const relationGroups = useMemo(() => buildDisplayGroups(optimisticItems, snapshot.relationGroups), [optimisticItems, snapshot.relationGroups])
  const filteredGroups = useMemo(() => relationGroups.filter((group) => group.items.some((item) => matchesMobileFilter(item, filters))), [filters, relationGroups])
  const calendarDayGroups = useMemo(() => filteredGroups.filter((group) => {
    const { startDate, endDate } = getAgendaTimeboxDateRange(group.primaryItem.timebox, snapshot.query.timezone)
    return isDateWithinInclusiveRange(selectedDate, startDate, endDate)
  }), [filteredGroups, selectedDate, snapshot.query.timezone])
  const dateStripDays = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number)
    return getDaysOfWeek(getStartOfWeek(new Date(year, month - 1, day)))
  }, [selectedDate])
  const dayCounts = useMemo(() => new Map(dateStripDays.map((date) => {
    const dateKey = getLocalIsoDateString(date)
    const count = filteredGroups.filter((group) => {
      const range = getAgendaTimeboxDateRange(group.primaryItem.timebox, snapshot.query.timezone)
      return isDateWithinInclusiveRange(dateKey, range.startDate, range.endDate)
    }).length
    return [dateKey, count]
  })), [dateStripDays, filteredGroups, snapshot.query.timezone])

  const selectedItem = selectedItemId ? optimisticItems.find((item) => item.id === selectedItemId) ?? null : null
  const selectedGroup = selectedItemId ? relationGroups.find((group) => group.items.some((item) => item.id === selectedItemId)) ?? null : null

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date)
    syncRouteState(date, filters)
  }, [filters, syncRouteState])
  const handleFilterToggle = useCallback((key: keyof AgendaMobileFilters) => {
    setFilters((previous) => {
      const next = { ...previous, [key]: !previous[key] }
      syncRouteState(selectedDate, next)
      return next
    })
  }, [selectedDate, syncRouteState])
  const handleTaskStatus = useCallback(async (taskId: string) => {
    const task = optimisticItems.find((item) => item.type === "task" && item.sourceId === taskId)
    if (!task) return
    const nextStatus = task.businessStatus === "completed" ? "pending" : "completed"
    setOptimisticStatus((previous) => ({ ...previous, [taskId]: nextStatus }))
    try {
      const result = nextStatus === "completed" ? await completeAgendaTask(taskId) : await reopenAgendaTask(taskId)
      if (result && "error" in result && result.error) throw new Error(result.error)
      router.refresh()
    } catch (error) {
      setOptimisticStatus((previous) => ({ ...previous, [taskId]: task.businessStatus === "completed" ? "completed" : "pending" }))
      console.error("agenda task status update failed", error)
    }
  }, [optimisticItems, router])
  const handleItemClick = useCallback((item: AgendaItem) => {
    if (item.type === "scheduled_event") openEventDrawer(item.sourceId)
    else setSelectedItemId(item.id)
  }, [openEventDrawer])
  const chooseConsultAction = useCallback((action: "weekly" | DeterministicIntelligenceActionId) => {
    setConsultMenuOpen(false)
    if (action === "weekly") {
      openReportGeneration({ origin: "agenda", reportType: "weekly_manager" })
      return
    }
    setConsultAction(action)
  }, [])

  return (
    <section className="min-h-full bg-accent/10 px-3 pt-4 pb-[calc(var(--layout-mobile-content-bottom-offset)+var(--space-8))]">
      <div className="mx-auto min-h-full w-full max-w-xl rounded-[var(--radius-medium)] bg-surface">
        <div className="px-4 pt-4">
          <header className="flex min-h-11 items-center justify-between gap-3">
            <h1 className="font-heading text-xl font-bold tracking-tight text-heading">Agenda</h1>
            <div className="flex items-center gap-2">
              {isPending ? <span className="mr-1 size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Mise à jour" /> : null}
              <button type="button" onClick={() => setConsultMenuOpen(true)} aria-label="Consulter" className="flex size-11 items-center justify-center rounded-full bg-heading text-primary-fg transition-colors hover:bg-sidebar-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" /><circle cx="12" cy="12" r="2.25" /></svg>
              </button>
              <button type="button" onClick={() => setCreateDrawerOpen(true)} aria-label="Créer un événement" className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-fg transition-colors hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </header>
        </div>
        <div className="relative z-0 h-0 overflow-visible" aria-hidden="true">
          <Image src="/illustrations/agenda-mobile-line-art.png" alt="" width={1536} height={1024} sizes="(max-width: 640px) 100vw, 32rem" className="pointer-events-none absolute -top-2 h-24 w-full object-contain object-center opacity-50" priority />
        </div>
        <div className="relative z-10 mt-2 grid grid-cols-5 px-4">
          {dateStripDays.map((date) => {
            const dateKey = getLocalIsoDateString(date)
            const selected = dateKey === selectedDate
            const hasItems = (dayCounts.get(dateKey) ?? 0) > 0
            return <button key={dateKey} type="button" onClick={() => handleDateChange(dateKey)} className="relative flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-small)] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-pressed={selected}>
              <span className={cn("text-[11px] font-bold", selected ? "text-primary" : "text-muted")}>{date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span><span className={cn("font-heading text-lg font-bold", selected ? "text-primary" : "text-heading")}>{date.getDate()}</span><span className={cn("size-1.5 rounded-full", selected ? "bg-primary" : hasItems ? "bg-muted/50" : "bg-transparent")} />
            </button>
          })}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {FILTERS.map((filter) => { const active = filters[filter.key]; return <button key={filter.key} type="button" onClick={() => handleFilterToggle(filter.key)} aria-pressed={active} className={cn("min-h-11 shrink-0 rounded-full border px-3 text-xs font-bold transition-colors", active ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-body hover:bg-surface-hover")}>{filter.label}</button> })}
        </div>
        <main className="mt-5 px-4 pb-5">
          {calendarDayGroups.length ? <MobileAgendaTimeline groups={calendarDayGroups} timezone={snapshot.query.timezone} onItemClick={handleItemClick} onToggleTaskStatus={(taskId) => void handleTaskStatus(taskId)} /> : <div className="py-16 text-center"><h2 className="font-heading text-base font-bold text-heading">Aucun élément à afficher</h2><p className="mt-2 text-xs font-medium text-muted">Ajustez les filtres ou choisissez un autre jour.</p></div>}
        </main>
      </div>
      <AppDrawer open={consultMenuOpen} onOpenChange={setConsultMenuOpen} side="bottom" title="Consulter" subtitle="Choisissez une vue de préparation."><div className="space-y-2">{CONSULT_ACTIONS.map((action) => <button key={action.id} type="button" onClick={() => chooseConsultAction(action.id)} className="flex min-h-14 w-full items-center justify-between rounded-[var(--radius-small)] border border-border bg-surface px-4 text-left transition-colors hover:bg-surface-hover"><span><span className="block text-sm font-bold text-heading">{action.label}</span><span className="mt-0.5 block text-xs text-body">{action.description}</span></span><svg className="size-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" /></svg></button>)}</div></AppDrawer>
      <AppDrawer open={consultAction !== null} onOpenChange={(open) => { if (!open) setConsultAction(null) }} side="bottom" title={consultAction === "prepare_day" ? "Ma journée" : "Priorités"} contentClassName="pb-safe">{consultAction ? <IntelligenceActionResultContent actionId={consultAction} onBack={() => setConsultAction(null)} /> : null}</AppDrawer>
      <AgendaMobileEventDrawer open={createDrawerOpen} onOpenChange={setCreateDrawerOpen} event={null} onSaved={() => { setCreateDrawerOpen(false); router.refresh() }} />
      <MobileAgendaItemSheet open={selectedItemId !== null} item={selectedItem} relatedGroup={selectedGroup} timezone={snapshot.query.timezone} onOpenChange={(open) => { if (!open) setSelectedItemId(null) }} onHideForSession={() => setSelectedItemId(null)} onCompleteTask={handleTaskStatus} onReopenTask={handleTaskStatus} onCreateTaskClick={setCreateTaskItem} />
      <AgendaTaskCreateDrawer key={createTaskItem?.id ?? "empty"} open={createTaskItem !== null} item={createTaskItem} side="bottom" onOpenChange={(open) => { if (!open) setCreateTaskItem(null) }} onSaved={() => { setCreateTaskItem(null); router.refresh() }} />
    </section>
  )
}
