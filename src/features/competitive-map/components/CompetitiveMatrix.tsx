"use client"

import { useMemo } from "react"
import type { CompetitiveMapActor } from "../data/competitive-map-workspace-types"

type CompetitiveMatrixProps = {
  actors: CompetitiveMapActor[]
  selectedActorId: string | null
  onSelectActor: (actorId: string) => void
}

const CATEGORY_COLORS: Record<CompetitiveMapActor["category"], string> = {
  leader: "var(--color-dataviz-1)",
  challenger: "var(--color-dataviz-2)",
  mid_market: "var(--color-dataviz-3)",
  outsider_emergent: "var(--color-dataviz-4)",
  outsider_niche: "var(--color-dataviz-5)",
}

const CATEGORY_LEGEND: Array<{ category: CompetitiveMapActor["category"]; label: string }> = [
  { category: "leader", label: "Leaders" },
  { category: "challenger", label: "Challengers" },
  { category: "mid_market", label: "Mid-market" },
  { category: "outsider_emergent", label: "Émergents" },
  { category: "outsider_niche", label: "Niche" },
]

function formatRevenue(value: number | null): string {
  if (value === null) return "CA non disponible"
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md€`
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M€`
}

export function CompetitiveMatrix({ actors, selectedActorId, onSelectActor }: CompetitiveMatrixProps) {
  const positionedActors = useMemo(() => actors.filter((actor) => actor.isPositioned), [actors])
  const nonPositionedActors = useMemo(() => actors.filter((actor) => !actor.isPositioned), [actors])
  const maxRevenue = useMemo(() => {
    let maximum = 0
    for (const actor of positionedActors) maximum = Math.max(maximum, actor.revenueEstimateMeur ?? 0)
    return maximum
  }, [positionedActors])

  const width = 760
  const height = 470
  const margin = { top: 30, right: 28, bottom: 58, left: 66 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const x = (score: number) => margin.left + (score / 35) * plotWidth
  const y = (score: number) => margin.top + plotHeight - ((score - 1) / 4) * plotHeight
  const radius = (revenue: number | null) => {
    if (revenue === null || maxRevenue <= 0) return 8
    return 8 + Math.sqrt(revenue / maxRevenue) * 18
  }

  return (
    <section aria-labelledby="competitive-matrix-title" className="min-w-0 border-r border-edito-border bg-edito-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edito-border px-5 py-4">
        <div>
          <h2 id="competitive-matrix-title" className="font-heading text-base font-bold text-edito-navy">Matrice concurrentielle</h2>
          <p className="mt-1 text-xs text-edito-muted">Appétence /35 × accessibilité /5 · taille selon le CA disponible</p>
        </div>
        <div className="flex max-w-xl flex-wrap justify-end gap-x-3 gap-y-1.5" aria-label="Légende des catégories">
          {CATEGORY_LEGEND.map((item) => (
            <span key={item.category} className="inline-flex items-center gap-1.5 text-[11px] text-edito-body">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] }} />
              {item.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-[11px] text-edito-body">
            <span className="size-3 rounded-full border-2 border-edito-ink bg-transparent" />
            Compte étalon
          </span>
        </div>
      </div>

      {positionedActors.length > 0 ? (
        <div className="px-3 pb-2 pt-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="max-h-[32rem] min-h-[24rem] w-full"
            role="img"
            aria-label="Matrice à bulles des acteurs selon leur appétence et leur accessibilité"
          >
            <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="var(--color-edito-canvas)" />

            {[0, 5, 10, 15, 20, 25, 30, 35].map((tick) => (
              <g key={`x-${tick}`}>
                <line x1={x(tick)} y1={margin.top} x2={x(tick)} y2={margin.top + plotHeight} stroke="var(--color-edito-border)" strokeWidth={tick === 0 ? 1.25 : 0.75} />
                <text x={x(tick)} y={margin.top + plotHeight + 20} textAnchor="middle" fontSize={10} fill="var(--color-edito-muted)">{tick}</text>
              </g>
            ))}
            {[1, 2, 3, 4, 5].map((tick) => (
              <g key={`y-${tick}`}>
                <line x1={margin.left} y1={y(tick)} x2={margin.left + plotWidth} y2={y(tick)} stroke="var(--color-edito-border)" strokeWidth={tick === 1 ? 1.25 : 0.75} />
                <text x={margin.left - 13} y={y(tick) + 4} textAnchor="end" fontSize={10} fill="var(--color-edito-muted)">{tick}</text>
              </g>
            ))}

            <text x={margin.left + plotWidth / 2} y={height - 13} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-edito-body)">Appétence commerciale /35</text>
            <text x={18} y={margin.top + plotHeight / 2} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-edito-body)" transform={`rotate(-90 18 ${margin.top + plotHeight / 2})`}>Accessibilité /5</text>

            {positionedActors.map((actor) => {
              const actorRadius = radius(actor.revenueEstimateMeur)
              const cx = x(actor.appetenceScore ?? 0)
              const cy = y(actor.accessibilityScore ?? 1)
              const isSelected = actor.id === selectedActorId
              const labelOnLeft = cx > width - 170

              return (
                <g
                  key={actor.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${actor.name}, appétence ${actor.appetenceScore} sur 35, accessibilité ${actor.accessibilityScore} sur 5, ${formatRevenue(actor.revenueEstimateMeur)}`}
                  aria-pressed={isSelected}
                  className="cursor-pointer outline-none"
                  onClick={() => onSelectActor(actor.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onSelectActor(actor.id)
                    }
                  }}
                >
                  <title>{actor.name} · {formatRevenue(actor.revenueEstimateMeur)}</title>
                  {isSelected ? <circle cx={cx} cy={cy} r={actorRadius + 6} fill="none" stroke="var(--color-edito-ink)" strokeWidth={1.5} strokeDasharray="3 3" /> : null}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={actorRadius}
                    fill={CATEGORY_COLORS[actor.category]}
                    fillOpacity={isSelected ? 0.92 : 0.68}
                    stroke={actor.isBenchmarkAccount ? "var(--color-edito-ink)" : "var(--color-edito-surface)"}
                    strokeWidth={actor.isBenchmarkAccount ? 3 : 1.5}
                    className="transition-[fill-opacity,stroke-width] duration-150 motion-reduce:transition-none"
                  />
                  {isSelected || actor.isBenchmarkAccount ? (
                    <text
                      x={labelOnLeft ? cx - actorRadius - 7 : cx + actorRadius + 7}
                      y={cy + 4}
                      textAnchor={labelOnLeft ? "end" : "start"}
                      fontSize={10}
                      fontWeight={700}
                      fill="var(--color-edito-ink)"
                    >
                      {actor.name.length > 24 ? `${actor.name.slice(0, 22)}…` : actor.name}{actor.isBenchmarkAccount ? " ★" : ""}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </svg>
        </div>
      ) : (
        <div className="flex min-h-96 items-center justify-center px-6 text-sm text-edito-muted">Aucun acteur positionnable avec les données actuelles</div>
      )}

      {nonPositionedActors.length > 0 ? (
        <div className="border-t border-edito-border px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-muted">Non positionnés</span>
            {nonPositionedActors.map((actor) => (
              <button
                key={actor.id}
                type="button"
                aria-pressed={actor.id === selectedActorId}
                onClick={() => onSelectActor(actor.id)}
                className="rounded-full border border-edito-border px-2.5 py-1 text-[11px] font-semibold text-edito-body transition-colors hover:border-edito-navy hover:text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/25 aria-pressed:border-edito-navy aria-pressed:bg-edito-chip aria-pressed:text-edito-navy"
              >
                {actor.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
