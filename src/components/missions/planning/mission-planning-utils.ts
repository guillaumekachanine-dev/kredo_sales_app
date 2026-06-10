import type {
  MissionPlanningRow,
  MissionTemporalStatus,
} from "./mission-planning-types"

const DAY_MS = 24 * 60 * 60 * 1000

export type TimelineMonth = {
  key: string
  label: string
  isCurrent: boolean
}

export type TimelineRange = {
  start: Date
  end: Date
  totalDays: number
  months: TimelineMonth[]
}

export const STATUS_LABELS: Record<MissionTemporalStatus, string> = {
  active: "En cours",
  ending_soon: "Fin proche",
  future: "Future",
  expired: "Expirée",
  ongoing_open_end: "Sans date de fin",
}

export const STATUS_DOT_CLASSES: Record<MissionTemporalStatus, string> = {
  active: "bg-success",
  ending_soon: "bg-warning",
  future: "bg-primary",
  expired: "bg-danger",
  ongoing_open_end: "bg-heading",
}

export const STATUS_BADGE_CLASSES: Record<MissionTemporalStatus, string> = {
  active: "border-success/20 bg-success/10 text-success",
  ending_soon: "border-warning/20 bg-warning/10 text-warning",
  future: "border-primary/20 bg-primary/10 text-primary",
  expired: "border-danger/20 bg-danger/10 text-danger",
  ongoing_open_end: "border-border bg-heading/5 text-heading",
}

export const STATUS_BAR_CLASSES: Record<MissionTemporalStatus, string> = {
  active: "bg-success text-primary-fg",
  ending_soon: "bg-warning text-heading",
  future: "bg-primary text-primary-fg",
  expired: "bg-danger text-primary-fg",
  ongoing_open_end: "bg-heading text-primary-fg",
}

export function parseDateOnly(value: string | null): Date | null {
  if (!value) return null

  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return startOfDay(next)
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return startOfDay(next)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function differenceInDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatMonth(date: Date): string {
  const formatted = date.toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  })
  return formatted.replace(".", "").toUpperCase()
}

export function getTimelineRange(rows: MissionPlanningRow[], today: Date): TimelineRange {
  const normalizedToday = startOfDay(today)
  const dates: Date[] = []

  for (const row of rows) {
    const startDate = parseDateOnly(row.startDate)
    const endDate = parseDateOnly(row.endDate) ?? addMonths(normalizedToday, 6)

    if (startDate) dates.push(startDate)
    dates.push(endDate)
  }

  if (dates.length === 0) {
    dates.push(normalizedToday, addMonths(normalizedToday, 6))
  }

  const start = startOfMonth(new Date(Math.min(...dates.map((date) => date.getTime()))))
  const end = endOfMonth(new Date(Math.max(...dates.map((date) => date.getTime()))))
  const months: TimelineMonth[] = []
  let cursor = startOfMonth(start)

  while (cursor <= end) {
    months.push({
      key: monthKey(cursor),
      label: formatMonth(cursor),
      isCurrent:
        cursor.getMonth() === normalizedToday.getMonth() &&
        cursor.getFullYear() === normalizedToday.getFullYear(),
    })
    cursor = addMonths(cursor, 1)
  }

  return {
    start,
    end,
    totalDays: Math.max(1, differenceInDays(start, end) + 1),
    months,
  }
}

export function getMissionTemporalStatus(
  row: MissionPlanningRow,
  today: Date
): MissionTemporalStatus {
  const normalizedToday = startOfDay(today)
  const startDate = parseDateOnly(row.startDate)
  const endDate = parseDateOnly(row.endDate)

  if (endDate && endDate < normalizedToday) return "expired"
  if (startDate && startDate > normalizedToday) return "future"
  if (!endDate) return "ongoing_open_end"
  if (endDate >= normalizedToday && endDate <= addDays(normalizedToday, 30)) {
    return "ending_soon"
  }

  return "active"
}

export function getPercentOffset(
  date: Date,
  rangeStart: Date,
  totalDays: number
): number {
  return (differenceInDays(rangeStart, date) / totalDays) * 100
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export function getMissionDisplayDates(row: MissionPlanningRow, today: Date) {
  const startDate = parseDateOnly(row.startDate) ?? startOfDay(today)
  const endDate = parseDateOnly(row.endDate) ?? addMonths(today, 6)
  return { startDate, endDate }
}

export function getMissionProgress(row: MissionPlanningRow, today: Date): number {
  const { startDate, endDate } = getMissionDisplayDates(row, today)
  const duration = Math.max(1, differenceInDays(startDate, endDate))
  const elapsed = differenceInDays(startDate, today)
  return clampPercent((elapsed / duration) * 100)
}

export function getDaysRemaining(row: MissionPlanningRow, today: Date): number | null {
  const endDate = parseDateOnly(row.endDate)
  if (!endDate) return null
  return differenceInDays(today, endDate)
}

export function formatDateFr(value: string | Date | null): string {
  const date = typeof value === "string" ? parseDateOnly(value) : value
  if (!date) return "Non renseignée"

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(".", "")
}

export function formatEuro(amount: number | null): string {
  if (amount === null || amount === undefined) return "Non renseigné"

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "Non renseignée"
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} %`
}

export function getPersonName(row: MissionPlanningRow): string {
  const person = row.collaborator?.person
  if (!person) return "Consultant non renseigné"
  const composed = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim()
  return person.fullName ?? (composed || "Consultant non renseigné")
}

export function getPersonFirstName(row: MissionPlanningRow): string {
  const person = row.collaborator?.person
  if (person?.firstName) return person.firstName
  const name = getPersonName(row)
  return name.split(" ")[0] ?? name
}

export function getInitials(fullName: string): string {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return initials.slice(0, 2) || "KR"
}

export function getTimelineBarLabel(row: MissionPlanningRow): string {
  const firstName = getPersonFirstName(row)
  if (firstName && firstName !== "Consultant") return firstName
  return row.company.name
}

export function getMissionSubtitle(row: MissionPlanningRow): string {
  const parts = [row.roleTitle, row.practice, row.seniority].filter(Boolean)
  return parts.join(" · ") || row.title
}
