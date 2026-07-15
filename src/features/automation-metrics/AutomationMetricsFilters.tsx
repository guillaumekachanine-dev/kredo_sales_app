"use client"

import { useRef } from "react"
import { workflowLabelForRunType } from "@/lib/automations/workflow-labels"
import type { AutomationMetricsPeriodPreset, AutomationMetricsWorkflow } from "./automation-metrics-types"

export type AutomationMetricsCustomRange = { from: string; to: string }

const PERIOD_LABELS: Record<AutomationMetricsPeriodPreset, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "12w": "12 semaines",
  year: "Année",
  custom: "Personnalisée",
}

export function automationMetricsFilterSummary(
  preset: AutomationMetricsPeriodPreset,
  workflow: AutomationMetricsWorkflow,
): string {
  const workflowLabel = workflow === "all" ? "Tous les workflows" : workflowLabelForRunType(workflow)
  return `${PERIOD_LABELS[preset]} · ${workflowLabel}`
}

type AutomationMetricsFiltersProps = {
  preset: AutomationMetricsPeriodPreset
  workflow: AutomationMetricsWorkflow
  customRange: AutomationMetricsCustomRange
  workflowOptions: string[]
  pending: boolean
  hasSnapshot: boolean
  mode: "desktop" | "mobile"
  onPresetChange: (preset: AutomationMetricsPeriodPreset) => void
  onWorkflowChange: (workflow: AutomationMetricsWorkflow) => void
  onCustomRangeChange: (range: AutomationMetricsCustomRange) => void
}

function FilterFields({
  preset,
  workflow,
  customRange,
  workflowOptions,
  mode,
  onPresetChange,
  onWorkflowChange,
  onCustomRangeChange,
}: Omit<AutomationMetricsFiltersProps, "pending" | "hasSnapshot">) {
  const mobile = mode === "mobile"
  const labelClass = "grid gap-1.5 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45"
  const controlClass = `${mobile ? "min-h-11 w-full" : "h-8"} rounded-lg border border-white/10 bg-white/[.04] px-3 text-[11px] font-medium normal-case tracking-normal text-white outline-none transition-colors focus-visible:border-brand-brass/60 focus-visible:ring-2 focus-visible:ring-brand-brass/30 motion-reduce:transition-none`

  return (
    <div className={mobile ? "grid gap-3" : "flex flex-wrap items-end gap-3"}>
      <label className={labelClass}>
        Période
        <select value={preset} onChange={(event) => onPresetChange(event.target.value as AutomationMetricsPeriodPreset)} className={controlClass}>
          <option value="7d">7 jours</option>
          <option value="30d">30 jours</option>
          <option value="12w">12 semaines</option>
          <option value="year">Année</option>
          <option value="custom">Personnalisée</option>
        </select>
      </label>
      <label className={labelClass}>
        Workflow
        <select value={workflow} onChange={(event) => onWorkflowChange(event.target.value)} className={`${controlClass} ${mobile ? "" : "max-w-60"}`}>
          <option value="all">Tous les workflows</option>
          {workflowOptions.map((runType) => <option key={runType} value={runType}>{workflowLabelForRunType(runType)}</option>)}
        </select>
      </label>
      {preset === "custom" ? (
        <div className={mobile ? "grid gap-3 min-[420px]:grid-cols-2" : "contents"}>
          <label className={labelClass}>
            Date de début
            <input type="date" value={customRange.from} onChange={(event) => onCustomRangeChange({ ...customRange, from: event.target.value })} className={controlClass} />
          </label>
          <label className={labelClass}>
            Date de fin
            <input type="date" value={customRange.to} min={customRange.from} onChange={(event) => onCustomRangeChange({ ...customRange, to: event.target.value })} className={controlClass} />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export function AutomationMetricsFilters(props: AutomationMetricsFiltersProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const updating = props.pending && props.hasSnapshot

  if (props.mode === "mobile") {
    return (
      <details ref={detailsRef} className="group shrink-0 border-b border-white/5 bg-white/[0.015]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brass/50 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">Filtres</span>
            <span className="block truncate text-xs text-white/75">{automationMetricsFilterSummary(props.preset, props.workflow)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[10px] text-white/45">
            <span role="status" aria-live="polite">{updating ? "Mise à jour…" : "Modifier"}</span>
            <span className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true">⌄</span>
          </span>
        </summary>
        <div className="border-t border-white/5 px-4 py-4">
          <FilterFields {...props} />
          <button
            type="button"
            onClick={() => detailsRef.current?.removeAttribute("open")}
            className="mt-4 min-h-11 w-full rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/50 motion-reduce:transition-none"
          >
            Refermer les filtres
          </button>
        </div>
      </details>
    )
  }

  return (
    <div className="shrink-0 border-b border-white/5 px-5 py-3">
      <FilterFields {...props} />
      <span className="mt-1 block min-h-3 text-[10px] text-white/40" role="status" aria-live="polite">{updating ? "Mise à jour…" : ""}</span>
    </div>
  )
}
