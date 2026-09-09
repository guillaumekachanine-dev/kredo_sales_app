export type PlanningScale = "month" | "year"

export interface TimelineColumn {
  key: string
  label: string
  isCurrent: boolean
}

export interface TimelinePeriod {
  startMs: number
  endMs: number
  title: string
  columns: TimelineColumn[]
}

function parseDate(value: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Date invalide : ${value}`)
  return date
}

function monthName(date: Date, width: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("fr-FR", { month: width, timeZone: "UTC" }).format(date)
}

export function buildTimelinePeriod(
  scale: PlanningScale,
  anchorIso: string,
  referenceIso: string,
): TimelinePeriod {
  const anchor = parseDate(anchorIso)
  const reference = parseDate(referenceIso)
  const year = anchor.getUTCFullYear()
  const month = anchor.getUTCMonth()
  const currentYear = reference.getUTCFullYear()
  const currentMonth = reference.getUTCMonth()

  if (scale === "year") {
    const startMs = Date.UTC(year, 0, 1)
    const endMs = Date.UTC(year + 1, 0, 1)
    return {
      startMs,
      endMs,
      title: String(year),
      columns: Array.from({ length: 12 }, (_, index) => ({
        key: `${year}-${index + 1}`,
        label: monthName(new Date(Date.UTC(year, index, 1)), "short").replace(".", "").toUpperCase(),
        isCurrent: year === currentYear && index === currentMonth,
      })),
    }
  }

  const startMs = Date.UTC(year, month, 1)
  const endMs = Date.UTC(year, month + 1, 1)
  const dayCount = new Date(endMs - 1).getUTCDate()
  return {
    startMs,
    endMs,
    title: `${monthName(new Date(startMs)).toUpperCase()} ${year}`,
    columns: Array.from({ length: dayCount }, (_, index) => ({
      key: `${year}-${month + 1}-${index + 1}`,
      label: index % 7 === 0 ? String(index + 1).padStart(2, "0") : "",
      isCurrent:
        year === currentYear && month === currentMonth && index + 1 === reference.getUTCDate(),
    })),
  }
}

export function getTimelinePosition(dateIso: string, period: TimelinePeriod): number | null {
  const timestamp = Date.parse(dateIso)
  if (Number.isNaN(timestamp) || timestamp < period.startMs || timestamp >= period.endMs) return null
  return ((timestamp - period.startMs) / (period.endMs - period.startMs)) * 100
}

export function getTodayPosition(referenceIso: string, period: TimelinePeriod): number | null {
  return getTimelinePosition(referenceIso, period)
}

export function shiftTimelineAnchor(anchorIso: string, scale: PlanningScale, amount: number): string {
  const anchor = parseDate(anchorIso)
  const year = anchor.getUTCFullYear()
  const month = anchor.getUTCMonth()
  const shifted = scale === "year"
    ? new Date(Date.UTC(year + amount, month, 1))
    : new Date(Date.UTC(year, month + amount, 1))
  return shifted.toISOString()
}
