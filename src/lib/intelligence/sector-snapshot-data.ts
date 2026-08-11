import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  buildClientIntelligenceSectorView,
  type ClientIntelligenceSectorView,
  type SectorCompanySource,
  type SectorEventSource,
  type SectorPainPointSource,
  type SectorRegulatorySource,
  type SectorResolvedLevel,
} from "@/lib/intelligence/client-intelligence-sector"

// ADR-0012 Lot 3 — lecture déterministe et mutualisée de l'intelligence
// sectorielle. La transformation éditoriale reste pure dans
// client-intelligence-sector.ts ; ce module ne fait que lire les sources.
//
// Lot 0 « résolution sectorielle héritée » (migration 069) : la lecture se fait
// désormais à la maille SEGMENT, en héritant du macro parent quand le segment
// est vide. Rien n'est recopié en base — toute la résolution vit dans les deux
// vues `v_sector_knowledge_resolved` (substitution champ par champ) et
// `v_sector_knowledge_items` (union segment + macro). C'est le seul endroit où
// la logique d'héritage doit exister.
export type SectorSnapshotView = ClientIntelligenceSectorView

// En deçà de ce nombre de comptes dans le segment, la liste des « pairs » se
// replie sur le macro-secteur : trois comptes spatiaux comparés entre eux ne
// font pas une cartographie, mais les comparer à tout l'aéronautique n'en fait
// pas une non plus. Le seuil est bas et assumé ; `peersLevel` dit lequel des
// deux a été retenu.
export const PEER_SEGMENT_MIN = 3

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
  resolvedLevel: SectorResolvedLevel
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
  attractiveness_score: number | string | null
  market_size_eur_bn: number | string | null
  market_growth_pct: number | string | null
  key_players_paca: unknown
  key_players_national: unknown
  description_level: string
  playbook_level: string
  has_segment_knowledge: boolean
}

type SectorKnowledgeItemRow = {
  item_kind: string
  item_id: string
  resolved_level: string
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
  commercial_opportunity: string | null
  frequency_count: number | null
  source_company_ids: string[] | null
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

function toResolvedLevel(value: string | null | undefined): SectorResolvedLevel {
  return value === "segment" ? "segment" : "macro"
}

function toCompanySources(rows: Array<{ id: string; name: string; legal_name: string | null; segment: string | null; metadata: unknown }> | null): SectorCompanySource[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    segment: row.segment,
    metadata: row.metadata,
  }))
}

/**
 * @param segmentId `companies.segment_id` — la maille de lecture depuis le
 *   Lot 0. Passer un id de macro ne renvoie rien : `v_sector_knowledge_resolved`
 *   ne contient que des fiches de niveau `segment`.
 */
export async function getSectorSnapshot(
  segmentId: string,
  options: SectorSnapshotOptions,
): Promise<SectorSnapshotView | null> {
  const supabase = await createClient()

  const resolvedResult = await supabase
    .from("v_sector_knowledge_resolved")
    // Littéral d'un seul tenant : PostgREST infère le type de ligne en parsant
    // cette chaîne, une concaténation la rendrait opaque.
    .select("segment_id,segment_name,segment_slug,segment_status,macro_id,macro_name,macro_slug,macro_status,description,attractiveness_score,market_size_eur_bn,market_growth_pct,key_players_paca,key_players_national,description_level,playbook_level,has_segment_knowledge")
    .eq("segment_id", segmentId)
    .maybeSingle<SectorKnowledgeResolvedRow>()

  const resolved = resolvedResult.data
  if (!resolved) return null

  // Le macro parent est connu ici seulement : la liste de repli ne peut pas
  // partir dans la même vague que la fiche résolue.
  const [itemsResult, segmentCompaniesResult, macroCompaniesResult] = await Promise.all([
    supabase
      .from("v_sector_knowledge_items")
      .select("item_kind,item_id,resolved_level,title,description,source_url,authority,kredo_practice,commercial_angle,is_commercial_window,deadline_date,urgency,event_type,event_date,commercial_opportunity,frequency_count,source_company_ids")
      .eq("segment_id", segmentId),
    supabase
      .from("companies")
      .select("id,name,legal_name,segment,metadata")
      .eq("segment_id", segmentId)
      .order("name", { ascending: true }),
    resolved.macro_id
      ? supabase
          .from("companies")
          .select("id,name,legal_name,segment,metadata")
          .eq("sector_id", resolved.macro_id)
          .order("name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  const items = (itemsResult.data ?? []) as SectorKnowledgeItemRow[]

  const painPoints: SectorPainPointSource[] = items
    .filter((row) => row.item_kind === "pain_point")
    .map((row) => ({
      id: row.item_id,
      title: row.title,
      description: row.description,
      frequencyCount: row.frequency_count ?? 0,
      sourceCompanyIds: Array.isArray(row.source_company_ids) ? row.source_company_ids : [],
      kredoPractice: row.kredo_practice,
      resolvedLevel: toResolvedLevel(row.resolved_level),
    }))
    .sort((left, right) => right.frequencyCount - left.frequencyCount)

  const regulatoryItems: SectorRegulatorySource[] = items
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
    }))

  const events: SectorEventSource[] = items
    .filter((row) => row.item_kind === "event")
    .map((row) => ({
      id: row.item_id,
      title: row.title,
      eventType: row.event_type ?? "autre",
      description: row.description,
      eventDate: row.event_date,
      sourceUrl: row.source_url,
      commercialOpportunity: row.commercial_opportunity,
      resolvedLevel: toResolvedLevel(row.resolved_level),
    }))

  const segmentCompanies = toCompanySources(segmentCompaniesResult.data)
  const macroCompanies = toCompanySources(macroCompaniesResult.data)
  const fallbackToMacro = segmentCompanies.length < PEER_SEGMENT_MIN && macroCompanies.length > 0
  const companies = fallbackToMacro ? macroCompanies : segmentCompanies
  const peersLevel: SectorResolvedLevel = fallbackToMacro ? "macro" : "segment"

  // Statut « effectif » : celui de la fiche d'où vient réellement le playbook.
  // Lire le statut du segment donnerait `development` pour les 36 fiches issues
  // du seed de taxonomie, et éteindrait à tort tous les drapeaux existants.
  const playbookLevel = toResolvedLevel(resolved.playbook_level)
  const effectiveStatus =
    playbookLevel === "segment" ? resolved.segment_status : resolved.macro_status ?? resolved.segment_status

  return buildClientIntelligenceSectorView({
    sector: {
      id: resolved.segment_id,
      name: resolved.segment_name,
      slug: resolved.segment_slug,
      description: resolved.description,
      status: effectiveStatus,
      attractivenessScore: toNumber(resolved.attractiveness_score),
      marketSizeEurBn: toNumber(resolved.market_size_eur_bn),
      marketGrowthPct: toNumber(resolved.market_growth_pct),
      keyPlayersPaca: resolved.key_players_paca,
      keyPlayersNational: resolved.key_players_national,
      macroId: resolved.macro_id,
      macroName: resolved.macro_name,
      macroSlug: resolved.macro_slug,
      descriptionLevel: toResolvedLevel(resolved.description_level),
      playbookLevel,
      hasSegmentKnowledge: Boolean(resolved.has_segment_knowledge),
    },
    currentCompanyId: options.currentCompanyId,
    currentSectorAnalysis: options.currentSectorAnalysis,
    companies,
    peersLevel,
    painPoints,
    regulatoryItems,
    events,
  })
}
