import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import {
  computeAgendaTemporalState,
  getTodayDateKey,
} from "./agenda-temporal"
import type { AgendaItem, AgendaQuery, AgendaSourceResult, AvailabilityBlockItem } from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

type AgendaSupabaseClient = SupabaseClient<Database>

type AbsenceRow = {
  id: string
  workspace_id: string
  collaborator_id: string
  absence_type: string
  start_date: string
  end_date: string
  duration_days: number
  notes: string | null
  collaborator: { id: string; current_title: string | null; person: { id: string; full_name: string | null } | null } | null
}

export type AbsencesResolverDeps = {
  supabase?: AgendaSupabaseClient
  signal?: AbortSignal
  loadRows?: (query: AgendaQuery, signal?: AbortSignal) => Promise<AbsenceRow[]>
}

function deriveBusinessStatus(startDate: string, endDate: string, today: string) {
  if (today < startDate) return "pending" as const
  if (today > endDate) return "completed" as const
  return "in_progress" as const
}

function mapAbsence(row: AbsenceRow, query: AgendaQuery): AgendaItem {
  const today = getTodayDateKey(query.now, query.timezone)
  const businessStatus = deriveBusinessStatus(row.start_date, row.end_date, today)
  const timebox: AvailabilityBlockItem["timebox"] = row.start_date === row.end_date
    ? { kind: "all_day", date: row.start_date, timezone: query.timezone, allDay: true }
    : { kind: "all_day_range", startDate: row.start_date, endDate: row.end_date, timezone: query.timezone, allDay: true }

  return {
    id: `availability_block:collaborator_absence:${row.id}`,
    type: "availability_block",
    sourceType: "collaborator_absence",
    sourceId: row.id,
    workspaceId: row.workspace_id,
    domain: "consultants",
    title: `Absence · ${row.collaborator?.person?.full_name ?? "Collaborateur"}`,
    subtitle: row.absence_type.replaceAll("_", " "),
    description: row.notes,
    sourceStatus: row.absence_type,
    businessStatus,
    temporalState: computeAgendaTemporalState(timebox, query.now, businessStatus, query.timezone),
    priority: "high",
    timebox,
    primaryLink: {
      module: "consultants",
      href: `/consultants?collaboratorId=${row.collaborator_id}`,
      label: row.collaborator?.person?.full_name ?? "Collaborateur",
      sourceType: "collaborator_absence",
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
    ownerId: row.collaborator_id,
    ownerLabel: row.collaborator?.person?.full_name ?? null,
    companyId: null,
    companyLabel: null,
    personId: row.collaborator_id,
    personLabel: row.collaborator?.person?.full_name ?? null,
    relatedCalendarEventId: null,
    relatedTaskId: null,
    relationGroupId: null,
    isDerived: false,
    tags: [],
    metadata: {
      absenceType: row.absence_type,
      durationDays: row.duration_days,
    },
    blockKind: "absence",
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
    .from("collaborator_absences")
    .select(`
      id,
      workspace_id,
      collaborator_id,
      absence_type,
      start_date,
      end_date,
      duration_days,
      notes,
      collaborator:collaborators ( id, current_title, person:persons ( id, full_name ) )
    `)
    .eq("workspace_id", query.workspaceId)
    .lte("start_date", toDate)
    .gte("end_date", fromDate)
    .limit(query.limits.maxRowsPerOtherSource + 1)

  const { data, error } = await builder.abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return (data ?? []) as unknown as AbsenceRow[]
}

export async function resolveAbsencesSource(
  query: AgendaQuery,
  deps: AbsencesResolverDeps = {},
): Promise<AgendaSourceResult> {
  const startedAt = Date.now()

  try {
    const rows = deps.loadRows
      ? await deps.loadRows(query, deps.signal)
      : await loadRowsFromSupabase(deps.supabase as AgendaSupabaseClient, query, deps.signal)
    const items = rows.slice(0, query.limits.maxRowsPerOtherSource).map((row) => mapAbsence(row, query))

    return createAgendaSourceResult("collaborator_absence", {
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
    return createAgendaSourceResult("collaborator_absence", {
      ok: false,
      errors: [
        createAgendaError(
          "collaborator_absence",
          isAbort ? "SOURCE_TIMEOUT" : "SOURCE_QUERY_FAILED",
          isAbort ? "collaborator_absences timeout" : "collaborator_absences query failed",
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
