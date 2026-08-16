"use client"

import { useMemo, useState } from "react"
import { AutomationWorkflowCostChart } from "./AutomationWorkflowCostChart"
import { sortWorkflowCosts } from "./automation-metrics-model"
import type { AutomationMetricsCostSort, AutomationMetricsSnapshot } from "./automation-metrics-types"

function rounded(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

function cost(value: number | null): string {
  if (value === null) return "—"
  if (value === 0) return "0,00 $"
  return value < 0.01 ? "< 0,01 $" : `${value.toFixed(2).replace(".", ",")} $`
}

function delta(value: number | null, meaning: "neutral" | "efficiency"): { text: string; color: string } {
  if (value === null) return { text: "—", color: "text-white/35" }
  if (value === 0) return { text: "0 %", color: "text-white/55" }
  const positive = meaning === "efficiency" ? value < 0 : false
  return { text: `${value > 0 ? "+" : ""}${rounded(value)} %`, color: positive ? "text-success" : meaning === "efficiency" ? "text-danger" : "text-white/55" }
}

function MetricCard({ label, value, detail, comparison, appearance = "dark" }: { label: string; value: string; detail: string; comparison?: { text: string; color: string }; appearance?: "dark" | "light" }) {
  return (
    <div className={`border-b pb-3 sm:border-b-0 sm:border-r sm:pr-4 last:border-0 last:pr-0 min-w-0 max-w-full overflow-hidden ${appearance === "light" ? "border-border" : "border-white/8"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${appearance === "light" ? "text-muted" : "text-white/45"}`}>{label}</p>
      <div className="mt-2 flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2 min-w-0">
        <p className={`font-heading text-2xl font-bold tabular-nums truncate max-w-full ${appearance === "light" ? "text-heading" : "text-white"}`}>{value}</p>
        {comparison ? <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${comparison.color === "text-white/35" && appearance === "light" ? "text-muted" : comparison.color === "text-white/55" && appearance === "light" ? "text-muted" : comparison.color}`}>{comparison.text}</span> : null}
      </div>
      <p className={`mt-1.5 text-[10px] leading-snug break-words ${appearance === "light" ? "text-muted" : "text-white/45"}`}>{detail}</p>
    </div>
  )
}

export function AutomationMetricsCosts({
  snapshot,
  appearance = "dark",
  onSelectWorkflow,
}: {
  snapshot: AutomationMetricsSnapshot
  appearance?: "dark" | "light"
  onSelectWorkflow?: (workflowId: string) => void
}) {
  const [sort, setSort] = useState<AutomationMetricsCostSort>("costPerSuccess")
  const workflows = useMemo(() => sortWorkflowCosts(snapshot.workflowCosts, sort), [snapshot.workflowCosts, sort])
  const summary = snapshot.costsSummary

  return (
    <div className={`space-y-4 p-4 sm:p-6 w-full max-w-full overflow-x-hidden touch-pan-y animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none motion-reduce:duration-0 ${appearance === "light" ? "bg-canvas" : ""}`}>
      <div className={`flex flex-col items-stretch justify-between gap-3 min-[520px]:flex-row min-[520px]:items-end w-full max-w-full min-w-0 ${appearance === "light" ? "pt-1" : ""}`}>
        {appearance !== "light" && (
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold break-words text-white">Coûts et efficacité par workflow</h3>
            <p className="mt-1 text-[11px] break-words text-white/45">Dépense mesurée et coût nécessaire pour obtenir un résultat réussi</p>
          </div>
        )}
        <div role="group" className={`grid grid-cols-2 shrink-0 rounded-lg border p-0.5 text-[10px] max-w-full ${appearance === "light" ? "border-border bg-surface w-full min-[520px]:w-auto" : "border-white/10"}`} aria-label="Afficher les coûts par">
          <button type="button" onClick={() => setSort("costPerSuccess")} aria-pressed={sort === "costPerSuccess"} className={`min-h-10 rounded-md px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/50 ${sort === "costPerSuccess" ? (appearance === "light" ? "bg-primary text-white font-semibold" : "bg-white/10 text-white font-semibold") : (appearance === "light" ? "text-muted hover:bg-surface-hover" : "text-white/50")}`}>Coût par succès</button>
          <button type="button" onClick={() => setSort("measuredCost")} aria-pressed={sort === "measuredCost"} className={`min-h-10 rounded-md px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/50 ${sort === "measuredCost" ? (appearance === "light" ? "bg-primary text-white font-semibold" : "bg-white/10 text-white font-semibold") : (appearance === "light" ? "text-muted hover:bg-surface-hover" : "text-white/50")}`}>Coût total</button>
        </div>
      </div>

      {appearance !== "light" && (
        <div className="grid gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 [&>*:last-child]:min-[420px]:col-span-2 [&>*:last-child]:sm:col-span-1 w-full max-w-full min-w-0">
          <MetricCard label="Coût mesuré" value={cost(summary.measuredCost)} comparison={delta(summary.measuredCostDeltaPct, "neutral")} detail="Dépense connue sur la période sélectionnée" appearance={appearance} />
          <MetricCard label="Coût par succès" value={cost(summary.costPerSuccess)} comparison={delta(summary.costPerSuccessDeltaPct, "efficiency")} detail={summary.costPerSuccess === null ? "Aucun succès ou coût mesuré" : "Dépense mesurée totale divisée par les succès"} appearance={appearance} />
          <MetricCard label="Couverture des coûts" value={summary.costCoveragePct === null ? "—" : `${rounded(summary.costCoveragePct)} %`} detail={summary.costCoveragePct === null ? "Aucune exécution" : `${summary.measuredRuns} run${summary.measuredRuns > 1 ? "s" : ""} mesuré${summary.measuredRuns > 1 ? "s" : ""} sur ${summary.executions}`} appearance={appearance} />
        </div>
      )}

      <AutomationWorkflowCostChart
        workflows={workflows}
        mode={sort}
        appearance={appearance}
        onSelectWorkflow={onSelectWorkflow}
      />
      <p className={`text-[10px] leading-relaxed break-words ${appearance === "light" ? "text-muted" : "text-white/40"}`}>Le coût par succès inclut tous les coûts mesurés, y compris ceux des runs échoués. Une couverture incomplète laisse la dépense et le coût par succès partiels.</p>
    </div>
  )
}
