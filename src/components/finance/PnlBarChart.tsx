"use client"

import { useState } from "react"
import type { PnlMonthRow } from "@/lib/finance/finance-data"

const MONTHS_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
]

function fmtMonth(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS_FR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

function fmtK(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`
  return `${sign}${Math.round(abs)}`
}

function fmtEuro(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} M€`
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} k€`
  return `${sign}${Math.round(abs)} €`
}

interface PnlBarChartProps {
  rows: PnlMonthRow[]
  window?: number
}

export function PnlBarChart({ rows, window = 6 }: PnlBarChartProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const displayRows = rows.slice(-window)

  if (displayRows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Aucune donnée disponible
      </div>
    )
  }

  const W = 720
  const H = 240
  const mL = 54
  const mR = 16
  const mT = 20
  const mB = 38
  const plotW = W - mL - mR
  const plotH = H - mT - mB
  const baseline = mT + plotH

  const maxCa = Math.max(...displayRows.map((r) => r.revenue_total))
  const maxMarge = Math.max(...displayRows.map((r) => r.gross_margin_value ?? 0), 0)
  const maxBar = Math.max(maxCa, maxMarge, 1) * 1.12

  const opValues = displayRows.map((r) => r.operating_profit_value ?? 0)
  const minOp = Math.min(...opValues, 0)
  const maxOp = Math.max(...opValues, 0)
  // Op uses same Y scale anchored at baseline=0
  const opRange = Math.max(Math.abs(minOp), maxOp, maxBar * 0.1) * 1.2 || 1
  const opY = (v: number) => baseline - (v / opRange) * plotH

  const n = displayRows.length
  const groupW = plotW / n
  const barPad = groupW * 0.12
  const barW = Math.max(8, (groupW - barPad * 2 - 4) / 2)

  const TICK_COUNT = 4
  const ticks = Array.from(
    { length: TICK_COUNT + 1 },
    (_, i) => (maxBar * i) / TICK_COUNT,
  )

  const TW = 176
  const TH = 108

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="min-w-[420px] w-full"
        aria-label="Évolution P&L mensuel"
      >
        {/* Grid + Y axis */}
        {ticks.map((tick, i) => {
          const y = baseline - (tick / maxBar) * plotH
          return (
            <g key={i}>
              <line
                x1={mL} x2={W - mR}
                y1={y} y2={y}
                stroke="var(--color-border)"
                strokeOpacity={i === 0 ? 0.9 : 0.3}
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeDasharray={i === 0 ? undefined : "4 6"}
              />
              <text
                x={mL - 6} y={y + 4}
                textAnchor="end"
                fill="var(--color-muted)"
                fontSize={9} fontWeight={600} fontFamily="inherit"
              >
                {fmtK(tick)}
              </text>
            </g>
          )
        })}

        {/* Résultat opérationnel — ligne pointillée brass */}
        {displayRows.length > 1 && (
          <polyline
            points={displayRows
              .map((r, i) => {
                const cx = mL + i * groupW + groupW / 2
                const cy = opY(r.operating_profit_value ?? 0)
                return `${cx},${cy}`
              })
              .join(" ")}
            fill="none"
            stroke="var(--color-dataviz-2)"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {displayRows.map((r, i) => {
          const cx = mL + i * groupW + groupW / 2
          const cy = opY(r.operating_profit_value ?? 0)
          return (
            <circle
              key={`op-dot-${i}`}
              cx={cx} cy={cy} r={3.5}
              fill="var(--color-dataviz-2)"
            />
          )
        })}

        {/* Bars + X labels + click zones */}
        {displayRows.map((r, i) => {
          const gx = mL + i * groupW + barPad
          const caH = Math.max(0, (r.revenue_total / maxBar) * plotH)
          const maH = Math.max(0, ((r.gross_margin_value ?? 0) / maxBar) * plotH)
          const isSelected = selectedIdx === i

          return (
            <g
              key={r.period_month}
              onClick={() => setSelectedIdx(isSelected ? null : i)}
              style={{ cursor: "pointer" }}
            >
              {/* Hit area */}
              <rect
                x={mL + i * groupW} y={mT}
                width={groupW} height={plotH}
                fill="transparent"
              />
              {/* CA bar — dataviz-1 (cobalt) */}
              <rect
                x={gx}
                y={baseline - caH}
                width={barW}
                height={caH}
                fill="var(--color-dataviz-1)"
                opacity={isSelected ? 1 : 0.8}
                rx={2}
              />
              {/* Marge brute bar — dataviz-4 (vert) */}
              <rect
                x={gx + barW + 4}
                y={baseline - maH}
                width={barW}
                height={maH}
                fill="var(--color-dataviz-4)"
                opacity={isSelected ? 1 : 0.8}
                rx={2}
              />
              {/* X label */}
              <text
                x={gx + barW + 2}
                y={H - 10}
                textAnchor="middle"
                fill={isSelected ? "var(--color-heading)" : "var(--color-muted)"}
                fontSize={9} fontWeight={isSelected ? 700 : 600} fontFamily="inherit"
              >
                {fmtMonth(r.period_month)}
              </text>
            </g>
          )
        })}

        {/* Tooltip */}
        {selectedIdx !== null && (() => {
          const r = displayRows[selectedIdx]
          const cx = mL + selectedIdx * groupW + groupW / 2
          const tooltipX = cx + 12 + TW > W - mR ? cx - 12 - TW : cx + 12
          const tooltipY = mT + 4
          const op = r.operating_profit_value ?? 0
          const opColor = op >= 0 ? "var(--color-success)" : "var(--color-danger)"

          return (
            <g>
              <rect
                x={0} y={0} width={W} height={H}
                fill="transparent"
                onClick={() => setSelectedIdx(null)}
                style={{ cursor: "default" }}
              />
              <line
                x1={cx} x2={cx}
                y1={mT} y2={baseline}
                stroke="var(--color-border)"
                strokeWidth={1} strokeDasharray="3 5" strokeOpacity={0.7}
              />
              <rect
                x={tooltipX} y={tooltipY}
                width={TW} height={TH}
                rx={8}
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth={1.2}
                style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}
              />
              <text x={tooltipX + 12} y={tooltipY + 20} fill="var(--color-heading)" fontSize={10} fontWeight={700} fontFamily="inherit">
                {fmtMonth(r.period_month)}
              </text>
              <line x1={tooltipX + 8} x2={tooltipX + TW - 8} y1={tooltipY + 27} y2={tooltipY + 27} stroke="var(--color-border)" strokeOpacity={0.5} />

              <text x={tooltipX + 12} y={tooltipY + 46} fill="var(--color-dataviz-1)" fontSize={9} fontWeight={600} fontFamily="inherit">CA</text>
              <text x={tooltipX + TW - 10} y={tooltipY + 46} textAnchor="end" fill="var(--color-heading)" fontSize={9} fontWeight={700} fontFamily="inherit">
                {fmtEuro(r.revenue_total)}
              </text>

              <text x={tooltipX + 12} y={tooltipY + 64} fill="var(--color-dataviz-4)" fontSize={9} fontWeight={600} fontFamily="inherit">Marge brute</text>
              <text x={tooltipX + TW - 10} y={tooltipY + 64} textAnchor="end" fill="var(--color-heading)" fontSize={9} fontWeight={700} fontFamily="inherit">
                {r.gross_margin_value !== null ? fmtEuro(r.gross_margin_value) : "—"}
              </text>

              <text x={tooltipX + 12} y={tooltipY + 82} fill="var(--color-dataviz-2)" fontSize={9} fontWeight={600} fontFamily="inherit">Résultat op.</text>
              <text x={tooltipX + TW - 10} y={tooltipY + 82} textAnchor="end" fill={opColor} fontSize={9} fontWeight={700} fontFamily="inherit">
                {r.operating_profit_value !== null ? fmtEuro(r.operating_profit_value) : "—"}
              </text>

              <text x={tooltipX + 12} y={tooltipY + 100} fill="var(--color-muted)" fontSize={8} fontWeight={500} fontFamily="inherit">
                Source : {r.source}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
