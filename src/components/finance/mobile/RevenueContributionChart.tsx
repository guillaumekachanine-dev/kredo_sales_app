"use client"

import { useId, useState } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import type { FinanceDistribution, FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"
import { cn } from "@/lib/utils"

export type ContributionMode = "clients" | "practices"

export type ContributionItem = {
  id: string
  label: string
  amount: number
  sharePct: number
}

export const CONTRIBUTION_MODES: ReadonlyArray<readonly [ContributionMode, string]> = [
  ["clients", "Clients"],
  ["practices", "Practices"],
]

const COLOR_TOKENS = [
  "var(--color-dataviz-1)",
  "var(--color-dataviz-2)",
  "var(--color-dataviz-3)",
  "var(--color-dataviz-4)",
  "var(--color-dataviz-5)",
  "var(--color-dataviz-6)",
  "var(--color-dataviz-7)",
] as const

export function buildContributionItems(
  distribution: FinanceDistribution,
  mode: ContributionMode,
): ContributionItem[] {
  const assigned = distribution.items.filter((item) => item.id !== "non-attribue" && item.amount > 0)
  const unassigned = distribution.items.find((item) => item.id === "non-attribue")
  let visible = assigned

  if (mode === "clients" && assigned.length > 5) {
    const top = assigned.slice(0, 5)
    const rest = assigned.slice(5)
    const otherAmount = rest.reduce((sum, item) => sum + item.amount, 0)
    visible = [
      ...top,
      {
        id: "autres",
        label: "Autres",
        amount: otherAmount,
        sharePct: distribution.totalAmount > 0 ? (otherAmount / distribution.totalAmount) * 100 : 0,
      },
    ]
  }

  if (unassigned && unassigned.amount > 0) {
    visible = [...visible, { ...unassigned, label: "Non attribué" }]
  }

  return visible
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

export function pieSlicePath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  if (endAngle - startAngle >= Math.PI * 2 - Number.EPSILON) {
    const top = polarPoint(cx, cy, radius, -Math.PI / 2)
    const bottom = polarPoint(cx, cy, radius, Math.PI / 2)
    return `M ${top.x} ${top.y} A ${radius} ${radius} 0 1 1 ${bottom.x} ${bottom.y} A ${radius} ${radius} 0 1 1 ${top.x} ${top.y} Z`
  }
  const start = polarPoint(cx, cy, radius, startAngle)
  const end = polarPoint(cx, cy, radius, endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

function buildPieSlices(items: ContributionItem[], total: number) {
  let angle = -Math.PI / 2
  return items.map((item, index) => {
    const startAngle = angle
    const endAngle = angle + (item.amount / total) * Math.PI * 2
    angle = endAngle
    return { item, index, path: pieSlicePath(76, 76, 62, startAngle, endAngle) }
  })
}

export function RevenueContributionChart({ data }: { data: FinanceMobileDashboardData }) {
  const [mode, setMode] = useState<ContributionMode>("clients")
  const patternId = useId().replace(/:/g, "")
  const distribution = data.distributions[mode]
  const items = buildContributionItems(distribution, mode)
  const total = Math.max(distribution.totalAmount, 1)
  const modeLabel = CONTRIBUTION_MODES.find(([value]) => value === mode)?.[1] ?? mode
  const slices = buildPieSlices(items, total)

  return (
    <section aria-labelledby="revenue-contribution-title">
      <header className="mb-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">CA facturé</p>
        <h2 id="revenue-contribution-title" className="font-heading text-lg font-black tracking-tight text-heading">Structure du CA</h2>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-1 rounded-[var(--radius-small)] bg-canvas p-1" role="group" aria-label="Dimension de contribution">
        {CONTRIBUTION_MODES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "min-h-11 rounded-[var(--radius-small)] px-3 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none",
              mode === value ? "bg-primary text-primary-fg" : "text-body hover:bg-surface-hover",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-medium)] border border-dashed border-border px-3 py-8 text-center text-xs text-muted">Aucune contribution attribuable.</p>
      ) : (
        <>
          <div className="grid grid-cols-[146px_minmax(0,1fr)] items-center gap-3">
            <svg
              viewBox="0 0 152 152"
              className="size-[146px]"
              role="img"
              aria-labelledby="revenue-contribution-title-svg revenue-contribution-summary"
            >
              <title id="revenue-contribution-title-svg">Répartition du chiffre d’affaires par {modeLabel}</title>
              <defs>
                <pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="7" height="7" fill="var(--color-edito-canvas)" />
                  <line x1="0" y1="0" x2="0" y2="7" stroke="var(--color-muted)" strokeOpacity="0.55" strokeWidth="2" />
                </pattern>
              </defs>
              <circle cx="76" cy="76" r="63" fill="var(--color-edito-canvas)" />
              {slices.map(({ item, index, path }) => (
                <path
                  key={item.id}
                  d={path}
                  fill={item.id === "non-attribue" ? `url(#${patternId})` : COLOR_TOKENS[index % COLOR_TOKENS.length]}
                  stroke="var(--color-edito-surface)"
                  strokeWidth="2"
                />
              ))}
            </svg>

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Total officiel</p>
              <p className="mt-1 font-heading text-xl font-black tracking-tight text-heading">{formatEuroCompact(distribution.totalAmount)}</p>
              <p className="mt-2 text-[9px] leading-4 text-muted">Le non attribué reste séparé et n’est jamais redistribué.</p>
            </div>
          </div>

          <div className="mt-3 divide-y divide-border" aria-live="polite">
            {items.map((item, index) => {
              const unassigned = item.id === "non-attribue"
              return (
                <div key={item.id} className="grid min-h-8 grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 py-1.5">
                  <span
                    className={cn("size-2 rounded-full", unassigned && "border border-muted bg-canvas")}
                    style={unassigned ? undefined : { backgroundColor: COLOR_TOKENS[index % COLOR_TOKENS.length] }}
                    aria-hidden="true"
                  />
                  <p className="min-w-0 truncate text-[10px] font-semibold text-heading">{item.label}</p>
                  <p className="whitespace-nowrap text-right font-mono text-[9px] font-bold text-heading">
                    {formatEuroCompact(item.amount)} · {item.sharePct.toFixed(1)}%
                  </p>
                </div>
              )
            })}
          </div>
        </>
      )}

      <p id="revenue-contribution-summary" className="sr-only">
        Répartition par {modeLabel} : {items.map((item) => `${item.label}, ${formatEuroCompact(item.amount)}, ${item.sharePct.toFixed(1)} pour cent`).join(" ; ")}.
      </p>
      <table className="sr-only"><caption>Structure du CA par {modeLabel}</caption><thead><tr><th>Catégorie</th><th>Montant</th><th>Part</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><th>{item.label}</th><td>{formatEuroCompact(item.amount)}</td><td>{item.sharePct.toFixed(1)}%</td></tr>)}</tbody></table>
    </section>
  )
}
