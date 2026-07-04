import { enumerateDateRange, getAgendaTimeboxDateRange } from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_THRESHOLDS } from "@/lib/agenda/agenda-thresholds"
import type { AgendaSnapshot, DeadlineItem } from "@/lib/agenda/agenda-types"
import type { WeeklyBusinessFacts, WeeklyManagerFacts } from "@/app/(app)/reports/_data/reports-types"
import { getIsoWeekLabel } from "./iso-week"
import { buildPriorityItem, scoreAgendaItem } from "./scoring"

const DEFAULT_MAX_PRIORITIES = 10

export type ComputeWeeklyBriefInput = {
  snapshot: AgendaSnapshot
  businessFacts: WeeklyBusinessFacts
  period: { startDate: string; endDate: string; asOfDate: string }
  ownerId: string | null
  isWorkspaceWide: boolean
  // Clé `${sourceType}:${sourceId}` -> nombre de semaines consécutives où
  // l'item a été ignoré (weekly_brief_dismissals). Résolu par l'appelant —
  // cette fonction reste pure, testable sans Supabase.
  dismissCounts?: Record<string, number>
  maxPriorities?: number
}

function isDeadlineItem(item: AgendaSnapshot["items"][number]): item is DeadlineItem {
  return item.type === "deadline"
}

// Assemble AgendaSnapshot (source unique "quoi cette semaine") + faits
// business (get_weekly_business_facts) + scoring déterministe weekly-scoring-v1
// en un WeeklyManagerFacts complet. N'exécute aucune requête réseau — pure,
// testable en isolation (voir compute-weekly-brief.test.ts).
export function computeWeeklyBrief(input: ComputeWeeklyBriefInput): WeeklyManagerFacts {
  const {
    snapshot,
    businessFacts,
    period,
    ownerId,
    isWorkspaceWide,
    dismissCounts = {},
    maxPriorities = DEFAULT_MAX_PRIORITIES,
  } = input

  const timezone = snapshot.query.timezone
  const dismissCountFor = (sourceType: string, sourceId: string) =>
    dismissCounts[`${sourceType}:${sourceId}`] ?? 0

  const dayKeys = enumerateDateRange(period.startDate, period.endDate)
  let denseDaysCount = 0

  const agendaByDay = dayKeys.map((date) => {
    const itemsForDay = snapshot.items.filter((item) => {
      const range = getAgendaTimeboxDateRange(item.timebox, timezone)
      return date >= range.startDate && date <= range.endDate
    })

    if (itemsForDay.length >= AGENDA_V1_THRESHOLDS.denseDayVisibleItems) {
      denseDaysCount += 1
    }

    const topItemIds = itemsForDay
      .map((item) => scoreAgendaItem(item, dismissCountFor(item.sourceType, item.sourceId)))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 3)
      .map((scored) => scored.item.id)

    return {
      date,
      eventsCount: itemsForDay.filter((item) => item.sourceType === "calendar_event").length,
      tasksCount: itemsForDay.filter((item) => item.type === "task").length,
      deadlinesCount: itemsForDay.filter((item) => item.type === "deadline").length,
      topItemIds,
    }
  })

  const workload = {
    calendarEventsCount: snapshot.items.filter((item) => item.sourceType === "calendar_event").length,
    tasksDueCount: snapshot.items.filter((item) => item.type === "task").length,
    overdueOpenTasksCount: snapshot.items.filter(
      (item) => item.type === "task" && item.temporalState === "overdue",
    ).length,
    actionableItemsCount: snapshot.summary.totalActionable,
    conflictCount: snapshot.summary.totalConflicts,
    denseDaysCount,
  }

  const priorities = snapshot.items
    .map((item) => scoreAgendaItem(item, dismissCountFor(item.sourceType, item.sourceId)))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, maxPriorities)
    .map((scored, index) => buildPriorityItem(scored, index + 1))

  // Comptages dérivés de l'agenda — déjà couverts par missions-resolver.ts /
  // opportunities-resolver.ts / recruitment-resolver.ts, jamais recalculés en
  // SQL (voir commentaire de tête de reports-types.ts).
  const deadlineItems = snapshot.items.filter(isDeadlineItem)
  const nextActionsCount = deadlineItems.filter(
    (item) => item.sourceType === "opportunity" && item.deadlineKind === "opportunity_next_action",
  ).length
  const missionStartsCount = deadlineItems.filter(
    (item) => item.sourceType === "mission" && item.deadlineKind === "mission_start",
  ).length
  const missionEndsCount = deadlineItems.filter(
    (item) => item.sourceType === "mission" && item.deadlineKind === "mission_end",
  ).length
  const milestonesCount = snapshot.items.filter(
    (item) => item.sourceType === "candidate_hiring_milestone",
  ).length

  return {
    period: { ...period, weekIso: getIsoWeekLabel(period.startDate) },
    scope: { ownerId, isWorkspaceWide },
    workload,
    agendaByDay,
    commercial: { ...businessFacts.commercial, nextActionsCount },
    delivery: { ...businessFacts.delivery, missionStartsCount, missionEndsCount },
    recruitment: { ...businessFacts.recruitment, milestonesCount },
    priorities,
    dataCutoffAt: businessFacts.dataCutoffAt,
    caveats: [...businessFacts.caveats, ...snapshot.errors.map((error) => error.message)],
  }
}
