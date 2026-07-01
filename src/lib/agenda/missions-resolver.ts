import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import {
  computeAgendaTemporalState,
  getLocalDateKey,
  localDateToDeadlineAt,
  localDateToMilestoneAt,
  normalizeAgendaPriority,
} from "./agenda-temporal"
import type { AgendaDeepLink, AgendaItem, AgendaQuery, AgendaSourceResult, DeadlineItem } from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

type AgendaSupabaseClient = SupabaseClient<Database>

type MissionRow = {
  id: string
  workspace_id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  company_id: string
  opportunity_id: string | null
  collaborator_id: string
  practice: string | null
  company: { id: string; name: string } | null
  opportunity: { id: string; title: string } | null
  collaborator: { id: string; current_title: string | null; person: { id: string; full_name: string | null } | null } | null
}

export type MissionsResolverDeps = {
  supabase?: AgendaSupabaseClient
  signal?: AbortSignal
  loadRows?: (query: AgendaQuery, signal?: AbortSignal) => Promise<MissionRow[]>
}

function normalizeMissionBusinessStatus(status: string) {
  const normalized = status.trim().toLowerCase()
  if (["cancelled", "annule", "annulée"].includes(normalized)) return "cancelled" as const
  if (["closed", "delivered", "complete", "completed"].includes(normalized)) return "completed" as const
  if (["active", "en_cours"].includes(normalized)) return "in_progress" as const
  return "pending" as const
}

function buildMissionLinks(row: MissionRow): AgendaDeepLink[] {
  const links: AgendaDeepLink[] = [
    {
      module: "missions",
      href: `/missions?missionId=${row.id}`,
      label: row.title,
      sourceType: "mission",
      sourceId: row.id,
    },
  ]

  if (row.company_id && row.company?.name) {
    links.push({
      module: "commerce",
      href: `/prospection/accounts/${row.company_id}`,
      label: row.company.name,
      sourceType: "mission",
      sourceId: row.id,
    })
  }

  if (row.opportunity_id) {
    links.push({
      module: "missions",
      href: `/missions/opps/${row.opportunity_id}/edit`,
      label: row.opportunity?.title ?? "Opportunité",
      sourceType: "mission",
      sourceId: row.id,
    })
  }

  return links
}

function mapMissionBoundary(
  row: MissionRow,
  query: AgendaQuery,
  kind: DeadlineItem["deadlineKind"],
  date: string,
): AgendaItem {
  const businessStatus = normalizeMissionBusinessStatus(row.status)
  const timebox: DeadlineItem["timebox"] = kind === "mission_start"
    ? { kind: "milestone", at: localDateToMilestoneAt(date, query.timezone), timezone: query.timezone, allDay: false }
    : { kind: "deadline", at: localDateToDeadlineAt(date, query.timezone), timezone: query.timezone, allDay: false }
  const links = buildMissionLinks(row)

  return {
    id: `deadline:mission:${row.id}:${kind}`,
    type: "deadline",
    sourceType: "mission",
    sourceId: row.id,
    workspaceId: row.workspace_id,
    domain: "missions",
    title: kind === "mission_start" ? `Début mission · ${row.title}` : `Fin mission · ${row.title}`,
    subtitle: row.company?.name ?? row.collaborator?.person?.full_name ?? null,
    description: null,
    sourceStatus: row.status,
    businessStatus,
    temporalState: computeAgendaTemporalState(timebox, query.now, businessStatus, query.timezone),
    priority: kind === "mission_end" ? "high" : normalizeAgendaPriority(row.practice),
    timebox,
    primaryLink: links[0],
    relatedLinks: links.slice(1),
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: true,
      canEditFromAgenda: false,
      canCreateTask: true,
      canReschedule: false,
      canMarkDone: false,
      canHideForSession: false,
    },
    ownerId: row.collaborator_id,
    ownerLabel: row.collaborator?.person?.full_name ?? null,
    companyId: row.company_id,
    companyLabel: row.company?.name ?? null,
    personId: row.collaborator_id,
    personLabel: row.collaborator?.person?.full_name ?? null,
    relatedCalendarEventId: null,
    relatedTaskId: null,
    relationGroupId: null,
    isDerived: false,
    tags: [],
    metadata: {
      missionStatus: row.status,
      boundaryDate: date,
    },
    deadlineKind: kind,
  } satisfies DeadlineItem
}

async function loadRowsFromSupabase(
  supabase: AgendaSupabaseClient,
  query: AgendaQuery,
  signal?: AbortSignal,
) {
  const fromDate = getLocalDateKey(query.from, query.timezone)
  const toDate = getLocalDateKey(new Date(new Date(query.to).getTime() - 1), query.timezone)
  const overdueFloorDate = getLocalDateKey(new Date(new Date(query.from).getTime() - 14 * 24 * 60 * 60 * 1000), query.timezone)

  const builder = supabase
    .from("missions")
    .select(`
      id,
      workspace_id,
      title,
      status,
      start_date,
      end_date,
      company_id,
      opportunity_id,
      collaborator_id,
      practice,
      company:companies ( id, name ),
      opportunity:opportunities ( id, title ),
      collaborator:collaborators ( id, current_title, person:persons ( id, full_name ) )
    `)
    .eq("workspace_id", query.workspaceId)
    .or(
      `and(start_date.gte.${fromDate},start_date.lte.${toDate}),and(end_date.gte.${overdueFloorDate},end_date.lte.${toDate})`,
    )
    .limit(query.limits.maxRowsPerOtherSource + 1)

  const { data, error } = await builder.abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return (data ?? []) as unknown as MissionRow[]
}

export async function resolveMissionBoundariesSource(
  query: AgendaQuery,
  deps: MissionsResolverDeps = {},
): Promise<AgendaSourceResult> {
  const startedAt = Date.now()

  try {
    const rows = deps.loadRows
      ? await deps.loadRows(query, deps.signal)
      : await loadRowsFromSupabase(deps.supabase as AgendaSupabaseClient, query, deps.signal)

    const items = rows
      .slice(0, query.limits.maxRowsPerOtherSource)
      .flatMap((row) => {
        if (normalizeMissionBusinessStatus(row.status) === "cancelled") return []

        const mapped: AgendaItem[] = []
        if (row.start_date) mapped.push(mapMissionBoundary(row, query, "mission_start", row.start_date))
        if (row.end_date) mapped.push(mapMissionBoundary(row, query, "mission_end", row.end_date))
        return mapped
      })

    return createAgendaSourceResult("mission", {
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
    return createAgendaSourceResult("mission", {
      ok: false,
      errors: [
        createAgendaError(
          "mission",
          isAbort ? "SOURCE_TIMEOUT" : "SOURCE_QUERY_FAILED",
          isAbort ? "missions timeout" : "missions query failed",
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
