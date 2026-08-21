import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { getSectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import { getCompetitiveMapSnapshot } from "@/features/competitive-map/data/get-competitive-map-snapshot"
import { getSegmentValueChainReadModel } from "@/features/sector-mapping/data/get-segment-value-chain-read-model"
import { getSegmentPortfolioSnapshot } from "./get-segment-portfolio-snapshot"
import type {
  BusinessIntelligenceSegmentWorkspace,
  SegmentNewsLibrary,
  SegmentResourceCoverage,
} from "./business-intelligence-workspace-types"

type SegmentRow = {
  id: string
  name: string
  slug: string
  status: string
  level: string
  parent: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
}

type SignalRow = {
  id: string
  company_id: string
  title: string
  summary: string | null
  signal_type: string
  signal_category: string
  relevance_score: number | string
  urgency_score: number | string
  detected_at: string
  recommended_action: string | null
  status: string
}

function parentOf(row: SegmentRow): { id: string; name: string; slug: string } | null {
  if (Array.isArray(row.parent)) return row.parent[0] ?? null
  return row.parent
}

function hasNonEmptyObject(value: Record<string, unknown> | null): boolean {
  return Boolean(value && Object.keys(value).length > 0)
}

function latest(values: Array<string | null | undefined>): string | null {
  let result: string | null = null
  for (const value of values) if (value && (!result || value > result)) result = value
  return result
}

function resolvedItemsLevel(items: Array<{ resolvedLevel: "segment" | "macro" }>): "segment" | "macro" | null {
  if (items.length === 0) return null
  return items.some((item) => item.resolvedLevel === "segment") ? "segment" : "macro"
}

export const getBusinessIntelligenceSegmentWorkspace = cache(async (
  segmentId: string,
): Promise<BusinessIntelligenceSegmentWorkspace> => {
  try {
    const supabase = await createClient()
    const segmentResult = await supabase
      .from("sector_intelligence")
      .select("id,name,slug,status,level,parent:sector_intelligence!sector_intelligence_parent_id_fkey(id,name,slug)")
      .eq("id", segmentId)
      .maybeSingle()

    if (segmentResult.error) throw new Error(segmentResult.error.message)
    if (!segmentResult.data) {
      return { state: "error", segmentId, code: "unknown_segment", error: "Le segment demandé est inconnu." }
    }
    if (segmentResult.data.level !== "segment") {
      return { state: "error", segmentId, code: "macro_not_allowed", error: "Business Intelligence exige un segment métier." }
    }

    const row = segmentResult.data as unknown as SegmentRow
    const [knowledge, portfolio, competitiveMap, valueChain] = await Promise.all([
      getSectorKnowledgeReadModel(segmentId),
      getSegmentPortfolioSnapshot(segmentId),
      getCompetitiveMapSnapshot(segmentId),
      getSegmentValueChainReadModel(segmentId),
    ])

    if (!knowledge) {
      return { state: "error", segmentId, code: "knowledge_unavailable", error: "La connaissance résolue du segment est indisponible." }
    }

    const companyIds = portfolio.accounts.map((account) => account.id)
    let signalRows: SignalRow[] = []
    if (companyIds.length > 0) {
      const signalsResult = await supabase
        .from("account_signals")
        .select("id,company_id,title,summary,signal_type,signal_category,relevance_score,urgency_score,detected_at,recommended_action,status")
        .in("company_id", companyIds)
        .neq("status", "archived")
        .order("detected_at", { ascending: false })
      if (signalsResult.error) throw new Error(signalsResult.error.message)
      signalRows = (signalsResult.data ?? []) as SignalRow[]
    }

    const newsSignalRows = signalRows.filter((signal) => signal.signal_category !== "regulatory" && signal.signal_category !== "company_context")
    const news: SegmentNewsLibrary = {
      items: [
        ...knowledge.news.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          source: item.source,
          url: item.url,
          publishedAt: item.publishedAt,
          relevanceScore: item.relevanceScore,
          type: "news" as const,
          level: item.resolvedLevel,
          companyId: null,
          urgencyScore: null,
          recommendedAction: null,
        })),
        ...newsSignalRows.map((signal) => ({
          id: signal.id,
          title: signal.title,
          summary: signal.summary,
          source: null,
          url: null,
          publishedAt: signal.detected_at,
          relevanceScore: Number(signal.relevance_score),
          type: "signal" as const,
          level: "segment" as const,
          companyId: signal.company_id,
          urgencyScore: Number(signal.urgency_score),
          recommendedAction: signal.recommended_action,
        })),
      ].sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")),
      updatedAt: latest([
        ...knowledge.news.map((item) => item.publishedAt),
        ...newsSignalRows.map((signal) => signal.detected_at),
      ]),
    }

    const studyAvailable = Boolean(knowledge.sourceRunId || knowledge.studySnapshotDate)
    const coverage: SegmentResourceCoverage = {
      study: {
        available: studyAvailable,
        level: studyAvailable ? knowledge.hasSegmentKnowledge ? "segment" : "macro" : null,
        updatedAt: studyAvailable ? knowledge.studySnapshotDate : null,
      },
      playbook: {
        available: hasNonEmptyObject(knowledge.playbook),
        level: hasNonEmptyObject(knowledge.playbook) ? knowledge.playbookLevel : null,
        updatedAt: hasNonEmptyObject(knowledge.playbook) ? knowledge.studySnapshotDate : null,
      },
      competitiveMap: {
        available: Boolean(competitiveMap),
        level: competitiveMap ? "segment" : null,
        updatedAt: competitiveMap?.snapshotDate ?? null,
      },
      valueChain: {
        available: Boolean(valueChain),
        level: valueChain?.level ?? null,
        updatedAt: valueChain?.updatedAt ?? null,
      },
      regulatory: {
        available: knowledge.regulatory.length > 0,
        level: resolvedItemsLevel(knowledge.regulatory),
        updatedAt: latest(knowledge.regulatory.flatMap((item) => [item.updatedAt, item.createdAt, item.deadlineDate])),
      },
      news: {
        available: news.items.length > 0,
        level: resolvedItemsLevel(knowledge.news) ?? (newsSignalRows.length > 0 ? "segment" : null),
        updatedAt: news.updatedAt,
      },
    }

    const segment = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      macro: parentOf(row),
    }
    const hasResource = Object.values(coverage).some((item) => item.available)
    return {
      state: portfolio.accounts.length > 0 || hasResource ? "ready" : "empty",
      segment,
      knowledge,
      portfolio,
      competitiveMap,
      valueChain,
      news,
      coverage,
    }
  } catch (error) {
    console.error("[BusinessIntelligenceSegmentWorkspace] load failed", {
      segmentId,
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      state: "error",
      segmentId,
      code: "load_failed",
      error: "Le workspace Business Intelligence est indisponible.",
    }
  }
})
