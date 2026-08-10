import type {
  SectorMap,
  SectorMapActivity,
  SectorMapConfidence,
  SectorMapEcosystemLayer,
  SectorMapEntity,
  SectorMapPlacement,
  SectorMapRef,
  SectorMapRelationship,
} from "./sector-map"
import { normalizeSectorMap } from "./validate-sector-map"

export interface SectorMapCoverage {
  entityIds: string[]
  covered: number
  total: number | null
  gap: number | null
  ratio: number | null
  confidence: SectorMapConfidence
  evidenceIds: string[]
}

export interface SectorMapWhiteSpace {
  status: "unknown" | "none" | "priority"
  priorityEntityIds: string[]
  reasons: Array<
    | "coverage_unknown"
    | "coverage_complete"
    | "coverage_gap"
    | "no_priority_opportunity"
    | "priority_opportunities"
  >
}

export interface SectorMapActivityProjection {
  activity: SectorMapActivity
  placements: SectorMapPlacement[]
  entities: SectorMapEntity[]
  capture: {
    value: 1 | 2 | 3 | null
    confidence: SectorMapConfidence
    evidenceIds: string[]
  }
  coverage: SectorMapCoverage
  whiteSpace: SectorMapWhiteSpace
}

export interface SectorMapValueProjection {
  stages: Array<{
    id: string
    label: string
    order: number
    activities: SectorMapActivityProjection[]
  }>
  ecosystemLayers: Array<{
    layer: SectorMapEcosystemLayer
    placements: SectorMapPlacement[]
    entities: SectorMapEntity[]
    coverage: SectorMapCoverage
  }>
}

export interface SectorMapRelationshipSummary {
  incoming: number
  outgoing: number
  influences: number
}

export interface SectorMapEcosystemProjection {
  mode: "main" | "influences"
  focal: SectorMapActivityProjection
  relationships: SectorMapRelationship[]
  activities: SectorMapActivity[]
  ecosystemLayers: SectorMapEcosystemLayer[]
  entities: SectorMapEntity[]
  placements: SectorMapPlacement[]
  summary: SectorMapRelationshipSummary
}

function refKey(ref: SectorMapRef) {
  return `${ref.kind}:${ref.id}`
}

function targetKey(target: SectorMapPlacement["target"]) {
  return `${target.kind}:${target.id}`
}

function sortedUnique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "fr"))
}

function placementsForTarget(model: SectorMap, target: SectorMapPlacement["target"]) {
  const key = targetKey(target)
  return model.placements.filter((placement) => targetKey(placement.target) === key)
}

function entitiesForPlacements(model: SectorMap, placements: SectorMapPlacement[]) {
  const entityIds = new Set(placements.map((placement) => placement.entityId))
  return model.entities.filter((entity) => entityIds.has(entity.id))
}

export function deriveCoverage(
  model: SectorMap,
  subject: Extract<SectorMapRef, { kind: "activity" | "ecosystemLayer" }>,
): SectorMapCoverage {
  const placements = placementsForTarget(model, subject)
  const entitiesById = new Map(model.entities.map((entity) => [entity.id, entity]))
  const entityIds = sortedUnique(
    placements
      .map((placement) => placement.entityId)
      .filter((entityId) => Boolean(entitiesById.get(entityId)?.companyId)),
  )
  const metric = model.metrics.find(
    (item) => item.kind === "kredo_coverage" && refKey(item.subject) === refKey(subject),
  )
  const total = metric?.kind === "kredo_coverage" ? metric.total : null
  const covered = entityIds.length

  return {
    entityIds,
    covered,
    total,
    gap: total === null ? null : Math.max(0, total - covered),
    ratio: total === null || total === 0 ? null : covered / total,
    confidence: metric?.confidence ?? "unknown",
    evidenceIds: metric?.evidenceIds ?? [],
  }
}

export function deriveWhiteSpace(
  model: SectorMap,
  activityId: string,
  coverage = deriveCoverage(model, { kind: "activity", id: activityId }),
): SectorMapWhiteSpace {
  const priorityEntityIds = sortedUnique(
    placementsForTarget(model, { kind: "activity", id: activityId })
      .filter((placement) => placement.priorityOpportunity)
      .map((placement) => placement.entityId),
  )

  if (coverage.gap === null) {
    return { status: "unknown", priorityEntityIds, reasons: ["coverage_unknown"] }
  }
  if (coverage.gap === 0) {
    return { status: "none", priorityEntityIds, reasons: ["coverage_complete"] }
  }
  if (priorityEntityIds.length > 0) {
    return {
      status: "priority",
      priorityEntityIds,
      reasons: ["coverage_gap", "priority_opportunities"],
    }
  }
  return {
    status: "none",
    priorityEntityIds,
    reasons: ["coverage_gap", "no_priority_opportunity"],
  }
}

export function buildActivityProjection(
  model: SectorMap,
  activityId: string,
): SectorMapActivityProjection {
  const activity = model.activities.find((item) => item.id === activityId)
  if (!activity) throw new Error(`Activité inconnue: ${activityId}`)

  const placements = placementsForTarget(model, { kind: "activity", id: activityId })
  const captureMetric = model.metrics.find(
    (metric) => metric.kind === "value_capture" && metric.subject.id === activityId,
  )
  const coverage = deriveCoverage(model, { kind: "activity", id: activityId })

  return {
    activity,
    placements,
    entities: entitiesForPlacements(model, placements),
    capture: captureMetric?.kind === "value_capture"
      ? {
          value: captureMetric.value,
          confidence: captureMetric.confidence,
          evidenceIds: captureMetric.evidenceIds,
        }
      : { value: null, confidence: "unknown", evidenceIds: [] },
    coverage,
    whiteSpace: deriveWhiteSpace(model, activityId, coverage),
  }
}

export function buildValueProjection(input: SectorMap): SectorMapValueProjection {
  const model = normalizeSectorMap(input)

  return {
    stages: model.stages.map((stage) => ({
      ...stage,
      activities: model.activities
        .filter((activity) => activity.stageId === stage.id)
        .map((activity) => buildActivityProjection(model, activity.id)),
    })),
    ecosystemLayers: model.ecosystemLayers.map((layer) => {
      const target = { kind: "ecosystemLayer" as const, id: layer.id }
      const placements = placementsForTarget(model, target)
      return {
        layer,
        placements,
        entities: entitiesForPlacements(model, placements),
        coverage: deriveCoverage(model, target),
      }
    }),
  }
}

export function summarizeActivityRelationships(
  model: SectorMap,
  activityId: string,
): SectorMapRelationshipSummary {
  return model.relationships.reduce<SectorMapRelationshipSummary>(
    (summary, relationship) => {
      if (relationship.mode === "influence") {
        if (
          (relationship.from.kind === "activity" && relationship.from.id === activityId)
          || (relationship.to.kind === "activity" && relationship.to.id === activityId)
        ) {
          summary.influences += 1
        }
        return summary
      }

      if (relationship.to.kind === "activity" && relationship.to.id === activityId) {
        summary.incoming += 1
      }
      if (relationship.from.kind === "activity" && relationship.from.id === activityId) {
        summary.outgoing += 1
      }
      return summary
    },
    { incoming: 0, outgoing: 0, influences: 0 },
  )
}

export function buildEcosystemProjection(
  input: SectorMap,
  activityId: string,
  mode: "main" | "influences",
): SectorMapEcosystemProjection {
  const model = normalizeSectorMap(input)
  const focalRef = { kind: "activity" as const, id: activityId }
  const relationships = model.relationships.filter((relationship) => (
    relationship.mode === (mode === "main" ? "main" : "influence")
    && (refKey(relationship.from) === refKey(focalRef) || refKey(relationship.to) === refKey(focalRef))
  ))
  const visibleRefs = new Set<string>([refKey(focalRef)])
  relationships.forEach((relationship) => {
    visibleRefs.add(refKey(relationship.from))
    visibleRefs.add(refKey(relationship.to))
  })

  const activities = model.activities.filter((activity) => visibleRefs.has(refKey({ kind: "activity", id: activity.id })))
  const ecosystemLayers = model.ecosystemLayers.filter((layer) => (
    visibleRefs.has(refKey({ kind: "ecosystemLayer", id: layer.id }))
  ))
  const directlyReferencedEntityIds = model.entities
    .filter((entity) => visibleRefs.has(refKey({ kind: "entity", id: entity.id })))
    .map((entity) => entity.id)
  const visibleTargetKeys = new Set([
    ...activities.map((activity) => refKey({ kind: "activity" as const, id: activity.id })),
    ...ecosystemLayers.map((layer) => refKey({ kind: "ecosystemLayer" as const, id: layer.id })),
  ])
  const placements = model.placements.filter((placement) => visibleTargetKeys.has(targetKey(placement.target)))
  const placedEntityIds = placements.map((placement) => placement.entityId)
  const entityIds = new Set([...directlyReferencedEntityIds, ...placedEntityIds])

  return {
    mode,
    focal: buildActivityProjection(model, activityId),
    relationships,
    activities,
    ecosystemLayers,
    entities: model.entities.filter((entity) => entityIds.has(entity.id)),
    placements,
    summary: summarizeActivityRelationships(model, activityId),
  }
}
