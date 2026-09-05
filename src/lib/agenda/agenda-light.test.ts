import { describe, expect, it } from "vitest"

import { buildAgendaLight, type AgendaLightEventRow } from "./agenda-light"

const NOW = "2026-09-04T10:00:00.000Z"

function event(overrides: Partial<AgendaLightEventRow> = {}): AgendaLightEventRow {
  return {
    id: "e1",
    title: "RDV Acme",
    eventType: "rdv_prospection",
    status: "confirmed",
    startsAt: "2026-09-04T14:00:00.000Z",
    endsAt: "2026-09-04T15:00:00.000Z",
    allDay: false,
    location: "Paris",
    companyName: "Acme",
    ...overrides,
  }
}

function build(events: AgendaLightEventRow[], horizonDays = 14) {
  return buildAgendaLight({ now: NOW, horizonDays, events })
}

describe("buildAgendaLight", () => {
  it("excludes cancelled events rather than greying them out", () => {
    const result = build([
      event({ id: "kept" }),
      event({ id: "cancelled", status: "cancelled" }),
      event({ id: "annule", status: "Annulé" }),
    ])

    expect(result.days.flatMap((day) => day.events).map((e) => e.id)).toEqual(["kept"])
  })

  // Un rendez-vous commencé mais non terminé est le plus pertinent de tous :
  // le filtrer sur `starts_at >= maintenant` le ferait disparaître pile à ce
  // moment-là.
  it("keeps an event that has started but not ended, and marks it in progress", () => {
    const result = build([
      event({ id: "running", startsAt: "2026-09-04T09:30:00.000Z", endsAt: "2026-09-04T11:00:00.000Z" }),
      event({ id: "over", startsAt: "2026-09-04T08:00:00.000Z", endsAt: "2026-09-04T09:00:00.000Z" }),
    ])

    const events = result.days.flatMap((day) => day.events)
    expect(events.map((e) => e.id)).toEqual(["running"])
    expect(events[0].isInProgress).toBe(true)
  })

  it("drops anything beyond the horizon", () => {
    const result = build([
      event({ id: "inside", startsAt: "2026-09-10T09:00:00.000Z" }),
      event({ id: "outside", startsAt: "2026-10-10T09:00:00.000Z" }),
    ])

    expect(result.days.flatMap((day) => day.events).map((e) => e.id)).toEqual(["inside"])
  })

  it("groups by day, orders chronologically and flags today", () => {
    const result = build([
      event({ id: "tomorrow", startsAt: "2026-09-05T09:00:00.000Z" }),
      event({ id: "today-late", startsAt: "2026-09-04T17:00:00.000Z" }),
      event({ id: "today-early", startsAt: "2026-09-04T14:00:00.000Z" }),
    ])

    expect(result.days).toHaveLength(2)
    expect(result.days[0].isToday).toBe(true)
    expect(result.days[0].events.map((e) => e.id)).toEqual(["today-early", "today-late"])
    expect(result.days[1].isToday).toBe(false)
    expect(result.summary.todayCount).toBe(2)
    expect(result.summary.totalEvents).toBe(3)
    expect(result.summary.nextEventAt).toBe("2026-09-04T14:00:00.000Z")
  })

  it("labels an all-day event without a clock time", () => {
    const result = build([event({ allDay: true })])
    expect(result.days[0].events[0].timeLabel).toBe("Journée")
  })

  it("falls back to a readable label for an unknown event type", () => {
    const result = build([event({ eventType: "type_inconnu_xyz" })])
    expect(result.days[0].events[0].typeLabel).toBe("type inconnu xyz")
    expect(result.days[0].events[0].categoryId).toBeNull()
  })

  it("returns an empty result on an unreadable reference date", () => {
    const result = buildAgendaLight({ now: "pas-une-date", horizonDays: 14, events: [event()] })
    expect(result.days).toEqual([])
    expect(result.summary.totalEvents).toBe(0)
  })
})
