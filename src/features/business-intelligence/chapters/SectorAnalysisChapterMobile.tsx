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
  formatTjmRange,
  parseCaveats,
  parseEconomicModels,
  parseKeyPlayers,
  parseTechFronts,
} from "./sector-analysis-model"
import { buildSectorValueChainSummary } from "./sector-value-chain-summary"

type SectorAnalysisMobileProps = {
  competitiveMap?: CompetitiveMapSnapshot | null
  knowledge: SectorKnowledgeReadModel
  segmentName: string
  macroName: string | null
  corpusMetadata?: SectorCorpusMetadata | null
  sourceResolution?: Record<number, ResolvedSource>
  valueChain?: SegmentValueChainReadModel | null
  onOpenValueChain?: () => void
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
}: SectorAnalysisMobileProps) {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null)
  const [isDrillDownOpen, setIsDrillDownOpen] = useState<boolean>(false)
  const pacaPlayers = parseKeyPlayers(knowledge.keyPlayersPaca)
  const nationalPlayers = parseKeyPlayers(knowledge.keyPlayersNational)
  const caveats = parseCaveats(knowledge.caveats)
  const { clientBlocks, economicModels } = parseEconomicModels(knowledge.playbook)
  const techFronts = parseTechFronts(knowledge.playbook)
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
