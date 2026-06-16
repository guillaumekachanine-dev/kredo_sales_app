import { cn } from "@/lib/utils"
import type { MissionPlanningRow, MissionTemporalStatus } from "./mission-planning-types"
import {
  formatDateFr,
  formatEuro,
  formatPercent,
  getMissionSubtitle,
  getPersonName,
  STATUS_LABELS,
} from "./mission-planning-utils"

export type MissionTooltipState = {
  row: MissionPlanningRow
  status: MissionTemporalStatus
  x: number
  y: number
} | null

interface MissionTimelineTooltipProps {
  state: MissionTooltipState
  today: Date
}

function getTooltipPosition(x: number, y: number) {
  if (typeof window === "undefined") {
    return { left: x, top: y }
  }

  const width = 290
  const height = 144
  const padding = 18

  return {
    left: Math.max(
      padding,
      Math.min(x - width / 2, window.innerWidth - width - padding)
    ),
    top: Math.max(padding, Math.min(y - height - 18, window.innerHeight - height - padding)),
  }
}

export function MissionTimelineTooltip(props: MissionTimelineTooltipProps) {
  const { state } = props
  if (!state) return null

  const { row, status, x, y } = state
  const position = getTooltipPosition(x, y)
  const quarterRevenue = row.lastQuarterRevenue?.revenue

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-[290px] rounded-[14px] bg-heading px-4 py-3 text-primary-fg shadow-2xl"
      style={position}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold text-primary-fg">{row.title}</p>
          <p className="mt-1 truncate text-[10px] text-primary-fg/70">
            {getPersonName(row)} | {row.company.name}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-fg/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary-fg/85">
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-[10px] text-primary-fg/88">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-primary-fg/58">{getMissionSubtitle(row)}</span>
          <span className="shrink-0">
            {formatDateFr(row.startDate)} - {row.endDate ? formatDateFr(row.endDate) : "Ouverte"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-primary-fg/10 pt-2">
          <span>TJM {formatEuro(row.tjm)}</span>
          <span>Marge {formatPercent(row.grossMarginPct)}</span>
          <span>
            CA {quarterRevenue ? formatEuro(quarterRevenue) : "n/a"}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-heading"
        )}
        aria-hidden="true"
      />
    </div>
  )
}
