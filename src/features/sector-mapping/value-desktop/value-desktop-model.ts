import type {
  SectorMap,
  SectorMapActivity,
  SectorMapActivityProjection,
  SectorMapEvidence,
  SectorMapStage,
} from "../model"
import {
  buildActivityProjection,
  buildValueProjection,
  normalizeSectorMap,
  summarizeActivityRelationships,
} from "../model"

export type SectorValueColumn =
  | {
      kind: "activity"
      id: string
      stage: SectorMapStage
      activity: SectorMapActivityProjection
    }
  | {
      kind: "empty"
      id: string
      stage: SectorMapStage
    }

export interface SectorValueStageGroup {
  stage: SectorMapStage
  columnStart: number
  columnSpan: number
}

export interface CaptureProfileSegment {
  points: Array<{ x: number; y: number }>
}

export interface SectorValueDesktopModel {
  sector: SectorMap["sector"]
  source: SectorMap
  columns: SectorValueColumn[]
  stageGroups: SectorValueStageGroup[]
  ecosystemLayers: ReturnType<typeof buildValueProjection>["ecosystemLayers"]
}

export function buildSectorValueDesktopModel(input: SectorMap): SectorValueDesktopModel {
  const source = normalizeSectorMap(input)
  const projection = buildValueProjection(source)
  const columns: SectorValueColumn[] = []
  const stageGroups: SectorValueStageGroup[] = []

  projection.stages.forEach((stage) => {
    const columnStart = columns.length + 1
    if (stage.activities.length === 0) {
      columns.push({ kind: "empty", id: `empty:${stage.id}`, stage })
    } else {
      stage.activities.forEach((activity) => {
        columns.push({
          kind: "activity",
          id: activity.activity.id,
          stage,
          activity,
        })
      })
    }
    stageGroups.push({ stage, columnStart, columnSpan: Math.max(1, stage.activities.length) })
  })

  return {
    sector: source.sector,
    source,
    columns,
    stageGroups,
    ecosystemLayers: projection.ecosystemLayers,
  }
}

function captureY(value: 1 | 2 | 3) {
  if (value === 3) return 22
  if (value === 2) return 48
  return 74
}

export function buildCaptureProfileSegments(
  columns: SectorValueColumn[],
): CaptureProfileSegment[] {
  const segments: CaptureProfileSegment[] = []
  let current: CaptureProfileSegment["points"] = []

  columns.forEach((column, index) => {
    const value = column.kind === "activity" ? column.activity.capture.value : null
    if (value === null) {
      if (current.length > 0) segments.push({ points: current })
      current = []
      return
    }

    current.push({ x: index * 100 + 50, y: captureY(value) })
  })

  if (current.length > 0) segments.push({ points: current })
  return segments
}

export function getSelectedActivityContext(
  model: SectorValueDesktopModel,
  activityId: string,
) {
  const activity = buildActivityProjection(model.source, activityId)
  const evidenceIds = new Set([
    ...activity.capture.evidenceIds,
    ...activity.coverage.evidenceIds,
    ...activity.placements.flatMap((placement) => placement.evidenceIds),
    ...model.source.relationships
      .filter((relationship) => (
        (relationship.from.kind === "activity" && relationship.from.id === activityId)
        || (relationship.to.kind === "activity" && relationship.to.id === activityId)
      ))
      .flatMap((relationship) => relationship.evidenceIds),
  ])

  return {
    activity,
    summary: summarizeActivityRelationships(model.source, activityId),
    evidence: model.source.evidence.filter((item) => evidenceIds.has(item.id)),
  }
}

export function getLayerIntensity(model: SectorValueDesktopModel, layerId: string) {
  const relationships = model.source.relationships.filter((relationship) => (
    relationship.mode === "influence"
    && (
      (relationship.from.kind === "ecosystemLayer" && relationship.from.id === layerId)
      || (relationship.to.kind === "ecosystemLayer" && relationship.to.id === layerId)
    )
  ))
  return relationships.reduce<1 | 2 | 3 | null>((maximum, relationship) => {
    if (!relationship.intensity) return maximum
    return maximum === null || relationship.intensity > maximum
      ? relationship.intensity
      : maximum
  }, null)
}

export function evidenceLabel(evidence: SectorMapEvidence) {
  return evidence.date ? `${evidence.label} · ${evidence.date}` : evidence.label
}

export function activityColumnCount(stages: SectorMapStage[], activities: SectorMapActivity[]) {
  return stages.reduce((count, stage) => {
    const activityCount = activities.filter((activity) => activity.stageId === stage.id).length
    return count + Math.max(1, activityCount)
  }, 0)
}
