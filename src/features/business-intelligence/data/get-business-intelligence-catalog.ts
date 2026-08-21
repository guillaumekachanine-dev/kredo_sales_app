import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type {
  BusinessIntelligenceCatalog,
  BusinessIntelligenceCatalogMacro,
  SegmentResourceAvailability,
  SegmentResourceCoverage,
} from "./business-intelligence-workspace-types"
import type { SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"

type SectorRow = {
  id: string
  name: string
  slug: string
  status: string
  level: string
  parent_id: string | null
}

type CompanyRow = {
  id: string
  sector_id: string | null
  segment_id: string | null
}

type KnowledgeRow = {
  segment_id: string
  source_run_id: string | null
  study_snapshot_date: string | null
  has_segment_knowledge: boolean | null
}

type PlaybookRow = {
  segment_id: string
  playbook_level: string | null
  study_snapshot_date: string | null
}

type KnowledgeItemRow = {
  segment_id: string
  item_kind: string
  resolved_level: string | null
  published_at: string | null
  updated_at: string | null
}

type CompetitiveRow = {
  segment_id: string | null
  study_snapshot_date: string
}

type ValueChainRow = {
  sector_id: string
  couche: string
  maillon: number | null
  updated_at: string
}

type SignalRow = {
  company_id: string
  detected_at: string
}

export type BusinessIntelligenceCatalogRows = {
  sectors: SectorRow[]
  companies: CompanyRow[]
  knowledge: KnowledgeRow[]
  playbooks: PlaybookRow[]
  items: KnowledgeItemRow[]
  competitiveEntries: CompetitiveRow[]
  valueChainNodes: ValueChainRow[]
  signals: SignalRow[]
}

const EMPTY_RESOURCE: SegmentResourceAvailability = {
  available: false,
  level: null,
  updatedAt: null,
}

function resource(
  available: boolean,
  level: SectorResolvedLevel | null,
  updatedAt: string | null,
): SegmentResourceAvailability {
  return { available, level: available ? level : null, updatedAt: available ? updatedAt : null }
}

function resolvedLevel(value: string | null | undefined): SectorResolvedLevel {
  if (value === "segment" || value === "locked" || value === "estimated") return value
  return "macro"
}

function latest(values: Array<string | null | undefined>): string | null {
  let result: string | null = null
  for (const value of values) {
    if (value && (!result || value > result)) result = value
  }
  return result
}

function itemLevel(items: KnowledgeItemRow[]): "segment" | "macro" | null {
  if (items.length === 0) return null
  return items.some((item) => item.resolved_level === "segment") ? "segment" : "macro"
}

export function buildBusinessIntelligenceCatalog(
  rows: BusinessIntelligenceCatalogRows,
  generatedAt = new Date().toISOString(),
): BusinessIntelligenceCatalog {
  const macros = rows.sectors.filter((sector) => sector.level === "macro")
  const segments = rows.sectors.filter((sector) => sector.level === "segment")
  const companiesBySegment = new Map<string, CompanyRow[]>()
  const companyCountByMacro = new Map<string, number>()
  for (const company of rows.companies) {
    if (company.segment_id) {
      const current = companiesBySegment.get(company.segment_id) ?? []
      current.push(company)
      companiesBySegment.set(company.segment_id, current)
    }
    if (company.sector_id) companyCountByMacro.set(company.sector_id, (companyCountByMacro.get(company.sector_id) ?? 0) + 1)
  }

  const knowledgeBySegment = new Map(rows.knowledge.map((row) => [row.segment_id, row]))
  const playbookBySegment = new Map(rows.playbooks.map((row) => [row.segment_id, row]))
  const itemsBySegment = new Map<string, KnowledgeItemRow[]>()
  for (const item of rows.items) {
    const current = itemsBySegment.get(item.segment_id) ?? []
    current.push(item)
    itemsBySegment.set(item.segment_id, current)
  }

  const competitiveBySegment = new Map<string, string[]>()
  for (const entry of rows.competitiveEntries) {
    if (!entry.segment_id) continue
    const dates = competitiveBySegment.get(entry.segment_id) ?? []
    dates.push(entry.study_snapshot_date)
    competitiveBySegment.set(entry.segment_id, dates)
  }

  const valueChainBySector = new Map<string, string[]>()
  for (const node of rows.valueChainNodes) {
    if (node.couche !== "chaine" || node.maillon === null) continue
    const dates = valueChainBySector.get(node.sector_id) ?? []
    dates.push(node.updated_at)
    valueChainBySector.set(node.sector_id, dates)
  }

  const segmentByCompany = new Map(rows.companies.map((company) => [company.id, company.segment_id]))
  const signalsBySegment = new Map<string, string[]>()
  for (const signal of rows.signals) {
    const segmentId = segmentByCompany.get(signal.company_id)
    if (!segmentId) continue
    const dates = signalsBySegment.get(segmentId) ?? []
    dates.push(signal.detected_at)
    signalsBySegment.set(segmentId, dates)
  }

  const catalogMacros: BusinessIntelligenceCatalogMacro[] = macros.map((macro) => {
    const children = segments
      .filter((segment) => segment.parent_id === macro.id)
      .map((segment) => {
        const knowledge = knowledgeBySegment.get(segment.id)
        const playbook = playbookBySegment.get(segment.id)
        const items = itemsBySegment.get(segment.id) ?? []
        const regulatory = items.filter((item) => item.item_kind === "regulatory")
        const news = items.filter((item) => item.item_kind === "news")
        const competitiveDates = competitiveBySegment.get(segment.id) ?? []
        const segmentChainDates = valueChainBySector.get(segment.id) ?? []
        const macroChainDates = valueChainBySector.get(macro.id) ?? []
        const chainDates = segmentChainDates.length > 0 ? segmentChainDates : macroChainDates
        const signalDates = signalsBySegment.get(segment.id) ?? []
        const studyAvailable = Boolean(knowledge?.source_run_id || knowledge?.study_snapshot_date)
        const studyLevel: SectorResolvedLevel | null = studyAvailable
          ? knowledge?.has_segment_knowledge ? "segment" : "macro"
          : null

        const coverage: SegmentResourceCoverage = {
          study: resource(studyAvailable, studyLevel, knowledge?.study_snapshot_date ?? null),
          playbook: resource(Boolean(playbook), playbook ? resolvedLevel(playbook.playbook_level) : null, playbook?.study_snapshot_date ?? null),
          competitiveMap: resource(competitiveDates.length > 0, "segment", latest(competitiveDates)),
          valueChain: resource(chainDates.length > 0, segmentChainDates.length > 0 ? "segment" : "macro", latest(chainDates)),
          regulatory: resource(regulatory.length > 0, itemLevel(regulatory), latest(regulatory.flatMap((item) => [item.updated_at, item.published_at]))),
          news: resource(news.length > 0 || signalDates.length > 0, news.length > 0 ? itemLevel(news) : "segment", latest([...news.flatMap((item) => [item.updated_at, item.published_at]), ...signalDates])),
        }

        return {
          id: segment.id,
          name: segment.name,
          slug: segment.slug,
          status: segment.status,
          accountCount: companiesBySegment.get(segment.id)?.length ?? 0,
          coverage,
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name, "fr"))

    return {
      id: macro.id,
      name: macro.name,
      slug: macro.slug,
      status: macro.status,
      accountCount: companyCountByMacro.get(macro.id) ?? children.reduce((sum, segment) => sum + segment.accountCount, 0),
      segments: children,
    }
  }).sort((left, right) => left.name.localeCompare(right.name, "fr"))

  return {
    state: catalogMacros.length > 0 ? "ready" : "empty",
    macros: catalogMacros,
    generatedAt,
    error: null,
  }
}

export const getBusinessIntelligenceCatalog = cache(async (): Promise<BusinessIntelligenceCatalog> => {
  try {
    const supabase = await createClient()
    const [sectorsResult, companiesResult, knowledgeResult, playbooksResult, itemsResult, competitiveResult, valueChainResult] = await Promise.all([
      supabase.from("sector_intelligence").select("id,name,slug,status,level,parent_id").in("level", ["macro", "segment"]),
      supabase.from("companies").select("id,sector_id,segment_id").or("depth_level.is.null,depth_level.neq.mapped"),
      supabase.from("v_sector_knowledge_resolved").select("segment_id,source_run_id,study_snapshot_date,has_segment_knowledge"),
      supabase.from("v_sector_knowledge_resolved").select("segment_id,playbook_level,study_snapshot_date").not("playbook", "is", null).filter("playbook", "neq", "{}"),
      supabase.from("v_sector_knowledge_items").select("segment_id,item_kind,resolved_level,published_at,updated_at").in("item_kind", ["regulatory", "news"]),
      supabase.from("competitive_map_entries").select("segment_id,study_snapshot_date").not("segment_id", "is", null),
      supabase.from("value_chain_nodes").select("sector_id,couche,maillon,updated_at"),
    ])

    const error = sectorsResult.error ?? companiesResult.error ?? knowledgeResult.error ?? playbooksResult.error ?? itemsResult.error ?? competitiveResult.error ?? valueChainResult.error
    if (error) throw new Error(error.message)

    const companies = (companiesResult.data ?? []) as CompanyRow[]
    const companyIds = companies.map((company) => company.id)
    let signals: SignalRow[] = []
    if (companyIds.length > 0) {
      const signalsResult = await supabase
        .from("account_signals")
        .select("company_id,detected_at")
        .in("company_id", companyIds)
        .neq("signal_category", "regulatory")
        .neq("status", "archived")
      if (signalsResult.error) throw new Error(signalsResult.error.message)
      signals = (signalsResult.data ?? []) as SignalRow[]
    }

    return buildBusinessIntelligenceCatalog({
      sectors: (sectorsResult.data ?? []) as SectorRow[],
      companies,
      knowledge: (knowledgeResult.data ?? []) as KnowledgeRow[],
      playbooks: (playbooksResult.data ?? []) as PlaybookRow[],
      items: (itemsResult.data ?? []) as KnowledgeItemRow[],
      competitiveEntries: (competitiveResult.data ?? []) as CompetitiveRow[],
      valueChainNodes: (valueChainResult.data ?? []) as ValueChainRow[],
      signals,
    })
  } catch (error) {
    console.error("[BusinessIntelligenceCatalog] load failed", {
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      state: "error",
      macros: [],
      generatedAt: new Date().toISOString(),
      error: "Le catalogue Business Intelligence est indisponible.",
    }
  }
})

export const EMPTY_SEGMENT_RESOURCE_COVERAGE: SegmentResourceCoverage = {
  study: EMPTY_RESOURCE,
  playbook: EMPTY_RESOURCE,
  competitiveMap: EMPTY_RESOURCE,
  valueChain: EMPTY_RESOURCE,
  regulatory: EMPTY_RESOURCE,
  news: EMPTY_RESOURCE,
}
