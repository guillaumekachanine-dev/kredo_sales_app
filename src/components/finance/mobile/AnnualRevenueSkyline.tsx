"use client"

import { useId, useState } from "react"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"
import { cn } from "@/lib/utils"

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]

export function AnnualRevenueSkyline({ data }: { data: FinanceMobileDashboardData }) {
  const defaultIndex = Math.max(
    0,
    data.revenueByMonth.findIndex((row) => row.month === data.period.actualThrough),
  )
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex)
  const patternId = useId().replace(/:/g, "")
  const selected = data.revenueByMonth[selectedIndex]
  const selectedRevenue = selected.actual ?? selected.projected
  const variance =
    selectedRevenue !== null && selected.target !== null
      ? selectedRevenue - selected.target
      : null

  const width = 360
  const height = 224
  const margin = { top: 20, right: 8, bottom: 30, left: 36 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const maxValue = Math.max(
    ...data.revenueByMonth.flatMap((row) => [row.actual ?? 0, row.projected ?? 0, row.target ?? 0]),
    1,
  ) * 1.12
  const slot = plotWidth / 12
  const barWidth = Math.min(18, slot * 0.68)
  const baseline = margin.top + plotHeight
  const y = (value: number) => baseline - (value / maxValue) * plotHeight
  const target = data.revenueByMonth.find((row) => row.target !== null)?.target ?? null
  const chartSummary = data.revenueByMonth
    .map((row, index) => {
      const value = row.actual ?? row.projected
      if (value === null) return `${MONTHS[index]} non renseigné`
      return `${MONTHS[index]} ${formatEuroCompact(value)} ${row.actual !== null ? "réalisé" : "projeté"}`
    })
    .join(", ")

  return (
    <section aria-labelledby="annual-revenue-title" className="space-y-4">
      <div>
        <h3 id="annual-revenue-title" className="font-heading text-base font-black text-heading">
          CA mensuel · {data.period.fiscalYear}
        </h3>
        <p className="mt-1 text-[10px] leading-4 text-muted">
          Cobalt plein = facturé. Contour hachuré = projection, jamais assimilée au réalisé.
        </p>
      </div>

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
            <rect width="6" height="6" fill="var(--color-surface-raised)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-primary)" strokeOpacity="0.42" strokeWidth="2" />
          </pattern>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const value = maxValue * ratio
          const tickY = y(value)
          return (
            <g key={ratio} aria-hidden="true">
              <line x1={margin.left} x2={width - margin.right} y1={tickY} y2={tickY} stroke="var(--color-border)" strokeDasharray={ratio === 0 ? undefined : "2 5"} />
              <text x={margin.left - 5} y={tickY + 3} textAnchor="end" fill="var(--color-muted)" fontSize="8">
                {formatEuroCompact(value).replace(" €", "")}
              </text>
            </g>
          )
        })}

        {target !== null ? (
          <g aria-hidden="true">
            <line x1={margin.left} x2={width - margin.right} y1={y(target)} y2={y(target)} stroke="var(--color-brand-brass)" strokeWidth="1.5" />
            <text x={width - margin.right} y={Math.max(9, y(target) - 4)} textAnchor="end" fill="var(--color-brand-brass)" fontSize="8" fontWeight="700">
              rythme cible
            </text>
          </g>
        ) : null}

        {data.revenueByMonth.map((row, index) => {
          const value = row.actual ?? row.projected ?? 0
          const x = margin.left + index * slot + (slot - barWidth) / 2
          const top = y(value)
          const projected = row.actual === null && row.projected !== null
          return (
            <g key={row.month} aria-hidden="true">
              {selectedIndex === index ? (
                <rect x={x - 3} y={margin.top - 3} width={barWidth + 6} height={plotHeight + 6} rx="3" fill="none" stroke="var(--color-heading)" strokeOpacity="0.2" />
              ) : null}
              {value > 0 ? (
                <rect
                  x={x}
                  y={top}
                  width={barWidth}
                  height={baseline - top}
                  rx="2"
                  fill={projected ? `url(#${patternId})` : "var(--color-primary)"}
                  stroke={projected ? "var(--color-primary)" : "none"}
                  strokeDasharray={projected ? "3 2" : undefined}
                />
              ) : (
                <line x1={x + 3} x2={x + barWidth - 3} y1={baseline - 1} y2={baseline - 1} stroke="var(--color-muted)" />
              )}
              <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontWeight="600">
                {MONTHS[index].slice(0, 1)}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="grid grid-cols-6 gap-1.5" aria-label="Sélectionner un mois">
        {MONTHS.map((month, index) => (
          <button
            key={month}
            type="button"
            onClick={() => setSelectedIndex(index)}
            aria-pressed={selectedIndex === index}
            className={cn(
              "min-h-11 rounded-[var(--radius-small)] border px-1 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none",
              selectedIndex === index
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-surface text-body hover:bg-surface-hover",
            )}
          >
            {month}
          </button>
        ))}
      </div>

      <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-3" aria-live="polite">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted">{MONTHS[selectedIndex]}</p>
            <p className="mt-1 font-heading text-xl font-black text-heading">{formatEuroCompact(selectedRevenue)}</p>
            <p className="mt-1 text-[10px] font-semibold text-primary">
              {selected.actual !== null ? "Facturé" : selected.projected !== null ? "Projeté" : "Non renseigné"}
            </p>
          </div>
          <dl className="space-y-1 text-right text-[10px]">
            <div><dt className="inline text-muted">Écart rythme </dt><dd className={cn("inline font-bold", variance !== null && variance < 0 ? "text-danger" : "text-success")}>{variance === null ? "—" : `${variance >= 0 ? "+" : ""}${formatEuroCompact(variance)}`}</dd></div>
            <div><dt className="inline text-muted">Marge </dt><dd className="inline font-bold text-heading">{formatPct(selected.grossMarginPct, 1)}</dd></div>
          </dl>
        </div>
        {selected.actual === null && selected.projected !== null ? (
          <p className="mt-2 border-t border-border pt-2 text-[9px] leading-4 text-muted">Marge non affichée : aucune marge réelle n’est déduite d’une projection de production.</p>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>Détail mensuel du chiffre d’affaires</caption>
        <thead><tr><th>Mois</th><th>Réalisé</th><th>Projeté</th><th>Cible</th><th>Marge</th></tr></thead>
        <tbody>{data.revenueByMonth.map((row, index) => <tr key={row.month}><th>{MONTHS[index]}</th><td>{formatEuroCompact(row.actual)}</td><td>{formatEuroCompact(row.projected)}</td><td>{formatEuroCompact(row.target)}</td><td>{formatPct(row.grossMarginPct)}</td></tr>)}</tbody>
      </table>
    </section>
  )
}
