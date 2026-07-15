import {
  getTodayDateKey,
  startOfLocalDay,
  getAgendaTimeboxDateRange,
} from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import type { AgendaItem, AgendaDeepLink, AgendaPriority } from "@/lib/agenda/agenda-types"

export type AgendaMobileMode = "feed" | "calendar"

export interface AgendaMobileFilters {
  showDeadlines: boolean
  showAbsences: boolean
  showActivity: boolean
  showInternal: boolean
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
  const rawDate = toArray(searchParams.date)[0]
  const mode: AgendaMobileMode = "calendar"
  const date = isValidIsoDate(rawDate) ? rawDate : today

  const rawFilters = toArray(searchParams.filters)[0]
  let showDeadlines = true
  let showAbsences = true
  let showActivity = true
  let showInternal = true

  if (rawFilters !== undefined) {
    const active = rawFilters.split(",")
    showDeadlines = active.includes("deadlines")
    showAbsences = active.includes("absences")
    showActivity = active.includes("activity")
    showInternal = active.includes("internal")
  }

  const activeList: string[] = []
  if (showDeadlines) activeList.push("deadlines")
  if (showAbsences) activeList.push("absences")
  if (showActivity) activeList.push("activity")
  if (showInternal) activeList.push("internal")

  const canonicalQuery = new URLSearchParams()
  canonicalQuery.set("mode", mode)
  canonicalQuery.set("date", date)
  canonicalQuery.set("filters", activeList.join(","))

  const incoming = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    for (const entry of toArray(value)) {
      incoming.append(key, entry)
    }
  }

  const canonicalQueryString = canonicalQuery.toString()

  const modeMatch = incoming.get("mode") === mode
  const dateMatch = incoming.get("date") === date
  const filtersMatch = (incoming.get("filters") || "deadlines,absences,activity,internal") === activeList.join(",")

  const shouldRedirect = !modeMatch || !dateMatch || !filtersMatch

  return {
    mode,
    date,
    filters: {
      showDeadlines,
      showAbsences,
      showActivity,
      showInternal,
    },
    canonicalQueryString,
    shouldRedirect,
  }
}

export function buildAgendaMobileRange(now: string, timezone: string = AGENDA_V1_TIMEZONE) {
  const todayKey = getTodayDateKey(now, timezone)
  const fromKey = addDays(todayKey, -30)
  const toKey = addDays(todayKey, 30)

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

export function getPreFilledTaskFields(item: AgendaItem) {
  let title = `Suivi : ${item.title}`
  let entity_type: string | null = null
  let entity_id: string | null = null
  let calendar_event_id: string | null = null

  if (item.type === "scheduled_event") {
    calendar_event_id = item.sourceId
    if (item.companyId) {
      entity_type = "company"
      entity_id = item.companyId
    }
  } else if (item.type === "deadline") {
    if (item.sourceType === "opportunity") {
      entity_type = "opportunity"
      entity_id = item.sourceId
    } else if (item.sourceType === "mission") {
      entity_type = "mission"
      entity_id = item.sourceId
    } else if (item.sourceType === "candidate_hiring_milestone") {
      entity_type = "candidate_hiring_milestone"
      entity_id = item.sourceId
    }
  } else if (item.type === "alert") {
    title = `Résolution : ${item.title}`
    if (item.relatedItemIds && item.relatedItemIds.length > 0) {
      // Find the first related item, e.g., "scheduled_event:calendar_event:<uuid>"
      const firstRelated = item.relatedItemIds[0]
      const parts = firstRelated.split(":")
      const relType = parts[0]
      const relSourceType = parts[1]
      const relId = parts[2]

      if (relType === "scheduled_event") {
        calendar_event_id = relId
      } else if (relType === "deadline") {
        entity_type = relSourceType
        entity_id = relId
      } else if (relType === "task") {
        entity_type = "task"
        entity_id = relId
      }
    }
  }

  return {
    title,
    entity_type,
    entity_id,
    calendar_event_id,
    priority: "normal" as const,
    due_date: new Date().toISOString().split("T")[0],
  }
}
