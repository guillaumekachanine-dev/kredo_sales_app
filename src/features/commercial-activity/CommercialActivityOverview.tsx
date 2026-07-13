"use client"

import { useState } from "react"
import { COMMERCIAL_ACTIVITY_NATURE_LABELS } from "./commercial-activity-category"
import type { CommercialActivityMetric, CommercialActivitySnapshot } from "./commercial-activity-types"

const COLORS = ["var(--color-dataviz-1)", "var(--color-dataviz-2)", "var(--color-dataviz-4)", "var(--color-dataviz-5)", "var(--color-dataviz-6)"]

function compact(value: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value) }
function comparison(value: number | null) { return value === null ? "—" : `${value > 0 ? "+" : ""}${compact(value)} %` }

function MetricCard({ label, value, suffix, comparison: valueComparison }: { label: string; value: number; suffix?: string; comparison: number | null }) {
  return <div className="border-b border-white/8 pb-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p><div className="mt-2 flex items-baseline justify-between gap-2"><p className="font-heading text-2xl font-bold tabular-nums text-white">{compact(value)}{suffix}</p><span className={`text-[10px] font-semibold tabular-nums ${valueComparison !== null && valueComparison < 0 ? "text-status-danger" : "text-brand-brass"}`}>{comparison(valueComparison)}</span></div></div>
}

export function CommercialActivityOverview({ snapshot }: { snapshot: CommercialActivitySnapshot }) {
  const [metric, setMetric] = useState<CommercialActivityMetric>("volume")
  const maximum = Math.max(1, ...snapshot.timeline.map((point) => metric === "volume" ? point.completedCount + point.plannedCount : point.completedHours + point.plannedHours))
  return <div className="space-y-6 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200">
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Activités réalisées" value={snapshot.summary.completedActivities} comparison={snapshot.summary.comparison.completedActivitiesPct} /><MetricCard label="Temps mobilisé" value={snapshot.summary.completedHours} suffix=" h" comparison={snapshot.summary.comparison.completedHoursPct} /><MetricCard label="Comptes activés" value={snapshot.summary.activeAccounts} comparison={snapshot.summary.comparison.activeAccountsPct} /></div>
    <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-white">Activité dans le temps</h3><p className="mt-1 text-[11px] text-white/45">Le planifié reste distinct du réalisé.</p></div><div className="flex rounded-lg border border-white/10 p-0.5 text-[10px]"><button type="button" onClick={() => setMetric("volume")} className={`rounded-md px-2.5 py-1.5 ${metric === "volume" ? "bg-white/10 text-white" : "text-white/50"}`}>Volume</button><button type="button" onClick={() => setMetric("hours")} className={`rounded-md px-2.5 py-1.5 ${metric === "hours" ? "bg-white/10 text-white" : "text-white/50"}`}>Temps</button></div></div>
    <div className="overflow-x-auto"><div className="flex h-56 min-w-[520px] items-end gap-2 border-b border-white/10 pb-7" role="img" aria-label="Activité commerciale réalisée et planifiée par période">
      {snapshot.timeline.map((point) => { const complete = metric === "volume" ? point.completedCount : point.completedHours; const planned = metric === "volume" ? point.plannedCount : point.plannedHours; return <div key={point.key} className="group relative flex h-full min-w-0 flex-1 items-end gap-1"><div className="flex h-full flex-1 flex-col justify-end overflow-hidden rounded-t-sm bg-white/[0.05]" title={`${point.label}: ${compact(complete)} réalisé`}>
        {Object.entries(point.byNature).map(([nature, data], index) => <span key={nature} className="block min-h-px transition-[height] duration-300" style={{ height: `${((metric === "volume" ? data.count : data.hours) / maximum) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }} aria-label={`${COMMERCIAL_ACTIVITY_NATURE_LABELS[nature as keyof typeof COMMERCIAL_ACTIVITY_NATURE_LABELS]} : ${compact(metric === "volume" ? data.count : data.hours)}`} />)}
      </div><div className="w-[28%] rounded-t-sm border border-dashed border-white/25 bg-white/[0.08] transition-[height] duration-300" style={{ height: `${(planned / maximum) * 100}%` }} title={`${point.label}: ${compact(planned)} planifié`} /><span className="absolute -bottom-5 left-0 right-0 truncate text-center text-[9px] text-white/40">{point.label}</span></div> })}
    </div></div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/55">{Object.entries(COMMERCIAL_ACTIVITY_NATURE_LABELS).map(([nature, label], index) => <span key={nature} className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm" style={{ backgroundColor: COLORS[index] }} />{label}</span>)}<span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm border border-dashed border-white/40 bg-white/[0.08]" />Planifié</span></div>
  </div>
}
