import type { AnalyseSector } from "@/lib/intelligence/intelligence-data"
import { buildFolioFallbackSectorView, type ClientIntelligenceSectorView } from "@/lib/intelligence/client-intelligence-sector"
import type { SectorSnapshotView } from "@/lib/intelligence/sector-snapshot-data"
import { SectionBlock, SectorLevelBadge } from "./intelligence-parts"
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
      {!view.hasAnyKnowledge ? (
        <div className="col-span-12"><SectorNoKnowledgeState data={view} /></div>
      ) : null}
      <div className="col-span-12"><SectorMarketSection market={view.market} /></div>
      <div className="col-span-12">
        <SectorActorMap
          actors={view.actors}
          displayedKredoAccountsCount={view.displayedKredoAccountsCount}
          unclassifiedKredoAccountsCount={view.unclassifiedKredoAccountsCount}
        />
      </div>
      <div className="col-span-12 lg:col-span-5"><SectorPainPointsSection painPoints={view.painPoints} macroName={view.macroName} /></div>
      <div className="col-span-12 lg:col-span-7"><SectorRegulatoryTimeline items={view.regulatoryItems} macroName={view.macroName} /></div>
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
      {!view.hasAnyKnowledge ? <SectorNoKnowledgeState data={view} /> : null}
      <SectorMarketSection market={view.market} compact />
      <SectorActorMobileList
        actors={view.actors}
        displayedKredoAccountsCount={view.displayedKredoAccountsCount}
        unclassifiedKredoAccountsCount={view.unclassifiedKredoAccountsCount}
      />
      <SectorPainPointsSection painPoints={view.painPoints} macroName={view.macroName} />
      <SectorRegulatoryTimeline items={view.regulatoryItems} macroName={view.macroName} />
      <SectorCommercialWindowsSection windows={view.openCommercialWindows} />
      <SectorCommercialEventsSection events={view.events} />
    </div>
  )
}

function SectorIntroduction({ data, compact = false }: { data: ClientIntelligenceSectorView; compact?: boolean }) {
  const folioAddsInformation = data.folioSummary && data.folioSummary.trim() !== data.description?.trim()
  // L0 — un chiffre hérité du macro porte le même badge que la description
  // héritée (SectorLevelBadge). `level: null` = pas de notion de provenance
  // pour ce stat (les pairs portent déjà leur maille dans le libellé).
  const stats = [
    data.attractivenessScore !== null || data.attractivenessScoreLevel === "locked"
      ? {
          label: "Attractivité",
          value: data.attractivenessScoreLevel === "locked" ? "Non publié" : `${data.attractivenessScore}/5`,
          level: data.attractivenessScoreLevel,
        }
      : null,
    data.marketSizeEurBn !== null || data.marketSizeLevel === "locked"
      ? {
          label: "Taille marché KREDO",
          value: data.marketSizeLevel === "locked" ? "Non publié" : `${data.marketSizeEurBn} Md€`,
          level: data.marketSizeLevel,
        }
      : null,
    data.marketGrowthPct !== null || data.marketGrowthLevel === "locked"
      ? {
          label: "Croissance KREDO",
          value: data.marketGrowthLevel === "locked" ? "Non publié" : `${data.marketGrowthPct}%`,
          level: data.marketGrowthLevel,
        }
      : null,
    {
      label: data.peersLevel === "segment" ? "Pairs du segment" : "Pairs du macro-secteur",
      value: `${data.exposedAccountsCount} compte${data.exposedAccountsCount > 1 ? "s" : ""}`,
      level: null,
    },
  ].filter((item): item is { label: string; value: string; level: ClientIntelligenceSectorView["attractivenessScoreLevel"] | null } => Boolean(item))

  return (
    <SectionBlock title={data.name} action={<span className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Chapeau sectoriel</span>}>
      <div className="flex flex-col gap-4">
        {data.macroName ? (
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Segment de « {data.macroName} »
          </p>
        ) : null}
        {data.description ? (
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              Synthèse KREDO
              <SectorLevelBadge level={data.descriptionLevel} macroName={data.macroName} />
            </p>
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
              <dt className="flex flex-wrap items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted">
                {stat.label}
                {stat.level ? <SectorLevelBadge level={stat.level} macroName={data.macroName} /> : null}
              </dt>
              <dd className="mt-0.5 text-base font-bold text-heading">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionBlock>
  )
}

// Lot 0 — critère de sortie n°5 : un compte rattaché à un macro-secteur sans
// aucune connaissance (3 macros, 19 comptes) doit lire POURQUOI son onglet est
// vide, au lieu de tomber sur un écran muet qu'il prendra pour un bug.
function SectorNoKnowledgeState({ data }: { data: ClientIntelligenceSectorView }) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-surface px-4 py-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Aucune connaissance sectorielle disponible</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Ni le segment « {data.name} »{data.macroName ? ` ni son macro-secteur « ${data.macroName} »` : ""} ne portent
        pour l&apos;instant d&apos;échéance réglementaire, de pain point ou d&apos;événement documenté. Le compte est
        bien classé : c&apos;est l&apos;étude sectorielle qui reste à produire.
      </p>
    </section>
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
