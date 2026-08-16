import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { AutomationMetricsCosts } from "./AutomationMetricsCosts"
import { AutomationWorkflowCostChart } from "./AutomationWorkflowCostChart"
import type { AutomationMetricsSnapshot } from "./automation-metrics-types"

function makeMockSnapshot(): AutomationMetricsSnapshot {
  return {
    range: {
      from: "2026-07-16T00:00:00.000Z",
      to: "2026-08-16T00:00:00.000Z",
      previousFrom: "2026-06-16T00:00:00.000Z",
      grain: "day",
    },
    workflowOptions: ["intel-010-refresh"],
    summary: {
      executions: 10,
      succeeded: 8,
      failed: 2,
      successRatePct: 80,
      p95DurationMs: 12000,
      measuredCost: 1.25,
      costCoveragePct: 100,
    },
    previousSummary: {
      executions: 10,
      succeeded: 7,
      failed: 3,
      successRatePct: 70,
      p95DurationMs: 12000,
      measuredCost: 1.13,
      costCoveragePct: 100,
    },
    comparison: {
      executionsPct: 0,
      successRatePoints: 10,
      p95DurationPct: 0,
      measuredCostPct: 10.5,
    },
    costsSummary: {
      executions: 10,
      succeeded: 8,
      measuredRuns: 10,
      costCoveragePct: 100,
      measuredCost: 1.25,
      averageCostPerMeasuredRun: 0.125,
      costPerSuccess: 0.156,
      previousMeasuredCost: 1.13,
      measuredCostDeltaPct: 10.5,
      previousCostPerSuccess: 0.165,
      costPerSuccessDeltaPct: -5.2,
    },
    workflowCosts: [
      {
        runType: "intel-010-refresh",
        executions: 10,
        succeeded: 8,
        failed: 2,
        measuredRuns: 10,
        costCoveragePct: 100,
        measuredCost: 1.25,
        averageCostPerMeasuredRun: 0.125,
        costPerSuccess: 0.156,
        previousMeasuredCost: 1.13,
        measuredCostDeltaPct: 10.5,
        previousCostPerSuccess: 0.165,
        costPerSuccessDeltaPct: -5.2,
      },
    ],
    workflowReliability: [],
    workflowPerformance: [],
    incidentCategories: [],
    incidentsSummary: {
      failedRuns: 2,
      previousFailedRuns: 2,
      failedRunsDeltaPct: 0,
      automaticInterventions: 0,
      previousAutomaticInterventions: 0,
      automaticInterventionsDeltaPct: null,
      automaticInterventionSharePct: null,
    },
    timeline: [],
  }
}

describe("AutomationWorkflowCostChart and AutomationMetricsCosts contracts", () => {
  it("hides the 3 KPI MetricCards in mobile mode (appearance=light)", () => {
    const markup = renderToStaticMarkup(
      createElement(AutomationMetricsCosts, {
        snapshot: makeMockSnapshot(),
        appearance: "light",
      })
    )

    // Should NOT contain the 3 metric card headers
    expect(markup).not.toContain("Dépense connue sur la période sélectionnée")
    expect(markup).not.toContain("Dépense mesurée totale divisée par les succès")
    expect(markup).not.toContain("Couverture des coûts")
  })

  it("renders the 3 KPI MetricCards in desktop dark mode (appearance=dark)", () => {
    const markup = renderToStaticMarkup(
      createElement(AutomationMetricsCosts, {
        snapshot: makeMockSnapshot(),
        appearance: "dark",
      })
    )

    expect(markup).toContain("Dépense connue sur la période sélectionnée")
    expect(markup).toContain("Couverture des coûts")
  })

  it("does not render the 2 legend lines above the first workflow", () => {
    const markup = renderToStaticMarkup(
      createElement(AutomationWorkflowCostChart, {
        workflows: makeMockSnapshot().workflowCosts,
        mode: "costPerSuccess",
        appearance: "light",
      })
    )

    expect(markup).not.toContain("Les barres commencent à zéro")
  })

  it("renders the new card layout with top-right value, delta above bar, Moyen/run on bottom-left, and Coût total on bottom-right", () => {
    const markup = renderToStaticMarkup(
      createElement(AutomationWorkflowCostChart, {
        workflows: makeMockSnapshot().workflowCosts,
        mode: "costPerSuccess",
        appearance: "light",
      })
    )

    // Workflow info
    expect(markup).toContain("Scan rapide compte")
    expect(markup).toContain("intel-010-refresh")

    // Top right main value
    expect(markup).toContain("0,16 $")

    // Delta above bar
    expect(markup).toContain("-5,2 % vs période précédente")

    // Bottom items
    expect(markup).toContain("Moyen/run :")
    expect(markup).toContain("0,13 $")
    expect(markup).toContain("Coût total :")
    expect(markup).toContain("1,25 $")
  })
})
