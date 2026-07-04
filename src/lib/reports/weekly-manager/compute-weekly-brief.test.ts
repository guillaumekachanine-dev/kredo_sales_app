import { describe, expect, it } from "vitest"
import { buildAgendaQuery } from "@/lib/agenda/aggregate-agenda-snapshot"
import type { AgendaItem, AgendaSnapshot } from "@/lib/agenda/agenda-types"
import type { WeeklyBusinessFacts } from "@/app/(app)/reports/_data/reports-types"
import { computeWeeklyBrief } from "./compute-weekly-brief"

const PERIOD = { startDate: "2026-07-06", endDate: "2026-07-12", asOfDate: "2026-07-04" }

const baseUiCapabilities = {
  canOpenPrimary: true,
  canOpenSource: false,
  canEditFromAgenda: false,
  canCreateTask: false,
  canReschedule: false,
  canMarkDone: false,
  canHideForSession: false,
}

function makeItem(overrides: Record<string, unknown> & { id: string }): AgendaItem {
  return {
    workspaceId: "ws-1",
    title: overrides.id as string,
    businessStatus: "pending",
    temporalState: "upcoming",
    priority: "normal",
    primaryLink: { module: "agenda", href: "/agenda", label: overrides.id as string, sourceType: "task", sourceId: overrides.id as string },
    relatedLinks: [],
    uiCapabilities: baseUiCapabilities,
    isDerived: false,
    tags: [],
    ...overrides,
  } as unknown as AgendaItem
}

function makeSnapshot(items: AgendaItem[], errors: AgendaSnapshot["errors"] = []): AgendaSnapshot {
  const query = buildAgendaQuery({
    workspaceId: "ws-1",
    from: "2026-07-06T00:00:00.000Z",
    to: "2026-07-13T00:00:00.000Z",
  })

  return {
    query,
    items,
    relationGroups: [],
    sourceResults: [],
    summary: {
      totalItems: items.length,
      totalActionable: items.filter((item) => item.type === "task" || item.type === "deadline" || item.type === "alert").length,
      totalOverdue: items.filter((item) => item.temporalState === "overdue").length,
      totalToday: 0,
      totalConflicts: 0,
      hasWeekTension: false,
      allDayLaneCount: 0,
    },
    partial: errors.length > 0,
    errors,
    generatedAt: "2026-07-04T08:00:00.000Z",
  }
}

const businessFacts: WeeklyBusinessFacts = {
  commercial: {
    weightedPipeThisWeek: 12000,
    staleOpportunitiesCount: 2,
    staleOpportunities: [],
    quietTargetAccountsCount: 3,
    quietTargetAccounts: [],
  },
  delivery: {
    lowMarginMissionsCount: 1,
    lowMarginMissions: [],
    lowActivityCollaboratorsCount: 0,
    lowActivityCollaborators: [],
  },
  recruitment: {
    openPositioningCount: 4,
    pendingOffersCount: 1,
    pendingOffers: [],
  },
  dataCutoffAt: "2026-07-04T08:00:00.000Z",
  caveats: ["business fact caveat"],
}

describe("computeWeeklyBrief", () => {
  it("stamps period.weekIso and preserves scope", () => {
    const snapshot = makeSnapshot([])
    const brief = computeWeeklyBrief({
      snapshot,
      businessFacts,
      period: PERIOD,
      ownerId: "user-1",
      isWorkspaceWide: false,
    })

    expect(brief.period.weekIso).toBe("2026-W28")
    expect(brief.scope).toEqual({ ownerId: "user-1", isWorkspaceWide: false })
  })

  it("derives nextActionsCount/missionStartsCount/missionEndsCount/milestonesCount from the agenda snapshot, not from businessFacts", () => {
    const items = [
      makeItem({
        id: "opp-1",
        type: "deadline",
        sourceType: "opportunity",
        sourceId: "opp-1",
        domain: "commerce",
        deadlineKind: "opportunity_next_action",
        timebox: { kind: "milestone", at: "2026-07-07T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
      }),
      makeItem({
        id: "mission-start-1",
        type: "deadline",
        sourceType: "mission",
        sourceId: "mission-1",
        domain: "missions",
        deadlineKind: "mission_start",
        timebox: { kind: "deadline", at: "2026-07-08T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
      }),
      makeItem({
        id: "mission-end-1",
        type: "deadline",
        sourceType: "mission",
        sourceId: "mission-2",
        domain: "missions",
        deadlineKind: "mission_end",
        timebox: { kind: "deadline", at: "2026-07-09T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
      }),
      makeItem({
        id: "milestone-1",
        type: "deadline",
        sourceType: "candidate_hiring_milestone",
        sourceId: "chm-1",
        domain: "recruitment",
        deadlineKind: "recruitment_milestone",
        timebox: { kind: "milestone", at: "2026-07-10T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
      }),
    ]

    const brief = computeWeeklyBrief({
      snapshot: makeSnapshot(items),
      businessFacts,
      period: PERIOD,
      ownerId: null,
      isWorkspaceWide: true,
    })

    expect(brief.commercial.nextActionsCount).toBe(1)
    expect(brief.delivery.missionStartsCount).toBe(1)
    expect(brief.delivery.missionEndsCount).toBe(1)
    expect(brief.recruitment.milestonesCount).toBe(1)
    // Les compteurs business (staleOpportunitiesCount, etc.) restent ceux de la RPC, non recalculés.
    expect(brief.commercial.staleOpportunitiesCount).toBe(2)
    expect(brief.delivery.lowMarginMissionsCount).toBe(1)
  })

  it("flags a day as dense once it reaches the shared agenda threshold (8 items)", () => {
    const denseDayItems = Array.from({ length: 8 }, (_, index) =>
      makeItem({
        id: `task-${index}`,
        type: "task",
        sourceType: "task",
        sourceId: `task-${index}`,
        domain: "agenda",
        taskKind: "standalone",
        timebox: { kind: "deadline", at: "2026-07-08T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
      }),
    )

    const brief = computeWeeklyBrief({
      snapshot: makeSnapshot(denseDayItems),
      businessFacts,
      period: PERIOD,
      ownerId: null,
      isWorkspaceWide: true,
    })

    expect(brief.workload.denseDaysCount).toBe(1)
    const denseDay = brief.agendaByDay.find((day) => day.date === "2026-07-08")
    expect(denseDay?.tasksCount).toBe(8)
    expect(denseDay?.topItemIds).toHaveLength(3)
  })

  it("caps priorities at maxPriorities and ranks them by descending score", () => {
    const items = Array.from({ length: 15 }, (_, index) =>
      makeItem({
        id: `task-${index}`,
        type: "task",
        sourceType: "task",
        sourceId: `task-${index}`,
        domain: "agenda",
        taskKind: "standalone",
        temporalState: index % 2 === 0 ? "overdue" : "upcoming",
        timebox: { kind: "deadline", at: "2026-07-08T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
      }),
    )

    const brief = computeWeeklyBrief({
      snapshot: makeSnapshot(items),
      businessFacts,
      period: PERIOD,
      ownerId: null,
      isWorkspaceWide: true,
      maxPriorities: 5,
    })

    expect(brief.priorities).toHaveLength(5)
    expect(brief.priorities[0].tier).toBe("critical") // overdue items score highest
    expect(brief.priorities.map((p) => p.rank)).toEqual([1, 2, 3, 4, 5])
  })

  it("declassifies a priority item after 3 consecutive dismissed weeks", () => {
    const item = makeItem({
      id: "task-dismissed",
      type: "task",
      sourceType: "task",
      sourceId: "task-dismissed",
      domain: "agenda",
      taskKind: "standalone",
      temporalState: "overdue",
      timebox: { kind: "deadline", at: "2026-07-08T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
    })

    const brief = computeWeeklyBrief({
      snapshot: makeSnapshot([item]),
      businessFacts,
      period: PERIOD,
      ownerId: null,
      isWorkspaceWide: true,
      dismissCounts: { "task:task-dismissed": 3 },
    })

    expect(brief.priorities[0].tier).toBe("normal")
  })

  it("merges agenda aggregation errors into caveats alongside business-fact caveats", () => {
    const brief = computeWeeklyBrief({
      snapshot: makeSnapshot([], [
        {
          source: "task",
          code: "SOURCE_TIMEOUT",
          message: "task source timeout",
          severity: "warning",
          recoverable: true,
        },
      ]),
      businessFacts,
      period: PERIOD,
      ownerId: null,
      isWorkspaceWide: true,
    })

    expect(brief.caveats).toContain("business fact caveat")
    expect(brief.caveats).toContain("task source timeout")
  })
})
