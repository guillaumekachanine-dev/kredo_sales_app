"use client"

import { formatCostEstimate, formatDurationMs } from "@/components/automations/automations-status"
import { AutomationMetricsTimelineChart } from "./AutomationMetricsTimelineChart"
import type { AutomationMetricsSnapshot } from "./automation-metrics-types"

type ComparisonTone = "positive" | "negative" | "neutral" | "muted"

function rounded(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

function comparisonText(value: number | null, kind: "percent" | "points"): string {
  if (value === null) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${rounded(value)} ${kind === "points" ? "pt" : "%"}`
}

function comparisonTone(value: number | null, meaning: "success" | "latency" | "neutral"): ComparisonTone {
  if (value === null) return "muted"
  if (meaning === "neutral" || value === 0) return "neutral"
  const isPositive = meaning === "success" ? value > 0 : value < 0
  return isPositive ? "positive" : "negative"
}

function MetricCard({ label, value, comparison, precision, tone }: {
  label: string
  value: string
  comparison: string
  precision: string
  tone: ComparisonTone
}) {
  const color = tone === "positive" ? "text-success" : tone === "negative" ? "text-danger" : tone === "neutral" ? "text-white/55" : "text-white/35"
  return (
    <div className="border-b border-white/8 pb-3 sm:border-b-0 sm:border-r sm:pr-4 last:border-0 last:pr-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-heading text-2xl font-bold tabular-nums text-white">{value}</p>
        <span className={`text-[10px] font-semibold tabular-nums ${color}`}>{comparison}</span>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-white/45">{precision}</p>
    </div>
  )
}

export function AutomationMetricsOverview({ snapshot }: { snapshot: AutomationMetricsSnapshot }) {
  const { summary, comparison } = snapshot
  const ratePrecision = summary.successRatePct === null
    ? "Aucun run décidé sur la période"
    : `${summary.succeeded} succès · ${summary.failed} échec${summary.failed > 1 ? "s" : ""}`
  const costPrecision = summary.costCoveragePct === null
    ? "Aucun run sur la période"
    : summary.measuredCost === null
      ? "Aucun coût mesuré"
      : `Couverture de mesure : ${rounded(summary.costCoveragePct)} %`

  return (
    <div className="space-y-6 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Exécutions"
          value={String(summary.executions)}
          comparison={comparisonText(comparison.executionsPct, "percent")}
          precision="Nombre total de runs"
          tone={comparisonTone(comparison.executionsPct, "neutral")}
        />
        <MetricCard
          label="Taux de succès"
          value={summary.successRatePct === null ? "—" : `${rounded(summary.successRatePct)} %`}
          comparison={comparisonText(comparison.successRatePoints, "points")}
          precision={ratePrecision}
          tone={comparisonTone(comparison.successRatePoints, "success")}
        />
        <MetricCard
          label="Latence p95"
          value={formatDurationMs(summary.p95DurationMs)}
          comparison={comparisonText(comparison.p95DurationPct, "percent")}
          precision={summary.p95DurationMs === null ? "Aucune durée disponible" : "Durée sous laquelle 95 % des runs mesurés se terminent"}
          tone={comparisonTone(comparison.p95DurationPct, "latency")}
        />
        <MetricCard
          label="Coût mesuré"
          value={formatCostEstimate(summary.measuredCost)}
          comparison={comparisonText(comparison.measuredCostPct, "percent")}
          precision={costPrecision}
          tone={comparisonTone(comparison.measuredCostPct, "neutral")}
        />
      </div>

      <section className="border-t border-white/8 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Exécutions et fiabilité dans le temps</h3>
            <p className="mt-1 text-[11px] text-white/45">Volumes réussis et échoués, avec taux de succès et repère à 90 %.</p>
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/50">Regroupement {snapshot.range.grain === "day" ? "journalier" : "hebdomadaire"}</span>
        </div>
        <div className="mt-4"><AutomationMetricsTimelineChart timeline={snapshot.timeline} /></div>
      </section>
    </div>
  )
}
