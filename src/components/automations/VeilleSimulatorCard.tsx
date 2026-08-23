"use client"

import { useMemo, useState } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  VEILLE_CADENCE_LABELS,
  VEILLE_RUNS_PER_MONTH,
  type CadenceSimulatorWorkflow,
  type VeilleCadence,
  type VeilleSimulatorBaseline,
} from "@/lib/automations/veille-cadence"
import { formatCostEstimate } from "./automations-status"

function dominantCadence(baseline: VeilleSimulatorBaseline): VeilleCadence {
  const sorted = [...baseline.cadenceBreakdown].sort((a, b) => b.count - a.count)
  const top = sorted[0]?.cadence
  if (top && Object.prototype.hasOwnProperty.call(VEILLE_RUNS_PER_MONTH, top)) {
    return top as VeilleCadence
  }
  return "weekly"
}

function formatRuns(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })
}

export function VeilleSimulatorCard({
  baseline,
  workflows,
}: {
  baseline: VeilleSimulatorBaseline
  workflows: CadenceSimulatorWorkflow[]
}) {
  const defaultRunType =
    workflows.find((workflow) => workflow.runType === "account_watch_refresh")?.runType ??
    workflows.find((workflow) => !workflow.hasTokensGap && workflow.avgCost30d !== null)?.runType ??
    workflows[0]?.runType ??
    ""

  const initialExecutions =
    defaultRunType === "account_watch_refresh" ? Math.max(1, baseline.watchedAccountsCount) : 1

  const [workflowRunType, setWorkflowRunType] = useState(defaultRunType)
  const [executionsPerPeriod, setExecutionsPerPeriod] = useState(initialExecutions)
  const [cadence, setCadence] = useState<VeilleCadence>(dominantCadence(baseline))

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.runType === workflowRunType) ?? workflows[0] ?? null,
    [workflowRunType, workflows],
  )

  const duplicateLabels = useMemo(() => {
    const counts = new Map<string, number>()
    for (const workflow of workflows) {
      counts.set(workflow.label, (counts.get(workflow.label) ?? 0) + 1)
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([label]) => label))
  }, [workflows])

  const baseCostPerRun =
    selectedWorkflow && !selectedWorkflow.hasTokensGap ? selectedWorkflow.avgCost30d : null
  const observedCost30d =
    selectedWorkflow && !selectedWorkflow.hasTokensGap ? selectedWorkflow.totalCost30d : null

  const projectedRunsPerMonth = executionsPerPeriod * VEILLE_RUNS_PER_MONTH[cadence]
  const projectedMonthlyCost =
    baseCostPerRun !== null ? projectedRunsPerMonth * baseCostPerRun : null

  const deltaVsObserved =
    projectedMonthlyCost !== null && observedCost30d !== null
      ? projectedMonthlyCost - observedCost30d
      : null

  if (!selectedWorkflow) {
    return (
      <SurfaceCard padding="default" className="border-border/80 bg-surface-raised">
        <p className="text-sm text-muted">Aucun workflow actif disponible pour la simulation.</p>
      </SurfaceCard>
    )
  }

  return (
    <SurfaceCard padding="default" className="border-border/80 bg-surface-raised">
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <span className="inline-flex size-2 rounded-full bg-brand-brass" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Simulateur de cadence</h3>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Sélectionnez un workflow actif puis modélisez son volume et sa fréquence. Le coût unitaire reprend exactement
        la moyenne par run sur 30 jours affichée dans Automatisations.
      </p>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Workflow</span>
        <select
          value={selectedWorkflow.runType}
          onChange={(event) => setWorkflowRunType(event.target.value)}
          className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/40 px-3 py-2 text-sm text-body outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20 cursor-pointer"
        >
          {workflows.map((workflow) => (
            <option key={workflow.runType} value={workflow.runType}>
              {workflow.label}
              {duplicateLabels.has(workflow.label) ? ` — ${workflow.runType}` : ""}
            </option>
          ))}
        </select>
        <code className="font-mono text-[10px] text-muted">{selectedWorkflow.runType}</code>
      </label>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Exécutions / période</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={executionsPerPeriod}
            onChange={(event) => setExecutionsPerPeriod(Math.max(0, Number(event.target.value) || 0))}
            className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/40 px-3 py-1.5 text-sm font-mono text-heading outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Cadence</span>
          <select
            value={cadence}
            onChange={(event) => setCadence(event.target.value as VeilleCadence)}
            className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/40 px-3 py-1.5 text-sm text-body outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20 cursor-pointer"
          >
            {(Object.keys(VEILLE_CADENCE_LABELS) as VeilleCadence[]).map((candidate) => (
              <option key={candidate} value={candidate}>
                {VEILLE_CADENCE_LABELS[candidate]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedWorkflow.hasTokensGap ? (
        <div className="mt-4 border border-warning/20 bg-warning/[0.04] px-3 py-2 text-xs text-warning">
          Coût non mesuré dans Automatisations : des données de tokens manquent sur ce workflow. La projection reste
          volontairement indisponible.
        </div>
      ) : selectedWorkflow.avgCost30d === null ? (
        <div className="mt-4 border border-border/60 bg-canvas/40 px-3 py-2 text-xs text-muted">
          Aucun coût moyen mesuré sur les 30 derniers jours pour ce workflow.
        </div>
      ) : selectedWorkflow.hasPricingGap ? (
        <div className="mt-4 border border-warning/20 bg-warning/[0.04] px-3 py-2 text-xs text-warning">
          Le coût disponible comporte un écart de tarification : la simulation est indicative.
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border border-border/40 bg-canvas/50 p-4 rounded-[var(--radius-medium)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Coût mensuel projeté</p>
            <p className="mt-0.5 font-mono text-3xl font-extrabold tracking-tight text-heading">
              {projectedMonthlyCost !== null ? formatCostEstimate(projectedMonthlyCost) : "—"}
            </p>
            <p className="mt-1 text-[10px] text-muted">{formatRuns(projectedRunsPerMonth)} runs projetés / mois</p>
          </div>
          {deltaVsObserved !== null ? (
            <div
              className={`border px-2.5 py-1 text-xs font-semibold rounded-full ${
                deltaVsObserved > 0
                  ? "bg-danger/[0.04] text-danger border-danger/10"
                  : deltaVsObserved < 0
                    ? "bg-success/[0.04] text-success border-success/10"
                    : "bg-surface text-muted border-border"
              }`}
            >
              {deltaVsObserved > 0 ? "+" : ""}
              {formatCostEstimate(deltaVsObserved)} vs 30j observés
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-3 text-[10px] text-muted">
        <div className="flex items-center justify-between gap-3">
          <span>Coût de base / run :</span>
          <strong className="font-mono text-heading">
            {baseCostPerRun !== null ? formatCostEstimate(baseCostPerRun) : "—"}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Runs observés sur 30j :</span>
          <strong className="font-mono text-heading">{selectedWorkflow.runs30d}</strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Coût observé sur 30j :</span>
          <strong className="font-mono text-heading">
            {observedCost30d !== null ? formatCostEstimate(observedCost30d) : "—"}
          </strong>
        </div>
      </div>
    </SurfaceCard>
  )
}
