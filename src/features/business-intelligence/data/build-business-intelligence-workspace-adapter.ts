import type { BusinessIntelligenceSnapshot } from "./business-intelligence-types"
import type { BusinessIntelligenceSegmentWorkspace } from "./business-intelligence-workspace-types"
import { buildSectorActivationModel } from "../models/build-sector-activation-model"
import type { CompetitiveMapWorkspace, CompetitiveMapCatalogItem } from "@/features/competitive-map/data/competitive-map-workspace-types"
import { emptySectorMapCatalog, type SectorMapCatalog } from "@/features/sector-mapping/data/sector-map-catalog"

export type BusinessIntelligenceWorkspaceAdapter = {
  snapshot: BusinessIntelligenceSnapshot
  competitiveMapWorkspace: CompetitiveMapWorkspace
  sectorMapCatalog: SectorMapCatalog
}

export function buildBusinessIntelligenceWorkspaceAdapter(
  workspace: Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>,
): BusinessIntelligenceWorkspaceAdapter {
  const activation = buildSectorActivationModel({
    accounts: workspace.portfolio.accounts,
    sectorKnowledgeModels: [workspace.knowledge],
  }, { now: Date.now() })

  const snapshot: BusinessIntelligenceSnapshot = {
    state: "ready",
    generatedAt: workspace.portfolio.generatedAt,
    lastUpdatedAt: workspace.knowledge.studySnapshotDate,
    accounts: workspace.portfolio.accounts,
    signals: workspace.news.items.filter((item) => item.type === "signal").map((item) => ({
      id: item.id,
      companyId: item.companyId ?? "",
      title: item.title,
      summary: item.summary,
      category: "sector_news",
      relevanceScore: item.relevanceScore ?? 0,
      urgencyScore: item.urgencyScore ?? 0,
      detectedAt: item.publishedAt ?? workspace.portfolio.generatedAt,
      recommendedAction: item.recommendedAction,
    })),
    sectors: activation.sectors,
    windows: activation.windows,
    filterOptions: activation.filterOptions,
    trust: {
      accountReach: workspace.portfolio.trust.accountReach,
      accountMomentum: workspace.portfolio.trust.accountMomentum30d,
      accountInactivityRisk: workspace.portfolio.trust.accountInactivityRisk,
    },
    dataQuality: workspace.portfolio.dataQuality,
  }

  const competitiveCatalog: CompetitiveMapCatalogItem[] = workspace.competitiveMap ? [{
    segmentId: workspace.segment.id,
    segmentSlug: workspace.segment.slug,
    segmentName: workspace.segment.name,
    macroName: workspace.segment.macro?.name ?? "",
    label: workspace.segment.macro ? `${workspace.segment.macro.name} › ${workspace.segment.name}` : workspace.segment.name,
    latestSnapshotDate: workspace.competitiveMap.snapshotDate,
    actorCount: workspace.competitiveMap.actors.length,
  }] : []

  const competitiveMapWorkspace: CompetitiveMapWorkspace = {
    state: workspace.competitiveMap ? "ready" : "empty",
    catalog: competitiveCatalog,
    allSegments: [{
      slug: workspace.segment.slug,
      name: workspace.segment.name,
      macroSlug: workspace.segment.macro?.slug ?? "",
      macroName: workspace.segment.macro?.name ?? "",
    }],
    selectedSegmentId: workspace.segment.id,
    snapshot: workspace.competitiveMap,
    error: null,
  }

  return {
    snapshot,
    competitiveMapWorkspace,
    sectorMapCatalog: workspace.valueChain?.catalog ?? emptySectorMapCatalog(),
  }
}
