import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { createClient } from "@/lib/supabase/server"
import {
  getVeilleArticles,
  getVeilleArticlesForDigests,
  getAllVeilleArticles,
  getPastVeilleDigests,
  getSectorNews,
  getSectorEvents,
  getCompaniesContextStats,
  getWatchedAccountsSignals,
  getWatchedCompanyIds,
  getGlobalWatchSettings,
  getGlobalWatchWorkflowHealth,
  getLatestStrategicWatchAnalysis,
  getStrategicWatchAnalysisHistory,
  getMonthlyWatchGenerationContext,
  type VeilleDigest,
  type VeilleArticle,
  type SectorNews,
  type SectorEvent
} from "./_data/veille-data"
import { VeilleActualitesPage } from "@/components/veille/VeilleActualitesPage"
import { getSourceManagementSnapshot } from "@/features/source-management/data/get-source-management-snapshot"

export default async function VeillePage({
  searchParams,
}: {
  searchParams: Promise<{ digestId?: string; tab?: string; companyId?: string }>
}) {
  const resolvedParams = await searchParams
  const digestId = resolvedParams.digestId
  const initialTab = resolvedParams.tab === "veille" ? "veille" : undefined
  const initialCompanyId = resolvedParams.companyId || undefined

  const [
    device,
    companiesResult,
    watchedSignalsResult,
    watchedCompanyIds,
    pastDigestsResult,
    globalWatchSettings,
    globalWatchHealth,
    latestAnalysis,
    analysisHistory,
    monthlyGeneration,
    sourceManagementSnapshot,
  ] = await Promise.all([
    getDashboardDevice(),
    getCompaniesContextStats(),
    getWatchedAccountsSignals(),
    getWatchedCompanyIds(),
    getPastVeilleDigests(10),
    getGlobalWatchSettings(),
    getGlobalWatchWorkflowHealth(),
    getLatestStrategicWatchAnalysis(),
    getStrategicWatchAnalysisHistory(12),
    getMonthlyWatchGenerationContext(),
    getSourceManagementSnapshot(),
  ])

  const pastDigests = pastDigestsResult.data || []

  // 2. Determine selected digest
  let selectedDigest: VeilleDigest | null = null
  if (digestId) {
    selectedDigest = pastDigests.find((d) => d.id === digestId) || null
    if (!selectedDigest) {
      const supabase = await createClient()
      const { data } = await supabase
        .from("veille_digests")
        .select("*")
        .eq("id", digestId)
        .maybeSingle()
      selectedDigest = data
    }
  } else {
    selectedDigest = pastDigests[0] || null
  }

  let digestNumber: number | null = null
  if (selectedDigest) {
    const supabase = await createClient()
    const { count } = await supabase
      .from("veille_digests")
      .select("*", { count: "exact", head: true })
      .lte("digest_date", selectedDigest.digest_date)
    if (count !== null) {
      digestNumber = count
    }
  }

  // 3. Fetch dependencies depending on whether we have a digest or empty state fallbacks
  let articles: VeilleArticle[] = []
  let feedArticles: VeilleArticle[] = []
  let allArticles: VeilleArticle[] = []
  let sectorNews: SectorNews[] = []
  let sectorEvents: SectorEvent[] = []

  if (device === "mobile") {
    if (selectedDigest) {
      const feedDigestIds = Array.from(new Set([...pastDigests.map((d) => d.id), selectedDigest.id]))
      const { data: allArticlesData } = await getVeilleArticlesForDigests(feedDigestIds)
      feedArticles = allArticlesData || []
      articles = feedArticles.filter((article) => article.digest_id === selectedDigest.id)
    } else {
      const [newsResult, eventsResult] = await Promise.all([
        getSectorNews(5),
        getSectorEvents(5)
      ])
      sectorNews = newsResult.data || []
      sectorEvents = eventsResult.data || []
    }
  } else {
    const [articlesResult, allArticlesResult] = await Promise.all([
      selectedDigest ? getVeilleArticles(selectedDigest.id) : Promise.resolve({ data: [] as VeilleArticle[], error: null }),
      getAllVeilleArticles(),
    ])
    articles = articlesResult.data || []
    allArticles = allArticlesResult.data || []

    if (!selectedDigest && (allArticles.length === 0)) {
      const [newsResult, eventsResult] = await Promise.all([
        getSectorNews(5),
        getSectorEvents(5)
      ])
      sectorNews = newsResult.data || []
      sectorEvents = eventsResult.data || []
    }
  }

  const companies = companiesResult.data || []
  const watchedSignals = watchedSignalsResult.data || []

  return (
    <div
      data-theme="edito-bright-veille"
      className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-canvas text-body"
    >
      <VeilleActualitesPage
        device={device}
        digest={selectedDigest}
        digestNumber={digestNumber}
        articles={articles}
        allArticles={allArticles}
        feedArticles={feedArticles}
        selectedDigestId={selectedDigest?.id ?? null}
        pastDigests={pastDigests}
        sectorNews={sectorNews}
        sectorEvents={sectorEvents}
        companies={companies}
        watchedSignals={watchedSignals}
        watchedCompanyIds={watchedCompanyIds}
        globalWatchSettings={globalWatchSettings}
        globalWatchHealth={globalWatchHealth}
        latestAnalysis={latestAnalysis}
        analysisHistory={analysisHistory}
        monthlyGeneration={monthlyGeneration}
        sourceManagementSnapshot={sourceManagementSnapshot}
        initialMobileTab={initialTab}
        initialMobileCompanyId={initialCompanyId}
      />
    </div>
  )
}
