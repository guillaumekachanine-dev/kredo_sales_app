import { describe, expect, it } from "vitest"
import { aggregateAgendaSnapshot, buildAgendaQuery } from "./aggregate-agenda-snapshot"

const baseQuery = buildAgendaQuery({
  workspaceId: "ws-1",
  from: "2026-03-23T00:00:00.000Z",
  to: "2026-03-30T00:00:00.000Z",
  now: "2026-03-24T10:00:00.000Z",
  include: {
    missionBoundaries: false,
    opportunityDeadlines: false,
    recruitmentMilestones: false,
    absences: false,
    clientClosures: false,
  },
})

describe("aggregate agenda snapshot", () => {
  it("creates deterministic relation groups for linked event/task pairs", async () => {
    const snapshot = await aggregateAgendaSnapshot(baseQuery, {
      resolvers: {
        scheduledEvents: async (query) => ({
          source: "calendar_event",
          ok: true,
          errors: [],
          items: [
            {
              id: "scheduled_event:calendar_event:evt-1",
              type: "scheduled_event",
              sourceType: "calendar_event",
              sourceId: "evt-1",
              workspaceId: query.workspaceId,
              domain: "agenda",
              title: "Atelier",
              sourceStatus: "scheduled",
              businessStatus: "pending",
              temporalState: "today",
              priority: "normal",
              timebox: {
                kind: "slot",
                startAt: "2026-03-24T09:00:00.000Z",
                endAt: "2026-03-24T10:00:00.000Z",
                timezone: query.timezone,
                allDay: false,
              },
              primaryLink: { module: "agenda", href: "/agenda?eventId=evt-1", label: "Atelier", sourceType: "calendar_event", sourceId: "evt-1" },
              relatedLinks: [],
              uiCapabilities: {
                canOpenPrimary: true,
                canOpenSource: false,
                canEditFromAgenda: true,
                canCreateTask: true,
                canReschedule: true,
                canMarkDone: false,
                canHideForSession: false,
              },
              ownerId: "owner-1",
              ownerLabel: "Alice",
              relatedCalendarEventId: "evt-1",
              relatedTaskId: null,
              relationGroupId: null,
              isDerived: false,
              tags: [],
              eventType: "atelier_client",
            },
          ],
          meta: { fetchedAt: query.now, rowCount: 1, truncated: false, timedOut: false, durationMs: 1 },
        }),
        tasks: async (query) => ({
          source: "task",
          ok: true,
          errors: [],
          items: [
            {
              id: "task:task:task-1",
              type: "task",
              sourceType: "task",
              sourceId: "task-1",
              workspaceId: query.workspaceId,
              domain: "agenda",
              title: "Préparer l’atelier",
              sourceStatus: "open",
              businessStatus: "pending",
              temporalState: "today",
              priority: "high",
              timebox: {
                kind: "deadline",
                at: "2026-03-24T21:59:59.999Z",
                timezone: query.timezone,
                allDay: false,
              },
              primaryLink: { module: "agenda", href: "/agenda?taskId=task-1", label: "Préparer l’atelier", sourceType: "task", sourceId: "task-1" },
              relatedLinks: [],
              uiCapabilities: {
                canOpenPrimary: true,
                canOpenSource: false,
                canEditFromAgenda: false,
                canCreateTask: false,
                canReschedule: false,
                canMarkDone: true,
                canHideForSession: false,
              },
              relatedCalendarEventId: "evt-1",
              relatedTaskId: "task-1",
              relationGroupId: null,
              isDerived: false,
              tags: [],
              taskKind: "linked_to_event",
            },
          ],
          meta: { fetchedAt: query.now, rowCount: 1, truncated: false, timedOut: false, durationMs: 1 },
        }),
      },
    })

    expect(snapshot.relationGroups).toHaveLength(1)
    expect(snapshot.relationGroups[0].id).toBe("group:event-task:evt-1:task-1")
    expect(snapshot.items.find((item) => item.id === "scheduled_event:calendar_event:evt-1")?.relationGroupId).toBe(
      "group:event-task:evt-1:task-1",
    )
    expect(snapshot.items.find((item) => item.id === "task:task:task-1")?.relationGroupId).toBe(
      "group:event-task:evt-1:task-1",
    )
  })

  it("derives owner/owner and event/absence conflicts", async () => {
    const query = buildAgendaQuery({
      workspaceId: "ws-1",
      from: "2026-03-23T00:00:00.000Z",
      to: "2026-03-30T00:00:00.000Z",
      now: "2026-03-24T10:00:00.000Z",
      include: {
        missionBoundaries: false,
        opportunityDeadlines: false,
        recruitmentMilestones: false,
        clientClosures: false,
      },
    })

    const snapshot = await aggregateAgendaSnapshot(query, {
      resolvers: {
        scheduledEvents: async (currentQuery) => ({
          source: "calendar_event",
          ok: true,
          errors: [],
          items: [
            {
              id: "scheduled_event:calendar_event:evt-1",
              type: "scheduled_event",
              sourceType: "calendar_event",
              sourceId: "evt-1",
              workspaceId: currentQuery.workspaceId,
              domain: "agenda",
              title: "Point A",
              sourceStatus: "scheduled",
              businessStatus: "pending",
              temporalState: "today",
              priority: "normal",
              timebox: { kind: "slot", startAt: "2026-03-24T09:00:00.000Z", endAt: "2026-03-24T10:30:00.000Z", timezone: currentQuery.timezone, allDay: false },
              primaryLink: { module: "agenda", href: "/agenda?eventId=evt-1", label: "Point A", sourceType: "calendar_event", sourceId: "evt-1" },
              relatedLinks: [],
              uiCapabilities: { canOpenPrimary: true, canOpenSource: false, canEditFromAgenda: true, canCreateTask: true, canReschedule: true, canMarkDone: false, canHideForSession: false },
              ownerId: "owner-1",
              ownerLabel: "Alice",
              relationGroupId: null,
              isDerived: false,
              tags: [],
              metadata: { relatedCollaboratorId: "col-1" },
              eventType: "atelier_client",
            },
            {
              id: "scheduled_event:calendar_event:evt-2",
              type: "scheduled_event",
              sourceType: "calendar_event",
              sourceId: "evt-2",
              workspaceId: currentQuery.workspaceId,
              domain: "agenda",
              title: "Point B",
              sourceStatus: "scheduled",
              businessStatus: "pending",
              temporalState: "today",
              priority: "normal",
              timebox: { kind: "slot", startAt: "2026-03-24T10:00:00.000Z", endAt: "2026-03-24T11:00:00.000Z", timezone: currentQuery.timezone, allDay: false },
              primaryLink: { module: "agenda", href: "/agenda?eventId=evt-2", label: "Point B", sourceType: "calendar_event", sourceId: "evt-2" },
              relatedLinks: [],
              uiCapabilities: { canOpenPrimary: true, canOpenSource: false, canEditFromAgenda: true, canCreateTask: true, canReschedule: true, canMarkDone: false, canHideForSession: false },
              ownerId: "owner-1",
              ownerLabel: "Alice",
              relationGroupId: null,
              isDerived: false,
              tags: [],
              metadata: { relatedCollaboratorId: "col-1" },
              eventType: "atelier_client",
            },
          ],
          meta: { fetchedAt: currentQuery.now, rowCount: 2, truncated: false, timedOut: false, durationMs: 1 },
        }),
        tasks: async () => ({ source: "task", ok: true, errors: [], items: [], meta: { fetchedAt: new Date().toISOString(), rowCount: 0, truncated: false, timedOut: false, durationMs: 1 } }),
        absences: async (currentQuery) => ({
          source: "collaborator_absence",
          ok: true,
          errors: [],
          items: [
            {
              id: "availability_block:collaborator_absence:abs-1",
              type: "availability_block",
              sourceType: "collaborator_absence",
              sourceId: "abs-1",
              workspaceId: currentQuery.workspaceId,
              domain: "consultants",
              title: "Absence",
              sourceStatus: "conges_payes",
              businessStatus: "in_progress",
              temporalState: "ongoing",
              priority: "high",
              timebox: { kind: "all_day", date: "2026-03-24", timezone: currentQuery.timezone, allDay: true },
              primaryLink: { module: "consultants", href: "/consultants?collaboratorId=col-1", label: "Jean Martin", sourceType: "collaborator_absence", sourceId: "abs-1" },
              relatedLinks: [],
              uiCapabilities: { canOpenPrimary: true, canOpenSource: false, canEditFromAgenda: false, canCreateTask: false, canReschedule: false, canMarkDone: false, canHideForSession: false },
              personId: "col-1",
              personLabel: "Jean Martin",
              relationGroupId: null,
              isDerived: false,
              tags: [],
              blockKind: "absence",
            },
          ],
          meta: { fetchedAt: currentQuery.now, rowCount: 1, truncated: false, timedOut: false, durationMs: 1 },
        }),
      },
    })

    const conflicts = snapshot.items.filter((item) => item.type === "alert" && item.alertKind === "schedule_conflict")
    expect(conflicts).toHaveLength(3)
  })

  it("computes week tension from deterministic thresholds", async () => {
    const query = buildAgendaQuery({
      workspaceId: "ws-1",
      from: "2026-03-23T00:00:00.000Z",
      to: "2026-03-30T00:00:00.000Z",
      now: "2026-03-24T10:00:00.000Z",
      include: {
        scheduledEvents: false,
        missionBoundaries: false,
        opportunityDeadlines: true,
        recruitmentMilestones: false,
        absences: false,
        clientClosures: false,
      },
    })

    const snapshot = await aggregateAgendaSnapshot(query, {
      resolvers: {
        tasks: async (currentQuery) => ({
          source: "task",
          ok: true,
          errors: [],
          items: [1, 2, 3].map((index) => ({
            id: `task:task:overdue-${index}`,
            type: "task",
            sourceType: "task",
            sourceId: `overdue-${index}`,
            workspaceId: currentQuery.workspaceId,
            domain: "agenda",
            title: `Overdue ${index}`,
            sourceStatus: "open",
            businessStatus: "pending",
            temporalState: "overdue",
            priority: "high" as const,
            timebox: { kind: "deadline", at: "2026-03-23T08:00:00.000Z", timezone: currentQuery.timezone, allDay: false },
            primaryLink: { module: "agenda", href: `/agenda?taskId=overdue-${index}`, label: `Overdue ${index}`, sourceType: "task", sourceId: `overdue-${index}` },
            relatedLinks: [],
            uiCapabilities: { canOpenPrimary: true, canOpenSource: false, canEditFromAgenda: false, canCreateTask: false, canReschedule: false, canMarkDone: true, canHideForSession: false },
            relationGroupId: null,
            isDerived: false,
            tags: [],
            taskKind: "standalone" as const,
          })),
          meta: { fetchedAt: currentQuery.now, rowCount: 3, truncated: false, timedOut: false, durationMs: 1 },
        }),
        opportunityDeadlines: async (currentQuery) => ({
          source: "opportunity",
          ok: true,
          errors: [],
          items: [1, 2, 3, 4].map((index) => ({
            id: `deadline:opportunity:opp-${index}:opportunity_target_close`,
            type: "deadline",
            sourceType: "opportunity",
            sourceId: `opp-${index}`,
            workspaceId: currentQuery.workspaceId,
            domain: "commerce",
            title: `Closing ${index}`,
            sourceStatus: "qualification",
            businessStatus: "pending",
            temporalState: "upcoming",
            priority: "high" as const,
            timebox: { kind: "deadline", at: `2026-03-2${index}T21:59:59.999Z`, timezone: currentQuery.timezone, allDay: false },
            primaryLink: { module: "missions", href: `/missions/opps/opp-${index}/edit`, label: `Closing ${index}`, sourceType: "opportunity", sourceId: `opp-${index}` },
            relatedLinks: [],
            uiCapabilities: { canOpenPrimary: true, canOpenSource: false, canEditFromAgenda: false, canCreateTask: true, canReschedule: false, canMarkDone: false, canHideForSession: false },
            relationGroupId: null,
            isDerived: false,
            tags: [],
            deadlineKind: "opportunity_target_close" as const,
          })),
          meta: { fetchedAt: currentQuery.now, rowCount: 4, truncated: false, timedOut: false, durationMs: 1 },
        }),
      },
    })

    expect(snapshot.summary.hasWeekTension).toBe(true)
    expect(snapshot.items.some((item) => item.type === "alert" && item.alertKind === "week_tension")).toBe(true)
  })

  it("returns a partial snapshot when a source times out", async () => {
    const query = buildAgendaQuery({
      workspaceId: "ws-1",
      from: "2026-03-23T00:00:00.000Z",
      to: "2026-03-30T00:00:00.000Z",
      now: "2026-03-24T10:00:00.000Z",
      include: {
        tasks: true,
        scheduledEvents: true,
        missionBoundaries: false,
        opportunityDeadlines: false,
        recruitmentMilestones: false,
        absences: false,
        clientClosures: false,
      },
      limits: {
        sourceTimeoutMs: 50,
      },
    })

    const snapshot = await aggregateAgendaSnapshot(query, {
      resolvers: {
        scheduledEvents: async (_currentQuery, deps) =>
          new Promise((_, reject) => {
            deps.signal?.addEventListener("abort", () => {
              const error = new Error("aborted")
              error.name = "AbortError"
              reject(error)
            })
          }),
        tasks: async (currentQuery) => ({
          source: "task",
          ok: true,
          errors: [],
          items: [
            {
              id: "task:task:survivor",
              type: "task",
              sourceType: "task",
              sourceId: "survivor",
              workspaceId: currentQuery.workspaceId,
              domain: "agenda",
              title: "Still here",
              sourceStatus: "open",
              businessStatus: "pending",
              temporalState: "today",
              priority: "normal",
              timebox: { kind: "deadline", at: "2026-03-24T21:59:59.999Z", timezone: currentQuery.timezone, allDay: false },
              primaryLink: { module: "agenda", href: "/agenda?taskId=survivor", label: "Still here", sourceType: "task", sourceId: "survivor" },
              relatedLinks: [],
              uiCapabilities: { canOpenPrimary: true, canOpenSource: false, canEditFromAgenda: false, canCreateTask: false, canReschedule: false, canMarkDone: true, canHideForSession: false },
              relationGroupId: null,
              isDerived: false,
              tags: [],
              taskKind: "standalone",
            },
          ],
          meta: { fetchedAt: currentQuery.now, rowCount: 1, truncated: false, timedOut: false, durationMs: 1 },
        }),
      },
    })

    expect(snapshot.partial).toBe(true)
    expect(snapshot.items.some((item) => item.id === "task:task:survivor")).toBe(true)
    expect(snapshot.errors.some((error) => error.code === "SOURCE_TIMEOUT")).toBe(true)
  })
})
