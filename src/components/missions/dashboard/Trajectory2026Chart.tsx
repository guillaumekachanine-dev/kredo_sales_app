"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Trajectory2026Data } from "./trajectory-2026-types"

interface Trajectory2026ChartProps {
  data: Trajectory2026Data
}

type DisplayMode = "etp" | "ca"

const DOMAINS = {
  etp: {
    min: 0,
    max: 25,
    ticks: [0, 5, 10, 15, 20, 25] as number[],
    unit: "ETP",
    strokeVar: "var(--color-success)",
  },
  ca: {
    min: 0,
    max: 230,
    ticks: [0, 50, 100, 150, 200, 230] as number[],
    unit: "k€",
    strokeVar: "var(--color-primary)",
  },
} as const

function buildLinePath(
  points: Trajectory2026Data["points"],
  getX: (index: number) => number,
  getY: (value: number) => number,
  getValue: (point: Trajectory2026Data["points"][number]) => number | null
): string {
  let path = ""
  points.forEach((point, index) => {
    const value = getValue(point)
    if (value === null) return
    path += `${path ? " L" : "M"} ${getX(index)} ${getY(value)}`
  })
  return path
}

function buildAreaPath(
  points: Trajectory2026Data["points"],
  getX: (index: number) => number,
  getY: (value: number) => number,
  getValue: (point: Trajectory2026Data["points"][number]) => number | null,
  baseline: number
): string {
  let firstIdx = -1
  let lastIdx = -1
  let linePath = ""

  points.forEach((point, index) => {
    const value = getValue(point)
    if (value === null) return
    if (firstIdx === -1) firstIdx = index
    lastIdx = index
    linePath += `${linePath ? " L" : "M"} ${getX(index)} ${getY(value)}`
  })

  if (!linePath || firstIdx === -1) return ""
  return `${linePath} L ${getX(lastIdx)} ${baseline} L ${getX(firstIdx)} ${baseline} Z`
}

export function Trajectory2026Chart({ data }: Trajectory2026ChartProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("etp")
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)

  const width = 920
  const height = 390
  const marginTop = 36
  const marginRight = 40
  const marginBottom = 54
  const marginLeft = 60
  const plotWidth = width - marginLeft - marginRight
  const plotHeight = height - marginTop - marginBottom

  const domain = DOMAINS[displayMode]

  const getX = (index: number) => {
    if (data.points.length === 1) return marginLeft + plotWidth / 2
    return marginLeft + (index / (data.points.length - 1)) * plotWidth
  }

  const getY = (value: number) => {
    const { min, max } = domain
    return marginTop + ((max - value) / (max - min)) * plotHeight
  }

  const getActualValue = (point: Trajectory2026Data["points"][number]): number | null => {
    if (displayMode === "etp") return point.capacityActual
    return point.revenueActual !== null ? point.revenueActual / 1000 : null
  }

  const getTargetValue = (point: Trajectory2026Data["points"][number]): number => {
    if (displayMode === "etp") return point.capacityTarget
    return point.revenueTarget / 1000
  }

  const stroke = domain.strokeVar
  const baseline = height - marginBottom
  const gradientId = displayMode === "etp" ? "trajEtpGlow" : "trajCaGlow"

  const actualPath = buildLinePath(data.points, getX, getY, getActualValue)
  const targetPath = buildLinePath(data.points, getX, getY, getTargetValue)
  const areaPath = buildAreaPath(data.points, getX, getY, getActualValue, baseline)

  const formatVal = (v: number | null) => {
    if (v === null) return "—"
    if (displayMode === "ca") return `${Math.round(v)}k€`
    return v.toFixed(1)
  }

  const formatDelta = (d: number | null) => {
    if (d === null) return "—"
    const sign = d > 0 ? "+" : ""
    if (displayMode === "ca") return `${sign}${Math.round(d)}k€`
    return `${sign}${d.toFixed(1)}`
  }

  return (
    <div className="bg-surface rounded-xl border border-border/80 shadow-sm overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="border-b border-border/40 px-5 py-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-heading font-heading">
          Trajectoire 2026
        </h2>

        {/* Toggle ETP / CA — même pattern que "Répartition par practice" */}
        <div className="flex items-center bg-canvas p-0.5 rounded-lg border border-border/80">
          <button
            type="button"
            onClick={() => { setDisplayMode("etp"); setSelectedPointIndex(null) }}
            className={cn(
              "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
              displayMode === "etp"
                ? "bg-surface text-primary shadow-sm"
                : "text-muted hover:text-body"
            )}
          >
            ETP
          </button>
          <button
            type="button"
            onClick={() => { setDisplayMode("ca"); setSelectedPointIndex(null) }}
            className={cn(
              "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
              displayMode === "ca"
                ? "bg-surface text-primary shadow-sm"
                : "text-muted hover:text-body"
            )}
          >
            CA
          </button>
        </div>
      </div>

      {/* ── Chart ─────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="overflow-x-auto rounded-lg border border-border/60 bg-canvas/50 p-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full">
            <defs>
              <linearGradient id="trajCaGlow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="trajEtpGlow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-warning)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--color-warning)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* ── Grille horizontale + labels axe Y ────── */}
            {domain.ticks.map((tick) => (
              <g key={`grid-${tick}`}>
                <line
                  x1={marginLeft} x2={width - marginRight}
                  y1={getY(tick)} y2={getY(tick)}
                  stroke="var(--color-border)"
                  strokeOpacity="0.55"
                  strokeDasharray="4 6"
                />
                <text
                  x={marginLeft - 10}
                  y={getY(tick) + 4}
                  textAnchor="end"
                  fill={stroke}
                  fontSize={10}
                  fontWeight={700}
                  fontFamily="inherit"
                >
                  {displayMode === "ca" ? `${tick}k` : tick}
                </text>
              </g>
            ))}

            {/* Unité axe Y */}
            <text
              x={marginLeft - 10}
              y={marginTop - 14}
              textAnchor="end"
              fill={stroke}
              fontSize={11}
              fontWeight={700}
              fontFamily="inherit"
            >
              {domain.unit}
            </text>

            {/* ── Légende inline ─────────────────────────── */}
            <g>
              <line
                x1={marginLeft + 8} x2={marginLeft + 26}
                y1={marginTop - 14} y2={marginTop - 14}
                stroke={stroke} strokeWidth={2.5} strokeLinecap="round"
              />
              <circle cx={marginLeft + 17} cy={marginTop - 14} r={3} fill={stroke} />
              <text
                x={marginLeft + 32} y={marginTop - 10}
                fill="var(--color-body)"
                fontSize={9} fontWeight={600} fontFamily="inherit"
              >
                {displayMode === "etp" ? "ETP réels" : "CA réel"}
              </text>
              <line
                x1={marginLeft + 90} x2={marginLeft + 108}
                y1={marginTop - 14} y2={marginTop - 14}
                stroke={stroke} strokeOpacity={0.5}
                strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round"
              />
              <circle
                cx={marginLeft + 99} cy={marginTop - 14} r={2.5}
                fill="var(--color-canvas)"
                stroke={stroke} strokeOpacity={0.55} strokeWidth={1.5}
              />
              <text
                x={marginLeft + 114} y={marginTop - 10}
                fill="var(--color-body)"
                fontSize={9} fontWeight={600} fontFamily="inherit"
              >
                {displayMode === "etp" ? "Objectif ETP" : "Objectif CA"}
              </text>
            </g>

            {/* ── Axes ───────────────────────────────────── */}
            <line
              x1={marginLeft} x2={marginLeft}
              y1={marginTop} y2={baseline}
              stroke="var(--color-border)" strokeOpacity="0.9"
            />
            <line
              x1={marginLeft} x2={width - marginRight}
              y1={baseline} y2={baseline}
              stroke="var(--color-border)" strokeOpacity="0.9"
            />

            {/* ── Labels axe X ───────────────────────────── */}
            {data.points.map((point, index) => {
              const x = getX(index)
              return (
                <g key={point.monthKey}>
                  <line
                    x1={x} x2={x}
                    y1={baseline} y2={baseline + 6}
                    stroke="var(--color-border)" strokeOpacity="0.9"
                  />
                  <text
                    x={x} y={baseline + 22}
                    textAnchor="middle"
                    fill="var(--color-body)"
                    fontSize={10} fontWeight={600} fontFamily="inherit"
                  >
                    {point.monthLabel}
                  </text>
                </g>
              )
            })}

            {/* ── Aire sous la courbe réelle ──────────────── */}
            {areaPath && (
              <path d={areaPath} fill={`url(#${gradientId})`} />
            )}

            {/* ── Courbe théorique (pointillée) ───────────── */}
            {targetPath && (
              <>
                <path
                  d={targetPath}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={0.45}
                  strokeWidth={2.2}
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {data.points.map((point, index) => {
                  const value = getTargetValue(point)
                  const cx = getX(index)
                  const cy = getY(value)
                  const isSelected = selectedPointIndex === index
                  return (
                    <g
                      key={`target-${point.monthKey}`}
                      onClick={() => setSelectedPointIndex(isSelected ? null : index)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={cx} cy={cy} r={10} fill="transparent" />
                      <circle
                        cx={cx} cy={cy}
                        r={isSelected ? 4.5 : 3}
                        fill="var(--color-surface)"
                        stroke={stroke}
                        strokeOpacity={0.55}
                        strokeWidth={isSelected ? 2.5 : 1.8}
                        style={{ transition: "r 120ms ease, stroke-width 120ms ease" }}
                      />
                    </g>
                  )
                })}
              </>
            )}

            {/* ── Courbe réelle (trait plein) ─────────────── */}
            {actualPath && (
              <>
                <path
                  d={actualPath}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={1}
                  strokeWidth={2.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {data.points.map((point, index) => {
                  const value = getActualValue(point)
                  if (value === null) return null
                  const cx = getX(index)
                  const cy = getY(value)
                  const isSelected = selectedPointIndex === index
                  return (
                    <g
                      key={`actual-${point.monthKey}`}
                      onClick={() => setSelectedPointIndex(isSelected ? null : index)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={cx} cy={cy} r={10} fill="transparent" />
                      <circle
                        cx={cx} cy={cy}
                        r={isSelected ? 5.5 : 3.5}
                        fill={stroke}
                        stroke={stroke}
                        strokeWidth={isSelected ? 2.5 : 1.6}
                        style={{ transition: "r 120ms ease, stroke-width 120ms ease" }}
                      />
                    </g>
                  )
                })}
              </>
            )}

            {/* ── Tooltip ─────────────────────────────────── */}
            {selectedPointIndex !== null && (() => {
              const point = data.points[selectedPointIndex]
              const px = getX(selectedPointIndex)
              const TW = 188
              const TH = 112
              const GAP = 14
              const tooltipX =
                px + GAP + TW > width - marginRight ? px - GAP - TW : px + GAP
              const tooltipY = marginTop + 8

              const actualVal = getActualValue(point)
              const targetVal = getTargetValue(point)
              const delta = actualVal !== null ? actualVal - targetVal : null
              const deltaColor =
                delta === null
                  ? "var(--color-muted)"
                  : delta >= 0
                    ? "var(--color-success)"
                    : "var(--color-danger)"

              return (
                <g>
                  {/* Dismiss backdrop */}
                  <rect
                    x={0} y={0} width={width} height={height}
                    fill="transparent"
                    onClick={() => setSelectedPointIndex(null)}
                    style={{ cursor: "default" }}
                  />

                  {/* Ligne de guidage verticale */}
                  <line
                    x1={px} x2={px}
                    y1={marginTop} y2={baseline}
                    stroke="var(--color-border)"
                    strokeWidth={1} strokeDasharray="3 5" strokeOpacity={0.7}
                  />

                  {/* Bulle */}
                  <rect
                    x={tooltipX} y={tooltipY}
                    width={TW} height={TH}
                    rx={9}
                    fill="var(--color-surface)"
                    stroke="var(--color-border)"
                    strokeWidth={1.2}
                    style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.10))" }}
                  />

                  {/* Titre mois */}
                  <text
                    x={tooltipX + 12} y={tooltipY + 20}
                    fill="var(--color-heading)"
                    fontSize={11} fontWeight={700} fontFamily="inherit"
                  >
                    {point.monthLabel}
                  </text>
                  {point.annotation && (
                    <text
                      x={tooltipX + TW - 10} y={tooltipY + 20}
                      textAnchor="end"
                      fill="var(--color-warning)"
                      fontSize={9} fontWeight={700} fontFamily="inherit"
                    >
                      {point.annotation}
                    </text>
                  )}

                  {/* Séparateur */}
                  <line
                    x1={tooltipX + 8} x2={tooltipX + TW - 8}
                    y1={tooltipY + 27} y2={tooltipY + 27}
                    stroke="var(--color-border)" strokeOpacity={0.5}
                  />

                  {/* Ligne 1 : Réel */}
                  <text
                    x={tooltipX + 12} y={tooltipY + 47}
                    fill={stroke}
                    fontSize={10} fontWeight={600} fontFamily="inherit"
                  >
                    {displayMode === "etp" ? "ETP réels" : "CA réel"}
                  </text>
                  <text
                    x={tooltipX + TW - 10} y={tooltipY + 47}
                    textAnchor="end"
                    fill="var(--color-heading)"
                    fontSize={10} fontWeight={700} fontFamily="inherit"
                  >
                    {formatVal(actualVal)}
                  </text>

                  {/* Ligne 2 : Objectif */}
                  <text
                    x={tooltipX + 12} y={tooltipY + 67}
                    fill="var(--color-muted)"
                    fontSize={10} fontWeight={600} fontFamily="inherit"
                  >
                    Objectif
                  </text>
                  <text
                    x={tooltipX + TW - 10} y={tooltipY + 67}
                    textAnchor="end"
                    fill="var(--color-heading)"
                    fontSize={10} fontWeight={700} fontFamily="inherit"
                  >
                    {formatVal(targetVal)}
                  </text>

                  {/* Ligne 3 : Écart */}
                  <text
                    x={tooltipX + 12} y={tooltipY + 87}
                    fill={deltaColor}
                    fontSize={10} fontWeight={700} fontFamily="inherit"
                  >
                    Écart
                  </text>
                  <text
                    x={tooltipX + TW - 10} y={tooltipY + 87}
                    textAnchor="end"
                    fill={deltaColor}
                    fontSize={10} fontWeight={700} fontFamily="inherit"
                  >
                    {formatDelta(delta)}
                  </text>
                </g>
              )
            })()}
          </svg>
        </div>
      </div>
    </div>
  )
}
