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
    <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Historique de productivité (12 mois)
          </h3>
          <p className="text-[11px] text-body mt-0.5">
            Évolution du réalisé vs objectif contractuel
          </p>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-primary" />
            <span className="text-heading font-medium">Réalisé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-b-2 border-dashed border-amber-600" />
            <span className="text-heading font-medium">Cible</span>
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
                  stroke="currentColor"
                  className={cn(
                    val === 80
                      ? "text-amber-500/30 stroke-dashed"
                      : "text-border/80",
                  )}
                  strokeWidth={1}
                  strokeDasharray={val === 80 ? "3 3" : undefined}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted text-[10px] font-mono"
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
              stroke="#D97706"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              points={targetLinePoints}
            />
          ) : null}

          {/* Ligne réelle */}
          {realLinePoints ? (
            <polyline
              fill="none"
              stroke="var(--color-primary)"
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
                        ? "fill-surface stroke-primary stroke-[3px]"
                        : isHovered
                          ? "fill-primary stroke-surface stroke-2"
                          : "fill-primary",
                    )}
                  />
                ) : (
                  // Marqueur absence de donnée
                  <circle
                    cx={p.x}
                    cy={padTop + plotHeight}
                    r={2.5}
                    className="fill-muted/40"
                  />
                )}

                {/* Label axe X */}
                <text
                  x={p.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] transition-colors",
                    isSelected
                      ? "fill-primary font-bold"
                      : isHovered
                        ? "fill-heading font-semibold"
                        : "fill-muted",
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
            className="pointer-events-none absolute top-2 rounded-[var(--radius-small)] border border-border bg-surface px-2.5 py-1.5 shadow-sm text-xs"
            style={{
              left: `${Math.min(82, Math.max(5, (hoveredPoint.x / svgWidth) * 100))}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-semibold text-heading">
              {hoveredPoint.month}
            </div>
            {hoveredPoint.rate !== null ? (
              <div className="text-[11px] text-body">
                Productivité : <strong>{hoveredPoint.rate.toFixed(1)} %</strong>
                {hoveredPoint.target !== null ? (
                  <span className="text-muted ml-1.5">
                    (Cible : {hoveredPoint.target.toFixed(1)} %)
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="text-[11px] text-muted">Aucune donnée</div>
            )}
          </div>
        ) : null}
      </div>

      {/* Tableau chronologique récapitulatif compact */}
      <div className="overflow-x-auto border-t border-border/60 pt-3">
        <div className="flex min-w-[500px] justify-between gap-1 text-center">
          {points.map((p) => {
            const isSelected = p.month === selectedMonth
            return (
              <button
                key={p.month}
                type="button"
                onClick={() => onSelectMonth?.(p.month)}
                className={cn(
                  "flex-1 rounded p-1.5 text-left transition-colors",
                  isSelected
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-surface-hover/60",
                )}
              >
                <div className="text-[10px] font-medium text-muted uppercase">
                  {p.label}
                </div>
                <div className="text-xs font-bold text-heading mt-0.5">
                  {p.rate !== null ? `${p.rate.toFixed(0)}%` : "—"}
                </div>
                <div className="text-[10px] text-muted">
                  {p.gap !== null ? (
                    <span className={p.gap >= 0 ? "text-success font-semibold" : "text-amber-700"}>
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
