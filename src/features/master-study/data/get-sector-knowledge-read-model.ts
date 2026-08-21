import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// "estimated" (ADR-0021, amendement 2026-08-21) : la valeur est bien celle du
// segment, jamais héritée du macro, mais elle provient d'une triangulation
// (décomposition d'une source officielle sourcée), pas d'une publication
// directe et propre — distinct de "segment" pour que l'UI l'affiche avec sa
// provenance réelle plutôt que de laisser croire à un chiffre publié tel quel.
export type SectorResolvedLevel = "segment" | "macro" | "locked" | "estimated"

export type SectorKnowledgePainPointItem = {
  id: string
  title: string
  description: string | null
  frequencyCount: number
  kredoPractice: string | null
  verbatim: string | null
  sourceCompanyIds: string[]
  resolvedLevel: "segment" | "macro"
}

export type SectorKnowledgeEventItem = {
  id: string
  title: string
  description: string | null
  eventType: string
  eventDate: string | null
  eventStatus: string
  sourceUrl: string | null
  commercialOpportunity: string | null
  resolvedLevel: "segment" | "macro"
  createdAt: string | null
  updatedAt: string | null
}

export type SectorKnowledgeNewsItem = {
  id: string
  title: string
  source: string | null
  url: string | null
  summary: string | null
  publishedAt: string | null
  relevanceScore: number | null
  isTriggerEvent: boolean
  resolvedLevel: "segment" | "macro"
}

export type SectorKnowledgeRegulatoryItem = {
  id: string
  name: string
  authority: string | null
  description: string | null
  deadlineDate: string | null
  urgency: string
  kredoPractice: string | null
  commercialAngle: string | null
  isCommercialWindow: boolean
  sourceUrl: string | null
  resolvedLevel: "segment" | "macro"
  createdAt: string | null
  updatedAt: string | null
}

export type SectorKnowledgeItemsGroup = {
  painPoints: SectorKnowledgePainPointItem[]
  events: SectorKnowledgeEventItem[]
  news: SectorKnowledgeNewsItem[]
  regulatory: SectorKnowledgeRegulatoryItem[]
}

export type SectorKnowledgeReadModel = {
  segmentId: string
  segmentName: string
  segmentSlug: string
  segmentStatus: string
  macroId: string | null
  macroName: string | null
  macroSlug: string | null
  macroStatus: string | null
  description: string | null
  descriptionLevel: SectorResolvedLevel
  attractivenessScore: number | null
  attractivenessScoreLevel: SectorResolvedLevel
  marketSizeEurBn: number | null
  marketSizeEurBnLevel: SectorResolvedLevel
  marketGrowthPct: number | null
  marketGrowthPctLevel: SectorResolvedLevel
  playbook: Record<string, unknown> | null
  playbookLevel: "segment" | "macro"
  practicesFit: Record<string, unknown> | null
  practicesFitLevel: "segment" | "macro"
  keyPlayersPaca: unknown
  keyPlayersNational: unknown
  hasSegmentKnowledge: boolean
  digitalMaturity: string | null
  avgTjmMin: number | null
  avgTjmMax: number | null
  caveats: unknown
  sourceRunId: string | null
  studySnapshotDate: string | null
  effectiveStatus: string

  items: SectorKnowledgeItemsGroup
  painPoints: SectorKnowledgePainPointItem[]
  events: SectorKnowledgeEventItem[]
  news: SectorKnowledgeNewsItem[]
  regulatory: SectorKnowledgeRegulatoryItem[]
}

type SectorKnowledgeResolvedRow = {
  segment_id: string
  segment_name: string
  segment_slug: string
  segment_status: string
  macro_id: string | null
  macro_name: string | null
  macro_slug: string | null
  macro_status: string | null
  description: string | null
  description_level: string | null
  attractiveness_score: number | string | null
  attractiveness_score_level: string | null
  market_size_eur_bn: number | string | null
  market_size_eur_bn_level: string | null
  market_growth_pct: number | string | null
  market_growth_pct_level: string | null
  playbook: unknown
  playbook_level: string | null
  practices_fit: unknown
  practices_fit_level: string | null
  key_players_paca: unknown
  key_players_national: unknown
  has_segment_knowledge: boolean | null
  digitalMaturity?: string | null
  digital_maturity?: string | null
  avg_tjm_min?: number | string | null
  avg_tjm_max?: number | string | null
  caveats?: unknown
  source_run_id?: string | null
  study_snapshot_date?: string | null
  workspace_id?: string | null
}

type SectorKnowledgeItemRow = {
  item_kind: string
  item_id: string
  resolved_level: string | null
  title: string
  description: string | null
  source_url: string | null
  authority: string | null
  kredo_practice: string | null
  commercial_angle: string | null
  is_commercial_window: boolean | null
  deadline_date: string | null
  urgency: string | null
  event_type: string | null
  event_date: string | null
  event_status: string | null
  published_at: string | null
  relevance_score: number | string | null
  is_trigger_event: boolean | null
  frequency_count: number | null
  source_company_ids: string[] | null
  verbatim: string | null
  commercial_opportunity: string | null
  news_source: string | null
  created_at: string | null
  updated_at: string | null
  segment_id: string
  macro_id: string | null
  source_sector_id: string | null
  workspace_id: string | null
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toResolvedLevel(value: string | null | undefined): "segment" | "macro" {
  return value === "segment" ? "segment" : "macro"
}

function toScalarLevel(value: string | null | undefined): SectorResolvedLevel {
  return value === "segment" || value === "locked" || value === "estimated" ? value : "macro"
}

/**
 * Lecture "liste" — un seul appel réseau par vue pour tous les segments demandés.
 * Utilisée par le chargement BI pour peupler `sectors`/`windows`, jamais un aller-retour par segment.
 *
 * RÈGLE NON NÉGOCIABLE : ne lit JAMAIS sector_intelligence, sector_pain_points, sector_events,
 * sector_news, sector_regulatory_items en table brute — uniquement v_sector_knowledge_resolved
 * et v_sector_knowledge_items.
 */
export async function getSectorKnowledgeReadModels(
  segmentIds: string[],
  options?: {
    supabase?: SupabaseClient<Database>
  },
): Promise<SectorKnowledgeReadModel[]> {
  const uniqueSegmentIds = Array.from(new Set(segmentIds.filter((id) => typeof id === "string" && id.trim().length > 0)))
  if (uniqueSegmentIds.length === 0) {
    return []
  }

  const supabase = options?.supabase ?? (await createClient())

  const [resolvedResult, itemsResult] = await Promise.all([
    supabase
      .from("v_sector_knowledge_resolved")
      .select("segment_id,segment_name,segment_slug,segment_status,macro_id,macro_name,macro_slug,macro_status,description,description_level,attractiveness_score,attractiveness_score_level,market_size_eur_bn,market_size_eur_bn_level,market_growth_pct,market_growth_pct_level,playbook,playbook_level,practices_fit,practices_fit_level,key_players_paca,key_players_national,has_segment_knowledge,digital_maturity,avg_tjm_min,avg_tjm_max,caveats,source_run_id,study_snapshot_date,workspace_id")
      .in("segment_id", uniqueSegmentIds),
    supabase
      .from("v_sector_knowledge_items")
      .select("item_kind,item_id,resolved_level,title,description,source_url,authority,kredo_practice,commercial_angle,is_commercial_window,deadline_date,urgency,event_type,event_date,event_status,published_at,relevance_score,is_trigger_event,frequency_count,source_company_ids,verbatim,commercial_opportunity,news_source,created_at,updated_at,segment_id,macro_id,source_sector_id,workspace_id")
      .in("segment_id", uniqueSegmentIds),
  ])

  if (resolvedResult.error) {
    throw new Error(`Failed to query v_sector_knowledge_resolved: ${resolvedResult.error.message}`)
  }
  if (itemsResult.error) {
    throw new Error(`Failed to query v_sector_knowledge_items: ${itemsResult.error.message}`)
  }

  const resolvedRows = (resolvedResult.data ?? []) as SectorKnowledgeResolvedRow[]
  const itemRows = (itemsResult.data ?? []) as SectorKnowledgeItemRow[]

  const itemsBySegmentId = new Map<string, SectorKnowledgeItemRow[]>()
  for (const item of itemRows) {
    if (!item.segment_id) continue
    const current = itemsBySegmentId.get(item.segment_id) ?? []
    current.push(item)
    itemsBySegmentId.set(item.segment_id, current)
  }

  return resolvedRows.map((resolved) => {
    const rawItems = itemsBySegmentId.get(resolved.segment_id) ?? []

    const painPoints: SectorKnowledgePainPointItem[] = rawItems
      .filter((row) => row.item_kind === "pain_point")
      .map((row) => ({
        id: row.item_id,
        title: row.title,
        description: row.description,
        frequencyCount: row.frequency_count ?? 0,
        kredoPractice: row.kredo_practice,
        verbatim: row.verbatim,
        sourceCompanyIds: Array.isArray(row.source_company_ids) ? row.source_company_ids : [],
        resolvedLevel: toResolvedLevel(row.resolved_level),
      }))
      .sort((left, right) => right.frequencyCount - left.frequencyCount)

    const regulatory: SectorKnowledgeRegulatoryItem[] = rawItems
      .filter((row) => row.item_kind === "regulatory")
      .map((row) => ({
        id: row.item_id,
        name: row.title,
        authority: row.authority,
        description: row.description,
        deadlineDate: row.deadline_date,
        urgency: row.urgency ?? "normal",
        kredoPractice: row.kredo_practice,
        commercialAngle: row.commercial_angle,
        isCommercialWindow: Boolean(row.is_commercial_window),
        sourceUrl: row.source_url,
        resolvedLevel: toResolvedLevel(row.resolved_level),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))

    const events: SectorKnowledgeEventItem[] = rawItems
      .filter((row) => row.item_kind === "event")
      .map((row) => ({
        id: row.item_id,
        title: row.title,
        description: row.description,
        eventType: row.event_type ?? "autre",
        eventDate: row.event_date,
        eventStatus: row.event_status ?? "pending",
        sourceUrl: row.source_url,
        commercialOpportunity: row.commercial_opportunity,
        resolvedLevel: toResolvedLevel(row.resolved_level),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))

    const news: SectorKnowledgeNewsItem[] = rawItems
      .filter((row) => row.item_kind === "news")
      .map((row) => ({
        id: row.item_id,
        title: row.title,
        source: row.news_source ?? row.authority ?? null,
        url: row.source_url,
        summary: row.description,
        publishedAt: row.published_at,
        relevanceScore: toNumber(row.relevance_score),
        isTriggerEvent: Boolean(row.is_trigger_event),
        resolvedLevel: toResolvedLevel(row.resolved_level),
      }))

    const playbookLevel = toResolvedLevel(resolved.playbook_level)
    const effectiveStatus =
      playbookLevel === "segment"
        ? resolved.segment_status ?? "development"
        : resolved.macro_status ?? resolved.segment_status ?? "development"

    const itemsGroup: SectorKnowledgeItemsGroup = {
      painPoints,
      events,
      news,
      regulatory,
    }

    return {
      segmentId: resolved.segment_id,
      segmentName: resolved.segment_name,
      segmentSlug: resolved.segment_slug,
      segmentStatus: resolved.segment_status ?? "development",
      macroId: resolved.macro_id,
      macroName: resolved.macro_name,
      macroSlug: resolved.macro_slug,
      macroStatus: resolved.macro_status,
      description: resolved.description,
      descriptionLevel: toResolvedLevel(resolved.description_level),
      attractivenessScore: toNumber(resolved.attractiveness_score),
      attractivenessScoreLevel: toScalarLevel(resolved.attractiveness_score_level),
      marketSizeEurBn: toNumber(resolved.market_size_eur_bn),
      marketSizeEurBnLevel: toScalarLevel(resolved.market_size_eur_bn_level),
      marketGrowthPct: toNumber(resolved.market_growth_pct),
      marketGrowthPctLevel: toScalarLevel(resolved.market_growth_pct_level),
      playbook: (resolved.playbook && typeof resolved.playbook === "object" ? (resolved.playbook as Record<string, unknown>) : null),
      playbookLevel,
      practicesFit: (resolved.practices_fit && typeof resolved.practices_fit === "object" ? (resolved.practices_fit as Record<string, unknown>) : null),
      practicesFitLevel: toResolvedLevel(resolved.practices_fit_level),
      keyPlayersPaca: resolved.key_players_paca,
      keyPlayersNational: resolved.key_players_national,
      hasSegmentKnowledge: Boolean(resolved.has_segment_knowledge),
      digitalMaturity: resolved.digital_maturity ?? resolved.digitalMaturity ?? null,
      avgTjmMin: toNumber(resolved.avg_tjm_min),
      avgTjmMax: toNumber(resolved.avg_tjm_max),
      caveats: resolved.caveats,
      sourceRunId: resolved.source_run_id ?? null,
      studySnapshotDate: resolved.study_snapshot_date ?? null,
      effectiveStatus,

      items: itemsGroup,
      painPoints,
      events,
      news,
      regulatory,
    }
  })
}

/**
 * Lecture "détail" — un segment. Utilisée par SectorStudiesModal / MasterStudyReader
 * quand l'utilisateur ouvre une étude précise. Projection directe de getSectorKnowledgeReadModels.
 */
export async function getSectorKnowledgeReadModel(
  segmentId: string,
  options?: {
    supabase?: SupabaseClient<Database>
  },
): Promise<SectorKnowledgeReadModel | null> {
  const models = await getSectorKnowledgeReadModels([segmentId], options)
  return models[0] ?? null
}
