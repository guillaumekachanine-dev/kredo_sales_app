import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { buildOpportunityDeadlines } from "./build-opportunity-deadlines"
import type {
  OpportunityDeadline,
  RawDeadlineCalendarEvent,
  RawDeadlineOpportunity,
} from "./opportunity-deadline.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader unique des échéances d'opportunité (Lot 8).
//
//  Lecture serveur uniquement, RLS de l'utilisateur courant. Toute la logique
//  d'arbitrage vit dans `buildOpportunityDeadlines` (pur, testé). Aucune migration.
//
//  Réutilisé par la Synthèse (via `get-opportunities-synthese`, qui compose le
//  builder avec ses propres lignes) ET par le Planning (Lot 9, via ce loader).
// ─────────────────────────────────────────────────────────────────────────────

type Relation<T> = T | T[] | null

function pickOne<T>(value: Relation<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const NONE = "__none__"

export async function getOpportunityDeadlines(
  referenceDate: Date = new Date(),
): Promise<OpportunityDeadline[]> {
  const supabase = await createClient()
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) {
    throw new Error("Workspace introuvable")
  }

  const { data: opportunityRows } = await supabase.from("opportunities").select(`
      id,
      title,
      stage,
      next_action_at,
      next_action_label,
      target_close_date,
      companies ( name )
    `)

  type OpportunityRow = {
    id: string
    title: string
    stage: string
    next_action_at: string | null
    next_action_label: string | null
    target_close_date: string | null
    companies: Relation<{ name: string | null }>
  }

  const opportunities: RawDeadlineOpportunity[] = ((opportunityRows ?? []) as OpportunityRow[]).map(
    (row) => ({
      id: row.id,
      title: row.title,
      stage: row.stage,
      company_name: pickOne(row.companies)?.name ?? null,
      next_action_at: row.next_action_at,
      next_action_label: row.next_action_label,
      target_close_date: row.target_close_date,
    }),
  )

  const openIds = opportunities
    .filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))
    .map((opportunity) => opportunity.id)
  const openIdsFilter = openIds.length > 0 ? openIds : [NONE]
  const referenceDayStart = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
    ),
  )

  const { data: eventRows } = await supabase
    .from("calendar_events")
    .select("opportunity_id, event_type, status, starts_at")
    .in("opportunity_id", openIdsFilter)
    .gte("starts_at", referenceDayStart.toISOString())

  const calendarEvents: RawDeadlineCalendarEvent[] = (
    (eventRows ?? []) as {
      opportunity_id: string | null
      event_type: string
      status: string | null
      starts_at: string
    }[]
  )
    .filter((row): row is RawDeadlineCalendarEvent => Boolean(row.opportunity_id))
    .map((row) => ({
      opportunity_id: row.opportunity_id,
      event_type: row.event_type,
      status: row.status,
      starts_at: row.starts_at,
    }))

  return buildOpportunityDeadlines({ referenceDate, opportunities, calendarEvents })
}
