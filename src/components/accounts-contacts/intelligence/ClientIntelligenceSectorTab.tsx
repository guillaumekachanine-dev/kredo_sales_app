import type { AnalyseSector } from "@/lib/intelligence/intelligence-data"
import { buildFolioFallbackSectorView, type ClientIntelligenceSectorView } from "@/lib/intelligence/client-intelligence-sector"
import type { SectorSnapshotView } from "@/lib/intelligence/sector-snapshot-data"
import { SectionBlock } from "./intelligence-parts"
import { SectorMarketSection } from "./SectorMarketSection"
import { SectorActorMap, SectorActorMobileList } from "./SectorActorMap"
import { SectorPainPointsSection } from "./SectorPainPointsSection"
import { SectorRegulatoryTimeline } from "./SectorRegulatoryTimeline"
import { SectorCommercialEventsSection } from "./SectorCommercialEventsSection"
import { SectorCommercialWindowsSection } from "./SectorCommercialWindowsSection"

type SectorFallback = {
  companyId: string
  companyName: string
  companySegment: string | null
  sectorName: string
  sectorAnalysis: AnalyseSector
}

type ClientIntelligenceSectorTabProps = {
  data: SectorSnapshotView | null
  fallback: SectorFallback | null
}

function resolveView({ data, fallback }: ClientIntelligenceSectorTabProps): ClientIntelligenceSectorView | null {
  if (data) return data
  if (!fallback) return null
  return buildFolioFallbackSectorView(fallback)
}

export function ClientIntelligenceSectorTab(props: ClientIntelligenceSectorTabProps) {
  const view = resolveView(props)
  if (!view) return <SectorEmptyState />

  return (
    <div className="grid min-w-0 grid-cols-12 gap-6 pt-6">
      <div className="col-span-12"><SectorIntroduction data={view} /></div>
      <div className="col-span-12"><SectorMarketSection market={view.market} /></div>
      <div className="col-span-12">
        <SectorActorMap
          actors={view.actors}
          displayedKredoAccountsCount={view.displayedKredoAccountsCount}
          unclassifiedKredoAccountsCount={view.unclassifiedKredoAccountsCount}
        />
      </div>
      <div className="col-span-12 lg:col-span-5"><SectorPainPointsSection painPoints={view.painPoints} /></div>
      <div className="col-span-12 lg:col-span-7"><SectorRegulatoryTimeline items={view.regulatoryItems} /></div>
      <div className="col-span-12 lg:col-span-6"><SectorCommercialEventsSection events={view.events} /></div>
      <div className="col-span-12 lg:col-span-6"><SectorCommercialWindowsSection windows={view.openCommercialWindows} /></div>
    </div>
  )
}

export function ClientIntelligenceSectorMobileTab(props: ClientIntelligenceSectorTabProps) {
  const view = resolveView(props)
  if (!view) return <SectorEmptyState />

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SectorIntroduction data={view} compact />
      <SectorMarketSection market={view.market} compact />
      <SectorActorMobileList
        actors={view.actors}
        displayedKredoAccountsCount={view.displayedKredoAccountsCount}
        unclassifiedKredoAccountsCount={view.unclassifiedKredoAccountsCount}
      />
      <SectorPainPointsSection painPoints={view.painPoints} />
      <SectorRegulatoryTimeline items={view.regulatoryItems} />
      <SectorCommercialWindowsSection windows={view.openCommercialWindows} />
      <SectorCommercialEventsSection events={view.events} />
    </div>
  )
}

function SectorIntroduction({ data, compact = false }: { data: ClientIntelligenceSectorView; compact?: boolean }) {
  const folioAddsInformation = data.folioSummary && data.folioSummary.trim() !== data.description?.trim()
  const stats = [
    data.attractivenessScore !== null ? { label: "Attractivité", value: `${data.attractivenessScore}/5` } : null,
    data.marketSizeEurBn !== null ? { label: "Taille marché KREDO", value: `${data.marketSizeEurBn} Md€` } : null,
    data.marketGrowthPct !== null ? { label: "Croissance KREDO", value: `${data.marketGrowthPct}%` } : null,
    { label: "Portefeuille", value: `${data.exposedAccountsCount} compte${data.exposedAccountsCount > 1 ? "s" : ""}` },
  ].filter((item): item is { label: string; value: string } => Boolean(item))

  return (
    <SectionBlock title={data.name} action={<span className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Chapeau sectoriel</span>}>
      <div className="flex flex-col gap-4">
        {data.description ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Synthèse KREDO</p>
            <p className="mt-1 text-sm leading-relaxed text-body">{data.description}</p>
          </div>
        ) : null}
        {folioAddsInformation ? (
          <div className="border-l-2 border-brand-brass pl-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Éclairage FOLIO du compte</p>
            <p className="mt-1 text-sm leading-relaxed text-body">{data.folioSummary}</p>
          </div>
        ) : null}
        {!data.description && !data.folioSummary ? <p className="text-xs italic text-muted">Aucune synthèse sectorielle disponible.</p> : null}
        <dl className={compact ? "grid grid-cols-2 gap-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
          {stats.map((stat) => (
            <div key={stat.label} className="border-t border-border pt-2">
              <dt className="text-[9px] font-bold uppercase tracking-wider text-muted">{stat.label}</dt>
              <dd className="mt-0.5 text-base font-bold text-heading">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionBlock>
  )
}

function SectorEmptyState() {
  return (
    <section className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center">
      <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Intelligence sectorielle indisponible</h3>
      <p className="mt-2 text-xs text-muted">Aucun rattachement KREDO ni contenu FOLIO exploitable pour ce compte.</p>
    </section>
  )
}
