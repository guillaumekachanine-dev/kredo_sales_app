import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { createClient } from "@/lib/supabase/server"
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

export default async function VeillePage({
  searchParams,
}: {
  searchParams: Promise<{ digestId?: string }>
}) {
  const resolvedParams = await searchParams
  const digestId = resolvedParams.digestId

  const [device, companiesResult, watchedSignalsResult] = await Promise.all([
    getDashboardDevice(),
    getCompaniesContextStats(),
    getWatchedAccountsSignals(),
  ])

  // 1. Fetch past digests
  const { data: pastDigestsData } = await getPastVeilleDigests(10)
  const pastDigests = pastDigestsData || []

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
  let sectorNews: SectorNews[] = []
  let sectorEvents: SectorEvent[] = []

  if (selectedDigest) {
    const { data: articlesData } = await getVeilleArticles(selectedDigest.id)
    articles = articlesData || []
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
        digest={selectedDigest}
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

