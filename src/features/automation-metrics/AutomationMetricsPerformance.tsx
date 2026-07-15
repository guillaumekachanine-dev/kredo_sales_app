"use client"

import { useMemo, useState } from "react"
import { AutomationWorkflowLatencyChart } from "./AutomationWorkflowLatencyChart"
import { sortWorkflowPerformance } from "./automation-metrics-model"
import type { AutomationMetricsPerformanceSort, AutomationMetricsSnapshot } from "./automation-metrics-types"

export function AutomationMetricsPerformance({ snapshot }: { snapshot: AutomationMetricsSnapshot }) {
  const [sort, setSort] = useState<AutomationMetricsPerformanceSort>("p95")
  const workflows = useMemo(() => sortWorkflowPerformance(snapshot.workflowPerformance, sort), [snapshot.workflowPerformance, sort])

  return (
    <div className="space-y-5 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Performance par workflow</h3>
          <p className="mt-1 text-[11px] text-white/45">Écart entre la latence habituelle et les exécutions les plus lentes</p>
        </div>
        <div role="group" className="rounded-lg border border-white/10 p-0.5 text-[10px]" aria-label="Trier les workflows par">
          <button type="button" onClick={() => setSort("p95")} aria-pressed={sort === "p95"} className={`rounded-md px-2.5 py-1.5 ${sort === "p95" ? "bg-white/10 text-white" : "text-white/50"}`}>Latence p95</button>
          <button type="button" onClick={() => setSort("measuredVolume")} aria-pressed={sort === "measuredVolume"} className={`rounded-md px-2.5 py-1.5 ${sort === "measuredVolume" ? "bg-white/10 text-white" : "text-white/50"}`}>Volume mesuré</button>
        </div>
      </div>
      <AutomationWorkflowLatencyChart workflows={workflows} />
      <p className="text-[10px] leading-relaxed text-white/40">La même échelle s’applique à tous les workflows visibles. Les durées absentes restent non mesurées ; elles ne sont jamais remplacées par zéro.</p>
    </div>
  )
}
