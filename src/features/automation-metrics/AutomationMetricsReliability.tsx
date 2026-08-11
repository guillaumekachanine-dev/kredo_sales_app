"use client"

import { AutomationWorkflowReliabilityChart } from "./AutomationWorkflowReliabilityChart"
import type { AutomationMetricsSnapshot } from "./automation-metrics-types"

export function AutomationMetricsReliability({ snapshot, appearance = "dark" }: { snapshot: AutomationMetricsSnapshot; appearance?: "dark" | "light" }) {
  return (
    <div className={`space-y-5 p-4 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none motion-reduce:duration-0 ${appearance === "light" ? "bg-canvas" : ""}`}>
      <div>
        <h3 className={`text-sm font-semibold ${appearance === "light" ? "text-heading" : "text-white"}`}>Fiabilité par workflow</h3>
        <p className={`mt-1 text-[11px] ${appearance === "light" ? "text-muted" : "text-white/45"}`}>Part des exécutions réussies et échouées sur la période sélectionnée</p>
      </div>
      <AutomationWorkflowReliabilityChart workflows={snapshot.workflowReliability} appearance={appearance} />
      <p className={`text-[10px] leading-relaxed ${appearance === "light" ? "text-muted" : "text-white/40"}`}>Un échantillon limité signale un taux calculé sur moins de cinq runs décidés ; il est informatif, sans prétendre à une robustesse statistique.</p>
    </div>
  )
}
