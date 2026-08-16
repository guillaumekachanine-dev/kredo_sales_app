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

export function AutomationWorkflowCostChart({
  workflows,
  mode,
  appearance = "dark",
  onSelectWorkflow,
}: {
  workflows: AutomationWorkflowCostEfficiency[]
  mode: AutomationMetricsCostSort
  appearance?: "dark" | "light"
  onSelectWorkflow?: (workflowId: string) => void
}) {
  if (workflows.length === 0) {
    return <p className={`rounded-xl border p-4 text-xs ${appearance === "light" ? "border-border bg-surface text-muted" : "border-white/10 bg-white/[0.025] text-white/50"}`}>Aucun workflow sur la période active ou précédente.</p>
  }
  const values = workflows.map((workflow) => mode === "measuredCost" ? workflow.measuredCost : workflow.costPerSuccess).filter((value): value is number => value !== null)
  const maximum = Math.max(0, ...values)

  return (
    <div className="space-y-3 w-full max-w-full overflow-x-hidden touch-pan-y" role="list" aria-label={`Coûts par workflow, classés par ${mode === "measuredCost" ? "coût total" : "coût par succès"}`}>
      {workflows.map((workflow) => {
        const value = mode === "measuredCost" ? workflow.measuredCost : workflow.costPerSuccess
        const hasValue = value !== null
        const width = hasValue && maximum > 0 ? Math.max(1.5, (value / maximum) * 100) : 0
        const delta = comparison(mode === "measuredCost" ? workflow.measuredCostDeltaPct : workflow.costPerSuccessDeltaPct, mode === "measuredCost" ? "neutral" : "efficiency")
        const isClickable = Boolean(onSelectWorkflow)

        return (
          <article
            key={workflow.runType}
            role="listitem"
            tabIndex={isClickable ? 0 : undefined}
            onClick={isClickable ? () => onSelectWorkflow?.(workflow.runType) : undefined}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelectWorkflow?.(workflow.runType)
                    }
                  }
                : undefined
            }
            className={`group rounded-xl border p-3 w-full max-w-full min-w-0 overflow-hidden transition-all ${
              isClickable ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/60" : ""
            } ${
              appearance === "light"
                ? `border-border bg-surface shadow-sm ${isClickable ? "hover:border-brand-brass/60 hover:shadow-md hover:bg-surface-hover/60" : ""}`
                : `border-white/8 bg-white/[0.025] ${isClickable ? "hover:border-white/20 hover:bg-white/[0.04]" : ""}`
            }`}
          >
            {/* Haut de la carte : Nom du workflow à gauche, Valeur principale en haut à droite */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`break-words text-xs font-semibold ${appearance === "light" ? "text-heading" : "text-white"}`}>
                    {workflowLabelForRunType(workflow.runType)}
                  </p>
                  {isClickable && (
                    <svg
                      className={`size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                        appearance === "light" ? "text-muted" : "text-white/40"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
                <p className={`mt-0.5 break-all font-mono text-[9px] ${appearance === "light" ? "text-muted" : "text-white/35"}`}>
                  {workflow.runType}
                </p>
              </div>

              {/* Valeur principale dans le coin supérieur droit */}
              <strong className={`font-heading text-lg leading-none tabular-nums shrink-0 ml-2 ${appearance === "light" ? "text-heading" : "text-white"}`}>
                {hasValue ? cost(value) : "—"}
              </strong>
            </div>

            {/* Au-dessus de la barre graphique à gauche : Variation vs période précédente */}
            <div className="mt-1.5">
              <span className={`text-[10px] font-semibold tabular-nums ${delta.color === "text-white/35" && appearance === "light" ? "text-muted" : delta.color === "text-white/55" && appearance === "light" ? "text-muted" : delta.color}`}>
                {delta.text} vs période précédente
              </span>
            </div>

            {/* Barre graphique */}
            {hasValue ? (
              <div className={`mt-1.5 h-2.5 overflow-hidden rounded-full ${appearance === "light" ? "bg-surface-hover" : "bg-white/[0.08]"}`} aria-label={`${mode === "measuredCost" ? "Coût total" : "Coût par succès"} ${cost(value)}`}>
                <span className={`block h-full rounded-full ${mode === "measuredCost" ? "bg-brand-brass" : "bg-primary"}`} style={{ width: `${width}%` }} />
              </div>
            ) : (
              <p className={`mt-1.5 rounded-md border border-dashed px-2 py-1 text-[9px] ${appearance === "light" ? "border-border text-muted" : "border-white/15 text-white/40"}`}>
                Coûts non mesurés
              </p>
            )}

            {/* Sous la barre graphique : Gauche = Moyen/run : X,XX$ | Droite = Coût total : X,XX$ */}
            <div className={`mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] min-w-0 ${appearance === "light" ? "text-muted" : "text-white/50"}`}>
              <span className="truncate">
                Moyen/run : <strong className={`font-semibold tabular-nums ${appearance === "light" ? "text-heading" : "text-white/80"}`}>{cost(workflow.averageCostPerMeasuredRun)}</strong>
              </span>
              <span className="truncate text-right">
                Coût total : <strong className={`font-semibold tabular-nums ${appearance === "light" ? "text-heading" : "text-white/80"}`}>{cost(workflow.measuredCost)}</strong>
              </span>
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
