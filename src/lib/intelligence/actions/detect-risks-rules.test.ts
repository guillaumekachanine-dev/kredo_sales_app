import { describe, expect, it } from "vitest"
import { buildDetectRisks, computeRevenueConcentration, type BuildDetectRisksInput } from "./detect-risks-rules"

const baseInput: BuildDetectRisksInput = {
  now: "2026-07-13T08:00:00.000Z",
  alerts: [],
  missions: [],
  activityReports: [],
}

describe("buildDetectRisks", () => {
  it("creates a critical risk for negative margin", () => {
    const result = buildDetectRisks({
      ...baseInput,
      alerts: [alert({ collaboratorId: "c-1", alertNegativeMargin: true })],
    })

    expect(result.risks[0]?.severity).toBe("critical")
    expect(result.risks[0]?.category).toBe("margin")
  })

  it("creates warnings for low margin and low activity", () => {
    const result = buildDetectRisks({
      ...baseInput,
      alerts: [alert({ collaboratorId: "c-1", alertLowMargin: true, alertLowActivity: true })],
    })

    expect(result.risks.filter((risk) => risk.severity === "warning")).toHaveLength(2)
  })

  it("detects draft CRA as billing warning", () => {
    const result = buildDetectRisks({
      ...baseInput,
      missions: [mission("m-1", "2026-12-31")],
      activityReports: [{ id: "r-1", missionId: "m-1", periodStart: "2026-07-01", status: "draft", billableDays: 10, tjmSnapshot: 700 }],
    })

    expect(result.risks.some((risk) => risk.category === "billing")).toBe(true)
  })

  it("marks mission ending under 30 days as critical", () => {
    const result = buildDetectRisks({
      ...baseInput,
      missions: [mission("m-1", "2026-07-25")],
    })

    expect(result.risks[0]?.severity).toBe("critical")
    expect(result.risks[0]?.title).toContain("30")
  })

  it("marks mission ending under 60 days as info", () => {
    const result = buildDetectRisks({
      ...baseInput,
      missions: [mission("m-1", "2026-08-25")],
    })

    expect(result.risks[0]?.severity).toBe("info")
  })

  it("detects revenue concentration above 40 percent", () => {
    const result = buildDetectRisks({
      ...baseInput,
      missions: [mission("m-1", "2026-12-31", "big"), mission("m-2", "2026-12-31", "small")],
      activityReports: [
        { id: "r-1", missionId: "m-1", periodStart: "2026-07-01", status: "validated", billableDays: 20, tjmSnapshot: 1000 },
        { id: "r-2", missionId: "m-2", periodStart: "2026-07-01", status: "validated", billableDays: 5, tjmSnapshot: 1000 },
      ],
    })

    expect(result.risks.some((risk) => risk.id === "revenue-concentration:big")).toBe(true)
  })
})

describe("computeRevenueConcentration", () => {
  it("returns shares sorted by descending revenue", () => {
    const rows = computeRevenueConcentration(
      [
        { id: "r-1", missionId: "m-1", periodStart: "2026-07-01", status: "validated", billableDays: 10, tjmSnapshot: 1000 },
        { id: "r-2", missionId: "m-2", periodStart: "2026-07-01", status: "validated", billableDays: 5, tjmSnapshot: 1000 },
      ],
      [mission("m-1", "2026-12-31", "a"), mission("m-2", "2026-12-31", "b")],
    )

    expect(rows[0]?.companyId).toBe("a")
    expect(Math.round((rows[0]?.share ?? 0) * 100)).toBe(67)
  })
})

function alert(overrides: Partial<BuildDetectRisksInput["alerts"][number]>): BuildDetectRisksInput["alerts"][number] {
  return {
    collaboratorId: "col",
    fullName: "Grace Hopper",
    periodStart: "2026-07-01",
    activityRatePercent: 60,
    realMarginPct: 10,
    alertLowActivity: false,
    alertLowMargin: false,
    alertNegativeMargin: false,
    alertHighSickDays: false,
    ...overrides,
  }
}

function mission(id: string, endDate: string, companyId = "client"): BuildDetectRisksInput["missions"][number] {
  return {
    id,
    title: id,
    status: "active",
    endDate,
    companyId,
    companyName: companyId,
  }
}
