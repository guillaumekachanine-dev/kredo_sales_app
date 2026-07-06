"use client"

import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type { PracticeMetric } from "@/lib/finance/finance-data"
import { cn } from "@/lib/utils"

interface PracticeContributionGridProps {
  metrics: PracticeMetric[]
}

const PRACTICE_COLORS = [
  "var(--color-dataviz-1)",
  "var(--color-dataviz-2)",
  "var(--color-dataviz-4)",
  "var(--color-dataviz-5)",
  "var(--color-dataviz-3)",
  "var(--color-dataviz-7)",
] as const

type PracticeContributionSlice = PracticeMetric & {
  color: string
  sharePct: number
  revenueWidthPct: number
  marginTone: "positive" | "neutral" | "negative"
}

export function PracticeContributionGrid({ metrics }: PracticeContributionGridProps) {
  const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0)
  const maxRevenue = Math.max(...metrics.map((metric) => metric.revenue), 1)
  const totalGrossMargin = metrics.reduce((sum, m) => sum + m.grossMargin, 0)
  const weightedMarginPct = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0

  const slices: PracticeContributionSlice[] = metrics.map((metric, index) => {
    const sharePct = totalRevenue > 0 ? (metric.revenue / totalRevenue) * 100 : 0
    const marginTone =
      metric.grossMarginPct >= 30 ? "positive"
      : metric.grossMarginPct >= 15 ? "neutral"
      : "negative"

    return {
      ...metric,
      color: PRACTICE_COLORS[index % PRACTICE_COLORS.length],
      sharePct,
      revenueWidthPct: Math.max(5, (metric.revenue / maxRevenue) * 100),
      marginTone,
    }
  })

  let cursor = 0
  const ringStops = slices.map((slice) => {
    const start = cursor
    cursor += slice.sharePct
    return `${slice.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`
  })
  const ringBackground =
    totalRevenue > 0 && ringStops.length > 0
      ? `conic-gradient(${ringStops.join(", ")})`
      : "var(--color-border)"

  if (metrics.length === 0) {
    return (
      <SurfaceCard padding="spacious" radius="xl" className="border-dashed text-center">
        <p className="text-sm font-semibold text-heading">Aucune contribution practice disponible</p>
        <p className="mt-1 text-xs text-muted">Les données de répartition apparaîtront après consolidation.</p>
      </SurfaceCard>
    )
  }

  return (
    <SurfaceCard
      padding="none"
      radius="xl"
      className="border-domain-finance/25 bg-surface"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--color-surface) 92%, var(--color-primary)) 0%, var(--color-surface) 48%, color-mix(in srgb, var(--color-brand-brass) 8%, var(--color-surface)) 100%)",
      }}
    >
      <div className="grid gap-6 p-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:p-6">
        <div className="flex flex-col justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Répartition du CA YTD
            </p>
            <div className="mt-3 flex items-end gap-3">
              <p className="font-heading text-4xl font-extrabold leading-none text-heading">
                {formatEuroCompact(totalRevenue)}
              </p>
              <p className="pb-1 text-xs font-medium text-body">
                {metrics.length} practice{metrics.length > 1 ? "s" : ""}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted">
              Marge brute pondérée : <span className="font-semibold text-heading">{formatPct(weightedMarginPct)}</span>
            </p>
          </div>

          <div className="relative mx-auto flex size-64 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--color-border)]"
              style={{ background: ringBackground }}
              aria-hidden="true"
            />
            <div className="absolute inset-7 rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--color-border)]" />
            <div className="relative text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Total marge</p>
              <p className="mt-1 text-2xl font-extrabold text-heading">{formatEuroCompact(totalGrossMargin)}</p>
              <p className="mt-1 text-xs font-medium text-body">brute YTD</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {slices.map((slice) => (
              <div key={slice.practice} className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="truncate font-medium text-body">{slice.practice}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {slices.map((metric, index) => (
            <div
              key={metric.practice}
              className="group rounded-2xl border border-border/70 bg-surface/70 p-4 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-surface"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(150px,0.9fr)_minmax(260px,1.4fr)_170px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-primary-fg" style={{ background: metric.color }}>
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-heading">{metric.practice}</h3>
                      <p className="text-[11px] font-medium text-muted">
                        {metric.billableDays.toFixed(0)} j facturés · {metric.consultantCount} {metric.consultantCount > 1 ? "actifs" : "actif"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
                    <span className="font-semibold uppercase tracking-[0.1em] text-muted">Part CA</span>
                    <span className="font-bold text-heading">{metric.sharePct.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-border/70">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${metric.revenueWidthPct}%`,
                        background: `linear-gradient(90deg, ${metric.color}, color-mix(in srgb, ${metric.color} 62%, var(--color-surface)))`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:text-right">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">CA YTD</p>
                    <p className="mt-0.5 text-sm font-extrabold text-heading">{formatEuroCompact(metric.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Marge</p>
                    <p
                      className={cn(
                        "mt-0.5 text-sm font-extrabold",
                        metric.marginTone === "positive" ? "text-success" : metric.marginTone === "negative" ? "text-danger" : "text-heading",
                      )}
                    >
                      {formatPct(metric.grossMarginPct)}
                    </p>
                    <p className="text-[10px] font-medium text-muted">{formatEuroCompact(metric.grossMargin)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SurfaceCard>
  )
}
