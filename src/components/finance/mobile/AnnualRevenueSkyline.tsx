"use client"

import { useId } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

export type RevenueVisualState = "actual" | "projected" | "empty"

export function revenueVisualState(
  row: FinanceMobileDashboardData["revenueByMonth"][number],
): RevenueVisualState {
  if (row.actual !== null) return "actual"
  if (row.projected !== null && row.projected > 0) return "projected"
  return "empty"
}

export function AnnualRevenueSkyline({ data }: { data: FinanceMobileDashboardData }) {
  const patternId = useId().replace(/:/g, "")
  const width = 304
  const height = 218
  const margin = { top: 18, right: 5, bottom: 26, left: 31 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const maxValue = Math.max(
    ...data.revenueByMonth.flatMap((row) => [row.actual ?? 0, row.projected ?? 0, row.target ?? 0]),
    1,
  ) * 1.12
  const slot = plotWidth / 12
  const barWidth = Math.min(15, slot * 0.68)
  const baseline = margin.top + plotHeight
  const y = (value: number) => baseline - (value / maxValue) * plotHeight
  const target = data.revenueByMonth.find((row) => row.target !== null)?.target ?? null
  const actualMonths = data.revenueByMonth.filter((row) => revenueVisualState(row) === "actual").length
  const projectedMonths = data.revenueByMonth.filter((row) => revenueVisualState(row) === "projected").length
  const chartSummary = data.revenueByMonth
    .map((row, index) => {
      const state = revenueVisualState(row)
      const value = state === "actual" ? row.actual : state === "projected" ? row.projected : null
      return value === null
        ? `${MONTH_NAMES[index]} non renseigné`
        : `${MONTH_NAMES[index]} ${formatEuroCompact(value)} ${state === "actual" ? "facturé" : "projeté"}`
    })
    .join(", ")

  return (
    <section aria-labelledby="annual-revenue-title">
      <header className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">{data.period.fiscalYear}</p>
          <h2 id="annual-revenue-title" className="font-heading text-lg font-black tracking-tight text-heading">CA facturé</h2>
        </div>
        <p className="pb-0.5 text-right text-[9px] leading-3.5 text-muted">
          <strong className="text-primary">{actualMonths} mois réels</strong><br />{projectedMonths} projetés
        </p>
      </header>

      <p id="annual-revenue-summary" className="sr-only">{chartSummary}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby="annual-revenue-title"
        aria-describedby="annual-revenue-summary"
      >
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--color-edito-surface)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-dataviz-1)" strokeOpacity="0.55" strokeWidth="2" />
          </pattern>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const value = maxValue * ratio
          const tickY = y(value)
          return (
            <g key={ratio} aria-hidden="true">
              <line x1={margin.left} x2={width - margin.right} y1={tickY} y2={tickY} stroke="var(--color-border)" strokeDasharray={ratio === 0 ? undefined : "2 5"} />
              <text x={margin.left - 4} y={tickY + 3} textAnchor="end" fill="var(--color-muted)" fontSize="7.5">
                {formatEuroCompact(value).replace(" €", "")}
              </text>
            </g>
          )
        })}

        {target !== null ? (
          <g aria-hidden="true">
            <line x1={margin.left} x2={width - margin.right} y1={y(target)} y2={y(target)} stroke="var(--color-dataviz-2)" strokeWidth="1.5" />
            <rect x={width - 42} y={Math.max(2, y(target) - 13)} width="37" height="12" rx="6" fill="var(--color-edito-surface)" />
            <text x={width - 7} y={Math.max(10, y(target) - 4)} textAnchor="end" fill="var(--color-dataviz-2)" fontSize="7.5" fontWeight="700">cible</text>
          </g>
        ) : null}

        {data.revenueByMonth.map((row, index) => {
          const state = revenueVisualState(row)
          const value = state === "actual" ? row.actual ?? 0 : state === "projected" ? row.projected ?? 0 : 0
          const x = margin.left + index * slot + (slot - barWidth) / 2
          const top = y(value)
          return (
            <g key={row.month} aria-hidden="true">
              {value > 0 ? (
                <rect
                  x={x}
                  y={top}
                  width={barWidth}
                  height={baseline - top}
                  rx="2.5"
                  fill={state === "projected" ? `url(#${patternId})` : "var(--color-dataviz-1)"}
                  stroke={state === "projected" ? "var(--color-dataviz-1)" : "none"}
                  strokeDasharray={state === "projected" ? "3 2" : undefined}
                />
              ) : (
                <line x1={x + 2} x2={x + barWidth - 2} y1={baseline - 1} y2={baseline - 1} stroke="var(--color-muted)" />
              )}
              <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontWeight="650">
                {MONTHS[index]}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-1 flex items-center gap-4 text-[9px] font-medium text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-[2px] bg-dataviz-1" />Facturé</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-[2px] border border-dashed border-dataviz-1 bg-surface" />Projection</span>
        {target !== null ? <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-3 bg-dataviz-2" />Cible</span> : null}
      </div>

      <table className="sr-only">
        <caption>Détail mensuel du chiffre d’affaires</caption>
        <thead><tr><th>Mois</th><th>Réalisé</th><th>Projeté</th><th>Cible</th></tr></thead>
        <tbody>{data.revenueByMonth.map((row, index) => <tr key={row.month}><th>{MONTH_NAMES[index]}</th><td>{formatEuroCompact(row.actual)}</td><td>{formatEuroCompact(row.projected)}</td><td>{formatEuroCompact(row.target)}</td></tr>)}</tbody>
      </table>
    </section>
  )
}
