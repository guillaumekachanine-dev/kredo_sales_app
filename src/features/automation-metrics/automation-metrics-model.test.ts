import { describe, expect, it } from "vitest"
import {
  buildAutomationMetricsSnapshot,
  buildAutomationTimeline,
  buildWorkflowPerformance,
  buildWorkflowReliability,
  compareAutomationSummaries,
  getAutomationMetricsGrain,
  percentileNearestRank,
  percentile95,
  sortWorkflowPerformance,
  sortWorkflowReliability,
  summarizeAutomationRuns,
} from "./automation-metrics-model"
import type { AutomationMetricsFilters, AutomationMetricsRun, AutomationWorkflowPerformance, AutomationWorkflowReliability } from "./automation-metrics-types"

const filters: AutomationMetricsFilters = {
  from: "2026-01-10T00:00:00.000Z",
  to: "2026-01-17T00:00:00.000Z",
  preset: "7d",
  workflow: "all",
}

function run(overrides: Partial<AutomationMetricsRun>): AutomationMetricsRun {
  return {
    id: overrides.id ?? "run",
    runType: overrides.runType ?? "intel-010-refresh",
    status: overrides.status ?? "succeeded",
    createdAt: overrides.createdAt ?? "2026-01-10T12:00:00.000Z",
    durationMs: overrides.durationMs === undefined ? 120 : overrides.durationMs,
    costEstimate: overrides.costEstimate === undefined ? 0.1 : overrides.costEstimate,
  }
}

describe("automation metrics transformations", () => {
  it("aggregates successful and failed runs daily without inventing runs", () => {
    const timeline = buildAutomationTimeline([
      run({ id: "a", createdAt: "2026-01-10T08:00:00.000Z", status: "succeeded" }),
      run({ id: "b", createdAt: "2026-01-10T16:00:00.000Z", status: "failed" }),
      run({ id: "c", createdAt: "2026-01-12T10:00:00.000Z", status: "succeeded" }),
    ], filters.from, filters.to, "day")

    expect(timeline).toHaveLength(7)
    expect(timeline[0]).toMatchObject({ key: "2026-01-10", succeeded: 1, failed: 1, successRatePct: 50 })
    expect(timeline[1]).toMatchObject({ succeeded: 0, failed: 0, successRatePct: null })
    expect(timeline[2]).toMatchObject({ succeeded: 1, failed: 0, successRatePct: 100 })
  })

  it("aggregates calendar weeks from Monday", () => {
    const timeline = buildAutomationTimeline([
      run({ id: "a", createdAt: "2026-01-12T08:00:00.000Z", status: "succeeded" }),
      run({ id: "b", createdAt: "2026-01-18T20:00:00.000Z", status: "failed" }),
      run({ id: "c", createdAt: "2026-01-19T08:00:00.000Z", status: "succeeded" }),
    ], "2026-01-12T00:00:00.000Z", "2026-01-26T00:00:00.000Z", "week")

    expect(timeline).toHaveLength(2)
    expect(timeline[0]).toMatchObject({ key: "2026-01-12", succeeded: 1, failed: 1, successRatePct: 50 })
    expect(timeline[1]).toMatchObject({ key: "2026-01-19", succeeded: 1, failed: 0, successRatePct: 100 })
  })

  it("uses the documented grain for presets and custom ranges", () => {
    expect(getAutomationMetricsGrain({ ...filters, preset: "30d" })).toBe("day")
    expect(getAutomationMetricsGrain({ ...filters, preset: "12w" })).toBe("week")
    expect(getAutomationMetricsGrain({ ...filters, preset: "year" })).toBe("week")
    expect(getAutomationMetricsGrain({ ...filters, preset: "custom", to: "2026-03-12T00:00:00.000Z" })).toBe("week")
  })

  it("excludes queued, running and cancelled runs from the success-rate denominator", () => {
    const summary = summarizeAutomationRuns([
      run({ id: "success", status: "succeeded" }),
      run({ id: "failure", status: "failed" }),
      run({ id: "queued", status: "queued" }),
      run({ id: "running", status: "running" }),
      run({ id: "cancelled", status: "cancelled" }),
    ])

    expect(summary.executions).toBe(5)
    expect(summary.successRatePct).toBe(50)
  })

  it("uses the nearest-rank p95 and ignores unavailable durations", () => {
    expect(percentile95([100, 200, null, 300, 400, 500, 600, 700, 800, 900, 1000])).toBe(1000)
    expect(percentile95([null, null])).toBeNull()
  })

  it("compares the current period to the immediately preceding period", () => {
    const snapshot = buildAutomationMetricsSnapshot([
      run({ id: "current-1", createdAt: "2026-01-10T10:00:00.000Z", status: "succeeded", durationMs: 200, costEstimate: 2 }),
      run({ id: "current-2", createdAt: "2026-01-11T10:00:00.000Z", status: "failed", durationMs: 200, costEstimate: 2 }),
      run({ id: "previous", createdAt: "2026-01-05T10:00:00.000Z", status: "succeeded", durationMs: 100, costEstimate: 1 }),
    ], filters)

    expect(snapshot.summary.executions).toBe(2)
    expect(snapshot.previousSummary.executions).toBe(1)
    expect(snapshot.comparison).toMatchObject({ executionsPct: 100, successRatePoints: -50, p95DurationPct: 100, measuredCostPct: 300 })
  })

  it("does not produce a comparison when the previous period has no valid base", () => {
    const comparison = compareAutomationSummaries(
      { executions: 3, succeeded: 0, failed: 0, successRatePct: null, p95DurationMs: 100, measuredCost: 2, costCoveragePct: 100 },
      { executions: 0, succeeded: 0, failed: 0, successRatePct: null, p95DurationMs: null, measuredCost: null, costCoveragePct: null },
    )

    expect(comparison).toEqual({ executionsPct: null, successRatePoints: null, p95DurationPct: null, measuredCostPct: null })
  })

  it("keeps partially measured costs honest", () => {
    const summary = summarizeAutomationRuns([
      run({ id: "measured", costEstimate: 1.2 }),
      run({ id: "missing", costEstimate: null }),
    ])

    expect(summary.measuredCost).toBe(1.2)
    expect(summary.costCoveragePct).toBe(50)
  })

  it("returns a stable empty period instead of undefined metrics", () => {
    const snapshot = buildAutomationMetricsSnapshot([], filters)

    expect(snapshot.summary).toMatchObject({ executions: 0, successRatePct: null, p95DurationMs: null, measuredCost: null, costCoveragePct: null })
    expect(snapshot.timeline).toHaveLength(7)
    expect(snapshot.timeline.every((point) => point.succeeded === 0 && point.failed === 0)).toBe(true)
  })

  it("applies a workflow filter to current and previous periods", () => {
    const snapshot = buildAutomationMetricsSnapshot([
      run({ id: "current-target", runType: "intel-010-refresh", createdAt: "2026-01-10T10:00:00.000Z" }),
      run({ id: "previous-target", runType: "intel-010-refresh", createdAt: "2026-01-05T10:00:00.000Z" }),
      run({ id: "current-other", runType: "account_watch_refresh", createdAt: "2026-01-10T10:00:00.000Z" }),
      run({ id: "previous-other", runType: "account_watch_refresh", createdAt: "2026-01-05T10:00:00.000Z" }),
    ], { ...filters, workflow: "intel-010-refresh" })

    expect(snapshot.summary.executions).toBe(1)
    expect(snapshot.previousSummary.executions).toBe(1)
    expect(snapshot.workflowOptions).toEqual(["account_watch_refresh", "intel-010-refresh"])
    expect(snapshot.workflowReliability).toHaveLength(1)
    expect(snapshot.workflowPerformance).toHaveLength(1)
  })

  it("aggregates reliability by workflow while retaining non-decided executions", () => {
    const reliability = buildWorkflowReliability([
      run({ id: "success", runType: "intel-010-refresh", status: "succeeded" }),
      run({ id: "failure", runType: "intel-010-refresh", status: "failed" }),
      run({ id: "queued", runType: "intel-010-refresh", status: "queued" }),
      run({ id: "other", runType: "account_watch_refresh", status: "running" }),
    ], [])

    expect(reliability).toContainEqual(expect.objectContaining({
      runType: "intel-010-refresh", executions: 3, succeeded: 1, failed: 1, decided: 2, successRatePct: 50, sampleState: "limited",
    }))
    expect(reliability).toContainEqual(expect.objectContaining({
      runType: "account_watch_refresh", executions: 1, decided: 0, successRatePct: null, sampleState: "none",
    }))
  })

  it("computes rate deltas in points only when both periods have decisions", () => {
    const reliability = buildWorkflowReliability(
      [run({ id: "current", status: "succeeded" }), run({ id: "current-failed", status: "failed" })],
      [run({ id: "previous", status: "succeeded" }), run({ id: "previous-2", status: "succeeded" })],
    )
    const noComparableBase = buildWorkflowReliability([run({ id: "queued", status: "queued" })], [run({ id: "previous", status: "succeeded" })])

    expect(reliability[0]).toMatchObject({ successRatePct: 50, previousSuccessRatePct: 100, successRateDeltaPoints: -50 })
    expect(noComparableBase[0]?.successRateDeltaPoints).toBeNull()
  })

  it("assigns none, limited and sufficient sample states", () => {
    const reliability = buildWorkflowReliability([
      run({ id: "none", runType: "none", status: "queued" }),
      ...Array.from({ length: 4 }, (_, index) => run({ id: `limited-${index}`, runType: "limited", status: "succeeded" })),
      ...Array.from({ length: 5 }, (_, index) => run({ id: `sufficient-${index}`, runType: "sufficient", status: "succeeded" })),
    ], [])

    expect(reliability.find((workflow) => workflow.runType === "none")?.sampleState).toBe("none")
    expect(reliability.find((workflow) => workflow.runType === "limited")?.sampleState).toBe("limited")
    expect(reliability.find((workflow) => workflow.runType === "sufficient")?.sampleState).toBe("sufficient")
  })

  it("uses nearest-rank p50 and preserves p95", () => {
    const values = [10, 20, 30, 40]
    expect(percentileNearestRank(values, 0.5)).toBe(20)
    expect(percentileNearestRank(values, 0.95)).toBe(40)
    expect(percentile95(values)).toBe(40)
  })

  it("excludes invalid durations and reports partial duration coverage", () => {
    const performance = buildWorkflowPerformance([
      run({ id: "valid", durationMs: 100 }),
      run({ id: "null", durationMs: null }),
      run({ id: "negative", durationMs: -1 }),
      run({ id: "invalid", durationMs: Number.NaN }),
    ], [])

    expect(performance[0]).toMatchObject({ measuredDurations: 1, durationCoveragePct: 25, p50DurationMs: 100, p95DurationMs: 100 })
  })

  it("calculates positive and negative p95 deltas", () => {
    const regression = buildWorkflowPerformance([run({ id: "current", durationMs: 200 })], [run({ id: "previous", durationMs: 100 })])
    const improvement = buildWorkflowPerformance([run({ id: "current", durationMs: 50 })], [run({ id: "previous", durationMs: 100 })])

    expect(regression[0]?.p95DeltaPct).toBe(100)
    expect(improvement[0]?.p95DeltaPct).toBe(-50)
  })

  it("keeps workflows without durations visible as unmeasured", () => {
    const performance = buildWorkflowPerformance([run({ id: "missing", durationMs: null })], [])

    expect(performance[0]).toMatchObject({ executions: 1, measuredDurations: 0, durationCoveragePct: 0, p50DurationMs: null, p95DurationMs: null })
  })

  it("sorts reliability with decided, least reliable workflows first", () => {
    const workflows: AutomationWorkflowReliability[] = [
      { runType: "intel-010-refresh", executions: 2, succeeded: 2, failed: 0, decided: 2, successRatePct: 100, previousSuccessRatePct: null, successRateDeltaPoints: null, sampleState: "limited" },
      { runType: "account_watch_refresh", executions: 3, succeeded: 1, failed: 2, decided: 3, successRatePct: 33.3, previousSuccessRatePct: null, successRateDeltaPoints: null, sampleState: "limited" },
      { runType: "no-decision", executions: 1, succeeded: 0, failed: 0, decided: 0, successRatePct: null, previousSuccessRatePct: null, successRateDeltaPoints: null, sampleState: "none" },
    ]

    expect(sortWorkflowReliability(workflows).map((workflow) => workflow.runType)).toEqual(["account_watch_refresh", "intel-010-refresh", "no-decision"])
  })

  it("sorts performance by p95 and measured volume", () => {
    const workflows: AutomationWorkflowPerformance[] = [
      { runType: "intel-010-refresh", executions: 4, measuredDurations: 4, durationCoveragePct: 100, p50DurationMs: 100, p95DurationMs: 200, previousP95DurationMs: null, p95DeltaPct: null },
      { runType: "account_watch_refresh", executions: 6, measuredDurations: 6, durationCoveragePct: 100, p50DurationMs: 150, p95DurationMs: 300, previousP95DurationMs: null, p95DeltaPct: null },
      { runType: "unmeasured", executions: 2, measuredDurations: 0, durationCoveragePct: 0, p50DurationMs: null, p95DurationMs: null, previousP95DurationMs: null, p95DeltaPct: null },
    ]

    expect(sortWorkflowPerformance(workflows, "p95").map((workflow) => workflow.runType)).toEqual(["account_watch_refresh", "intel-010-refresh", "unmeasured"])
    expect(sortWorkflowPerformance(workflows, "measuredVolume").map((workflow) => workflow.runType)).toEqual(["account_watch_refresh", "intel-010-refresh", "unmeasured"])
  })
})
