import { describe, expect, it } from "vitest"
import { businessDaysForMonth, computeMonthlyForecast, type ComputeMonthlyForecastInput } from "./forecast-revenue-rules"
import { countFrenchBusinessDays } from "./french-business-days"

const baseInput: ComputeMonthlyForecastInput = {
  now: "2026-07-13T08:00:00.000Z",
  missions: [],
  opportunities: [],
  absences: [],
  clientClosures: [],
  pnlMonths: [],
}

describe("computeMonthlyForecast", () => {
  it("projects nominal mission revenue and weighted pipe", () => {
    const result = computeMonthlyForecast({
      ...baseInput,
      missions: [mission({ tjm: 1000, startDate: "2026-01-01", endDate: "2026-12-31" })],
      opportunities: [
        opportunity({
          weightedGain: 20_000,
          estimatedGain: 30_000,
          durationDays: 20,
          nextActionAt: "2026-07-12T00:00:00.000Z",
        }),
      ],
    })

    const august = result.months[0]

    expect(august.month).toBe("2026-08")
    expect(august.missionContribution).toBe(businessDaysForMonth("2026-08") * 1000)
    expect(august.pipeContribution).toBeGreaterThan(0)
    expect(august.realistic).toBe(august.missionContribution + august.pipeContribution)
    expect(august.optimistic).toBeGreaterThan(august.realistic)
  })

  it("prorates a mission ending in the middle of the month", () => {
    const result = computeMonthlyForecast({
      ...baseInput,
      missions: [mission({ tjm: 800, startDate: "2026-01-01", endDate: "2026-08-14" })],
    })

    expect(result.months[0].missionContribution).toBe(countFrenchBusinessDays("2026-08-01", "2026-08-14") * 800)
  })

  it("subtracts collaborator absences that overlap the projection month", () => {
    const result = computeMonthlyForecast({
      ...baseInput,
      missions: [mission({ tjm: 900, startDate: "2026-01-01", endDate: "2026-12-31", collaboratorId: "col-1" })],
      absences: [{ collaboratorId: "col-1", startDate: "2026-08-10", endDate: "2026-08-14" }],
    })

    const fullMonth = businessDaysForMonth("2026-08")
    const absenceDays = countFrenchBusinessDays("2026-08-10", "2026-08-14")

    expect(result.months[0].missionContribution).toBe((fullMonth - absenceDays) * 900)
  })

  it("keeps realistic equal to pessimistic when the pipeline is empty", () => {
    const result = computeMonthlyForecast({
      ...baseInput,
      missions: [mission({ tjm: 1000, startDate: "2026-01-01", endDate: "2026-12-31" })],
      opportunities: [],
    })

    expect(result.months.every((month) => month.pipeContribution === 0)).toBe(true)
    expect(result.months.every((month) => month.realistic === month.pessimistic)).toBe(true)
  })

  it("subtracts client closures from mission billing days", () => {
    const result = computeMonthlyForecast({
      ...baseInput,
      missions: [mission({ tjm: 700, startDate: "2026-01-01", endDate: "2026-12-31", companyId: "client-1" })],
      clientClosures: [{ companyId: "client-1", startDate: "2026-08-17", endDate: "2026-08-21" }],
    })

    const expectedDays = businessDaysForMonth("2026-08") - countFrenchBusinessDays("2026-08-17", "2026-08-21")
    expect(result.months[0].missionContribution).toBe(expectedDays * 700)
  })

  it("uses P&L months to classify revenue trend", () => {
    const result = computeMonthlyForecast({
      ...baseInput,
      pnlMonths: [
        { periodMonth: "2026-04-01", revenueTotal: 100_000 },
        { periodMonth: "2026-05-01", revenueTotal: 105_000 },
        { periodMonth: "2026-06-01", revenueTotal: 120_000 },
      ],
    })

    expect(result.summary.trend).toBe("growing")
  })

  it("builds client breakdown matrix for top 7 clients and groups remainder in Autres", () => {
    const companies = Array.from({ length: 9 }, (_, i) => ({
      id: `c-${i + 1}`,
      name: `Client ${i + 1}`,
    }))

    const missions = companies.map((c, i) =>
      mission({
        id: `m-${i + 1}`,
        companyId: c.id,
        tjm: (10 - i) * 100, // Client 1 gets highest TJM, Client 9 lowest
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      }),
    )

    const result = computeMonthlyForecast({
      ...baseInput,
      companies,
      missions,
    })

    // Should have top 7 + 1 Autres row = 8 rows total
    expect(result.clientBreakdown.length).toBe(8)
    expect(result.clientBreakdown[0].companyName).toBe("Client 1")
    expect(result.clientBreakdown[6].companyName).toBe("Client 7")
    expect(result.clientBreakdown[7].companyName).toBe("Autres")
    expect(result.clientBreakdown[7].companyId).toBe("autres")
    expect(result.clientBreakdown[7].total).toBeGreaterThan(0)
  })
})

function mission(overrides: Partial<ComputeMonthlyForecastInput["missions"][number]>): ComputeMonthlyForecastInput["missions"][number] {
  return {
    id: "mission-1",
    title: "Mission",
    status: "active",
    tjm: 1000,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    collaboratorId: "col",
    companyId: "client",
    ...overrides,
  }
}

function opportunity(overrides: Partial<ComputeMonthlyForecastInput["opportunities"][number]>): ComputeMonthlyForecastInput["opportunities"][number] {
  return {
    id: "opp-1",
    title: "Opportunity",
    stage: "qualification",
    weightedGain: 0,
    estimatedGain: 0,
    durationDays: 20,
    nextActionAt: "2026-07-13T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}
