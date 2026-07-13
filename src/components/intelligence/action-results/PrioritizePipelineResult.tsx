import type { PrioritizePipelineResult as PrioritizePipelineResultData } from "@/lib/intelligence/actions/prioritize-pipeline"
import { formatEuroCompact } from "@/lib/formatters"

function deadlineLabel(days: number | null) {
  if (days === null) return "Deadline non renseignée"
  if (days <= 0) return "À traiter maintenant"
  if (days === 1) return "1 jour"
  return `${days} jours`
}

export function PrioritizePipelineResult({ result }: { result: PrioritizePipelineResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Opps classées" value={result.rankedOpportunities.length} />
        <Metric label="Avec profil" value={result.rankedOpportunities.filter((item) => item.hasMatchingProfile).length} />
      </div>

      {result.rankedOpportunities.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucune opportunité ouverte à prioriser.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {result.rankedOpportunities.map((opportunity, index) => (
            <li key={opportunity.opportunityId}>
              <a href={`/missions/opps/${opportunity.opportunityId}/edit`} className="block rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 transition-colors hover:bg-primary-fg/[0.07]">
                <div className="flex items-start gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-brass text-[11px] font-bold text-secondary-fg">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                        Score {opportunity.priorityScore}
                      </span>
                      <span className="text-[10px] text-primary-fg/45">{opportunity.stage}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-fg/10">
                      <div className="h-full rounded-full bg-brand-brass" style={{ width: `${opportunity.priorityScore}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{opportunity.title}</p>
                    <p className="mt-1 text-xs leading-snug text-primary-fg/55">{opportunity.companyName} · {formatEuroCompact(opportunity.weightedGain)} · {deadlineLabel(opportunity.daysToDeadline)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {opportunity.drivers.map((driver) => (
                        <span key={driver} className="rounded-full bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-semibold text-primary-fg/55">
                          {driver}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ol>
      )}

      <SourceIssues issues={result.sourceIssues} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className="mt-1 text-lg font-bold leading-none text-primary-fg">{value}</p>
    </div>
  )
}

function SourceIssues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
      Données partielles : {issues.join(" ")}
    </div>
  )
}
