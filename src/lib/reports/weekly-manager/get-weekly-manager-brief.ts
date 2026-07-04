import "server-only"

import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js"
import { aggregateAgendaSnapshot, buildAgendaQuery } from "@/lib/agenda/aggregate-agenda-snapshot"
import { startOfLocalDay } from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import type { Database } from "@/types/database"
import type { WeeklyBusinessFacts, WeeklyManagerFacts } from "@/app/(app)/reports/_data/reports-types"
import { computeWeeklyBrief } from "./compute-weekly-brief"

// Nombre de semaines ISO distinctes consécutives requises pour déclasser un
// item (voir DISMISS_DECLASSIFICATION_THRESHOLD dans scoring.ts) — dupliqué
// ici en constante locale pour construire la fenêtre de requête, la valeur
// canonique reste dans scoring.ts.
const DISMISS_LOOKBACK_WEEKS = 3

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service-role env vars missing")
  return createServiceClient<Database>(url, key)
}

function addDaysToDateKey(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10))
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`
}

// get_weekly_business_facts est GRANT service_role uniquement (même motif que
// get_activity_commercial_facts/get_account_summary_facts) — cette route a
// déjà authentifié l'utilisateur et résolu son workspace_id avant d'arriver
// ici ; le service-role n'est utilisé que pour exécuter une requête déjà
// explicitement bornée à ce workspace_id (et à p_owner_id si périmètre perso),
// jamais pour contourner l'isolation multi-tenant elle-même.
async function fetchBusinessFacts(
  serviceClient: SupabaseClient<Database>,
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  ownerId: string | null,
  asOfDate: string,
): Promise<WeeklyBusinessFacts> {
  const { data, error } = await serviceClient.rpc("get_weekly_business_facts", {
    p_workspace_id: workspaceId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_owner_id: ownerId ?? undefined,
    p_as_of_date: asOfDate,
  })

  if (error) throw new Error(`get_weekly_business_facts failed: ${error.message}`)
  return data as unknown as WeeklyBusinessFacts
}

// Signal d'apprentissage v1 (ADR-0010 §9, scoring.ts DISMISS_DECLASSIFICATION_THRESHOLD) :
// un item ignoré sur les 3 dernières semaines ISO distinctes où l'utilisateur
// a dismiss quelque chose est déclassé. Approximation v1 documentée : on ne
// vérifie pas que ces 3 semaines sont calendairement consécutives (ex. un
// utilisateur qui saute une semaine de génération), seulement que ce sont les
// 3 dernières semaines DISTINCTES où au moins un dismiss existe pour lui.
// Non pertinent en périmètre workspace-wide (dismiss = préférence personnelle).
async function fetchDismissCounts(
  serviceClient: SupabaseClient<Database>,
  workspaceId: string,
  ownerId: string | null,
): Promise<Record<string, number>> {
  if (!ownerId) return {}

  const { data, error } = await serviceClient
    .from("weekly_brief_dismissals")
    .select("item_source_type, item_source_id, week_iso")
    .eq("workspace_id", workspaceId)
    .eq("owner_id", ownerId)
    .order("week_iso", { ascending: false })
    .limit(200)

  if (error || !data || data.length === 0) return {}

  const distinctWeeks = Array.from(new Set(data.map((row) => row.week_iso))).slice(0, DISMISS_LOOKBACK_WEEKS)
  if (distinctWeeks.length < DISMISS_LOOKBACK_WEEKS) return {}

  const counts: Record<string, number> = {}
  for (const row of data) {
    if (!distinctWeeks.includes(row.week_iso)) continue
    const key = `${row.item_source_type}:${row.item_source_id}`
    counts[key] = (counts[key] ?? 0) + 1
  }

  for (const key of Object.keys(counts)) {
    if (counts[key] < DISMISS_LOOKBACK_WEEKS) delete counts[key]
  }

  return counts
}

export type GetWeeklyManagerBriefInput = {
  // Résolu par l'appelant (route API interactive OU route cron, ADR-0010
  // Lot 4) — sert à scoper get_weekly_business_facts ET l'agrégation agenda.
  workspaceId: string
  ownerId: string | null
  isWorkspaceWide: boolean
  period: { startDate: string; endDate: string; asOfDate: string }
}

// Orchestration Lots 2+4 : aggregateAgendaSnapshot() (source unique "quoi
// cette semaine", jamais dupliquée en SQL) + get_weekly_business_facts (faits
// que l'agenda ne peut pas produire) + scoring déterministe weekly-scoring-v1
// (computeWeeklyBrief). Résultat transmis tel quel à n8n — le workflow
// report-weekly-manager ne recalcule rien, il ne fait que rédiger la narrative.
//
// Utilise aggregateAgendaSnapshot() + buildAgendaQuery() directement (pas le
// wrapper loadAgendaSnapshot(), qui résout son workspace_id via les cookies
// d'une session utilisateur — indisponible dans le contexte cron du Lot 4,
// où n8n appelle Next.js sans navigateur). Le service-role est utilisé pour
// les deux appelants (route interactive ET cron) : dans le cas interactif,
// workspaceId provient du profil de l'utilisateur déjà authentifié par sa
// propre session (jamais un workspace arbitraire), donc aucune perte
// d'isolation multi-tenant par rapport à l'ancien chemin cookie-based — les
// résolveurs agenda filtrent déjà explicitement sur workspace_id en SQL.
export async function getWeeklyManagerBrief(input: GetWeeklyManagerBriefInput): Promise<WeeklyManagerFacts> {
  const { workspaceId, ownerId, isWorkspaceWide, period } = input
  const serviceClient = getServiceClient()

  const timezone = AGENDA_V1_TIMEZONE
  const fromISO = startOfLocalDay(period.startDate, timezone).toISOString()
  const toISO = startOfLocalDay(addDaysToDateKey(period.endDate, 1), timezone).toISOString()

  const agendaQuery = buildAgendaQuery({
    workspaceId,
    from: fromISO,
    to: toISO,
    timezone,
    filters: isWorkspaceWide || !ownerId ? {} : { ownerIds: [ownerId] },
  })

  const [snapshot, businessFacts, dismissCounts] = await Promise.all([
    aggregateAgendaSnapshot(agendaQuery, { supabase: serviceClient }),
    fetchBusinessFacts(serviceClient, workspaceId, period.startDate, period.endDate, isWorkspaceWide ? null : ownerId, period.asOfDate),
    fetchDismissCounts(serviceClient, workspaceId, isWorkspaceWide ? null : ownerId),
  ])

  return computeWeeklyBrief({
    snapshot,
    businessFacts,
    period,
    ownerId: isWorkspaceWide ? null : ownerId,
    isWorkspaceWide,
    dismissCounts,
  })
}
