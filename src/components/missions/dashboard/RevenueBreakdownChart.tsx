"use client"

import { useState } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { RevenueBreakdownItem } from "./engagements-overview-types"

interface RevenueBreakdownChartProps {
  byPractice: RevenueBreakdownItem[]
  byClient: RevenueBreakdownItem[]
  embedded?: boolean
}

const BREAKDOWN_MODES = ["practice", "client"] as const

export function RevenueBreakdownChart({
  byPractice,
  byClient,
  embedded = false,
}: RevenueBreakdownChartProps) {
  const [mode, setMode] = useState<"practice" | "client">("practice")
  const items = mode === "practice" ? byPractice : byClient
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-bold text-heading">Répartition du CA</h2>
          <p className="mt-0.5 text-[10px] text-muted">Même périmètre que le CA réalisé</p>
        </div>
        <div className="inline-flex rounded-[var(--radius-medium)] border border-border bg-canvas p-0.5" role="group" aria-label="Ventiler le chiffre d’affaires">
          {BREAKDOWN_MODES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={cn(
                "min-h-9 rounded-[var(--radius-small)] px-2.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transition-none md:min-h-8",
                mode === value ? "bg-surface text-primary" : "text-muted hover:text-heading",
              )}
            >
              Par {value === "practice" ? "practice" : "client"}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-center text-xs text-muted">
          Aucun CA réalisé à répartir.
        </div>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center gap-2.5" aria-live="polite">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <span className={cn("text-[11px] font-semibold text-heading", embedded ? "break-words" : "truncate")} title={item.label}>{item.label}</span>
                <span className="shrink-0 font-mono text-[10px] text-body">{item.percentage.toFixed(1)}%</span>
              </div>
              <span className="row-span-2 min-w-[58px] text-right font-mono text-[11px] font-bold text-heading">
                {formatEuroCompact(item.value)}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(2, (item.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  if (embedded) return <div className="flex min-h-0 flex-col">{content}</div>
  return (
    <section className="col-span-5 flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface p-4" aria-label="Répartition du chiffre d’affaires">
      {content}
    </section>
  )
}
