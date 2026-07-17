import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import {
  computeAgendaTemporalState,
  getLocalDateKey,
  localDateToDeadlineAt,
  normalizeAgendaBusinessStatus,
  normalizeAgendaPriority,
} from "./agenda-temporal"
import type { AgendaDeepLink, AgendaItem, AgendaQuery, AgendaSourceResult, TaskItem } from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

type AgendaSupabaseClient = SupabaseClient<Database>

type TaskRow = {
  id: string
  workspace_id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  completed_at: string | null
  assignee_id: string | null
  entity_type: string | null
  entity_id: string | null
  linked_entity_type: string | null
  linked_entity_id: string | null
  calendar_event_id: string | null
  calendar_event:
    | {
        id: string
        title: string
        company_id: string | null
        opportunity_id: string | null
        candidate_id: string | null
        organizer_id: string | null
        company: { id: string; name: string } | null
      }
    | null
}

export type TasksResolverDeps = {
  supabase?: AgendaSupabaseClient
  signal?: AbortSignal
  loadRows?: (query: AgendaQuery, signal?: AbortSignal) => Promise<TaskRow[]>
}

function buildDeepLinkFromEntity(
  sourceId: string,
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): AgendaDeepLink | null {
  if (!entityType || !entityId) return null

  switch (entityType) {
    case "opportunity":
      return { module: "missions", href: `/missions/opps/${entityId}/modifier`, label: "Opportunité", sourceType: "task", sourceId }
    case "mission":
      return { module: "missions", href: `/missions?missionId=${entityId}`, label: "Mission", sourceType: "task", sourceId }
    case "company":
      return { module: "commerce", href: `/prospection/accounts/${entityId}`, label: "Compte", sourceType: "task", sourceId }
    case "candidate":
      return { module: "recruitment", href: `/recruitment?candidateId=${entityId}`, label: "Candidat", sourceType: "task", sourceId }
    case "collaborator":
      return { module: "consultants", href: `/consultants?collaboratorId=${entityId}`, label: "Collaborateur", sourceType: "task", sourceId }
    default:
      return null
  }
}

function resolveDueAt(dueDate: string, timezone: string) {
  return dueDate.includes("T") ? dueDate : localDateToDeadlineAt(dueDate, timezone)
}

function mapTask(row: TaskRow, query: AgendaQuery): AgendaItem {
  const dueAt = resolveDueAt(row.due_date as string, query.timezone)
  const businessStatus = row.completed_at
    ? "completed"
    : normalizeAgendaBusinessStatus(row.status) === "unknown"
      ? "pending"
      : normalizeAgendaBusinessStatus(row.status)
  const timebox: TaskItem["timebox"] = {
    kind: "deadline",
    at: dueAt,
    timezone: query.timezone,
    allDay: false,
  }

  const primaryLink = row.calendar_event_id
    ? ({
        module: "agenda",
        href: `/agenda?eventId=${row.calendar_event_id}&taskId=${row.id}`,
        label: row.title,
        sourceType: "task",
        sourceId: row.id,
      } satisfies AgendaDeepLink)
    : buildDeepLinkFromEntity(row.id, row.entity_type, row.entity_id) ??
      buildDeepLinkFromEntity(row.id, row.linked_entity_type, row.linked_entity_id) ??
      ({
        module: "agenda",
        href: `/agenda?taskId=${row.id}`,
        label: row.title,
        sourceType: "task",
        sourceId: row.id,
      } satisfies AgendaDeepLink)

  const relatedLinks = [
    buildDeepLinkFromEntity(row.id, row.entity_type, row.entity_id),
    buildDeepLinkFromEntity(row.id, row.linked_entity_type, row.linked_entity_id),
    row.calendar_event?.company_id && row.calendar_event.company
      ? { module: "commerce", href: `/prospection/accounts/${row.calendar_event.company_id}`, label: row.calendar_event.company.name, sourceType: "task", sourceId: row.id }
      : null,
  ].filter((link): link is AgendaDeepLink => Boolean(link))

  return {
    id: `task:task:${row.id}`,
    type: "task",
    sourceType: "task",
    sourceId: row.id,
    workspaceId: row.workspace_id,
    domain: row.entity_type === "candidate" ? "recruitment" : row.entity_type === "collaborator" ? "consultants" : "agenda",
    title: row.title,
    subtitle: row.calendar_event?.title ?? null,
    description: row.description,
    sourceStatus: row.status,
    businessStatus,
    temporalState: computeAgendaTemporalState(timebox, query.now, businessStatus, query.timezone),
    priority: normalizeAgendaPriority(row.priority),
    timebox,
    primaryLink,
    relatedLinks,
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: relatedLinks.length > 0 || primaryLink.module !== "agenda",
      canEditFromAgenda: false,
      canCreateTask: false,
      canReschedule: false,
      canMarkDone: true,
      canHideForSession: false,
    },
    ownerId: row.assignee_id,
    ownerLabel: null,
    companyId: row.calendar_event?.company_id ?? null,
    companyLabel: row.calendar_event?.company?.name ?? null,
    personId: null,
    personLabel: null,
    relatedCalendarEventId: row.calendar_event_id,
    relatedTaskId: row.id,
    relationGroupId: null,
    isDerived: false,
    tags: [],
    metadata: {
      dueDate: row.due_date,
      completedAt: row.completed_at,
    },
    taskKind: row.calendar_event_id ? "linked_to_event" : "standalone",
    taskEntityType: row.entity_type,
    taskEntityId: row.entity_id,
    linkedEntityType: row.linked_entity_type,
    linkedEntityId: row.linked_entity_id,
  } satisfies TaskItem
}

async function loadRowsFromSupabase(
  supabase: AgendaSupabaseClient,
  query: AgendaQuery,
  signal?: AbortSignal,
) {
  const fromDate = getLocalDateKey(query.from, query.timezone)
  const toDate = getLocalDateKey(new Date(new Date(query.to).getTime() - 1), query.timezone)
  const overdueFloorDate = getLocalDateKey(
    new Date(new Date(query.from).getTime() - query.limits.overdueTaskLookbackDays * 24 * 60 * 60 * 1000),
    query.timezone,
  )
  const limit = query.limits.maxRowsPerOtherSource + query.limits.maxOverdueTasks + 1

  const builder = supabase
    .from("tasks")
    .select(`
      id,
      workspace_id,
      title,
      description,
      due_date,
      priority,
      status,
      completed_at,
      assignee_id,
      entity_type,
      entity_id,
      linked_entity_type,
      linked_entity_id,
      calendar_event_id,
      calendar_event:calendar_events!tasks_calendar_event_id_fkey (
        id,
        title,
        company_id,
        opportunity_id,
        candidate_id,
        organizer_id,
        company:companies ( id, name )
      )
    `)
    .eq("workspace_id", query.workspaceId)
    .not("due_date", "is", null)
    .gte("due_date", overdueFloorDate)
    .lte("due_date", toDate)
    .order("due_date", { ascending: true })
    .limit(limit)

  const { data, error } = await builder.abortSignal(signal ?? new AbortController().signal)
  if (error) throw error

  const filtered = ((data ?? []) as unknown as TaskRow[]).filter((row) => {
    if (!row.due_date) return false
    const dueDate = row.due_date.includes("T") ? getLocalDateKey(row.due_date, query.timezone) : row.due_date
    const isClosed = row.completed_at || normalizeAgendaBusinessStatus(row.status) === "completed"
    if (dueDate >= fromDate && dueDate <= toDate) return true
    return !isClosed && dueDate >= overdueFloorDate && dueDate < fromDate
  })

  return filtered
}

export async function resolveTasksSource(
  query: AgendaQuery,
  deps: TasksResolverDeps = {},
): Promise<AgendaSourceResult> {
  const startedAt = Date.now()

  try {
    const rows = deps.loadRows
      ? await deps.loadRows(query, deps.signal)
      : await loadRowsFromSupabase(deps.supabase as AgendaSupabaseClient, query, deps.signal)
    const limit = query.limits.maxRowsPerOtherSource + query.limits.maxOverdueTasks
    const truncated = rows.length > limit
    const mapped = rows.slice(0, limit).filter((row) => row.due_date).map((row) => mapTask(row, query))

    return createAgendaSourceResult("task", {
      items: mapped,
      meta: {
        fetchedAt: new Date().toISOString(),
        rowCount: mapped.length,
        truncated,
        timedOut: false,
        durationMs: Date.now() - startedAt,
      },
    })
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError"
    return createAgendaSourceResult("task", {
      ok: false,
      errors: [
        createAgendaError(
          "task",
          isAbort ? "SOURCE_TIMEOUT" : "SOURCE_QUERY_FAILED",
          isAbort ? "tasks timeout" : "tasks query failed",
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
