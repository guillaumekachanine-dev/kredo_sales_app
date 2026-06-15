"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { HeaderKpiCard } from "@/components/missions/HeaderKpiCard"
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
    <SurfaceCard accent="primary" className="overflow-hidden rounded-xl border-border/80 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/50 px-5 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-heading font-heading">
                Trajectoire 2026
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                3 echelles superposees
              </span>
            </div>
            <p className="max-w-3xl text-xs leading-relaxed text-body">
              Suivi mensuel du CA, de la marge et de la capacite cible dans la meme lecture. Les objectifs restent traces en ligne pointillee, le proxy orange conserve son statut d&apos;approximation operationnelle.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-canvas/70 px-3 py-2 text-[11px] text-muted">
            Janvier a decembre 2026
          </div>
        </div>

        <div className="flex items-center justify-around divide-x divide-border/60 rounded-xl border border-border/70 bg-canvas/55 py-2">
          <HeaderKpiCard
            label="CA Jan-Mai"
            value={formatCompactEuro(data.summary.ytdRevenueActual)}
            className="flex-1"
            valueClassName="text-heading"
          />
          <HeaderKpiCard
            label="Ecart cible"
            value={formatSignedCompactEuro(data.summary.ytdRevenueDelta)}
            className="flex-1"
            valueClassName={data.summary.ytdRevenueDelta >= 0 ? "text-success" : "text-warning"}
          />
          <HeaderKpiCard
            label="Marge YTD"
            value={data.summary.ytdMarginActual !== null ? `${data.summary.ytdMarginActual.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : "--"}
            className="flex-1"
            valueClassName="text-heading"
          />
          <HeaderKpiCard
            label="Capacite cible"
            value={data.summary.ytdCapacityTarget.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            className="flex-1"
            valueClassName="text-heading"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {(["revenue", "capacity", "margin"] as TrajectoryGroupId[]).map((groupId) => (
              <button
                key={groupId}
                type="button"
                onClick={() => toggleGroup(groupId)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors",
                  groupEnabled(groupId)
                    ? `${GROUP_META[groupId].soft} ${GROUP_META[groupId].border} ${GROUP_META[groupId].accent}`
                    : "border-border bg-canvas text-muted"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", GROUP_META[groupId].dotClassName)} />
                {GROUP_META[groupId].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {SERIES.map((series) => (
              <button
                key={series.id}
                type="button"
                onClick={() => toggleSeries(series.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                  seriesVisibility[series.id]
                    ? `${series.softClassName} text-body`
                    : "border-border/60 bg-transparent text-muted opacity-70"
                )}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-surface"
                  style={{ backgroundColor: series.strokeVar, opacity: series.dashArray ? 0.5 : 1 }}
                />
                {series.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-3 py-4 sm:px-5">
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-canvas/75 p-3 sm:p-4">
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
                    return (
                      <circle
                        key={`${series.id}-${point.monthKey}`}
                        cx={getX(index)}
                        cy={scale(value)}
                        r={series.filled ? 3.4 : 3.1}
                        fill={series.filled ? series.strokeVar : "var(--color-surface)"}
                        fillOpacity={series.dashArray ? 0.55 : 1}
                        stroke={series.strokeVar}
                        strokeOpacity={series.dashArray ? 0.6 : 1}
                        strokeWidth={series.filled ? 1.6 : 2}
                      />
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
          </svg>
        </div>

        <div className="grid gap-2 text-[11px] text-muted lg:grid-cols-[1fr_auto] lg:items-center">
          <p className="leading-relaxed">
            Base de productivite: {data.assumptions.productivityPerActiveMonth.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} EUR par consultant actif et par mois, convertie en cible constante de {data.assumptions.capacityTarget.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} equivalents-missions. La serie orange reelle reste un proxy calcule via les missions planifiees.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-canvas px-2.5 py-1">Aout: saisonnalite basse</span>
            <span className="rounded-full border border-border bg-canvas px-2.5 py-1">Decembre: cloture et ralentissement</span>
          </div>
        </div>
      </div>
    </SurfaceCard>
  )
}
