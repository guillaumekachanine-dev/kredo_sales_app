"use client"

import { useMemo, useState } from "react"
import type { CollaboratorMonthlyProduction } from "../data/production-leave.types"
import { cn } from "@/lib/utils"

interface ProductionLeaveHistoryChartProps {
  history: CollaboratorMonthlyProduction[]
  selectedMonth: string
  onSelectMonth?: (month: string) => void
}

const MONTH_SHORT: Record<string, string> = {
  "01": "Jan",
  "02": "Fév",
  "03": "Mar",
  "04": "Avr",
  "05": "Mai",
  "06": "Juin",
  "07": "Juil",
  "08": "Août",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Déc",
}

function formatMonthShort(monthIso: string): string {
  const [, m] = monthIso.split("-")
  return MONTH_SHORT[m] ?? monthIso
}

export function ProductionLeaveHistoryChart({
  history,
  selectedMonth,
  onSelectMonth,
}: ProductionLeaveHistoryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // viewBox parameters
  const svgWidth = 640
  const svgHeight = 200
  const padLeft = 45
  const padRight = 25
  const padTop = 25
  const padBottom = 35

  const plotWidth = svgWidth - padLeft - padRight
  const plotHeight = svgHeight - padTop - padBottom

  // Coordinates calculation
  const points = useMemo(() => {
    if (history.length === 0) return []
    const count = history.length

    return history.map((item, i) => {
      const x = padLeft + (count > 1 ? (i / (count - 1)) * plotWidth : plotWidth / 2)
      const rate = item.productivityRate
      const target = item.targetRate

      const y =
        rate !== null
          ? padTop + (1 - Math.min(100, Math.max(0, rate)) / 100) * plotHeight
          : null

      const yTarget =
        target !== null
          ? padTop + (1 - Math.min(100, Math.max(0, target)) / 100) * plotHeight
          : null

      return {
        index: i,
        month: item.month,
        label: formatMonthShort(item.month),
        rate,
        target,
        gap: item.gapVsTarget,
        hasData: item.hasActivityData,
        x,
        y,
        yTarget,
      }
    })
  }, [history, plotWidth, plotHeight])

  // Polyline for real productivity
  const realLinePoints = useMemo(() => {
    const valid = points.filter((p): p is typeof p & { y: number } => p.y !== null)
    return valid.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  }, [points])

  // Polyline for target
  const targetLinePoints = useMemo(() => {
    const valid = points.filter((p): p is typeof p & { yTarget: number } => p.yTarget !== null)
    return valid.map((p) => `${p.x.toFixed(1)},${p.yTarget.toFixed(1)}`).join(" ")
  }, [points])

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Historique de productivité (12 mois)
          </h3>
          <p className="text-[11px] text-white/45 mt-0.5">
            Évolution du réalisé vs objectif contractuel
          </p>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-brand-brass" />
            <span className="text-white font-medium">Réalisé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-b-2 border-dashed border-amber-400/80" />
            <span className="text-white font-medium">Cible</span>
          </div>
        </div>
      </div>

      {/* Surface SVG */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          aria-label="Graphique d'évolution de la productivité sur 12 mois"
        >
          {/* Lignes horizontales de repère (0%, 50%, 80%, 100%) */}
          {[0, 50, 80, 100].map((val) => {
            const y = padTop + (1 - val / 100) * plotHeight
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={val === 80 ? "rgba(251, 191, 36, 0.25)" : "rgba(255, 255, 255, 0.08)"}
                  strokeWidth={1}
                  strokeDasharray={val === 80 ? "3 3" : undefined}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.40)"
                  className="text-[9px] font-mono"
                >
                  {val} %
                </text>
              </g>
            )
          })}

          {/* Ligne cible */}
          {targetLinePoints ? (
            <polyline
              fill="none"
              stroke="#F59E0B"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              points={targetLinePoints}
            />
          ) : null}

          {/* Ligne réelle */}
          {realLinePoints ? (
            <polyline
              fill="none"
              stroke="#C89A2B"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={realLinePoints}
            />
          ) : null}

          {/* Points interactifs */}
          {points.map((p) => {
            const isSelected = p.month === selectedMonth
            const isHovered = hoveredIndex === p.index

            return (
              <g
                key={p.month}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(p.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectMonth?.(p.month)}
              >
                {/* Zone cliquable transparente */}
                <rect
                  x={p.x - 18}
                  y={padTop}
                  width={36}
                  height={plotHeight}
                  fill="transparent"
                />

                {/* Point réel */}
                {p.y !== null ? (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? 6 : isHovered ? 5 : 3.5}
                    className={cn(
                      "transition-all",
                      isSelected
                        ? "fill-[#0f122c] stroke-brand-brass stroke-[3px]"
                        : isHovered
                          ? "fill-brand-brass stroke-white stroke-2"
                          : "fill-brand-brass",
                    )}
                  />
                ) : (
                  // Marqueur absence de donnée
                  <circle
                    cx={p.x}
                    cy={padTop + plotHeight}
                    r={2.5}
                    className="fill-white/20"
                  />
                )}

                {/* Label axe X */}
                <text
                  x={p.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] transition-colors font-mono",
                    isSelected
                      ? "fill-brand-brass font-bold"
                      : isHovered
                        ? "fill-white font-semibold"
                        : "fill-white/40",
                  )}
                >
                  {p.label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Tooltip flottant au survol */}
        {hoveredPoint ? (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-white/10 bg-[#0f122c] px-2.5 py-1.5 shadow-xl text-xs text-white"
            style={{
              left: `${Math.min(82, Math.max(5, (hoveredPoint.x / svgWidth) * 100))}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-semibold text-white">
              {hoveredPoint.month}
            </div>
            {hoveredPoint.rate !== null ? (
              <div className="text-[11px] text-white/80">
                Productivité : <strong className="text-brand-brass font-mono tabular-nums">{hoveredPoint.rate.toFixed(1)} %</strong>
                {hoveredPoint.target !== null ? (
                  <span className="text-white/45 ml-1.5 font-mono tabular-nums">
                    (Cible : {hoveredPoint.target.toFixed(1)} %)
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="text-[11px] text-white/45">Aucune donnée</div>
            )}
          </div>
        ) : null}
      </div>

      {/* Tableau chronologique récapitulatif compact */}
      <div className="overflow-x-auto border-t border-white/5 pt-3">
        <div className="flex min-w-[500px] justify-between gap-1 text-center">
          {points.map((p) => {
            const isSelected = p.month === selectedMonth
            return (
              <button
                key={p.month}
                type="button"
                onClick={() => onSelectMonth?.(p.month)}
                className={cn(
                  "flex-1 rounded-lg p-1.5 text-left transition-colors border",
                  isSelected
                    ? "bg-brand-brass/10 border-brand-brass/40 text-white"
                    : "border-transparent hover:bg-white/[0.04] text-white/80",
                )}
              >
                <div className="text-[10px] font-medium text-white/45 uppercase">
                  {p.label}
                </div>
                <div className="text-xs font-bold text-white mt-0.5 font-mono tabular-nums">
                  {p.rate !== null ? `${p.rate.toFixed(0)}%` : "—"}
                </div>
                <div className="text-[10px] text-white/40 font-mono tabular-nums">
                  {p.gap !== null ? (
                    <span className={p.gap >= 0 ? "text-brand-brass font-semibold" : "text-amber-400"}>
                      {p.gap > 0 ? `+${p.gap.toFixed(0)}` : p.gap.toFixed(0)}
                    </span>
                  ) : (
                    "·"
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
