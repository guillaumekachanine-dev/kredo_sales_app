"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { loadAutomationMetricsSnapshot } from "./automation-metrics-actions"
import { AutomationMetricsFilters } from "./AutomationMetricsFilters"
import { AutomationMetricsMobileLayout } from "./AutomationMetricsMobileLayout"
import { AutomationMetricsNavigation } from "./AutomationMetricsNavigation"
import { AutomationMetricsOverview } from "./AutomationMetricsOverview"
import { AutomationMetricsCosts } from "./AutomationMetricsCosts"
import { AutomationMetricsIncidents } from "./AutomationMetricsIncidents"
import { AutomationMetricsPerformance } from "./AutomationMetricsPerformance"
import { AutomationMetricsReliability } from "./AutomationMetricsReliability"
import type {
  AutomationMetricsFilters as AutomationMetricsFilterValues,
  AutomationMetricsPeriodPreset,
  AutomationMetricsSectionId,
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
): AutomationMetricsFilterValues {
  const range = preset === "custom"
    ? { from: dateFromInput(customRange.from), to: new Date(dateFromInput(customRange.to).getTime() + DAY_MS) }
    : rangeForPreset(preset)
  return { from: range.from.toISOString(), to: range.to.toISOString(), preset, workflow }
}

function initialCustomRange() {
  const range = rangeForPreset("30d")
  return { from: toDateInput(range.from), to: toDateInput(range.to) }
}

export type AutomationMetricsDisplayMode = "desktop" | "mobile"

export function AutomationMetricsModal({
  open,
  onClose,
  displayMode = "desktop",
}: {
  open: boolean
  onClose: () => void
  displayMode?: AutomationMetricsDisplayMode
}) {
  const [preset, setPreset] = useState<AutomationMetricsPeriodPreset>("30d")
  const [section, setSection] = useState<AutomationMetricsSectionId>("overview")
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
    <AutomationMetricsFilters
      preset={preset}
      workflow={workflow}
      customRange={customRange}
      workflowOptions={workflowOptions}
      pending={pending}
      hasSnapshot={snapshot !== null}
      mode={displayMode}
      onPresetChange={setPreset}
      onWorkflowChange={setWorkflow}
      onCustomRangeChange={setCustomRange}
    />
  )

  const initialLoading = snapshot === null && error === null
  const panel = snapshot
    ? section === "reliability"
      ? <AutomationMetricsReliability snapshot={snapshot} />
      : section === "performance"
        ? <AutomationMetricsPerformance snapshot={snapshot} />
        : section === "costs"
          ? <AutomationMetricsCosts snapshot={snapshot} />
          : section === "incidents"
            ? <AutomationMetricsIncidents snapshot={snapshot} />
        : <AutomationMetricsOverview snapshot={snapshot} />
    : null
  const panelContent = (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {initialLoading ? "Chargement des métriques" : pending ? "Mise à jour des métriques" : snapshot ? "Métriques à jour" : ""}
      </span>
      {error ? <div role="alert" className="mx-5 mt-4 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger">{error}</div> : null}
      {initialLoading ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center gap-3" aria-busy="true">
          <i className="size-7 animate-spin rounded-full border-2 border-brand-brass border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-xs text-white/50">Chargement des métriques…</p>
        </div>
      ) : snapshot ? (
        <div aria-busy={pending || undefined} className={`transition-opacity duration-150 motion-reduce:transition-none ${pending ? "opacity-70" : "opacity-100"}`}>
          {panel}
          <p className="px-4 pb-5 text-[10px] text-white/35 sm:px-6">Données issues de v_ai_run_costs et, pour les incidents, des runs failed de ai_intelligence_runs. Les coûts incomplets restent non mesurés.</p>
        </div>
      ) : !error ? <div className="p-5 text-xs text-white/45">Aucune donnée à afficher.</div> : null}
    </>
  )

  const desktopContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      {controls}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {panelContent}
      </div>
    </div>
  )

  const mobileContent = (
    <AutomationMetricsMobileLayout section={section} onSectionChange={setSection} filters={controls} pending={pending}>
      {panelContent}
    </AutomationMetricsMobileLayout>
  )

  return (
    <IntelligenceSplitModalShell
      open={open}
      onClose={onClose}
      title="Analyse des métriques"
      subtitle="Évolution de la fiabilité, des performances et des coûts"
      leftPaneWidth="38%"
      leftPane={<AutomationMetricsNavigation section={section} onChange={setSection} />}
      rightPane={desktopContent}
      content={displayMode === "mobile" ? mobileContent : undefined}
      isMobile={displayMode === "mobile"}
    />
  )
}
