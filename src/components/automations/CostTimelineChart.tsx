"use client"

import { useState } from "react"
import type { CostTimelinePoint } from "@/lib/automations/automations-data"
import { formatCostEstimate } from "./automations-status"

function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

function formatDayFull(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
}

export function CostTimelineChart({ points }: { points: CostTimelinePoint[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Aucune donnée de coût disponible.
      </div>
    )
  }

  const W = 720
  const H = 220
  const mL = 44
  const mR = 16
  const mT = 16
  const mB = 30
  const plotW = W - mL - mR
  const plotH = H - mT - mB
  const baseline = mT + plotH

  const measuredCosts = points.map((p) => p.costEstimate ?? 0)
  const maxCost = Math.max(...measuredCosts, 0.01) * 1.15

  const n = points.length
  const groupW = plotW / n
  const barW = Math.max(2, groupW * 0.6)

  const TICK_COUNT = 4
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (maxCost * i) / TICK_COUNT)

  // Un label sur N jours pour éviter la surcharge (jusqu'à ~8 labels visibles).
  const labelEvery = Math.max(1, Math.ceil(n / 8))

  const selected = selectedIdx !== null ? points[selectedIdx] : null
  const TW = 168
  const TH = 62

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" aria-label="Coût IA par jour">
        {ticks.map((tick, i) => {
          const y = baseline - (tick / maxCost) * plotH
          return (
            <g key={i}>
              <line
                x1={mL}
                x2={W - mR}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeOpacity={i === 0 ? 0.7 : 0.12}
                strokeWidth={i === 0 ? 1 : 0.75}
                strokeDasharray={i === 0 ? undefined : "3 4"}
              />
              <text 
                x={mL - 8} 
                y={y + 3} 
                textAnchor="end" 
                fill="var(--color-muted)" 
                fontSize={8} 
                className="font-mono font-medium"
              >
                {formatCostEstimate(tick)}
              </text>
            </g>
          )
        })}

        {/* Vertical tracking line for selected bar */}
        {selected ? (() => {
          const idx = selectedIdx ?? 0
          const gx = mL + idx * groupW + groupW / 2
          return (
            <line
              x1={gx}
              x2={gx}
              y1={mT}
              y2={baseline}
              stroke="var(--color-primary)"
              strokeOpacity={0.25}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          )
        })() : null}

        {points.map((point, i) => {
          const gx = mL + i * groupW + (groupW - barW) / 2
          const isGap = point.costEstimate === null && point.runs > 0
          const height = point.costEstimate !== null ? Math.max(1, (point.costEstimate / maxCost) * plotH) : 0
          const isSelected = selectedIdx === i

          return (
            <g 
              key={point.day} 
              onClick={() => setSelectedIdx(isSelected ? null : i)} 
              className="cursor-pointer group"
            >
              <rect x={mL + i * groupW} y={mT} width={groupW} height={plotH} fill="transparent" />
              {isGap ? (
                <rect
                  x={gx}
                  y={baseline - 6}
                  width={barW}
                  height={6}
                  fill="var(--color-muted)"
                  opacity={isSelected ? 0.6 : 0.2}
                  className="transition-all duration-200"
                  rx={2}
                />
              ) : (
                <rect
                  x={gx}
                  y={baseline - height}
                  width={barW}
                  height={height}
                  fill="var(--color-dataviz-1)"
                  opacity={isSelected ? 1 : 0.6}
                  className="transition-all duration-200 group-hover:opacity-90"
                  rx={2}
                />
              )}
              {i % labelEvery === 0 ? (
                <text
                  x={gx + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fill={isSelected ? "var(--color-heading)" : "var(--color-muted)"}
                  fontSize={8}
                  className={isSelected ? "font-mono font-bold" : "font-mono font-medium"}
                >
                  {formatDayLabel(point.day)}
                </text>
              ) : null}
            </g>
          )
        })}

        {selected ? (
          (() => {
            const idx = selectedIdx ?? 0
            const gx = mL + idx * groupW + groupW / 2
            const tooltipX = Math.min(Math.max(gx - TW / 2, mL), W - mR - TW)
            const tooltipY = mT + 8
            return (
              <g>
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={TW}
                  height={TH}
                  rx={8}
                  fill="var(--color-surface)"
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  className="shadow-md"
                />
                <text x={tooltipX + 12} y={tooltipY + 18} fill="var(--color-heading)" fontSize={10} className="font-bold">
                  {formatDayFull(selected.day)}
                </text>
                <text x={tooltipX + 12} y={tooltipY + 34} fill="var(--color-muted)" fontSize={8} className="font-mono">
                  {selected.runs} run{selected.runs > 1 ? "s" : ""}
                </text>
                <text
                  x={tooltipX + TW - 12}
                  y={tooltipY + 35}
                  textAnchor="end"
                  fill="var(--color-heading)"
                  fontSize={10}
                  className="font-mono font-bold"
                >
                  {selected.costEstimate !== null ? formatCostEstimate(selected.costEstimate) : "non mesuré"}
                </text>
              </g>
            )
          })()
        ) : null}
      </svg>
    </div>
  )
}
