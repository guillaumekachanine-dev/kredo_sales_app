import { describe, expect, it } from "vitest"
import { buildPrepareDay, type BuildPrepareDayInput } from "./prepare-day-rules"

const baseInput: BuildPrepareDayInput = {
  now: "2026-07-13T08:00:00.000Z",
  timezone: "Europe/Paris",
  events: [],
  tasks: [],
  interactions: [],
}

describe("buildPrepareDay", () => {
  it("filters events on the Europe/Paris local day", () => {
    const result = buildPrepareDay({
      ...baseInput,
      events: [
        event("late-utc", "2026-07-12T22:30:00.000Z"),
        event("previous", "2026-07-12T20:30:00.000Z"),
      ],
    })

    expect(result.events.map((item) => item.id)).toEqual(["late-utc"])
  })

  it("marks company events with fresh interaction as ready", () => {
    const result = buildPrepareDay({
      ...baseInput,
      events: [event("e-1", "2026-07-13T09:00:00.000Z", { companyId: "c-1", companyName: "Client" })],
      interactions: [{ companyId: "c-1", occurredAt: "2026-07-12T09:00:00.000Z" }],
    })

    expect(result.events[0]?.preparedness).toBe("ready")
    expect(result.events[0]?.context.lastInteractionDaysAgo).toBe(0)
  })

  it("marks stale company events as needs_prep", () => {
    const result = buildPrepareDay({
      ...baseInput,
      events: [event("e-1", "2026-07-13T09:00:00.000Z", { companyId: "c-1", companyName: "Client" })],
      interactions: [{ companyId: "c-1", occurredAt: "2026-07-01T09:00:00.000Z" }],
    })

    expect(result.events[0]?.preparedness).toBe("needs_prep")
  })

  it("marks internal events without company or candidate as no_context", () => {
    const result = buildPrepareDay({
      ...baseInput,
      events: [event("internal", "2026-07-13T09:00:00.000Z")],
    })

    expect(result.events[0]?.preparedness).toBe("no_context")
  })

  it("returns due and overdue tasks without done tasks", () => {
    const result = buildPrepareDay({
      ...baseInput,
      tasks: [
        task("t-1", "2026-07-12", "open"),
        task("t-2", "2026-07-13", "open"),
        task("t-3", "2026-07-12", "done"),
      ],
    })

    expect(result.tasksDue).toHaveLength(2)
    expect(result.tasksDue[0]?.isOverdue).toBe(true)
  })

  it("derives opportunity and mission alerts from due tasks", () => {
    const result = buildPrepareDay({
      ...baseInput,
      tasks: [
        { ...task("opp", "2026-07-13", "open"), entityType: "opportunity", entityId: "opp-1" },
        { ...task("mission", "2026-07-13", "open"), entityType: "mission", entityId: "m-1" },
      ],
    })

    expect(result.alerts.map((alert) => alert.type)).toEqual(["opp_deadline", "mission_ending"])
  })
})

function event(
  id: string,
  startsAt: string,
  overrides: Partial<BuildPrepareDayInput["events"][number]> = {},
): BuildPrepareDayInput["events"][number] {
  return {
    id,
    title: id,
    startsAt,
    endsAt: null,
    eventType: "rdv_client",
    companyId: null,
    companyName: null,
    companyLifecycle: null,
    contactName: null,
    contactRole: null,
    candidateId: null,
    candidateName: null,
    candidateStep: null,
    opportunityId: null,
    opportunityTitle: null,
    ...overrides,
  }
}

function task(id: string, dueDate: string, status: string): BuildPrepareDayInput["tasks"][number] {
  return {
    id,
    title: id,
    priority: "normal",
    status,
    dueDate,
    entityType: null,
    entityId: null,
    linkedEntityType: null,
    linkedEntityId: null,
  }
}
