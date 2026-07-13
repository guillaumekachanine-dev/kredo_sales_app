import type { PipelineInsightsResult as PipelineInsightsResultData } from "@/lib/intelligence/actions/pipeline-insights"
import { formatEuroCompact } from "@/lib/formatters"

function deltaLabel(value: number | null) {
  if (value === null) return "n/d"
  const sign = value > 0 ? "+" : ""
  return `${sign}${formatEuroCompact(value)}`
}

function severityLabel(severity: PipelineInsightsResultData["insights"][number]["severity"]) {
  if (severity === "positive") return "Signal positif"
  if (severity === "warning") return "À surveiller"
  return "Info"
}

export function PipelineInsightsResult({ result }: { result: PipelineInsightsResultData }) {
  const maxStageValue = Math.max(...result.stageDistribution.map((stage) => stage.weightedTotal), 1)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Pipe pondéré" value={formatEuroCompact(result.weightedPipe)} />
        <Metric label="Écart CA M/M" value={deltaLabel(result.weightedPipeDelta)} tone={result.weightedPipeDeltaTone} />
      </div>

      {result.openOpportunitiesCount < 10 && (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-[11px] leading-snug text-primary-fg/60">
          Basé sur {result.openOpportunitiesCount} opportunité{result.openOpportunitiesCount > 1 ? "s" : ""} ouverte{result.openOpportunitiesCount > 1 ? "s" : ""}.
        </p>
      )}

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">Répartition par étape</p>
        {result.stageDistribution.length === 0 ? (
          <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
            Aucun pipe ouvert détecté.
          </p>
        ) : (
          result.stageDistribution.map((stage) => (
            <div key={stage.stage} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-primary-fg">{stage.stageLabel}</p>
                  <p className="mt-0.5 text-[11px] text-primary-fg/45">{stage.count} opp.</p>
                </div>
                <p className="shrink-0 text-xs font-bold text-primary-fg">{formatEuroCompact(stage.weightedTotal)}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-fg/10">
                <div
                  className="h-full rounded-full bg-brand-brass"
                  style={{ width: stage.weightedTotal > 0 ? `${Math.max(6, (stage.weightedTotal / maxStageValue) * 100)}%` : 0 }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">Insights</p>
        {result.insights.map((insight) => (
          <div key={`${insight.type}:${insight.title}`} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                {severityLabel(insight.severity)}
              </span>
              <span className="text-[10px] text-primary-fg/45">{insight.type}</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{insight.title}</p>
            <p className="mt-1 text-xs leading-snug text-primary-fg/60">{insight.detail}</p>
          </div>
        ))}
      </div>

      <SourceIssues issues={result.sourceIssues} />
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" | "stable" }) {
  const toneClass =
    tone === "positive" ? "text-success"
      : tone === "negative" ? "text-danger"
        : "text-primary-fg"

  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className={`mt-1 text-lg font-bold leading-none ${toneClass}`}>{value}</p>
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
