import { describe, expect, it } from "vitest"
import { buildAgendaRelationGroups } from "@/lib/agenda/agenda-selectors"
import {
  createAgendaSourceResult,
  type AgendaDeepLink,
  type AgendaItem,
  type AgendaSnapshot,
} from "@/lib/agenda/agenda-types"
import {
  buildAgendaDesktopPresentation,
  buildAgendaDesktopRange,
  buildAgendaItemDrawerActions,
  parseAgendaDesktopRouteState,
  resolveAgendaDesktopInteraction,
} from "./agenda-desktop-model"

const TIMEZONE = "Europe/Paris"
const NOW = "2026-07-01T08:30:00.000Z"

function deepLink(href: string, label: string, sourceType: AgendaDeepLink["sourceType"], sourceId: string): AgendaDeepLink {
  return {
    href,
    label,
    module: sourceType === "calendar_event" ? "agenda" : sourceType === "task" ? "staffing" : sourceType === "mission" ? "missions" : sourceType === "opportunity" ? "commerce" : sourceType === "candidate_hiring_milestone" ? "recruitment" : "consultants",
    sourceType,
    sourceId,
  }
}

function makeBaseItem(overrides: Partial<AgendaItem> & Pick<AgendaItem, "id" | "type" | "sourceType" | "sourceId" | "title" | "domain" | "timebox">): AgendaItem {
  const { type, ...rest } = overrides
  const base = {
    id: overrides.id,
    sourceId: overrides.sourceId,
    workspaceId: "workspace-1",
    domain: overrides.domain,
    title: overrides.title,
    subtitle: overrides.subtitle ?? null,
    description: overrides.description ?? null,
    sourceStatus: overrides.sourceStatus ?? null,
    businessStatus: overrides.businessStatus ?? "pending",
    temporalState: overrides.temporalState ?? "upcoming",
    priority: overrides.priority ?? "normal",
    timebox: overrides.timebox,
    primaryLink: overrides.primaryLink ?? deepLink(`/source/${overrides.sourceId}`, overrides.title, overrides.sourceType === "derived" ? "task" : overrides.sourceType, overrides.sourceId),
    relatedLinks: overrides.relatedLinks ?? [],
    uiCapabilities: overrides.uiCapabilities ?? {
      canOpenPrimary: true,
      canOpenSource: true,
      canEditFromAgenda: overrides.type === "scheduled_event",
      canCreateTask: false,
      canReschedule: overrides.type === "scheduled_event",
      canMarkDone: false,
      canHideForSession: overrides.type === "alert",
    },
    ownerId: overrides.ownerId ?? "owner-1",
    ownerLabel: overrides.ownerLabel ?? "Alice Martin",
    companyId: overrides.companyId ?? "company-1",
    companyLabel: overrides.companyLabel ?? "Acme",
    personId: overrides.personId ?? null,
    personLabel: overrides.personLabel ?? null,
    relatedCalendarEventId: overrides.relatedCalendarEventId ?? null,
    relatedTaskId: overrides.relatedTaskId ?? null,
    relationGroupId: overrides.relationGroupId ?? null,
    isDerived: overrides.isDerived ?? false,
    tags: overrides.tags ?? [],
    metadata: overrides.metadata ?? {},
  }

  if (type === "scheduled_event") {
    return {
      ...base,
      eventType: "meeting",
      location: null,
      meetingUrl: null,
      ...rest,
      type: "scheduled_event",
      sourceType: "calendar_event",
    } as AgendaItem
  }

  if (type === "task") {
    return {
      ...base,
      taskKind: "standalone",
      taskEntityType: null,
      taskEntityId: null,
      linkedEntityType: null,
      linkedEntityId: null,
      ...rest,
      type: "task",
      sourceType: "task",
    } as AgendaItem
  }

  if (type === "deadline") {
    return {
      ...base,
      deadlineKind: "mission_end",
      ...rest,
      type: "deadline",
    } as AgendaItem
  }

  if (type === "alert") {
    return {
      ...base,
      relatedItemIds: [],
      alertKind: "deadline_at_risk",
      isDerived: true,
      ...rest,
      type: "alert",
      sourceType: "derived",
    } as AgendaItem
  }

  return {
    ...base,
    blockKind: "absence",
    ...rest,
    type: "availability_block",
  } as AgendaItem
}

function makeSnapshot(items: AgendaItem[], partial = false): AgendaSnapshot {
  const relationData = buildAgendaRelationGroups(items)
  return {
    query: {
      workspaceId: "workspace-1",
      now: NOW,
      timezone: TIMEZONE,
      from: "2026-06-29T00:00:00.000Z",
      to: "2026-07-06T00:00:00.000Z",
      limits: {
        maxWindowDays: 62,
        maxRowsCalendarEvents: 300,
        maxRowsPerOtherSource: 200,
        maxOverdueTasks: 50,
        overdueTaskLookbackDays: 30,
        sourceTimeoutMs: 3000,
        maxParallelQueries: 4,
      },
      include: {
        scheduledEvents: true,
        tasks: true,
        missionBoundaries: true,
        opportunityDeadlines: true,
        recruitmentMilestones: true,
        absences: true,
        clientClosures: true,
        derivedAlerts: true,
      },
      filters: {},
    },
    items: relationData.items,
    relationGroups: relationData.relationGroups,
    sourceResults: partial
      ? [
        createAgendaSourceResult("calendar_event"),
        createAgendaSourceResult("task", {
          ok: false,
          errors: [{
            code: "SOURCE_TIMEOUT",
            source: "task",
            message: "task timeout",
            severity: "warning",
            recoverable: true,
          }],
        }),
      ]
      : [createAgendaSourceResult("calendar_event")],
    summary: {
      totalItems: relationData.items.length,
      totalActionable: relationData.items.filter((item) => item.type !== "scheduled_event" && item.type !== "availability_block").length,
      totalOverdue: relationData.items.filter((item) => item.temporalState === "overdue").length,
      totalToday: relationData.items.filter((item) => item.temporalState === "today" || item.temporalState === "ongoing").length,
      totalConflicts: relationData.items.filter((item) => item.type === "alert" && item.alertKind === "schedule_conflict").length,
      hasWeekTension: relationData.items.some((item) => item.type === "alert" && item.alertKind === "week_tension"),
      allDayLaneCount: relationData.items.filter((item) => item.timebox.kind === "all_day" || item.timebox.kind === "all_day_range").length,
    },
    partial,
    errors: partial
      ? [{
        code: "SOURCE_TIMEOUT",
        source: "task",
        message: "task timeout",
        severity: "warning",
        recoverable: true,
      }]
      : [],
    generatedAt: NOW,
  }
}

describe("agenda desktop model", () => {
  it("parses desktop URL params and normalizes month to week", () => {
    const parsed = parseAgendaDesktopRouteState(
      {
        view: "month",
        date: "bad-date",
        domains: "missions,commerce",
        actionable: "true",
      },
      NOW,
      TIMEZONE,
    )

    expect(parsed.route.view).toBe("week")
    expect(parsed.route.date).toBe("2026-07-01")
    expect(parsed.route.filters.domains).toEqual(["missions", "commerce"])
    expect(parsed.route.filters.actionable).toBe(true)
    expect(parsed.shouldRedirect).toBe(true)
    expect(parsed.canonicalQueryString).toBe("view=week&date=2026-07-01&domains=missions%2Ccommerce&actionable=true")
  })

  it("builds day and week visible ranges", () => {
    const dayRange = buildAgendaDesktopRange({
      view: "day",
      date: "2026-07-01",
      filters: { domains: [], types: [], priorities: [], ownerId: null, companyId: null, actionable: false },
    }, TIMEZONE)
    const weekRange = buildAgendaDesktopRange({
      view: "week",
      date: "2026-07-01",
      filters: { domains: [], types: [], priorities: [], ownerId: null, companyId: null, actionable: false },
    }, TIMEZONE)

    expect(dayRange.visibleDays).toEqual(["2026-07-01"])
    expect(weekRange.visibleDays).toEqual([
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ])
  })

  it("separates all-day lane, timed grid, rail, linked tasks and conflicts", () => {
    const slotEvent = makeBaseItem({
      id: "scheduled_event:calendar_event:event-1",
      type: "scheduled_event",
      sourceType: "calendar_event",
      sourceId: "event-1",
      title: "Point client",
      domain: "agenda",
      temporalState: "today",
      timebox: {
        kind: "slot",
        startAt: "2026-07-01T08:30:00.000Z",
        endAt: "2026-07-01T09:30:00.000Z",
        timezone: TIMEZONE,
        allDay: false,
      },
    })
    const allDayEvent = makeBaseItem({
      id: "scheduled_event:calendar_event:event-2",
      type: "scheduled_event",
      sourceType: "calendar_event",
      sourceId: "event-2",
      title: "Kick-off multi-jours",
      domain: "agenda",
      timebox: {
        kind: "all_day_range",
        startDate: "2026-06-30",
        endDate: "2026-07-02",
        timezone: TIMEZONE,
        allDay: true,
      },
    })
    const linkedTask = makeBaseItem({
      id: "task:task:task-1",
      type: "task",
      sourceType: "task",
      sourceId: "task-1",
      title: "Préparer le point client",
      domain: "staffing",
      temporalState: "today",
      relatedCalendarEventId: "event-1",
      taskKind: "linked_to_event",
      timebox: {
        kind: "deadline",
        at: "2026-07-01T07:00:00.000Z",
        timezone: TIMEZONE,
        allDay: false,
      },
    })
    const absence = makeBaseItem({
      id: "availability_block:collaborator_absence:absence-1",
      type: "availability_block",
      sourceType: "collaborator_absence",
      sourceId: "absence-1",
      title: "Congés Alice",
      domain: "consultants",
      timebox: {
        kind: "all_day_range",
        startDate: "2026-07-01",
        endDate: "2026-07-03",
        timezone: TIMEZONE,
        allDay: true,
      },
      blockKind: "absence",
    })
    const deadline = makeBaseItem({
      id: "deadline:mission:mission-1:end",
      type: "deadline",
      sourceType: "mission",
      sourceId: "mission-1",
      title: "Fin de mission Acme",
      domain: "missions",
      temporalState: "upcoming",
      priority: "high",
      timebox: {
        kind: "deadline",
        at: "2026-07-03T16:00:00.000Z",
        timezone: TIMEZONE,
        allDay: false,
      },
    })
    const conflict = makeBaseItem({
      id: "alert:derived:schedule-conflict:1",
      type: "alert",
      sourceType: "derived",
      sourceId: "schedule-conflict:1",
      title: "Conflit de planning",
      domain: "agenda",
      temporalState: "today",
      alertKind: "schedule_conflict",
      relatedItemIds: [slotEvent.id, absence.id],
      timebox: {
        kind: "milestone",
        at: "2026-07-01T08:00:00.000Z",
        timezone: TIMEZONE,
        allDay: false,
      },
    })

    const snapshot = makeSnapshot([slotEvent, allDayEvent, linkedTask, absence, deadline, conflict], true)
    const presentation = buildAgendaDesktopPresentation(snapshot, {
      view: "week",
      date: "2026-07-01",
      filters: { domains: [], types: [], priorities: [], ownerId: null, companyId: null, actionable: false },
    })

    expect(presentation.visibleDays).toHaveLength(5)
    expect(presentation.allDayPlacements.map((placement) => placement.item.id)).toEqual(
      expect.arrayContaining([allDayEvent.id, absence.id]),
    )
    expect(presentation.scheduledColumns[2]?.items).toHaveLength(1)
    expect(presentation.scheduledColumns[2]?.items[0]?.item.id).toBe(slotEvent.id)
    expect(presentation.scheduledColumns[2]?.items[0]?.hasLinkedTask).toBe(true)
    expect(presentation.scheduledColumns[2]?.items[0]?.hasConflict).toBe(true)
    expect(
      presentation.railSections.some((section) =>
        section.items.some((group) => group.kind === "event_task_pair"),
      ),
    ).toBe(true)
    expect(presentation.railSections.find((section) => section.key === "conflicts")?.count).toBe(1)
    expect(presentation.partialErrorSources).toEqual(["task"])
  })

  it("builds a day presentation with one visible column", () => {
    const slotEvent = makeBaseItem({
      id: "scheduled_event:calendar_event:event-day",
      type: "scheduled_event",
      sourceType: "calendar_event",
      sourceId: "event-day",
      title: "Entretien",
      domain: "agenda",
      temporalState: "today",
      timebox: {
        kind: "slot",
        startAt: "2026-07-01T09:00:00.000Z",
        endAt: "2026-07-01T10:00:00.000Z",
        timezone: TIMEZONE,
        allDay: false,
      },
    })

    const presentation = buildAgendaDesktopPresentation(
      makeSnapshot([slotEvent]),
      {
        view: "day",
        date: "2026-07-01",
        filters: { domains: [], types: [], priorities: [], ownerId: null, companyId: null, actionable: false },
      },
    )

    expect(presentation.visibleDays).toHaveLength(1)
    expect(presentation.scheduledColumns).toHaveLength(1)
    expect(presentation.emptyState).toBe("ready")
  })

  it("routes scheduled events to the global drawer and non-events to agenda drawer", () => {
    const scheduledEvent = makeBaseItem({
      id: "scheduled_event:calendar_event:event-open",
      type: "scheduled_event",
      sourceType: "calendar_event",
      sourceId: "event-open",
      title: "Atelier",
      domain: "agenda",
      timebox: {
        kind: "slot",
        startAt: "2026-07-01T10:00:00.000Z",
        endAt: "2026-07-01T11:00:00.000Z",
        timezone: TIMEZONE,
        allDay: false,
      },
    })
    const deadline = makeBaseItem({
      id: "deadline:opportunity:opp-1:next-action",
      type: "deadline",
      sourceType: "opportunity",
      sourceId: "opp-1",
      title: "Relance opportunité",
      domain: "commerce",
      timebox: {
        kind: "deadline",
        at: "2026-07-01T14:00:00.000Z",
        timezone: TIMEZONE,
        allDay: false,
      },
    })

    expect(resolveAgendaDesktopInteraction(scheduledEvent)).toEqual({
      kind: "global_event_drawer",
      eventId: "event-open",
    })
    expect(resolveAgendaDesktopInteraction(deadline)).toEqual({
      kind: "agenda_item_drawer",
      itemId: deadline.id,
    })
  })

  it("does not expose task mutation actions from non-event drawer actions", () => {
    const deadline = makeBaseItem({
      id: "deadline:mission:mission-2:end",
      type: "deadline",
      sourceType: "mission",
      sourceId: "mission-2",
      title: "Fin mission",
      domain: "missions",
      timebox: {
        kind: "deadline",
        at: "2026-07-02T12:00:00.000Z",
        timezone: TIMEZONE,
        allDay: false,
      },
    })

    const actions = buildAgendaItemDrawerActions(deadline)
    expect(actions.map((action) => action.key)).toEqual(["open-primary"])
  })
})
