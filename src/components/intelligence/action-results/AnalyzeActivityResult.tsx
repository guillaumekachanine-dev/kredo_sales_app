import type { AnalyzeActivityResult as AnalyzeActivityResultData } from "@/lib/intelligence/actions/analyze-activity"
import { formatDateNumeric, formatPct } from "@/lib/formatters"

function statusLabel(status: AnalyzeActivityResultData["recommendations"][number]["status"]) {
  if (status === "action_needed") return "Action"
  if (status === "attention") return "Attention"
  return "Sain"
}

export function AnalyzeActivityResult({ result }: { result: AnalyzeActivityResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Action" value={result.summary.actionNeededCount} />
        <Metric label="Attention" value={result.summary.attentionCount} />
        <Metric label="Activité moy." value={`${result.summary.avgActivityRate}%`} />
      </div>

      {result.recommendations.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucun collaborateur actif à analyser.
        </p>
      ) : (
        <div className="space-y-2.5">
          {result.recommendations.map((item) => (
            <article key={item.collaboratorId} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                  {statusLabel(item.status)}
                </span>
                {item.practice && <span className="text-[10px] text-primary-fg/45">{item.practice}</span>}
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{item.collaboratorName}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-primary-fg/55">
                <p>Activité {formatPct(item.indicators.activityRateYtd, 0)}</p>
                <p>TACI {formatPct(item.indicators.taciTarget, 0)}</p>
                <p>Écart {formatPct(item.indicators.gapVsTaci, 0)}</p>
                <p>Marge {formatPct(item.indicators.realMarginPct, 0)}</p>
                <p>Absences J+30 {item.indicators.plannedAbsenceDaysNext30}j</p>
                <p>Fin {formatDateNumeric(item.indicators.currentMissionEndDate)}</p>
              </div>
              <ul className="mt-3 space-y-1.5">
                {item.recommendations.map((recommendation) => (
                  <li key={recommendation} className="text-xs leading-snug text-primary-fg/70">
                    {recommendation}
                  </li>
                ))}
              </ul>
              {item.alertFlags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.alertFlags.map((flag) => (
                    <span key={flag} className="rounded-full bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-semibold text-primary-fg/55">
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </article>
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className="mt-1 text-lg font-bold leading-none text-primary-fg">{value}</p>
    </div>
  )
}
