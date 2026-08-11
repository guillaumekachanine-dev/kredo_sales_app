"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { ErrorState } from "@/components/ui/ErrorState"
import { cn } from "@/lib/utils"
import { loadAutomationMetricsSnapshot } from "@/features/automation-metrics/automation-metrics-actions"
import type { AutomationMetricsFilters, AutomationMetricsSnapshot } from "@/features/automation-metrics/automation-metrics-types"
import { fetchFilteredRunJournal } from "@/lib/automations/run-journal-actions"
import type { AutomationsDashboardData, RunJournalRow } from "@/lib/automations/automations-data"
import { workflowLabelForRunType } from "@/lib/automations/workflow-labels"
import { formatCostEstimate } from "./automations-status"
import { RunDrillDownDialog } from "./RunDrillDownDialog"
import { AutomationMetricsReliability } from "@/features/automation-metrics/AutomationMetricsReliability"
import { AutomationMetricsCosts } from "@/features/automation-metrics/AutomationMetricsCosts"

type MobileSection = "logs" | "reliability" | "costs"
type MobilePreset = "today" | "7d" | "30d" | "12w" | "year" | "custom"

const MOBILE_SECTIONS: Array<{ id: MobileSection; label: string }> = [
  { id: "logs", label: "Logs" },
  { id: "reliability", label: "Fiabilité" },
  { id: "costs", label: "Coûts" },
]

const DAY_MS = 86_400_000

function rangeForMobilePreset(preset: Exclude<MobilePreset, "custom">) {
  const now = new Date()
  if (preset === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const to = new Date(from.getTime() + DAY_MS)
    return { from, to }
  }
  const to = now
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "12w" ? 84 : 365
  return { from: new Date(to.getTime() - days * DAY_MS), to }
}

function toMetricsFilterState(
  mobilePreset: MobilePreset,
  workflow: string,
  customRange: { from: string; to: string }
): AutomationMetricsFilters {
  if (mobilePreset === "custom") {
    return {
      preset: "custom",
      from: new Date(`${customRange.from}T00:00:00.000Z`).toISOString(),
      to: new Date(new Date(`${customRange.to}T00:00:00.000Z`).getTime() + DAY_MS).toISOString(),
      workflow
    }
  }
  const range = rangeForMobilePreset(mobilePreset)
  if (mobilePreset === "today") {
    return { preset: "custom", from: range.from.toISOString(), to: range.to.toISOString(), workflow }
  }
  return { preset: mobilePreset as any, from: range.from.toISOString(), to: range.to.toISOString(), workflow }
}

function costKpiLabel(preset: MobilePreset) {
  switch (preset) {
    case "today": return { main: "Coûts (aujourd'hui)", vs: "vs veille" }
    case "7d": return { main: "Coûts (7 derniers jours)", vs: "vs 7j précédents" }
    case "30d": return { main: "Coûts (30 derniers jours)", vs: "vs 30j précédents" }
    case "12w": return { main: "Coûts (12 dernières semaines)", vs: "vs 12 semaines précédentes" }
    case "year": return { main: "Coûts (année)", vs: "vs période annuelle précédente" }
    case "custom": return { main: "Coûts (période)", vs: "vs période précédente" }
  }
}

export function AutomationsMobileDashboard({ data }: { data: AutomationsDashboardData }) {
  const [activeSection, setActiveSection] = useState<MobileSection>("logs")
  
  // Filters
  const [preset, setPreset] = useState<MobilePreset>("30d")
  const [workflow, setWorkflow] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [customRange, setCustomRange] = useState({ from: "", to: "" }) 
  
  const [snapshot, setSnapshot] = useState<AutomationMetricsSnapshot | null>(null)
  const [journal, setJournal] = useState<RunJournalRow[]>([])
  const [workflowOptions, setWorkflowOptions] = useState<string[]>(data.workflows.map(w => w.runType))
  
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  
  const filters = useMemo(() => toMetricsFilterState(preset, workflow, customRange), [preset, workflow, customRange])
  
  useEffect(() => {
    let active = true
    startTransition(async () => {
      try {
        setError(null)
        const [nextSnapshot, nextJournalRes] = await Promise.all([
          loadAutomationMetricsSnapshot(filters),
          fetchFilteredRunJournal({
            from: filters.from,
            to: filters.to,
            workflow: filters.workflow,
            status: status
          })
        ])
        if (!active) return
        setSnapshot(nextSnapshot)
        if (nextJournalRes.ok) {
          setJournal(nextJournalRes.rows.filter(r => r.status === "succeeded" || r.status === "failed"))
        } else {
          setError(nextJournalRes.error)
        }
        
        const options = Array.from(new Set([...data.workflows.map(w => w.runType), ...nextSnapshot.workflowOptions]))
        setWorkflowOptions(options.sort((a, b) => a.localeCompare(b)))
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Erreur de chargement")
      }
    })
    return () => { active = false }
  }, [filters, status, data.workflows])

  useEffect(() => {
    if (activeSection !== "logs" && status !== "all") {
      setStatus("all")
    }
  }, [activeSection, status])

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const selectedRun = useMemo(() => journal.find(r => r.id === selectedRunId) ?? null, [journal, selectedRunId])

  // KPIs
  const renderKpi = () => {
    if (!snapshot) return null
    if (activeSection === "logs") {
      const rate = snapshot.summary.successRatePct
      return (
        <div className="flex min-h-[56px] flex-col justify-center bg-surface-hover/50 px-4 py-2">
          <p className="text-[16px] font-bold text-heading">
            Taux de réussite : {rate !== null ? `${Math.round(rate * 10) / 10} %` : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {snapshot.summary.executions} runs · {snapshot.summary.succeeded} succès · {snapshot.summary.failed} échecs
          </p>
        </div>
      )
    }
    if (activeSection === "reliability") {
      const critCurrent = snapshot.workflowReliability.filter(w => w.successRatePct !== null && w.successRatePct < 70).length
      const critPrev = snapshot.workflowReliability.filter(w => w.previousSuccessRatePct !== null && w.previousSuccessRatePct < 70).length
      const delta = snapshot.workflowReliability.some(w => w.previousSuccessRatePct !== null) ? critCurrent - critPrev : null
      const deltaText = delta === null ? "— vs période précédente" : delta > 0 ? `+${delta} vs période précédente` : delta < 0 ? `${delta} vs période précédente` : "Identique vs période précédente"
      const deltaColor = delta === null || delta === 0 ? "text-muted" : delta < 0 ? "text-success" : "text-danger"
      
      return (
        <div className="flex min-h-[56px] flex-col justify-center bg-surface-hover/50 px-4 py-2">
          <p className="text-[16px] font-bold text-heading">
            Santé critiques : {critCurrent} workflows
          </p>
          <p className={`mt-0.5 text-[11px] ${deltaColor}`}>
            {deltaText}
          </p>
        </div>
      )
    }
    if (activeSection === "costs") {
      const labels = costKpiLabel(preset)
      const costDelta = snapshot.costsSummary.measuredCostDeltaPct
      const deltaText = costDelta === null ? "Historique insuffisant pour comparer" : costDelta > 0 ? `+${costDelta.toFixed(1)} % ${labels.vs}` : `${costDelta.toFixed(1)} % ${labels.vs}`
      return (
        <div className="flex min-h-[56px] flex-col justify-center bg-surface-hover/50 px-4 py-2">
          <p className="text-[16px] font-bold text-heading">
            {labels.main} : {formatCostEstimate(snapshot.costsSummary.measuredCost)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {deltaText}
          </p>
        </div>
      )
    }
  }

  const formatRunDate = (iso: string) => {
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${day}/${month}/${year} - ${hours}.${minutes}`
  }

  return (
    <div className="flex h-[calc(100dvh-var(--layout-mobile-content-bottom-offset)-var(--space-3))] min-h-0 flex-col overflow-hidden bg-canvas text-body">
      <div className="shrink-0 bg-surface px-4 pb-3 pt-4">
        <MobilePageHeader
          title="Automatisations"
          className="gap-0 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:leading-7"
        />
      </div>

      <nav className="grid shrink-0 grid-cols-3 border-y border-border bg-surface" aria-label="Navigation Automatisations">
        {MOBILE_SECTIONS.map((sec) => {
          const active = activeSection === sec.id
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative min-h-12 px-2 text-sm font-semibold text-heading outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                active ? "bg-primary/[0.04] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-brand-brass" : "hover:bg-surface-hover/60",
              )}
            >
              {sec.label}
            </button>
          )
        })}
      </nav>

      <div className="shrink-0 border-b border-border bg-surface p-2">
        <div className="grid grid-cols-3 gap-2">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as MobilePreset)}
            className="h-11 w-full truncate rounded-md border border-border bg-canvas px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-heading"
          >
            <option value="today">Jour</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="12w">12 semaines</option>
            <option value="year">Année</option>
            {preset === "custom" && <option value="custom">Personnalisée</option>}
          </select>
          <select
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
            className="h-11 w-full truncate rounded-md border border-border bg-canvas px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-heading"
          >
            <option value="all">Tous</option>
            {workflowOptions.map(opt => (
              <option key={opt} value={opt}>{workflowLabelForRunType(opt)}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 w-full truncate rounded-md border border-border bg-canvas px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-heading"
          >
            <option value="all">Tous</option>
            <option value="succeeded">Succès</option>
            <option value="failed">Échecs</option>
          </select>
        </div>
      </div>

      <div className="shrink-0 border-b border-border bg-surface">
        {renderKpi()}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface relative" aria-busy={pending}>
        {pending && <div className="absolute inset-0 z-10 bg-surface/50 transition-opacity duration-200" />}
        {error ? (
          <div className="p-4"><ErrorState title="Erreur" message={error} /></div>
        ) : activeSection === "logs" ? (
          <div className="flex flex-col pb-[calc(80px+env(safe-area-inset-bottom))]">
            {journal.length === 0 && !pending ? (
              <div className="py-12 text-center text-sm text-muted">Aucune exécution sur cette période.</div>
            ) : (
              <div className="relative pl-6 pr-2">
                <div className="absolute left-[13px] top-0 bottom-0 w-[1px] bg-border" />
                {journal.map((run) => (
                  <div key={run.id} className="relative border-b border-border py-4 last:border-b-0">
                    <div className={cn("absolute -left-[18px] top-[22px] size-2.5 rounded-full border-2 border-surface", run.status === "succeeded" ? "bg-success" : "bg-danger")} />
                    <button
                      type="button"
                      onClick={() => setSelectedRunId(run.id)}
                      className="flex w-full items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-heading text-left"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-sm font-bold leading-tight text-heading">
                          {run.runTypeLabel}{run.companyName ? ` — ${run.companyName}` : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {run.runType} · {formatRunDate(run.createdAt)}
                        </p>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center text-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeSection === "reliability" ? (
          <div className="pb-[calc(80px+env(safe-area-inset-bottom))]">
            {snapshot?.workflowReliability.length === 0 && !pending ? (
              <div className="py-12 text-center text-sm text-muted">Aucune donnée de fiabilité sur cette période.</div>
            ) : snapshot ? (
              <AutomationMetricsReliability snapshot={snapshot} appearance="light" />
            ) : null}
          </div>
        ) : activeSection === "costs" ? (
          <div className="pb-[calc(80px+env(safe-area-inset-bottom))]">
            {snapshot?.workflowCosts.length === 0 && !pending ? (
              <div className="py-12 text-center text-sm text-muted">Aucune donnée de coût mesurée sur cette période.</div>
            ) : snapshot ? (
              <AutomationMetricsCosts snapshot={snapshot} appearance="light" />
            ) : null}
          </div>
        ) : null}
      </main>

      <RunDrillDownDialog
        run={selectedRun}
        open={selectedRunId !== null}
        onOpenChange={(open) => { if (!open) setSelectedRunId(null) }}
        onRetried={() => setSelectedRunId(null)}
      />
    </div>
  )
}
