import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import type { 
  VeilleDigest, 
  VeilleArticle, 
  SectorNews, 
  SectorEvent,
  CompanyContextStats,
  WatchedAccountSignal
} from "@/app/(app)/veille/_data/veille-data"
import { VeilleActualitesDesktop } from "./VeilleActualitesDesktop"
import { VeilleActualitesMobile } from "./VeilleActualitesMobile"
import type {
  GlobalWatchSettings,
  GlobalWatchWorkflowHealth,
  MonthlyWatchGenerationContext,
  StrategicWatchAnalysis,
} from "./veille-desktop-contracts"
import type { SourceManagementSnapshot } from "@/features/source-management/domain/source-management-contracts"
import type { DigestLaunchOptions } from "@/features/veille/digest/data/get-digest-launch-options"

interface VeilleActualitesPageProps {
  device: DashboardDevice
  digest: VeilleDigest | null
  digestNumber: number | null
  articles: VeilleArticle[]
  /** Ensemble complet du corpus d'articles pour recherche avancée desktop. */
  allArticles?: VeilleArticle[]
  /** Flux transverse aux briefings — consommé par la seule vue mobile. */
  feedArticles: VeilleArticle[]
  /** Digest retenu côté serveur (contrat `?digestId=`) — vue mobile seule. */
  selectedDigestId: string | null
  pastDigests: VeilleDigest[]
  allPastDigests?: VeilleDigest[]
  activeTopic?: string
  launchOptions?: DigestLaunchOptions
  sectorNews: SectorNews[]
  sectorEvents: SectorEvent[]
  companies: CompanyContextStats[]
  watchedSignals: WatchedAccountSignal[]
  watchedCompanyIds: string[]
  globalWatchSettings: GlobalWatchSettings
  globalWatchHealth: GlobalWatchWorkflowHealth
  latestAnalysis: StrategicWatchAnalysis | null
  analysisHistory: StrategicWatchAnalysis[]
  monthlyGeneration: MonthlyWatchGenerationContext
  sourceManagementSnapshot: SourceManagementSnapshot
  initialMobileTab?: "veille"
  initialMobileCompanyId?: string
}

export function VeilleActualitesPage({
  device,
  digest,
  digestNumber,
  articles,
  allArticles,
  feedArticles,
  selectedDigestId,
  pastDigests,
  allPastDigests,
  activeTopic,
  launchOptions,
  sectorNews,
  sectorEvents,
  companies,
  watchedSignals,
  watchedCompanyIds,
  globalWatchSettings,
  globalWatchHealth,
  latestAnalysis,
  analysisHistory,
  monthlyGeneration,
  sourceManagementSnapshot,
  initialMobileTab,
  initialMobileCompanyId,
}: VeilleActualitesPageProps) {
  const resolvedLaunchOptions: DigestLaunchOptions = launchOptions ?? {
    topics: [],
    corpora: [],
    defaultSourcesCount: 0,
  }
  const resolvedAllPastDigests = allPastDigests ?? pastDigests
  const resolvedActiveTopic = activeTopic ?? "global"

  if (device === "mobile") {
    return (
      <VeilleActualitesMobile
        articles={articles}
        feedArticles={feedArticles}
        selectedDigestId={selectedDigestId}
        pastDigests={pastDigests}
        allPastDigests={resolvedAllPastDigests}
        activeTopic={resolvedActiveTopic}
        launchOptions={resolvedLaunchOptions}
        companies={companies}
        watchedSignals={watchedSignals}
        analyses={analysisHistory}
        sourceManagementSnapshot={sourceManagementSnapshot}
        initialTab={initialMobileTab}
        initialCompanyId={initialMobileCompanyId}
      />
    )
  }

  return (
    <VeilleActualitesDesktop
      key={digest?.id ?? "veille-no-digest"}
      digest={digest}
      digestNumber={digestNumber}
      articles={articles}
      allArticles={allArticles}
      pastDigests={pastDigests}
      allPastDigests={resolvedAllPastDigests}
      activeTopic={resolvedActiveTopic}
      launchOptions={resolvedLaunchOptions}
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
    />
  )
}
