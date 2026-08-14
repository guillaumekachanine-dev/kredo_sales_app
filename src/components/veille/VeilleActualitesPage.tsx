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

interface VeilleActualitesPageProps {
  device: DashboardDevice
  digest: VeilleDigest | null
  digestNumber: number | null
  articles: VeilleArticle[]
  /** Flux transverse aux briefings — consommé par la seule vue mobile. */
  feedArticles: VeilleArticle[]
  /** Digest retenu côté serveur (contrat `?digestId=`) — vue mobile seule. */
  selectedDigestId: string | null
  pastDigests: VeilleDigest[]
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
  initialMobileTab?: "veille"
  initialMobileCompanyId?: string
}

export function VeilleActualitesPage({
  device,
  digest,
  digestNumber,
  articles,
  feedArticles,
  selectedDigestId,
  pastDigests,
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
  initialMobileTab,
  initialMobileCompanyId,
}: VeilleActualitesPageProps) {
  if (device === "mobile") {
    return (
      <VeilleActualitesMobile
        articles={articles}
        feedArticles={feedArticles}
        selectedDigestId={selectedDigestId}
        pastDigests={pastDigests}
        companies={companies}
        watchedSignals={watchedSignals}
        analyses={analysisHistory}
        initialTab={initialMobileTab}
        initialCompanyId={initialMobileCompanyId}
      />
    )
  }

  return (
    <VeilleActualitesDesktop
      digest={digest}
      digestNumber={digestNumber}
      articles={articles}
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
  )
}
