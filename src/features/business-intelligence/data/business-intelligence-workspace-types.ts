import type { ResolvedSource } from "../shared/SourceChip"
import type { SectorCorpusMetadata } from "./get-sector-corpus-metadata"
import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { CompetitiveMapSnapshot } from "@/features/competitive-map/data/competitive-map-workspace-types"
import type { SectorMapCatalog } from "@/features/sector-mapping/data/sector-map-catalog"
import type { BusinessIntelligenceSnapshot, PortfolioIntelligenceSnapshot } from "./business-intelligence-types"

export type SegmentResourceKey =
  | "study"
  | "playbook"
  | "competitiveMap"
  | "valueChain"
  | "regulatory"
  | "news"

export type SegmentResourceAvailability = {
  available: boolean
  level: SectorResolvedLevel | null
  updatedAt: string | null
}

export type SegmentResourceCoverage = Record<SegmentResourceKey, SegmentResourceAvailability>

export type BusinessIntelligenceCatalogSegment = {
  id: string
  name: string
  slug: string
  status: string
  accountCount: number
  coverage: SegmentResourceCoverage
}

export type BusinessIntelligenceCatalogMacro = {
  id: string
  name: string
  slug: string
  status: string
  accountCount: number
  segments: BusinessIntelligenceCatalogSegment[]
}

export type BusinessIntelligenceCatalog = {
  state: "ready" | "empty" | "error"
  macros: BusinessIntelligenceCatalogMacro[]
  generatedAt: string
  error: string | null
}

export type BusinessIntelligenceSegment = {
  id: string
  name: string
  slug: string
  status: string
  macro: {
    id: string
    name: string
    slug: string
  } | null
}

export type SegmentPortfolioSnapshot = PortfolioIntelligenceSnapshot & {
  scores: BusinessIntelligenceSnapshot["scores"]
}

export type SegmentValueChainReadModel = {
  sourceSectorId: string
  level: "segment" | "macro"
  catalog: SectorMapCatalog
  updatedAt: string | null
}

export type SegmentNewsLibraryItem = {
  id: string
  title: string
  summary: string | null
  source: string | null
  url: string | null
  publishedAt: string | null
  relevanceScore: number | null
  type: "news" | "signal"
  level: "segment" | "macro"
  companyId: string | null
  urgencyScore: number | null
  recommendedAction: string | null
}

export type SegmentNewsLibrary = {
  items: SegmentNewsLibraryItem[]
  updatedAt: string | null
}

type WorkspaceLoadedData = {
  sourceResolution: Record<number, ResolvedSource>
  corpusMetadata: SectorCorpusMetadata | null

  segment: BusinessIntelligenceSegment
  knowledge: SectorKnowledgeReadModel
  portfolio: SegmentPortfolioSnapshot
  competitiveMap: CompetitiveMapSnapshot | null
  valueChain: SegmentValueChainReadModel | null
  news: SegmentNewsLibrary
  coverage: SegmentResourceCoverage
}

export type BusinessIntelligenceSegmentWorkspace =
  | ({ state: "ready" | "empty" } & WorkspaceLoadedData)
  | {
      state: "error"
      segmentId: string
      code: "unknown_segment" | "macro_not_allowed" | "knowledge_unavailable" | "load_failed"
      error: string
    }
