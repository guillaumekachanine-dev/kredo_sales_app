import { AGENDA_V1_THRESHOLDS } from "./agenda-thresholds"
import {
  compareAgendaItems,
  enumerateDateRange,
  getAgendaTimeboxDateRange,
  getAgendaTimeboxEndExclusiveAt,
  getAgendaTimeboxPrimaryAt,
  getTodayDateKey,
  getWeekStartDateKey,
  isAgendaActionable,
  isDateWithinInclusiveRange,
} from "./agenda-temporal"
import type {
  AgendaAggregationError,
  AgendaAlertKind,
  AgendaItem,
  AgendaQuery,
  AgendaSourceResult,
  AlertItem,
} from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

function getRelationCollaboratorId(item: AgendaItem) {
  const metadata = item.metadata ?? {}
  const related = metadata.relatedCollaboratorId
  return typeof related === "string" ? related : null
}

function timeboxesOverlap(left: AgendaItem, right: AgendaItem) {
  const leftStart = new Date(getAgendaTimeboxPrimaryAt(left.timebox))
  const leftEnd = new Date(getAgendaTimeboxEndExclusiveAt(left.timebox))
  const rightStart = new Date(getAgendaTimeboxPrimaryAt(right.timebox))
  const rightEnd = new Date(getAgendaTimeboxEndExclusiveAt(right.timebox))

  return leftStart < rightEnd && rightStart < leftEnd
}

function createAlert(
  query: AgendaQuery,
  kind: AgendaAlertKind,
  idSuffix: string,
  title: string,
  relatedItems: AgendaItem[],
  priority: AlertItem["priority"],
  description?: string | null,
): AlertItem {
  const sortedRelated = [...relatedItems].sort(compareAgendaItems)
  const primary = sortedRelated[0]

  return {
    id: `alert:derived:${kind}:${idSuffix}`,
    type: "alert",
    sourceType: "derived",
    sourceId: idSuffix,
    workspaceId: query.workspaceId,
    domain: primary?.domain ?? "agenda",
    title,
    subtitle: primary?.subtitle ?? null,
    description: description ?? null,
    sourceStatus: kind,
    businessStatus: "pending",
    temporalState: primary
      ? primary.temporalState === "overdue" ? "overdue" : primary.temporalState
      : "today",
    priority,
    timebox: primary?.timebox ?? {
      kind: "all_day",
      date: getTodayDateKey(query.now, query.timezone),
      timezone: query.timezone,
      allDay: true,
    },
    primaryLink: primary?.primaryLink ?? {
      module: "agenda",
      href: "/agenda",
      label: title,
      sourceType: "calendar_event",
      sourceId: idSuffix,
    },
    relatedLinks: sortedRelated.flatMap((item) => [item.primaryLink, ...item.relatedLinks]).filter((link, index, links) => {
      const key = `${link.href}:${link.sourceId}`
      return links.findIndex((candidate) => `${candidate.href}:${candidate.sourceId}` === key) === index
    }),
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: true,
      canEditFromAgenda: false,
      canCreateTask: true,
      canReschedule: false,
      canMarkDone: false,
      canHideForSession: true,
    },
    ownerId: primary?.ownerId ?? null,
    ownerLabel: primary?.ownerLabel ?? null,
    companyId: primary?.companyId ?? null,
    companyLabel: primary?.companyLabel ?? null,
    personId: primary?.personId ?? null,
    personLabel: primary?.personLabel ?? null,
    relatedCalendarEventId: null,
    relatedTaskId: null,
    relationGroupId: null,
    isDerived: true,
    tags: [],
    metadata: {
      relatedCount: sortedRelated.length,
    },
    alertKind: kind,
    relatedItemIds: sortedRelated.map((item) => item.id),
  }
}

function detectOwnerConflicts(items: AgendaItem[], query: AgendaQuery) {
  const events = items.filter(
    (item): item is Extract<AgendaItem, { type: "scheduled_event" }> =>
      item.type === "scheduled_event" && item.timebox.kind === "slot" && Boolean(item.ownerId),
  )
  const seen = new Set<string>()
  const alerts: AlertItem[] = []

  for (let index = 0; index < events.length; index += 1) {
    for (let cursor = index + 1; cursor < events.length; cursor += 1) {
      const left = events[index]
      const right = events[cursor]
      if (!left.ownerId || left.ownerId !== right.ownerId) continue
      if (!timeboxesOverlap(left, right)) continue

      const key = [left.id, right.id].sort().join(":")
      if (seen.has(key)) continue
      seen.add(key)

      alerts.push(
        createAlert(
          query,
          "schedule_conflict",
          `owner:${key}`,
          `Conflit de planning · ${left.ownerLabel ?? "Responsable"}`,
          [left, right],
          "urgent",
        ),
      )
    }
  }

  return alerts
}

function detectAbsenceConflicts(items: AgendaItem[], query: AgendaQuery) {
  const events = items.filter(
    (item): item is Extract<AgendaItem, { type: "scheduled_event" }> =>
      item.type === "scheduled_event" && item.timebox.kind === "slot",
  )
  const absences = items.filter(
    (item): item is Extract<AgendaItem, { type: "availability_block" }> =>
      item.type === "availability_block" && item.blockKind === "absence",
  )
  const seen = new Set<string>()
  const alerts: AlertItem[] = []

  for (const event of events) {
    const collaboratorId = getRelationCollaboratorId(event)
    if (!collaboratorId) continue

    for (const absence of absences) {
      if (absence.personId !== collaboratorId) continue
      if (!timeboxesOverlap(event, absence)) continue

      const key = [event.id, absence.id].sort().join(":")
      if (seen.has(key)) continue
      seen.add(key)

      alerts.push(
        createAlert(
          query,
          "schedule_conflict",
          `absence:${key}`,
          `Conflit événement / absence · ${absence.personLabel ?? "Collaborateur"}`,
          [event, absence],
          "urgent",
        ),
      )
    }
  }

  return alerts
}

function isImminent(item: AgendaItem, query: AgendaQuery) {
  const diffMs = new Date(getAgendaTimeboxPrimaryAt(item.timebox)).getTime() - new Date(query.now).getTime()
  if (diffMs < 0) return false

  switch (item.type) {
    case "task":
      return diffMs <= AGENDA_V1_THRESHOLDS.imminentTaskHours * 60 * 60 * 1000
    case "deadline":
      switch (item.deadlineKind) {
        case "mission_end":
          return diffMs <= AGENDA_V1_THRESHOLDS.imminentMissionEndDays * 24 * 60 * 60 * 1000
        case "opportunity_target_close":
          return diffMs <= AGENDA_V1_THRESHOLDS.imminentOpportunityTargetCloseDays * 24 * 60 * 60 * 1000
        case "opportunity_next_action":
          return diffMs <= AGENDA_V1_THRESHOLDS.imminentOpportunityNextActionHours * 60 * 60 * 1000
        case "recruitment_milestone":
          return diffMs <= AGENDA_V1_THRESHOLDS.imminentRecruitmentMilestoneHours * 60 * 60 * 1000
        default:
          return false
      }
    default:
      return false
  }
}

function detectDeadlineAlerts(items: AgendaItem[], query: AgendaQuery) {
  return items
    .filter((item): item is Extract<AgendaItem, { type: "deadline" }> => item.type === "deadline")
    .filter((item) => item.deadlineKind === "opportunity_target_close")
    .filter((item) => item.temporalState === "overdue" || isImminent(item, query))
    .map((item) =>
      createAlert(
        query,
        "deadline_at_risk",
        item.id,
        item.temporalState === "overdue" ? `Closing dépassé · ${item.title}` : `Closing à surveiller · ${item.title}`,
        [item],
        item.temporalState === "overdue" ? "urgent" : "high",
      ),
    )
}

function computeDenseDays(items: AgendaItem[], query: AgendaQuery) {
  const dayStats = new Map<string, { total: number; actionable: number }>()

  for (const item of items) {
    const { startDate, endDate } = getAgendaTimeboxDateRange(item.timebox, query.timezone)
    for (const date of enumerateDateRange(startDate, endDate)) {
      const current = dayStats.get(date) ?? { total: 0, actionable: 0 }
      current.total += 1
      if (isAgendaActionable(item)) current.actionable += 1
      dayStats.set(date, current)
    }
  }

  return [...dayStats.entries()]
    .filter(([, stat]) =>
      stat.total >= AGENDA_V1_THRESHOLDS.denseDayVisibleItems ||
      stat.actionable >= AGENDA_V1_THRESHOLDS.denseDayActionableItems,
    )
    .map(([date]) => date)
}

function buildWeekTensionAlert(items: AgendaItem[], conflicts: AlertItem[], query: AgendaQuery) {
  const today = getTodayDateKey(query.now, query.timezone)
  const weekStart = getWeekStartDateKey(today)
  const effectiveWeekEnd = new Date(new Date(weekStart).getTime())
  effectiveWeekEnd.setUTCDate(effectiveWeekEnd.getUTCDate() + 6)
  const weekEndDate = effectiveWeekEnd.toISOString().slice(0, 10)

  const weekItems = items.filter((item) => {
    const { startDate, endDate } = getAgendaTimeboxDateRange(item.timebox, query.timezone)
    return isDateWithinInclusiveRange(startDate, weekStart, weekEndDate) ||
      isDateWithinInclusiveRange(endDate, weekStart, weekEndDate) ||
      (startDate < weekStart && endDate > weekEndDate)
  })

  const overdueTasks = weekItems.filter((item) => item.type === "task" && item.temporalState === "overdue").length
  const denseDays = computeDenseDays(weekItems, query)
  const imminentDeadlines = weekItems.filter((item) => isAgendaActionable(item) && isImminent(item, query)).length

  const triggers: string[] = []
  if (overdueTasks >= AGENDA_V1_THRESHOLDS.weekTensionOverdueTasks) triggers.push(`${overdueTasks} tâches en retard`)
  if (conflicts.length >= AGENDA_V1_THRESHOLDS.weekTensionConflicts) triggers.push(`${conflicts.length} conflits`)
  if (denseDays.length >= AGENDA_V1_THRESHOLDS.weekTensionDenseDays) triggers.push(`${denseDays.length} journées denses`)
  if (imminentDeadlines >= AGENDA_V1_THRESHOLDS.weekTensionImminentDeadlines) triggers.push(`${imminentDeadlines} échéances imminentes`)

  if (triggers.length === 0) return null

  const related = [...weekItems]
    .filter((item) => item.temporalState === "overdue" || isImminent(item, query))
    .sort(compareAgendaItems)
    .slice(0, 6)

  return createAlert(
    query,
    "week_tension",
    `${weekStart}:${weekEndDate}`,
    "Semaine sous tension",
    related,
    "high",
    triggers.join(" · "),
  )
}

export function deriveAgendaAlerts(items: AgendaItem[], query: AgendaQuery) {
  const alerts = [
    ...detectOwnerConflicts(items, query),
    ...detectAbsenceConflicts(items, query),
    ...detectDeadlineAlerts(items, query),
  ]
  const weekTension = buildWeekTensionAlert(items, alerts.filter((item) => item.alertKind === "schedule_conflict"), query)
  if (weekTension) alerts.push(weekTension)
  return alerts.sort(compareAgendaItems)
}

export function resolveDerivedAlertsSource(
  items: AgendaItem[],
  query: AgendaQuery,
): AgendaSourceResult {
  const startedAt = Date.now()

  try {
    const derived = deriveAgendaAlerts(items, query)
    return createAgendaSourceResult("derived", {
      items: derived,
      meta: {
        fetchedAt: new Date().toISOString(),
        rowCount: derived.length,
        truncated: false,
        timedOut: false,
        durationMs: Date.now() - startedAt,
      },
    })
  } catch (error) {
    const agendaError: AgendaAggregationError = createAgendaError(
      "derived",
      "DERIVED_ALERT_FAILED",
      "derived alerts failed",
      { reason: error instanceof Error ? error.message : String(error) },
    )

    return createAgendaSourceResult("derived", {
      ok: false,
      errors: [agendaError],
      meta: {
        fetchedAt: new Date().toISOString(),
        rowCount: 0,
        truncated: false,
        timedOut: false,
        durationMs: Date.now() - startedAt,
      },
    })
  }
}
