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

export function AutomationWorkflowReliabilityChart({ workflows }: { workflows: AutomationWorkflowReliability[] }) {
  if (workflows.length === 0) {
    return <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs text-white/50">Aucun workflow sur la période active ou précédente.</p>
  }

  return (
    <div className="space-y-3" role="list" aria-label="Fiabilité par workflow">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/60" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-success" />Réussis</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-danger/75" />Échoués</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 border-l border-dashed border-white/50" />Seuil 90 %</span>
      </div>
      {workflows.map((workflow) => {
        const delta = comparison(workflow.successRateDeltaPoints)
        const rate = workflow.successRatePct === null ? "—" : `${round(workflow.successRatePct)} %`
        const limited = workflow.sampleState === "limited"

        return (
          <article key={workflow.runType} role="listitem" className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{workflowLabelForRunType(workflow.runType)}</p>
                <p className="mt-0.5 font-mono text-[9px] text-white/35">{workflow.runType}</p>
              </div>
              <div className="flex items-baseline gap-3">
                <span className={`text-[10px] font-semibold tabular-nums ${delta.color}`}>{delta.text} vs période précédente</span>
                <strong className="font-heading text-lg tabular-nums text-white">{rate}</strong>
              </div>
            </div>
            {workflow.sampleState === "none" ? (
              <div className="mt-3 flex h-3 items-center rounded-full border border-dashed border-white/20 px-2 text-[9px] text-white/40">Aucun run décidé</div>
            ) : (
              <div className={`relative mt-3 h-3 overflow-hidden rounded-full bg-white/[0.08] ${limited ? "opacity-75" : ""}`} aria-label={`${rate} de succès, ${workflow.succeeded} succès et ${workflow.failed} échecs`}>
                <span className="absolute inset-y-0 left-[90%] z-10 border-l border-dashed border-white/70" aria-hidden="true" />
                <span className="absolute inset-y-0 left-0 bg-success" style={{ width: `${workflow.successRatePct ?? 0}%` }} />
                <span className="absolute inset-y-0 right-0 bg-danger/75" style={{ width: `${100 - (workflow.successRatePct ?? 0)}%` }} />
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-white/50">
              <span>{workflow.succeeded} succès · {workflow.failed} échec{workflow.failed > 1 ? "s" : ""}</span>
              <span className={workflow.sampleState === "limited" ? "text-brand-brass" : ""}>{sampleLabel(workflow)}</span>
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
