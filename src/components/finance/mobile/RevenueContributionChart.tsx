"use client"

import { useState } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import type { FinanceDistribution, FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"
import { cn } from "@/lib/utils"

type ContributionMode = "clients" | "practices" | "engagements"

type ContributionItem = {
  id: string
  label: string
  amount: number
  sharePct: number
}

const MODES: ReadonlyArray<readonly [ContributionMode, string]> = [
  ["clients", "Clients"],
  ["practices", "Practices"],
  ["engagements", "Engagement"],
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

  if (mode === "engagements") {
    visible = visible.map((item) => ({
      ...item,
      label: item.id === "assistance_technique" ? "Assistance technique" : item.id === "forfait" ? "Forfait" : item.label,
    }))
  }

  if (unassigned && unassigned.amount > 0) {
    visible = [
      ...visible,
      {
        ...unassigned,
        label: mode === "engagements" ? "Non classé" : "Non attribué",
      },
    ]
  }

  return visible
}

export function RevenueContributionChart({ data }: { data: FinanceMobileDashboardData }) {
  const [mode, setMode] = useState<ContributionMode>("clients")
  const distribution = data.distributions[mode]
  const items = buildContributionItems(distribution, mode)
  const maxAmount = Math.max(...items.map((item) => item.amount), 1)
  const modeLabel = MODES.find(([value]) => value === mode)?.[1] ?? mode

  return (
    <section aria-labelledby="revenue-contribution-title" className="space-y-4">
      <div>
        <h3 id="revenue-contribution-title" className="font-heading text-base font-black text-heading">Structure du CA</h3>
        <p className="mt-1 text-[10px] leading-4 text-muted">Répartition du CA facturé. Le Non attribué n’est jamais redistribué.</p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-[var(--radius-medium)] border border-border bg-canvas p-1" role="group" aria-label="Dimension de contribution">
        {MODES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "min-h-11 rounded-[var(--radius-small)] px-2 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none",
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
          <div>
            <div className="flex h-4 overflow-hidden rounded-[var(--radius-small)] border border-border bg-canvas" aria-hidden="true">
              {items.map((item, index) => {
                const unassigned = item.id === "non-attribue"
                return (
                  <span
                    key={item.id}
                    className="h-full border-r border-surface last:border-r-0"
                    style={{
                      width: `${item.sharePct}%`,
                      backgroundColor: unassigned ? "var(--color-surface-raised)" : COLOR_TOKENS[index % COLOR_TOKENS.length],
                      backgroundImage: unassigned
                        ? "repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--color-muted) 45%, transparent) 4px 6px)"
                        : undefined,
                    }}
                  />
                )
              })}
            </div>
            <p className="mt-1.5 text-[9px] text-muted">100 % du total officiel · {formatEuroCompact(distribution.totalAmount)}</p>
          </div>

          <div className="space-y-3" aria-live="polite">
            {items.map((item, index) => {
              const unassigned = item.id === "non-attribue"
              const color = unassigned ? "var(--color-muted)" : COLOR_TOKENS[index % COLOR_TOKENS.length]
              return (
                <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">
                  <p className="min-w-0 break-words text-[11px] font-semibold leading-4 text-heading">{item.label}</p>
                  <p className="text-right font-mono text-[10px] font-bold text-heading">{formatEuroCompact(item.amount)} · {item.sharePct.toFixed(1)}%</p>
                  <div className="relative col-span-2 h-3" aria-hidden="true">
                    <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                    <span
                      className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2"
                      style={{ width: `${Math.max(1, (item.amount / maxAmount) * 100)}%`, backgroundColor: color }}
                    />
                    <span
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                      style={{ left: `${Math.max(1, (item.amount / maxAmount) * 100)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <p className="sr-only">
        Répartition par {modeLabel} : {items.map((item) => `${item.label}, ${formatEuroCompact(item.amount)}, ${item.sharePct.toFixed(1)} pour cent`).join(" ; ")}.
      </p>
      <table className="sr-only"><caption>Structure du CA par {modeLabel}</caption><thead><tr><th>Catégorie</th><th>Montant</th><th>Part</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><th>{item.label}</th><td>{formatEuroCompact(item.amount)}</td><td>{item.sharePct.toFixed(1)}%</td></tr>)}</tbody></table>
    </section>
  )
}
