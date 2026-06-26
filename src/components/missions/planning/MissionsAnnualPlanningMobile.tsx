"use client"

import { Button } from "@/components/ui/Button"
import type { MissionPlanningRow } from "./mission-planning-types"
import {
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_TONES,
  buildMissionPlanningYearRange,
  getMissionEventLaneItems,
  getMissionPlanningRowHeight,
  getMissionPlanningSubtitle,
  getMissionWindowPosition,
  getVisibleMissionRows,
} from "./mission-annual-planning-utils"
import { formatDateFr } from "./mission-planning-utils"
import { cn } from "@/lib/utils"

interface MissionsAnnualPlanningMobileProps {
  rows: MissionPlanningRow[]
  year: number
  onOpenMission: (row: MissionPlanningRow) => void
  onOpenEvent: (eventId: string) => void
  onCreateEventForMission: (row: MissionPlanningRow) => void
}

const CATEGORY_BASE_TOP = {
  client_closure: 8,
  absence: 24,
  client_follow_up: 40,
  collaborator_follow_up: 56,
} as const

export function MissionsAnnualPlanningMobile({
  rows,
  year,
  onOpenMission,
  onOpenEvent,
  onCreateEventForMission,
}: MissionsAnnualPlanningMobileProps) {
  const range = buildMissionPlanningYearRange(year, new Date())
  const visibleRows = getVisibleMissionRows(rows, range)

  if (visibleRows.length === 0) {
    return (
      <div className="rounded-[var(--radius-medium)] border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
        Aucune mission ou aucun événement n&apos;entre dans l&apos;année sélectionnée.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {visibleRows.map((row) => {
        const laneItems = getMissionEventLaneItems(row, range)
        const missionPosition = getMissionWindowPosition(row.startDate, row.endDate, range)
        const rowHeight = getMissionPlanningRowHeight(laneItems)
        const missionTop = rowHeight - 18

        return (
          <article
            key={row.id}
            className="rounded-[var(--radius-medium)] border border-border bg-surface p-4"
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onOpenMission(row)}
                className="min-w-0 flex-1 text-left"
              >
                <h3 className="truncate text-sm font-semibold text-heading">
                  {row.title}
                </h3>
                <p className="mt-1 truncate text-xs text-body">
                  {getMissionPlanningSubtitle(row)}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {formatDateFr(row.startDate)} · {row.endDate ? formatDateFr(row.endDate) : "Fin ouverte"}
                </p>
              </button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCreateEventForMission(row)}
                leftIcon={
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                }
                className="h-8 px-2.5 text-[11px]"
              >
                Événement
              </Button>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-12 gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
                {range.months.map((month) => (
                  <span
                    key={`${row.id}-${month.key}-label`}
                    className={cn("text-center", month.isCurrent && "text-primary")}
                  >
                    {month.label.slice(0, 3)}
                  </span>
                ))}
              </div>

              <div className="relative mt-2 overflow-hidden rounded-[var(--radius-small)] border border-border/70 bg-canvas/40">
                <div className="relative" style={{ minHeight: `${rowHeight}px` }}>
                  <div className="absolute inset-0 grid grid-cols-12" aria-hidden="true">
                    {range.months.map((month) => (
                      <div
                        key={`${row.id}-${month.key}`}
                        className={cn(
                          "border-r border-border/60 last:border-r-0",
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

                    const content = (
                      <span
                        className={cn(
                          "absolute inline-flex min-h-2.5 items-center rounded-full px-1 text-[8px] font-semibold",
                          tone.barClassName,
                        )}
                        style={{
                          left: position.left,
                          width: position.width,
                          top: `${top}px`,
                        }}
                        title={`${EVENT_CATEGORY_LABELS[event.category]} · ${event.title}`}
                      />
                    )

                    if (!isClickable || !event.calendarEventId) {
                      return <span key={event.id}>{content}</span>
                    }

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onOpenEvent(event.calendarEventId!)}
                        className="contents"
                        aria-label={`Ouvrir l'événement ${event.title}`}
                      >
                        {content}
                      </button>
                    )
                  })}

                  {missionPosition ? (
                    <button
                      type="button"
                      onClick={() => onOpenMission(row)}
                      className="absolute rounded-full bg-brand-brass text-secondary-fg"
                      style={{
                        left: missionPosition.left,
                        width: missionPosition.width,
                        top: `${missionTop}px`,
                        height: "16px",
                      }}
                      aria-label={`Ouvrir la mission ${row.title}`}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
