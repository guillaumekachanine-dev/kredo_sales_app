import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { SectorCorpusMetadata } from "../data/get-sector-corpus-metadata"
import type { ResolvedSource } from "../shared/SourceChip"
import { formatStudyDate, provenanceLabel } from "../home/home-model"
import { CorpusConfidenceBanner } from "../shared/CorpusConfidenceBanner"
import {
  buildSectorMarketKpis,
  parseCaveats,
  parseKeyPlayers,
} from "./sector-analysis-model"

export type SectorAnalysisProps = {
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

export function SectorAnalysisChapterDesktop({
  knowledge,
  segmentName,
  macroName,
  corpusMetadata,
}: SectorAnalysisProps) {
  const pacaPlayers = parseKeyPlayers(knowledge.keyPlayersPaca)
  const nationalPlayers = parseKeyPlayers(knowledge.keyPlayersNational)
  const caveats = parseCaveats(knowledge.caveats)
  const metrics = buildSectorMarketKpis(knowledge)

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
