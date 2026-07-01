import { describe, expect, it } from "vitest"
import {
  computeAgendaTemporalState,
  getAgendaTimeboxDateRange,
  getLocalDateKey,
  isAgendaAllDayLaneItem,
  localDateToDeadlineAt,
  localDateToMilestoneAt,
  startOfLocalDay,
} from "./agenda-temporal"

describe("agenda temporal", () => {
  it("handles Europe/Paris DST boundaries deterministically", () => {
    expect(startOfLocalDay("2026-03-29", "Europe/Paris").toISOString()).toBe("2026-03-28T23:00:00.000Z")
    expect(localDateToDeadlineAt("2026-03-29", "Europe/Paris")).toBe("2026-03-29T21:59:59.999Z")
    expect(localDateToMilestoneAt("2026-03-30", "Europe/Paris")).toBe("2026-03-29T22:00:00.000Z")
    expect(getLocalDateKey("2026-03-29T22:30:00.000Z", "Europe/Paris")).toBe("2026-03-30")
  })

  it("computes temporal states for all AgendaTimebox variants", () => {
    const now = "2026-03-24T10:00:00.000Z"

    expect(
      computeAgendaTemporalState(
        {
          kind: "slot",
          startAt: "2026-03-24T09:00:00.000Z",
          endAt: "2026-03-24T11:00:00.000Z",
          timezone: "Europe/Paris",
          allDay: false,
        },
        now,
        "in_progress",
      ),
    ).toBe("ongoing")

    expect(
      computeAgendaTemporalState(
        {
          kind: "all_day",
          date: "2026-03-24",
          timezone: "Europe/Paris",
          allDay: true,
        },
        now,
        "pending",
      ),
    ).toBe("today")

    expect(
      computeAgendaTemporalState(
        {
          kind: "all_day_range",
          startDate: "2026-03-23",
          endDate: "2026-03-25",
          timezone: "Europe/Paris",
          allDay: true,
        },
        now,
        "in_progress",
      ),
    ).toBe("ongoing")

    expect(
      computeAgendaTemporalState(
        {
          kind: "deadline",
          at: "2026-03-23T20:00:00.000Z",
          timezone: "Europe/Paris",
          allDay: false,
        },
        now,
        "pending",
      ),
    ).toBe("overdue")

    expect(
      computeAgendaTemporalState(
        {
          kind: "milestone",
          at: "2026-03-25T08:00:00.000Z",
          timezone: "Europe/Paris",
          allDay: false,
        },
        now,
        "pending",
      ),
    ).toBe("upcoming")
  })

  it("maps all-day and multi-day ranges correctly for display", () => {
    const allDayRange = getAgendaTimeboxDateRange(
      {
        kind: "all_day_range",
        startDate: "2026-04-01",
        endDate: "2026-04-03",
        timezone: "Europe/Paris",
        allDay: true,
      },
      "Europe/Paris",
    )

    expect(allDayRange).toEqual({ startDate: "2026-04-01", endDate: "2026-04-03" })

    expect(
      isAgendaAllDayLaneItem(
        {
          id: "event:multi-day",
          type: "scheduled_event",
          sourceType: "calendar_event",
          sourceId: "evt-1",
          workspaceId: "ws-1",
          domain: "agenda",
          title: "Multi-day trip",
          sourceStatus: "scheduled",
          businessStatus: "pending",
          temporalState: "upcoming",
          priority: "normal",
          timebox: {
            kind: "slot",
            startAt: "2026-04-01T07:00:00.000Z",
            endAt: "2026-04-02T08:00:00.000Z",
            timezone: "Europe/Paris",
            allDay: false,
          },
          primaryLink: {
            module: "agenda",
            href: "/agenda?eventId=evt-1",
            label: "Multi-day trip",
            sourceType: "calendar_event",
            sourceId: "evt-1",
          },
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
          isDerived: false,
          tags: [],
          eventType: "rdv_client_suivi",
        },
        "Europe/Paris",
      ),
    ).toBe(true)
  })
})
