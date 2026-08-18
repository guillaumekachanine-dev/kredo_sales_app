"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  buildSourceManagementOverview,
  type CategoryOverviewPoint,
  type CorpusOverviewPoint,
} from "../domain/source-management-overview"
import type { SourceManagementSnapshot } from "../domain/source-management-contracts"

interface SourceManagementSynthesisViewProps {
  snapshot: SourceManagementSnapshot
}

type SynthesisViewMode = "categories" | "corpora"

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

function CategoryDonut({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: CategoryOverviewPoint[]
  selectedCategory: CategoryOverviewPoint
  onSelect: (category: CategoryOverviewPoint) => void
}) {
  const total = Math.max(
    categories.reduce((acc, cat) => acc + cat.count, 0),
    1,
  )
  const radius = 74
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius

  const segments = categories.reduce<
    Array<{
      category: CategoryOverviewPoint
      ratio: number
      startAngle: number
      segmentAngle: number
    }>
  >((accumulator, category) => {
    const previous = accumulator[accumulator.length - 1]
    const startAngle = previous ? previous.startAngle + previous.segmentAngle : 0
    const ratio = category.count / total
    const segmentAngle = ratio * 360

    accumulator.push({
      category,
      ratio,
      startAngle,
      segmentAngle,
    })

    return accumulator
  }, [])

  return (
    <div className="relative mx-auto flex w-full max-w-[21rem] items-center justify-center">
      <svg viewBox="0 0 220 220" className="h-[220px] w-[220px]" role="img" aria-label="Répartition des sources par catégorie KREDO">
        <title>Répartition par catégorie</title>
        <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        {segments.map(({ category, ratio, startAngle, segmentAngle }) => {
          if (ratio <= 0) return null
          const dashLength = circumference * ratio
          const dashOffset = circumference * (1 - startAngle / 360)
          const midAngle = startAngle + segmentAngle / 2
          const labelPoint = polarToCartesian(110, 110, radius + 24, midAngle)
          const isSelected = selectedCategory.categoryKey === category.categoryKey

          return (
            <g key={category.categoryKey}>
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={category.colorVar}
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
          <span className="px-2.5 text-[10px] font-medium leading-tight text-white/60 truncate max-w-[90px]">
            {selectedCategory.label}
          </span>
          <span className="mt-1 text-2xl font-bold tabular-nums text-white">{selectedCategory.count}</span>
          <span className="text-[10px] text-white/50">sources ({selectedCategory.activeCount} act.)</span>
        </div>
      </div>

      <div className="absolute inset-0">
        {segments.map(({ category, ratio, startAngle, segmentAngle }) => {
          if (ratio <= 0) return null
          const midAngle = startAngle + segmentAngle / 2
          const triggerPoint = polarToCartesian(110, 110, radius + 30, midAngle)
          const isSelected = selectedCategory.categoryKey === category.categoryKey

          return (
            <button
              key={`${category.categoryKey}-trigger`}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${category.label} ${Math.round(ratio * 100)} pour cent`}
              onClick={() => onSelect(category)}
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
              <span className="size-2.5 rounded-full" style={{ backgroundColor: category.colorVar }} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CorpusActivityChart({ corpora }: { corpora: CorpusOverviewPoint[] }) {
  if (corpora.length === 0) {
    return (
      <div className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/50">
        <p className="font-semibold text-white/70">Aucun corpus sectoriel importé</p>
        <p className="mt-1 max-w-sm text-[11px]">
          Utilisez la commande « + Corpus » dans le header pour charger un registre de sources MASTER-STUDY / E3.
        </p>
      </div>
    )
  }

  const width = 920
  const height = 340
  const paddingTop = 24
  const paddingRight = 20
  const paddingBottom = 54
  const paddingLeft = 32
  const usableHeight = height - paddingTop - paddingBottom
  const maxValue = Math.max(...corpora.map((c) => c.totalSources), 1)
  const step = (width - paddingLeft - paddingRight) / corpora.length
  const barWidth = Math.min(48, step * 0.6)

  return (
    <div className="flex h-full min-h-[22rem] w-full flex-col justify-center gap-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-white/60">Volume et activation par corpus</span>
        <div className="flex items-center gap-4 text-[10px] text-white/50">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-[var(--color-brand-brass)]" /> Sources actives
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-white/15 border border-white/20" /> Inactives
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center overflow-hidden px-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-[17rem] w-full" role="img" aria-label="Volume des sources par corpus sectoriel">
          <title>Sources par corpus</title>

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

          {corpora.map((corpus, index) => {
            const totalHeight = (corpus.totalSources / maxValue) * usableHeight
            const activeHeight = (corpus.activeSources / maxValue) * usableHeight
            const x = paddingLeft + index * step + (step - barWidth) / 2
            const yTotal = paddingTop + usableHeight - totalHeight
            const yActive = paddingTop + usableHeight - activeHeight

            return (
              <g key={corpus.id}>
                {/* Total bar (background) */}
                <rect
                  x={x}
                  y={yTotal}
                  width={barWidth}
                  height={totalHeight}
                  rx="8"
                  fill="rgba(255,255,255,0.12)"
                />
                {/* Active bar (foreground overlay) */}
                <rect
                  x={x}
                  y={yActive}
                  width={barWidth}
                  height={activeHeight}
                  rx="8"
                  fill="var(--color-brand-brass)"
                  opacity={0.92}
                />
                {/* Highlight line on active bar top */}
                {activeHeight > 0 ? (
                  <rect
                    x={x}
                    y={yActive}
                    width={barWidth}
                    height={Math.min(14, activeHeight)}
                    rx="8"
                    fill="rgba(255,255,255,0.22)"
                  />
                ) : null}
                {/* Value count above bar */}
                <text
                  x={x + barWidth / 2}
                  y={Math.max(16, yTotal - 8)}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="rgba(255,255,255,0.90)"
                >
                  {corpus.activeSources}/{corpus.totalSources}
                </text>
                {/* Label below bar */}
                <text
                  x={x + barWidth / 2}
                  y={height - paddingBottom + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.65)"
                >
                  {corpus.name.length > 18 ? `${corpus.name.slice(0, 16)}…` : corpus.name}
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

export function SourceManagementSynthesisView({ snapshot }: SourceManagementSynthesisViewProps) {
  const overview = buildSourceManagementOverview(snapshot)
  const [activeMode, setActiveMode] = useState<SynthesisViewMode>("categories")

  const defaultCategory = overview.categoryDistribution.find((c) => c.count > 0) ?? overview.categoryDistribution[0]!
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(defaultCategory.categoryKey)

  const selectedCategory =
    overview.categoryDistribution.find((c) => c.categoryKey === selectedCategoryKey) ?? defaultCategory

  const activePercent = overview.uniqueSourceCount > 0
    ? Math.round((overview.activeSourceCount / overview.uniqueSourceCount) * 100)
    : 0

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(201,154,43,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-5 py-5 sm:px-6">
      {/* ── 3 KPI MAXIMUM ─────────────────────────────────────────── */}
      <div className="grid gap-2.5 pb-5 sm:grid-cols-3">
        <div className="rounded-[18px] bg-white/[0.03] px-4 py-3 border border-white/5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42 font-medium">Sources disponibles</p>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-white">{formatCompact(overview.uniqueSourceCount)}</p>
          <p className="mt-0.5 text-[11px] text-white/55">{overview.activeSourceCount} actives dans le socle</p>
        </div>

        <div className="rounded-[18px] bg-white/[0.03] px-4 py-3 border border-white/5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42 font-medium">Sources actives</p>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-white">{formatCompact(overview.activeSourceCount)}</p>
          <p className="mt-0.5 text-[11px] text-brand-brass font-medium">{activePercent}% de couverture active</p>
        </div>

        <div className="rounded-[18px] bg-white/[0.03] px-4 py-3 border border-white/5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42 font-medium">Corpus sectoriels</p>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-white">{formatCompact(overview.corpusCount)}</p>
          <p className="mt-0.5 text-[11px] text-white/55">{overview.activeCorpusCount} corpus actif(s)</p>
        </div>
      </div>

      {/* ── SEGMENTED CONTROL & CAROUSEL SECTION ─────────────────── */}
      <div className="border-t border-white/8 py-5">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-semibold text-white">
            {activeMode === "categories" ? "Répartition des sources" : "Activité des corpus"}
          </h4>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5">
            <button
              type="button"
              aria-pressed={activeMode === "categories"}
              onClick={() => setActiveMode("categories")}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold leading-none transition-colors cursor-pointer",
                activeMode === "categories" ? "bg-white text-slate-950" : "text-white/62 hover:text-white",
              )}
            >
              Répartition
            </button>
            <button
              type="button"
              aria-pressed={activeMode === "corpora"}
              onClick={() => setActiveMode("corpora")}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold leading-none transition-colors cursor-pointer",
                activeMode === "corpora" ? "bg-white text-slate-950" : "text-white/62 hover:text-white",
              )}
            >
              Corpus
            </button>
          </div>
        </div>

        <div className="relative mt-5 overflow-hidden">
          <div
            className="flex min-h-[24rem] w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: activeMode === "categories" ? "translateX(0%)" : "translateX(-50%)" }}
          >
            {/* SLIDE 1 — REPARTITION PAR CATEGORIE (DONUT) */}
            <section className="w-1/2 shrink-0 pr-4">
              <div className="grid h-full gap-6 lg:grid-cols-[minmax(15rem,17rem)_minmax(18rem,1fr)] lg:items-center">
                <CategoryDonut
                  categories={overview.categoryDistribution}
                  selectedCategory={selectedCategory}
                  onSelect={(category) => setSelectedCategoryKey(category.categoryKey)}
                />

                <div className="grid gap-2 self-center">
                  {overview.categoryDistribution.map((category) => {
                    const isSelected = selectedCategory.categoryKey === category.categoryKey
                    return (
                      <button
                        key={category.categoryKey}
                        type="button"
                        onClick={() => setSelectedCategoryKey(category.categoryKey)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-[16px] px-3.5 py-2 text-left transition-colors cursor-pointer",
                          isSelected ? "bg-white/[0.08]" : "bg-transparent hover:bg-white/[0.04]",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: category.colorVar }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 text-xs font-medium text-white truncate">{category.label}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-white/70">
                          {category.count} <span className="text-[10px] font-normal text-white/40">({category.percentage}%)</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* SLIDE 2 — HISTOGRAMME SVG CORPUS */}
            <section className="w-1/2 shrink-0 pl-4">
              <div className="flex h-full items-center rounded-[20px] bg-white/[0.02] p-4 border border-white/5">
                <CorpusActivityChart corpora={overview.corpusActivity} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
