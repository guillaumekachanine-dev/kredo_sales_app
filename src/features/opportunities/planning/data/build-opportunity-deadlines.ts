// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — builder PUR des échéances d'opportunité (Lot 8)
//
//  Aucune dépendance Supabase : transforme des lignes brutes en `OpportunityDeadline[]`.
//  Testé unitairement dans `__tests__/build-opportunity-deadlines.test.ts`.
//
//  C'est le SEUL builder d'échéances du chantier (OPP-10 / DATA-03 → OPP-28).
//  La Synthèse (§ 9.6) et le Planning (Lot 9) le réutilisent — jamais de copie.
// ─────────────────────────────────────────────────────────────────────────────

import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import type {
  BuildOpportunityDeadlinesInput,
  OpportunityDeadline,
  OpportunityDeadlineSource,
  RawDeadlineCalendarEvent,
  RawDeadlineOpportunity,
} from "./opportunity-deadline.types"

const CANCELLED_STATUS = "cancelled"

/** Priorité d'arbitrage entre sources (DATA-03 → OPP-28). Plus petit = prioritaire. */
export const DEADLINE_SOURCE_PRIORITY: Record<OpportunityDeadlineSource, number> = {
  next_action: 0,
  calendar_event: 1,
  target_close: 2,
}

function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

/** Libellé lisible d'un type d'évènement agenda (réutilise `AGENDA_EVENT_TYPES`). */
function calendarEventLabel(eventType: string): string {
  return AGENDA_EVENT_TYPES[eventType]?.label ?? eventType
}

interface DeadlineCandidate {
  source: OpportunityDeadlineSource
  label: string
  dueAt: string
  dueMs: number
  calendarEventType: string | null
}

export function buildOpportunityDeadlines(
  input: BuildOpportunityDeadlinesInput,
): OpportunityDeadline[] {
  const { referenceDate, opportunities, calendarEvents } = input
  const floorMs = toUtcMidnight(referenceDate)

  const openOpportunities = opportunities.filter(
    (opportunity) => !isTerminalOpportunityStage(opportunity.stage),
  )
  const openIds = new Set(openOpportunities.map((opportunity) => opportunity.id))

  // ── Prochain évènement agenda futur par opportunité (hors `cancelled`) ─────
  const nextEventByOpportunity = new Map<string, RawDeadlineCalendarEvent & { ms: number }>()
  for (const event of calendarEvents) {
    if (!openIds.has(event.opportunity_id)) continue
    if ((event.status ?? "").toLowerCase() === CANCELLED_STATUS) continue
    const ms = parseMs(event.starts_at)
    if (ms === null || ms < floorMs) continue
    const current = nextEventByOpportunity.get(event.opportunity_id)
    if (!current || ms < current.ms) {
      nextEventByOpportunity.set(event.opportunity_id, { ...event, ms })
    }
  }

  const deadlines: OpportunityDeadline[] = []
  for (const opportunity of openOpportunities) {
    const candidate = resolveCandidate(opportunity, nextEventByOpportunity.get(opportunity.id), floorMs)
    if (!candidate) continue
    deadlines.push({
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      client: opportunity.company_name?.trim() || null,
      source: candidate.source,
      label: candidate.label,
      dueAt: candidate.dueAt,
      calendarEventType: candidate.calendarEventType,
    })
  }

  return deadlines.sort(
    (a, b) =>
      (parseMs(a.dueAt) ?? 0) - (parseMs(b.dueAt) ?? 0) ||
      a.opportunityTitle.localeCompare(b.opportunityTitle) ||
      DEADLINE_SOURCE_PRIORITY[a.source] - DEADLINE_SOURCE_PRIORITY[b.source],
  )
}

/**
 * Arbitrage d'UNE échéance pour une opportunité ouverte, parmi les dates
 * **futures ou du jour** : `next_action_at` > prochain `calendar_events` >
 * `target_close_date`. `start_date` n'est jamais candidat.
 */
function resolveCandidate(
  opportunity: RawDeadlineOpportunity,
  nextEvent: (RawDeadlineCalendarEvent & { ms: number }) | undefined,
  floorMs: number,
): DeadlineCandidate | null {
  if (opportunity.next_action_at) {
    const ms = parseMs(opportunity.next_action_at)
    if (ms !== null && ms >= floorMs) {
      return {
        source: "next_action",
        label: opportunity.next_action_label?.trim() || "Prochaine action",
        dueAt: opportunity.next_action_at,
        dueMs: ms,
        calendarEventType: null,
      }
    }
  }

  if (nextEvent) {
    return {
      source: "calendar_event",
      label: calendarEventLabel(nextEvent.event_type),
      dueAt: nextEvent.starts_at,
      dueMs: nextEvent.ms,
      calendarEventType: nextEvent.event_type,
    }
  }

  if (opportunity.target_close_date) {
    const ms = parseMs(opportunity.target_close_date)
    if (ms !== null && ms >= floorMs) {
      return {
        source: "target_close",
        label: "Date de closing visée",
        dueAt: opportunity.target_close_date,
        dueMs: ms,
        calendarEventType: null,
      }
    }
  }

  return null
}
