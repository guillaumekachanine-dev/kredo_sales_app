import type {
  SectorMap,
  SectorMapConfidence,
  SectorMapEcosystemProjection,
  SectorMapEntity,
  SectorMapPortfolioStatus,
  SectorMapRef,
  SectorMapRelationship,
} from "../model"

export type EcosystemGraphMode = "main" | "influences"
export type EcosystemGraphSide = "incoming" | "focal" | "outgoing"

export interface EcosystemGraphActor {
  id: string
  name: string
  status: SectorMapPortfolioStatus
  isKredo: boolean
}

export interface EcosystemGraphNode {
  id: string
  ref: SectorMapRef
  side: EcosystemGraphSide
  label: string
  eyebrow: string
  layerKind?: "regulation" | "funding" | "technology"
  actors: EcosystemGraphActor[]
  hiddenActorCount: number
  x: number
  y: number
  width: number
  height: number
}

export interface EcosystemGraphEdge {
  id: string
  relationshipIds: string[]
  sourceNodeId: string
  targetNodeId: string
  mode: SectorMapRelationship["mode"]
  label?: string
  intensity: 1 | 2 | 3 | null
  confidence: SectorMapConfidence
  evidenceIds: string[]
  path: string
  labelX: number
  labelY: number
}

export interface EcosystemGraphLayout {
  width: number
  height: number
  nodes: EcosystemGraphNode[]
  edges: EcosystemGraphEdge[]
  omitted: {
    incoming: number
    outgoing: number
  }
}

interface AggregatedRelationship {
  from: SectorMapRef
  to: SectorMapRef
  relationships: SectorMapRelationship[]
}

const CANVAS_WIDTH = 1_100
const FOCAL_WIDTH = 320
const FOCAL_HEIGHT = 190
const NEIGHBOR_WIDTH = 240
const NEIGHBOR_HEIGHT = 142
const SIDE_LIMIT = 4
const SIDE_GAP = 26
const VERTICAL_PADDING = 56

const CONFIDENCE_RANK: Record<SectorMapConfidence, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
}

function refKey(ref: SectorMapRef) {
  return `${ref.kind}:${ref.id}`
}

function aggregateRelationships(relationships: SectorMapRelationship[]) {
  const groups = new Map<string, AggregatedRelationship>()

  relationships.forEach((relationship) => {
    const key = `${refKey(relationship.from)}>${refKey(relationship.to)}`
    const existing = groups.get(key)
    if (existing) {
      existing.relationships.push(relationship)
      return
    }
    groups.set(key, {
      from: relationship.from,
      to: relationship.to,
      relationships: [relationship],
    })
  })

  return [...groups.values()]
}

function maximumIntensity(relationships: SectorMapRelationship[]) {
  return relationships.reduce<1 | 2 | 3 | null>((maximum, relationship) => {
    if (!relationship.intensity) return maximum
    return maximum === null || relationship.intensity > maximum
      ? relationship.intensity
      : maximum
  }, null)
}

function strongestConfidence(relationships: SectorMapRelationship[]) {
  return relationships.reduce<SectorMapConfidence>((strongest, relationship) => (
    CONFIDENCE_RANK[relationship.confidence] > CONFIDENCE_RANK[strongest]
      ? relationship.confidence
      : strongest
  ), "unknown")
}

function groupRank(group: AggregatedRelationship) {
  return (maximumIntensity(group.relationships) ?? 0) * 10
    + CONFIDENCE_RANK[strongestConfidence(group.relationships)]
}

function compareGroups(left: AggregatedRelationship, right: AggregatedRelationship) {
  return groupRank(right) - groupRank(left)
    || refKey(left.from).localeCompare(refKey(right.from), "fr")
    || refKey(left.to).localeCompare(refKey(right.to), "fr")
}

function semanticInfluenceLabel(model: SectorMap, group: AggregatedRelationship) {
  const labels = [...new Set(group.relationships.flatMap((relationship) => (
    relationship.label ? [relationship.label] : []
  )))]
  if (labels.length > 0) return labels.join(" · ")

  const layerRef = group.from.kind === "ecosystemLayer"
    ? group.from
    : group.to.kind === "ecosystemLayer"
      ? group.to
      : null
  const kind = model.ecosystemLayers.find((layer) => layer.id === layerRef?.id)?.kind
  if (kind === "regulation") return "prescrit"
  if (kind === "funding") return "finance"
  if (kind === "technology") return "outille"
  return undefined
}

function groupLabel(model: SectorMap, group: AggregatedRelationship) {
  if (group.relationships[0]?.mode === "influence") {
    return semanticInfluenceLabel(model, group)
  }
  const labels = [...new Set(group.relationships.flatMap((relationship) => (
    relationship.label ? [relationship.label] : []
  )))]
  return labels.length > 0 ? labels.join(" · ") : undefined
}

function verticalPositions(count: number, height: number) {
  if (count === 0) return []
  if (count === 1) return [(height - NEIGHBOR_HEIGHT) / 2]
  const available = height - VERTICAL_PADDING * 2 - NEIGHBOR_HEIGHT
  const step = available / (count - 1)
  return Array.from({ length: count }, (_, index) => VERTICAL_PADDING + step * index)
}

function refDetails(model: SectorMap, ref: SectorMapRef) {
  if (ref.kind === "activity") {
    const activity = model.activities.find((item) => item.id === ref.id)
    const stage = model.stages.find((item) => item.id === activity?.stageId)
    return {
      label: activity?.label ?? "Activité inconnue",
      eyebrow: stage?.label ?? "Chaîne de valeur",
    }
  }
  if (ref.kind === "ecosystemLayer") {
    const layer = model.ecosystemLayers.find((item) => item.id === ref.id)
    const eyebrow = layer?.kind === "regulation"
      ? "Prescription"
      : layer?.kind === "funding"
        ? "Financement"
        : "Outillage"
    return {
      label: layer?.label ?? "Force transverse inconnue",
      eyebrow,
      layerKind: layer?.kind,
    }
  }
  const entity = model.entities.find((item) => item.id === ref.id)
  return {
    label: entity?.name ?? "Acteur inconnu",
    eyebrow: "Acteur",
  }
}

function actorsForRef(model: SectorMap, ref: SectorMapRef, visibleLimit: number) {
  if (ref.kind === "entity") return { actors: [], hiddenActorCount: 0 }
  const entityById = new Map(model.entities.map((entity) => [entity.id, entity]))
  const actors = model.placements
    .filter((placement) => (
      placement.target.kind === ref.kind && placement.target.id === ref.id
    ))
    .map((placement) => entityById.get(placement.entityId))
    .filter((entity): entity is SectorMapEntity => Boolean(entity))
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      status: entity.status,
      isKredo: Boolean(entity.companyId),
    }))

  return {
    actors: actors.slice(0, visibleLimit),
    hiddenActorCount: Math.max(0, actors.length - visibleLimit),
  }
}

function nodeForRef(
  model: SectorMap,
  ref: SectorMapRef,
  side: Exclude<EcosystemGraphSide, "focal">,
  index: number,
  y: number,
): EcosystemGraphNode {
  const details = refDetails(model, ref)
  const actorData = actorsForRef(model, ref, 2)
  return {
    id: `${side}:${refKey(ref)}:${index}`,
    ref,
    side,
    ...details,
    ...actorData,
    x: side === "incoming" ? 40 : 820,
    y,
    width: NEIGHBOR_WIDTH,
    height: NEIGHBOR_HEIGHT,
  }
}

function edgePath(source: EcosystemGraphNode, target: EcosystemGraphNode) {
  const sourceOnLeft = source.x < target.x
  const sourceX = sourceOnLeft ? source.x + source.width : source.x
  const targetX = sourceOnLeft ? target.x : target.x + target.width
  const sourceY = source.y + source.height / 2
  const targetY = target.y + target.height / 2
  const bend = Math.abs(targetX - sourceX) * 0.46
  const firstControlX = sourceOnLeft ? sourceX + bend : sourceX - bend
  const secondControlX = sourceOnLeft ? targetX - bend : targetX + bend
  return {
    path: `M ${sourceX} ${sourceY} C ${firstControlX} ${sourceY}, ${secondControlX} ${targetY}, ${targetX} ${targetY}`,
    labelX: (sourceX + targetX) / 2,
    labelY: (sourceY + targetY) / 2 - 9,
  }
}

/**
 * Calcule une vue locale stable autour de l'activité focale.
 * La fonction est pure : aucun accès au DOM, aucune mesure implicite et aucun état aléatoire.
 */
export function layoutEcosystemGraph(
  model: SectorMap,
  projection: SectorMapEcosystemProjection,
): EcosystemGraphLayout {
  const focalRef = { kind: "activity" as const, id: projection.focal.activity.id }
  const grouped = aggregateRelationships(projection.relationships)
  const incomingGroups = grouped
    .filter((group) => refKey(group.to) === refKey(focalRef))
    .sort(compareGroups)
  const outgoingGroups = grouped
    .filter((group) => refKey(group.from) === refKey(focalRef))
    .sort(compareGroups)
  const visibleIncoming = incomingGroups.slice(0, SIDE_LIMIT)
  const visibleOutgoing = outgoingGroups.slice(0, SIDE_LIMIT)
  const maximumSideCount = Math.max(visibleIncoming.length, visibleOutgoing.length, 1)
  const height = Math.max(
    500,
    VERTICAL_PADDING * 2 + maximumSideCount * NEIGHBOR_HEIGHT + (maximumSideCount - 1) * SIDE_GAP,
  )

  const focalDetails = refDetails(model, focalRef)
  const focalNode: EcosystemGraphNode = {
    id: `focal:${refKey(focalRef)}`,
    ref: focalRef,
    side: "focal",
    ...focalDetails,
    ...actorsForRef(model, focalRef, 4),
    x: 390,
    y: (height - FOCAL_HEIGHT) / 2,
    width: FOCAL_WIDTH,
    height: FOCAL_HEIGHT,
  }
  const incomingNodes = visibleIncoming.map((group, index) => nodeForRef(
    model,
    group.from,
    "incoming",
    index,
    verticalPositions(visibleIncoming.length, height)[index],
  ))
  const outgoingNodes = visibleOutgoing.map((group, index) => nodeForRef(
    model,
    group.to,
    "outgoing",
    index,
    verticalPositions(visibleOutgoing.length, height)[index],
  ))

  const incomingEdges = visibleIncoming.map((group, index): EcosystemGraphEdge => {
    const geometry = edgePath(incomingNodes[index], focalNode)
    return {
      id: `edge:incoming:${index}`,
      relationshipIds: group.relationships.map((relationship) => relationship.id).sort(),
      sourceNodeId: incomingNodes[index].id,
      targetNodeId: focalNode.id,
      mode: group.relationships[0].mode,
      label: groupLabel(model, group),
      intensity: maximumIntensity(group.relationships),
      confidence: strongestConfidence(group.relationships),
      evidenceIds: [...new Set(group.relationships.flatMap((relationship) => relationship.evidenceIds))].sort(),
      ...geometry,
    }
  })
  const outgoingEdges = visibleOutgoing.map((group, index): EcosystemGraphEdge => {
    const geometry = edgePath(focalNode, outgoingNodes[index])
    return {
      id: `edge:outgoing:${index}`,
      relationshipIds: group.relationships.map((relationship) => relationship.id).sort(),
      sourceNodeId: focalNode.id,
      targetNodeId: outgoingNodes[index].id,
      mode: group.relationships[0].mode,
      label: groupLabel(model, group),
      intensity: maximumIntensity(group.relationships),
      confidence: strongestConfidence(group.relationships),
      evidenceIds: [...new Set(group.relationships.flatMap((relationship) => relationship.evidenceIds))].sort(),
      ...geometry,
    }
  })

  return {
    width: CANVAS_WIDTH,
    height,
    nodes: [...incomingNodes, focalNode, ...outgoingNodes],
    edges: [...incomingEdges, ...outgoingEdges],
    omitted: {
      incoming: Math.max(0, incomingGroups.length - visibleIncoming.length),
      outgoing: Math.max(0, outgoingGroups.length - visibleOutgoing.length),
    },
  }
}
