"use client"

import { useMemo } from "react"
import type { CompetitiveMapActor } from "../../data/competitive-map-workspace-types"

type CompetitiveMobileMatrixProps = {
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

export function CompetitiveMobileMatrix({ actors, selectedActorId, onSelectActor }: CompetitiveMobileMatrixProps) {
  const positionedActors = useMemo(() => actors.filter((actor) => actor.isPositioned), [actors])
  const nonPositionedActors = useMemo(() => actors.filter((actor) => !actor.isPositioned), [actors])
  const width = 350
  const height = 230
  const margin = { top: 18, right: 16, bottom: 38, left: 38 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const x = (score: number) => margin.left + (score / 35) * plotWidth
  const y = (score: number) => margin.top + plotHeight - ((score - 1) / 4) * plotHeight

  return (
    <section aria-labelledby="competitive-mobile-matrix-title" className="border-y border-white/10 bg-white/[0.025] px-4 py-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="competitive-mobile-matrix-title" className="font-heading text-base font-bold text-white">Matrice concurrentielle</h2>
          <p className="mt-1 text-[11px] text-white/50">Appétence /35 × accessibilité /5</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Touchez un point</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/10">
        {positionedActors.length > 0 ? (
          <svg viewBox={`0 0 ${width} ${height}`} className="block h-[230px] w-full touch-pan-y" role="img" aria-label="Mini-matrice tactile des acteurs concurrents">
            {[0, 10, 20, 30, 35].map((tick) => (
              <g key={`x-${tick}`}>
                <line x1={x(tick)} y1={margin.top} x2={x(tick)} y2={margin.top + plotHeight} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
                <text x={x(tick)} y={height - 17} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.55)">{tick}</text>
              </g>
            ))}
            {[1, 3, 5].map((tick) => (
              <g key={`y-${tick}`}>
                <line x1={margin.left} y1={y(tick)} x2={margin.left + plotWidth} y2={y(tick)} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
                <text x={margin.left - 12} y={y(tick) + 3} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.55)">{tick}</text>
              </g>
            ))}
            <text x={margin.left + plotWidth / 2} y={height - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="rgba(255,255,255,0.7)">Appétence</text>

            {positionedActors.map((actor) => {
              const cx = x(actor.appetenceScore ?? 0)
              const cy = y(actor.accessibilityScore ?? 1)
              const isSelected = actor.id === selectedActorId
              const showLabel = isSelected || actor.isBenchmarkAccount
              const labelOnLeft = cx > width - 100

              return (
                <g
                  key={actor.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${actor.name}, appétence ${actor.appetenceScore} sur 35, accessibilité ${actor.accessibilityScore} sur 5`}
                  className="cursor-pointer outline-none"
                  onPointerUp={() => onSelectActor(actor.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onSelectActor(actor.id)
                    }
                  }}
                >
                  <circle cx={cx} cy={cy} r={22} fill="transparent" />
                  {isSelected ? <circle cx={cx} cy={cy} r={11} fill="none" stroke="var(--color-brand-brass)" strokeWidth={2} /> : null}
                  <circle cx={cx} cy={cy} r={actor.isBenchmarkAccount ? 7 : 6} fill={CATEGORY_COLORS[actor.category]} stroke={actor.isBenchmarkAccount ? "white" : "rgba(255,255,255,0.5)"} strokeWidth={actor.isBenchmarkAccount ? 2.5 : 1} />
                  {showLabel ? (
                    <text x={labelOnLeft ? cx - 12 : cx + 12} y={cy + 3} textAnchor={labelOnLeft ? "end" : "start"} fontSize={9} fontWeight={700} fill="white">
                      {actor.name.length > 18 ? `${actor.name.slice(0, 16)}…` : actor.name}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </svg>
        ) : (
          <div className="flex h-[180px] items-center justify-center px-8 text-center text-xs leading-relaxed text-white/50">
            Aucun acteur ne possède les deux scores nécessaires au positionnement.
          </div>
        )}
      </div>

      {nonPositionedActors.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-white/45">Non positionnés</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {nonPositionedActors.map((actor) => (
              <button key={actor.id} type="button" aria-pressed={actor.id === selectedActorId} onClick={() => onSelectActor(actor.id)} className="min-h-11 shrink-0 rounded-full border border-white/15 px-3 text-xs font-semibold text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass aria-pressed:border-brand-brass aria-pressed:bg-brand-brass/10 aria-pressed:text-brand-brass">
                {actor.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
