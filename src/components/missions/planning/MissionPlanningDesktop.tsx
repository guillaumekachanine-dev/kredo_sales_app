"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import type { SectionTab } from "@/lib/tabs/tab-types"
import type { MissionPlanningRow, MissionTemporalStatus } from "./mission-planning-types"
import { MissionTimelineLegend } from "./MissionTimelineLegend"
import {
  MissionTimelineTooltip,
  type MissionTooltipState,
} from "./MissionTimelineTooltip"
import {
  clampPercent,
  formatDateFr,
  formatEuro,
  formatPercent,
  getDaysRemaining,
  getInitials,
  getMissionDisplayDates,
  getMissionSubtitle,
  getMissionTemporalStatus,
  getPercentOffset,
  getPersonName,
  getTimelineBarLabel,
  getTimelineRange,
  parseDateOnly,
  startOfDay,
  STATUS_BADGE_CLASSES,
  STATUS_BAR_CLASSES,
  STATUS_DOT_CLASSES,
  STATUS_LABELS,
} from "./mission-planning-utils"

interface MissionPlanningDesktopProps {
  rows: MissionPlanningRow[]
}

const LABEL_COLUMN_WIDTH = 280
const MONTH_COLUMN_WIDTH = 104

function getStatusCounts(rows: MissionPlanningRow[], today: Date) {
  return rows.reduce<Record<MissionTemporalStatus, number>>(
    (acc, row) => {
      acc[getMissionTemporalStatus(row, today)] += 1
      return acc
    },
    {
      active: 0,
      ending_soon: 0,
      future: 0,
      expired: 0,
      ongoing_open_end: 0,
    }
  )
}

function getBarMetrics(row: MissionPlanningRow, today: Date, rangeStart: Date, totalDays: number) {
  const { startDate, endDate } = getMissionDisplayDates(row, today)
  const startPct = clampPercent(getPercentOffset(startDate, rangeStart, totalDays))
  const endPct = clampPercent(getPercentOffset(endDate, rangeStart, totalDays))
  const widthPct = Math.max(1.4, endPct - startPct)

  return {
    left: `${startPct}%`,
    width: `${Math.min(widthPct, 100 - startPct)}%`,
  }
}

function getMarker(row: MissionPlanningRow, rangeStart: Date, totalDays: number) {
  const markerDate = parseDateOnly(row.renewalDate) ?? parseDateOnly(row.endDate)
  if (!markerDate) return null

  return {
    label: row.renewalDate ? "Ren." : "Fin",
    left: `${clampPercent(getPercentOffset(markerDate, rangeStart, totalDays))}%`,
  }
}

function openMissionTab(
  row: MissionPlanningRow,
  openTab: (tab: Omit<SectionTab, "id">) => void
) {
  openTab({
    entityType: "mission",
    entityId: row.id,
    title: row.title,
    subtitle: `${getPersonName(row)} · ${row.company.name}`,
  })
}

export function MissionPlanningDesktop({ rows }: MissionPlanningDesktopProps) {
  const { openTab } = useMissionsTabStore()
  const [tooltip, setTooltip] = useState<MissionTooltipState>(null)
  const today = useMemo(() => startOfDay(new Date()), [])
  const range = useMemo(() => getTimelineRange(rows, today), [rows, today])
  const statusCounts = useMemo(() => getStatusCounts(rows, today), [rows, today])
  const timelineWidth = Math.max(range.months.length, 1) * MONTH_COLUMN_WIDTH
  const minGridWidth = LABEL_COLUMN_WIDTH + timelineWidth
  const gridStyle = {
    gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(${timelineWidth}px, 1fr)`,
    minWidth: `${minGridWidth}px`,
  }
  const monthGridStyle = {
    gridTemplateColumns: `repeat(${Math.max(range.months.length, 1)}, minmax(${MONTH_COLUMN_WIDTH}px, 1fr))`,
  }
  const todayOffset = getPercentOffset(today, range.start, range.totalDays)
  const showToday = todayOffset >= 0 && todayOffset <= 100
  const todayLeft = `${clampPercent(todayOffset)}%`
  const endingSoon = rows.filter((row) => getDaysRemaining(row, today) !== null && getMissionTemporalStatus(row, today) === "ending_soon").length

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-6 py-6">
      <header className="flex items-start justify-between gap-5 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            Planning
          </h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} mission{rows.length > 1 ? "s" : ""} active{rows.length > 1 ? "s" : ""} · Période {formatDateFr(range.start)} à {formatDateFr(range.end)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px]">
          <span className="rounded border border-border bg-surface px-2.5 py-1 font-semibold text-heading">
            Aujourd&apos;hui · {formatDateFr(today)}
          </span>
          {endingSoon > 0 && (
            <span className="rounded border border-warning/20 bg-warning/10 px-2.5 py-1 font-semibold text-warning">
              {endingSoon} fin{endingSoon > 1 ? "s" : ""} proche{endingSoon > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </header>

      <MissionTimelineLegend />

      {rows.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border bg-surface/60 px-6 text-center">
          <div>
            <p className="text-sm font-bold text-heading">Aucune mission active</p>
            <p className="mt-1 text-xs text-body">
              Les missions actives apparaîtront ici dès qu&apos;elles seront créées en base.
            </p>
          </div>
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="overflow-x-auto">
            <div className="grid" style={gridStyle}>
              <div className="sticky left-0 z-30 border-r border-border bg-surface px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                Consultant · rôle · client
              </div>
              <div className="relative border-b border-border bg-canvas/60">
                <div className="grid h-full" style={monthGridStyle}>
                  {range.months.map((month) => (
                    <div
                      key={month.key}
                      className={cn(
                        "flex h-11 items-center justify-center border-r border-border/60 px-2 text-[10px] font-bold tracking-wider last:border-r-0",
                        month.isCurrent ? "bg-primary/5 text-primary" : "text-muted"
                      )}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
                {showToday && (
                  <div
                    className="absolute inset-y-0 z-20 w-0.5 bg-danger"
                    style={{ left: todayLeft }}
                    aria-hidden="true"
                  >
                    <span className="absolute left-1 top-1 rounded border border-danger/20 bg-surface px-1.5 py-0.5 text-[9px] font-bold text-danger">
                      Aujourd&apos;hui
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              {rows.map((row) => {
                const status = getMissionTemporalStatus(row, today)
                const personName = getPersonName(row)
                const marker = getMarker(row, range.start, range.totalDays)
                const barMetrics = getBarMetrics(row, today, range.start, range.totalDays)
                const daysRemaining = getDaysRemaining(row, today)

                return (
                  <div
                    key={row.id}
                    className="group grid min-h-16 border-b border-border/70 last:border-b-0 hover:bg-canvas/45"
                    style={gridStyle}
                  >
                    <button
                      type="button"
                      onClick={() => openMissionTab(row, openTab)}
                      className="sticky left-0 z-20 flex min-w-0 items-center gap-3 border-r border-border bg-surface px-4 py-3 text-left transition-colors group-hover:bg-canvas"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                        {getInitials(personName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-heading group-hover:text-primary">
                          {personName}
                        </span>
                        <span className="block truncate text-[11px] text-body">
                          {getMissionSubtitle(row)}
                        </span>
                        <span className="block truncate text-[10px] text-muted">
                          {row.company.name}
                        </span>
                      </span>
                    </button>

                    <div className="relative min-h-16">
                      <div className="grid h-full" style={monthGridStyle} aria-hidden="true">
                        {range.months.map((month) => (
                          <div
                            key={`${row.id}-${month.key}`}
                            className="border-r border-dashed border-border/70 last:border-r-0"
                          />
                        ))}
                      </div>

                      {showToday && (
                        <div
                          className="absolute inset-y-0 z-10 w-0.5 bg-danger/70"
                          style={{ left: todayLeft }}
                          aria-hidden="true"
                        />
                      )}

                      <button
                        type="button"
                        aria-label={`Ouvrir la mission ${row.title}`}
                        onClick={() => openMissionTab(row, openTab)}
                        onMouseEnter={(event) =>
                          setTooltip({
                            row,
                            status,
                            x: event.clientX,
                            y: event.clientY,
                          })
                        }
                        onMouseMove={(event) =>
                          setTooltip({
                            row,
                            status,
                            x: event.clientX,
                            y: event.clientY,
                          })
                        }
                        onMouseLeave={() => setTooltip(null)}
                        onFocus={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect()
                          setTooltip({
                            row,
                            status,
                            x: rect.left,
                            y: rect.bottom,
                          })
                        }}
                        onBlur={() => setTooltip(null)}
                        className={cn(
                          "absolute top-1/2 z-20 flex h-9 -translate-y-1/2 items-center justify-between gap-2 overflow-hidden rounded-md px-3 text-left text-[11px] font-bold transition-all duration-150 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/35 active:scale-[.99]",
                          STATUS_BAR_CLASSES[status]
                        )}
                        style={barMetrics}
                      >
                        <span className="truncate">{getTimelineBarLabel(row)}</span>
                        <span className="hidden shrink-0 tabular-nums opacity-80 min-[1200px]:inline">
                          {daysRemaining === null ? "Ouverte" : `${daysRemaining} j`}
                        </span>
                      </button>

                      {marker && (
                        <div
                          className="absolute top-1/2 z-30 h-8 w-0.5 -translate-y-1/2 rounded-full bg-danger"
                          style={{ left: marker.left }}
                          aria-hidden="true"
                        >
                          <span className="absolute -top-4 left-1 rounded bg-surface px-1 text-[9px] font-bold text-danger">
                            {marker.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-5 gap-2 border-t border-border pt-3 text-[11px]">
          {(Object.keys(STATUS_LABELS) as MissionTemporalStatus[]).map((status) => (
            <div key={status} className={cn("rounded border px-2.5 py-2", STATUS_BADGE_CLASSES[status])}>
              <div className="flex items-center gap-1.5 font-bold">
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_CLASSES[status])} />
                {STATUS_LABELS[status]}
              </div>
              <div className="mt-1 tabular-nums text-heading">{statusCounts[status]}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted">
        <span>TJM moyen · {formatEuro(rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.tjm ?? 0), 0) / rows.length) : null)}</span>
        <span>Marge moyenne · {formatPercent(rows.length ? rows.reduce((sum, row) => sum + (row.grossMarginPct ?? 0), 0) / rows.length : null)}</span>
        <span>Survoler une barre affiche le détail, cliquer ouvre la fiche mission.</span>
      </div>

      <MissionTimelineTooltip state={tooltip} today={today} />
    </div>
  )
}
