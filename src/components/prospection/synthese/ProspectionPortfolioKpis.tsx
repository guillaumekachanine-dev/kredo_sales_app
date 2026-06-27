"use client"

import { KpiCard } from "@/components/ui/KpiCard"
import type { ProspectionSummaryFocusPreset } from "./synthese-view-model"
import type { ProspectionSummaryKpi } from "./synthese-view-model"

export function ProspectionPortfolioKpis({
  kpis,
  onToggleFocus,
}: {
  kpis: ProspectionSummaryKpi[]
  onToggleFocus: (focus: ProspectionSummaryFocusPreset) => void
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const descriptionId = `kpi-definition-${kpi.id}`

        return (
          <button
            key={kpi.id}
            type="button"
            aria-pressed={kpi.active}
            aria-describedby={descriptionId}
            onClick={() => onToggleFocus(kpi.active ? "all" : kpi.id)}
            className="text-left focus-visible:outline-none"
          >
            <KpiCard
              label={kpi.label}
              value={kpi.value}
              context={kpi.context}
              size="compact"
              accent={kpi.active ? "brass" : "none"}
              className={kpi.active ? "border-brand-brass/35" : undefined}
            />
            <span id={descriptionId} className="sr-only">
              {kpi.definition}
            </span>
          </button>
        )
      })}
    </div>
  )
}
