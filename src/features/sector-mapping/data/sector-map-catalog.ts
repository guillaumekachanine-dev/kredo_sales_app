import type { Database } from "@/types/database"
import { normalizeSectorMap, type SectorMap, type SectorMapConfidence, type SectorMapPortfolioStatus, type SectorMapRef } from "../model"

type SectorMapTargetRef = Exclude<SectorMapRef, { kind: "entity" }>

type SectorRow = Pick<
  Database["public"]["Tables"]["sector_intelligence"]["Row"],
  "id" | "slug" | "name" | "updated_at"
>

type NodeRow = Pick<
  Database["public"]["Tables"]["value_chain_nodes"]["Row"],
  | "id"
  | "sector_id"
  | "couche"
  | "maillon"
  | "rang"
  | "label"
  | "description"
  | "capture_valeur"
  | "capture_justification"
  | "confiance"
  | "updated_at"
>

export type SectorMapActorRow = Pick<
  Database["public"]["Tables"]["value_chain_actors"]["Row"],
  "id" | "node_id" | "company_id" | "nom" | "role" | "poids" | "source" | "confiance" | "updated_at"
> & {
  company?: { lifecycle_status: string | null } | null
}

type LinkRow = Pick<
  Database["public"]["Tables"]["value_chain_links"]["Row"],
  "id" | "node_amont" | "node_aval" | "nature" | "intensite" | "libelle" | "created_at"
>

export interface SectorMapDatabaseRows {
  sectors: SectorRow[]
  nodes: NodeRow[]
  actors: SectorMapActorRow[]
  links: LinkRow[]
}

export interface SectorMapCatalogSector {
  id: string
  slug: string
  name: string
}

export interface SectorMapCatalogAccount {
  id: string
  companyId: string
  name: string
  sectorId: string
  sectorName: string
  initialActivityId: string
}

export interface SectorMapCatalog {
  state: "ready" | "empty" | "error"
  maps: SectorMap[]
  sectors: SectorMapCatalogSector[]
  accounts: SectorMapCatalogAccount[]
  generatedAt: string
}


const LAYER_DEFINITIONS = {
  prescripteur: { kind: "regulation", label: "Prescripteurs & régulation", order: 1 },
  financeur: { kind: "funding", label: "Financeurs", order: 2 },
  technologie: { kind: "technology", label: "Technologies & outils", order: 3 },
} as const

function confidence(value: string | null): SectorMapConfidence {
  if (value === "haute") return "high"
  if (value === "moyenne") return "medium"
  if (value === "faible") return "low"
  return "unknown"
}

function portfolioStatus(actor: SectorMapActorRow): SectorMapPortfolioStatus {
  if (!actor.company_id) return "external"
  if (actor.company?.lifecycle_status === "client") return "client"
  if (actor.company?.lifecycle_status === "pair_partenaire") return "peer_partner"
  return "prospect"
}

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase("fr")
}

function evidenceUrl(value: string | null) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? value : undefined
  } catch {
    return undefined
  }
}

function dateOnly(value: string) {
  return value.slice(0, 10)
}

function clampIntensity(value: number): 1 | 2 | 3 {
  if (value <= 1) return 1
  if (value >= 3) return 3
  return 2
}

function relationshipLabel(link: LinkRow) {
  if (link.nature === "prescrit") return "prescrit"
  if (link.nature === "finance") return "finance"
  if (link.nature === "outille") return "outille"
  const label = link.libelle?.trim()
  return label && label.length <= 52 ? label : undefined
}

function relationshipMode(link: LinkRow): "main" | "influence" {
  return link.nature === "fournit" ? "main" : "influence"
}

function layerRef(node: NodeRow): SectorMapTargetRef | null {
  if (node.couche === "chaine") return { kind: "activity", id: node.id }
  if (node.couche in LAYER_DEFINITIONS) return { kind: "ecosystemLayer", id: node.id }
  return null
}

function buildSectorMap(
  sector: SectorRow,
  allNodes: NodeRow[],
  allActors: SectorMapActorRow[],
  allLinks: LinkRow[],
) {
  const nodes = allNodes.filter((node) => node.sector_id === sector.id)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const actors = allActors.filter((actor) => nodeIds.has(actor.node_id))
  const links = allLinks.filter((link) => nodeIds.has(link.node_amont) && nodeIds.has(link.node_aval))
  const chainNodes = nodes.filter((node) => node.couche === "chaine" && node.maillon !== null)
  if (chainNodes.length === 0) return null

  const STAGE_LABELS = [
    "Amont & ressources",
    "Transformation",
    "Intégration & réalisation",
    "Mise sur le marché",
    "Usage & client final",
  ] as const

  const STAGE_EXTRA_LABELS: Record<number, string> = {
    6: "Suivi aval & services",
    7: "Recyclage & valorisation",
  }

  const maxStageOrder = Math.max(
    STAGE_LABELS.length,
    ...chainNodes.map((node) => (typeof node.maillon === "number" && node.maillon >= 1 ? node.maillon : 1)),
  )

  const stages = Array.from({ length: maxStageOrder }, (_, index) => {
    const order = index + 1
    const label = STAGE_LABELS[index] ?? STAGE_EXTRA_LABELS[order] ?? `Étape ${order}`
    return {
      id: `${sector.id}:stage:${order}`,
      label,
      order,
    }
  })

  const activities = chainNodes.map((node) => {
    const maillonOrder = typeof node.maillon === "number" && node.maillon >= 1 ? node.maillon : 1
    return {
      id: node.id,
      stageId: `${sector.id}:stage:${maillonOrder}`,
      label: node.label,
      order: node.rang,
    }
  })
  const ecosystemLayers = nodes.flatMap((node) => {
    if (!(node.couche in LAYER_DEFINITIONS)) return []
    const definition = LAYER_DEFINITIONS[node.couche as keyof typeof LAYER_DEFINITIONS]
    return [{
      id: node.id,
      label: node.label || definition.label,
      kind: definition.kind,
      order: definition.order * 100 + node.rang,
    }]
  })

  const entityByKey = new Map<string, SectorMap["entities"][number]>()
  const placementByKey = new Map<string, SectorMap["placements"][number]>()
  const evidence = new Map<string, SectorMap["evidence"][number]>()
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const companyActorByName = new Map(
    actors
      .filter((actor) => actor.company_id)
      .map((actor) => [normalizedName(actor.nom), actor]),
  )

  nodes.forEach((node) => {
    const nodeEvidenceId = `node:${node.id}`
    evidence.set(nodeEvidenceId, {
      id: nodeEvidenceId,
      label: `Analyse · ${node.label}`,
      date: dateOnly(node.updated_at),
      excerpt: node.capture_justification ?? node.description ?? undefined,
    })
  })

  actors.forEach((actor, actorIndex) => {
    const node = nodeById.get(actor.node_id)
    const target = node ? layerRef(node) : null
    if (!target) return

    const linkedActor = actor.company_id ? actor : companyActorByName.get(normalizedName(actor.nom))
    const linkedCompanyId = linkedActor?.company_id ?? null
    const entityKey = linkedCompanyId ? `company:${linkedCompanyId}` : `external:${normalizedName(actor.nom)}`
    const existingEntity = entityByKey.get(entityKey)
    if (!existingEntity) {
      entityByKey.set(entityKey, {
        id: entityKey,
        companyId: linkedCompanyId ?? undefined,
        name: linkedActor?.nom ?? actor.nom,
        status: portfolioStatus(linkedActor ?? actor),
      })
    }

    const actorEvidenceId = `actor:${actor.id}`
    const sourceUrl = evidenceUrl(actor.source)
    evidence.set(actorEvidenceId, {
      id: actorEvidenceId,
      label: actor.source && !sourceUrl ? actor.source : `Placement · ${actor.nom}`,
      url: sourceUrl,
      date: dateOnly(actor.updated_at),
      excerpt: [actor.role, actor.poids ? `Poids ${actor.poids}` : null].filter(Boolean).join(" · ") || undefined,
    })

    const placementKey = `${entityKey}:${target.kind}:${target.id}`
    const existingPlacement = placementByKey.get(placementKey)
    if (existingPlacement) {
      if (!existingPlacement.evidenceIds.includes(actorEvidenceId)) existingPlacement.evidenceIds.push(actorEvidenceId)
      return
    }
    placementByKey.set(placementKey, {
      id: `placement:${actor.id}`,
      entityId: entityKey,
      target,
      order: actorIndex + 1,
      priorityOpportunity: false,
      evidenceIds: [actorEvidenceId],
    })
  })

  links.forEach((link) => {
    evidence.set(`link:${link.id}`, {
      id: `link:${link.id}`,
      label: `Relation · ${link.nature}`,
      date: dateOnly(link.created_at),
      excerpt: link.libelle ?? undefined,
    })
  })

  const entities = [...entityByKey.values()]
  const placements = [...placementByKey.values()]
  const metrics: SectorMap["metrics"] = nodes.flatMap((node) => {
    const subject = layerRef(node)
    if (!subject) return []
    const placedEntityIds = new Set(
      placements
        .filter((placement) => placement.target.kind === subject.kind && placement.target.id === subject.id)
        .map((placement) => placement.entityId),
    )
    const coverage = {
      id: `coverage:${node.id}`,
      kind: "kredo_coverage" as const,
      subject,
      total: placedEntityIds.size,
      confidence: confidence(node.confiance),
      evidenceIds: [`node:${node.id}`],
    }
    if (subject.kind === "ecosystemLayer") return [coverage]
    return [
      {
        id: `capture:${node.id}`,
        kind: "value_capture" as const,
        subject,
        value: node.capture_valeur === 1 || node.capture_valeur === 2 || node.capture_valeur === 3
          ? node.capture_valeur
          : null,
        confidence: confidence(node.confiance),
        evidenceIds: [`node:${node.id}`],
      },
      coverage,
    ]
  })

  const relationships = links.flatMap((link) => {
    const fromNode = nodeById.get(link.node_amont)
    const toNode = nodeById.get(link.node_aval)
    const from = fromNode ? layerRef(fromNode) : null
    const to = toNode ? layerRef(toNode) : null
    if (!from || !to) return []
    return [{
      id: link.id,
      from,
      to,
      mode: relationshipMode(link),
      label: relationshipLabel(link),
      intensity: clampIntensity(link.intensite),
      confidence: "unknown" as const,
      evidenceIds: [`link:${link.id}`],
    }]
  })

  const preferredDefault = [...chainNodes]
    .sort((left, right) => (left.maillon ?? 99) - (right.maillon ?? 99) || left.rang - right.rang)
    .find((node) => node.maillon === 3) ?? chainNodes[0]
  const dates = [sector.updated_at, ...nodes.map((node) => node.updated_at), ...actors.map((actor) => actor.updated_at)]
    .filter(Boolean)
    .sort()

  return normalizeSectorMap({
    sector: {
      id: sector.id,
      slug: sector.slug,
      name: sector.name,
      asOf: dateOnly(dates.at(-1) ?? sector.updated_at),
      defaultActivityId: preferredDefault.id,
    },
    stages,
    activities,
    entities,
    placements,
    relationships,
    ecosystemLayers,
    metrics,
    evidence: [...evidence.values()],
  })
}

export function buildSectorMapCatalog(
  rows: SectorMapDatabaseRows,
  generatedAt = new Date().toISOString(),
): SectorMapCatalog {
  const maps = rows.sectors
    .map((sector) => buildSectorMap(sector, rows.nodes, rows.actors, rows.links))
    .filter((map): map is SectorMap => Boolean(map))
    .sort((left, right) => left.sector.name.localeCompare(right.sector.name, "fr"))

  const accounts = maps.flatMap((map) => map.entities.flatMap((entity) => {
    if (!entity.companyId) return []
    const firstPlacement = map.placements.find((placement) => (
      placement.entityId === entity.id && placement.target.kind === "activity"
    ))
    if (!firstPlacement || firstPlacement.target.kind !== "activity") return []
    return [{
      id: `${map.sector.id}:${entity.companyId}`,
      companyId: entity.companyId,
      name: entity.name,
      sectorId: map.sector.id,
      sectorName: map.sector.name,
      initialActivityId: firstPlacement.target.id,
    }]
  })).sort((left, right) => left.name.localeCompare(right.name, "fr"))

  return {
    state: maps.length > 0 ? "ready" : "empty",
    maps,
    sectors: maps.map((map) => ({ id: map.sector.id, slug: map.sector.slug, name: map.sector.name })),
    accounts,
    generatedAt,
  }
}

export function emptySectorMapCatalog(state: "empty" | "error" = "empty"): SectorMapCatalog {
  return { state, maps: [], sectors: [], accounts: [], generatedAt: new Date().toISOString() }
}
