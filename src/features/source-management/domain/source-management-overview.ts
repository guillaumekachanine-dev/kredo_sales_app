import {
  KREDO_SOURCE_CATEGORY_LABELS,
  KREDO_SOURCE_CATEGORY_ORDER,
  type KredoSourceCategory,
  type SourceManagementSnapshot,
} from "./source-management-contracts"

export type CategoryOverviewPoint = {
  categoryKey: KredoSourceCategory
  label: string
  count: number
  activeCount: number
  percentage: number
  colorVar: string
}

export type CorpusOverviewPoint = {
  id: string
  name: string
  slug: string
  totalSources: number
  activeSources: number
  collectableSources: number
  activationState: "draft" | "active"
}

export type SourceManagementOverview = {
  uniqueSourceCount: number
  activeSourceCount: number
  corpusCount: number
  activeCorpusCount: number
  categoryDistribution: CategoryOverviewPoint[]
  corpusActivity: CorpusOverviewPoint[]
}

const DATAVIZ_COLORS = [
  "var(--color-dataviz-1)", // #2554B8
  "var(--color-dataviz-2)", // #C89A2B
  "var(--color-dataviz-3)", // #63A6E8
  "var(--color-dataviz-4)", // #719A5A
  "var(--color-dataviz-5)", // #7B6BB2
  "var(--color-dataviz-6)", // #D4B26A
]

export function buildSourceManagementOverview(snapshot: SourceManagementSnapshot): SourceManagementOverview {
  const catalogSources = [...snapshot.systemSources, ...snapshot.manualSources]
  const managedCorpora = [
    ...snapshot.sectorCorpora,
    ...(snapshot.thematicCorpora ?? []),
  ]

  // Deduplicate by searchDomain
  const domainsSeen = new Set<string>()
  for (const s of catalogSources) {
    if (s.searchDomain) domainsSeen.add(s.searchDomain.toLowerCase())
  }
  for (const corpus of managedCorpora) {
    for (const item of corpus.items) {
      if (item.source?.searchDomain) {
        domainsSeen.add(item.source.searchDomain.toLowerCase())
      }
    }
  }

  const uniqueSourceCount = Math.max(domainsSeen.size, catalogSources.length)

  // Active sources count
  const activeCatalogSources = catalogSources.filter((s) => s.isActive)
  const activeSourceCount = activeCatalogSources.length

  // Corpora stats
  const corpusCount = managedCorpora.length
  const activeCorpusCount = managedCorpora.filter((c) => c.activationState === "active").length

  // Category distribution
  const categoryCounts = new Map<KredoSourceCategory, { count: number; activeCount: number }>()
  for (const cat of KREDO_SOURCE_CATEGORY_ORDER) {
    categoryCounts.set(cat, { count: 0, activeCount: 0 })
  }

  for (const s of catalogSources) {
    if (s.kredoCategory && categoryCounts.has(s.kredoCategory)) {
      const current = categoryCounts.get(s.kredoCategory)!
      current.count += 1
      if (s.isActive) current.activeCount += 1
    }
  }

  const totalCatalogCount = Math.max(catalogSources.length, 1)

  const categoryDistribution: CategoryOverviewPoint[] = KREDO_SOURCE_CATEGORY_ORDER.map((catKey, index) => {
    const data = categoryCounts.get(catKey) ?? { count: 0, activeCount: 0 }
    const percentage = Math.round((data.count / totalCatalogCount) * 100)
    return {
      categoryKey: catKey,
      label: KREDO_SOURCE_CATEGORY_LABELS[catKey],
      count: data.count,
      activeCount: data.activeCount,
      percentage,
      colorVar: DATAVIZ_COLORS[index % DATAVIZ_COLORS.length]!,
    }
  })

  // Corpus activity for SVG Bar Chart
  const corpusActivity: CorpusOverviewPoint[] = managedCorpora.map((corpus) => ({
    id: corpus.id,
    name: corpus.name ?? corpus.sectorName ?? corpus.slug,
    slug: corpus.slug,
    totalSources: corpus.totalSources,
    activeSources: corpus.activeSources,
    collectableSources: corpus.collectableSources,
    activationState: corpus.activationState,
  }))

  return {
    uniqueSourceCount,
    activeSourceCount,
    corpusCount,
    activeCorpusCount,
    categoryDistribution,
    corpusActivity,
  }
}
