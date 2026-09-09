import { describe, expect, it } from "vitest"
import {
  buildOpportunityDeadlines,
  DEADLINE_SOURCE_PRIORITY,
} from "../build-opportunity-deadlines"
import type {
  RawDeadlineCalendarEvent,
  RawDeadlineOpportunity,
} from "../opportunity-deadline.types"

const REF = new Date("2026-09-09T00:00:00.000Z")

function opp(overrides: Partial<RawDeadlineOpportunity> = {}): RawDeadlineOpportunity {
  return {
    id: "o1",
    title: "Opp 1",
    stage: "qualification",
    company_name: "ACME",
    next_action_at: null,
    next_action_label: null,
    target_close_date: null,
    ...overrides,
  }
}

function ev(overrides: Partial<RawDeadlineCalendarEvent> = {}): RawDeadlineCalendarEvent {
  return {
    opportunity_id: "o1",
    event_type: "rdv_client_suivi",
    status: "scheduled",
    starts_at: "2026-09-15T08:00:00.000Z",
    ...overrides,
  }
}

describe("buildOpportunityDeadlines — arbitrage DATA-03 / OPP-28", () => {
  it("priorise next_action_at futur sur agenda et closing", () => {
    const [deadline] = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [
        opp({
          next_action_at: "2026-09-20T09:00:00Z",
          next_action_label: "Relance DAF",
          target_close_date: "2026-09-12",
        }),
      ],
      calendarEvents: [ev({ starts_at: "2026-09-11T08:00:00Z" })],
    })
    expect(deadline).toMatchObject({
      opportunityId: "o1",
      opportunityTitle: "Opp 1",
      client: "ACME",
      source: "next_action",
      label: "Relance DAF",
      dueAt: "2026-09-20T09:00:00Z",
      calendarEventType: null,
    })
  })

  it("retombe sur le prochain évènement d'agenda quand next_action_at manque ou est passé", () => {
    const [deadline] = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [opp({ next_action_at: "2026-01-01T09:00:00Z", target_close_date: "2026-12-01" })],
      calendarEvents: [
        ev({ starts_at: "2026-09-30T08:00:00Z", event_type: "soutenance" }),
        ev({ starts_at: "2026-09-18T08:00:00Z", event_type: "rdv_client_suivi" }),
      ],
    })
    expect(deadline).toMatchObject({
      source: "calendar_event",
      label: "RDV suivi client",
      calendarEventType: "rdv_client_suivi",
      dueAt: "2026-09-18T08:00:00Z",
    })
  })

  it("retombe sur target_close_date quand ni next_action_at ni agenda futur", () => {
    const [deadline] = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [opp({ target_close_date: "2026-10-15" })],
      calendarEvents: [ev({ starts_at: "2026-08-01T08:00:00Z" })],
    })
    expect(deadline).toMatchObject({ source: "target_close", label: "Date de closing visée", dueAt: "2026-10-15" })
  })

  it("ignore les évènements annulés et ceux d'une autre opportunité", () => {
    const deadlines = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [opp({ id: "o1" })],
      calendarEvents: [
        ev({ opportunity_id: "o1", status: "cancelled", starts_at: "2026-09-10T08:00:00Z" }),
        ev({ opportunity_id: "o2", status: "scheduled", starts_at: "2026-09-11T08:00:00Z" }),
      ],
    })
    expect(deadlines).toEqual([])
  })

  it("exclut les opportunités à étape terminale", () => {
    const deadlines = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [
        opp({ id: "won", stage: "gagne", next_action_at: "2026-09-20T09:00:00Z" }),
        opp({ id: "lost", stage: "perdu", target_close_date: "2026-09-20" }),
        opp({ id: "untreated", stage: "non_traitee", next_action_at: "2026-09-20T09:00:00Z" }),
      ],
      calendarEvents: [],
    })
    expect(deadlines).toEqual([])
  })

  it("n'émet aucune échéance quand toutes les dates sont passées ou absentes", () => {
    const deadlines = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [
        opp({ id: "a", next_action_at: "2026-01-01T00:00:00Z", target_close_date: "2026-01-05" }),
        opp({ id: "b" }),
      ],
      calendarEvents: [],
    })
    expect(deadlines).toEqual([])
  })

  it("le jour de référence est inclus (>= minuit UTC)", () => {
    const [deadline] = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [opp({ target_close_date: "2026-09-09" })],
      calendarEvents: [],
    })
    expect(deadline?.source).toBe("target_close")
  })

  it("trie par dueAt ASC puis par titre", () => {
    const deadlines = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [
        opp({ id: "late", title: "Zeta", next_action_at: "2026-10-01T09:00:00Z" }),
        opp({ id: "early-b", title: "Bravo", next_action_at: "2026-09-15T09:00:00Z" }),
        opp({ id: "early-a", title: "Alpha", next_action_at: "2026-09-15T09:00:00Z" }),
      ],
      calendarEvents: [],
    })
    expect(deadlines.map((d) => d.opportunityId)).toEqual(["early-a", "early-b", "late"])
  })

  it("libellé d'évènement inconnu = event_type brut ; next_action sans libellé = « Prochaine action »", () => {
    const [withRawType] = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [opp({ id: "o1" })],
      calendarEvents: [ev({ event_type: "type_inconnu_x" })],
    })
    expect(withRawType).toMatchObject({ label: "type_inconnu_x", calendarEventType: "type_inconnu_x" })

    const [withDefault] = buildOpportunityDeadlines({
      referenceDate: REF,
      opportunities: [opp({ id: "o1", next_action_at: "2026-09-20T09:00:00Z", next_action_label: "   " })],
      calendarEvents: [],
    })
    expect(withDefault.label).toBe("Prochaine action")
  })

  it("expose une priorité de source stable", () => {
    expect(DEADLINE_SOURCE_PRIORITY.next_action).toBeLessThan(DEADLINE_SOURCE_PRIORITY.calendar_event)
    expect(DEADLINE_SOURCE_PRIORITY.calendar_event).toBeLessThan(DEADLINE_SOURCE_PRIORITY.target_close)
  })
})
