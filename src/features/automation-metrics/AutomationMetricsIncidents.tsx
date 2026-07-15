"use client"

import { AutomationIncidentParetoChart } from "./AutomationIncidentParetoChart"
import type { AutomationMetricsSnapshot } from "./automation-metrics-types"

function rounded(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

function delta(value: number | null, meaning: "failure" | "neutral"): { text: string; color: string } {
  if (value === null) return { text: "—", color: "text-white/35" }
  if (value === 0) return { text: "0 %", color: "text-white/55" }
  const positive = meaning === "failure" ? value < 0 : false
  return { text: `${value > 0 ? "+" : ""}${rounded(value)} %`, color: positive ? "text-success" : meaning === "failure" ? "text-danger" : "text-white/55" }
}

function MetricCard({ label, value, detail, comparison }: { label: string; value: string; detail: string; comparison: { text: string; color: string } }) {
  return (
    <div className="border-b border-white/8 pb-3 sm:border-b-0 sm:border-r sm:pr-4 last:border-0 last:pr-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-heading text-2xl font-bold tabular-nums text-white">{value}</p>
        <span className={`text-[10px] font-semibold tabular-nums ${comparison.color}`}>{comparison.text}</span>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-white/45">{detail}</p>
    </div>
  )
}

export function AutomationMetricsIncidents({ snapshot }: { snapshot: AutomationMetricsSnapshot }) {
  const summary = snapshot.incidentsSummary
  return (
    <div className="space-y-5 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200">
      <div>
        <h3 className="text-sm font-semibold text-white">Incidents et interventions automatiques</h3>
        <p className="mt-1 text-[11px] text-white/45">Principales causes d’échec et détection des runs bloqués</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Runs en échec" value={String(summary.failedRuns)} comparison={delta(summary.failedRunsDeltaPct, "failure")} detail="Runs failed pendant la période sélectionnée" />
        <MetricCard label="Interventions automatiques" value={String(summary.automaticInterventions)} comparison={delta(summary.automaticInterventionsDeltaPct, "neutral")} detail="Runs assainis ou repris par le mécanisme de surveillance" />
        <MetricCard label="Part traitée automatiquement" value={summary.automaticInterventionSharePct === null ? "—" : `${rounded(summary.automaticInterventionSharePct)} %`} comparison={{ text: "", color: "text-white/35" }} detail="Détection ou assainissement automatique, sans garantie de succès final" />
      </div>
      <AutomationIncidentParetoChart categories={snapshot.incidentCategories} />
      <p className="text-[10px] leading-relaxed text-white/40">Une intervention automatique détecte ou clôture un run bloqué ; elle ne prouve ni une reprise réussie, ni un incident résolu.</p>
    </div>
  )
}
