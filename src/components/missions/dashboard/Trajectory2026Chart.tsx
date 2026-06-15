"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type {
  Trajectory2026Data,
  TrajectoryGroupId,
  TrajectorySeriesId,
} from "./trajectory-2026-types"

interface Trajectory2026ChartProps {
  data: Trajectory2026Data
}

type SeriesConfig = {
  id: TrajectorySeriesId
  label: string
  group: TrajectoryGroupId
  axis: "left" | "innerLeft" | "right"
  strokeVar: string
  textClassName: string
  softClassName: string
  strokeWidth: number
  dashArray?: string
  filled: boolean
  getValue: (point: Trajectory2026Data["points"][number]) => number | null
}

const GROUP_META: Record<
  TrajectoryGroupId,
  { label: string; accent: string; soft: string; border: string; dotClassName: string; unit: string }
> = {
  revenue: {
    label: "CA (kEUR)",
    accent: "text-primary",
    soft: "bg-primary/6",
    border: "border-primary/15",
    dotClassName: "bg-primary",
    unit: "kEUR",
  },
  capacity: {
    label: "Capacite (eq.)",
    accent: "text-warning",
    soft: "bg-warning/8",
    border: "border-warning/15",
    dotClassName: "bg-warning",
    unit: "eq.",
  },
  margin: {
    label: "Marge (%)",
    accent: "text-success",
    soft: "bg-success/8",
    border: "border-success/15",
    dotClassName: "bg-success",
    unit: "%",
  },
}

const SERIES: SeriesConfig[] = [
  {
    id: "revenueActual",
    label: "CA reel",
    group: "revenue",
    axis: "left",
    strokeVar: "var(--color-primary)",
    textClassName: "text-primary",
    softClassName: "bg-primary/6 border-primary/15",
    strokeWidth: 2.7,
    filled: true,
    getValue: (point) => point.revenueActual !== null ? point.revenueActual / 1000 : null,
  },
  {
    id: "revenueTarget",
    label: "Objectif CA",
    group: "revenue",
    axis: "left",
    strokeVar: "var(--color-primary)",
    textClassName: "text-primary",
    softClassName: "bg-primary/6 border-primary/15",
    strokeWidth: 2.2,
    dashArray: "8 6",
    filled: false,
    getValue: (point) => point.revenueTarget / 1000,
  },
  {
    id: "capacityActual",
    label: "Proxy missions",
    group: "capacity",
    axis: "innerLeft",
    strokeVar: "var(--color-warning)",
    textClassName: "text-warning",
    softClassName: "bg-warning/8 border-warning/15",
    strokeWidth: 2.6,
    filled: true,
    getValue: (point) => point.capacityActual,
  },
  {
    id: "capacityTarget",
    label: "Capacite cible",
    group: "capacity",
    axis: "innerLeft",
    strokeVar: "var(--color-warning)",
    textClassName: "text-warning",
    softClassName: "bg-warning/8 border-warning/15",
    strokeWidth: 2.1,
    dashArray: "8 6",
    filled: false,
    getValue: (point) => point.capacityTarget,
  },
  {
    id: "marginActual",
    label: "Marge reelle",
    group: "margin",
    axis: "right",
    strokeVar: "var(--color-success)",
    textClassName: "text-success",
    softClassName: "bg-success/8 border-success/15",
    strokeWidth: 2.6,
    filled: true,
    getValue: (point) => point.marginActual,
  },
  {
    id: "marginTarget",
    label: "Objectif marge",
    group: "margin",
    axis: "right",
    strokeVar: "var(--color-success)",
    textClassName: "text-success",
    softClassName: "bg-success/8 border-success/15",
    strokeWidth: 2.1,
    dashArray: "8 6",
    filled: false,
    getValue: (point) => point.marginTarget,
  },
]

const GROUP_SERIES: Record<TrajectoryGroupId, TrajectorySeriesId[]> = {
  revenue: ["revenueActual", "revenueTarget"],
  capacity: ["capacityActual", "capacityTarget"],
  margin: ["marginActual", "marginTarget"],
}

function formatCompactEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value)
}

function formatSignedCompactEuro(value: number) {
  const rounded = Math.round(value)
  const abs = Math.abs(rounded)
  const base = abs >= 1000
    ? `${Math.round(abs / 1000)}kEUR`
    : `${abs.toLocaleString("fr-FR")} EUR`

  if (rounded === 0) return "0 EUR"
  return `${rounded > 0 ? "+" : "-"}${base}`
}

function buildDomain(values: number[], step: number, minPadding = 0.08, maxPadding = 0.1) {
  if (values.length === 0) return [0, step * 4]

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  if (minValue === maxValue) {
    const paddedMin = Math.floor((minValue - step * 2) / step) * step
    const paddedMax = Math.ceil((maxValue + step * 2) / step) * step
    return [paddedMin, paddedMax]
  }

  const range = maxValue - minValue
  const paddedMin = Math.floor((minValue - range * minPadding) / step) * step
  const paddedMax = Math.ceil((maxValue + range * maxPadding) / step) * step

  return [paddedMin, paddedMax]
}

function buildTicks([min, max]: [number, number], count: number) {
  if (count <= 1) return [min, max]
  const step = (max - min) / (count - 1)
  return Array.from({ length: count }, (_, index) => min + step * index)
}

function buildLinePath(
  points: Trajectory2026Data["points"],
  getX: (index: number) => number,
  getY: (value: number) => number,
  getValue: SeriesConfig["getValue"]
) {
  let path = ""

  points.forEach((point, index) => {
    const value = getValue(point)
    if (value === null) return
    path += `${path ? " L" : "M"} ${getX(index)} ${getY(value)}`
  })

  return path
}

export function Trajectory2026Chart({ data }: Trajectory2026ChartProps) {
  const [seriesVisibility, setSeriesVisibility] = useState<Record<TrajectorySeriesId, boolean>>({
    revenueActual: true,
    revenueTarget: true,
    capacityActual: true,
    capacityTarget: true,
    marginActual: true,
    marginTarget: true,
  })
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)

  const width = 920
  const height = 390
  const marginTop = 28
  const marginRight = 76
  const marginBottom = 54
  const marginLeft = 76
  const innerLeftOffset = 32
  const plotWidth = width - marginLeft - marginRight
  const plotHeight = height - marginTop - marginBottom

  const revenueValues = data.points.flatMap((point) => {
    const values = [point.revenueTarget / 1000]
    if (point.revenueActual !== null) values.push(point.revenueActual / 1000)
    return values
  })
  const capacityValues = data.points.flatMap((point) => {
    const values = [point.capacityTarget]
    if (point.capacityActual !== null) values.push(point.capacityActual)
    return values
  })
  const marginValues = data.points.flatMap((point) => {
    const values = [point.marginTarget]
    if (point.marginActual !== null) values.push(point.marginActual)
    return values
  })

  const revenueDomain = buildDomain(revenueValues, 10)
  const capacityDomain = buildDomain(capacityValues, 1)
  const marginDomain = buildDomain(marginValues, 1, 0.18, 0.18)

  const revenueTicks = buildTicks(revenueDomain as [number, number], 5)
  const capacityTicks = buildTicks(capacityDomain as [number, number], 5)
  const marginTicks = buildTicks(marginDomain as [number, number], 5)

  const getX = (index: number) => {
    if (data.points.length === 1) return marginLeft + plotWidth / 2
    return marginLeft + (index / (data.points.length - 1)) * plotWidth
  }

  const createScale = ([min, max]: [number, number]) => (value: number) =>
    marginTop + ((max - value) / (max - min || 1)) * plotHeight

  const revenueScale = createScale(revenueDomain as [number, number])
  const capacityScale = createScale(capacityDomain as [number, number])
  const marginScale = createScale(marginDomain as [number, number])

  const groupEnabled = (group: TrajectoryGroupId) =>
    GROUP_SERIES[group].some((seriesId) => seriesVisibility[seriesId])

  const toggleSeries = (seriesId: TrajectorySeriesId) => {
    setSeriesVisibility((current) => ({
      ...current,
      [seriesId]: !current[seriesId],
    }))
  }

  const toggleGroup = (group: TrajectoryGroupId) => {
    const shouldEnable = !groupEnabled(group)
    setSeriesVisibility((current) => {
      const next = { ...current }
      GROUP_SERIES[group].forEach((seriesId) => {
        next[seriesId] = shouldEnable
      })
      return next
    })
  }

  return (
    <div className="bg-surface rounded-xl border border-border/80 shadow-sm overflow-hidden">
      <div className="border-b border-border/40 px-5 py-4">
        <h2 className="text-sm font-bold text-heading font-heading uppercase tracking-wider">
          Trajectoire 2026
        </h2>
      </div>

      <div className="px-5 py-4">
        <div className="overflow-x-auto rounded-lg border border-border/60 bg-canvas/50 p-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full">
            <defs>
              <linearGradient id="trajectoryRevenueGlow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {revenueTicks.map((tick) => (
              <g key={`grid-${tick}`}>
                <line
                  x1={marginLeft}
                  x2={width - marginRight}
                  y1={revenueScale(tick)}
                  y2={revenueScale(tick)}
                  stroke="var(--color-border)"
                  strokeOpacity="0.55"
                  strokeDasharray="4 6"
                />
                {groupEnabled("revenue") ? (
                  <text
                    x={marginLeft - 14}
                    y={revenueScale(tick) + 4}
                    textAnchor="end"
                    fill="var(--color-primary)"
                    className="text-[10px] font-bold"
                  >
                    {`${Math.round(tick)}k`}
                  </text>
                ) : null}
              </g>
            ))}

            {groupEnabled("capacity")
              ? capacityTicks.map((tick) => (
                  <text
                    key={`capacity-${tick}`}
                    x={marginLeft + innerLeftOffset}
                    y={capacityScale(tick) + 4}
                    textAnchor="start"
                    fill="var(--color-warning)"
                    className="text-[10px] font-semibold"
                  >
                    {tick.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                  </text>
                ))
              : null}

            {groupEnabled("margin")
              ? marginTicks.map((tick) => (
                  <text
                    key={`margin-${tick}`}
                    x={width - marginRight + 14}
                    y={marginScale(tick) + 4}
                    textAnchor="start"
                    fill="var(--color-success)"
                    className="text-[10px] font-semibold"
                  >
                    {`${tick.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}%`}
                  </text>
                ))
              : null}

            <line
              x1={marginLeft}
              x2={marginLeft}
              y1={marginTop}
              y2={height - marginBottom}
              stroke="var(--color-border)"
              strokeOpacity="0.9"
            />
            <line
              x1={marginLeft}
              x2={width - marginRight}
              y1={height - marginBottom}
              y2={height - marginBottom}
              stroke="var(--color-border)"
              strokeOpacity="0.9"
            />

            {data.points.map((point, index) => {
              const x = getX(index)
              return (
                <g key={point.monthKey}>
                  <line
                    x1={x}
                    x2={x}
                    y1={height - marginBottom}
                    y2={height - marginBottom + 6}
                    stroke="var(--color-border)"
                    strokeOpacity="0.9"
                  />
                  <text
                    x={x}
                    y={height - marginBottom + 22}
                    textAnchor="middle"
                    fill="var(--color-body)"
                    className="text-[10px] font-semibold"
                  >
                    {point.monthLabel}
                  </text>

                  {point.annotation ? (
                    <>
                      <line
                        x1={x}
                        x2={x}
                        y1={marginTop + 8}
                        y2={height - marginBottom - 8}
                        stroke="var(--color-warning)"
                        strokeOpacity="0.28"
                        strokeDasharray="3 6"
                      />
                      <rect
                        x={x - 38}
                        y={marginTop - 2}
                        width="76"
                        height="18"
                        rx="9"
                        fill="var(--color-canvas)"
                        stroke="var(--color-warning)"
                        strokeOpacity="0.35"
                      />
                      <text
                        x={x}
                        y={marginTop + 10}
                        textAnchor="middle"
                        fill="var(--color-warning)"
                        className="text-[9px] font-bold"
                      >
                        {point.annotation}
                      </text>
                    </>
                  ) : null}
                </g>
              )
            })}

            {seriesVisibility.revenueActual ? (
              <path
                d={`${buildLinePath(
                  data.points,
                  getX,
                  revenueScale,
                  (point) => point.revenueActual !== null ? point.revenueActual / 1000 : null
                )} L ${getX(data.points.length - 1)} ${height - marginBottom} L ${getX(0)} ${height - marginBottom} Z`}
                fill="url(#trajectoryRevenueGlow)"
              />
            ) : null}

            {SERIES.filter((series) => seriesVisibility[series.id]).map((series) => {
              const scale =
                series.axis === "left"
                  ? revenueScale
                  : series.axis === "innerLeft"
                    ? capacityScale
                    : marginScale
              const path = buildLinePath(data.points, getX, scale, series.getValue)

              if (!path) return null

              return (
                <g key={series.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={series.strokeVar}
                    strokeOpacity={series.dashArray ? 0.48 : 1}
                    strokeWidth={series.strokeWidth}
                    strokeDasharray={series.dashArray}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {data.points.map((point, index) => {
                    const value = series.getValue(point)
                    if (value === null) return null
                    const cx = getX(index)
                    const cy = scale(value)
                    const isSelected = selectedPointIndex === index
                    return (
                      <g
                        key={`${series.id}-${point.monthKey}`}
                        onClick={() => setSelectedPointIndex(isSelected ? null : index)}
                        style={{ cursor: "pointer" }}
                      >
                        {/* Zone de clic élargie invisible */}
                        <circle cx={cx} cy={cy} r={10} fill="transparent" />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 5.5 : series.filled ? 3.4 : 3.1}
                          fill={series.filled ? series.strokeVar : "var(--color-surface)"}
                          fillOpacity={series.dashArray ? 0.55 : 1}
                          stroke={series.strokeVar}
                          strokeOpacity={series.dashArray ? 0.6 : 1}
                          strokeWidth={isSelected ? 2.5 : series.filled ? 1.6 : 2}
                          style={{ transition: "r 120ms ease, stroke-width 120ms ease" }}
                        />
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {groupEnabled("revenue") ? (
              <text x={22} y={22} fill="var(--color-primary)" className="text-[11px] font-bold">
                {GROUP_META.revenue.unit}
              </text>
            ) : null}
            {groupEnabled("capacity") ? (
              <text x={118} y={22} fill="var(--color-warning)" className="text-[11px] font-bold">
                {GROUP_META.capacity.unit}
              </text>
            ) : null}
            {groupEnabled("margin") ? (
              <text x={width - 28} y={22} textAnchor="end" fill="var(--color-success)" className="text-[11px] font-bold">
                {GROUP_META.margin.unit}
              </text>
            ) : null}

            {/* ── TOOLTIP ─────────────────────────────────────────────────────── */}
            {selectedPointIndex !== null && (() => {
              const point = data.points[selectedPointIndex]
              const px = getX(selectedPointIndex)
              const TW = 218
              const TH = point.revenueActual !== null ? 138 : 118
              const GAP = 14
              const tooltipX = px + GAP + TW > width - marginRight
                ? px - GAP - TW
                : px + GAP
              const tooltipY = marginTop + 8

              const caActual = point.revenueActual !== null ? Math.round(point.revenueActual / 1000) : null
              const caTarget = Math.round(point.revenueTarget / 1000)
              const delta = point.revenueActual !== null ? point.revenueActual - point.revenueTarget : null

              return (
                <g>
                  {/* Backdrop dismiss */}
                  <rect
                    x={0} y={0} width={width} height={height}
                    fill="transparent"
                    onClick={() => setSelectedPointIndex(null)}
                    style={{ cursor: "default" }}
                  />

                  {/* Ligne verticale de guidage */}
                  <line
                    x1={px} x2={px}
                    y1={marginTop} y2={height - marginBottom}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    strokeDasharray="3 5"
                    strokeOpacity={0.7}
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
                    fontSize={11} fontWeight={700}
                    fontFamily="inherit"
                  >
                    {point.monthLabel}
                  </text>
                  {point.annotation && (
                    <text
                      x={tooltipX + TW - 10} y={tooltipY + 20}
                      textAnchor="end"
                      fill="var(--color-warning)"
                      fontSize={9} fontWeight={700}
                      fontFamily="inherit"
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

                  {/* CA */}
                  <text x={tooltipX + 12} y={tooltipY + 45} fill="var(--color-primary)" fontSize={10} fontWeight={600} fontFamily="inherit">
                    CA réel
                  </text>
                  <text x={tooltipX + TW - 10} y={tooltipY + 45} textAnchor="end" fill="var(--color-heading)" fontSize={10} fontWeight={700} fontFamily="inherit">
                    {caActual !== null ? `${caActual}k€` : "—"} / obj. {caTarget}k€
                  </text>

                  {/* Capacité */}
                  <text x={tooltipX + 12} y={tooltipY + 65} fill="var(--color-warning)" fontSize={10} fontWeight={600} fontFamily="inherit">
                    Missions
                  </text>
                  <text x={tooltipX + TW - 10} y={tooltipY + 65} textAnchor="end" fill="var(--color-heading)" fontSize={10} fontWeight={700} fontFamily="inherit">
                    {point.capacityActual !== null ? point.capacityActual.toFixed(1) : "—"} / cible {point.capacityTarget.toFixed(1)}
                  </text>

                  {/* Marge */}
                  <text x={tooltipX + 12} y={tooltipY + 85} fill="var(--color-success)" fontSize={10} fontWeight={600} fontFamily="inherit">
                    Marge
                  </text>
                  <text x={tooltipX + TW - 10} y={tooltipY + 85} textAnchor="end" fill="var(--color-heading)" fontSize={10} fontWeight={700} fontFamily="inherit">
                    {point.marginActual !== null ? `${point.marginActual.toFixed(1)}%` : "—"} / obj. {point.marginTarget.toFixed(1)}%
                  </text>

                  {/* Écart CA — uniquement si réel disponible */}
                  {delta !== null && (
                    <>
                      <line
                        x1={tooltipX + 8} x2={tooltipX + TW - 8}
                        y1={tooltipY + 96} y2={tooltipY + 96}
                        stroke="var(--color-border)" strokeOpacity={0.4}
                      />
                      <text
                        x={tooltipX + 12} y={tooltipY + 113}
                        fill={delta >= 0 ? "var(--color-success)" : "var(--color-warning)"}
                        fontSize={9} fontWeight={700} fontFamily="inherit"
                      >
                        {`Écart CA : ${formatSignedCompactEuro(delta)}`}
                      </text>
                    </>
                  )}
                </g>
              )
            })()}
          </svg>
        </div>
      </div>
    </div>
  )
}
