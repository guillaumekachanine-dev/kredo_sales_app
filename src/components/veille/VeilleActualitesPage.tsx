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
  articles: VeilleArticle[]
  /** Flux transverse aux briefings — consommé par la seule vue mobile. */
  feedArticles: VeilleArticle[]
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
}

export function VeilleActualitesPage({
  device,
  digest,
  articles,
  feedArticles,
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
}: VeilleActualitesPageProps) {
  if (device === "mobile") {
    return (
      <VeilleActualitesMobile
        articles={articles}
        feedArticles={feedArticles}
        pastDigests={pastDigests}
        companies={companies}
        watchedSignals={watchedSignals}
        analyses={analysisHistory}
      />
    )
  }

  return (
    <VeilleActualitesDesktop
      digest={digest}
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
