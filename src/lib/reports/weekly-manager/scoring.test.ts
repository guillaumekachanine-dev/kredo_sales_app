import { describe, expect, it } from "vitest"
import type { AgendaItem, AgendaDomain, AgendaPriority, AgendaTemporalState } from "@/lib/agenda/agenda-types"
import { buildPriorityItem, scoreAgendaItem, WEEKLY_SCORING_VERSION } from "./scoring"

function buildTaskItem(overrides: {
  domain?: AgendaDomain
  priority?: AgendaPriority
  temporalState?: AgendaTemporalState
} = {}): AgendaItem {
  return {
    id: "task:task:t-1",
    type: "task",
    sourceType: "task",
    sourceId: "t-1",
    workspaceId: "ws-1",
    domain: overrides.domain ?? "agenda",
    title: "Relancer le client",
    businessStatus: "pending",
    temporalState: overrides.temporalState ?? "upcoming",
    priority: overrides.priority ?? "normal",
    timebox: { kind: "deadline", at: "2026-07-08T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
    primaryLink: { module: "agenda", href: "/agenda?taskId=t-1", label: "Relancer le client", sourceType: "task", sourceId: "t-1" },
    relatedLinks: [],
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: false,
      canEditFromAgenda: true,
      canCreateTask: false,
      canReschedule: true,
      canMarkDone: true,
      canHideForSession: false,
    },
    isDerived: false,
    tags: [],
    taskKind: "standalone",
  }
}

function buildAlertItem(overrides: {
  domain?: AgendaDomain
  priority?: AgendaPriority
  temporalState?: AgendaTemporalState
} = {}): AgendaItem {
  return {
    id: "alert:derived:conflict-1",
    type: "alert",
    sourceType: "derived",
    sourceId: "conflict-1",
    workspaceId: "ws-1",
    domain: overrides.domain ?? "agenda",
    title: "Conflit d'agenda",
    businessStatus: "pending",
    temporalState: overrides.temporalState ?? "today",
    priority: overrides.priority ?? "high",
    timebox: { kind: "deadline", at: "2026-07-08T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
    primaryLink: { module: "agenda", href: "/agenda", label: "Conflit d'agenda", sourceType: "calendar_event", sourceId: "conflict-1" },
    relatedLinks: [],
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: false,
      canEditFromAgenda: false,
      canCreateTask: false,
      canReschedule: false,
      canMarkDone: false,
      canHideForSession: true,
    },
    isDerived: true,
    tags: [],
    alertKind: "schedule_conflict",
    relatedItemIds: [],
  }
}

describe("scoreAgendaItem", () => {
  it("classifies an overdue task as critical (rank >= 12)", () => {
    const item = buildTaskItem({ temporalState: "overdue" })
    const scored = scoreAgendaItem(item)
    expect(scored.rank).toBe(14)
    expect(scored.tier).toBe("critical")
  })

  it("classifies a low-priority upcoming task as normal (rank < 7)", () => {
    const item = buildTaskItem({ temporalState: "upcoming", priority: "low" })
    const scored = scoreAgendaItem(item)
    expect(scored.rank).toBe(5)
    expect(scored.tier).toBe("normal")
  })

  it("classifies an upcoming mission-domain item as high (7 <= rank < 12)", () => {
    const item = buildTaskItem({ domain: "missions", temporalState: "upcoming", priority: "normal" })
    const scored = scoreAgendaItem(item)
    expect(scored.rank).toBe(9)
    expect(scored.tier).toBe("high")
  })

  it("adds the schedule_conflict risk weight for alert items", () => {
    const item = buildAlertItem()
    const scored = scoreAgendaItem(item)
    // urgency(today=3)*3 + impact(agenda=1 + high=1)*2 + risk(conflict=3) = 9 + 4 + 3
    expect(scored.rank).toBe(16)
    expect(scored.tier).toBe("critical")
  })

  it("declassifies to normal after 3+ consecutive dismissed weeks", () => {
    const item = buildTaskItem({ temporalState: "overdue" })
    const scored = scoreAgendaItem(item, 3)
    expect(scored.tier).toBe("normal")
    expect(scored.wasDeclassifiedByDismiss).toBe(true)
  })

  it("does not declassify below the 3-week threshold", () => {
    const item = buildTaskItem({ temporalState: "overdue" })
    const scored = scoreAgendaItem(item, 2)
    expect(scored.tier).toBe("critical")
    expect(scored.wasDeclassifiedByDismiss).toBe(false)
  })
})

describe("buildPriorityItem", () => {
  it("stamps the priority item with the current scoring version and rank", () => {
    const item = buildTaskItem({ temporalState: "overdue" })
    const scored = scoreAgendaItem(item)
    const priorityItem = buildPriorityItem(scored, 1)

    expect(priorityItem.rank).toBe(1)
    expect(priorityItem.scoringVersion).toBe(WEEKLY_SCORING_VERSION)
    expect(priorityItem.sourceType).toBe("task")
    expect(priorityItem.sourceId).toBe("t-1")
    expect(priorityItem.tier).toBe("critical")
  })

  it("resolves an entityType/entityId for sources mappable to intelligence entities", () => {
    const missionDeadline: AgendaItem = {
      id: "deadline:mission:m-1:mission_start",
      type: "deadline",
      sourceType: "mission",
      sourceId: "m-1",
      workspaceId: "ws-1",
      domain: "missions",
      title: "Début mission",
      businessStatus: "pending",
      temporalState: "overdue",
      priority: "normal",
      timebox: { kind: "deadline", at: "2026-07-08T09:00:00.000Z", timezone: "Europe/Paris", allDay: false },
      primaryLink: { module: "missions", href: "/missions/m-1", label: "Début mission", sourceType: "mission", sourceId: "m-1" },
      relatedLinks: [],
      uiCapabilities: {
        canOpenPrimary: true,
        canOpenSource: false,
        canEditFromAgenda: false,
        canCreateTask: false,
        canReschedule: false,
        canMarkDone: false,
        canHideForSession: false,
      },
      isDerived: false,
      tags: [],
      deadlineKind: "mission_start",
    }
    const scored = scoreAgendaItem(missionDeadline)
    const priorityItem = buildPriorityItem(scored, 1)

    expect(priorityItem.entityType).toBe("mission")
    expect(priorityItem.entityId).toBe("m-1")
  })

  it("omits entityType/entityId when the source has no intelligence entity mapping (task)", () => {
    const item = buildTaskItem({ temporalState: "overdue" })
    const scored = scoreAgendaItem(item)
    const priorityItem = buildPriorityItem(scored, 1)

    expect(priorityItem.entityType).toBeUndefined()
    expect(priorityItem.entityId).toBeUndefined()
  })
})
