import { AGENDA_V1_TIMEZONE } from "./agenda-thresholds"
import type {
  AgendaBusinessStatus,
  AgendaItem,
  AgendaPriority,
  AgendaTemporalState,
  AgendaTimebox,
} from "./agenda-types"

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const zonedFormatterCache = new Map<string, Intl.DateTimeFormat>()

function getZonedFormatter(timezone: string) {
  const key = timezone || AGENDA_V1_TIMEZONE
  const existing = zonedFormatterCache.get(key)
  if (existing) return existing

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: key,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })

  zonedFormatterCache.set(key, formatter)
  return formatter
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part ?? "", 10))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`Invalid date-only value: ${value}`)
  }
  return { year, month, day }
}

function addDays(date: string, offset: number) {
  const { year, month, day } = parseDateOnly(date)
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`
}

export function getZonedParts(input: string | Date, timezone = AGENDA_V1_TIMEZONE): ZonedParts {
  const date = typeof input === "string" ? new Date(input) : input
  const parts = getZonedFormatter(timezone).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? "", 10)

  const hour = read("hour")

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: hour === 24 ? 0 : hour,
    minute: read("minute"),
    second: read("second"),
  }
}

export function getLocalDateKey(input: string | Date, timezone = AGENDA_V1_TIMEZONE) {
  const parts = getZonedParts(input, timezone)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

export function getTodayDateKey(now: string, timezone = AGENDA_V1_TIMEZONE) {
  return getLocalDateKey(now, timezone)
}

export function zonedDateTimeToUtc(
  value: {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
    second?: number
    millisecond?: number
  },
  timezone = AGENDA_V1_TIMEZONE,
) {
  const hour = value.hour ?? 0
  const minute = value.minute ?? 0
  const second = value.second ?? 0
  const millisecond = value.millisecond ?? 0
  const targetUtc = Date.UTC(value.year, value.month - 1, value.day, hour, minute, second)

  let candidate = targetUtc
  for (let index = 0; index < 4; index += 1) {
    const current = getZonedParts(new Date(candidate), timezone)
    const currentUtc = Date.UTC(
      current.year,
      current.month - 1,
      current.day,
      current.hour,
      current.minute,
      current.second,
    )
    const diff = targetUtc - currentUtc
    if (diff === 0) break
    candidate += diff
  }

  return new Date(candidate + millisecond)
}

export function startOfLocalDay(date: string, timezone = AGENDA_V1_TIMEZONE) {
  const parts = parseDateOnly(date)
  return zonedDateTimeToUtc(parts, timezone)
}

export function endOfLocalDayInclusive(date: string, timezone = AGENDA_V1_TIMEZONE) {
  return new Date(startOfLocalDay(addDays(date, 1), timezone).getTime() - 1)
}

export function localDateToDeadlineAt(date: string, timezone = AGENDA_V1_TIMEZONE) {
  return endOfLocalDayInclusive(date, timezone).toISOString()
}

export function localDateToMilestoneAt(date: string, timezone = AGENDA_V1_TIMEZONE) {
  return startOfLocalDay(date, timezone).toISOString()
}

export function getWeekStartDateKey(date: string) {
  const { year, month, day } = parseDateOnly(date)
  const current = new Date(Date.UTC(year, month - 1, day))
  const weekDay = current.getUTCDay()
  const offset = weekDay === 0 ? -6 : 1 - weekDay
  current.setUTCDate(current.getUTCDate() + offset)
  return `${current.getUTCFullYear()}-${pad2(current.getUTCMonth() + 1)}-${pad2(current.getUTCDate())}`
}

export function enumerateDateRange(startDate: string, endDate: string) {
  const dates: string[] = []
  let cursor = startDate

  while (cursor <= endDate) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return dates
}

export function compareDateKeys(left: string, right: string) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function isDateWithinInclusiveRange(date: string, startDate: string, endDate: string) {
  return compareDateKeys(date, startDate) >= 0 && compareDateKeys(date, endDate) <= 0
}

export function getAgendaTimeboxPrimaryAt(
  timebox: AgendaTimebox,
  timezone = timebox.timezone || AGENDA_V1_TIMEZONE,
) {
  switch (timebox.kind) {
    case "slot":
      return timebox.startAt
    case "deadline":
    case "milestone":
      return timebox.at
    case "all_day":
      return startOfLocalDay(timebox.date, timezone).toISOString()
    case "all_day_range":
      return startOfLocalDay(timebox.startDate, timezone).toISOString()
  }
}

export function getAgendaTimeboxEndExclusiveAt(
  timebox: AgendaTimebox,
  timezone = timebox.timezone || AGENDA_V1_TIMEZONE,
) {
  switch (timebox.kind) {
    case "slot":
      return timebox.endAt
    case "deadline":
    case "milestone":
      return new Date(timebox.at).toISOString()
    case "all_day":
      return startOfLocalDay(addDays(timebox.date, 1), timezone).toISOString()
    case "all_day_range":
      return startOfLocalDay(addDays(timebox.endDate, 1), timezone).toISOString()
  }
}

export function getAgendaTimeboxDateRange(
  timebox: AgendaTimebox,
  timezone = timebox.timezone || AGENDA_V1_TIMEZONE,
) {
  switch (timebox.kind) {
    case "slot": {
      const endExclusive = new Date(new Date(timebox.endAt).getTime() - 1)
      return {
        startDate: getLocalDateKey(timebox.startAt, timezone),
        endDate: getLocalDateKey(endExclusive, timezone),
      }
    }
    case "deadline":
    case "milestone": {
      const date = getLocalDateKey(timebox.at, timezone)
      return { startDate: date, endDate: date }
    }
    case "all_day":
      return { startDate: timebox.date, endDate: timebox.date }
    case "all_day_range":
      return { startDate: timebox.startDate, endDate: timebox.endDate }
  }
}

export function isBusinessStatusClosed(status: AgendaBusinessStatus) {
  return status === "completed" || status === "cancelled"
}

export function normalizeAgendaPriority(value: string | null | undefined): AgendaPriority {
  const normalized = (value ?? "").trim().toLowerCase()

  if (["urgent", "critique", "critical"].includes(normalized)) return "urgent"
  if (["high", "haute", "haut", "elevated"].includes(normalized)) return "high"
  if (["low", "basse", "bas"].includes(normalized)) return "low"

  return "normal"
}

export function normalizeAgendaBusinessStatus(value: string | null | undefined): AgendaBusinessStatus {
  const normalized = (value ?? "").trim().toLowerCase()

  if (!normalized) return "unknown"
  if (["done", "fait", "completed", "complete", "closed", "hired", "valide"].includes(normalized)) {
    return "completed"
  }
  if (["cancelled", "canceled", "annule", "annulée", "abandonne", "abandoned", "withdrawn"].includes(normalized)) {
    return "cancelled"
  }
  if (["active", "in_progress", "in progress", "ongoing", "scheduled", "confirmed"].includes(normalized)) {
    return "in_progress"
  }
  if (["open", "todo", "to_do", "pending", "planned", "en_attente"].includes(normalized)) {
    return "pending"
  }

  return "unknown"
}

export function computeAgendaTemporalState(
  timebox: AgendaTimebox,
  now: string,
  businessStatus: AgendaBusinessStatus,
  timezone = timebox.timezone || AGENDA_V1_TIMEZONE,
): AgendaTemporalState {
  const nowDate = new Date(now)
  const today = getTodayDateKey(now, timezone)

  switch (timebox.kind) {
    case "slot": {
      const start = new Date(timebox.startAt)
      const end = new Date(timebox.endAt)
      if (start <= nowDate && end > nowDate) return "ongoing"
      if (end <= nowDate) return "past"
      return getLocalDateKey(timebox.startAt, timezone) === today ? "today" : "upcoming"
    }
    case "all_day":
      if (timebox.date < today) return "past"
      if (timebox.date > today) return "upcoming"
      return "today"
    case "all_day_range":
      if (today < timebox.startDate) return "upcoming"
      if (today > timebox.endDate) return "past"
      return "ongoing"
    case "deadline":
    case "milestone": {
      const at = new Date(timebox.at)
      if (!isBusinessStatusClosed(businessStatus) && at < nowDate) return "overdue"
      const itemDate = getLocalDateKey(timebox.at, timezone)
      if (itemDate === today) return "today"
      if (at < nowDate) return "past"
      return "upcoming"
    }
  }
}

export function compareAgendaItems(left: AgendaItem, right: AgendaItem) {
  const leftAt = getAgendaTimeboxPrimaryAt(left.timebox)
  const rightAt = getAgendaTimeboxPrimaryAt(right.timebox)

  if (leftAt !== rightAt) return leftAt.localeCompare(rightAt)
  if (left.priority !== right.priority) {
    const weight = { urgent: 0, high: 1, normal: 2, low: 3 } satisfies Record<AgendaPriority, number>
    return weight[left.priority] - weight[right.priority]
  }
  return left.id.localeCompare(right.id)
}

export function isAgendaActionable(item: AgendaItem) {
  if (isBusinessStatusClosed(item.businessStatus)) return false
  return item.type === "task" || item.type === "deadline" || item.type === "alert"
}

export function isAgendaAllDayLaneItem(item: AgendaItem, timezone = item.timebox.timezone || AGENDA_V1_TIMEZONE) {
  if (item.timebox.kind === "all_day" || item.timebox.kind === "all_day_range") return true
  if (item.timebox.kind !== "slot") return false

  return getLocalDateKey(item.timebox.startAt, timezone) !== getLocalDateKey(
    new Date(new Date(item.timebox.endAt).getTime() - 1),
    timezone,
  )
}
