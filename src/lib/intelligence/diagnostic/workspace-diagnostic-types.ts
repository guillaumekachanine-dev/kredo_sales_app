export const WORKSPACE_DIAGNOSTIC_SCHEMA_VERSION = 1 as const

export const WORKSPACE_DIAGNOSTIC_AXES = [
  "commerce",
  "delivery",
  "finance",
  "team",
  "recruitment",
] as const

export const WORKSPACE_DIAGNOSTIC_SEVERITIES = [
  "critical",
  "warning",
  "opportunity",
] as const

export type WorkspaceDiagnosticAxis = (typeof WORKSPACE_DIAGNOSTIC_AXES)[number]
export type WorkspaceDiagnosticSeverity = (typeof WORKSPACE_DIAGNOSTIC_SEVERITIES)[number]

export interface WorkspaceDiagnosticEvidenceRef {
  metric: string
  value: string
}

export interface WorkspaceDiagnosticCorrelation {
  id: string
  title: string
  narrative: string
  axes: WorkspaceDiagnosticAxis[]
  severity: WorkspaceDiagnosticSeverity
  evidenceRefs: WorkspaceDiagnosticEvidenceRef[]
}

export interface WorkspaceDiagnosticPriority {
  rank: 1 | 2 | 3
  action: string
  rationale: string
  relatedCorrelationIds: string[]
}

export interface WorkspaceDiagnosticWatchItem {
  signal: string
  horizon: string
  triggerCondition: string
}

export interface WorkspaceDiagnosticStrength {
  observation: string
  sustainAction?: string
}

export interface WorkspaceDiagnostic {
  schema_version: typeof WORKSPACE_DIAGNOSTIC_SCHEMA_VERSION
  generatedAt: string
  periodLabel: string
  executiveSummary: string
  correlations: WorkspaceDiagnosticCorrelation[]
  priorities: WorkspaceDiagnosticPriority[]
  watchList: WorkspaceDiagnosticWatchItem[]
  strengths: WorkspaceDiagnosticStrength[]
}

export interface WorkspaceDiagnosticSnapshot {
  documentId: string
  createdAt: string
  diagnostic: WorkspaceDiagnostic
}

export interface WorkspaceDiagnosticTriggerInput {
  diagnosticType: "workspace_diagnostic"
  asOfDate: string
}
