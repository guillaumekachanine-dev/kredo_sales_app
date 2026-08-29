"use client"

import { EntityPlanningView } from "@/components/common/EntityPlanningView"
import { IconButton } from "@/components/ui/IconButton"
import type { MissionPlanningRow } from "./mission-planning-types"
import {
  EVENT_CATEGORY_TONES,
  buildMissionPlanningYearRange,
  getMissionEventLaneItems,
  getMissionPlanningRowHeight,
  getMissionPlanningSubtitle,
  getMissionWindowPosition,
  getVisibleMissionRows,
} from "./mission-annual-planning-utils"
import { cn } from "@/lib/utils"

interface MissionsAnnualPlanningDesktopProps {
  rows: MissionPlanningRow[]
  year: number
  onOpenMission: (row: MissionPlanningRow) => void
  onOpenEvent: (eventId: string) => void
  /**
   * Optionnel : quand fourni, une action « + » par ligne ouvre la création
   * d'événement (page /missions/actives). Absente sur les surfaces purement
   * analytiques (shell Engagements › Planning des AT).
   */
  onCreateEventForMission?: (row: MissionPlanningRow) => void
}

const CATEGORY_BASE_TOP = {
  client_closure: 10,
  absence: 28,
  client_follow_up: 46,
  collaborator_follow_up: 64,
} as const

export function MissionsAnnualPlanningDesktop({
  rows,
  year,
  onOpenMission,
  onOpenEvent,
  onCreateEventForMission,
}: MissionsAnnualPlanningDesktopProps) {
  const today = new Date()
  const range = buildMissionPlanningYearRange(year, today)
  const visibleRows = getVisibleMissionRows(rows, range)

  return (
    <EntityPlanningView
      rows={visibleRows}
      columns={range.months.map((month) => ({
        key: month.key,
        label: month.label,
        isCurrent: month.isCurrent,
      }))}
      getRowId={(row) => row.id}
      labelColumnHeader="Mission"
      currentMarkerLeft={range.todayLeft}
      labelColumnWidth={288}
      timelineColumnMinWidth={88}
      emptyState="Aucune mission ou aucun événement n'entre dans l'année sélectionnée."
      renderRowLabel={(row) => (
        <div className="flex min-h-full items-start gap-3">
          <button
            type="button"
            onClick={() => onOpenMission(row)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-[12px] font-semibold text-heading">
              {row.title}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-body">
              {getMissionPlanningSubtitle(row)}
            </p>
          </button>

          {onCreateEventForMission ? (
            <IconButton
              aria-label={`Créer un événement pour ${row.title}`}
              variant="ghost"
              size="sm"
              onClick={() => onCreateEventForMission(row)}
              className="size-8 border border-border text-muted hover:text-primary"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </IconButton>
          ) : null}
        </div>
      )}
      renderTimelineRow={(row) => {
        const missionPosition = getMissionWindowPosition(
          row.startDate,
          row.endDate,
          range
        )
        const laneItems = getMissionEventLaneItems(row, range)
        const rowHeight = getMissionPlanningRowHeight(laneItems)
        const missionTop = rowHeight - 18

        return (
          <div className="relative w-full" style={{ minHeight: `${rowHeight}px` }}>
            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${range.months.length}, minmax(88px, 1fr))`,
              }}
              aria-hidden="true"
            >
              {range.months.map((month) => (
                <div
                  key={`${row.id}-${month.key}`}
                  className={cn(
                    "border-r border-border/70 last:border-r-0",
                    month.isCurrent && "bg-primary/[0.03]",
                  )}
                />
              ))}
            </div>

            {range.todayLeft ? (
              <div
                className="absolute inset-y-0 z-10 w-px bg-danger/70"
                style={{ left: range.todayLeft }}
                aria-hidden="true"
              />
            ) : null}

            {laneItems.map(({ event, lane, position }) => {
              const top = CATEGORY_BASE_TOP[event.category] + lane * 12
              const tone = EVENT_CATEGORY_TONES[event.category]
              const isClickable = Boolean(event.calendarEventId)

              const eventNode = (
                <span
                  className={cn(
                    "absolute inline-flex min-h-2.5 items-center rounded-full px-1.5 text-[9px] font-semibold",
                    tone.barClassName,
                  )}
                  style={{
                    left: position.left,
                    width: position.width,
                    top: `${top}px`,
                  }}
                  title={event.title}
                >
                  <span className="truncate">{event.title}</span>
                </span>
              )

              if (!isClickable || !event.calendarEventId) {
                return <span key={event.id}>{eventNode}</span>
              }

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onOpenEvent(event.calendarEventId!)}
                  className="contents"
                  aria-label={`Ouvrir l'événement ${event.title}`}
                >
                  {eventNode}
                </button>
              )
            })}

            <div
              className="absolute inset-x-0 h-px bg-border/80"
              style={{ top: `${missionTop + 8}px` }}
              aria-hidden="true"
            />

            {missionPosition ? (
              <button
                type="button"
                onClick={() => onOpenMission(row)}
                aria-label={`Ouvrir la mission ${row.title}`}
                className="absolute z-20 rounded-full bg-brand-brass text-secondary-fg transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{
                  left: missionPosition.left,
                  width: missionPosition.width,
                  top: `${missionTop}px`,
                  height: "16px",
                }}
              >
                <span
                  className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-brass bg-surface"
                  aria-hidden="true"
                />
                {row.endDate ? (
                  <span
                    className="absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-brass bg-surface"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="absolute right-1 top-1/2 h-1.5 w-3 -translate-y-1/2 rounded-full bg-secondary-fg/85"
                    aria-hidden="true"
                  />
                )}
              </button>
            ) : null}
          </div>
        )
      }}
    />
  )
}
