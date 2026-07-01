import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { AGENDA_V1_THRESHOLDS } from "./agenda-thresholds"
import {
  computeAgendaTemporalState,
  getLocalDateKey,
  localDateToDeadlineAt,
  normalizeAgendaBusinessStatus,
  normalizeAgendaPriority,
} from "./agenda-temporal"
import type { AgendaDeepLink, AgendaItem, AgendaQuery, AgendaSourceResult, DeadlineItem } from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

type AgendaSupabaseClient = SupabaseClient<Database>

type OpportunityRow = {
  id: string
  workspace_id: string
  title: string
  stage: string
  priority: string
  next_action_at: string | null
  next_action_label: string | null
  target_close_date: string | null
  company_id: string | null
  owner_id: string | null
  company: { id: string; name: string } | null
}

export type OpportunitiesResolverDeps = {
  supabase?: AgendaSupabaseClient
  signal?: AbortSignal
  loadRows?: (query: AgendaQuery, signal?: AbortSignal) => Promise<OpportunityRow[]>
}

function buildLinks(row: OpportunityRow): AgendaDeepLink[] {
  const links: AgendaDeepLink[] = [
    {
      module: "missions",
      href: `/missions/opps/${row.id}/edit`,
      label: row.title,
      sourceType: "opportunity",
      sourceId: row.id,
    },
  ]

  if (row.company_id && row.company?.name) {
    links.push({
      module: "commerce",
      href: `/prospection/accounts/${row.company_id}`,
      label: row.company.name,
      sourceType: "opportunity",
      sourceId: row.id,
    })
  }

  return links
}

function mapOpportunityDeadline(
  row: OpportunityRow,
  query: AgendaQuery,
  kind: DeadlineItem["deadlineKind"],
  at: string,
): AgendaItem {
  const businessStatus = isTerminalOpportunityStage(row.stage)
    ? normalizeAgendaBusinessStatus(row.stage)
    : "pending"
  const links = buildLinks(row)
  const timebox: DeadlineItem["timebox"] = kind === "opportunity_next_action"
    ? { kind: "milestone", at, timezone: query.timezone, allDay: false }
    : { kind: "deadline", at, timezone: query.timezone, allDay: false }

  return {
    id: `deadline:opportunity:${row.id}:${kind}`,
    type: "deadline",
    sourceType: "opportunity",
    sourceId: row.id,
    workspaceId: row.workspace_id,
    domain: "commerce",
    title: kind === "opportunity_next_action"
      ? row.next_action_label?.trim() || `Prochaine action · ${row.title}`
      : `Closing cible · ${row.title}`,
    subtitle: row.company?.name ?? null,
    description: null,
    sourceStatus: row.stage,
    businessStatus,
    temporalState: computeAgendaTemporalState(timebox, query.now, businessStatus, query.timezone),
    priority: normalizeAgendaPriority(row.priority),
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
    ownerId: row.owner_id,
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
      stage: row.stage,
      nextActionLabel: row.next_action_label,
    },
    deadlineKind: kind,
  } satisfies DeadlineItem
}

async function loadRowsFromSupabase(
  supabase: AgendaSupabaseClient,
  query: AgendaQuery,
  signal?: AbortSignal,
) {
  const toDate = getLocalDateKey(new Date(new Date(query.to).getTime() - 1), query.timezone)
  const overdueFloorDate = getLocalDateKey(
    new Date(
      new Date(query.from).getTime() -
        AGENDA_V1_THRESHOLDS.overdueOpportunityCloseRetentionDays * 24 * 60 * 60 * 1000,
    ),
    query.timezone,
  )

  const builder = supabase
    .from("opportunities")
    .select(`
      id,
      workspace_id,
      title,
      stage,
      priority,
      next_action_at,
      next_action_label,
      target_close_date,
      company_id,
      owner_id,
      company:companies ( id, name )
    `)
    .eq("workspace_id", query.workspaceId)
    .or(
      `and(next_action_at.gte.${query.from},next_action_at.lt.${query.to}),and(target_close_date.gte.${overdueFloorDate},target_close_date.lte.${toDate})`,
    )
    .limit(query.limits.maxRowsPerOtherSource + 1)

  const { data, error } = await builder.abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return (data ?? []) as unknown as OpportunityRow[]
}

export async function resolveOpportunityDeadlinesSource(
  query: AgendaQuery,
  deps: OpportunitiesResolverDeps = {},
): Promise<AgendaSourceResult> {
  const startedAt = Date.now()

  try {
    const rows = deps.loadRows
      ? await deps.loadRows(query, deps.signal)
      : await loadRowsFromSupabase(deps.supabase as AgendaSupabaseClient, query, deps.signal)

    const items = rows
      .slice(0, query.limits.maxRowsPerOtherSource)
      .flatMap((row) => {
        if (isTerminalOpportunityStage(row.stage)) return []

        const mapped: AgendaItem[] = []
        if (row.next_action_at) {
          mapped.push(mapOpportunityDeadline(row, query, "opportunity_next_action", row.next_action_at))
        }
        if (row.target_close_date) {
          mapped.push(
            mapOpportunityDeadline(
              row,
              query,
              "opportunity_target_close",
              localDateToDeadlineAt(row.target_close_date, query.timezone),
            ),
          )
        }
        return mapped
      })

    return createAgendaSourceResult("opportunity", {
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
    return createAgendaSourceResult("opportunity", {
      ok: false,
      errors: [
        createAgendaError(
          "opportunity",
          isAbort ? "SOURCE_TIMEOUT" : "SOURCE_QUERY_FAILED",
          isAbort ? "opportunities timeout" : "opportunities query failed",
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
