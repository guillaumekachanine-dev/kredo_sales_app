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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-body">
      {LEGEND_ORDER.map((category) => (
        <span key={category} className="inline-flex items-center gap-2">
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
  )
}
