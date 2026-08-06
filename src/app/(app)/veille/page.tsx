import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { createClient } from "@/lib/supabase/server"
import {
  getVeilleArticles,
  getVeilleArticlesForDigests,
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

export default async function VeillePage({
  searchParams,
}: {
  searchParams: Promise<{ digestId?: string }>
}) {
  const resolvedParams = await searchParams
  const digestId = resolvedParams.digestId

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

  // 3. Fetch dependencies depending on whether we have a digest or empty state fallbacks
  let articles: VeilleArticle[] = []
  let feedArticles: VeilleArticle[] = []
  let sectorNews: SectorNews[] = []
  let sectorEvents: SectorEvent[] = []

  if (selectedDigest) {
    if (device === "mobile") {
      // Le flux « Actualités » mobile est transverse aux briefings : un seul
      // appel couvre à la fois le flux et les articles du digest courant.
      // `selectedDigest` peut venir d'un `digestId` plus ancien que les 10
      // derniers briefings : on l'ajoute explicitement au lot.
      const feedDigestIds = Array.from(new Set([...pastDigests.map((d) => d.id), selectedDigest.id]))
      const { data: allArticles } = await getVeilleArticlesForDigests(feedDigestIds)
      feedArticles = allArticles || []
      articles = feedArticles.filter((article) => article.digest_id === selectedDigest.id)
    } else {
      const { data: articlesData } = await getVeilleArticles(selectedDigest.id)
      articles = articlesData || []
    }
  } else {
    // Empty state fallback - load recent sector news and events
    const [newsResult, eventsResult] = await Promise.all([
      getSectorNews(5),
      getSectorEvents(5)
    ])
    sectorNews = newsResult.data || []
    sectorEvents = eventsResult.data || []
  }

  const companies = companiesResult.data || []
  const watchedSignals = watchedSignalsResult.data || []

  return (
    <div
      data-theme="edito-bright-veille"
      className={device === "mobile" ? "min-h-screen bg-canvas text-body" : "h-full min-h-0 bg-canvas text-body"}
    >
      <VeilleActualitesPage
        device={device}
        digest={selectedDigest}
        articles={articles}
        feedArticles={feedArticles}
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
      />
    </div>
  )
}
