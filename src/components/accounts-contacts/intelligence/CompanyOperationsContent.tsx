"use client"

import { useState } from "react"
import type { CompanyOperationalSnapshot } from "@/lib/intelligence/client-intelligence-company"
import { cn } from "@/lib/utils"

type OperationsView = "activities" | "stakeholders" | "workload"

const VIEW_LABELS: Array<{ key: OperationsView; label: string }> = [
  { key: "activities", label: "Activités" },
  { key: "stakeholders", label: "Interlocuteurs" },
  { key: "workload", label: "Répartition de la charge" },
]

const SEGMENT_TONES = [
  "bg-primary",
  "bg-brand-brass",
  "bg-success",
  "bg-warning",
  "bg-secondary",
  "bg-muted",
]

function ActivitiesView({ data }: { data: CompanyOperationalSnapshot }) {
  if (data.departments.length === 0) {
    return <p className="text-xs italic text-muted">Cartographie des activités non disponible dans cet audit.</p>
  }
  return (
    <div className="space-y-5">
      {data.departments.map((department) => (
        <article key={department.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading">{department.label}</h3>
              {department.description && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-body">{department.description}</p>}
            </div>
            <span className="shrink-0 font-mono text-[10px] text-muted">{department.activities.length} activité{department.activities.length > 1 ? "s" : ""}</span>
          </div>
          <div className="mt-3 overflow-hidden border border-border">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-canvas/60 text-[10px] font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="w-20 px-3 py-2">Réf.</th>
                  <th className="px-3 py-2">Activité</th>
                  <th className="w-32 px-3 py-2">Charge source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {department.activities.map((activity, index) => (
                  <tr key={`${department.id}-${activity.code ?? activity.label}-${index}`}>
                    <td className="px-3 py-3 font-mono text-[11px] font-bold text-heading">{activity.code ?? "—"}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-heading">{activity.label}</p>
                      {activity.description && <p className="mt-1 leading-relaxed text-body">{activity.description}</p>}
                    </td>
                    <td className="px-3 py-3 font-semibold text-body">{activity.workloadLabel ?? "Non renseigné"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </div>
  )
}

function StakeholdersView({ data }: { data: CompanyOperationalSnapshot }) {
  if (data.stakeholders.length === 0) {
    return <p className="text-xs italic text-muted">Cartographie des interlocuteurs non disponible dans cet audit.</p>
  }
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[780px] border-collapse text-left text-xs">
        <thead className="bg-canvas/60 text-[10px] font-bold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2">Département</th>
            <th className="px-3 py-2">Interlocuteur</th>
            <th className="px-3 py-2">Nature de l’interaction</th>
            <th className="px-3 py-2">Fréquence</th>
            <th className="px-3 py-2">Friction</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.stakeholders.map((item, index) => (
            <tr key={`${item.department}-${item.stakeholder}-${index}`}>
              <td className="px-3 py-3 font-semibold text-heading">{item.department}</td>
              <td className="px-3 py-3 text-body">{item.stakeholder}</td>
              <td className="px-3 py-3 text-body">{item.interactionNature ?? "—"}</td>
              <td className="px-3 py-3 text-body">{item.frequency ?? "—"}</td>
              <td className="px-3 py-3 text-body">{item.friction ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WorkloadView({ data }: { data: CompanyOperationalSnapshot }) {
  if (data.workload.functions.length === 0) {
    return <p className="text-xs italic text-muted">Répartition de la charge non disponible dans cet audit.</p>
  }
  return (
    <div className="space-y-5">
      {data.workload.primaryFinding && (
        <div className="border-l-2 border-brand-brass bg-canvas/45 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Constat principal</p>
          <p className="mt-1 text-xs leading-relaxed text-body">{data.workload.primaryFinding}</p>
        </div>
      )}
      <div className="space-y-5">
        {data.workload.functions.map((row) => {
          const allPercentagesAreExact = row.segments.every((segment) => segment.percentageValue !== null)
          return (
            <div key={row.functionLabel}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-heading">{row.functionLabel}</p>
                {!allPercentagesAreExact && <span className="text-[10px] text-muted">Largeurs indicatives — plages source conservées</span>}
              </div>
              <div className="flex min-h-8 w-full overflow-hidden rounded border border-border bg-canvas" role="img" aria-label={`Répartition de charge pour ${row.functionLabel}`}>
                {row.segments.map((segment, index) => (
                  <div
                    key={`${row.functionLabel}-${segment.category}`}
                    className={cn("flex min-w-0 items-center justify-center border-r border-surface/50 px-1.5 text-center text-[9px] font-bold text-primary-fg last:border-r-0", SEGMENT_TONES[index % SEGMENT_TONES.length])}
                    style={allPercentagesAreExact
                      ? { width: `${segment.percentageValue}%` }
                      : { flex: "1 1 0%" }}
                    title={`${segment.categoryLabel} · ${segment.label}${segment.percentageLabel ? ` · ${segment.percentageLabel}` : ""}`}
                  >
                    <span className="truncate">{segment.percentageLabel ?? segment.categoryLabel}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {row.segments.map((segment, index) => (
                  <div key={`${row.functionLabel}-${segment.category}-legend`} className="flex items-start gap-2 text-[10px] leading-relaxed text-body">
                    <span className={cn("mt-1 size-2 shrink-0 rounded-sm", SEGMENT_TONES[index % SEGMENT_TONES.length])} />
                    <span><strong>{segment.categoryLabel}</strong> — {segment.label}{segment.percentageLabel ? ` (${segment.percentageLabel})` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CompanyOperationsContent({
  data,
  auditAvailable,
  onOpenAudit,
}: {
  data: CompanyOperationalSnapshot
  auditAvailable: boolean
  onOpenAudit: () => void
}) {
  const [activeView, setActiveView] = useState<OperationsView>("activities")

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <nav aria-label="Vues du diagnostic opérationnel" className="flex flex-wrap gap-1">
          {VIEW_LABELS.map((view) => (
            <button
              key={view.key}
              type="button"
              onClick={() => setActiveView(view.key)}
              className={cn(
                "min-h-9 border-b-2 px-3 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                activeView === view.key
                  ? "border-brand-brass text-heading"
                  : "border-transparent text-muted hover:text-heading",
              )}
              aria-current={activeView === view.key ? "page" : undefined}
            >
              {view.label}
            </button>
          ))}
        </nav>
        {auditAvailable && (
          <button
            type="button"
            onClick={onOpenAudit}
            className="inline-flex min-h-9 items-center rounded border border-border bg-surface px-3 text-[11px] font-bold text-body transition-colors hover:border-primary/45 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            Consulter l’audit complet
          </button>
        )}
      </div>

      {activeView === "activities" ? <ActivitiesView data={data} /> : null}
      {activeView === "stakeholders" ? <StakeholdersView data={data} /> : null}
      {activeView === "workload" ? <WorkloadView data={data} /> : null}
    </div>
  )
}
