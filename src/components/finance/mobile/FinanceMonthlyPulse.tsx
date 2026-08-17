import { formatEuroCompact } from "@/lib/formatters"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

export function FinanceMonthlyPulse({
  rows,
  onOpen,
}: {
  rows: FinanceMobileDashboardData["revenueByMonth"]
  onOpen: () => void
}) {
  const max = Math.max(...rows.map((row) => row.actual ?? row.projected ?? 0), 1)
  const summary = rows
    .filter((row) => (row.actual ?? row.projected ?? 0) > 0)
    .map((row, index) => `${MONTHS[index]} ${formatEuroCompact(row.actual ?? row.projected)}`)
    .join(", ")

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Ouvrir le détail mensuel du chiffre d’affaires"
      className="w-full rounded-[var(--radius-large)] border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] motion-reduce:transition-none"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Pulse mensuel</p>
          <p className="mt-0.5 text-xs font-semibold text-heading">Janvier — Décembre</p>
        </div>
        <span className="inline-flex size-11 items-center justify-center text-primary" aria-hidden="true">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </div>

      <div className="mt-3 grid h-12 grid-cols-12 items-end gap-1" aria-hidden="true">
        {rows.map((row, index) => {
          const value = row.actual ?? row.projected ?? 0
          const height = value > 0 ? Math.max(10, (value / max) * 100) : 3
          const projected = row.actual === null && row.projected !== null
          return (
            <span key={row.month} className="flex h-full flex-col items-center justify-end gap-1">
              <span
                className={projected
                  ? "w-full border border-dashed border-primary bg-primary/[0.06]"
                  : "w-full bg-primary"}
                style={{ height: `${height}%` }}
              />
              <span className="text-[8px] font-semibold text-muted">{MONTHS[index]}</span>
            </span>
          )
        })}
      </div>
      <p className="sr-only">Résumé mensuel : {summary || "aucun montant disponible"}.</p>
    </button>
  )
}
