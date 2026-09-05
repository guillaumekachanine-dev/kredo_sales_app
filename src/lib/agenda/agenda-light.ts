import { AGENDA_EVENT_TYPES } from "./agenda-config"

// ─────────────────────────────────────────────────────────────────────────────
//  Agenda light — règles pures.
//
//  Lecture compacte des rendez-vous à venir, destinée aux pages qui ne sont pas
//  l'Agenda : on y vient pour savoir « qu'est-ce qui m'attend », pas pour
//  planifier. D'où le regroupement par jour et le plafond d'horizon.
//
//  Deux invariants :
//   • un événement annulé n'est pas un rendez-vous à venir. Il est exclu, pas
//     grisé — la liste doit rester lisible d'un coup d'œil ;
//   • un événement déjà commencé mais non terminé compte encore comme « en
//     cours ». Le filtrer sur `starts_at >= maintenant` le ferait disparaître
//     de l'écran au moment précis où il est le plus pertinent.
// ─────────────────────────────────────────────────────────────────────────────

export const AGENDA_LIGHT_HORIZON_DAYS = 14

export type AgendaLightEventRow = {
  id: string
  title: string
  eventType: string
  status: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean | null
  location: string | null
  companyName: string | null
}

export type AgendaLightEvent = {
  id: string
  title: string
  typeLabel: string
  categoryId: string | null
  startsAt: string
  timeLabel: string
  isInProgress: boolean
  location: string | null
  companyName: string | null
}

export type AgendaLightDay = {
  dateKey: string
  dayLabel: string
  isToday: boolean
  events: AgendaLightEvent[]
}

export type AgendaLightResult = {
  horizonDays: number
  days: AgendaLightDay[]
  summary: {
    totalEvents: number
    todayCount: number
    nextEventAt: string | null
  }
}

const CANCELLED_STATUSES = new Set(["cancelled", "annule", "annulé", "canceled"])

const DAY_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
})

const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
})

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Paris",
})

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildAgendaLight(input: {
  now: string
  horizonDays: number
  events: AgendaLightEventRow[]
}): AgendaLightResult {
  const now = parse(input.now)
  if (!now) {
    return { horizonDays: input.horizonDays, days: [], summary: { totalEvents: 0, todayCount: 0, nextEventAt: null } }
  }

  const horizonEnd = new Date(now.getTime() + input.horizonDays * 24 * 60 * 60 * 1000)
  const todayKey = DATE_KEY_FORMATTER.format(now)

  const byDay = new Map<string, AgendaLightEvent[]>()

  for (const row of input.events) {
    if (row.status && CANCELLED_STATUSES.has(row.status.toLowerCase())) continue

    const startsAt = parse(row.startsAt)
    if (!startsAt) continue
    if (startsAt > horizonEnd) continue

    const endsAt = parse(row.endsAt)
    const isInProgress = startsAt <= now && Boolean(endsAt && endsAt > now)
    // Un événement terminé n'est plus « à venir » ; un événement commencé mais
    // non terminé l'est encore.
    if (startsAt < now && !isInProgress) continue

    const config = AGENDA_EVENT_TYPES[row.eventType]
    const dateKey = DATE_KEY_FORMATTER.format(startsAt)

    const events = byDay.get(dateKey) ?? []
    events.push({
      id: row.id,
      title: row.title,
      typeLabel: config?.shortLabel ?? config?.label ?? row.eventType.replaceAll("_", " "),
      categoryId: config?.category ?? null,
      startsAt: row.startsAt,
      timeLabel: row.allDay ? "Journée" : TIME_FORMATTER.format(startsAt),
      isInProgress,
      location: row.location,
      companyName: row.companyName,
    })
    byDay.set(dateKey, events)
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map<AgendaLightDay>(([dateKey, events]) => ({
      dateKey,
      dayLabel: DAY_FORMATTER.format(new Date(`${dateKey}T12:00:00Z`)),
      isToday: dateKey === todayKey,
      events: events.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }))

  const allEvents = days.flatMap((day) => day.events)

  return {
    horizonDays: input.horizonDays,
    days,
    summary: {
      totalEvents: allEvents.length,
      todayCount: days.find((day) => day.isToday)?.events.length ?? 0,
      nextEventAt: allEvents[0]?.startsAt ?? null,
    },
  }
}
