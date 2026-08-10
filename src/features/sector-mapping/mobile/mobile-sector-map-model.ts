import { buildEcosystemProjection, type SectorMap } from "../model"
import {
  layoutEcosystemGraph,
  type EcosystemGraphEdge,
  type EcosystemGraphMode,
  type EcosystemGraphNode,
} from "../ecosystem-desktop/ecosystem-layout"

export interface MobileEcosystemRelation {
  id: string
  node: EcosystemGraphNode
  label: string
  intensity: 1 | 2 | 3 | null
  confidence: EcosystemGraphEdge["confidence"]
  relationshipIds: string[]
}

export interface MobileEcosystemLayout {
  focal: EcosystemGraphNode
  incoming: MobileEcosystemRelation[]
  outgoing: MobileEcosystemRelation[]
  hiddenIncoming: number
  hiddenOutgoing: number
  summary: ReturnType<typeof buildEcosystemProjection>["summary"]
}

const MOBILE_RELATION_LIMIT = 2

function relationLabel(edge: EcosystemGraphEdge, node: EcosystemGraphNode) {
  return edge.label ?? (edge.mode === "influence" ? node.eyebrow : "flux direct")
}

function relationForEdge(
  edge: EcosystemGraphEdge,
  nodesById: Map<string, EcosystemGraphNode>,
  side: "incoming" | "outgoing",
): MobileEcosystemRelation | null {
  const nodeId = side === "incoming" ? edge.sourceNodeId : edge.targetNodeId
  const node = nodesById.get(nodeId)
  if (!node) return null

  return {
    id: edge.id,
    node,
    label: relationLabel(edge, node),
    intensity: edge.intensity,
    confidence: edge.confidence,
    relationshipIds: edge.relationshipIds,
  }
}

/**
 * Réduit la projection relationnelle canonique en ego graph mobile.
 * Le classement et l'agrégation restent ceux du layout déterministe desktop,
 * mais seuls les deux voisins les plus utiles de chaque côté sont exposés.
 */
export function buildMobileEcosystemLayout(
  model: SectorMap,
  activityId: string,
  mode: EcosystemGraphMode,
): MobileEcosystemLayout {
  const projection = buildEcosystemProjection(model, activityId, mode)
  const graph = layoutEcosystemGraph(model, projection)
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))
  const focal = graph.nodes.find((node) => node.side === "focal")

  if (!focal) {
    throw new Error(`Aucun maillon focal pour l'activité ${activityId}`)
  }

  const incoming = graph.edges
    .filter((edge) => edge.targetNodeId === focal.id)
    .map((edge) => relationForEdge(edge, nodesById, "incoming"))
    .filter((relation): relation is MobileEcosystemRelation => Boolean(relation))
  const outgoing = graph.edges
    .filter((edge) => edge.sourceNodeId === focal.id)
    .map((edge) => relationForEdge(edge, nodesById, "outgoing"))
    .filter((relation): relation is MobileEcosystemRelation => Boolean(relation))

  return {
    focal,
    incoming: incoming.slice(0, MOBILE_RELATION_LIMIT),
    outgoing: outgoing.slice(0, MOBILE_RELATION_LIMIT),
    hiddenIncoming: Math.max(0, incoming.length - MOBILE_RELATION_LIMIT) + graph.omitted.incoming,
    hiddenOutgoing: Math.max(0, outgoing.length - MOBILE_RELATION_LIMIT) + graph.omitted.outgoing,
    summary: projection.summary,
  }
}
