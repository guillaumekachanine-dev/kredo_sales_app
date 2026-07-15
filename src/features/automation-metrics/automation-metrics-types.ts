export type AutomationMetricsPeriodPreset = "7d" | "30d" | "12w" | "year" | "custom"
export type AutomationMetricsGrain = "day" | "week"
export type AutomationMetricsWorkflow = "all" | string
export type AutomationMetricsSectionId = "overview" | "reliability" | "performance"
export type AutomationMetricsPerformanceSort = "p95" | "measuredVolume"

export type AutomationMetricsFilters = {
  from: string
  to: string
  preset: AutomationMetricsPeriodPreset
  workflow: AutomationMetricsWorkflow
}

export type AutomationMetricsRun = {
  id: string
  runType: string
  status: string
  createdAt: string
  durationMs: number | null
  costEstimate: number | null
}

export type AutomationMetricsSummary = {
  executions: number
  succeeded: number
  failed: number
  successRatePct: number | null
  p95DurationMs: number | null
  measuredCost: number | null
  costCoveragePct: number | null
}

export type AutomationMetricsComparison = {
  executionsPct: number | null
  successRatePoints: number | null
  p95DurationPct: number | null
  measuredCostPct: number | null
}

export type AutomationMetricsTimelinePoint = {
  key: string
  label: string
  succeeded: number
  failed: number
  successRatePct: number | null
}

export type AutomationWorkflowSampleState = "none" | "limited" | "sufficient"

export type AutomationWorkflowReliability = {
  runType: string
  executions: number
  succeeded: number
  failed: number
  decided: number
  successRatePct: number | null
  previousSuccessRatePct: number | null
  successRateDeltaPoints: number | null
  sampleState: AutomationWorkflowSampleState
}

export type AutomationWorkflowPerformance = {
  runType: string
  executions: number
  measuredDurations: number
  durationCoveragePct: number | null
  p50DurationMs: number | null
  p95DurationMs: number | null
  previousP95DurationMs: number | null
  p95DeltaPct: number | null
}

export type AutomationMetricsSnapshot = {
  range: {
    from: string
    to: string
    previousFrom: string
    grain: AutomationMetricsGrain
  }
  workflowOptions: string[]
  summary: AutomationMetricsSummary
  previousSummary: AutomationMetricsSummary
  comparison: AutomationMetricsComparison
  timeline: AutomationMetricsTimelinePoint[]
  workflowReliability: AutomationWorkflowReliability[]
  workflowPerformance: AutomationWorkflowPerformance[]
}
