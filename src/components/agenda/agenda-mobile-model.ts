import {
  getTodayDateKey,
  startOfLocalDay,
  getAgendaTimeboxDateRange,
} from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import type { AgendaItem, AgendaDeepLink, AgendaPriority } from "@/lib/agenda/agenda-types"

export type AgendaMobileMode = "feed" | "calendar"

export interface AgendaMobileFilters {
  type: string
  company: string
  task: string
}

export interface AgendaMobileRouteState {
  mode: AgendaMobileMode
  date: string
  filters: AgendaMobileFilters
  canonicalQueryString: string
  shouldRedirect: boolean
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}

export function addDays(date: string, offset: number): string {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part ?? "", 10))
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`
}

function isValidIsoDate(value: string | undefined): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

export function parseAgendaMobileRouteState(
  searchParams: Record<string, string | string[] | undefined>,
  now: string,
  timezone: string = AGENDA_V1_TIMEZONE,
): AgendaMobileRouteState {
  const today = getTodayDateKey(now, timezone)
  
  const rawView = toArray(searchParams.view)[0]
  const rawMode = toArray(searchParams.mode)[0]
  const rawDate = toArray(searchParams.date)[0]

  let mode: AgendaMobileMode = "feed"
  if (rawMode === "feed" || rawMode === "calendar") {
    mode = rawMode
  } else if (rawView === "day") {
    mode = "calendar"
  } else if (rawView === "week" || rawView === "month") {
    mode = "feed"
  }

  const date = isValidIsoDate(rawDate) ? rawDate : today

  const type = toArray(searchParams.type)[0] || "all"
  const company = toArray(searchParams.company)[0] || "all"
  const task = toArray(searchParams.task)[0] || "all"

  const canonicalQuery = new URLSearchParams()
  canonicalQuery.set("mode", mode)
  canonicalQuery.set("date", date)
  if (type !== "all") canonicalQuery.set("type", type)
  if (company !== "all") canonicalQuery.set("company", company)
  if (task !== "all") canonicalQuery.set("task", task)

  const incoming = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    for (const entry of toArray(value)) {
      incoming.append(key, entry)
    }
  }

  const canonicalQueryString = canonicalQuery.toString()

  const hasView = incoming.has("view")
  const modeMatch = incoming.get("mode") === mode
  const dateMatch = incoming.get("date") === date
  const typeMatch = (incoming.get("type") || "all") === type
  const companyMatch = (incoming.get("company") || "all") === company
  const taskMatch = (incoming.get("task") || "all") === task

  const shouldRedirect = hasView || !modeMatch || !dateMatch || !typeMatch || !companyMatch || !taskMatch

  return {
    mode,
    date,
    filters: {
      type,
      company,
      task,
    },
    canonicalQueryString,
    shouldRedirect,
  }
}

export function buildAgendaMobileRange(now: string, timezone: string = AGENDA_V1_TIMEZONE) {
  const todayKey = getTodayDateKey(now, timezone)
  const fromKey = addDays(todayKey, -30)
  const toKey = addDays(todayKey, 62)

  const from = startOfLocalDay(fromKey, timezone).toISOString()
  const to = startOfLocalDay(addDays(toKey, 1), timezone).toISOString()

  return {
    from,
    to,
  }
}

export function formatMobileTimeLabel(item: AgendaItem, timezone: string = AGENDA_V1_TIMEZONE): string {
  switch (item.timebox.kind) {
    case "slot": {
      const start = new Date(item.timebox.startAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      })
      const end = new Date(item.timebox.endAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      })
      return `${start} → ${end}`
    }
    case "deadline":
      return "Date limite"
    case "milestone":
      return "Jalon"
    case "all_day":
      return "Toute la journée"
    case "all_day_range":
      return `${item.timebox.startDate} → ${item.timebox.endDate}`
  }
}

export function formatMobileDateLabel(item: AgendaItem, timezone: string = AGENDA_V1_TIMEZONE): string {
  const { startDate, endDate } = getAgendaTimeboxDateRange(item.timebox, timezone)

  if (startDate === endDate) {
    return startOfLocalDay(startDate, timezone).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: timezone,
    })
  }

  const start = startOfLocalDay(startDate, timezone).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  })
  const end = startOfLocalDay(endDate, timezone).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  })

  return `${start} → ${end}`
}

export function getMobilePrimaryDeepLinks(item: AgendaItem): AgendaDeepLink[] {
  const links: AgendaDeepLink[] = [item.primaryLink]
  for (const link of item.relatedLinks) {
    if (!links.some((existing) => existing.href === link.href)) {
      links.push(link)
    }
  }
  return links
}

export function getMobileTemporalStateLabel(item: AgendaItem) {
  switch (item.temporalState) {
    case "overdue":
      return "En retard"
    case "ongoing":
      return "En cours"
    case "today":
      return "Aujourd’hui"
    case "upcoming":
      return "À venir"
    case "past":
      return "Passé"
  }
}

export function getMobileBusinessStatusLabel(item: AgendaItem) {
  switch (item.businessStatus) {
    case "pending":
      return "Prévu"
    case "in_progress":
      return "En cours"
    case "completed":
      return "Terminé"
    case "cancelled":
      return "Annulé"
    case "unknown":
      return "Statut inconnu"
  }
}

export function getMobilePriorityLabel(priority: AgendaPriority) {
  switch (priority) {
    case "high":
      return "Haute"
    case "normal":
      return "Normale"
    case "low":
      return "Basse"
  }
}

export function getMobileSourceLabel(source: string) {
  const SOURCE_LABELS: Record<string, string> = {
    calendar_event: "Agenda",
    task: "Tâche",
    mission: "Mission",
    opportunity: "Opportunité",
    candidate_hiring_milestone: "Recrutement",
    collaborator_absence: "Absence",
    client_closure: "Fermeture client",
    derived: "Alerte système",
  }
  return SOURCE_LABELS[source] ?? source
}
