"use client"

import { workflowLabelForRunType } from "@/lib/automations/workflow-labels"
import type { AutomationWorkflowReliability } from "./automation-metrics-types"

function round(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

function comparison(value: number | null): { text: string; color: string } {
  if (value === null) return { text: "—", color: "text-white/35" }
  if (value === 0) return { text: "0 pt", color: "text-white/55" }
  return value > 0
    ? { text: `+${round(value)} pt`, color: "text-success" }
    : { text: `${round(value)} pt`, color: "text-danger" }
}

function sampleLabel(workflow: AutomationWorkflowReliability): string {
  if (workflow.sampleState === "none") return "Aucun run décidé"
  if (workflow.sampleState === "limited") return `Échantillon limité — ${workflow.decided} run${workflow.decided > 1 ? "s" : ""} décidé${workflow.decided > 1 ? "s" : ""}`
  return `${workflow.decided} runs décidés`
}

export function AutomationWorkflowReliabilityChart({ workflows, appearance = "dark" }: { workflows: AutomationWorkflowReliability[]; appearance?: "dark" | "light" }) {
  if (workflows.length === 0) {
    return <p className={`rounded-xl border p-4 text-xs ${appearance === "light" ? "border-border bg-surface text-muted" : "border-white/10 bg-white/[0.025] text-white/50"}`}>Aucun workflow sur la période active ou précédente.</p>
  }

  return (
    <div className="space-y-3 w-full max-w-full overflow-x-hidden touch-pan-y" role="list" aria-label="Fiabilité par workflow">
      {workflows.map((workflow) => {
        const delta = comparison(workflow.successRateDeltaPoints)
        const rate = workflow.successRatePct === null ? "—" : `${round(workflow.successRatePct)} %`
        const limited = workflow.sampleState === "limited"

        return (
          <article key={workflow.runType} role="listitem" className={`rounded-xl border p-3 w-full max-w-full min-w-0 overflow-hidden ${appearance === "light" ? "border-border bg-surface shadow-sm" : "border-white/8 bg-white/[0.025]"}`}>
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <p className={`break-words text-xs font-semibold ${appearance === "light" ? "text-heading" : "text-white"}`}>{workflowLabelForRunType(workflow.runType)}</p>
                <p className={`mt-0.5 break-all font-mono text-[9px] ${appearance === "light" ? "text-muted" : "text-white/35"}`}>{workflow.runType}</p>
              </div>
              <strong className={`font-heading text-lg leading-none tabular-nums shrink-0 ml-2 ${appearance === "light" ? "text-heading" : "text-white"}`}>{rate}</strong>
            </div>

            <div className="mt-1.5">
              <span className={`text-[10px] font-semibold tabular-nums ${delta.color === "text-white/35" && appearance === "light" ? "text-muted" : delta.color === "text-white/55" && appearance === "light" ? "text-muted" : delta.color}`}>
                {delta.text} vs période précédente
              </span>
            </div>

            {workflow.sampleState === "none" ? (
              <div className={`mt-1.5 flex h-2.5 items-center rounded-full border border-dashed px-2 text-[9px] ${appearance === "light" ? "border-border text-muted" : "border-white/20 text-white/40"}`}>Aucun run décidé</div>
            ) : (
              <div className={`relative mt-1.5 h-2.5 overflow-hidden rounded-full ${appearance === "light" ? "bg-surface-hover" : "bg-white/[0.08]"} ${limited ? "opacity-75" : ""}`} aria-label={`${rate} de succès, ${workflow.succeeded} succès et ${workflow.failed} échecs`}>
                <span className={`absolute inset-y-0 left-[90%] z-10 border-l border-dashed ${appearance === "light" ? "border-border" : "border-white/70"}`} aria-hidden="true" />
                <span className="absolute inset-y-0 left-0 bg-success" style={{ width: `${workflow.successRatePct ?? 0}%` }} />
                <span className="absolute inset-y-0 right-0 bg-danger/75" style={{ width: `${100 - (workflow.successRatePct ?? 0)}%` }} />
              </div>
            )}
            <div className={`mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] min-w-0 ${appearance === "light" ? "text-muted" : "text-white/50"}`}>
              <span className="truncate max-w-full">{workflow.succeeded} succès · {workflow.failed} échec{workflow.failed > 1 ? "s" : ""}</span>
              <span className={`truncate max-w-full ${workflow.sampleState === "limited" ? "text-brand-brass" : ""}`}>{sampleLabel(workflow)}</span>
            </div>
          </article>
        )
      })}
      <table className="sr-only">
        <caption>Données détaillées de fiabilité par workflow</caption>
        <thead><tr><th>Workflow</th><th>Exécutions</th><th>Succès</th><th>Échecs</th><th>Runs décidés</th><th>Taux de succès</th><th>Évolution</th><th>Échantillon</th></tr></thead>
        <tbody>{workflows.map((workflow) => <tr key={`${workflow.runType}-row`}><td>{workflowLabelForRunType(workflow.runType)}</td><td>{workflow.executions}</td><td>{workflow.succeeded}</td><td>{workflow.failed}</td><td>{workflow.decided}</td><td>{workflow.successRatePct === null ? "—" : `${round(workflow.successRatePct)} %`}</td><td>{comparison(workflow.successRateDeltaPoints).text}</td><td>{sampleLabel(workflow)}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
