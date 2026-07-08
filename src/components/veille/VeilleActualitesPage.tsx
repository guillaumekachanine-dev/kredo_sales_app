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

interface VeilleActualitesPageProps {
  device: DashboardDevice
  digest: VeilleDigest | null
  articles: VeilleArticle[]
  pastDigests: VeilleDigest[]
  sectorNews: SectorNews[]
  sectorEvents: SectorEvent[]
  companies: CompanyContextStats[]
  watchedSignals: WatchedAccountSignal[]
}

export function VeilleActualitesPage({
  device,
  digest,
  articles,
  pastDigests,
  sectorNews,
  sectorEvents,
  companies,
  watchedSignals,
}: VeilleActualitesPageProps) {
  if (device === "mobile") {
    return (
      <VeilleActualitesMobile
        digest={digest}
        articles={articles}
        pastDigests={pastDigests}
        sectorNews={sectorNews}
        sectorEvents={sectorEvents}
        companies={companies}
        watchedSignals={watchedSignals}
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
    />
  )
}

