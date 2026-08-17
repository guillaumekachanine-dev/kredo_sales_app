"use client"

import { useId } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import type { FinanceMobileDashboardData, FinanceQuarterAmount } from "@/lib/finance/finance-mobile-model"
import { cn } from "@/lib/utils"

type QuarterKey = "q1" | "q2" | "q3" | "q4"

type QuarterlyGridRow = {
  id: string
  label: string
  quarters: Record<QuarterKey, FinanceQuarterAmount>
  activityWarnings: Set<QuarterKey>
  overdueWarnings: Set<QuarterKey>
}

const QUARTERS: ReadonlyArray<readonly [QuarterKey, string]> = [
  ["q1", "Q1"],
  ["q2", "Q2"],
  ["q3", "Q3"],
  ["q4", "Q4P"],
]

function emptyQuarter(): FinanceQuarterAmount {
  return { actual: 0, projected: 0 }
}

function quarterFromMonth(month: string): QuarterKey {
  const value = Number(month.slice(5, 7))
  if (value <= 3) return "q1"
  if (value <= 6) return "q2"
  if (value <= 9) return "q3"
  return "q4"
}

function rowTotal(row: FinanceMobileDashboardData["productionByClient"][number]): number {
  return Object.values(row.quarters).reduce((sum, quarter) => sum + quarter.actual + quarter.projected, 0)
}

export function buildQuarterlyGridRows(data: FinanceMobileDashboardData): QuarterlyGridRow[] {
  const warningByClient = new Map<string, Set<QuarterKey>>()
  const overdueByClient = new Map<string, Set<QuarterKey>>()
  for (const risk of data.risksAndGaps) {
    if (!risk.context?.clientId || !risk.context.month) continue
    if (risk.kind === "activity") {
      const warnings = warningByClient.get(risk.context.clientId) ?? new Set<QuarterKey>()
      warnings.add(quarterFromMonth(risk.context.month))
      warningByClient.set(risk.context.clientId, warnings)
    }
    if (risk.kind === "mission-ending" && risk.severity === "critical") {
      const warnings = overdueByClient.get(risk.context.clientId) ?? new Set<QuarterKey>()
      warnings.add(quarterFromMonth(risk.context.month))
      overdueByClient.set(risk.context.clientId, warnings)
    }
  }

  const sorted = [...data.productionByClient].sort((a, b) => rowTotal(b) - rowTotal(a))
  const top = sorted.slice(0, 5).map((row) => ({
    id: row.clientId ?? "non-attribue",
    label: row.clientName,
    quarters: row.quarters,
    activityWarnings: row.clientId ? warningByClient.get(row.clientId) ?? new Set<QuarterKey>() : new Set<QuarterKey>(),
    overdueWarnings: row.clientId ? overdueByClient.get(row.clientId) ?? new Set<QuarterKey>() : new Set<QuarterKey>(),
  }))
  const rest = sorted.slice(5)

  if (rest.length === 0) return top

  const other: QuarterlyGridRow = {
    id: "autres",
    label: "Autres",
    quarters: { q1: emptyQuarter(), q2: emptyQuarter(), q3: emptyQuarter(), q4: emptyQuarter() },
    activityWarnings: new Set<QuarterKey>(),
    overdueWarnings: new Set<QuarterKey>(),
  }
  for (const row of rest) {
    for (const [quarter] of QUARTERS) {
      other.quarters[quarter].actual += row.quarters[quarter].actual
      other.quarters[quarter].projected += row.quarters[quarter].projected
    }
    if (row.clientId) {
      for (const warning of warningByClient.get(row.clientId) ?? []) other.activityWarnings.add(warning)
      for (const warning of overdueByClient.get(row.clientId) ?? []) other.overdueWarnings.add(warning)
    }
  }
  return [...top, other]
}

export function QuarterlyProductionGrid({ data }: { data: FinanceMobileDashboardData }) {
  const patternId = useId().replace(/:/g, "")
  const rows = buildQuarterlyGridRows(data)
  const max = Math.max(
    ...rows.flatMap((row) => Object.values(row.quarters).map((quarter) => quarter.actual + quarter.projected)),
    1,
  )

  return (
    <section aria-labelledby="quarterly-production-title" className="space-y-4">
      <div>
        <h3 id="quarterly-production-title" className="font-heading text-base font-black text-heading">Production annuelle</h3>
        <p className="mt-1 text-[10px] leading-4 text-muted">Top clients · intensité trimestrielle. Le motif signale toute production projetée.</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-medium)] border border-dashed border-border px-3 py-8 text-center text-xs text-muted">Aucune production disponible.</p>
      ) : (
        <div className="w-full" role="grid" aria-label="Production trimestrielle par client">
          <div className="grid grid-cols-[76px_repeat(4,minmax(0,1fr))] gap-1" role="row">
            <span role="columnheader" className="self-end pb-1 text-[8px] font-bold uppercase tracking-[0.1em] text-muted">Client</span>
            {QUARTERS.map(([, label]) => <span key={label} role="columnheader" className="pb-1 text-center text-[9px] font-black text-heading">{label}</span>)}
          </div>

          <div className="space-y-1.5">
            {rows.map((row) => {
              const activeQuarters = QUARTERS.filter(([quarter]) => row.quarters[quarter].actual + row.quarters[quarter].projected > 0).map(([quarter]) => quarter)
              const first = activeQuarters[0]
              const last = activeQuarters[activeQuarters.length - 1]
              return (
                <div key={row.id} className="grid grid-cols-[76px_repeat(4,minmax(0,1fr))] gap-1" role="row">
                  <span role="rowheader" className="flex min-h-12 items-center pr-1 text-[9px] font-semibold leading-3 text-heading">{row.label}</span>
                  {QUARTERS.map(([quarter, label]) => {
                    const cell = row.quarters[quarter]
                    const total = cell.actual + cell.projected
                    const level = total <= 0 ? 0 : total / max < 0.25 ? 1 : total / max < 0.5 ? 2 : total / max < 0.75 ? 3 : 4
                    const projected = cell.projected > 0
                    return (
                      <span
                        key={quarter}
                        role="gridcell"
                        aria-label={`${row.label}, ${label}, ${formatEuroCompact(cell.actual)} réalisé, ${formatEuroCompact(cell.projected)} projeté${row.activityWarnings.has(quarter) ? ", activité sous cible" : ""}${quarter === first || quarter === last ? ", début ou fin de production" : ""}${row.overdueWarnings.has(quarter) ? ", retard actif" : ""}`}
                        className={cn(
                          "relative flex min-h-12 items-center justify-center overflow-hidden rounded-[var(--radius-small)] border text-center font-mono text-[8px] font-bold",
                          level === 0 && "border-border bg-canvas text-muted",
                          level === 1 && "border-primary/20 bg-primary/[0.08] text-heading",
                          level === 2 && "border-primary/25 bg-primary/[0.18] text-heading",
                          level === 3 && "border-primary/40 bg-primary/[0.38] text-heading",
                          level === 4 && "border-primary bg-primary text-primary-fg",
                          projected && "border-dashed border-primary",
                          row.overdueWarnings.has(quarter) && "border-2 border-danger",
                        )}
                      >
                        {projected ? (
                          <svg className="absolute inset-0 size-full" aria-hidden="true" preserveAspectRatio="none">
                            <defs><pattern id={`${patternId}-${row.id}-${quarter}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--color-primary)" strokeOpacity="0.28" strokeWidth="2" /></pattern></defs>
                            <rect width="100%" height="100%" fill={`url(#${patternId}-${row.id}-${quarter})`} />
                          </svg>
                        ) : null}
                        <span className="relative z-[1]">{total > 0 ? formatEuroCompact(total).replace(" €", "") : "—"}</span>
                        {row.activityWarnings.has(quarter) ? <span className="absolute bottom-1 left-1 z-[2] size-1.5 rounded-full bg-warning ring-1 ring-surface" aria-hidden="true" /> : null}
                        {quarter === first ? <span className="absolute inset-y-1 left-0.5 z-[2] w-0.5 bg-brand-brass" aria-hidden="true" /> : null}
                        {quarter === last ? <span className="absolute inset-y-1 right-0.5 z-[2] w-0.5 bg-brand-brass" aria-hidden="true" /> : null}
                      </span>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-[9px] text-muted">
        <span><i className="mr-1 inline-block size-1.5 rounded-full bg-warning" />activité sous cible</span>
        <span><i className="mr-1 inline-block h-2 w-0.5 bg-brand-brass" />début / fin</span>
        <span><i className="mr-1 inline-block size-2 border border-dashed border-primary bg-primary/[0.08]" />projection</span>
        <span><i className="mr-1 inline-block size-2 border-2 border-danger" />retard actif</span>
      </div>

      <p className="sr-only">La grille comporte quatre colonnes Q1, Q2, Q3 et Q4 projeté. L’intensité représente la production. Un point signale une activité sous cible et un repère vertical le début ou la fin de production.</p>
      <table className="sr-only"><caption>Production trimestrielle</caption><thead><tr><th>Client</th>{QUARTERS.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><th>{row.label}</th>{QUARTERS.map(([quarter]) => <td key={quarter}>{formatEuroCompact(row.quarters[quarter].actual)} réalisé, {formatEuroCompact(row.quarters[quarter].projected)} projeté</td>)}</tr>)}</tbody></table>
    </section>
  )
}
