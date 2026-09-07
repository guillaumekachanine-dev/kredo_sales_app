import type {
  MissionPlanningRow,
  MissionPlanningTimelineEvent,
  MissionPlanningTimelineEventCategory,
} from "./mission-planning-types"
import {
  clampPercent,
  getPersonName,
  parseDateOnly,
  startOfDay,
} from "./mission-planning-utils"

const DAY_MS = 24 * 60 * 60 * 1000

export type MissionPlanningYearRange = {
  year: number
  start: Date
  end: Date
  totalDays: number
  todayLeft: string | null
  months: Array<{
    key: string
    label: string
    isCurrent: boolean
  }>
}

export type MissionTimelinePosition = {
  left: string
  width: string
  startsBefore: boolean
  endsAfter: boolean
}

export type MissionPlanningEventLaneItem = {
  event: MissionPlanningTimelineEvent
  lane: number
  position: MissionTimelinePosition
}

export const EVENT_CATEGORY_LABELS: Record<
  MissionPlanningTimelineEventCategory,
  string
> = {
  absence: "Congés",
  client_closure: "Fermetures client",
  client_follow_up: "Suivi client",
  collaborator_follow_up: "Suivi collaborateur",
  project_milestone: "Jalons & échéances",
  project_phase: "Phases projet",
}

export const EVENT_CATEGORY_TONES: Record<
  MissionPlanningTimelineEventCategory,
  {
    barClassName: string
    dotClassName: string
    badgeClassName: string
  }
> = {
  absence: {
    barClassName: "bg-warning/75 border border-warning/25",
    dotClassName: "bg-warning",
    badgeClassName: "bg-warning/10 text-warning border-warning/20",
  },
  client_closure: {
    barClassName: "bg-heading/20 border border-border",
    dotClassName: "bg-heading",
    badgeClassName: "bg-heading/10 text-heading border-border",
  },
  client_follow_up: {
    barClassName: "bg-primary/75 border border-primary/25",
    dotClassName: "bg-primary",
    badgeClassName: "bg-primary/10 text-primary border-primary/20",
  },
  collaborator_follow_up: {
    barClassName: "bg-success/75 border border-success/25",
    dotClassName: "bg-success",
    badgeClassName: "bg-success/10 text-success border-success/20",
  },
  project_milestone: {
    barClassName: "bg-brand-ember/90 border border-brand-ember/40 text-white font-bold",
    dotClassName: "bg-brand-ember",
    badgeClassName: "bg-brand-ember/10 text-brand-ember border-brand-ember/25",
  },
  project_phase: {
    barClassName: "bg-primary/25 border border-primary/45 text-primary font-medium",
    dotClassName: "bg-primary",
    badgeClassName: "bg-primary/10 text-primary border-primary/25",
  },
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

export function buildMissionPlanningYearRange(
  year: number,
  today: Date
): MissionPlanningYearRange {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const totalDays = differenceInDays(start, end) + 1
  const currentOffset =
    today.getFullYear() === year
      ? clampPercent((differenceInDays(start, today) / totalDays) * 100)
      : null

  return {
    year,
    start,
    end,
    totalDays,
    todayLeft: currentOffset === null ? null : `${currentOffset}%`,
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

export function getMissionWindowPosition(
  startDateValue: string | null,
  endDateValue: string | null,
  range: MissionPlanningYearRange
): MissionTimelinePosition | null {
  const startDate = parseDateOnly(startDateValue) ?? range.start
  const endDate = parseDateOnly(endDateValue) ?? range.end

  if (endDate < startDate) return null
  if (endDate < range.start || startDate > range.end) return null

  const visibleStart = startDate < range.start ? range.start : startDate
  const visibleEnd = endDate > range.end ? range.end : endDate
  const startPct = clampPercent(
    (differenceInDays(range.start, visibleStart) / range.totalDays) * 100
  )
  const endPct = clampPercent(
    (differenceInDays(range.start, visibleEnd) / range.totalDays) * 100
  )
  const widthPct = Math.max(1.6, endPct - startPct)

  return {
    left: `${startPct}%`,
    width: `${Math.min(widthPct, 100 - startPct)}%`,
    startsBefore: Boolean(startDateValue) && startDate < range.start,
    endsAfter: endDateValue === null || endDate > range.end,
  }
}

function intersectsYear(
  startDateValue: string,
  endDateValue: string | null,
  range: MissionPlanningYearRange
) {
  const startDate = parseDateOnly(startDateValue)
  const endDate = parseDateOnly(endDateValue) ?? startDate
  if (!startDate || !endDate) return false
  return !(endDate < range.start || startDate > range.end)
}

function sortByStart(left: MissionPlanningTimelineEvent, right: MissionPlanningTimelineEvent) {
  if (left.startDate === right.startDate) return left.id.localeCompare(right.id)
  return left.startDate.localeCompare(right.startDate)
}

export function getVisibleMissionRows(
  rows: MissionPlanningRow[],
  range: MissionPlanningYearRange
) {
  return rows.filter((row) => {
    if (row.startDate && intersectsYear(row.startDate, row.endDate, range)) {
      return true
    }

    return row.timelineEvents.some((event) =>
      intersectsYear(event.startDate, event.endDate, range)
    )
  })
}

export function getMissionEventLaneItems(
  row: MissionPlanningRow,
  range: MissionPlanningYearRange
): MissionPlanningEventLaneItem[] {
  const visibleEvents = row.timelineEvents
    .filter((event) => intersectsYear(event.startDate, event.endDate, range))
    .sort(sortByStart)

  const grouped = new Map<
    MissionPlanningTimelineEventCategory,
    MissionPlanningTimelineEvent[]
  >()

  for (const event of visibleEvents) {
    const existing = grouped.get(event.category)
    if (existing) {
      existing.push(event)
    } else {
      grouped.set(event.category, [event])
    }
  }

  const items: MissionPlanningEventLaneItem[] = []

  grouped.forEach((events) => {
    const laneEndDates: Date[] = []

    for (const event of events) {
      const position = getMissionWindowPosition(
        event.startDate,
        event.endDate,
        range
      )
      const startDate = parseDateOnly(event.startDate)
      const endDate = parseDateOnly(event.endDate) ?? startDate

      if (!position || !startDate || !endDate) continue

      let lane = 0
      while (lane < laneEndDates.length && startDate <= laneEndDates[lane]) {
        lane += 1
      }

      laneEndDates[lane] = endDate
      items.push({ event, lane, position })
    }
  })

  return items
}

export function getMissionPlanningRowHeight(
  laneItems: MissionPlanningEventLaneItem[]
) {
  const baseLanes = 2
  const laneCount = laneItems.reduce(
    (maxLane, item) => Math.max(maxLane, item.lane + 1),
    0
  )

  return Math.max(80, 28 + Math.max(baseLanes, laneCount) * 16 + 18)
}

export function getMissionPlanningLegendCounts(
  rows: MissionPlanningRow[],
  range: MissionPlanningYearRange
) {
  return rows.reduce<Record<MissionPlanningTimelineEventCategory, number>>(
    (accumulator, row) => {
      for (const event of row.timelineEvents) {
        if (!intersectsYear(event.startDate, event.endDate, range)) continue
        accumulator[event.category] += 1
      }
      return accumulator
    },
    {
      absence: 0,
      client_closure: 0,
      client_follow_up: 0,
      collaborator_follow_up: 0,
      project_milestone: 0,
      project_phase: 0,
    }
  )
}

export function getMissionPlanningSubtitle(row: MissionPlanningRow) {
  if (row.engagementType === "project") {
    const progressText =
      row.progressPct !== null && row.progressPct !== undefined
        ? ` · ${row.progressPct}% avancement`
        : ""
    return `${row.company.name}${progressText}`
  }
  return `${getPersonName(row)} · ${row.company.name}`
}

