import React, { useState } from "react"
import type { CompetitiveMapSnapshot } from "@/features/competitive-map/data/competitive-map-workspace-types"
import { SectorAccountScatterPlot } from "./SectorAccountScatterPlot"
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
  buildSectorMarketKpis,
  formatPracticeName,
  parseCaveats,
  parseCriticalDependencies,
  parseEconomicModels,
  parseKeyPlayers,
  parseRiskOpportunities,
  parseTechFronts,
} from "./sector-analysis-model"

import { buildSectorValueChainSummary } from "./sector-value-chain-summary"
import { buildSectorTimeline } from "./sector-timeline-model"

export type SectorAnalysisProps = {
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

function UrgencyBadge({ urgency }: { urgency: string }) {
  const norm = urgency.toLowerCase()
  if (norm === "haute" || norm === "urgent" || norm === "high" || norm === "critique" || norm === "critical") {
    return (
      <span className="inline-flex items-center rounded border border-status-warning-ink/30 bg-status-warning-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-status-warning-ink">
        Urgence haute
      </span>
    )
  }
  if (norm === "moyenne" || norm === "medium") {
    return (
      <span className="inline-flex items-center rounded border border-edito-border bg-edito-chip px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-edito-navy">
        Urgence moyenne
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded border border-edito-border bg-edito-chip px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-edito-muted">
      Normal
    </span>
  )
}

export function SectorAnalysisChapterDesktop({
  competitiveMap,
  knowledge,
  segmentName,
  macroName,
  corpusMetadata,
  sourceResolution,
  valueChain,
  onOpenValueChain,
  onOpenPlaybook,
}: SectorAnalysisProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedConfidence, setSelectedConfidence] = useState<string>("all")
  const [sortByAppetence, setSortByAppetence] = useState<boolean>(true)
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null)
  const [isDrillDownOpen, setIsDrillDownOpen] = useState<boolean>(false)
  const pacaPlayers = parseKeyPlayers(knowledge.keyPlayersPaca)
  const nationalPlayers = parseKeyPlayers(knowledge.keyPlayersNational)
  const caveats = parseCaveats(knowledge.caveats)
  const metrics = buildSectorMarketKpis(knowledge)
  const { clientBlocks, economicModels } = parseEconomicModels(knowledge.playbook)
  const techFronts = parseTechFronts(knowledge.playbook)
  const [currentTimestamp] = useState(() => Date.now())
  const criticalDependencies = parseCriticalDependencies(knowledge.playbook)
  const riskOpportunities = parseRiskOpportunities(knowledge.playbook)
  const timeline = buildSectorTimeline({
    regulatory: knowledge.regulatory,
    events: knowledge.events,
  })

  const [openEconomicModels, setOpenEconomicModels] = useState<Record<number, boolean>>({ 0: true })
  const valueChainSummary = buildSectorValueChainSummary(valueChain)

  const resolveSource = (srcId: number) => sourceResolution?.[srcId] ?? null

  const toggleEconomicModel = (index: number) => {
    setOpenEconomicModels((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  return (
    <div className="space-y-6" data-chapter="sector-analysis">
      {/* Bandeau de confiance du corpus (persistant si métadonnées disponibles) */}
      {corpusMetadata ? (
        <CorpusConfidenceBanner
          qualityVerdict={corpusMetadata.qualityVerdict}
          activationState={corpusMetadata.activationState}
          snapshotDate={corpusMetadata.snapshotDate}
          gaps={corpusMetadata.gaps}
        />
      ) : null}

      {/* En-tête du chapitre & Indicateurs clés (Section 1.A) */}
      <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
              {macroName ?? "Macro-secteur"}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-edito-navy">{segmentName}</h1>
            <p className="mt-1 text-xs text-edito-body">
              Statut : <span className="font-semibold text-edito-navy">{knowledge.effectiveStatus}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-edito-muted">{formatStudyDate(knowledge.studySnapshotDate)}</p>
            {knowledge.sourceRunId ? (
              <p className="mt-1 font-mono text-[10px] text-edito-muted">Run ID : {knowledge.sourceRunId.slice(0, 8)}</p>
            ) : null}
          </div>
        </div>

        {/* Indicateurs clés du marché */}
        {metrics.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3.5 border-t border-edito-border pt-5 sm:grid-cols-3 md:grid-cols-5">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="flex flex-col justify-between rounded-lg border border-edito-border/80 bg-edito-canvas/60 p-3.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-edito-muted">
                    {metric.label}
                  </span>
                  <ProvenanceBadge level={metric.level} />
                </div>
                <p
                  className={`mt-2 font-heading font-bold text-edito-navy ${
                    metric.isLocked ? "text-sm font-semibold text-edito-muted italic" : "text-xl"
                  }`}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Description / Dynamique de marché (Section 1.B) */}
      {knowledge.description ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-edito-border pb-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
              Synthèse & Dynamique de marché
            </h2>
            <ProvenanceBadge level={knowledge.descriptionLevel} />
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-edito-body whitespace-pre-line">
            {knowledge.description}
          </p>
        </section>
      ) : null}

      {/* Écosystème & Acteurs clés (Section 2 — Restitution éditoriale en 2 familles) */}
      {pacaPlayers.length > 0 || nationalPlayers.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <div className="border-b border-edito-border pb-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
                Écosystème & Acteurs clés
              </h2>
              <span className="text-xs font-semibold text-edito-muted">
                {pacaPlayers.length + nationalPlayers.length} acteur{pacaPlayers.length + nationalPlayers.length > 1 ? "s" : ""} documenté{pacaPlayers.length + nationalPlayers.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-1 text-xs text-edito-muted">
              Distinction entre ancrage régional (proximité commerciale) et benchmarks nationaux / internationaux
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Famille 1 : Ancrage régional PACA / Grasse */}
            {pacaPlayers.length > 0 ? (
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-edito-border/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
                    Ancrage Régional — PACA / Grasse
                  </h3>
                  <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted">
                    {pacaPlayers.length} acteur{pacaPlayers.length > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-edito-muted">
                  Maisons de composition et producteurs structurant le bassin local
                </p>
                <ul className="mt-3 space-y-2.5">
                  {pacaPlayers.map((player, idx) => (
                    <li
                      key={`${player.name}-${idx}`}
                      className="rounded-lg border border-edito-border bg-edito-canvas/40 p-3 text-xs transition-colors hover:bg-edito-canvas/70"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-edito-navy">{player.name}</span>
                        {player.size ? (
                          <span className="rounded border border-edito-border/60 bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted">
                            {player.size}
                          </span>
                        ) : null}
                      </div>
                      {player.note ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-edito-body">{player.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Famille 2 : Acteurs nationaux & internationaux */}
            {nationalPlayers.length > 0 ? (
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-edito-border/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
                    Acteurs Nationaux & Internationaux
                  </h3>
                  <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted">
                    {nationalPlayers.length} acteur{nationalPlayers.length > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-edito-muted">
                  Leaders mondiaux et filiales servant de benchmarks technologiques et concurrentiels
                </p>
                <ul className="mt-3 space-y-2.5">
                  {nationalPlayers.map((player, idx) => (
                    <li
                      key={`${player.name}-${idx}`}
                      className="rounded-lg border border-edito-border bg-edito-canvas/40 p-3 text-xs transition-colors hover:bg-edito-canvas/70"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-edito-navy">{player.name}</span>
                        {player.size ? (
                          <span className="rounded border border-edito-border/60 bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted">
                            {player.size}
                          </span>
                        ) : null}
                      </div>
                      {player.note ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-edito-body">{player.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}


      {/* Comptes du segment — comparaison commerciale (Lot 4) */}
      {competitiveMap && competitiveMap.actors.length > 0 ? (() => {
        const rawActors = competitiveMap.actors
        const categories = Array.from(new Set(rawActors.map((a) => a.category)))

        let filteredActors = rawActors.filter((actor) => {
          if (selectedCategory !== "all" && actor.category !== selectedCategory) return false
          if (selectedConfidence !== "all" && actor.confidence !== selectedConfidence) return false
          return true
        })

        if (sortByAppetence) {
          filteredActors = [...filteredActors].sort((a, b) => (b.appetenceScore ?? -1) - (a.appetenceScore ?? -1))
        }

        const selectedActor = rawActors.find((a) => a.id === selectedActorId) ?? null

        const handleSelectActor = (actorId: string) => {
          setSelectedActorId(actorId)
          setIsDrillDownOpen(true)
        }

        return (
          <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-6">
            {/* Header & Filtrage */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edito-border pb-4">
              <div>
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy flex items-center gap-2">
                  <span>Comptes du segment — comparaison commerciale</span>
                  <span className="rounded bg-edito-chip px-2 py-0.5 font-mono text-[10px] text-edito-muted">
                    {filteredActors.length} / {rawActors.length}
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-edito-muted">
                  Analyse comparative dense du segment pilote avec visualisation Empreinte × Maturité et drill-down compte
                </p>
              </div>

              {/* Filtres & Tri */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div>
                  <label htmlFor="category-filter" className="sr-only">Catégorie</label>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-lg border border-edito-border bg-edito-canvas px-2.5 py-1.5 text-xs font-semibold text-edito-navy focus:outline-none focus:ring-2 focus:ring-edito-navy/20"
                  >
                    <option value="all">Toutes catégories</option>
                    {categories.map((cat) => {
                      const actor = rawActors.find((a) => a.category === cat)
                      return (
                        <option key={cat} value={cat}>
                          {actor?.categoryLabel ?? cat}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="confidence-filter" className="sr-only">Confiance</label>
                  <select
                    id="confidence-filter"
                    value={selectedConfidence}
                    onChange={(e) => setSelectedConfidence(e.target.value)}
                    className="rounded-lg border border-edito-border bg-edito-canvas px-2.5 py-1.5 text-xs font-semibold text-edito-navy focus:outline-none focus:ring-2 focus:ring-edito-navy/20"
                  >
                    <option value="all">Toutes confiances</option>
                    <option value="haute">Confiance haute</option>
                    <option value="moyenne">Confiance moyenne</option>
                    <option value="faible">Confiance faible</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setSortByAppetence(!sortByAppetence)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    sortByAppetence
                      ? "border-edito-navy bg-edito-navy text-white"
                      : "border-edito-border bg-edito-canvas text-edito-body hover:bg-edito-canvas/80"
                  }`}
                >
                  <span>Appétence ↓</span>
                </button>
              </div>
            </div>

            {/* Layout principal: Scatter + Tableau */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Mini Scatter Plot */}
              <div className="lg:col-span-4 shrink-0">
                <SectorAccountScatterPlot
                  actors={filteredActors}
                  selectedActorId={selectedActorId}
                  onSelectActor={handleSelectActor}
                />
              </div>

              {/* Tableau comparatif */}
              <div className="lg:col-span-8 overflow-x-auto rounded-xl border border-edito-border bg-edito-surface">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-edito-border bg-edito-canvas/70 text-[10px] uppercase tracking-wider text-edito-muted font-bold">
                    <tr>
                      <th className="px-3.5 py-3">Compte</th>
                      <th className="px-3 py-3">Catégorie</th>
                      <th className="px-2.5 py-3 text-center">Empreinte /5</th>
                      <th className="px-2.5 py-3 text-center">Maturité /5</th>
                      <th className="px-3 py-3 text-center">Appétence /35</th>
                      <th className="px-2.5 py-3 text-center">Accessibilité /5</th>
                      <th className="px-2.5 py-3">Confiance</th>
                      <th className="px-3 py-3 min-w-[12rem]">Angle d’entrée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edito-border/60">
                    {filteredActors.map((actor) => {
                      const isSelected = selectedActorId === actor.id
                      return (
                        <tr
                          key={actor.id}
                          onClick={() => handleSelectActor(actor.id)}
                          className={`cursor-pointer transition-colors hover:bg-edito-canvas/60 ${
                            isSelected ? "bg-edito-chip/80 font-medium" : ""
                          }`}
                        >
                          <td className="px-3.5 py-3 font-bold text-edito-navy">
                            <div className="flex items-center gap-1.5">
                              <span>{actor.name}</span>
                              {actor.isBenchmarkAccount ? (
                                <span
                                  title="Compte étalon"
                                  className="rounded border border-edito-brass/40 bg-edito-brass/10 px-1 py-0.2 text-[8px] font-bold text-edito-brass"
                                >
                                  ★ Étalon
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-edito-body text-[11px]">
                            {actor.categoryLabel}
                          </td>
                          <td className="px-2.5 py-3 text-center font-mono font-semibold text-edito-navy">
                            {actor.businessFootprintScore !== null ? `${actor.businessFootprintScore}/5` : "—"}
                          </td>
                          <td className="px-2.5 py-3 text-center font-mono font-semibold text-edito-navy">
                            {actor.digitalMaturityScore !== null ? `${actor.digitalMaturityScore}/5` : "—"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-mono font-bold text-edito-navy">
                                {actor.appetenceScore !== null ? `${actor.appetenceScore}/35` : "—"}
                              </span>
                              {actor.appetenceProvisoire ? (
                                <span className="rounded bg-status-warning-soft px-1 py-0.2 text-[8px] font-bold uppercase text-status-warning-ink">
                                  Provisoire
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-2.5 py-3 text-center font-mono font-semibold text-edito-navy">
                            {actor.accessibilityScore !== null ? `${actor.accessibilityScore}/5` : "—"}
                          </td>
                          <td className="px-2.5 py-3 text-[11px] text-edito-muted capitalize">
                            {actor.confidence}
                          </td>
                          <td className="px-3 py-3 text-edito-body text-[11px]">
                            <p className="line-clamp-2 leading-relaxed" title={actor.angleEntree ?? ""}>
                              {actor.angleEntree ?? "—"}
                            </p>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Drill-Down */}
            <SectorAccountDrillDownDialog
              actor={selectedActor}
              open={isDrillDownOpen}
              onOpenChange={setIsDrillDownOpen}
            />
          </section>
        )
      })() : null}

      {/* Blocs clients & cycles d’achat (Lot 5) */}
      {clientBlocks.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-4">
          <div className="border-b border-edito-border pb-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
                Blocs clients & cycles d’achat
              </h2>
              <span className="text-xs font-semibold text-edito-muted">
                {clientBlocks.length} segment{clientBlocks.length > 1 ? "s" : ""} client{clientBlocks.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-edito-muted">
              Typologie des acheteurs aval, origines des financements et rythmes budgétaires
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {clientBlocks.map((block, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-lg border border-edito-border bg-edito-canvas/40 p-4 space-y-3"
              >
                <div>
                  <h3 className="font-bold text-edito-navy text-sm">{block.nom}</h3>

                  <div className="mt-3 space-y-2.5 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                        Qui finance
                      </p>
                      <p className="mt-0.5 leading-relaxed text-edito-body">
                        {block.quiFinance}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                        Cycle budgétaire
                      </p>
                      <p className="mt-0.5 leading-relaxed text-edito-body">
                        {block.cycleBudgetaire}
                      </p>
                    </div>
                  </div>
                </div>

                {block.srcIds.length > 0 ? (
                  <div className="pt-2 border-t border-edito-border/50 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-edito-muted">Sources :</span>
                    <SourceChipList srcIds={block.srcIds} resolve={resolveSource} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Modèles économiques (Lot 5) */}
      {economicModels.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-4">
          <div className="border-b border-edito-border pb-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
                Modèles économiques
              </h2>
              <span className="text-xs font-semibold text-edito-muted">
                {economicModels.length} modèle{economicModels.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-edito-muted">
              Modalités de vente, signataires et déclencheurs d’engagements budgétaires
            </p>
          </div>

          <div className="space-y-3">
            {economicModels.map((model, idx) => {
              const isOpen = Boolean(openEconomicModels[idx])
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-edito-border bg-edito-surface overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleEconomicModel(idx)}
                    className="w-full flex items-center justify-between p-4 text-left bg-edito-canvas/30 hover:bg-edito-canvas/60 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <h3 className="font-bold text-edito-navy text-sm">{model.nom}</h3>
                      {model.quiSigne ? (
                        <p className="mt-0.5 text-xs text-edito-muted truncate">
                          Signataire : <span className="font-medium text-edito-body">{model.quiSigne}</span>
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-edito-navy">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="p-4 border-t border-edito-border space-y-3.5 bg-edito-surface">
                      {model.description ? (
                        <p className="text-xs leading-relaxed text-edito-body">
                          {model.description}
                        </p>
                      ) : null}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {model.quiSigne ? (
                          <div className="rounded-md border border-edito-border/60 bg-edito-canvas/40 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                              Qui signe
                            </p>
                            <p className="mt-1 leading-relaxed text-edito-body font-medium">
                              {model.quiSigne}
                            </p>
                          </div>
                        ) : null}

                        {model.quandLeBudgetEstEngage ? (
                          <div className="rounded-md border border-edito-border/60 bg-edito-canvas/40 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                              Quand le budget est engagé
                            </p>
                            <p className="mt-1 leading-relaxed text-edito-body font-medium">
                              {model.quandLeBudgetEstEngage}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {model.implicationAchatPrestation ? (
                        <div className="rounded-md border border-edito-border/60 bg-edito-canvas/40 p-3 text-xs">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                            Ce que cela implique pour l’achat de prestation
                          </p>
                          <p className="mt-1 leading-relaxed text-edito-body">
                            {model.implicationAchatPrestation}
                          </p>
                        </div>
                      ) : null}

                      {model.srcIds.length > 0 ? (
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <span className="text-[10px] font-semibold text-edito-muted">Sources :</span>
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
        </section>
      ) : null}

      {/* Chaîne de valeur — vue synthétique (Lot 6) */}
      {valueChainSummary ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edito-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
                  Chaîne de valeur — vue synthétique
                </h2>
                <span className="rounded bg-edito-chip px-2 py-0.5 font-mono text-[10px] text-edito-muted">
                  {valueChainSummary.steps.length} étape{valueChainSummary.steps.length > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center rounded border border-edito-border bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-edito-muted">
                  {valueChainSummary.level === "segment" ? "Segment" : "Macro"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-edito-muted">
                Les principales étapes de création et de délivrance de valeur sur le segment étudié.
              </p>
            </div>

            {onOpenValueChain ? (
              <button
                type="button"
                onClick={onOpenValueChain}
                className="inline-flex items-center gap-1.5 rounded-lg border border-edito-border bg-edito-canvas px-3 py-1.5 text-xs font-semibold text-edito-navy transition-colors hover:bg-edito-navy hover:text-white"
              >
                <span>Explorer la chaîne de valeur</span>
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>

          {/* Grille / Ruban des étapes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {valueChainSummary.steps.map((step) => (
              <div
                key={step.id}
                className="flex flex-col justify-between rounded-lg border border-edito-border bg-edito-canvas/40 p-4 transition-colors hover:bg-edito-canvas/70"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-edito-border/60 pb-2">
                    <span className="font-mono text-xs font-bold text-edito-brass bg-edito-brass/10 px-2 py-0.5 rounded">
                      {String(step.order).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-edito-muted truncate">
                      {step.stageLabel}
                    </span>
                  </div>

                  <h3 className="mt-2.5 font-bold text-edito-navy text-xs leading-snug">
                    {step.activityLabel}
                  </h3>

                  {step.description ? (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-edito-body">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Pied de section avec CTA de fin */}
          {onOpenValueChain ? (
            <div className="flex justify-end pt-2 border-t border-edito-border/50">
              <button
                type="button"
                onClick={onOpenValueChain}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-edito-navy hover:text-edito-brass transition-colors"
              >
                <span>Accéder à la cartographie complète de la chaîne de valeur</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Fronts technologiques (Lot 7) */}
      {techFronts.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-4">
          <div className="border-b border-edito-border pb-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
                Fronts technologiques
              </h2>
              <span className="text-xs font-semibold text-edito-muted">
                {techFronts.length} front{techFronts.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-edito-muted">
              Les transformations technologiques qui déplacent actuellement les besoins, les investissements et les points d’entrée commerciaux
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techFronts.map((front, idx) => {
              const isLastOdd = idx === techFronts.length - 1 && techFronts.length % 2 !== 0
              return (
                <div
                  key={idx}
                  className={`flex flex-col justify-between rounded-lg border border-edito-border bg-edito-canvas/40 p-4 space-y-3 ${
                    isLastOdd ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-edito-navy text-sm leading-snug">
                        {front.nom}
                      </h3>
                      {front.zoneDeTransition ? (
                        <span className="shrink-0 inline-flex items-center rounded border border-edito-brass/40 bg-edito-brass/10 px-2 py-0.5 text-[9px] font-bold text-edito-brass">
                          ● Zone de transition
                        </span>
                      ) : null}
                    </div>

                    {front.etat ? (
                      <div className="text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                          État de la transition
                        </p>
                        <p className="mt-0.5 leading-relaxed text-edito-body">
                          {front.etat}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-edito-border/50">
                    {front.srcIds.length > 0 ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-semibold text-edito-muted">Sources :</span>
                        <SourceChipList srcIds={front.srcIds} resolve={resolveSource} />
                      </div>
                    ) : null}

                    {front.doncCommercialement ? (
                      <DoncCallout text={front.doncCommercialement} />
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Dépendances critiques & Supply chain (Lot 8) */}
      {criticalDependencies.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-4">
          <div className="border-b border-edito-border pb-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
                Dépendances critiques & Supply chain
              </h2>
              <span className="text-xs font-semibold text-edito-muted">
                {criticalDependencies.length} dépendance{criticalDependencies.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-edito-muted">
              Les dépendances opérationnelles, réglementaires et technologiques susceptibles d’ouvrir des risques — et des chantiers de transformation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticalDependencies.map((dep, idx) => {
              const isLastOdd = idx === criticalDependencies.length - 1 && criticalDependencies.length % 2 !== 0
              const formattedPractice = formatPracticeName(dep.practiceKredo)
              return (
                <div
                  key={idx}
                  className={`flex flex-col justify-between rounded-lg border border-edito-border bg-edito-canvas/40 p-4 space-y-3 ${
                    isLastOdd ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-edito-navy text-sm leading-snug">
                        {dep.nom}
                      </h3>
                      {dep.criticite ? (
                        <span
                          className={`shrink-0 inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold ${
                            dep.criticite === "haute"
                              ? "border border-status-warning-ink/30 bg-status-warning-soft text-status-warning-ink"
                              : "border border-edito-border bg-edito-chip text-edito-navy"
                          }`}
                        >
                          Criticité {dep.criticite}
                        </span>
                      ) : null}
                    </div>

                    {dep.situation ? (
                      <div className="text-xs space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                          Situation actuelle
                        </p>
                        <p className="leading-relaxed text-edito-body">
                          {dep.situation}
                        </p>
                      </div>
                    ) : null}

                    {dep.risque ? (
                      <div className="text-xs space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                          Risque
                        </p>
                        <p className="leading-relaxed text-edito-body">
                          {dep.risque}
                        </p>
                      </div>
                    ) : null}

                    {dep.prestationOuverte ? (
                      <div className="rounded-md border border-edito-border/60 bg-edito-surface p-3 text-xs space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                          Prestation ESN ouverte
                        </p>
                        <p className="leading-relaxed text-edito-body font-medium">
                          {dep.prestationOuverte}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-edito-border/50">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      {formattedPractice ? (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-edito-navy">
                          <span className="text-edito-muted font-normal">Practice KREDO :</span>
                          <span className="rounded bg-edito-chip px-1.5 py-0.5 font-bold text-edito-navy">
                            {formattedPractice}
                          </span>
                        </div>
                      ) : <div />}

                      {dep.srcIds.length > 0 ? (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-[10px] font-semibold text-edito-muted">Sources :</span>
                          <SourceChipList srcIds={dep.srcIds} resolve={resolveSource} />
                        </div>
                      ) : null}
                    </div>

                    {dep.doncCommercialement ? (
                      <DoncCallout text={dep.doncCommercialement} />
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Réglementation & ruptures sectorielles (Lot 9) */}
      {timeline.datedItems.length > 0 || timeline.permanentItems.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-6">
          <div className="border-b border-edito-border pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy flex items-center gap-2">
                  <span>Réglementation &amp; ruptures sectorielles</span>
                  <span className="rounded bg-edito-chip px-2 py-0.5 font-mono text-[10px] text-edito-muted">
                    {timeline.datedItems.length + timeline.permanentItems.length} jalon{timeline.datedItems.length + timeline.permanentItems.length > 1 ? "s" : ""}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-edito-muted">
                  Les jalons réglementaires, industriels et technologiques qui structurent la trajectoire du segment.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md border border-edito-border bg-edito-canvas px-2.5 py-1 text-[11px] font-semibold text-edito-navy">
                  <span className="h-2 w-2 rounded-full bg-edito-navy" />
                  Réglementation
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-edito-border bg-edito-canvas px-2.5 py-1 text-[11px] font-semibold text-edito-brass">
                  <span className="h-2 w-2 rounded-full bg-edito-brass" />
                  Rupture
                </span>
              </div>
            </div>
          </div>

          {/* Séquence chronologique datée */}
          {timeline.datedItems.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
                Trajectoire chronologique
              </h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-edito-border">
                {timeline.datedItems.map((item) => {
                  const formattedPractice = formatPracticeName(item.practiceKredo)
                  const itemDate = item.date ? new Date(item.date) : null
                  const isPast = itemDate ? itemDate.getTime() < currentTimestamp : false
                  const formattedDateStr = itemDate && !Number.isNaN(itemDate.getTime())
                    ? itemDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
                    : item.date

                  return (
                    <div key={item.id} className="relative flex items-start gap-4">
                      {/* Node marker */}
                      <div
                        className={`absolute -left-6 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border bg-edito-surface text-[10px] font-bold shadow-sm ${
                          item.kind === "regulatory"
                            ? "border-edito-navy text-edito-navy"
                            : "border-edito-brass text-edito-brass"
                        }`}
                      >
                        {item.kind === "regulatory" ? "●" : "◆"}
                      </div>

                      <div className="flex-1 rounded-lg border border-edito-border bg-edito-canvas/40 p-4 space-y-3 transition-colors hover:bg-edito-canvas/70">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edito-border/60 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-edito-navy bg-edito-surface border border-edito-border px-2 py-0.5 rounded">
                              {formattedDateStr}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                item.kind === "regulatory"
                                  ? "bg-edito-navy/10 text-edito-navy"
                                  : "bg-edito-brass/10 text-edito-brass"
                              }`}
                            >
                              {item.kind === "regulatory" ? "Réglementation" : "Rupture"}
                            </span>
                            {isPast ? (
                              <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted">
                                Passé
                              </span>
                            ) : (
                              <span className="rounded bg-edito-amber-soft px-1.5 py-0.5 text-[9px] font-bold text-edito-ink">
                                À venir
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {item.urgency ? (
                              <UrgencyBadge urgency={item.urgency} />
                            ) : null}
                            <ProvenanceBadge level={item.resolvedLevel} />
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-edito-navy text-sm">{item.title}</h4>
                          {item.authority ? (
                            <p className="mt-0.5 text-[11px] font-semibold text-edito-muted">
                              Autorité : {item.authority}
                            </p>
                          ) : null}
                          {item.description ? (
                            <p className="mt-2 text-xs leading-relaxed text-edito-body whitespace-pre-line">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-edito-border/50">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            {formattedPractice ? (
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-edito-navy">
                                <span className="text-edito-muted font-normal">Practice KREDO :</span>
                                <span className="rounded bg-edito-chip px-1.5 py-0.5 font-bold text-edito-navy">
                                  {formattedPractice}
                                </span>
                              </div>
                            ) : <div />}

                            {item.sourceUrl ? (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-xs font-bold text-edito-petrol hover:underline"
                              >
                                Source ↗
                              </a>
                            ) : null}
                          </div>

                          {item.commercialAngle ? (
                            <DoncCallout text={item.commercialAngle} />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* Cadres permanents sans date */}
          {timeline.permanentItems.length > 0 ? (
            <div className="space-y-3 pt-4 border-t border-edito-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
                Cadres permanents &amp; Dispositions sans échéance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {timeline.permanentItems.map((item) => {
                  const formattedPractice = formatPracticeName(item.practiceKredo)
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between rounded-lg border border-edito-border bg-edito-canvas/40 p-4 space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-edito-navy text-xs leading-snug">{item.title}</h4>
                          <ProvenanceBadge level={item.resolvedLevel} />
                        </div>
                        {item.authority ? (
                          <p className="text-[10px] font-semibold text-edito-muted">
                            Autorité : {item.authority}
                          </p>
                        ) : null}
                        {item.description ? (
                          <p className="text-xs leading-relaxed text-edito-body">
                            {item.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-edito-border/50">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          {formattedPractice ? (
                            <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-bold text-edito-navy">
                              {formattedPractice}
                            </span>
                          ) : <div />}
                          {item.sourceUrl ? (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-edito-petrol hover:underline"
                            >
                              Source ↗
                            </a>
                          ) : null}
                        </div>

                        {item.commercialAngle ? (
                          <DoncCallout text={item.commercialAngle} />
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Risques × opportunités (Lot 10 Desktop) */}
      {riskOpportunities.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-6">
          <div className="border-b border-edito-border pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy flex items-center gap-2">
                  <span>Risques × opportunités</span>
                  <span className="rounded bg-edito-chip px-2 py-0.5 font-mono text-[10px] text-edito-muted">
                    {riskOpportunities.length} paire{riskOpportunities.length > 1 ? "s" : ""}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-edito-muted">
                  Les principales fragilités du segment et les chantiers de transformation qu’elles peuvent ouvrir.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {riskOpportunities.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-edito-border bg-edito-canvas/40 p-4 space-y-3 transition-colors hover:bg-edito-canvas/70"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Colonne Risque */}
                  <div className="rounded-md border border-edito-border/60 bg-edito-surface p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-edito-navy/10 text-[10px] font-bold text-edito-navy">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                        Risque
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-relaxed text-edito-navy">
                      {item.risk}
                    </p>
                  </div>

                  {/* Colonne Opportunité */}
                  <div className="rounded-md border border-edito-brass/40 bg-edito-surface p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">
                        Opportunité
                      </span>
                    </div>
                    {item.opportunity ? (
                      <p className="text-xs leading-relaxed text-edito-body">
                        {item.opportunity}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Sources au bas de la paire */}
                {item.srcIds.length > 0 ? (
                  <div className="pt-2 border-t border-edito-border/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[10px] font-semibold text-edito-muted">Sources :</span>
                      <SourceChipList srcIds={item.srcIds} resolve={resolveSource} />
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Pain points sectoriels (Lot 11 Desktop) */}
      {knowledge.painPoints.length > 0 ? (() => {
        const maxFrequency = Math.max(1, ...knowledge.painPoints.map((p) => p.frequencyCount))
        return (
          <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm space-y-6">
            <div className="border-b border-edito-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy flex items-center gap-2">
                    <span>Pain points sectoriels</span>
                    <span className="rounded bg-edito-chip px-2 py-0.5 font-mono text-[10px] text-edito-muted">
                      {knowledge.painPoints.length} point{knowledge.painPoints.length > 1 ? "s" : ""}
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-edito-muted">
                    Les difficultés les plus fréquemment observées dans le segment et son environnement sectoriel.
                  </p>
                </div>
              </div>
            </div>

            {/* Liste analytique dense par fréquence */}
            <div className="space-y-3.5">
              {knowledge.painPoints.map((point, idx) => {
                const formattedPractice = formatPracticeName(point.kredoPractice)
                const relativeWidthPct = Math.min(100, Math.max(12, Math.round((point.frequencyCount / maxFrequency) * 100)))

                return (
                  <div
                    key={point.id}
                    className="rounded-lg border border-edito-border bg-edito-canvas/40 p-4 space-y-2.5 transition-colors hover:bg-edito-canvas/70"
                  >
                    {/* Header item: Index + Counter + Title + Provenance */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold text-edito-navy/70 bg-edito-chip px-2 py-0.5 rounded shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-bold text-edito-navy text-xs leading-snug">
                          {point.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-edito-navy bg-edito-surface border border-edito-border px-2 py-0.5 rounded">
                          {point.frequencyCount} {point.frequencyCount > 1 ? "occurrences" : "occurrence"}
                        </span>
                        <ProvenanceBadge level={point.resolvedLevel} />
                      </div>
                    </div>

                    {/* Barre de fréquence relative */}
                    <div className="w-full bg-edito-border/40 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-edito-navy h-1 rounded-full transition-all duration-300"
                        style={{ width: `${relativeWidthPct}%` }}
                      />
                    </div>

                    {/* Description conditionnelle */}
                    {point.description ? (
                      <p className="text-xs leading-relaxed text-edito-body">
                        {point.description}
                      </p>
                    ) : null}

                    {/* Verbatim conditionnel */}
                    {point.verbatim ? (
                      <blockquote className="border-l-2 border-edito-brass/80 pl-3 text-xs italic text-edito-muted">
                        « {point.verbatim} »
                      </blockquote>
                    ) : null}

                    {/* Practice Kredo formatée conditionnelle */}
                    {formattedPractice ? (
                      <div className="pt-1.5 border-t border-edito-border/40 flex items-center gap-1.5 text-[10px]">
                        <span className="text-edito-muted font-normal">Practice KREDO :</span>
                        <span className="rounded bg-edito-chip px-1.5 py-0.5 font-bold text-edito-navy">
                          {formattedPractice}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {/* Rappel croisé Playbook */}
            <div className="pt-4 border-t border-edito-border/60 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-edito-muted">
                Retrouver ces enjeux et la traduction commerciale dans le Playbook.
              </span>
              {onOpenPlaybook ? (
                <button
                  type="button"
                  onClick={onOpenPlaybook}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-edito-navy bg-edito-navy px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-edito-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/20"
                >
                  <span>Ouvrir le Playbook</span>
                  <span aria-hidden="true">→</span>
                </button>
              ) : null}
            </div>
          </section>
        )
      })() : null}

      {/* Limites & Sources méthodologiques (Préservé) */}
      {caveats ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <div className="border-b border-edito-border pb-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
              Sources & Réserves méthodologiques
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-xs leading-relaxed text-edito-body">
            {caveats.corpus ? (
              <p><strong className="font-semibold text-edito-navy">Corpus :</strong> {caveats.corpus}</p>
            ) : null}
            {caveats.verbatims ? (
              <p><strong className="font-semibold text-edito-navy">Verbatims :</strong> {caveats.verbatims}</p>
            ) : null}
            {caveats.frequences ? (
              <p><strong className="font-semibold text-edito-navy">Fréquences :</strong> {caveats.frequences}</p>
            ) : null}
            {caveats.marche ? (
              <p><strong className="font-semibold text-edito-navy">Chiffrage marché :</strong> {caveats.marche}</p>
            ) : null}
            {caveats.sources.length > 0 ? (
              <div className="pt-2">
                <span className="font-semibold text-edito-navy">Sources primaires :</span>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-edito-muted">
                  {caveats.sources.map((src, idx) => (
                    <li key={idx}>{src}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
