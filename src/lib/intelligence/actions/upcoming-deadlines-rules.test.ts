import { describe, expect, it } from "vitest"

import {
  LONG_ABSENCE_MIN_DAYS,
  buildUpcomingDeadlines,
  resolveHorizon,
  type BuildUpcomingDeadlinesInput,
} from "./upcoming-deadlines-rules"

const NOW = "2026-09-02T09:00:00.000Z"

function input(overrides: Partial<BuildUpcomingDeadlinesInput> = {}): BuildUpcomingDeadlinesInput {
  return { now: NOW, missions: [], opportunities: [], absences: [], closures: [], ...overrides }
}

function mission(overrides: Partial<BuildUpcomingDeadlinesInput["missions"][number]> = {}) {
  return {
    id: "m1",
    title: "Data Engineer",
    status: "active",
    endDate: "2026-09-20",
    companyId: "c1",
    companyName: "Acme",
    collaboratorName: "Alice Martin",
    lastMonthRevenueEur: 12_000,
    ...overrides,
  }
}

describe("resolveHorizon", () => {
  it("splits the window into disjoint bands", () => {
    expect(resolveHorizon(-1)).toBe("overdue")
    expect(resolveHorizon(0)).toBe("d30")
    expect(resolveHorizon(30)).toBe("d30")
    expect(resolveHorizon(31)).toBe("d60")
    expect(resolveHorizon(60)).toBe("d60")
    expect(resolveHorizon(61)).toBe("d90")
    expect(resolveHorizon(90)).toBe("d90")
  })

  it("drops anything beyond the window or unreadable", () => {
    expect(resolveHorizon(91)).toBeNull()
    expect(resolveHorizon(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe("buildUpcomingDeadlines", () => {
  it("never invents a revenue figure when no CRA backs it", () => {
    const result = buildUpcomingDeadlines(input({
      missions: [mission({ lastMonthRevenueEur: null })],
    }))

    expect(result.deadlines[0].amountEur).toBeNull()
    expect(result.deadlines[0].detail).toContain("CA mensuel inconnu")
    expect(result.totals.revenueAtRiskEur).toBe(0)
  })

  it("ignores missions that are no longer active", () => {
    const result = buildUpcomingDeadlines(input({
      missions: [mission({ status: "ended" }), mission({ id: "m2", status: "active" })],
    }))

    expect(result.deadlines.map((deadline) => deadline.id)).toEqual(["mission_end:m2"])
  })

  it("treats an imminent mission end and an overdue closing as critical", () => {
    const result = buildUpcomingDeadlines(input({
      missions: [mission({ endDate: "2026-09-10" })],
      opportunities: [{
        id: "o1",
        title: "Refonte SI",
        stage: "negociation",
        targetCloseDate: "2026-08-20",
        companyName: "Globex",
        weightedGain: 40_000,
      }],
    }))

    const byId = Object.fromEntries(result.deadlines.map((deadline) => [deadline.id, deadline]))
    expect(byId["mission_end:m1"].severity).toBe("critical")
    expect(byId["opportunity_close:o1"].severity).toBe("critical")
    expect(byId["opportunity_close:o1"].horizon).toBe("overdue")
    expect(byId["opportunity_close:o1"].title).toContain("Closing dépassé")
  })

  it("keeps short absences out and long ones in", () => {
    const result = buildUpcomingDeadlines(input({
      absences: [
        { id: "a-short", collaboratorName: "Bob", absenceType: "rtt", startDate: "2026-09-10", durationDays: LONG_ABSENCE_MIN_DAYS - 1 },
        { id: "a-long", collaboratorName: "Bob", absenceType: "conge_paye", startDate: "2026-09-10", durationDays: 10 },
      ],
    }))

    expect(result.deadlines.map((deadline) => deadline.id)).toEqual(["long_absence:a-long"])
    expect(result.totals.unavailabilityDays).toBe(10)
  })

  it("counts a client closure in inclusive days", () => {
    const result = buildUpcomingDeadlines(input({
      closures: [{ id: "cl1", label: "Fermeture août", companyName: "Acme", startDate: "2026-09-10", endDate: "2026-09-12" }],
    }))

    expect(result.deadlines[0].impactDays).toBe(3)
  })

  // Le cumul 90 jours doit être dérivé des tranches, jamais additionné à part :
  // sans quoi une tranche qui change de définition fait diverger le total.
  it("derives totals from disjoint bands", () => {
    const result = buildUpcomingDeadlines(input({
      missions: [
        mission({ id: "m30", endDate: "2026-09-20", lastMonthRevenueEur: 10_000 }),
        mission({ id: "m60", endDate: "2026-10-20", lastMonthRevenueEur: 5_000 }),
        mission({ id: "m120", endDate: "2027-01-20", lastMonthRevenueEur: 99_000 }),
      ],
    }))

    expect(result.deadlines.map((deadline) => deadline.id)).toEqual(["mission_end:m30", "mission_end:m60"])
    expect(result.totals.revenueAtRiskEur).toBe(15_000)
    expect(result.totals.missionsEndingCount).toBe(2)

    const byHorizon = Object.fromEntries(result.horizons.map((horizon) => [horizon.horizon, horizon]))
    expect(byHorizon.d30.revenueAtRiskEur).toBe(10_000)
    expect(byHorizon.d60.revenueAtRiskEur).toBe(5_000)
    expect(byHorizon.d90.count).toBe(0)
  })

  it("orders by horizon, then severity, then proximity", () => {
    const result = buildUpcomingDeadlines(input({
      missions: [mission({ id: "late", endDate: "2026-10-15" })],
      absences: [{ id: "soon", collaboratorName: "Bob", absenceType: "conge_paye", startDate: "2026-09-05", durationDays: 7 }],
      opportunities: [{
        id: "urgent", title: "Deal", stage: "negociation", targetCloseDate: "2026-09-08", companyName: "Acme", weightedGain: 1_000,
      }],
    }))

    expect(result.deadlines.map((deadline) => deadline.id)).toEqual([
      "opportunity_close:urgent",
      "long_absence:soon",
      "mission_end:late",
    ])
  })
})
