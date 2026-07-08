import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import {
  getLatestVeilleDigest,
  getVeilleArticles,
  getPastVeilleDigests,
  getSectorNews,
  getSectorEvents,
  getCompaniesContextStats,
  getWatchedAccountsSignals,
  type VeilleDigest,
  type VeilleArticle,
  type SectorNews,
  type SectorEvent
} from "./_data/veille-data"
import { VeilleActualitesPage } from "@/components/veille/VeilleActualitesPage"

export const dynamic = "force-dynamic"

export default async function VeillePage() {
  const [device, companiesResult, watchedSignalsResult] = await Promise.all([
    getDashboardDevice(),
    getCompaniesContextStats(),
    getWatchedAccountsSignals(),
  ])

  // 1. Fetch latest digest
  const { data: latestDigest } = await getLatestVeilleDigest()

  // 2. Fetch dependencies depending on whether we have a digest or empty state fallbacks
  let articles: VeilleArticle[] = []
  let pastDigests: VeilleDigest[] = []
  let sectorNews: SectorNews[] = []
  let sectorEvents: SectorEvent[] = []

  if (latestDigest) {
    const [articlesResult, pastDigestsResult] = await Promise.all([
      getVeilleArticles(latestDigest.id),
      getPastVeilleDigests(10)
    ])
    articles = articlesResult.data || []
    pastDigests = pastDigestsResult.data || []
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
    <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
      <VeilleActualitesPage
        device={device}
        digest={latestDigest}
        articles={articles}
        pastDigests={pastDigests}
        sectorNews={sectorNews}
        sectorEvents={sectorEvents}
        companies={companies}
        watchedSignals={watchedSignals}
      />
    </div>
  )
}

