import { cn } from "@/lib/utils"
import type { MissionPlanningRow, MissionTemporalStatus } from "./mission-planning-types"
import {
  formatDateFr,
  formatEuro,
  formatPercent,
  getDaysRemaining,
  getMissionSubtitle,
  getPersonName,
  STATUS_BADGE_CLASSES,
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

function formatDaysRemaining(days: number | null): string {
  if (days === null) return "Fin non renseignée"
  if (days < 0) return `Expirée depuis ${Math.abs(days)} j`
  if (days === 0) return "Fin aujourd'hui"
  return `${days} j restants`
}

export function MissionTimelineTooltip({ state, today }: MissionTimelineTooltipProps) {
  if (!state) return null

  const { row, status, x, y } = state
  const revenue = row.lastQuarterRevenue

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-[280px] rounded-lg border border-border bg-surface px-3.5 py-3 text-xs text-body"
      style={{
        left: x + 14,
        top: y + 14,
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-heading">
            {getPersonName(row)}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">{row.company.name}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold",
            STATUS_BADGE_CLASSES[status]
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5">
        <span className="text-muted">Rôle</span>
        <span className="font-medium text-heading">{getMissionSubtitle(row)}</span>

        <span className="text-muted">Practice</span>
        <span>{[row.practice, row.seniority].filter(Boolean).join(" · ") || "Non renseignée"}</span>

        <span className="text-muted">Début</span>
        <span className="tabular-nums">{formatDateFr(row.startDate)}</span>

        <span className="text-muted">Fin</span>
        <span className="tabular-nums">{row.endDate ? formatDateFr(row.endDate) : "Fin non renseignée"}</span>

        <span className="text-muted">TJM</span>
        <span className="tabular-nums">{formatEuro(row.tjm)}</span>

        <span className="text-muted">TACI</span>
        <span className="tabular-nums">{formatEuro(row.taci)}</span>

        <span className="text-muted">Marge brute</span>
        <span className="tabular-nums">{formatPercent(row.grossMarginPct)}</span>

        <span className="text-muted">CA trimestre</span>
        <span className="tabular-nums">
          {revenue?.revenue ? `${formatEuro(revenue.revenue)}${revenue.quarterLabel ? ` · ${revenue.quarterLabel}` : ""}` : "Non renseigné"}
        </span>

        <span className="text-muted">Échéance</span>
        <span className="tabular-nums">{formatDaysRemaining(getDaysRemaining(row, today))}</span>
      </div>
    </div>
  )
}
