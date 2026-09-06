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
import { getDigestLaunchOptions } from "@/features/veille/digest/data/get-digest-launch-options"

export default async function VeillePage({
  searchParams,
}: {
  searchParams: Promise<{ digestId?: string; tab?: string; companyId?: string; topic?: string }>
}) {
  const resolvedParams = await searchParams
  const digestId = resolvedParams.digestId
  const initialTab = resolvedParams.tab === "veille" ? "veille" : undefined
  const initialCompanyId = resolvedParams.companyId || undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let workspaceId = ""
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .maybeSingle()
    workspaceId = profile?.workspace_id ?? ""
  }

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
    launchOptions,
  ] = await Promise.all([
    getDashboardDevice(),
    getCompaniesContextStats(),
    getWatchedAccountsSignals(),
    getWatchedCompanyIds(),
    getPastVeilleDigests(30),
    getGlobalWatchSettings(),
    getGlobalWatchWorkflowHealth(),
    getLatestStrategicWatchAnalysis(),
    getStrategicWatchAnalysisHistory(12),
    getMonthlyWatchGenerationContext(),
    getSourceManagementSnapshot(),
    workspaceId
      ? getDigestLaunchOptions(supabase, workspaceId)
      : Promise.resolve({ topics: [], corpora: [], defaultSourcesCount: 0 }),
  ])

  const allPastDigests = pastDigestsResult.data || []

  // 2. Résolution du sujet et du digest sélectionné (ADR-0022 Lot 3)
  let selectedDigest: VeilleDigest | null = null
  let effectiveTopic = resolvedParams.topic?.trim() || "global"

  if (digestId) {
    selectedDigest = allPastDigests.find((d) => d.id === digestId) || null
    if (!selectedDigest) {
      const { data } = await supabase
        .from("veille_digests")
        .select("*")
        .eq("id", digestId)
        .maybeSingle()
      selectedDigest = data
    }
    // Si digestId est explicitement fourni : le digest garde la priorité et son topic_key détermine le sujet affiché
    if (selectedDigest) {
      effectiveTopic = selectedDigest.topic_key || "global"
    }
  }

  // Digests du sujet actif pour le feed et la navigation de période
  const topicDigests = allPastDigests.filter(
    (d) => (d.topic_key || "global") === effectiveTopic,
  )

  if (!digestId) {
    selectedDigest = topicDigests[0] || null
  } else if (selectedDigest && !topicDigests.some((d) => d.id === selectedDigest!.id)) {
    topicDigests.unshift(selectedDigest)
  }

  let digestNumber: number | null = null
  if (selectedDigest) {
    const { count } = await supabase
      .from("veille_digests")
      .select("*", { count: "exact", head: true })
      .eq("topic_key", effectiveTopic)
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
      const feedDigestIds = Array.from(new Set([...topicDigests.map((d) => d.id), selectedDigest.id]))
      const { data: allArticlesData } = await getVeilleArticlesForDigests(feedDigestIds)
      feedArticles = allArticlesData || []
      articles = feedArticles.filter((article) => article.digest_id === selectedDigest.id)
    } else {
      const [newsResult, eventsResult] = await Promise.all([
        getSectorNews(5),
        getSectorEvents(5),
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

    if (!selectedDigest && allArticles.length === 0) {
      const [newsResult, eventsResult] = await Promise.all([
        getSectorNews(5),
        getSectorEvents(5),
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
        pastDigests={topicDigests}
        allPastDigests={allPastDigests}
        activeTopic={effectiveTopic}
        launchOptions={launchOptions}
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
