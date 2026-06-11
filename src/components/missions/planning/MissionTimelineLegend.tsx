import { cn } from "@/lib/utils"
import {
  STATUS_DOT_CLASSES,
  STATUS_LABELS,
} from "./mission-planning-utils"
import type { MissionTemporalStatus } from "./mission-planning-types"

const legendStatuses: MissionTemporalStatus[] = [
  "active",
  "ending_soon",
  "future",
  "ongoing_open_end",
]

interface MissionTimelineLegendProps {
  compact?: boolean
  counts?: Record<MissionTemporalStatus, number>
}

export function MissionTimelineLegend({ compact = false, counts }: MissionTimelineLegendProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-body",
        compact ? "justify-start" : "justify-between"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {legendStatuses.map((status) => {
          const count = counts?.[status] ?? 0
          return (
            <span key={status} className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-sm shrink-0",
                  STATUS_DOT_CLASSES[status]
                )}
              />
              {STATUS_LABELS[status]} {counts ? `(${count})` : ""}
            </span>
          )
        })}
      </div>
    </div>
  )
}
