"use client"

import React, { useMemo } from "react"
import { getTodayDateKey, getAgendaTimeboxDateRange } from "@/lib/agenda/agenda-temporal"
import { addDays } from "./agenda-mobile-model"
import { MobileAgendaSection } from "./MobileAgendaSection"
import { MobileScheduledEventCard } from "./MobileScheduledEventCard"
import { MobileTaskCard } from "./MobileTaskCard"
import { MobileEventTaskCard } from "./MobileEventTaskCard"
import { MobileDeadlineCard } from "./MobileDeadlineCard"
import { MobileAvailabilityCard } from "./MobileAvailabilityCard"
import { MobileAlertCard } from "./MobileAlertCard"
import type { AgendaGroupedItem, AgendaItem, ScheduledEventItem, TaskItem } from "@/lib/agenda/agenda-types"

interface MobileAgendaFeedProps {
  groupedItems: AgendaGroupedItem[]
  hiddenItemIds: Set<string>
  timezone: string
  now: string
  onItemClick: (item: AgendaItem, group: AgendaGroupedItem) => void
  onToggleTaskStatus?: (taskId: string) => void
}

export function MobileAgendaFeed({
  groupedItems,
  hiddenItemIds,
  timezone,
  now,
  onItemClick,
  onToggleTaskStatus,
}: MobileAgendaFeedProps) {
  const todayKey = useMemo(() => getTodayDateKey(now, timezone), [now, timezone])
  const next7DaysKey = useMemo(() => addDays(todayKey, 7), [todayKey])

  // Group items into the 4 buckets
  const buckets = useMemo(() => {
    const overdue: AgendaGroupedItem[] = []
    const today: AgendaGroupedItem[] = []
    const next7Days: AgendaGroupedItem[] = []
    const later: AgendaGroupedItem[] = []

    for (const group of groupedItems) {
      // 1. Filter out hidden items in the group
      const visibleItems = group.items.filter((item) => !hiddenItemIds.has(item.id))
      if (visibleItems.length === 0) continue

      const filteredGroup: AgendaGroupedItem = {
        ...group,
        items: visibleItems,
        primaryItem: visibleItems.find((i) => i.id === group.primaryItem.id) || visibleItems[0],
      }

      // 2. Check if any item in the group is overdue
      const hasOverdue = visibleItems.some((item) => item.temporalState === "overdue")

      if (hasOverdue) {
        overdue.push(filteredGroup)
        continue
      }

      // 3. Group by start date
      const dateRange = getAgendaTimeboxDateRange(filteredGroup.primaryItem.timebox, timezone)
      const dateKey = dateRange.startDate

      if (dateKey === todayKey) {
        today.push(filteredGroup)
      } else if (dateKey > todayKey && dateKey <= next7DaysKey) {
        next7Days.push(filteredGroup)
      } else if (dateKey > next7DaysKey) {
        later.push(filteredGroup)
      }
      // If dateKey < todayKey and not overdue, we don't display it in the feed
    }

    return { overdue, today, next7Days, later }
  }, [groupedItems, hiddenItemIds, todayKey, next7DaysKey, timezone])

  const renderGroup = (group: AgendaGroupedItem) => {
    // Check if it's an event-task pair
    if (group.kind === "event_task_pair" && group.items.length >= 2) {
      const eventItem = group.items.find((item) => item.type === "scheduled_event") as ScheduledEventItem
      const taskItem = group.items.find((item) => item.type === "task") as TaskItem

      if (eventItem && taskItem) {
        return (
          <MobileEventTaskCard
            key={group.id}
            eventItem={eventItem}
            taskItem={taskItem}
            timezone={timezone}
            onClick={() => onItemClick(eventItem, group)}
            onToggleStatus={onToggleTaskStatus ? () => onToggleTaskStatus(taskItem.sourceId) : undefined}
          />
        )
      }
    }

    // Render elements individually if they are not event_task_pair or if one of them was hidden
    return group.items.map((item) => {
      switch (item.type) {
        case "scheduled_event":
          return (
            <MobileScheduledEventCard
              key={item.id}
              item={item as ScheduledEventItem}
              timezone={timezone}
              onClick={() => onItemClick(item, group)}
            />
          )
        case "task":
          return (
            <MobileTaskCard
              key={item.id}
              item={item as TaskItem}
              timezone={timezone}
              onClick={() => onItemClick(item, group)}
              onToggleStatus={onToggleTaskStatus ? () => onToggleTaskStatus(item.sourceId) : undefined}
            />
          )
        case "deadline":
          return (
            <MobileDeadlineCard
              key={item.id}
              item={item}
              timezone={timezone}
              onClick={() => onItemClick(item, group)}
            />
          )
        case "availability_block":
          return (
            <MobileAvailabilityCard
              key={item.id}
              item={item}
              timezone={timezone}
              onClick={() => onItemClick(item, group)}
            />
          )
        case "alert":
          return (
            <MobileAlertCard
              key={item.id}
              item={item}
              timezone={timezone}
              onClick={() => onItemClick(item, group)}
            />
          )
        default:
          return null
      }
    })
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {buckets.overdue.length > 0 && (
        <MobileAgendaSection title="En retard" count={buckets.overdue.length}>
          {buckets.overdue.map((g) => renderGroup(g))}
        </MobileAgendaSection>
      )}

      {buckets.today.length > 0 && (
        <MobileAgendaSection title="Aujourd'hui" count={buckets.today.length}>
          {buckets.today.map((g) => renderGroup(g))}
        </MobileAgendaSection>
      )}

      {buckets.next7Days.length > 0 && (
        <MobileAgendaSection title="7 prochains jours" count={buckets.next7Days.length}>
          {buckets.next7Days.map((g) => renderGroup(g))}
        </MobileAgendaSection>
      )}

      {buckets.later.length > 0 && (
        <MobileAgendaSection title="Plus tard" count={buckets.later.length}>
          {buckets.later.map((g) => renderGroup(g))}
        </MobileAgendaSection>
      )}

      {buckets.overdue.length === 0 &&
        buckets.today.length === 0 &&
        buckets.next7Days.length === 0 &&
        buckets.later.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <svg className="size-10 text-muted/60 stroke-[1.5] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
            <h3 className="font-heading text-sm font-bold text-heading">Aucune action</h3>
            <p className="text-xs text-muted mt-1 max-w-[200px]">Votre fil d&apos;agence est vide pour cette période.</p>
          </div>
        )}
    </div>
  )
}
