import React, { useState } from "react"
import type { CompetitiveMapSnapshot } from "@/features/competitive-map/data/competitive-map-workspace-types"
import { SectorAccountDrillDownDialog } from "./SectorAccountDrillDownDialog"
import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { SegmentValueChainReadModel } from "../data/business-intelligence-workspace-types"
import type { SectorCorpusMetadata } from "../data/get-sector-corpus-metadata"
import type { ResolvedSource } from "../shared/SourceChip"
import { SourceChipList } from "../shared/SourceChip"
import { DoncCallout } from "../shared/DoncCallout"
import { formatStudyDate, provenanceLabel } from "../home/home-model"
import { CorpusConfidenceBanner } from "../shared/CorpusConfidenceBanner"
import {
  formatAttractiveness,
  formatDigitalMaturity,
  formatMarketGrowth,
  formatMarketSize,
  formatPracticeName,
  formatTjmRange,
  parseCaveats,
  parseCriticalDependencies,
  parseEconomicModels,
  parseKeyPlayers,
  parseRiskOpportunities,
  parseTechFronts,
} from "./sector-analysis-model"

import { buildSectorValueChainSummary } from "./sector-value-chain-summary"
import { buildSectorTimeline } from "./sector-timeline-model"

type SectorAnalysisMobileProps = {
  competitiveMap?: CompetitiveMapSnapshot | null
  knowledge: SectorKnowledgeReadModel
  segmentName: string
  macroName: string | null
  corpusMetadata?: SectorCorpusMetadata | null
  sourceResolution?: Record<number, ResolvedSource>
  valueChain?: SegmentValueChainReadModel | null
  onOpenValueChain?: () => void
  onOpenPlaybook?: () => void
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
  competitiveMap,
  knowledge,
  segmentName,
  macroName,
  corpusMetadata,
  sourceResolution,
  valueChain,
  onOpenValueChain,
  onOpenPlaybook,
}: SectorAnalysisMobileProps) {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null)
  const [isDrillDownOpen, setIsDrillDownOpen] = useState<boolean>(false)
  const pacaPlayers = parseKeyPlayers(knowledge.keyPlayersPaca)
  const nationalPlayers = parseKeyPlayers(knowledge.keyPlayersNational)
  const caveats = parseCaveats(knowledge.caveats)
  const { clientBlocks, economicModels } = parseEconomicModels(knowledge.playbook)
  const techFronts = parseTechFronts(knowledge.playbook)
  const criticalDependencies = parseCriticalDependencies(knowledge.playbook)
  const riskOpportunities = parseRiskOpportunities(knowledge.playbook)
  const timeline = buildSectorTimeline({
    regulatory: knowledge.regulatory,
    events: knowledge.events,
  })

  const [openEconomicModelsMobile, setOpenEconomicModelsMobile] = useState<Record<number, boolean>>({ 0: true })
  const valueChainSummary = buildSectorValueChainSummary(valueChain)

  const resolveSource = (srcId: number) => sourceResolution?.[srcId] ?? null

  const toggleEconomicModelMobile = (index: number) => {
    setOpenEconomicModelsMobile((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

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

        {/* Comptes du segment — comparaison commerciale (Lot 4 Mobile) */}
        {competitiveMap && competitiveMap.actors.length > 0 ? (() => {
          const sortedActors = [...competitiveMap.actors].sort(
            (a, b) => (b.appetenceScore ?? -1) - (a.appetenceScore ?? -1)
          )
          const selectedActor = competitiveMap.actors.find((a) => a.id === selectedActorId) ?? null

          const handleSelectActor = (actorId: string) => {
            setSelectedActorId(actorId)
            setIsDrillDownOpen(true)
          }

          return (
            <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span>Comptes du segment ({sortedActors.length})</span>
                <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <div className="border-t border-edito-border px-4 py-3 space-y-2.5">
                <p className="text-[11px] text-edito-muted">
                  Triés par appétence commerciale décroissante. Touchez un compte pour ouvrir sa fiche complète.
                </p>
                <div className="space-y-2 pt-1">
                  {sortedActors.map((actor) => (
                    <button
                      key={actor.id}
                      type="button"
                      onClick={() => handleSelectActor(actor.id)}
                      className="flex min-h-12 w-full flex-col justify-center rounded-lg border border-edito-border/80 bg-edito-canvas/40 p-3 text-left transition-colors hover:bg-edito-canvas/80 active:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/20"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-xs text-edito-navy flex items-center gap-1">
                          {actor.name}
                          {actor.isBenchmarkAccount ? (
                            <span className="text-[10px] font-bold text-edito-brass">★</span>
                          ) : null}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs font-bold text-edito-navy">
                          <span>{actor.appetenceScore !== null ? `${actor.appetenceScore}/35` : "—"}</span>
                          {actor.appetenceProvisoire ? (
                            <span className="rounded bg-status-warning-soft px-1 py-0.2 text-[8px] font-bold uppercase text-status-warning-ink">
                              Prov.
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-edito-muted">
                        <span className="font-medium">{actor.categoryLabel}</span>
                        <span>Confiance {actor.confidence}</span>
                      </div>
                      {actor.angleEntree ? (
                        <p className="mt-1.5 line-clamp-1 border-l-2 border-edito-brass/60 pl-2 text-[11px] leading-tight text-edito-body">
                          {actor.angleEntree}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
              <SectorAccountDrillDownDialog
                actor={selectedActor}
                open={isDrillDownOpen}
                onOpenChange={setIsDrillDownOpen}
              />
            </details>
          )
        })() : null}

        {/* Blocs clients Mobile (Lot 5) */}
        {clientBlocks.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Blocs clients ({clientBlocks.length})</span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-3 space-y-3">
              {clientBlocks.map((block, idx) => (
                <div key={idx} className="rounded-lg border border-edito-border/80 bg-edito-canvas/40 p-3 space-y-2 text-xs">
                  <h3 className="font-bold text-edito-navy text-xs">{block.nom}</h3>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">Qui finance</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-edito-body">{block.quiFinance}</p>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">Cycle budgétaire</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-edito-body">{block.cycleBudgetaire}</p>
                  </div>

                  {block.srcIds.length > 0 ? (
                    <div className="pt-1 border-t border-edito-border/50 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-edito-muted">Sources :</span>
                      <SourceChipList srcIds={block.srcIds} resolve={resolveSource} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {/* Modèles économiques Mobile (Lot 5) */}
        {economicModels.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Modèles économiques ({economicModels.length})</span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-3 py-3 space-y-2.5">
              {economicModels.map((model, idx) => {
                const isOpen = Boolean(openEconomicModelsMobile[idx])
                return (
                  <div key={idx} className="rounded-lg border border-edito-border/80 bg-edito-surface overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleEconomicModelMobile(idx)}
                      className="w-full flex min-h-[44px] items-center justify-between p-3 text-left bg-edito-canvas/30 hover:bg-edito-canvas/60 active:bg-edito-chip transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-edito-navy text-xs">{model.nom}</h4>
                        {model.quiSigne ? (
                          <p className="mt-0.5 text-[10px] text-edito-muted truncate">
                            Signataire : {model.quiSigne}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs font-bold text-edito-navy">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="p-3 border-t border-edito-border space-y-2.5 text-xs bg-edito-surface">
                        {model.description ? (
                          <p className="text-[11px] leading-relaxed text-edito-body">{model.description}</p>
                        ) : null}

                        {model.quiSigne ? (
                          <div className="rounded border border-edito-border/60 bg-edito-canvas/30 p-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">Qui signe</p>
                            <p className="mt-0.5 text-[11px] text-edito-body font-medium">{model.quiSigne}</p>
                          </div>
                        ) : null}

                        {model.quandLeBudgetEstEngage ? (
                          <div className="rounded border border-edito-border/60 bg-edito-canvas/30 p-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">Budget engagé</p>
                            <p className="mt-0.5 text-[11px] text-edito-body font-medium">{model.quandLeBudgetEstEngage}</p>
                          </div>
                        ) : null}

                        {model.implicationAchatPrestation ? (
                          <div className="rounded border border-edito-border/60 bg-edito-canvas/30 p-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">Implication prestation</p>
                            <p className="mt-0.5 text-[11px] text-edito-body leading-relaxed">{model.implicationAchatPrestation}</p>
                          </div>
                        ) : null}

                        {model.srcIds.length > 0 ? (
                          <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                            <span className="font-semibold text-edito-muted">Sources :</span>
                            <SourceChipList srcIds={model.srcIds} resolve={resolveSource} />
                          </div>
                        ) : null}

                        {model.doncCommercialement ? (
                          <DoncCallout text={model.doncCommercialement} />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </details>
        ) : null}

        {/* Chaîne de valeur — vue synthétique (Lot 6 Mobile) */}
        {valueChainSummary ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="flex items-center gap-2">
                <span>Chaîne de valeur ({valueChainSummary.steps.length} étapes)</span>
                <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted uppercase">
                  {valueChainSummary.level === "segment" ? "Segment" : "Macro"}
                </span>
              </span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-4 space-y-4">
              <p className="text-[11px] text-edito-muted">
                Vue synthétique des maillons de création de valeur sur le segment.
              </p>

              {/* Timeline verticale */}
              <div className="relative pl-3 space-y-4 before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-edito-border">
                {valueChainSummary.steps.map((step) => (
                  <div key={step.id} className="relative flex items-start gap-3">
                    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-edito-navy text-[10px] font-bold text-white font-mono shadow-sm">
                      {step.order}
                    </span>
                    <div className="min-w-0 flex-1 rounded-lg border border-edito-border/80 bg-edito-canvas/40 p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-edito-muted truncate">
                          {step.stageLabel}
                        </span>
                      </div>
                      <h3 className="font-bold text-xs text-edito-navy leading-snug">
                        {step.activityLabel}
                      </h3>
                      {step.description ? (
                        <p className="text-[11px] leading-relaxed text-edito-body pt-0.5">
                          {step.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {onOpenValueChain ? (
                <div className="pt-2 border-t border-edito-border/50">
                  <button
                    type="button"
                    onClick={onOpenValueChain}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-edito-navy bg-edito-navy px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-edito-navy/90 active:bg-edito-navy/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/20"
                  >
                    <span>Explorer la chaîne de valeur</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        {/* Fronts technologiques (Lot 7 Mobile) */}
        {techFronts.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="flex items-center gap-2">
                <span>Fronts technologiques ({techFronts.length})</span>
              </span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-4 space-y-4">
              {techFronts.map((front, idx) => (
                <div key={idx} className="rounded-lg border border-edito-border/80 bg-edito-canvas/40 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-edito-brass shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3 className="font-bold text-edito-navy text-xs leading-snug">
                        {front.nom}
                      </h3>
                    </div>
                    {front.zoneDeTransition ? (
                      <span className="shrink-0 inline-flex items-center rounded border border-edito-brass/40 bg-edito-brass/10 px-1.5 py-0.5 text-[8px] font-bold text-edito-brass">
                        ● Zone de transition
                      </span>
                    ) : null}
                  </div>

                  {front.etat ? (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                        État de la transition
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-edito-body">
                        {front.etat}
                      </p>
                    </div>
                  ) : null}

                  {front.srcIds.length > 0 ? (
                    <div className="pt-1.5 border-t border-edito-border/50 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-edito-muted">Sources :</span>
                      <SourceChipList srcIds={front.srcIds} resolve={resolveSource} />
                    </div>
                  ) : null}

                  {front.doncCommercialement ? (
                    <DoncCallout text={front.doncCommercialement} />
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {/* Dépendances critiques & Supply chain (Lot 8 Mobile) */}
        {criticalDependencies.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="flex items-center gap-2">
                <span>Dépendances critiques &amp; Supply chain ({criticalDependencies.length})</span>
              </span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-4 space-y-4">
              {criticalDependencies.map((dep, idx) => {
                const formattedPractice = formatPracticeName(dep.practiceKredo)
                return (
                  <div key={idx} className="rounded-lg border border-edito-border/80 bg-edito-canvas/40 p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        {dep.criticite ? (
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-bold ${
                              dep.criticite === "haute"
                                ? "border border-status-warning-ink/30 bg-status-warning-soft text-status-warning-ink"
                                : "border border-edito-border bg-edito-chip text-edito-navy"
                            }`}
                          >
                            Criticité {dep.criticite}
                          </span>
                        ) : null}
                        <h3 className="font-bold text-edito-navy text-xs leading-snug">
                          {dep.nom}
                        </h3>
                      </div>
                      {formattedPractice ? (
                        <span className="shrink-0 rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-bold text-edito-navy">
                          {formattedPractice}
                        </span>
                      ) : null}
                    </div>

                    {dep.situation ? (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                          Situation
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-edito-body">
                          {dep.situation}
                        </p>
                      </div>
                    ) : null}

                    {dep.risque ? (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                          Risque
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-edito-body">
                          {dep.risque}
                        </p>
                      </div>
                    ) : null}

                    {dep.prestationOuverte ? (
                      <div className="rounded border border-edito-border/60 bg-edito-surface p-2.5 space-y-0.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-edito-navy">
                          Prestation ESN ouverte
                        </p>
                        <p className="text-[11px] font-medium leading-relaxed text-edito-body">
                          {dep.prestationOuverte}
                        </p>
                      </div>
                    ) : null}

                    {dep.srcIds.length > 0 ? (
                      <div className="pt-1.5 border-t border-edito-border/50 flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-edito-muted">Sources :</span>
                        <SourceChipList srcIds={dep.srcIds} resolve={resolveSource} />
                      </div>
                    ) : null}

                    {dep.doncCommercialement ? (
                      <DoncCallout text={dep.doncCommercialement} />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </details>
        ) : null}

        {/* Réglementation & ruptures sectorielles (Lot 9 Mobile) */}
        {timeline.datedItems.length > 0 || timeline.permanentItems.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="flex items-center gap-2">
                <span>Réglementation &amp; ruptures ({timeline.datedItems.length + timeline.permanentItems.length})</span>
              </span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-4 space-y-4">
              <p className="text-[11px] text-edito-muted">
                Frise unifiée des jalons réglementaires et des ruptures majeures du segment.
              </p>

              {/* Trajectoire datée */}
              {timeline.datedItems.length > 0 ? (
                <div className="relative pl-3 space-y-4 before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-edito-border">
                  {timeline.datedItems.map((item) => {
                    const formattedPractice = formatPracticeName(item.practiceKredo)
                    const itemDate = item.date ? new Date(item.date) : null
                    const formattedDateStr = itemDate && !Number.isNaN(itemDate.getTime())
                      ? itemDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
                      : item.date

                    return (
                      <details key={item.id} className="group/item relative flex items-start">
                        <summary className="flex min-h-[44px] cursor-pointer list-none items-start gap-3 rounded-lg border border-edito-border/80 bg-edito-canvas/40 p-3 w-full text-left transition-colors hover:bg-edito-canvas/80 active:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/20">
                          <span
                            className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border bg-edito-surface ${
                              item.kind === "regulatory"
                                ? "border-edito-navy text-edito-navy"
                                : "border-edito-brass text-edito-brass"
                            }`}
                          >
                            {item.kind === "regulatory" ? "●" : "◆"}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold text-edito-navy bg-edito-surface border border-edito-border px-1.5 py-0.2 rounded">
                                {formattedDateStr}
                              </span>
                              <div className="flex items-center gap-1">
                                {item.urgency ? (
                                  <span className="rounded bg-status-warning-soft px-1 py-0.2 text-[8px] font-bold uppercase text-status-warning-ink">
                                    {item.urgency}
                                  </span>
                                ) : null}
                                <ProvenanceBadge level={item.resolvedLevel} />
                              </div>
                            </div>
                            <h4 className="font-bold text-xs text-edito-navy leading-snug">
                              {item.title}
                            </h4>
                          </div>
                          <span className="text-edito-muted text-xs transition-transform group-open/item:rotate-180 shrink-0 mt-1">⌄</span>
                        </summary>

                        <div className="mt-2 pl-9 space-y-2 text-xs text-edito-body">
                          {item.authority ? (
                            <p className="text-[10px] font-semibold text-edito-muted">
                              Autorité : {item.authority}
                            </p>
                          ) : null}

                          {item.description ? (
                            <p className="text-[11px] leading-relaxed text-edito-body">
                              {item.description}
                            </p>
                          ) : null}

                          {formattedPractice ? (
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-edito-muted">Practice :</span>
                              <span className="rounded bg-edito-chip px-1.5 py-0.5 font-bold text-edito-navy">
                                {formattedPractice}
                              </span>
                            </div>
                          ) : null}

                          {item.sourceUrl ? (
                            <div>
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-[44px] items-center text-xs font-bold text-edito-petrol hover:underline"
                              >
                                Consulter la source ↗
                              </a>
                            </div>
                          ) : null}

                          {item.commercialAngle ? (
                            <DoncCallout text={item.commercialAngle} />
                          ) : null}
                        </div>
                      </details>
                    )
                  })}
                </div>
              ) : null}

              {/* Cadres permanents Mobile */}
              {timeline.permanentItems.length > 0 ? (
                <div className="space-y-2 pt-3 border-t border-edito-border/60">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                    Cadres permanents
                  </h4>
                  {timeline.permanentItems.map((item) => {
                    const formattedPractice = formatPracticeName(item.practiceKredo)
                    return (
                      <details key={item.id} className="group/perm rounded-lg border border-edito-border/80 bg-edito-canvas/40 overflow-hidden">
                        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between p-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-edito-navy truncate">{item.title}</span>
                              <ProvenanceBadge level={item.resolvedLevel} />
                            </div>
                          </div>
                          <span className="text-edito-muted transition-transform group-open/perm:rotate-180 shrink-0">⌄</span>
                        </summary>
                        <div className="p-3 border-t border-edito-border/60 space-y-2 text-xs bg-edito-surface">
                          {item.authority ? (
                            <p className="text-[10px] font-semibold text-edito-muted">
                              Autorité : {item.authority}
                            </p>
                          ) : null}
                          {item.description ? (
                            <p className="text-[11px] leading-relaxed text-edito-body">{item.description}</p>
                          ) : null}
                          {formattedPractice ? (
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-edito-muted">Practice :</span>
                              <span className="rounded bg-edito-chip px-1.5 py-0.5 font-bold text-edito-navy">{formattedPractice}</span>
                            </div>
                          ) : null}
                          {item.sourceUrl ? (
                            <div>
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-[44px] items-center text-xs font-bold text-edito-petrol hover:underline"
                              >
                                Consulter la source ↗
                              </a>
                            </div>
                          ) : null}
                          {item.commercialAngle ? (
                            <DoncCallout text={item.commercialAngle} />
                          ) : null}
                        </div>
                      </details>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        {/* Risques × opportunités (Lot 10 Mobile) */}
        {riskOpportunities.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="flex items-center gap-2">
                <span>Risques × opportunités ({riskOpportunities.length})</span>
              </span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-4 space-y-4">
              <p className="text-[11px] text-edito-muted">
                Les principales fragilités du segment et les chantiers de transformation associés.
              </p>

              <div className="space-y-4">
                {riskOpportunities.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-edito-border/80 bg-edito-canvas/40 p-3.5 space-y-3 text-xs"
                  >
                    {/* Numéro & Risque */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-edito-navy/10 text-[9px] font-bold text-edito-navy">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-edito-navy">
                          Risque
                        </span>
                      </div>
                      <p className="text-xs font-semibold leading-relaxed text-edito-navy">
                        {item.risk}
                      </p>
                    </div>

                    {/* Connecteur visuel */}
                    <div className="flex items-center justify-center text-edito-muted text-[10px]" aria-hidden="true">
                      ↓
                    </div>

                    {/* Opportunité */}
                    <div className="rounded border border-edito-brass/30 bg-edito-surface p-2.5 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-edito-brass">
                        Opportunité de transformation
                      </span>
                      {item.opportunity ? (
                        <p className="text-[11px] leading-relaxed text-edito-body">
                          {item.opportunity}
                        </p>
                      ) : null}
                    </div>

                    {/* Sources */}
                    {item.srcIds.length > 0 ? (
                      <div className="pt-2 border-t border-edito-border/50 flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-edito-muted">Sources :</span>
                        <SourceChipList srcIds={item.srcIds} resolve={resolveSource} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </details>
        ) : null}

        {/* Écosystème & Acteurs clés */}
        {pacaPlayers.length > 0 || nationalPlayers.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Écosystème &amp; Acteurs clés ({pacaPlayers.length + nationalPlayers.length})</span>
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
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">Acteurs Nationaux &amp; Internationaux</h3>
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

        {/* Pain points sectoriels (Lot 11 Mobile) */}
        {knowledge.painPoints.length > 0 ? (
          <details className="group rounded-xl border border-edito-border bg-edito-surface overflow-hidden shadow-sm" open>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Pain points sectoriels ({knowledge.painPoints.length})</span>
              <span className="text-edito-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-edito-border px-4 py-4 space-y-4">
              <p className="text-[11px] text-edito-muted">
                Les difficultés les plus fréquemment observées dans le segment et son environnement sectoriel.
              </p>

              <div className="space-y-3">
                {knowledge.painPoints.map((point, idx) => {
                  const formattedPractice = formatPracticeName(point.kredoPractice)
                  return (
                    <div key={point.id} className="rounded-lg border border-edito-border/80 bg-edito-canvas/40 p-3.5 space-y-2.5 text-xs">
                      {/* Header item: Index + Title + Frequency + Provenance */}
                      <div className="flex flex-col space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-edito-navy">
                            <span className="font-mono font-bold bg-edito-chip px-1.5 py-0.2 rounded text-edito-navy">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className="font-mono font-bold text-edito-navy">
                              {point.frequencyCount} {point.frequencyCount > 1 ? "occurrences" : "occurrence"}
                            </span>
                          </div>
                          <ProvenanceBadge level={point.resolvedLevel} />
                        </div>

                        <h3 className="font-bold text-edito-navy text-xs leading-snug">
                          {point.title}
                        </h3>
                      </div>

                      {/* Description conditionnelle */}
                      {point.description ? (
                        <p className="text-[11px] leading-relaxed text-edito-body">
                          {point.description}
                        </p>
                      ) : null}

                      {/* Verbatim conditionnel */}
                      {point.verbatim ? (
                        <blockquote className="border-l-2 border-edito-brass/80 pl-2.5 text-[11px] italic text-edito-muted">
                          « {point.verbatim} »
                        </blockquote>
                      ) : null}

                      {/* Practice Kredo formatée conditionnelle */}
                      {formattedPractice ? (
                        <div className="pt-1.5 border-t border-edito-border/40 flex items-center gap-1.5 text-[10px]">
                          <span className="text-edito-muted">Practice :</span>
                          <span className="rounded bg-edito-chip px-1.5 py-0.5 font-bold text-edito-navy">
                            {formattedPractice}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {/* CTA Playbook Mobile */}
              {onOpenPlaybook ? (
                <div className="pt-2 border-t border-edito-border/50">
                  <button
                    type="button"
                    onClick={onOpenPlaybook}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-edito-navy bg-edito-navy px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-edito-navy/90 active:bg-edito-navy/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/20"
                  >
                    <span>Approfondir les enjeux commerciaux — Ouvrir le Playbook</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              ) : null}
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
