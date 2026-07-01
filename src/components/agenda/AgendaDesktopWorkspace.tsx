"use client"

import React, { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import type { AgendaGroupedItem, AgendaItem, AgendaSnapshot } from "@/lib/agenda/agenda-types"
import { getTodayDateKey } from "@/lib/agenda/agenda-temporal"
import { AgendaEventDrawer } from "./AgendaEventDrawer"
import { AgendaActionRail } from "./AgendaActionRail"
import { AgendaAllDayLane } from "./AgendaAllDayLane"
import { AgendaItemDrawer } from "./AgendaItemDrawer"
import { AgendaPartialDataNotice } from "./AgendaPartialDataNotice"
import { AgendaTimeGrid } from "./AgendaTimeGrid"
import { AgendaToolbar } from "./AgendaToolbar"
import {
  buildAgendaToolbarHref,
  formatAgendaRangeShortLabel,
  isAgendaGroupHidden,
  resolveAgendaDesktopInteraction,
  type AgendaAllDayPlacement,
  type AgendaDesktopPresentation,
  type AgendaScheduledPlacement,
} from "./agenda-desktop-model"
import { AgendaTaskCreateDrawer } from "./AgendaTaskCreateDrawer"
import { completeAgendaTask, reopenAgendaTask } from "@/lib/agenda/agenda-actions"

interface AgendaDesktopWorkspaceProps {
  snapshot: AgendaSnapshot
  presentation: AgendaDesktopPresentation
}

function addDays(date: string, offset: number) {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part ?? "", 10))
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`
}

function filterPresentationForSession(
  presentation: AgendaDesktopPresentation,
  hiddenItemIds: Set<string>,
) {
  if (hiddenItemIds.size === 0) return presentation

  return {
    ...presentation,
    allDayPlacements: presentation.allDayPlacements.filter(
      (placement) => !hiddenItemIds.has(placement.item.id),
    ),
    scheduledColumns: presentation.scheduledColumns.map((column) => ({
      ...column,
      items: column.items.filter((placement) => !hiddenItemIds.has(placement.item.id)),
    })),
    railSections: presentation.railSections.map((section) => ({
      ...section,
      items: section.items.filter((group) => !isAgendaGroupHidden(group, hiddenItemIds)),
      count: section.items.filter((group) => !isAgendaGroupHidden(group, hiddenItemIds)).length,
    })),
  }
}

function applyOptimisticStatusToPresentation(
  presentation: AgendaDesktopPresentation,
  optimisticStatus: Record<string, "completed" | "pending">
) {
  if (Object.keys(optimisticStatus).length === 0) return presentation

  const updateItem = <T extends AgendaItem>(item: T): T => {
    if (item.type === "task" && optimisticStatus[item.sourceId]) {
      const nextStatus = optimisticStatus[item.sourceId]
      return {
        ...item,
        businessStatus: nextStatus,
        metadata: {
          ...item.metadata,
          completedAt: nextStatus === "completed" ? new Date().toISOString() : null,
        },
      } as unknown as T
    }
    return item
  }

  return {
    ...presentation,
    allDayPlacements: presentation.allDayPlacements.map((placement) => ({
      ...placement,
      item: updateItem(placement.item),
    })),
    scheduledColumns: presentation.scheduledColumns.map((column) => ({
      ...column,
      items: column.items.map((placement) => ({
        ...placement,
        item: updateItem(placement.item),
      })),
    })),
    railSections: presentation.railSections.map((section) => ({
      ...section,
      items: section.items.map((group) => ({
        ...group,
        primaryItem: updateItem(group.primaryItem),
        items: group.items.map(updateItem),
      })),
    })),
    desktopViewModel: {
      ...presentation.desktopViewModel,
      itemsById: Object.fromEntries(
        Object.entries(presentation.desktopViewModel.itemsById).map(([id, item]) => [
          id,
          updateItem(item),
        ])
      ),
      relationGroups: presentation.desktopViewModel.relationGroups.map((group) => ({
        ...group,
        primaryItem: updateItem(group.primaryItem),
        items: group.items.map(updateItem),
      })),
    },
  }
}

export function AgendaDesktopWorkspace({
  snapshot,
  presentation,
}: AgendaDesktopWorkspaceProps) {
  const router = useRouter()
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  const [isNavigating, startTransition] = useTransition()
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, "completed" | "pending">>({})
  const [createTaskItem, setCreateTaskItem] = useState<AgendaItem | null>(null)

  const optimisticPresentation = useMemo(
    () => applyOptimisticStatusToPresentation(presentation, optimisticStatus),
    [presentation, optimisticStatus]
  )

  const displayedPresentation = useMemo(
    () => filterPresentationForSession(optimisticPresentation, hiddenItemIds),
    [optimisticPresentation, hiddenItemIds],
  )

  const selectedItem = selectedItemId
    ? displayedPresentation.desktopViewModel.itemsById[selectedItemId] ?? null
    : null

  const selectedGroup = useMemo(() => (
    selectedItemId
      ? displayedPresentation.desktopViewModel.relationGroups.find((group) => group.items.some((item) => item.id === selectedItemId)) ?? null
      : null
  ), [displayedPresentation.desktopViewModel.relationGroups, selectedItemId])

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href)
    })
  }

  const handleItemSelection = (item: AgendaItem) => {
    const interaction = resolveAgendaDesktopInteraction(item)

    if (interaction.kind === "global_event_drawer") {
      openEventDrawer(interaction.eventId)
      return
    }

    setSelectedItemId(interaction.itemId)
  }

  const handleGroupSelection = (group: AgendaGroupedItem) => {
    handleItemSelection(group.primaryItem)
  }

  const handleHideForSession = (itemId: string) => {
    setHiddenItemIds((current) => {
      const next = new Set(current)
      next.add(itemId)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("kredo_agenda_hidden_items", JSON.stringify(Array.from(next)))
      }
      return next
    })
    setSelectedItemId((current) => (current === itemId ? null : current))
  }

  const handleCompleteTask = async (taskId: string) => {
    setOptimisticStatus((prev) => ({ ...prev, [taskId]: "completed" }))
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
  }

  const handleReopenTask = async (taskId: string) => {
    setOptimisticStatus((prev) => ({ ...prev, [taskId]: "pending" }))
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
  }

  const handleCreateTaskClick = (item: AgendaItem) => {
    setCreateTaskItem(item)
  }

  const step = displayedPresentation.route.view === "day" ? 1 : 7
  const today = getTodayDateKey(snapshot.query.now, snapshot.query.timezone)

  return (
    <>
      <section className="w-full bg-canvas">
        <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-5 px-6 py-5">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-[length:var(--font-size-title-desktop-md)] font-bold leading-[var(--line-height-title-desktop-md)] tracking-tight text-heading">
                  Agenda
                </h1>
                <Badge variant="neutral" size="md">
                  {displayedPresentation.periodLabel}
                </Badge>
                {displayedPresentation.partialErrorSources.length > 0 ? (
                  <Badge variant="warning" size="md">
                    Snapshot partiel
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted">
                Vue {formatAgendaRangeShortLabel(displayedPresentation.route).toLowerCase()} · {displayedPresentation.summary.totalConflicts} conflit{displayedPresentation.summary.totalConflicts > 1 ? "s" : ""} · {displayedPresentation.summary.totalOverdue} retard{displayedPresentation.summary.totalOverdue > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface">
                <IconButton
                  aria-label="Période précédente"
                  size="sm"
                  onClick={() => navigate(buildAgendaToolbarHref(displayedPresentation.route, {
                    date: addDays(displayedPresentation.route.date, -step),
                  }))}
                  className="rounded-none border-r border-border"
                  disabled={isNavigating}
                >
                  <svg className="size-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.75}>
                    <path d="M12.5 4.5L7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </IconButton>

                <button
                  type="button"
                  onClick={() => navigate(buildAgendaToolbarHref(displayedPresentation.route, { date: today }))}
                  className="border-r border-border px-3 py-2 text-[12px] font-semibold text-heading transition-colors hover:bg-surface-hover"
                  disabled={isNavigating}
                >
                  Aujourd&apos;hui
                </button>

                <IconButton
                  aria-label="Période suivante"
                  size="sm"
                  onClick={() => navigate(buildAgendaToolbarHref(displayedPresentation.route, {
                    date: addDays(displayedPresentation.route.date, step),
                  }))}
                  className="rounded-none"
                  disabled={isNavigating}
                >
                  <svg className="size-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.75}>
                    <path d="M7.5 4.5L13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </IconButton>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateDrawerOpen(true)}
                className="shadow-none"
              >
                Créer un événement
              </Button>
            </div>
          </header>

          <AgendaToolbar
            route={displayedPresentation.route}
            filterOptions={displayedPresentation.filterOptions}
            activeFilterChips={displayedPresentation.activeFilterChips}
            summary={displayedPresentation.summary}
          />

          {displayedPresentation.partialErrorSources.length > 0 ? (
            <AgendaPartialDataNotice sources={displayedPresentation.partialErrorSources} />
          ) : null}

          <div
            className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_var(--agenda-rail-width)]"
            style={{ ["--agenda-rail-width" as string]: "clamp(296px, 22vw, 360px)" }}
          >
            <div className="min-w-0 space-y-4">
              <AgendaAllDayLane
                visibleDays={displayedPresentation.visibleDays}
                placements={displayedPresentation.allDayPlacements}
                overflowByDay={displayedPresentation.allDayOverflowByDay}
                timezone={snapshot.query.timezone}
                onItemClick={(placement: AgendaAllDayPlacement) => handleItemSelection(placement.item)}
              />

              <AgendaTimeGrid
                visibleDays={displayedPresentation.visibleDays}
                scheduledColumns={displayedPresentation.scheduledColumns}
                timezone={snapshot.query.timezone}
                now={snapshot.query.now}
                emptyState={displayedPresentation.emptyState}
                onScheduledEventClick={(placement: AgendaScheduledPlacement) => handleItemSelection(placement.item)}
              />

              {displayedPresentation.emptyState === "empty" ? (
                <div className="rounded-[var(--radius-large)] border border-dashed border-border bg-surface px-6 py-8 text-center">
                  <p className="text-base font-semibold text-heading">
                    Aucun élément Agenda sur cette période.
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    La page reste prête pour les événements planifiés, échéances métiers et absences à venir.
                  </p>
                </div>
              ) : null}

              {displayedPresentation.emptyState === "filtered" ? (
                <div className="rounded-[var(--radius-large)] border border-dashed border-border bg-surface px-6 py-8 text-center">
                  <p className="text-base font-semibold text-heading">
                    Aucun résultat pour les filtres actifs.
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Retirez un ou plusieurs filtres pour retrouver l’activité de la période.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <AgendaActionRail
                sections={displayedPresentation.railSections}
                timezone={snapshot.query.timezone}
                onSelectGroup={handleGroupSelection}
              />
            </div>
          </div>
        </div>
      </section>

      <AgendaItemDrawer
        open={selectedItem !== null}
        item={selectedItem}
        relatedGroup={selectedGroup}
        timezone={snapshot.query.timezone}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null)
        }}
        onHideForSession={handleHideForSession}
        onCompleteTask={handleCompleteTask}
        onReopenTask={handleReopenTask}
        onCreateTaskClick={handleCreateTaskClick}
      />

      <AgendaEventDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        event={null}
        allowPreparatoryTask={false}
        onSaved={() => {
          setCreateDrawerOpen(false)
          router.refresh()
        }}
      />

      {/* Task creation drawer (lightweight form) */}
      <AgendaTaskCreateDrawer
        key={createTaskItem?.id || "empty"}
        open={createTaskItem !== null}
        item={createTaskItem}
        side="right"
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
