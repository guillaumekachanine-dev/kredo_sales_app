import type { MissionPlanningRow } from "./mission-planning-types"
import {
  buildMissionPlanningYearRange,
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_TONES,
  getMissionPlanningLegendCounts,
} from "./mission-annual-planning-utils"

interface MissionAnnualPlanningLegendProps {
  rows: MissionPlanningRow[]
  year: number
}

const LEGEND_ORDER = [
  "absence",
  "client_closure",
  "client_follow_up",
  "collaborator_follow_up",
  "project_milestone",
  "project_phase",
] as const

export function MissionAnnualPlanningLegend({
  rows,
  year,
}: MissionAnnualPlanningLegendProps) {
  const counts = getMissionPlanningLegendCounts(
    rows,
    buildMissionPlanningYearRange(year, new Date())
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-border/60 py-2 text-[11px] text-body">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-semibold text-heading">Événements :</span>
        {LEGEND_ORDER.map((category) => (
          <span key={category} className="inline-flex items-center gap-1.5">
            <span
              className={`size-2.5 rounded-sm ${EVENT_CATEGORY_TONES[category].dotClassName}`}
              aria-hidden="true"
            />
            <span>
              {EVENT_CATEGORY_LABELS[category]} ({counts[category]})
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-brand-brass" aria-hidden="true" />
          <span className="font-medium text-body">Mission AT</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-primary" aria-hidden="true" />
          <span className="font-medium text-body">Projet forfait</span>
        </span>
      </div>
    </div>
  )
}
