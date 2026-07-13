import type { AgendaDeepLink, AgendaItem } from "@/lib/agenda/agenda-types"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"

export const DAY_MS = 24 * 60 * 60 * 1000

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function daysBetween(from: string | Date, to: string | Date): number {
  const fromDate = typeof from === "string" ? parseDate(from) : from
  const toDate = typeof to === "string" ? parseDate(to) : to
  if (!fromDate || !toDate) return Number.POSITIVE_INFINITY
  return Math.ceil((toDate.getTime() - fromDate.getTime()) / DAY_MS)
}

export function daysSince(value: string | null | undefined, now: Date): number | null {
  const date = parseDate(value)
  if (!date) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS))
}

export function asNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function uniqueDefined(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

export function formatDayCount(days: number): string {
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return "demain"
  return `dans ${days} jours`
}

export function buildAgendaItem(input: {
  id: string
  sourceId: string
  sourceType: AgendaItem["sourceType"]
  type: AgendaItem["type"]
  title: string
  domain: AgendaItem["domain"]
  temporalState: AgendaItem["temporalState"]
  priority: AgendaItem["priority"]
  href: string
  alertKind?: Extract<AgendaItem, { type: "alert" }>["alertKind"]
}): AgendaItem {
  const linkSourceType: AgendaDeepLink["sourceType"] =
    input.sourceType === "derived" ? "calendar_event" : input.sourceType

  const base = {
    id: input.id,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    workspaceId: "current",
    domain: input.domain,
    title: input.title,
    businessStatus: "pending" as const,
    temporalState: input.temporalState,
    priority: input.priority,
    timebox: {
      kind: "deadline" as const,
      at: new Date().toISOString(),
      timezone: AGENDA_V1_TIMEZONE,
      allDay: false as const,
    },
    primaryLink: {
      module: input.domain,
      href: input.href,
      label: input.title,
      sourceType: linkSourceType,
      sourceId: input.sourceId,
    },
    relatedLinks: [],
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: true,
      canEditFromAgenda: false,
      canCreateTask: false,
      canReschedule: false,
      canMarkDone: false,
      canHideForSession: false,
    },
    isDerived: input.sourceType === "derived",
    tags: [],
  }

  if (input.type === "alert") {
    return {
      ...base,
      type: "alert",
      sourceType: "derived",
      alertKind: input.alertKind ?? "deadline_at_risk",
      relatedItemIds: [],
    }
  }

  if (input.type === "deadline") {
    return {
      ...base,
      type: "deadline",
      sourceType: input.sourceType === "mission" ? "mission" : "opportunity",
      deadlineKind: input.sourceType === "mission" ? "mission_end" : "opportunity_next_action",
    }
  }

  if (input.type === "scheduled_event") {
    return {
      ...base,
      type: "scheduled_event",
      sourceType: "calendar_event",
      eventType: "business",
    }
  }

  return {
    ...base,
    type: "task",
    sourceType: "task",
    taskKind: "standalone",
  }
}
