import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { SectorCorpusMetadata } from "../data/get-sector-corpus-metadata"
import type { ResolvedSource } from "../shared/SourceChip"
import { formatStudyDate, provenanceLabel } from "../home/home-model"
import { CorpusConfidenceBanner } from "../shared/CorpusConfidenceBanner"
import {
  formatAttractiveness,
  formatDigitalMaturity,
  formatMarketGrowth,
  formatMarketSize,
  formatTjmRange,
  parseCaveats,
  parseKeyPlayers,
} from "./sector-analysis-model"

type SectorAnalysisMobileProps = {
  knowledge: SectorKnowledgeReadModel
  segmentName: string
  macroName: string | null
  corpusMetadata?: SectorCorpusMetadata | null
  sourceResolution?: Record<number, ResolvedSource>
}

function ProvenanceBadge({ level }: { level: SectorResolvedLevel | "segment" | "macro" | null | undefined }) {
  const label = provenanceLabel((level as SectorResolvedLevel) ?? null)
  if (!label) return null
  return (
    <span className="inline-flex items-center rounded border border-edito-border bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-edito-muted">
      {label}
    </span>
  )
}

export function SectorAnalysisChapterMobile({
  knowledge,
  segmentName,
  macroName,
  corpusMetadata,
}: SectorAnalysisMobileProps) {
  const pacaPlayers = parseKeyPlayers(knowledge.keyPlayersPaca)
  const nationalPlayers = parseKeyPlayers(knowledge.keyPlayersNational)
  const caveats = parseCaveats(knowledge.caveats)

  const marketSize = formatMarketSize(knowledge.marketSizeEurBn, knowledge.marketSizeEurBnLevel)
  const marketGrowth = formatMarketGrowth(knowledge.marketGrowthPct, knowledge.marketGrowthPctLevel)
  const attractiveness = formatAttractiveness(knowledge.attractivenessScore)
  const digitalMaturity = formatDigitalMaturity(knowledge.digitalMaturity)
  const tjmRange = formatTjmRange(knowledge.avgTjmMin, knowledge.avgTjmMax)

  const metrics = [
    marketSize ? {
      label: "Marché",
      value: marketSize.value,
      level: marketSize.isLocked ? null : knowledge.marketSizeEurBnLevel,
      isLocked: marketSize.isLocked,
    } : null,
    marketGrowth ? {
      label: "Croissance",
      value: marketGrowth.value,
      level: marketGrowth.isLocked ? null : knowledge.marketGrowthPctLevel,
      isLocked: marketGrowth.isLocked,
    } : null,
    attractiveness ? {
      label: "Attractivité",
      value: attractiveness,
      level: knowledge.attractivenessScoreLevel,
      isLocked: false,
    } : null,
    digitalMaturity ? {
      label: "Maturité",
      value: digitalMaturity,
      level: null,
      isLocked: false,
    } : null,
    tjmRange ? {
      label: "TJM réf.",
      value: tjmRange,
      level: null,
      isLocked: false,
    } : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <div className="space-y-4 px-4 py-4" data-chapter="sector-analysis-mobile">
      {/* Bandeau de confiance (Mobile) */}
      {corpusMetadata ? (
        <CorpusConfidenceBanner
          qualityVerdict={corpusMetadata.qualityVerdict}
          activationState={corpusMetadata.activationState}
          snapshotDate={corpusMetadata.snapshotDate}
          gaps={corpusMetadata.gaps}
        />
      ) : null}

      {/* En-tête Mobile */}
      <section className="rounded-xl border border-edito-border bg-edito-surface p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">{macroName ?? "Macro-secteur"}</p>
        <h1 className="mt-1 font-heading text-xl font-bold text-edito-navy">{segmentName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-edito-body">
          <span className="font-semibold text-edito-navy">{knowledge.effectiveStatus}</span>
          <span aria-hidden="true">·</span>
          <span className="text-edito-muted">{formatStudyDate(knowledge.studySnapshotDate)}</span>
        </div>

        {/* Métriques clés en grille compacte */}
        {metrics.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-edito-border pt-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-edito-border/80 bg-edito-canvas/60 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">{metric.label}</span>
                  <ProvenanceBadge level={metric.level} />
                </div>
                <p className={`mt-1 font-heading font-bold text-edito-navy ${
                  metric.isLocked ? "text-xs italic text-edito-muted" : "text-base"
                }`}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Synthèse */}
      {knowledge.description ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-edito-border pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-edito-navy">Synthèse du marché</h2>
            <ProvenanceBadge level={knowledge.descriptionLevel} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-edito-body whitespace-pre-line">{knowledge.description}</p>
        </section>
      ) : null}

      {/* Accordéons / Sections progressives tactiles (touch target >= 44px) */}
      <div className="space-y-2">
        {/* Écosystème & Acteurs clés */}
        {pacaPlayers.length > 0 || nationalPlayers.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Écosystème & Acteurs clés ({pacaPlayers.length + nationalPlayers.length})</span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-3 space-y-4">
              {/* Priorité 1 : Ancrage régional PACA */}
              {pacaPlayers.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">Ancrage Régional (PACA)</h3>
                    <span className="text-[10px] text-edito-muted">{pacaPlayers.length} acteur{pacaPlayers.length > 1 ? "s" : ""}</span>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {pacaPlayers.map((player, idx) => (
                      <li key={idx} className="rounded-lg border border-edito-border/70 bg-edito-canvas/40 p-2.5 text-xs">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-bold text-edito-navy">{player.name}</span>
                          {player.size ? (
                            <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted">
                              {player.size}
                            </span>
                          ) : null}
                        </div>
                        {player.note ? <p className="mt-1 text-[11px] leading-relaxed text-edito-body">{player.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Priorité 2 : Benchmarks nationaux & internationaux */}
              {nationalPlayers.length > 0 ? (
                <div className={pacaPlayers.length > 0 ? "border-t border-edito-border/50 pt-3" : ""}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">Acteurs Nationaux & Internationaux</h3>
                    <span className="text-[10px] text-edito-muted">{nationalPlayers.length} acteur{nationalPlayers.length > 1 ? "s" : ""}</span>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {nationalPlayers.map((player, idx) => (
                      <li key={idx} className="rounded-lg border border-edito-border/70 bg-edito-canvas/40 p-2.5 text-xs">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-bold text-edito-navy">{player.name}</span>
                          {player.size ? (
                            <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted">
                              {player.size}
                            </span>
                          ) : null}
                        </div>
                        {player.note ? <p className="mt-1 text-[11px] leading-relaxed text-edito-body">{player.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        {/* Pain points */}
        {knowledge.painPoints.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Points de douleur ({knowledge.painPoints.length})</span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-3 space-y-3">
              {knowledge.painPoints.map((point) => (
                <div key={point.id} className="rounded-lg border border-edito-border/70 bg-edito-canvas/40 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-edito-navy">{point.title}</h3>
                    <ProvenanceBadge level={point.resolvedLevel} />
                  </div>
                  {point.description ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-edito-body">{point.description}</p>
                  ) : null}
                  {point.verbatim ? (
                    <p className="mt-2 border-l-2 border-edito-brass pl-2 text-[11px] italic text-edito-muted">
                      « {point.verbatim} »
                    </p>
                  ) : null}
                  {point.kredoPractice ? (
                    <p className="mt-2 text-[10px] font-semibold text-edito-petrol">
                      Practice : {point.kredoPractice}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {/* Événements */}
        {knowledge.events.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Événements & Jalons ({knowledge.events.length})</span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-3 space-y-2.5">
              {knowledge.events.map((evt) => (
                <div key={evt.id} className="border-b border-edito-border/50 pb-2.5 last:border-b-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-edito-petrol">{evt.eventType}</span>
                    {evt.eventDate ? (
                      <span className="text-[10px] text-edito-muted">
                        {new Date(evt.eventDate).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-0.5 font-semibold text-edito-navy">{evt.title}</h3>
                  {evt.commercialOpportunity ? (
                    <p className="mt-1 text-[11px] text-edito-brass">{evt.commercialOpportunity}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {/* Sources & Limites */}
        {caveats ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Sources méthodologiques</span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-3 text-xs text-edito-body space-y-2">
              {caveats.corpus ? <p><strong className="font-semibold text-edito-navy">Corpus :</strong> {caveats.corpus}</p> : null}
              {caveats.sources.length > 0 ? (
                <div>
                  <strong className="font-semibold text-edito-navy">Sources :</strong>
                  <ul className="mt-1 list-disc pl-4 text-edito-muted">
                    {caveats.sources.map((src, idx) => (
                      <li key={idx}>{src}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  )
}
