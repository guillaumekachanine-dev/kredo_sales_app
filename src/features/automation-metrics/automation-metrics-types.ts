export type AutomationMetricsPeriodPreset = "7d" | "30d" | "12w" | "year" | "custom"
export type AutomationMetricsGrain = "day" | "week"
export type AutomationMetricsWorkflow = "all" | string
export type AutomationMetricsSectionId = "overview" | "reliability" | "performance" | "costs" | "incidents"
export type AutomationMetricsPerformanceSort = "p95" | "measuredVolume"
export type AutomationMetricsCostSort = "measuredCost" | "costPerSuccess"

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

export type AutomationMetricsIncidentRun = {
  id: string
  runType: string
  createdAt: string
  errorMessage: string | null
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

export type AutomationWorkflowCostEfficiency = {
  runType: string
  executions: number
  succeeded: number
  failed: number
  measuredRuns: number
  costCoveragePct: number | null
  measuredCost: number | null
  averageCostPerMeasuredRun: number | null
  costPerSuccess: number | null
  previousMeasuredCost: number | null
  measuredCostDeltaPct: number | null
  previousCostPerSuccess: number | null
  costPerSuccessDeltaPct: number | null
}

export type AutomationMetricsCostSummary = {
  executions: number
  succeeded: number
  measuredRuns: number
  costCoveragePct: number | null
  measuredCost: number | null
  averageCostPerMeasuredRun: number | null
  costPerSuccess: number | null
  previousMeasuredCost: number | null
  measuredCostDeltaPct: number | null
  previousCostPerSuccess: number | null
  costPerSuccessDeltaPct: number | null
}

export type AutomationIncidentCategoryId =
  | "stuck_callback"
  | "webhook"
  | "auth_configuration"
  | "database_rpc"
  | "runtime_node"
  | "output_validation"
  | "provider_service"
  | "other"

export type AutomationIncidentCategory = {
  id: AutomationIncidentCategoryId
  label: string
  description: string
  incidents: number
  sharePct: number
  cumulativeSharePct: number
  previousIncidents: number
  incidentsDelta: number
}

export type AutomationIncidentsSummary = {
  failedRuns: number
  previousFailedRuns: number
  failedRunsDeltaPct: number | null
  automaticInterventions: number
  previousAutomaticInterventions: number
  automaticInterventionsDeltaPct: number | null
  automaticInterventionSharePct: number | null
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
  costsSummary: AutomationMetricsCostSummary
  workflowCosts: AutomationWorkflowCostEfficiency[]
  incidentsSummary: AutomationIncidentsSummary
  incidentCategories: AutomationIncidentCategory[]
}
