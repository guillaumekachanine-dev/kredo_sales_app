import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"
import { cn } from "@/lib/utils"

function BulletChart({
  label,
  value,
  max,
  target,
  valueLabel,
  targetLabel,
  tone = "primary",
}: {
  label: string
  value: number
  max: number
  target?: number | null
  valueLabel: string
  targetLabel?: string
  tone?: "primary" | "warning" | "danger"
}) {
  const safeMax = Math.max(max, 1)
  const valueWidth = Math.min(100, Math.max(0, (value / safeMax) * 100))
  const targetPosition = target === null || target === undefined ? null : Math.min(100, Math.max(0, (target / safeMax) * 100))

  return (
    <div aria-label={`${label}, ${valueLabel}${targetLabel ? `, cible ${targetLabel}` : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-semibold text-heading">{label}</p>
        <p className="font-mono text-[10px] font-bold text-heading">{valueLabel}</p>
      </div>
      <div className="relative mt-1.5 h-3 overflow-visible rounded-[var(--radius-small)] bg-border/60" aria-hidden="true">
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-[var(--radius-small)]",
            tone === "primary" && "bg-primary",
            tone === "warning" && "bg-warning",
            tone === "danger" && "bg-danger",
          )}
          style={{ width: `${valueWidth}%` }}
        />
        {targetPosition !== null ? <span className="absolute -inset-y-1 w-0.5 bg-brand-brass" style={{ left: `${targetPosition}%` }} /> : null}
      </div>
      {targetLabel ? <p className="mt-1 text-right text-[8px] text-muted">Repère {targetLabel}</p> : null}
    </div>
  )
}

export function FinanceRiskSheet({ data }: { data: FinanceMobileDashboardData }) {
  const target = data.objectives.annualRevenue ?? 0
  const topClient = data.distributions.clients.items.find((item) => item.id !== "non-attribue")
  const clientConcentrationPct = topClient?.sharePct ?? 0
  const engagementUnassignedPct = data.distributions.engagements.totalAmount > 0
    ? (data.distributions.engagements.unassignedAmount / data.distributions.engagements.totalAmount) * 100
    : 0
  const marginTarget = data.objectives.grossMarginPct
  const marginValue = data.summary.actualGrossMarginPct ?? 0
  const landingScale = Math.max(data.summary.projectedLanding, target, 1) * 1.08

  return (
    <section aria-labelledby="finance-risk-title" className="space-y-5">
      <div>
        <h3 id="finance-risk-title" className="font-heading text-base font-black text-heading">Risques & écarts</h3>
        <p className="mt-1 text-[10px] leading-4 text-muted">Bridge déterministe : aucune anomalie ou facture fictive du contrat legacy.</p>
      </div>

      <section aria-labelledby="forecast-bridge-title" className="rounded-[var(--radius-medium)] border border-border bg-canvas p-3">
        <h4 id="forecast-bridge-title" className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">Forecast bridge</h4>
        <dl className="mt-3 space-y-2 text-[11px]">
          <div className="flex items-center justify-between gap-3"><dt className="font-semibold text-heading">Réel YTD</dt><dd className="font-mono font-bold text-heading">{formatEuroCompact(data.summary.actualRevenue)}</dd></div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2"><dt className="text-body"><span className="mr-2 text-success">+</span>Production sécurisée</dt><dd className="font-mono font-bold text-heading">{formatEuroCompact(data.forecast.securedProduction)}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-body"><span className="mr-2 text-brand-brass">+</span>Pipe pondéré</dt><dd className="font-mono font-bold text-heading">{formatEuroCompact(data.forecast.pipelineWeighted)}</dd></div>
          <div className="flex items-center justify-between gap-3 border-y border-heading py-2"><dt className="font-black text-heading">Forecast</dt><dd className="font-mono text-sm font-black text-heading">{formatEuroCompact(data.summary.projectedLanding)}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-muted">Objectif annuel</dt><dd className="font-mono font-bold text-heading">{formatEuroCompact(target)}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="font-semibold text-heading">Écart</dt><dd className={cn("font-mono font-black", (data.summary.gapToTarget ?? 0) < 0 ? "text-danger" : "text-success")}>{data.summary.gapToTarget === null ? "—" : `${data.summary.gapToTarget >= 0 ? "+" : ""}${formatEuroCompact(data.summary.gapToTarget)}`}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="finance-bullets-title" className="space-y-4">
        <h4 id="finance-bullets-title" className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">Repères de pilotage</h4>
        <BulletChart label="Marge YTD" value={marginValue} max={100} target={marginTarget} valueLabel={formatPct(data.summary.actualGrossMarginPct, 1)} targetLabel={formatPct(marginTarget, 0)} tone={marginTarget !== null && marginValue < marginTarget ? "danger" : "primary"} />
        <BulletChart label="CA forecast vs objectif" value={data.summary.projectedLanding} max={landingScale} target={target || null} valueLabel={formatEuroCompact(data.summary.projectedLanding)} targetLabel={target > 0 ? formatEuroCompact(target) : undefined} />
        <BulletChart label={`Concentration premier client${topClient ? ` · ${topClient.label}` : ""}`} value={clientConcentrationPct} max={100} valueLabel={formatPct(clientConcentrationPct, 1)} />
        <BulletChart label="Engagement non classé" value={engagementUnassignedPct} max={100} target={0} valueLabel={formatPct(engagementUnassignedPct, 1)} targetLabel="0%" tone={engagementUnassignedPct > 0 ? "warning" : "primary"} />
      </section>

      <section aria-labelledby="deterministic-risks-title">
        <h4 id="deterministic-risks-title" className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">Écarts calculés</h4>
        {data.risksAndGaps.length === 0 ? (
          <p className="mt-2 rounded-[var(--radius-medium)] border border-success/25 bg-success/[0.05] px-3 py-3 text-xs text-heading">Aucun risque déterministe détecté.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {data.risksAndGaps.map((risk) => (
              <li key={risk.id} className="flex gap-3 py-3">
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", risk.severity === "critical" ? "bg-danger" : risk.severity === "warning" ? "bg-warning" : "bg-primary")} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-heading">{risk.title}</p>
                  <p className="mt-0.5 text-[9px] leading-4 text-muted">{risk.detail}</p>
                  {risk.amount !== undefined ? <p className="mt-1 font-mono text-[10px] font-bold text-heading">{formatEuroCompact(risk.amount)}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="sr-only">Le forecast est égal au réel YTD, plus la production sécurisée, plus le pipe pondéré. Il atteint {formatEuroCompact(data.summary.projectedLanding)}, contre un objectif de {formatEuroCompact(target)}.</p>
    </section>
  )
}
