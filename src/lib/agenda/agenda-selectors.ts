import {
  compareAgendaItems,
  enumerateDateRange,
  getAgendaTimeboxDateRange,
  getTodayDateKey,
  isAgendaActionable,
  isAgendaAllDayLaneItem,
} from "./agenda-temporal"
import type {
  AgendaDesktopDayViewModel,
  AgendaDesktopViewModel,
  AgendaGroupedItem,
  AgendaItem,
  AgendaMobileDaySectionViewModel,
  AgendaMobileViewModel,
  AgendaRelationGroup,
  AgendaSnapshot,
} from "./agenda-types"

export function filterAgendaItems(items: AgendaItem[], filters: AgendaSnapshot["query"]["filters"]) {
  const term = filters.textSearch?.trim().toLowerCase() ?? null

  return items.filter((item) => {
    if (filters.domains?.length && !filters.domains.includes(item.domain)) return false
    if (filters.itemTypes?.length && !filters.itemTypes.includes(item.type)) return false
    if (filters.sourceTypes?.length) {
      if (item.sourceType === "derived" || !filters.sourceTypes.includes(item.sourceType)) return false
    }
    if (filters.priorities?.length && !filters.priorities.includes(item.priority)) return false
    if (filters.businessStatuses?.length && !filters.businessStatuses.includes(item.businessStatus)) return false
    if (filters.temporalStates?.length && !filters.temporalStates.includes(item.temporalState)) return false
    if (filters.ownerIds?.length && (!item.ownerId || !filters.ownerIds.includes(item.ownerId))) return false
    if (filters.companyIds?.length && (!item.companyId || !filters.companyIds.includes(item.companyId))) return false
    if (filters.personIds?.length && (!item.personId || !filters.personIds.includes(item.personId))) return false
    if (filters.onlyActionable && !isAgendaActionable(item)) return false
    if (filters.onlyOverdue && item.temporalState !== "overdue") return false
    if (filters.onlyToday && item.temporalState !== "today" && item.temporalState !== "ongoing") return false
    if (filters.onlyWithRelationGroup && !item.relatedCalendarEventId && !item.relatedTaskId) return false

    if (!term) return true
    const haystack = [
      item.title,
      item.subtitle ?? "",
      item.description ?? "",
      item.ownerLabel ?? "",
      item.companyLabel ?? "",
      item.personLabel ?? "",
    ].join(" ").toLowerCase()

    return haystack.includes(term)
  })
}

export function buildAgendaRelationGroups(items: AgendaItem[]) {
  const itemsById = new Map(items.map((item) => [item.id, item]))
  const groups: AgendaRelationGroup[] = []

  for (const task of items) {
    if (task.type !== "task" || !task.relatedCalendarEventId) continue
    const eventId = `scheduled_event:calendar_event:${task.relatedCalendarEventId}`
    const event = itemsById.get(eventId)
    if (!event) continue

    const orderedItems = [event, task].sort(compareAgendaItems)
    groups.push({
      id: `group:event-task:${task.relatedCalendarEventId}:${task.sourceId}`,
      kind: "event_task_pair",
      primaryItemId: orderedItems[0].id,
      items: orderedItems,
    })
  }

  const relationGroupByItemId = new Map<string, string>()
  for (const group of groups) {
    for (const item of group.items) {
      relationGroupByItemId.set(item.id, group.id)
    }
  }

  const updatedItems = items.map((item) => {
    const relationGroupId = relationGroupByItemId.get(item.id)
    return relationGroupId ? { ...item, relationGroupId } : item
  })

  return { items: updatedItems.sort(compareAgendaItems), relationGroups: groups }
}

export function buildDisplayGroups(items: AgendaItem[], relationGroups: AgendaRelationGroup[]) {
  const groupedItemIds = new Set(relationGroups.flatMap((group) => group.items.map((item) => item.id)))
  const displayGroups: AgendaGroupedItem[] = relationGroups.map((group) => ({
    id: group.id,
    kind: group.kind,
    primaryItem: group.items.find((item) => item.id === group.primaryItemId) ?? group.items[0],
    items: group.items,
  }))

  for (const item of items) {
    if (groupedItemIds.has(item.id)) continue
    displayGroups.push({
      id: `single:${item.id}`,
      kind: "single",
      primaryItem: item,
      items: [item],
    })
  }

  return displayGroups.sort((left, right) => compareAgendaItems(left.primaryItem, right.primaryItem))
}

function buildItemsById(items: AgendaItem[]) {
  return Object.fromEntries(items.map((item) => [item.id, item]))
}

function buildDenseDates(snapshot: AgendaSnapshot) {
  const dates = new Map<string, { total: number; actionable: number }>()
  for (const item of snapshot.items) {
    const { startDate, endDate } = getAgendaTimeboxDateRange(item.timebox, snapshot.query.timezone)
    for (const date of enumerateDateRange(startDate, endDate)) {
      const current = dates.get(date) ?? { total: 0, actionable: 0 }
      current.total += 1
      if (isAgendaActionable(item)) current.actionable += 1
      dates.set(date, current)
    }
  }
  return new Set(
    [...dates.entries()]
      .filter(([, value]) => value.total >= 8 || value.actionable >= 5)
      .map(([date]) => date),
  )
}

export function selectAgendaDesktopViewModel(snapshot: AgendaSnapshot): AgendaDesktopViewModel {
  const denseDates = buildDenseDates(snapshot)
  const displayGroups = buildDisplayGroups(snapshot.items, snapshot.relationGroups)
  const dayMap = new Map<string, AgendaDesktopDayViewModel>()

  for (const group of displayGroups) {
    const dateRange = getAgendaTimeboxDateRange(group.primaryItem.timebox, snapshot.query.timezone)
    for (const date of enumerateDateRange(dateRange.startDate, dateRange.endDate)) {
      const current = dayMap.get(date) ?? {
        date,
        allDayItems: [],
        timedItems: [],
        attentionItems: [],
        groupedItems: [],
        isDense: denseDates.has(date),
        conflicts: [],
      }

      current.groupedItems.push(group)
      for (const item of group.items) {
        if (isAgendaAllDayLaneItem(item, snapshot.query.timezone)) {
          current.allDayItems.push(item)
        } else {
          current.timedItems.push(item)
        }

        if (item.type === "alert" && item.alertKind === "schedule_conflict") {
          current.conflicts.push(item)
        }

        if (item.temporalState === "overdue" || item.type === "alert") {
          current.attentionItems.push(item)
        }
      }

      dayMap.set(date, current)
    }
  }

  const days = [...dayMap.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((day) => ({
      ...day,
      allDayItems: day.allDayItems.sort(compareAgendaItems),
      timedItems: day.timedItems.sort(compareAgendaItems),
      attentionItems: day.attentionItems.sort(compareAgendaItems),
      groupedItems: day.groupedItems.sort((left, right) => compareAgendaItems(left.primaryItem, right.primaryItem)),
      conflicts: day.conflicts.sort(compareAgendaItems),
    }))

  return {
    timezone: snapshot.query.timezone,
    generatedAt: snapshot.generatedAt,
    itemsById: buildItemsById(snapshot.items),
    days,
    relationGroups: displayGroups.filter((group) => group.kind !== "single"),
    partial: snapshot.partial,
    errors: snapshot.errors,
    summary: snapshot.summary,
  }
}

export function selectAgendaMobileViewModel(snapshot: AgendaSnapshot): AgendaMobileViewModel {
  const today = getTodayDateKey(snapshot.query.now, snapshot.query.timezone)
  const displayGroups = buildDisplayGroups(snapshot.items, snapshot.relationGroups)
  const sectionMap = new Map<string, AgendaMobileDaySectionViewModel>()

  for (const group of displayGroups) {
    const range = getAgendaTimeboxDateRange(group.primaryItem.timebox, snapshot.query.timezone)
    for (const date of enumerateDateRange(range.startDate, range.endDate)) {
      const current = sectionMap.get(date) ?? {
        date,
        label: date === today ? "Aujourd’hui" : date,
        allDayItems: [],
        primaryItems: [],
        groupedItems: [],
        isDense: false,
        hasConflict: false,
      }

      current.groupedItems.push(group)
      current.primaryItems.push(group.primaryItem)
      current.isDense ||= group.items.some((item) => item.temporalState === "overdue") || group.items.length >= 5
      current.hasConflict ||= group.items.some((item) => item.type === "alert" && item.alertKind === "schedule_conflict")

      for (const item of group.items) {
        if (isAgendaAllDayLaneItem(item, snapshot.query.timezone)) {
          current.allDayItems.push(item)
        }
      }

      sectionMap.set(date, current)
    }
  }

  const sections = [...sectionMap.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((section) => ({
      ...section,
      allDayItems: section.allDayItems.sort(compareAgendaItems),
      primaryItems: section.primaryItems.sort(compareAgendaItems),
      groupedItems: section.groupedItems.sort((left, right) => compareAgendaItems(left.primaryItem, right.primaryItem)),
    }))

  return {
    timezone: snapshot.query.timezone,
    generatedAt: snapshot.generatedAt,
    itemsById: buildItemsById(snapshot.items),
    todayItems: snapshot.items.filter((item) => item.temporalState === "today" || item.temporalState === "ongoing"),
    overdueItems: snapshot.items.filter((item) => item.temporalState === "overdue").sort(compareAgendaItems),
    attentionItems: snapshot.items.filter((item) => item.type === "alert" || item.temporalState === "overdue").sort(compareAgendaItems),
    daySections: sections,
    relationGroups: displayGroups.filter((group) => group.kind !== "single"),
    partial: snapshot.partial,
    errors: snapshot.errors,
    summary: snapshot.summary,
  }
}
