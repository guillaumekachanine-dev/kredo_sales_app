"use client"

import { AutomationWorkflowReliabilityChart } from "./AutomationWorkflowReliabilityChart"
import type { AutomationMetricsSnapshot } from "./automation-metrics-types"

export function AutomationMetricsReliability({ snapshot }: { snapshot: AutomationMetricsSnapshot }) {
  return (
    <div className="space-y-5 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200">
      <div>
        <h3 className="text-sm font-semibold text-white">Fiabilité par workflow</h3>
        <p className="mt-1 text-[11px] text-white/45">Part des exécutions réussies et échouées sur la période sélectionnée</p>
      </div>
      <AutomationWorkflowReliabilityChart workflows={snapshot.workflowReliability} />
      <p className="text-[10px] leading-relaxed text-white/40">Un échantillon limité signale un taux calculé sur moins de cinq runs décidés ; il est informatif, sans prétendre à une robustesse statistique.</p>
    </div>
  )
}
