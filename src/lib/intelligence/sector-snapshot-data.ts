import { createClient } from "@/lib/supabase/server"
import {
  buildClientIntelligenceSectorView,
  type ClientIntelligenceSectorView,
  type SectorCompanySource,
  type SectorEventSource,
  type SectorPainPointSource,
  type SectorRegulatorySource,
} from "@/lib/intelligence/client-intelligence-sector"

// ADR-0012 Lot 3 — lecture déterministe et mutualisée de l'intelligence
// sectorielle. La transformation éditoriale reste pure dans
// client-intelligence-sector.ts ; ce module ne fait que lire les sources.
export type SectorSnapshotView = ClientIntelligenceSectorView
export type SectorSnapshotRegulatoryItem = {
  id: string
  name?: string
  title?: string
  authority: string | null
  description: string | null
  deadlineDate: string | null
  urgency: string
  kredoPractice: string | null
  commercialAngle: string | null
  isCommercialWindow: boolean
  sourceUrl: string | null
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
  key_players_paca: unknown
  key_players_national: unknown
}

type SectorSnapshotOptions = {
  currentCompanyId: string
  currentSectorAnalysis: unknown
}

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function getSectorSnapshot(
  sectorId: string,
  options: SectorSnapshotOptions,
): Promise<SectorSnapshotView | null> {
  const supabase = await createClient()

  const [sectorResult, painPointsResult, regulatoryResult, eventsResult, companiesResult] = await Promise.all([
    supabase
      .from("sector_intelligence")
      .select("id,name,slug,description,status,attractiveness_score,market_size_eur_bn,market_growth_pct,key_players_paca,key_players_national")
      .eq("id", sectorId)
      .maybeSingle<SectorIntelligenceRow>(),
    supabase
      .from("sector_pain_points")
      .select("id,title,description,frequency_count,source_company_ids,kredo_practice")
      .eq("sector_id", sectorId)
      .order("frequency_count", { ascending: false }),
    supabase
      .from("sector_regulatory_items")
      .select("id,name,authority,description,deadline_date,urgency,kredo_practice,commercial_angle,is_commercial_window,source_url")
      .eq("sector_id", sectorId),
    supabase
      .from("sector_events")
      .select("id,title,event_type,description,event_date,source_url,commercial_opportunity")
      .eq("sector_id", sectorId),
    supabase
      .from("companies")
      .select("id,name,legal_name,segment,metadata")
      .eq("sector_id", sectorId)
      .order("name", { ascending: true }),
  ])

  const sector = sectorResult.data
  if (!sector) return null

  const companies: SectorCompanySource[] = (companiesResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    segment: row.segment,
    metadata: row.metadata,
  }))
  const painPoints: SectorPainPointSource[] = (painPointsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    frequencyCount: row.frequency_count ?? 0,
    sourceCompanyIds: Array.isArray(row.source_company_ids) ? row.source_company_ids : [],
    kredoPractice: row.kredo_practice,
  }))
  const regulatoryItems: SectorRegulatorySource[] = (regulatoryResult.data ?? []).map((row) => ({
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
  const events: SectorEventSource[] = (eventsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    description: row.description,
    eventDate: row.event_date,
    sourceUrl: row.source_url,
    commercialOpportunity: row.commercial_opportunity,
  }))

  return buildClientIntelligenceSectorView({
    sector: {
      id: sector.id,
      name: sector.name,
      slug: sector.slug,
      description: sector.description,
      status: sector.status,
      attractivenessScore: toNumber(sector.attractiveness_score),
      marketSizeEurBn: toNumber(sector.market_size_eur_bn),
      marketGrowthPct: toNumber(sector.market_growth_pct),
      keyPlayersPaca: sector.key_players_paca,
      keyPlayersNational: sector.key_players_national,
    },
    currentCompanyId: options.currentCompanyId,
    currentSectorAnalysis: options.currentSectorAnalysis,
    companies,
    painPoints,
    regulatoryItems,
    events,
  })
}
