"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import type { SectionTab } from "@/lib/tabs/tab-types"
import type { MissionPlanningRow, MissionTemporalStatus } from "./mission-planning-types"
import { HeaderKpiCard } from "@/components/missions/HeaderKpiCard"
import { MissionTimelineLegend } from "./MissionTimelineLegend"
import {
  MissionTimelineTooltip,
  type MissionTooltipState,
} from "./MissionTimelineTooltip"
import {
  clampPercent,
  getDaysRemaining,
  getMissionProgress,
  getMissionTemporalStatus,
  getPersonName,
  getStatusCounts,
  parseDateOnly,
  startOfDay,
} from "./mission-planning-utils"

interface MissionPlanningDesktopProps {
  rows: MissionPlanningRow[]
}

type YearMonth = {
  key: string
  label: string
  isCurrent: boolean
}

type YearRange = {
  start: Date
  end: Date
  totalDays: number
  months: YearMonth[]
}

type BarWindow = {
  left: string
  width: string
  startsBefore: boolean
  endsAfter: boolean
  startDate: Date
  endDate: Date
}

const PLANNING_YEAR = 2026
const DAY_MS = 24 * 60 * 60 * 1000
const LABEL_COLUMN_WIDTH = 248
const MONTH_COLUMN_WIDTH = 84

const BAR_TONE_CLASSES: Record<MissionTemporalStatus, string> = {
  active: "bg-primary text-primary-fg",
  ending_soon: "bg-secondary text-secondary-fg",
  future: "bg-primary text-primary-fg",
  expired: "bg-danger text-primary-fg",
  ongoing_open_end: "bg-success text-primary-fg",
}

function differenceInDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

function formatMonthLabel(date: Date): string {
  return date
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "")
    .toUpperCase()
}

function buildYearRange(year: number, today: Date): YearRange {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)

  return {
    start,
    end,
    totalDays: differenceInDays(start, end) + 1,
    months: Array.from({ length: 12 }, (_, monthIndex) => {
      const date = new Date(year, monthIndex, 1)
      return {
        key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
        label: formatMonthLabel(date),
        isCurrent:
          today.getFullYear() === year && today.getMonth() === monthIndex,
      }
    }),
  }
}

function getPercentOffset(date: Date, rangeStart: Date, totalDays: number): number {
  return (differenceInDays(rangeStart, date) / totalDays) * 100
}

function getBarWindow(row: MissionPlanningRow, range: YearRange): BarWindow | null {
  const rawStart = parseDateOnly(row.startDate)
  const rawEnd = parseDateOnly(row.endDate)
  const startDate = rawStart ?? range.start
  const endDate = rawEnd ?? range.end

  if (endDate < startDate) return null
  if (endDate < range.start || startDate > range.end) return null

  const visibleStart = startDate < range.start ? range.start : startDate
  const visibleEnd = endDate > range.end ? range.end : endDate
  const startPct = clampPercent(getPercentOffset(visibleStart, range.start, range.totalDays))
  const endPct = clampPercent(getPercentOffset(visibleEnd, range.start, range.totalDays))
  const widthPct = Math.max(2.6, endPct - startPct)

  return {
    left: `${startPct}%`,
    width: `${Math.min(widthPct, 100 - startPct)}%`,
    startsBefore: rawStart !== null && rawStart < range.start,
    endsAfter: rawEnd === null || rawEnd > range.end,
    startDate,
    endDate,
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
    subtitle: `${getPersonName(row)} | ${row.company.name}`,
  })
}

export function MissionPlanningDesktop({ rows }: MissionPlanningDesktopProps) {
  const { openTab } = useMissionsTabStore()
  const [tooltip, setTooltip] = useState<MissionTooltipState>(null)
  const today = useMemo(() => startOfDay(new Date()), [])
  const range = useMemo(() => buildYearRange(PLANNING_YEAR, today), [today])
  const visibleRows = useMemo(
    () =>
      rows
        .map((row) => ({
          row,
          window: getBarWindow(row, range),
          status: getMissionTemporalStatus(row, today),
        }))
        .filter(
          (
            item
          ): item is {
            row: MissionPlanningRow
            window: BarWindow
            status: MissionTemporalStatus
          } => item.window !== null
        ),
    [range, rows, today]
  )
  const statusCounts = useMemo(
    () => getStatusCounts(visibleRows.map((item) => item.row), today),
    [today, visibleRows]
  )
  const gridStyle = {
    gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(${range.months.length * MONTH_COLUMN_WIDTH}px, 1fr)`,
    minWidth: `${LABEL_COLUMN_WIDTH + range.months.length * MONTH_COLUMN_WIDTH}px`,
  }
  const monthGridStyle = {
    gridTemplateColumns: `repeat(${range.months.length}, minmax(${MONTH_COLUMN_WIDTH}px, 1fr))`,
  }
  const todayOffset = getPercentOffset(today, range.start, range.totalDays)
  const showToday = todayOffset >= 0 && todayOffset <= 100
  const todayLeft = `${clampPercent(todayOffset)}%`
  const summary = useMemo(() => {
    let startsInYear = 0
    let endsInYear = 0
    let openEnded = 0

    for (const { row } of visibleRows) {
      const startDate = parseDateOnly(row.startDate)
      const endDate = parseDateOnly(row.endDate)

      if (
        startDate !== null &&
        startDate >= range.start &&
        startDate <= range.end
      ) {
        startsInYear += 1
      }

      if (
        endDate !== null &&
        endDate >= range.start &&
        endDate <= range.end
      ) {
        endsInYear += 1
      } else if (endDate === null) {
        openEnded += 1
      }
    }

    return {
      startsInYear,
      endsInYear,
      openEnded,
    }
  }, [range.end, range.start, visibleRows])

  if (visibleRows.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1640px] flex-col gap-4 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            Planning
          </h1>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-body">
            Janvier - Decembre {PLANNING_YEAR}
          </span>
        </div>

        <div className="flex min-h-[320px] items-center justify-center rounded-[20px] border border-dashed border-border bg-surface px-6 text-center">
          <div>
            <p className="text-sm font-bold text-heading">Aucune mission visible</p>
            <p className="mt-1 text-sm text-body">
              Aucun span de mission n&apos;entre dans la fenetre {PLANNING_YEAR}.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1640px] flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            Planning
          </h1>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-body">
            {PLANNING_YEAR}
          </span>
        </div>

        <div className="flex items-center divide-x divide-border/70 rounded-full border border-border bg-surface/90 px-2 py-1">
          <HeaderKpiCard label="Demarrages" value={summary.startsInYear} className="px-3 py-0.5" />
          <HeaderKpiCard label="Echeances" value={summary.endsInYear} className="px-3 py-0.5" />
          <HeaderKpiCard label="Sans fin" value={summary.openEnded} className="px-3 py-0.5" />
        </div>
      </div>

      <section className="overflow-hidden rounded-[20px] border border-border bg-surface">
        <div>
          <div className="grid" style={gridStyle}>
            <div className="sticky left-0 z-30 flex min-h-[44px] items-center border-r border-border bg-surface px-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                Mission
              </span>
            </div>

            <div className="relative border-b border-border bg-surface">
              <div className="grid" style={monthGridStyle}>
                {range.months.map((month) => (
                  <div
                    key={month.key}
                    className={cn(
                      "flex h-11 items-center justify-center border-r border-border/70 text-[10px] font-bold tracking-[0.18em] last:border-r-0",
                      month.isCurrent ? "text-primary" : "text-muted"
                    )}
                  >
                    {month.label}
                  </div>
                ))}
              </div>

              {showToday && (
                <div
                  className="absolute inset-y-0 z-20 w-px bg-danger/80"
                  style={{ left: todayLeft }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          <div>
            {visibleRows.map(({ row, window, status }) => {
              const personName = getPersonName(row)
              const progress = Math.max(0, Math.min(100, Math.round(getMissionProgress(row, today))))
              const daysRemaining = getDaysRemaining(row, today)

              return (
                <div
                  key={row.id}
                  className="group grid min-h-[60px] border-b border-border/60 last:border-b-0"
                  style={gridStyle}
                >
                  <button
                    type="button"
                    onClick={() => openMissionTab(row, openTab)}
                    className="sticky left-0 z-20 flex min-w-0 items-center border-r border-border bg-surface px-4 py-2 text-left transition-colors group-hover:bg-canvas/35"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-heading">
                        {row.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-body">
                        {personName} | {row.company.name}
                      </p>
                    </div>
                  </button>

                  <div className="relative overflow-hidden bg-surface">
                    <div
                      className="absolute inset-0 opacity-35"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                      aria-hidden="true"
                    />

                    <div className="grid absolute inset-0" style={monthGridStyle} aria-hidden="true">
                      {range.months.map((month) => (
                        <div
                          key={`${row.id}-${month.key}`}
                          className={cn(
                            "border-r border-border/70 last:border-r-0",
                            month.isCurrent ? "bg-primary/[0.03]" : ""
                          )}
                        />
                      ))}
                    </div>

                    <div
                      className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/70"
                      aria-hidden="true"
                    />

                    {showToday && (
                      <div
                        className="absolute inset-y-0 z-10 w-px bg-danger/80"
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
                          x: rect.left + rect.width / 2,
                          y: rect.top - 12,
                        })
                      }}
                      onBlur={() => setTooltip(null)}
                      className={cn(
                        "absolute top-1/2 z-20 h-4 -translate-y-1/2 rounded-full transition duration-150 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/35",
                        BAR_TONE_CLASSES[status]
                      )}
                      style={{
                        left: window.left,
                        width: window.width,
                      }}
                    >
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-heading/10"
                        style={{ width: `${progress}%` }}
                        aria-hidden="true"
                      />

                      <span
                        className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-success bg-surface"
                        aria-hidden="true"
                      />
                      <span
                        className="absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-success bg-surface"
                        aria-hidden="true"
                      />

                      <span className="relative flex h-full items-center justify-center px-3 text-[9px] font-bold tabular-nums">
                        {daysRemaining === null
                          ? `${progress}%`
                          : daysRemaining < 0
                            ? "100%"
                            : `${progress}%`}
                      </span>

                      {window.startsBefore && (
                        <span
                          className="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-surface/80"
                          aria-hidden="true"
                        />
                      )}

                      {window.endsAfter && (
                        <span
                          className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-surface/80"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <MissionTimelineLegend compact counts={statusCounts} />

      <MissionTimelineTooltip state={tooltip} today={today} />
    </div>
  )
}
