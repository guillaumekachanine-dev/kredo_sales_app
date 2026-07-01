import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import {
  computeAgendaTemporalState,
  getTodayDateKey,
} from "./agenda-temporal"
import type { AgendaItem, AgendaQuery, AgendaSourceResult, AvailabilityBlockItem } from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

type AgendaSupabaseClient = SupabaseClient<Database>

type ClientClosureRow = {
  id: string
  workspace_id: string
  company_id: string
  label: string
  start_date: string
  end_date: string
  is_recurring: boolean
  notes: string | null
  company: { id: string; name: string } | null
}

export type ClientClosuresResolverDeps = {
  supabase?: AgendaSupabaseClient
  signal?: AbortSignal
  loadRows?: (query: AgendaQuery, signal?: AbortSignal) => Promise<ClientClosureRow[]>
}

function deriveBusinessStatus(startDate: string, endDate: string, today: string) {
  if (today < startDate) return "pending" as const
  if (today > endDate) return "completed" as const
  return "in_progress" as const
}

function mapClientClosure(row: ClientClosureRow, query: AgendaQuery): AgendaItem {
  const today = getTodayDateKey(query.now, query.timezone)
  const businessStatus = deriveBusinessStatus(row.start_date, row.end_date, today)
  const timebox: AvailabilityBlockItem["timebox"] = row.start_date === row.end_date
    ? { kind: "all_day", date: row.start_date, timezone: query.timezone, allDay: true }
    : { kind: "all_day_range", startDate: row.start_date, endDate: row.end_date, timezone: query.timezone, allDay: true }

  return {
    id: `availability_block:client_closure:${row.id}`,
    type: "availability_block",
    sourceType: "client_closure",
    sourceId: row.id,
    workspaceId: row.workspace_id,
    domain: "commerce",
    title: `Fermeture client · ${row.company?.name ?? "Compte"}`,
    subtitle: row.label,
    description: row.notes,
    sourceStatus: row.is_recurring ? "recurring" : "one_off",
    businessStatus,
    temporalState: computeAgendaTemporalState(timebox, query.now, businessStatus, query.timezone),
    priority: "high",
    timebox,
    primaryLink: {
      module: "commerce",
      href: `/prospection/accounts/${row.company_id}`,
      label: row.company?.name ?? "Compte",
      sourceType: "client_closure",
      sourceId: row.id,
    },
    relatedLinks: [],
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: false,
      canEditFromAgenda: false,
      canCreateTask: false,
      canReschedule: false,
      canMarkDone: false,
      canHideForSession: false,
    },
    ownerId: null,
    ownerLabel: null,
    companyId: row.company_id,
    companyLabel: row.company?.name ?? null,
    personId: null,
    personLabel: null,
    relatedCalendarEventId: null,
    relatedTaskId: null,
    relationGroupId: null,
    isDerived: false,
    tags: [],
    metadata: {
      isRecurring: row.is_recurring,
    },
    blockKind: "client_closure",
  } satisfies AvailabilityBlockItem
}

async function loadRowsFromSupabase(
  supabase: AgendaSupabaseClient,
  query: AgendaQuery,
  signal?: AbortSignal,
) {
  const fromDate = query.from.slice(0, 10)
  const toDate = new Date(new Date(query.to).getTime() - 1).toISOString().slice(0, 10)

  const builder = supabase
    .from("client_closures")
    .select(`
      id,
      workspace_id,
      company_id,
      label,
      start_date,
      end_date,
      is_recurring,
      notes,
      company:companies ( id, name )
    `)
    .eq("workspace_id", query.workspaceId)
    .lte("start_date", toDate)
    .gte("end_date", fromDate)
    .limit(query.limits.maxRowsPerOtherSource + 1)

  const { data, error } = await builder.abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return (data ?? []) as unknown as ClientClosureRow[]
}

export async function resolveClientClosuresSource(
  query: AgendaQuery,
  deps: ClientClosuresResolverDeps = {},
): Promise<AgendaSourceResult> {
  const startedAt = Date.now()

  try {
    const rows = deps.loadRows
      ? await deps.loadRows(query, deps.signal)
      : await loadRowsFromSupabase(deps.supabase as AgendaSupabaseClient, query, deps.signal)
    const items = rows.slice(0, query.limits.maxRowsPerOtherSource).map((row) => mapClientClosure(row, query))

    return createAgendaSourceResult("client_closure", {
      items,
      meta: {
        fetchedAt: new Date().toISOString(),
        rowCount: items.length,
        truncated: rows.length > query.limits.maxRowsPerOtherSource,
        timedOut: false,
        durationMs: Date.now() - startedAt,
      },
    })
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError"
    return createAgendaSourceResult("client_closure", {
      ok: false,
      errors: [
        createAgendaError(
          "client_closure",
          isAbort ? "SOURCE_TIMEOUT" : "SOURCE_QUERY_FAILED",
          isAbort ? "client_closures timeout" : "client_closures query failed",
          { reason: error instanceof Error ? error.message : String(error) },
        ),
      ],
      meta: {
        fetchedAt: new Date().toISOString(),
        rowCount: 0,
        truncated: false,
        timedOut: isAbort,
        durationMs: Date.now() - startedAt,
      },
    })
  }
}
