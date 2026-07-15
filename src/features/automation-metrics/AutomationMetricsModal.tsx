"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { workflowLabelForRunType } from "@/lib/automations/workflow-labels"
import { loadAutomationMetricsSnapshot } from "./automation-metrics-actions"
import { AutomationMetricsNavigation } from "./AutomationMetricsNavigation"
import { AutomationMetricsOverview } from "./AutomationMetricsOverview"
import type {
  AutomationMetricsFilters,
  AutomationMetricsPeriodPreset,
  AutomationMetricsSnapshot,
  AutomationMetricsWorkflow,
} from "./automation-metrics-types"

const DAY_MS = 86_400_000

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dateFromInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function rangeForPreset(preset: Exclude<AutomationMetricsPeriodPreset, "custom">) {
  const to = new Date()
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "12w" ? 84 : 365
  return { from: new Date(to.getTime() - days * DAY_MS), to }
}

function filtersFromState(
  preset: AutomationMetricsPeriodPreset,
  workflow: AutomationMetricsWorkflow,
  customRange: { from: string; to: string },
): AutomationMetricsFilters {
  const range = preset === "custom"
    ? { from: dateFromInput(customRange.from), to: new Date(dateFromInput(customRange.to).getTime() + DAY_MS) }
    : rangeForPreset(preset)
  return { from: range.from.toISOString(), to: range.to.toISOString(), preset, workflow }
}

function initialCustomRange() {
  const range = rangeForPreset("30d")
  return { from: toDateInput(range.from), to: toDateInput(range.to) }
}

export function AutomationMetricsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [preset, setPreset] = useState<AutomationMetricsPeriodPreset>("30d")
  const [workflow, setWorkflow] = useState<AutomationMetricsWorkflow>("all")
  const [customRange, setCustomRange] = useState(initialCustomRange)
  const [snapshot, setSnapshot] = useState<AutomationMetricsSnapshot | null>(null)
  const [workflowOptions, setWorkflowOptions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const filters = useMemo(() => filtersFromState(preset, workflow, customRange), [customRange, preset, workflow])

  useEffect(() => {
    if (!open) return
    let active = true
    startTransition(async () => {
      try {
        setError(null)
        const next = await loadAutomationMetricsSnapshot(filters)
        if (!active) return
        setSnapshot(next)
        setWorkflowOptions(next.workflowOptions)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Chargement des métriques impossible")
      }
    })
    return () => { active = false }
  }, [filters, open])

  const controls = (
    <div className="border-b border-white/5 px-5 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">
          Période
          <select value={preset} onChange={(event) => setPreset(event.target.value as AutomationMetricsPeriodPreset)} className="h-8 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[11px] font-medium normal-case tracking-normal text-white outline-none">
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="12w">12 semaines</option>
            <option value="year">Année</option>
            <option value="custom">Personnalisée</option>
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">
          Workflow
          <select value={workflow} onChange={(event) => setWorkflow(event.target.value)} className="h-8 max-w-60 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[11px] font-medium normal-case tracking-normal text-white outline-none">
            <option value="all">Tous les workflows</option>
            {workflowOptions.map((runType) => <option key={runType} value={runType}>{workflowLabelForRunType(runType)}</option>)}
          </select>
        </label>
        {preset === "custom" ? (
          <>
            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">
              Date de début
              <input type="date" value={customRange.from} onChange={(event) => setCustomRange((range) => ({ ...range, from: event.target.value }))} className="h-8 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[11px] font-medium normal-case tracking-normal text-white outline-none" />
            </label>
            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">
              Date de fin
              <input type="date" value={customRange.to} min={customRange.from} onChange={(event) => setCustomRange((range) => ({ ...range, to: event.target.value }))} className="h-8 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[11px] font-medium normal-case tracking-normal text-white outline-none" />
            </label>
          </>
        ) : null}
        <span className="pb-1 text-[10px] text-white/40" role="status">{pending && snapshot ? "Mise à jour…" : ""}</span>
      </div>
    </div>
  )

  const initialLoading = snapshot === null && pending
  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      {controls}
      {error ? <div role="alert" className="mx-5 mt-4 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger">{error}</div> : null}
      {initialLoading ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center gap-3">
          <i className="size-7 animate-spin rounded-full border-2 border-brand-brass border-t-transparent" />
          <p className="text-xs text-white/50">Chargement des métriques…</p>
        </div>
      ) : snapshot ? (
        <div className={`min-h-0 flex-1 overflow-y-auto transition-opacity duration-150 ${pending ? "opacity-70" : "opacity-100"}`}>
          <AutomationMetricsOverview snapshot={snapshot} />
          <p className="px-6 pb-5 text-[10px] text-white/35">Données issues de v_ai_run_costs. Les coûts incomplets restent non mesurés.</p>
        </div>
      ) : !error ? <div className="p-5 text-xs text-white/45">Aucune donnée à afficher.</div> : null}
    </div>
  )

  return (
    <IntelligenceSplitModalShell
      open={open}
      onClose={onClose}
      title="Analyse des métriques"
      subtitle="Évolution de la fiabilité, des performances et des coûts"
      leftPaneWidth="38%"
      leftPane={<AutomationMetricsNavigation />}
      rightPane={content}
    />
  )
}
