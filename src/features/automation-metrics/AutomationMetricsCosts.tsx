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

function MetricCard({ label, value, detail, comparison }: { label: string; value: string; detail: string; comparison?: { text: string; color: string } }) {
  return (
    <div className="border-b border-white/8 pb-3 sm:border-b-0 sm:border-r sm:pr-4 last:border-0 last:pr-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-heading text-2xl font-bold tabular-nums text-white">{value}</p>
        {comparison ? <span className={`text-[10px] font-semibold tabular-nums ${comparison.color}`}>{comparison.text}</span> : null}
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-white/45">{detail}</p>
    </div>
  )
}

export function AutomationMetricsCosts({ snapshot }: { snapshot: AutomationMetricsSnapshot }) {
  const [sort, setSort] = useState<AutomationMetricsCostSort>("costPerSuccess")
  const workflows = useMemo(() => sortWorkflowCosts(snapshot.workflowCosts, sort), [snapshot.workflowCosts, sort])
  const summary = snapshot.costsSummary

  return (
    <div className="space-y-5 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Coûts et efficacité par workflow</h3>
          <p className="mt-1 text-[11px] text-white/45">Dépense mesurée et coût nécessaire pour obtenir un résultat réussi</p>
        </div>
        <div role="group" className="rounded-lg border border-white/10 p-0.5 text-[10px]" aria-label="Afficher les coûts par">
          <button type="button" onClick={() => setSort("costPerSuccess")} aria-pressed={sort === "costPerSuccess"} className={`rounded-md px-2.5 py-1.5 ${sort === "costPerSuccess" ? "bg-white/10 text-white" : "text-white/50"}`}>Coût par succès</button>
          <button type="button" onClick={() => setSort("measuredCost")} aria-pressed={sort === "measuredCost"} className={`rounded-md px-2.5 py-1.5 ${sort === "measuredCost" ? "bg-white/10 text-white" : "text-white/50"}`}>Coût total</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Coût mesuré" value={cost(summary.measuredCost)} comparison={delta(summary.measuredCostDeltaPct, "neutral")} detail="Dépense connue sur la période sélectionnée" />
        <MetricCard label="Coût par succès" value={cost(summary.costPerSuccess)} comparison={delta(summary.costPerSuccessDeltaPct, "efficiency")} detail={summary.costPerSuccess === null ? "Aucun succès ou coût mesuré" : "Dépense mesurée totale divisée par les succès"} />
        <MetricCard label="Couverture des coûts" value={summary.costCoveragePct === null ? "—" : `${rounded(summary.costCoveragePct)} %`} detail={summary.costCoveragePct === null ? "Aucune exécution" : `${summary.measuredRuns} run${summary.measuredRuns > 1 ? "s" : ""} mesuré${summary.measuredRuns > 1 ? "s" : ""} sur ${summary.executions}`} />
      </div>

      <AutomationWorkflowCostChart workflows={workflows} mode={sort} />
      <p className="text-[10px] leading-relaxed text-white/40">Le coût par succès inclut tous les coûts mesurés, y compris ceux des runs échoués. Une couverture incomplète laisse la dépense et le coût par succès partiels.</p>
    </div>
  )
}
