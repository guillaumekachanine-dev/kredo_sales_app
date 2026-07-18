import { createClient } from "@/lib/supabase/server"

// ─────────────────────────────────────────────────────────────────────────────
//  ADR-0012 Lot 3 — Intelligence sectorielle, étape 2 de la chaîne de décision.
//
//  Déterministe par construction (D-6, 0 token) : lecture live des tables
//  sector_* pour le sector_id du compte, aucun LLM, aucun cache — le volume de
//  données par secteur (5-8 pain points, 3-5 items réglementaires, 5 events)
//  ne justifie pas une couche de cache à ce stade. Mutualisé : un secteur est
//  lu une fois par compte qui le porte, jamais dupliqué par compte (D-6).
// ─────────────────────────────────────────────────────────────────────────────

export type SectorSnapshotPainPoint = {
  id: string
  title: string
  description: string | null
  frequencyCount: number
  kredoPractice: string | null
}

export type SectorSnapshotRegulatoryItem = {
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
}

export type SectorSnapshotEvent = {
  id: string
  title: string
  eventType: string
  eventDate: string | null
  commercialOpportunity: string | null
}

export type SectorSnapshotNewsItem = {
  id: string
  title: string
  summary: string | null
  publishedAt: string | null
  isTriggerEvent: boolean
}

export type SectorSnapshotPlaybook = {
  personas: unknown[]
  objections: unknown[]
  entryPoints: unknown[]
  roiArguments: unknown[]
}

export type SectorSnapshotView = {
  sectorId: string
  name: string
  slug: string
  description: string | null
  status: string
  attractivenessScore: number | null
  marketSizeEurBn: number | null
  marketGrowthPct: number | null
  digitalMaturity: string | null
  practicesFit: Record<string, number>
  playbook: SectorSnapshotPlaybook
  painPoints: SectorSnapshotPainPoint[]
  regulatoryItems: SectorSnapshotRegulatoryItem[]
  events: SectorSnapshotEvent[]
  news: SectorSnapshotNewsItem[]
  // Dérivé (pas stocké) : fenêtres commerciales ouvertes = items réglementaires
  // marqués is_commercial_window + actualités marquées is_trigger_event.
  openCommercialWindows: string[]
  exposedAccountsCount: number
}

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

type SectorIntelligenceRow = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  attractiveness_score: number | string | null
  market_size_eur_bn: number | string | null
  market_growth_pct: number | string | null
  digital_maturity: string | null
  practices_fit: Record<string, number> | null
  playbook: { personas?: unknown[]; objections?: unknown[]; entry_points?: unknown[]; roi_arguments?: unknown[] } | null
}

export async function getSectorSnapshot(sectorId: string): Promise<SectorSnapshotView | null> {
  const supabase = await createClient()

  const [sectorResult, painPointsResult, regulatoryResult, eventsResult, newsResult, exposedCountResult] = await Promise.all([
    supabase
      .from("sector_intelligence")
      .select("id,name,slug,description,status,attractiveness_score,market_size_eur_bn,market_growth_pct,digital_maturity,practices_fit,playbook")
      .eq("id", sectorId)
      .maybeSingle<SectorIntelligenceRow>(),
    supabase
      .from("sector_pain_points")
      .select("id,title,description,frequency_count,kredo_practice")
      .eq("sector_id", sectorId)
      .order("frequency_count", { ascending: false })
      .limit(10),
    supabase
      .from("sector_regulatory_items")
      .select("id,name,authority,description,deadline_date,urgency,kredo_practice,commercial_angle,is_commercial_window,source_url")
      .eq("sector_id", sectorId)
      .order("deadline_date", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("sector_events")
      .select("id,title,event_type,event_date,commercial_opportunity")
      .eq("sector_id", sectorId)
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("sector_news")
      .select("id,title,summary,published_at,is_trigger_event")
      .eq("sector_id", sectorId)
      .order("published_at", { ascending: false })
      .limit(8),
    supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("sector_id", sectorId),
  ])

  const sector = sectorResult.data
  if (!sector) return null

  const painPoints: SectorSnapshotPainPoint[] = (painPointsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    frequencyCount: row.frequency_count ?? 0,
    kredoPractice: row.kredo_practice,
  }))

  const regulatoryItems: SectorSnapshotRegulatoryItem[] = (regulatoryResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    authority: row.authority,
    description: row.description,
    deadlineDate: row.deadline_date,
    urgency: row.urgency,
    kredoPractice: row.kredo_practice,
    commercialAngle: row.commercial_angle,
    isCommercialWindow: Boolean(row.is_commercial_window),
    sourceUrl: row.source_url,
  }))

  const events: SectorSnapshotEvent[] = (eventsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    eventDate: row.event_date,
    commercialOpportunity: row.commercial_opportunity,
  }))

  const news: SectorSnapshotNewsItem[] = (newsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    publishedAt: row.published_at,
    isTriggerEvent: Boolean(row.is_trigger_event),
  }))

  const openCommercialWindows = [
    ...regulatoryItems.filter((r) => r.isCommercialWindow).map((r) => r.name),
    ...news.filter((n) => n.isTriggerEvent).map((n) => n.title),
  ]

  const playbookRaw = sector.playbook ?? {}

  return {
    sectorId: sector.id,
    name: sector.name,
    slug: sector.slug,
    description: sector.description,
    status: sector.status,
    attractivenessScore: toNumber(sector.attractiveness_score),
    marketSizeEurBn: toNumber(sector.market_size_eur_bn),
    marketGrowthPct: toNumber(sector.market_growth_pct),
    digitalMaturity: sector.digital_maturity,
    practicesFit: sector.practices_fit ?? {},
    playbook: {
      personas: playbookRaw.personas ?? [],
      objections: playbookRaw.objections ?? [],
      entryPoints: playbookRaw.entry_points ?? [],
      roiArguments: playbookRaw.roi_arguments ?? [],
    },
    painPoints,
    regulatoryItems,
    events,
    news,
    openCommercialWindows,
    exposedAccountsCount: exposedCountResult.count ?? 0,
  }
}
