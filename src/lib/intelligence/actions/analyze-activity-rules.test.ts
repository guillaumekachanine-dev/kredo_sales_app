import { describe, expect, it } from "vitest"
import { buildAnalyzeActivity, type BuildAnalyzeActivityInput } from "./analyze-activity-rules"

const baseInput: BuildAnalyzeActivityInput = {
  now: "2026-07-13T08:00:00.000Z",
  ytd: [],
  alerts: [],
  missions: [],
  absences: [],
  collaborators: [],
}

describe("buildAnalyzeActivity", () => {
  it("marks a gap above 10 points as action_needed", () => {
    const result = buildAnalyzeActivity({
      ...baseInput,
      collaborators: [collaborator("c-1")],
      ytd: [ytd("c-1", { activityRateYtd: 65, taciTarget: 80, gapVsTarget: 15 })],
    })

    expect(result.recommendations[0]?.status).toBe("action_needed")
    expect(result.recommendations[0]?.recommendations[0]).toContain("Entretien RH")
  })

  it("marks a gap above 5 points as attention", () => {
    const result = buildAnalyzeActivity({
      ...baseInput,
      collaborators: [collaborator("c-1")],
      ytd: [ytd("c-1", { activityRateYtd: 73, taciTarget: 80, gapVsTarget: 7 })],
    })

    expect(result.recommendations[0]?.status).toBe("attention")
  })

  it("escalates mission ending under 30 days without next mission", () => {
    const result = buildAnalyzeActivity({
      ...baseInput,
      collaborators: [collaborator("c-1")],
      ytd: [ytd("c-1", { activityRateYtd: 80, taciTarget: 80, gapVsTarget: 0 })],
      missions: [{ id: "m-1", collaboratorId: "c-1", title: "Mission", status: "active", startDate: "2026-01-01", endDate: "2026-07-20" }],
    })

    expect(result.recommendations[0]?.status).toBe("action_needed")
    expect(result.recommendations[0]?.recommendations.join(" ")).toContain("staffing")
  })

  it("escalates negative margin to action_needed", () => {
    const result = buildAnalyzeActivity({
      ...baseInput,
      collaborators: [collaborator("c-1")],
      ytd: [ytd("c-1", { ytdRevenue: 100_000, ytdRealMargin: -5_000 })],
    })

    expect(result.recommendations[0]?.status).toBe("action_needed")
    expect(result.recommendations[0]?.indicators.realMarginPct).toBe(-5)
  })

  it("marks planned absences above 5 days as attention", () => {
    const result = buildAnalyzeActivity({
      ...baseInput,
      collaborators: [collaborator("c-1")],
      ytd: [ytd("c-1", {})],
      absences: [{ collaboratorId: "c-1", startDate: "2026-07-15", endDate: "2026-07-22", durationDays: 6 }],
    })

    expect(result.recommendations[0]?.status).toBe("attention")
    expect(result.recommendations[0]?.indicators.plannedAbsenceDaysNext30).toBe(6)
  })

  it("adds alert flags and computes summary counts", () => {
    const result = buildAnalyzeActivity({
      ...baseInput,
      collaborators: [collaborator("c-1"), collaborator("c-2")],
      ytd: [ytd("c-1", { activityRateYtd: 80, taciTarget: 80, gapVsTarget: 0 }), ytd("c-2", { activityRateYtd: 60, taciTarget: 80, gapVsTarget: 20 })],
      alerts: [{ collaboratorId: "c-1", alertLowActivity: false, alertLowMargin: false, alertNegativeMargin: false, alertHighSickDays: true, alertCraNotValidated: false }],
    })

    expect(result.summary.actionNeededCount).toBe(1)
    expect(result.summary.attentionCount).toBe(1)
    expect(result.recommendations.find((item) => item.collaboratorId === "c-1")?.alertFlags).toContain("Absences maladie")
  })
})

function collaborator(id: string): BuildAnalyzeActivityInput["collaborators"][number] {
  return {
    id,
    fullName: id,
    practice: "Data",
    status: "active",
  }
}

function ytd(id: string, overrides: Partial<BuildAnalyzeActivityInput["ytd"][number]>): BuildAnalyzeActivityInput["ytd"][number] {
  return {
    collaboratorId: id,
    fullName: id,
    activityRateYtd: 80,
    taciTarget: 80,
    gapVsTarget: 0,
    ytdRevenue: 100_000,
    ytdRealMargin: 25_000,
    ...overrides,
  }
}
