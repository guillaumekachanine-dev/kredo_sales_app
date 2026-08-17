import { formatDateShort, formatEuroCompact, formatPct } from "@/lib/formatters"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"

export function FinanceBriefHero({ data }: { data: FinanceMobileDashboardData }) {
  const target = data.objectives.annualRevenue ?? 0
  const forecastIncrement = data.forecast.securedProduction + data.forecast.pipelineWeighted
  const scaleMax = Math.max(data.summary.projectedLanding, target, 1)
  const actualWidth = (data.summary.actualRevenue / scaleMax) * 100
  const forecastWidth = (forecastIncrement / scaleMax) * 100
  const targetPosition = (target / scaleMax) * 100
  const marginDelta =
    data.summary.actualGrossMarginPct !== null && data.objectives.grossMarginPct !== null
      ? data.summary.actualGrossMarginPct - data.objectives.grossMarginPct
      : null

  return (
    <section
      aria-labelledby="finance-brief-title"
      className="rounded-[var(--radius-large)] border border-border bg-surface px-4 py-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="finance-brief-title" className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            CA facturé YTD
          </p>
          <p className="mt-1 font-heading text-[2rem] font-black leading-none tracking-[-0.04em] text-heading">
            {formatEuroCompact(data.summary.actualRevenue)}
          </p>
          <p className="mt-1.5 text-[10px] text-muted">
            Réalisé au {formatDateShort(data.period.actualThrough)}
          </p>
        </div>

        <div className="shrink-0 border-l border-border pl-3 text-right">
          <p className="font-heading text-xl font-black text-primary">
            {formatPct(data.summary.coveragePct, 0)}
          </p>
          <p className="max-w-20 text-[9px] font-semibold uppercase leading-3 tracking-[0.1em] text-muted">
            couverture objectif
          </p>
        </div>
      </div>

      <div className="mt-4" aria-label="Piste annuelle du chiffre d’affaires">
        <div className="relative h-4 overflow-hidden rounded-[var(--radius-small)] border border-border bg-canvas">
          <span
            className="absolute inset-y-0 left-0 bg-primary"
            style={{ width: `${actualWidth}%` }}
            aria-hidden="true"
          />
          <span
            className="absolute inset-y-0 border-y border-r border-brand-brass bg-brand-brass/[0.08]"
            style={{
              left: `${actualWidth}%`,
              width: `${forecastWidth}%`,
              backgroundImage:
                "repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--color-brand-brass) 46%, transparent) 4px 6px)",
            }}
            aria-hidden="true"
          />
          {target > 0 ? (
            <span
              className="absolute inset-y-[-3px] w-0.5 bg-brand-brass"
              style={{ left: `${targetPosition}%` }}
              aria-hidden="true"
            />
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] leading-3 text-muted">
          <p><span className="mr-1 inline-block size-1.5 bg-primary" />Réalisé<br /><strong className="text-heading">{formatEuroCompact(data.summary.actualRevenue)}</strong></p>
          <p><span className="mr-1 inline-block size-1.5 border border-brand-brass bg-brand-brass/[0.12]" />Forecast<br /><strong className="text-heading">+{formatEuroCompact(forecastIncrement)}</strong></p>
          <p className="text-right"><span className="mr-1 inline-block h-2 w-0.5 bg-brand-brass" />Objectif<br /><strong className="text-heading">{formatEuroCompact(target)}</strong></p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Marge YTD</p>
          <p className="mt-0.5 font-heading text-lg font-black text-heading">
            {formatPct(data.summary.actualGrossMarginPct, 1)}
          </p>
        </div>
        <p className="text-right text-[10px] leading-4 text-body">
          Cible {formatPct(data.objectives.grossMarginPct, 0)}
          <br />
          <strong className={marginDelta !== null && marginDelta < 0 ? "text-danger" : "text-success"}>
            {marginDelta === null ? "Écart indisponible" : `${marginDelta >= 0 ? "+" : ""}${marginDelta.toFixed(1)} pts`}
          </strong>
        </p>
      </div>

      <p className="sr-only">
        Chiffre d’affaires facturé {formatEuroCompact(data.summary.actualRevenue)}.
        Atterrissage {formatEuroCompact(data.summary.projectedLanding)} pour un objectif de {formatEuroCompact(target)}.
        Marge réelle {formatPct(data.summary.actualGrossMarginPct, 1)}, cible {formatPct(data.objectives.grossMarginPct, 1)}.
      </p>
    </section>
  )
}
