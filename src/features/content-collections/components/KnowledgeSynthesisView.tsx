"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { fetchKnowledgeSynthesisRawData } from "../data/content-collections-client-queries"
import {
  buildKnowledgeSynthesisOverview,
  type DocumentTypePoint,
  type KnowledgeSynthesisOverview,
} from "../domain/knowledge-synthesis-overview"

type SynthesisViewMode = "distribution" | "evolution"

function formatCompact(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value)
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function TypeDonut({
  types,
  selectedType,
  onSelect,
}: {
  types: DocumentTypePoint[]
  selectedType: DocumentTypePoint
  onSelect: (type: DocumentTypePoint) => void
}) {
  const total = Math.max(
    types.reduce((acc, t) => acc + t.count, 0),
    1,
  )
  const radius = 74
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius

  const segments = types.reduce<
    Array<{
      typePoint: DocumentTypePoint
      ratio: number
      startAngle: number
      segmentAngle: number
    }>
  >((accumulator, typePoint) => {
    const previous = accumulator[accumulator.length - 1]
    const startAngle = previous ? previous.startAngle + previous.segmentAngle : 0
    const ratio = typePoint.count / total
    const segmentAngle = ratio * 360

    accumulator.push({
      typePoint,
      ratio,
      startAngle,
      segmentAngle,
    })

    return accumulator
  }, [])

  return (
    <div className="relative mx-auto flex w-full max-w-[21rem] items-center justify-center">
      <svg viewBox="0 0 220 220" className="h-[220px] w-[220px]" role="img" aria-label="Répartition des documents par type">
        <title>Répartition par type</title>
        <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        {segments.map(({ typePoint, ratio, startAngle, segmentAngle }) => {
          if (ratio <= 0) return null
          const dashLength = circumference * ratio
          const dashOffset = circumference * (1 - startAngle / 360)
          const midAngle = startAngle + segmentAngle / 2
          const labelPoint = polarToCartesian(110, 110, radius + 24, midAngle)
          const isSelected = selectedType.typeKey === typePoint.typeKey

          return (
            <g key={typePoint.typeKey}>
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={typePoint.colorVar}
                strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                transform="rotate(-90 110 110)"
                opacity={isSelected ? 1 : 0.88}
                className="transition-all duration-200"
              />
              {ratio >= 0.08 ? (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.72)"
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(ratio * 100)}%
                </text>
              ) : null}
              <path
                d={describeArc(110, 110, radius + strokeWidth / 2 + 8, startAngle, startAngle + segmentAngle)}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
              />
            </g>
          )
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex h-[106px] w-[106px] flex-col items-center justify-center rounded-full bg-[#111735]/95 text-center shadow-[0_10px_30px_rgba(0,0,0,0.28)] border border-white/5">
          <span className="px-2 text-[10px] font-medium leading-tight text-white/60 truncate max-w-[90px]">
            {selectedType.label}
          </span>
          <span className="mt-1 text-2xl font-bold tabular-nums text-white">{selectedType.count}</span>
          <span className="text-[10px] text-white/50">{selectedType.percentage}% des docs</span>
        </div>
      </div>

      <div className="absolute inset-0">
        {segments.map(({ typePoint, ratio, startAngle, segmentAngle }) => {
          if (ratio <= 0) return null
          const midAngle = startAngle + segmentAngle / 2
          const triggerPoint = polarToCartesian(110, 110, radius + 30, midAngle)
          const isSelected = selectedType.typeKey === typePoint.typeKey

          return (
            <button
              key={`${typePoint.typeKey}-trigger`}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${typePoint.label} ${Math.round(ratio * 100)} pour cent`}
              onClick={() => onSelect(typePoint)}
              className={cn(
                "absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all cursor-pointer",
                isSelected
                  ? "border-white/30 bg-white/20"
                  : "border-transparent bg-transparent hover:border-white/14 hover:bg-white/10",
              )}
              style={{
                left: `${(triggerPoint.x / 220) * 100}%`,
                top: `${(triggerPoint.y / 220) * 100}%`,
              }}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: typePoint.colorVar }} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WeeklyProductionChart({ overview }: { overview: KnowledgeSynthesisOverview }) {
  const history = overview.weeklyHistory
  const width = 920
  const height = 300
  const paddingTop = 24
  const paddingRight = 20
  const paddingBottom = 48
  const paddingLeft = 32
  const usableHeight = height - paddingTop - paddingBottom
  const maxValue = Math.max(...history.map((h) => h.count), 1)
  const step = (width - paddingLeft - paddingRight) / Math.max(history.length, 1)
  const barWidth = Math.min(48, step * 0.5)

  return (
    <div className="flex h-full min-h-[18rem] w-full flex-col justify-center gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-white/70">Évolution de la production documentaire</span>
        <span className="text-[10px] text-white/45">8 dernières semaines</span>
      </div>

      <div className="flex flex-1 items-center overflow-hidden px-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-[14rem] w-full" role="img" aria-label="Évolution de la production documentaire dans le temps">
          <title>Évolution documentaire</title>
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + usableHeight - usableHeight * ratio
            const tick = Math.round(maxValue * ratio)
            return (
              <g key={ratio}>
                <line x1={paddingLeft} x2={width - paddingRight} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
                <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.40)">
                  {tick}
                </text>
              </g>
            )
          })}

          {history.map((point, index) => {
            const barHeight = (point.count / maxValue) * usableHeight
            const x = paddingLeft + index * step + (step - barWidth) / 2
            const y = paddingTop + usableHeight - barHeight

            return (
              <g key={point.weekKey}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  fill="var(--color-brand-brass)"
                  opacity={0.9}
                />
                {barHeight > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.min(10, barHeight)}
                    rx="6"
                    fill="rgba(255,255,255,0.25)"
                  />
                ) : null}
                <text
                  x={x + barWidth / 2}
                  y={Math.max(16, y - 6)}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="rgba(255,255,255,0.9)"
                >
                  {point.count > 0 ? point.count : ""}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.65)"
                >
                  {point.label}
                </text>
              </g>
            )
          })}

          <line x1={paddingLeft} x2={width - paddingRight} y1={height - paddingBottom} y2={height - paddingBottom} stroke="rgba(255,255,255,0.15)" />
        </svg>
      </div>
    </div>
  )
}

export function KnowledgeSynthesisView() {
  const [overview, setOverview] = useState<KnowledgeSynthesisOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeMode, setActiveMode] = useState<SynthesisViewMode>("distribution")
  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchKnowledgeSynthesisRawData().then((rawData) => {
      if (!active) return
      const ov = buildKnowledgeSynthesisOverview(rawData)
      setOverview(ov)
      if (ov.typeDistribution.length > 0) {
        setSelectedTypeKey(ov.typeDistribution[0]!.typeKey)
      }
      setIsLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  if (isLoading || !overview) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-slate-950/20">
        <div className="flex flex-col items-center gap-3">
          <span className="size-8 rounded-full border-2 border-brand-brass border-t-transparent animate-spin" />
          <p className="text-xs text-white/50">Chargement du patrimoine de connaissance…</p>
        </div>
      </div>
    )
  }

  const selectedType =
    overview.typeDistribution.find((t) => t.typeKey === selectedTypeKey) ?? overview.typeDistribution[0]!

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(201,154,43,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-5 py-5 sm:px-6">
      {/* ── 3 KPI PRINCIPAUX ───────────────────────────────────────── */}
      <div className="grid gap-3 pb-4 sm:grid-cols-3">
        <div className="rounded-[18px] bg-white/[0.03] px-4 py-3.5 border border-white/5 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-medium">Documents KREDO</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">{formatCompact(overview.totalDocuments)}</p>
          <p className="mt-0.5 text-[11px] text-brand-brass font-medium">
            +{overview.recent30DaysCount} sur les 30 derniers jours
          </p>
        </div>

        <div className="rounded-[18px] bg-white/[0.03] px-4 py-3.5 border border-white/5 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-medium">Types documentaires</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">{overview.uniqueTypeCount}</p>
          <p className="mt-0.5 text-[11px] text-white/55">familles représentées</p>
        </div>

        <div className="rounded-[18px] bg-white/[0.03] px-4 py-3.5 border border-white/5 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-medium">Taux de classement</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">{overview.classifiedPercentage}%</p>
          <p className="mt-0.5 text-[11px] text-white/55">
            {overview.classifiedDocCount} doc{overview.classifiedDocCount > 1 ? "s" : ""} rangé{overview.classifiedDocCount > 1 ? "s" : ""} dans des listes
          </p>
        </div>
      </div>

      {/* ── CARROUSEL ANALYTIQUE ───────────────────────────────────── */}
      <div className="pt-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h4 className="text-sm font-semibold text-white">
            {activeMode === "distribution" ? "Répartition des documents par type" : "Évolution & Analyse des listes"}
          </h4>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "distribution"}
              onClick={() => setActiveMode("distribution")}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold leading-none transition-colors cursor-pointer",
                activeMode === "distribution" ? "bg-white text-slate-950" : "text-white/62 hover:text-white",
              )}
            >
              Répartition
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "evolution"}
              onClick={() => setActiveMode("evolution")}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold leading-none transition-colors cursor-pointer",
                activeMode === "evolution" ? "bg-white text-slate-950" : "text-white/62 hover:text-white",
              )}
            >
              Évolution & Top
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <div
            className="flex min-h-[22rem] w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: activeMode === "distribution" ? "translateX(0%)" : "translateX(-50%)" }}
          >
            {/* SLIDE 1 — DONUT RÉPARTITION PAR TYPE */}
            <section className="w-1/2 shrink-0 pr-3">
              {overview.typeDistribution.length === 0 ? (
                <div className="flex h-full items-center justify-center p-8 text-xs text-white/50 italic">
                  Aucun document disponible pour l&apos;instant.
                </div>
              ) : (
                <div className="grid h-full gap-6 lg:grid-cols-[minmax(15rem,17rem)_minmax(18rem,1fr)] lg:items-center">
                  <TypeDonut
                    types={overview.typeDistribution}
                    selectedType={selectedType}
                    onSelect={(typePoint) => setSelectedTypeKey(typePoint.typeKey)}
                  />

                  <div className="grid gap-2 self-center max-h-[18rem] overflow-y-auto pr-1">
                    {overview.typeDistribution.map((tPoint) => {
                      const isSelected = selectedType.typeKey === tPoint.typeKey
                      return (
                        <button
                          key={tPoint.typeKey}
                          type="button"
                          onClick={() => setSelectedTypeKey(tPoint.typeKey)}
                          aria-pressed={isSelected}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-[16px] px-3.5 py-2 text-left transition-colors cursor-pointer",
                            isSelected ? "bg-white/[0.08]" : "bg-transparent hover:bg-white/[0.04]",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: tPoint.colorVar }}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 text-xs font-medium text-white truncate">{tPoint.label}</span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-white/70">
                            {tPoint.count} <span className="text-[10px] font-normal text-white/40">({tPoint.percentage}%)</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* SLIDE 2 — HISTOGRAMME ÉVOLUTION + TOP LISTES */}
            <section className="w-1/2 shrink-0 pl-3">
              <div className="grid h-full gap-5 lg:grid-cols-2 lg:items-stretch">
                <div className="flex flex-col justify-between rounded-[20px] bg-white/[0.02] p-4 border border-white/5">
                  <WeeklyProductionChart overview={overview} />
                </div>

                <div className="flex flex-col justify-between rounded-[20px] bg-white/[0.02] p-4 border border-white/5 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-white/80 mb-3">Top 5 listes par volume</h4>
                    {overview.topLists.length === 0 ? (
                      <p className="text-xs text-white/40 italic">Aucune liste contenant des documents.</p>
                    ) : (
                      <ul className="space-y-2">
                        {overview.topLists.map((list) => {
                          const maxTop = Math.max(overview.topLists[0]?.count ?? 1, 1)
                          const pct = Math.round((list.count / maxTop) * 100)
                          return (
                            <li key={list.id} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="truncate font-medium text-white/80 max-w-[160px]">{list.name}</span>
                                <span className="font-semibold tabular-nums text-white/60">{list.count} doc{list.count > 1 ? "s" : ""}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full bg-brand-brass/80 rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">Documents structurés :</span>
                      <span className="font-semibold text-white">{overview.classifiedDocCount} / {overview.totalDocuments} ({overview.classifiedPercentage}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
