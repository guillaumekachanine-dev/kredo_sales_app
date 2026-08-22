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
  parseCaveats,
  parseEconomicModels,
  parseKeyPlayers,
  parseTechFronts,
} from "./sector-analysis-model"
import { buildSectorValueChainSummary } from "./sector-value-chain-summary"

export type SectorAnalysisProps = {
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

export function SectorAnalysisChapterDesktop({
  competitiveMap,
  knowledge,
  segmentName,
  macroName,
  corpusMetadata,
  sourceResolution,
  valueChain,
  onOpenValueChain,
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


      {/* Points de douleur sectoriels (Préservé) */}
      {knowledge.painPoints.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-edito-border pb-3">
            <div>
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
                Points de douleur & Enjeux métiers
              </h2>
              <p className="mt-0.5 text-xs text-edito-muted">
                {knowledge.painPoints.length} point{knowledge.painPoints.length > 1 ? "s" : ""} de friction identifié{knowledge.painPoints.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {knowledge.painPoints.map((point) => (
              <div key={point.id} className="flex flex-col justify-between rounded-lg border border-edito-border bg-edito-canvas/40 p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-edito-navy">{point.title}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {point.frequencyCount > 0 ? (
                        <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-bold text-edito-navy">
                          Freq. {point.frequencyCount}
                        </span>
                      ) : null}
                      <ProvenanceBadge level={point.resolvedLevel} />
                    </div>
                  </div>
                  {point.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-edito-body">{point.description}</p>
                  ) : null}
                  {point.verbatim ? (
                    <blockquote className="mt-2.5 border-l-2 border-edito-brass pl-2.5 text-xs italic text-edito-muted">
                      « {point.verbatim} »
                    </blockquote>
                  ) : null}
                </div>
                {point.kredoPractice ? (
                  <div className="mt-3 border-t border-edito-border/50 pt-2 text-[10px] font-semibold text-edito-petrol">
                    Practice associée : <span className="font-bold">{point.kredoPractice}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Événements & Actualités du marché (Préservé) */}
      {knowledge.events.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <div className="border-b border-edito-border pb-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
              Événements majeurs & Jalons du secteur
            </h2>
            <p className="mt-0.5 text-xs text-edito-muted">
              {knowledge.events.length} jalon{knowledge.events.length > 1 ? "s" : ""} identifié{knowledge.events.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="mt-4 divide-y divide-edito-border">
            {knowledge.events.map((evt) => (
              <div key={evt.id} className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-edito-petrol">
                      {evt.eventType}
                    </span>
                    {evt.eventDate ? (
                      <span className="text-[10px] font-semibold text-edito-muted">
                        · {new Date(evt.eventDate).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                      </span>
                    ) : null}
                    <ProvenanceBadge level={evt.resolvedLevel} />
                  </div>
                  <h3 className="mt-1 text-xs font-bold text-edito-navy">{evt.title}</h3>
                  {evt.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-edito-body">{evt.description}</p>
                  ) : null}
                  {evt.commercialOpportunity ? (
                    <p className="mt-2 text-xs font-medium text-edito-brass">
                      Angle d’opportunité : {evt.commercialOpportunity}
                    </p>
                  ) : null}
                </div>
                {evt.sourceUrl ? (
                  <a
                    href={evt.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-semibold text-edito-petrol hover:underline"
                  >
                    Source ↗
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
