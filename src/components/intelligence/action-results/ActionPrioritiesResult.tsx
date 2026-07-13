import type { ActionPrioritiesResult as ActionPrioritiesResultData } from "@/lib/intelligence/actions/action-priorities"

function urgencyLabel(urgency: ActionPrioritiesResultData["items"][number]["urgency"]) {
  if (urgency === "critical") return "Critique"
  if (urgency === "high") return "Haute"
  return "Modérée"
}

export function ActionPrioritiesResult({ result }: { result: ActionPrioritiesResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Comptes dormants" value={result.meta.accountsWithoutRecentAction} />
        <Metric label="Opps stagnantes" value={result.meta.oppsStagnating} />
        <Metric label="Fins mission" value={result.meta.missionsEndingSoon} />
        <Metric label="CRA à valider" value={result.meta.craNotValidated} />
      </div>

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucune priorité critique détectée avec les données disponibles.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {result.items.map((item) => (
            <li key={`${item.entityType}:${item.entityId}:${item.rank}`}>
              <a href={item.link} className="block rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 transition-colors hover:bg-primary-fg/[0.07]">
                <div className="flex items-start gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-brass text-[11px] font-bold text-secondary-fg">
                    {item.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                        {urgencyLabel(item.urgency)}
                      </span>
                      <span className="text-[10px] text-primary-fg/45">Score {item.score}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{item.action}</p>
                    <p className="mt-1 text-xs leading-snug text-primary-fg/55">{item.entityLabel}</p>
                    <p className="mt-1 text-[11px] leading-snug text-primary-fg/45">{item.impactReason}</p>
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

function Metric({ label, value }: { label: string; value: number }) {
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
