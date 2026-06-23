/**
 * Date and calendar helper functions for Kredo Agenda.
 * All computations fallback to Europe/Paris timezone.
 */

export const TIMEZONE_FALLBACK = "Europe/Paris"

export function getStartOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = result.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
  result.setDate(diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function getDaysOfWeek(startOfWeek: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    days.push(d)
  }
  return days
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function getMonthGrid(date: Date): Date[] {
  const start = getStartOfMonth(date)
  const end = getEndOfMonth(date)

  // Start of grid should be the Monday of the week of start
  const startDay = start.getDay()
  const startOffset = startDay === 0 ? -6 : 1 - startDay
  const gridStart = new Date(start)
  gridStart.setDate(start.getDate() + startOffset)
  gridStart.setHours(0, 0, 0, 0)

  // End of grid should be the Sunday of the week of end
  const endDay = end.getDay()
  const endOffset = endDay === 0 ? 0 : 7 - endDay
  const gridEnd = new Date(end)
  gridEnd.setDate(end.getDate() + endOffset)
  gridEnd.setHours(23, 59, 59, 999)

  const days: Date[] = []
  const current = new Date(gridStart)
  while (current <= gridEnd) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE_FALLBACK,
  })
}

export function formatDateRangeLabel(view: "week" | "month", referenceDate: Date): string {
  if (view === "month") {
    return referenceDate.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
      timeZone: TIMEZONE_FALLBACK,
    }).replace(/^\w/, (c) => c.toUpperCase())
  } else {
    const monday = getStartOfWeek(referenceDate)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    const sameMonth = monday.getMonth() === friday.getMonth()
    const sameYear = monday.getFullYear() === friday.getFullYear()

    const optionsDayMonth: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: TIMEZONE_FALLBACK }
    const optionsDayMonthYear: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: TIMEZONE_FALLBACK }

    if (sameYear) {
      if (sameMonth) {
        const monthLabel = monday.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: TIMEZONE_FALLBACK })
        return `${monday.getDate()} au ${friday.getDate()} ${monthLabel}`
      } else {
        return `${monday.toLocaleDateString("fr-FR", optionsDayMonth)} au ${friday.toLocaleDateString("fr-FR", optionsDayMonthYear)}`
      }
    } else {
      return `${monday.toLocaleDateString("fr-FR", optionsDayMonthYear)} au ${friday.toLocaleDateString("fr-FR", optionsDayMonthYear)}`
    }
  }
}

/**
 * Checks if two dates represent the same day.
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Safe conversion to ISO string in Europe/Paris local representation.
 */
export function getLocalIsoDateString(date: Date): string {
  // Returns 'YYYY-MM-DD'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
