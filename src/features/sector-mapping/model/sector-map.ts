export type SectorMapConfidence = "high" | "medium" | "low" | "unknown"

export type SectorMapPortfolioStatus =
  | "client"
  | "prospect"
  | "external"
  | "peer_partner"

export type SectorMapRef =
  | { kind: "activity"; id: string }
  | { kind: "entity"; id: string }
  | { kind: "ecosystemLayer"; id: string }

export interface SectorMapStage {
  id: string
  label: string
  order: number
}

export interface SectorMapActivity {
  id: string
  stageId: string
  label: string
  order: number
}

export interface SectorMapEntity {
  id: string
  companyId?: string
  name: string
  status: SectorMapPortfolioStatus
}

export interface SectorMapPlacement {
  id: string
  entityId: string
  target:
    | { kind: "activity"; id: string }
    | { kind: "ecosystemLayer"; id: string }
  order: number
  priorityOpportunity: boolean
  evidenceIds: string[]
}

export interface SectorMapRelationship {
  id: string
  from: SectorMapRef
  to: SectorMapRef
  mode: "main" | "influence"
  label?: string
  intensity?: 1 | 2 | 3
  confidence: SectorMapConfidence
  evidenceIds: string[]
}

export interface SectorMapEcosystemLayer {
  id: string
  label: string
  kind: "regulation" | "funding" | "technology"
  order: number
}

interface SectorMapMetricBase {
  id: string
  confidence: SectorMapConfidence
  evidenceIds: string[]
}

export interface SectorMapValueCaptureMetric extends SectorMapMetricBase {
  kind: "value_capture"
  subject: { kind: "activity"; id: string }
  value: 1 | 2 | 3 | null
}

export interface SectorMapCoverageMetric extends SectorMapMetricBase {
  kind: "kredo_coverage"
  subject:
    | { kind: "activity"; id: string }
    | { kind: "ecosystemLayer"; id: string }
  total: number | null
}

export type SectorMapMetric =
  | SectorMapValueCaptureMetric
  | SectorMapCoverageMetric

export interface SectorMapEvidence {
  id: string
  label: string
  url?: string
  date?: string
  excerpt?: string
}

export interface SectorMap {
  sector: {
    id: string
    slug: string
    name: string
    asOf?: string
    defaultActivityId: string
  }
  stages: SectorMapStage[]
  activities: SectorMapActivity[]
  entities: SectorMapEntity[]
  placements: SectorMapPlacement[]
  relationships: SectorMapRelationship[]
  ecosystemLayers: SectorMapEcosystemLayer[]
  metrics: SectorMapMetric[]
  evidence: SectorMapEvidence[]
}
