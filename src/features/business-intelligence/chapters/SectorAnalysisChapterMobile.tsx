import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import { formatStudyDate, provenanceLabel } from "../home/home-model"

type SectorAnalysisMobileProps = {
  knowledge: SectorKnowledgeReadModel
  segmentName: string
  macroName: string | null
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

function ProvenanceBadge({ level }: { level: SectorResolvedLevel | "segment" | "macro" | null | undefined }) {
  const label = provenanceLabel((level as SectorResolvedLevel) ?? null)
  if (!label) return null
  return (
    <span className="inline-flex items-center rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted">
      {label}
    </span>
  )
}

type ParsedPlayer = { name: string; note: string; size: string }

function parseKeyPlayers(raw: unknown): ParsedPlayer[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === "string") return { name: item.trim(), note: "", size: "" }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>
        const name = typeof record.name === "string" ? record.name.trim() : typeof record.nom === "string" ? record.nom.trim() : ""
        const note = typeof record.note === "string" ? record.note.trim() : typeof record.description === "string" ? record.description.trim() : ""
        const size = typeof record.size === "string" ? record.size.trim() : typeof record.taille === "string" ? record.taille.trim() : ""
        if (name.length > 0) return { name, note, size }
      }
      return null
    })
    .filter((p): p is ParsedPlayer => p !== null)
}

type ParsedCaveats = {
  corpus?: string
  sources: string[]
}

function parseCaveats(raw: unknown): ParsedCaveats | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const sources = Array.isArray(record.sources)
    ? record.sources.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : []
  const corpus = typeof record.corpus === "string" && record.corpus.trim().length > 0 ? record.corpus.trim() : undefined
  if (!corpus && sources.length === 0) return null
  return { corpus, sources }
}

export function SectorAnalysisChapterMobile({ knowledge, segmentName, macroName }: SectorAnalysisMobileProps) {
  const pacaPlayers = parseKeyPlayers(knowledge.keyPlayersPaca)
  const nationalPlayers = parseKeyPlayers(knowledge.keyPlayersNational)
  const caveats = parseCaveats(knowledge.caveats)

  const metrics = [
    knowledge.marketSizeEurBn !== null ? {
      label: "Marché",
      value: `${formatNumber(knowledge.marketSizeEurBn)} Md€`,
      level: knowledge.marketSizeEurBnLevel,
    } : null,
    knowledge.marketGrowthPct !== null ? {
      label: "Croissance",
      value: `${formatNumber(knowledge.marketGrowthPct)} %`,
      level: knowledge.marketGrowthPctLevel,
    } : null,
    knowledge.attractivenessScore !== null ? {
      label: "Attractivité",
      value: `${formatNumber(knowledge.attractivenessScore)}/100`,
      level: knowledge.attractivenessScoreLevel,
    } : null,
    knowledge.digitalMaturity ? {
      label: "Maturité",
      value: knowledge.digitalMaturity,
      level: null,
    } : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <div className="space-y-4 px-4 py-4" data-chapter="sector-analysis-mobile">
      {/* En-tête Mobile */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{macroName ?? "Macro-secteur"}</p>
        <h1 className="mt-1 font-heading text-xl font-bold text-heading">{segmentName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-body">
          <span>{knowledge.effectiveStatus}</span>
          <span aria-hidden="true">·</span>
          <span className="text-muted">{formatStudyDate(knowledge.studySnapshotDate)}</span>
        </div>

        {/* Métriques clés en grille 2x2 */}
        {metrics.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border/60 bg-canvas/60 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted">{metric.label}</span>
                  <ProvenanceBadge level={metric.level} />
                </div>
                <p className="mt-1 font-heading text-base font-bold text-heading">{metric.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Synthèse */}
      {knowledge.description ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-heading">Synthèse du segment</h2>
            <ProvenanceBadge level={knowledge.descriptionLevel} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-body">{knowledge.description}</p>
        </section>
      ) : null}

      {/* Accordéons / Sections progressives tactiles */}
      <div className="space-y-2">
        {/* Pain points */}
        {knowledge.painPoints.length > 0 ? (
          <details className="group rounded-xl border border-border bg-surface overflow-hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Points de douleur ({knowledge.painPoints.length})</span>
              <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-border px-4 py-3 space-y-3">
              {knowledge.painPoints.map((point) => (
                <div key={point.id} className="rounded-lg border border-border/70 bg-canvas/40 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-heading">{point.title}</h3>
                    <ProvenanceBadge level={point.resolvedLevel} />
                  </div>
                  {point.description ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-body">{point.description}</p>
                  ) : null}
                  {point.verbatim ? (
                    <p className="mt-2 border-l-2 border-brand-brass pl-2 text-[11px] italic text-muted">
                      « {point.verbatim} »
                    </p>
                  ) : null}
                  {point.kredoPractice ? (
                    <p className="mt-2 text-[10px] font-semibold text-primary">
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
          <details className="group rounded-xl border border-border bg-surface overflow-hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Événements & Jalons ({knowledge.events.length})</span>
              <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-border px-4 py-3 space-y-2.5">
              {knowledge.events.map((evt) => (
                <div key={evt.id} className="border-b border-border/50 pb-2.5 last:border-b-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-primary">{evt.eventType}</span>
                    {evt.eventDate ? (
                      <span className="text-[10px] text-muted">
                        {new Date(evt.eventDate).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-0.5 font-semibold text-heading">{evt.title}</h3>
                  {evt.commercialOpportunity ? (
                    <p className="mt-1 text-[11px] text-brand-brass">{evt.commercialOpportunity}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {/* Acteurs clés */}
        {pacaPlayers.length > 0 || nationalPlayers.length > 0 ? (
          <details className="group rounded-xl border border-border bg-surface overflow-hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Acteurs clés ({pacaPlayers.length + nationalPlayers.length})</span>
              <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-border px-4 py-3 space-y-3">
              {pacaPlayers.length > 0 ? (
                <div>
                  <h3 className="text-[10px] font-bold uppercase text-muted">Région PACA</h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {pacaPlayers.map((player, idx) => (
                      <li key={idx} className="rounded border border-border/50 bg-canvas/30 p-2 text-xs">
                        <span className="font-bold text-heading">{player.name}</span>
                        {player.note ? <p className="text-[11px] text-body">{player.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {nationalPlayers.length > 0 ? (
                <div>
                  <h3 className="text-[10px] font-bold uppercase text-muted">National / International</h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {nationalPlayers.map((player, idx) => (
                      <li key={idx} className="rounded border border-border/50 bg-canvas/30 p-2 text-xs">
                        <span className="font-bold text-heading">{player.name}</span>
                        {player.note ? <p className="text-[11px] text-body">{player.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        {/* Sources & Limites */}
        {caveats ? (
          <details className="group rounded-xl border border-border bg-surface overflow-hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>Sources méthodologiques</span>
              <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="border-t border-border px-4 py-3 text-xs text-body space-y-2">
              {caveats.corpus ? <p><strong>Corpus :</strong> {caveats.corpus}</p> : null}
              {caveats.sources.length > 0 ? (
                <div>
                  <strong>Sources :</strong>
                  <ul className="mt-1 list-disc pl-4 text-muted">
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
