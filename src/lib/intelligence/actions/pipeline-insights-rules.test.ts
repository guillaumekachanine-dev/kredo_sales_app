import { describe, expect, it } from "vitest"
import { buildPipelineInsights, type BuildPipelineInsightsInput } from "./pipeline-insights-rules"

const baseInput: BuildPipelineInsightsInput = {
  now: "2026-07-13T08:00:00.000Z",
  opportunities: [],
  interactions: [],
  pnlMonths: [],
}

describe("buildPipelineInsights", () => {
  it("detects stagnating opportunities updated more than 30 days ago", () => {
    const result = buildPipelineInsights({
      ...baseInput,
      opportunities: [opportunity({ updatedAt: "2026-06-01T00:00:00.000Z" })],
    })

    expect(result.insights.some((insight) => insight.type === "stagnation")).toBe(true)
  })

  it("detects concentration when top three clients exceed 60 percent of weighted pipe", () => {
    const result = buildPipelineInsights({
      ...baseInput,
      opportunities: [
        opportunity({ id: "o-1", companyId: "a", weightedGain: 60_000 }),
        opportunity({ id: "o-2", companyId: "b", weightedGain: 20_000 }),
        opportunity({ id: "o-3", companyId: "c", weightedGain: 10_000 }),
        opportunity({ id: "o-4", companyId: "d", weightedGain: 10_000 }),
      ],
    })

    expect(result.insights.some((insight) => insight.type === "concentration")).toBe(true)
  })

  it("computes stage distribution from open opportunities only", () => {
    const result = buildPipelineInsights({
      ...baseInput,
      opportunities: [
        opportunity({ id: "o-1", stage: "qualification", weightedGain: 10_000 }),
        opportunity({ id: "o-2", stage: "gagne", weightedGain: 40_000 }),
      ],
    })

    expect(result.weightedPipe).toBe(10_000)
    expect(result.stageDistribution.find((stage) => stage.stage === "qualification")?.weightedTotal).toBe(10_000)
  })

  it("reports positive momentum when interactions are recent", () => {
    const result = buildPipelineInsights({
      ...baseInput,
      opportunities: [opportunity({})],
      interactions: [{ id: "i-1", opportunityId: "o-1", companyId: "client", occurredAt: "2026-07-10T00:00:00.000Z" }],
    })

    expect(result.insights.find((insight) => insight.type === "momentum")?.severity).toBe("positive")
  })

  it("returns revenue delta from the last two P&L months", () => {
    const result = buildPipelineInsights({
      ...baseInput,
      pnlMonths: [
        { periodMonth: "2026-05-01", revenueTotal: 90_000 },
        { periodMonth: "2026-06-01", revenueTotal: 100_000 },
      ],
    })

    expect(result.weightedPipeDelta).toBe(10_000)
    expect(result.weightedPipeDeltaTone).toBe("positive")
  })
})

function opportunity(overrides: Partial<BuildPipelineInsightsInput["opportunities"][number]>): BuildPipelineInsightsInput["opportunities"][number] {
  return {
    id: "o-1",
    title: "Opportunity",
    stage: "qualification",
    companyId: "client",
    companyName: "Client",
    weightedGain: 10_000,
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}
