import type { UpcomingDeadlinesResult as UpcomingDeadlinesResultData } from "@/lib/intelligence/actions/upcoming-deadlines"
import type { DeadlineHorizon, DeadlineKind } from "@/lib/intelligence/actions/upcoming-deadlines-rules"

const HORIZON_LABELS: Record<DeadlineHorizon, string> = {
  overdue: "Dépassé",
  d30: "30 jours",
  d60: "60 jours",
  d90: "90 jours",
}

const KIND_LABELS: Record<DeadlineKind, string> = {
  mission_end: "Fin de mission",
  opportunity_close: "Closing",
  long_absence: "Absence",
  client_closure: "Fermeture client",
}

function formatEur(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} €`
}

export function UpcomingDeadlinesResult({ result }: { result: UpcomingDeadlinesResultData }) {
  const visibleHorizons = result.horizons.filter((horizon) => horizon.count > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Échéances 90 j" value={result.totals.count} />
        <Metric label="Missions à échéance" value={result.totals.missionsEndingCount} />
        <Metric label="CA mensuel exposé" value={formatEur(result.totals.revenueAtRiskEur)} />
      </div>

      {visibleHorizons.length > 0 && (
        <div className="space-y-1.5">
          {visibleHorizons.map((horizon) => (
            <div
              key={horizon.horizon}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] px-3 py-2"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                {HORIZON_LABELS[horizon.horizon]}
              </span>
              <span className="text-[11px] text-primary-fg/55">
                {horizon.count} échéance{horizon.count > 1 ? "s" : ""}
                {horizon.revenueAtRiskEur > 0 ? ` · ${formatEur(horizon.revenueAtRiskEur)} / mois` : ""}
                {horizon.weightedPipelineEur > 0 ? ` · ${formatEur(horizon.weightedPipelineEur)} pondérés` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {result.deadlines.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucune échéance dans les 90 prochains jours.
        </p>
      ) : (
        <div className="space-y-2.5">
          {result.deadlines.map((deadline) => (
            <a
              key={deadline.id}
              href={deadline.link}
              className="block rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 transition-colors hover:bg-primary-fg/[0.07]"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                  {HORIZON_LABELS[deadline.horizon]}
                </span>
                <span className="text-[10px] text-primary-fg/45">{KIND_LABELS[deadline.kind]}</span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{deadline.title}</p>
              <p className="mt-1 text-xs leading-snug text-primary-fg/60">{deadline.detail}</p>
              <p className="mt-2 text-[11px] font-semibold leading-snug text-brand-brass">
                {deadline.date}
                {deadline.daysUntil < 0
                  ? ` · en retard de ${Math.abs(deadline.daysUntil)} j`
                  : ` · dans ${deadline.daysUntil} j`}
              </p>
            </a>
          ))}
        </div>
      )}

      {result.sourceIssues.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
          Données partielles : {result.sourceIssues.join(" ")}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className="mt-1 text-base font-bold leading-none text-primary-fg">{value}</p>
    </div>
  )
}
