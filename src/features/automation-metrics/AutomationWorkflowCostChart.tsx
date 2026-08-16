"use client"

import { workflowLabelForRunType } from "@/lib/automations/workflow-labels"
import type { AutomationMetricsCostSort, AutomationWorkflowCostEfficiency } from "./automation-metrics-types"

function rounded(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

function cost(value: number | null): string {
  if (value === null) return "—"
  if (value === 0) return "0,00 $"
  return value < 0.01 ? "< 0,01 $" : `${value.toFixed(2).replace(".", ",")} $`
}

function comparison(value: number | null, meaning: "neutral" | "efficiency"): { text: string; color: string } {
  if (value === null) return { text: "—", color: "text-white/35" }
  if (value === 0) return { text: "0 %", color: "text-white/55" }
  const positive = meaning === "efficiency" ? value < 0 : false
  return { text: `${value > 0 ? "+" : ""}${rounded(value)} %`, color: positive ? "text-success" : meaning === "efficiency" ? "text-danger" : "text-white/55" }
}

function coverage(workflow: AutomationWorkflowCostEfficiency): string {
  if (workflow.costCoveragePct === null) return "Aucune exécution"
  if (workflow.measuredRuns === 0) return "Coûts non mesurés"
  if (workflow.costCoveragePct < 100) return `Mesure partielle : ${rounded(workflow.costCoveragePct)} %`
  return "Mesure complète : 100 %"
}

export function AutomationWorkflowCostChart({ workflows, mode, appearance = "dark" }: { workflows: AutomationWorkflowCostEfficiency[]; mode: AutomationMetricsCostSort; appearance?: "dark" | "light" }) {
  if (workflows.length === 0) {
    return <p className={`rounded-xl border p-4 text-xs ${appearance === "light" ? "border-border bg-surface text-muted" : "border-white/10 bg-white/[0.025] text-white/50"}`}>Aucun workflow sur la période active ou précédente.</p>
  }
  const values = workflows.map((workflow) => mode === "measuredCost" ? workflow.measuredCost : workflow.costPerSuccess).filter((value): value is number => value !== null)
  const maximum = Math.max(0, ...values)

  return (
    <div className="space-y-3 w-full max-w-full overflow-x-hidden touch-pan-y" role="list" aria-label={`Coûts par workflow, classés par ${mode === "measuredCost" ? "coût total" : "coût par succès"}`}>
      <div className={`flex flex-wrap gap-x-4 gap-y-2 text-[10px] ${appearance === "light" ? "text-muted" : "text-white/60"}`} aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className={`size-2 rounded-sm ${mode === "measuredCost" ? (appearance === "light" ? "bg-brand-brass" : "bg-brand-brass") : "bg-primary"}`} />{mode === "measuredCost" ? "Coût mesuré" : "Coût par succès"}</span>
        <span className="break-words max-w-full">Les barres commencent à zéro et les coûts absents ne créent pas de barre.</span>
      </div>
      {workflows.map((workflow) => {
        const value = mode === "measuredCost" ? workflow.measuredCost : workflow.costPerSuccess
        const hasValue = value !== null
        const width = hasValue && maximum > 0 ? Math.max(1.5, (value / maximum) * 100) : 0
        const delta = comparison(mode === "measuredCost" ? workflow.measuredCostDeltaPct : workflow.costPerSuccessDeltaPct, mode === "measuredCost" ? "neutral" : "efficiency")

        return (
          <article key={workflow.runType} role="listitem" className={`rounded-xl border px-3 py-3 w-full max-w-full min-w-0 overflow-hidden ${appearance === "light" ? "border-border bg-surface shadow-sm" : "border-white/8 bg-white/[0.025]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 min-w-0">
              <div className="min-w-0 flex-1">
                <p className={`break-words text-xs font-semibold ${appearance === "light" ? "text-heading" : "text-white"}`}>{workflowLabelForRunType(workflow.runType)}</p>
                <p className={`mt-0.5 break-all font-mono text-[9px] ${appearance === "light" ? "text-muted" : "text-white/35"}`}>{workflow.runType}</p>
              </div>
              <div className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[10px] min-[520px]:w-auto min-[520px]:justify-end min-w-0">
                <strong className={`font-heading text-lg tabular-nums ${appearance === "light" ? "text-heading" : "text-white"}`}>{hasValue ? cost(value) : "—"}</strong>
                <span className={`font-semibold tabular-nums shrink-0 ${delta.color === "text-white/35" && appearance === "light" ? "text-muted" : delta.color === "text-white/55" && appearance === "light" ? "text-muted" : delta.color}`}>{delta.text} vs période précédente</span>
              </div>
            </div>
            {hasValue ? (
              <div className={`mt-3 h-3 overflow-hidden rounded-full ${appearance === "light" ? "bg-surface-hover" : "bg-white/[0.08]"}`} aria-label={`${mode === "measuredCost" ? "Coût total" : "Coût par succès"} ${cost(value)}`}>
                <span className={`block h-full rounded-full ${mode === "measuredCost" ? "bg-brand-brass" : "bg-primary"}`} style={{ width: `${width}%` }} />
              </div>
            ) : <p className={`mt-3 rounded-md border border-dashed px-2 py-1.5 text-[10px] ${appearance === "light" ? "border-border text-muted" : "border-white/15 text-white/40"}`}>Coûts non mesurés</p>}
            <div className={`mt-2 grid gap-1 text-[10px] sm:grid-cols-2 min-w-0 ${appearance === "light" ? "text-muted" : "text-white/50"}`}>
              <span className="break-words">Coût total : {cost(workflow.measuredCost)} · Moyen / run : {cost(workflow.averageCostPerMeasuredRun)}</span>
              {appearance !== "light" && (
                <>
                  <span className="break-words">Coût / succès : {cost(workflow.costPerSuccess)} · {workflow.succeeded} succès</span>
                  <span className={`break-words ${workflow.costCoveragePct !== null && workflow.costCoveragePct < 100 ? "text-brand-brass" : ""}`}>{coverage(workflow)}</span>
                  <span className="break-words">{workflow.measuredRuns} coût{workflow.measuredRuns > 1 ? "s" : ""} mesuré{workflow.measuredRuns > 1 ? "s" : ""} · {workflow.executions} exécution{workflow.executions > 1 ? "s" : ""}</span>
                </>
              )}
            </div>
          </article>
        )
      })}
      <table className="sr-only">
        <caption>Données détaillées des coûts et de l’efficacité par workflow</caption>
        <thead><tr><th>Workflow</th><th>Exécutions</th><th>Succès</th><th>Coûts mesurés</th><th>Couverture</th><th>Coût total</th><th>Coût moyen</th><th>Coût par succès</th><th>Évolution</th></tr></thead>
        <tbody>{workflows.map((workflow) => <tr key={`${workflow.runType}-row`}><td>{workflowLabelForRunType(workflow.runType)}</td><td>{workflow.executions}</td><td>{workflow.succeeded}</td><td>{workflow.measuredRuns}</td><td>{workflow.costCoveragePct === null ? "—" : `${rounded(workflow.costCoveragePct)} %`}</td><td>{cost(workflow.measuredCost)}</td><td>{cost(workflow.averageCostPerMeasuredRun)}</td><td>{cost(workflow.costPerSuccess)}</td><td>{comparison(mode === "measuredCost" ? workflow.measuredCostDeltaPct : workflow.costPerSuccessDeltaPct, mode === "measuredCost" ? "neutral" : "efficiency").text}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
