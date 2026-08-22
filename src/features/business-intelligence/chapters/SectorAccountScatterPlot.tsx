"use client"

import React from "react"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"

export type SectorAccountScatterPlotProps = {
  actors: CompetitiveMapActor[]
  selectedActorId: string | null
  onSelectActor: (actorId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  leader: "#1E3150", // Navy
  challenger: "#2563EB", // Blue
  mid_market: "#0D9488", // Teal
  outsider_emergent: "#D89B16", // Brass
  outsider_niche: "#7C3AED", // Purple
}

export function SectorAccountScatterPlot({
  actors,
  selectedActorId,
  onSelectActor,
}: SectorAccountScatterPlotProps) {
  // Chart dimensions & padding
  const svgWidth = 320
  const svgHeight = 240
  const paddingLeft = 36
  const paddingBottom = 32
  const paddingTop = 20
  const paddingRight = 20

  const width = svgWidth - paddingLeft - paddingRight
  const height = svgHeight - paddingTop - paddingBottom

  const getX = (val: number | null) => {
    const score = val ?? 0
    return paddingLeft + (score / 5) * width
  }

  const getY = (val: number | null) => {
    const score = val ?? 0
    return paddingTop + (1 - score / 5) * height
  }

  const plotableActors = actors.filter(
    (a) => a.businessFootprintScore !== null || a.digitalMaturityScore !== null
  )

  return (
    <div className="flex flex-col rounded-xl border border-edito-border bg-edito-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-edito-border/60 pb-2.5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
            Empreinte métier × Maturité numérique
          </h3>
          <p className="mt-0.5 text-[10px] text-edito-muted">
            Cartographie 2D des comptes du segment (/5)
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-edito-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-edito-brass bg-edito-gold" />
            ★ Étalon
          </span>
        </div>
      </div>

      <div className="mt-3 relative flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-full h-auto overflow-visible select-none"
          aria-label="Graphique Empreinte métier versus Maturité numérique"
        >
          {/* Grid lines & axis numbers */}
          {[0, 1, 2, 3, 4, 5].map((tick) => {
            const x = getX(tick)
            const y = getY(tick)

            return (
              <React.Fragment key={tick}>
                {/* Vertical grid line */}
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + height}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 || tick === 5 ? undefined : "2,2"}
                />
                {/* Horizontal grid line */}
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + width}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 || tick === 5 ? undefined : "2,2"}
                />
                {/* X axis tick text */}
                <text
                  x={x}
                  y={paddingTop + height + 16}
                  textAnchor="middle"
                  className="text-[9px] fill-edito-muted font-mono"
                >
                  {tick}
                </text>
                {/* Y axis tick text */}
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-edito-muted font-mono"
                >
                  {tick}
                </text>
              </React.Fragment>
            )
          })}

          {/* Axis Labels */}
          <text
            x={paddingLeft + width / 2}
            y={svgHeight - 2}
            textAnchor="middle"
            className="text-[9px] font-semibold fill-edito-muted uppercase tracking-wider"
          >
            Empreinte métier /5 →
          </text>
          <text
            x={10}
            y={paddingTop + height / 2}
            textAnchor="middle"
            transform={`rotate(-90 10 ${paddingTop + height / 2})`}
            className="text-[9px] font-semibold fill-edito-muted uppercase tracking-wider"
          >
            Maturité numérique /5 →
          </text>

          {/* Actor Points */}
          {plotableActors.map((actor) => {
            const cx = getX(actor.businessFootprintScore)
            const cy = getY(actor.digitalMaturityScore)
            const isSelected = selectedActorId === actor.id
            const color = CATEGORY_COLORS[actor.category] ?? "#1E3150"

            return (
              <g
                key={actor.id}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${actor.name} - Empreinte ${actor.businessFootprintScore ?? "?"}/5, Maturité ${actor.digitalMaturityScore ?? "?"}/5`}
                onClick={() => onSelectActor(actor.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectActor(actor.id)
                  }
                }}
                className="cursor-pointer focus-visible:outline-none"
              >
                {/* Selection indicator aura */}
                {isSelected ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={14}
                    fill="none"
                    stroke="#D89B16"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                ) : null}

                {/* Point body */}
                {actor.isBenchmarkAccount ? (
                  /* Star marker for benchmark account */
                  <path
                    d={`M ${cx} ${cy - 8} L ${cx + 2.5} ${cy - 2.5} L ${cx + 8} ${cy - 1.5} L ${cx + 4} ${cy + 2.5} L ${cx + 5} ${cy + 8} L ${cx} ${cy + 5} L ${cx - 5} ${cy + 8} L ${cx - 4} ${cy + 2.5} L ${cx - 8} ${cy - 1.5} L ${cx - 2.5} ${cy - 2.5} Z`}
                    fill="#D89B16"
                    stroke="#1E3150"
                    strokeWidth="1"
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                )}

                {/* Short label */}
                <text
                  x={cx}
                  y={cy - 10}
                  textAnchor="middle"
                  className={`text-[9px] font-bold ${isSelected ? "fill-edito-navy underline" : "fill-edito-ink"}`}
                >
                  {actor.name.split(" ")[0]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-edito-border/40 pt-2 text-[9px] text-edito-muted">
        {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
          <span key={cat} className="flex items-center gap-1 capitalize">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col }} />
            {cat.replace("_", " ")}
          </span>
        ))}
      </div>
    </div>
  )
}

