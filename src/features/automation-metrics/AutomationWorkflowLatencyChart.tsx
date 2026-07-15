"use client"

import { formatDurationMs } from "@/components/automations/automations-status"
import { workflowLabelForRunType } from "@/lib/automations/workflow-labels"
import type { AutomationWorkflowPerformance } from "./automation-metrics-types"

function round(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

function p95Comparison(value: number | null): { text: string; color: string } {
  if (value === null) return { text: "—", color: "text-white/35" }
  if (value === 0) return { text: "0 %", color: "text-white/55" }
  return value < 0
    ? { text: `${round(value)} %`, color: "text-success" }
    : { text: `+${round(value)} %`, color: "text-danger" }
}

function coverageLabel(workflow: AutomationWorkflowPerformance): string {
  if (workflow.durationCoveragePct === null) return "Aucune exécution"
  if (workflow.measuredDurations === 0) return "Latence non mesurée"
  if (workflow.durationCoveragePct < 100) return `Mesure partielle : ${round(workflow.durationCoveragePct)} %`
  return "Mesure complète : 100 %"
}

export function AutomationWorkflowLatencyChart({ workflows }: { workflows: AutomationWorkflowPerformance[] }) {
  const p95Values = workflows.map((workflow) => workflow.p95DurationMs).filter((value): value is number => value !== null)
  if (p95Values.length === 0) {
    return <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs text-white/50">Aucune durée mesurée sur la période sélectionnée.</p>
  }

  const largestP95 = Math.max(...p95Values)
  const domainMaximum = largestP95 === 0 ? 1 : largestP95 * 1.1
  const xFor = (value: number) => 20 + (value / domainMaximum) * 340

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-white/60" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />p50 · latence habituelle</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rotate-45 bg-brand-brass" />p95 · exécutions lentes</span>
        <span className="font-mono text-white/40">Échelle 0 — {formatDurationMs(domainMaximum)}</span>
      </div>
      <div className="space-y-3" role="list" aria-label="Latences p50 et p95 par workflow">
        {workflows.map((workflow) => {
          const delta = p95Comparison(workflow.p95DeltaPct)
          const p50DurationMs = workflow.p50DurationMs
          const p95DurationMs = workflow.p95DurationMs
          const measured = p50DurationMs !== null && p95DurationMs !== null

          return (
            <article key={workflow.runType} role="listitem" className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="break-words text-xs font-semibold text-white">{workflowLabelForRunType(workflow.runType)}</p>
                  <p className="mt-0.5 break-all font-mono text-[9px] text-white/35">{workflow.runType}</p>
                </div>
                <div className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[10px] min-[520px]:w-auto min-[520px]:justify-end">
                  <span className="text-primary">p50 {formatDurationMs(workflow.p50DurationMs)}</span>
                  <span className="text-brand-brass">p95 {formatDurationMs(workflow.p95DurationMs)}</span>
                  <span className={`font-semibold tabular-nums ${delta.color}`}>{delta.text} vs période précédente</span>
                </div>
              </div>
              {measured ? (
                <svg viewBox="0 0 380 32" role="img" aria-label={`${workflowLabelForRunType(workflow.runType)} : p50 ${formatDurationMs(p50DurationMs)}, p95 ${formatDurationMs(p95DurationMs)}`} className="mt-3 h-8 w-full">
                  <title>Écart entre p50 et p95</title>
                  <line x1="20" x2="360" y1="16" y2="16" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  <line x1={xFor(p50DurationMs)} x2={xFor(p95DurationMs)} y1="16" y2="16" stroke="rgba(255,255,255,0.52)" strokeWidth="2" />
                  <circle cx={xFor(p50DurationMs)} cy="16" r="5" fill="var(--color-primary)" />
                  <rect x={xFor(p95DurationMs) - 4} y="12" width="8" height="8" rx="1" fill="var(--color-brand-brass)" transform={`rotate(45 ${xFor(p95DurationMs)} 16)`} />
                </svg>
              ) : <p className="mt-3 rounded-md border border-dashed border-white/15 px-2 py-1.5 text-[10px] text-white/40">Latence non mesurée</p>}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-white/50">
                <span>{workflow.measuredDurations} durée{workflow.measuredDurations > 1 ? "s" : ""} mesurée{workflow.measuredDurations > 1 ? "s" : ""}</span>
                <span className={workflow.durationCoveragePct !== null && workflow.durationCoveragePct < 100 ? "text-brand-brass" : ""}>{coverageLabel(workflow)}</span>
              </div>
            </article>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>Données détaillées de performance par workflow</caption>
        <thead><tr><th>Workflow</th><th>Exécutions</th><th>Durées mesurées</th><th>Couverture</th><th>p50</th><th>p95</th><th>Évolution p95</th></tr></thead>
        <tbody>{workflows.map((workflow) => <tr key={`${workflow.runType}-row`}><td>{workflowLabelForRunType(workflow.runType)}</td><td>{workflow.executions}</td><td>{workflow.measuredDurations}</td><td>{workflow.durationCoveragePct === null ? "—" : `${round(workflow.durationCoveragePct)} %`}</td><td>{formatDurationMs(workflow.p50DurationMs)}</td><td>{formatDurationMs(workflow.p95DurationMs)}</td><td>{p95Comparison(workflow.p95DeltaPct).text}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
