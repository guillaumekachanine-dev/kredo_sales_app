import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import { formatStudyDate, provenanceLabel } from "../home/home-model"

type SectorAnalysisProps = {
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
    <span className="inline-flex items-center rounded border border-edito-border bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-edito-muted">
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
  verbatims?: string
  frequences?: string
  marche?: string
  sources: string[]
}

function parseCaveats(raw: unknown): ParsedCaveats | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const sources = Array.isArray(record.sources)
    ? record.sources.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : []
  const corpus = typeof record.corpus === "string" && record.corpus.trim().length > 0 ? record.corpus.trim() : undefined
  const verbatims = typeof record.verbatims === "string" && record.verbatims.trim().length > 0 ? record.verbatims.trim() : undefined
  const frequences = typeof record.frequences === "string" && record.frequences.trim().length > 0 ? record.frequences.trim() : undefined
  const marche = typeof record.marche === "string" && record.marche.trim().length > 0 ? record.marche.trim() : undefined

  if (!corpus && !verbatims && !frequences && !marche && sources.length === 0) return null
  return { corpus, verbatims, frequences, marche, sources }
}

export function SectorAnalysisChapterDesktop({ knowledge, segmentName, macroName }: SectorAnalysisProps) {
  const pacaPlayers = parseKeyPlayers(knowledge.keyPlayersPaca)
  const nationalPlayers = parseKeyPlayers(knowledge.keyPlayersNational)
  const caveats = parseCaveats(knowledge.caveats)

  const metrics = [
    knowledge.marketSizeEurBn !== null ? {
      label: "Taille de marché",
      value: `${formatNumber(knowledge.marketSizeEurBn)} Md€`,
      level: knowledge.marketSizeEurBnLevel,
    } : null,
    knowledge.marketGrowthPct !== null ? {
      label: "Croissance annuelle",
      value: `${formatNumber(knowledge.marketGrowthPct)} %`,
      level: knowledge.marketGrowthPctLevel,
    } : null,
    knowledge.attractivenessScore !== null ? {
      label: "Score d’attractivité",
      value: `${formatNumber(knowledge.attractivenessScore)} / 100`,
      level: knowledge.attractivenessScoreLevel,
    } : null,
    knowledge.digitalMaturity ? {
      label: "Maturité numérique",
      value: knowledge.digitalMaturity,
      level: null,
    } : null,
    knowledge.avgTjmMin !== null && knowledge.avgTjmMax !== null ? {
      label: "TJM de référence",
      value: `${formatNumber(knowledge.avgTjmMin)}–${formatNumber(knowledge.avgTjmMax)} €`,
      level: null,
    } : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <div className="space-y-6" data-chapter="sector-analysis">
      {/* En-tête du chapitre */}
      <section className="rounded-xl border border-edito-border bg-edito-surface p-5">
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

        {/* Métriques clés */}
        {metrics.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-edito-border pt-4 sm:grid-cols-3 md:grid-cols-5">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-edito-border/70 bg-edito-canvas/50 p-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-edito-muted">{metric.label}</span>
                  <ProvenanceBadge level={metric.level} />
                </div>
                <p className="mt-1.5 font-heading text-lg font-bold text-edito-navy">{metric.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Description / Synthèse */}
      {knowledge.description ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6">
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

      {/* Points de douleur sectoriels */}
      {knowledge.painPoints.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6">
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

      {/* Événements & Actualités du marché */}
      {knowledge.events.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6">
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

      {/* Acteurs clés */}
      {pacaPlayers.length > 0 || nationalPlayers.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6">
          <div className="border-b border-edito-border pb-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
              Écosystème & Acteurs clés
            </h2>
            <p className="mt-0.5 text-xs text-edito-muted">Acteurs repères documentés dans l’étude de marché</p>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {pacaPlayers.length > 0 ? (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
                  Ancrage Régional (PACA)
                </h3>
                <ul className="mt-2.5 space-y-2">
                  {pacaPlayers.map((player, idx) => (
                    <li key={`${player.name}-${idx}`} className="rounded-lg border border-edito-border bg-edito-canvas/30 p-2.5 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-edito-navy">{player.name}</span>
                        {player.size ? <span className="text-[10px] text-edito-muted">{player.size}</span> : null}
                      </div>
                      {player.note ? <p className="mt-1 text-[11px] text-edito-body">{player.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {nationalPlayers.length > 0 ? (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
                  Acteurs Nationaux & Internationaux
                </h3>
                <ul className="mt-2.5 space-y-2">
                  {nationalPlayers.map((player, idx) => (
                    <li key={`${player.name}-${idx}`} className="rounded-lg border border-edito-border bg-edito-canvas/30 p-2.5 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-edito-navy">{player.name}</span>
                        {player.size ? <span className="text-[10px] text-edito-muted">{player.size}</span> : null}
                      </div>
                      {player.note ? <p className="mt-1 text-[11px] text-edito-body">{player.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Limites & Sources méthodologiques */}
      {caveats ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6">
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
