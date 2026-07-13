import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/types/database"
import {
  computeAgendaTemporalState,
  getLocalDateKey,
  normalizeAgendaBusinessStatus,
  normalizeAgendaPriority,
} from "./agenda-temporal"
import type { AgendaDeepLink, AgendaItem, AgendaQuery, AgendaSourceResult, ScheduledEventItem } from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

type AgendaSupabaseClient = SupabaseClient<Database>

type NamedRelation = { id: string; name?: string | null; title?: string | null; full_name?: string | null } | null

type CalendarEventRow = {
  id: string
  workspace_id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string
  all_day: boolean
  description: string | null
  location: string | null
  meeting_url: string | null
  metadata: Json
  organizer_id: string | null
  company_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  candidate_id: string | null
  collaborator_id: string | null
  mission_id: string | null
  opportunity_candidate_id: string | null
  company: NamedRelation
  contact: ({ id: string; job_title: string | null; person: NamedRelation } | null)
  opportunity: NamedRelation
  candidate: ({ id: string; person: NamedRelation } | null)
  collaborator: ({ id: string; person: NamedRelation } | null)
  organizer: { id: string; full_name: string | null } | null
  mission: { id: string; title: string; collaborator_id: string | null } | null
}

export type CalendarEventsResolverDeps = {
  supabase?: AgendaSupabaseClient
  signal?: AbortSignal
  loadRows?: (query: AgendaQuery, signal?: AbortSignal) => Promise<CalendarEventRow[]>
}

function buildLink(module: AgendaDeepLink["module"], href: string, label: string, sourceId: string): AgendaDeepLink {
  return {
    module,
    href,
    label,
    sourceType: "calendar_event",
    sourceId,
  }
}

function readMetadataRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {}
}

function readMetadataString(record: Record<string, Json | undefined>, key: string) {
  const value = record[key]
  return typeof value === "string" ? value : null
}

function readMetadataTags(record: Record<string, Json | undefined>) {
  const value = record.tags
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []
}

function buildTimebox(row: CalendarEventRow, timezone: string): ScheduledEventItem["timebox"] {
  if (!row.all_day) {
    return {
      kind: "slot",
      startAt: row.starts_at,
      endAt: row.ends_at,
      timezone,
      allDay: false,
    }
  }

  const startDate = getLocalDateKey(row.starts_at, timezone)
  const endDate = getLocalDateKey(new Date(new Date(row.ends_at).getTime() - 1), timezone)

  if (startDate === endDate) {
    return {
      kind: "all_day",
      date: startDate,
      timezone,
      allDay: true,
    }
  }

  return {
    kind: "all_day_range",
    startDate,
    endDate,
    timezone,
    allDay: true,
  }
}

function mapCalendarEvent(row: CalendarEventRow, query: AgendaQuery): AgendaItem {
  const metadata = readMetadataRecord(row.metadata)
  const businessStatus = normalizeAgendaBusinessStatus(row.status) === "unknown"
    ? "pending"
    : normalizeAgendaBusinessStatus(row.status)
  const timebox = buildTimebox(row, query.timezone)
  const contactPerson = row.contact?.person?.full_name?.trim() || null
  const candidatePerson = row.candidate?.person?.full_name?.trim() || null
  const collaboratorPerson = row.collaborator?.person?.full_name?.trim() || null
  const personId = row.candidate?.id ?? row.collaborator?.id ?? row.contact?.id ?? null
  const personLabel = candidatePerson ?? collaboratorPerson ?? contactPerson

  const relatedLinks: AgendaDeepLink[] = []
  if (row.company_id && row.company?.name) {
    relatedLinks.push(buildLink("commerce", `/prospection/accounts/${row.company_id}`, row.company.name, row.id))
  }
  if (row.opportunity_id) {
    relatedLinks.push(
      buildLink("missions", `/missions/opps/${row.opportunity_id}/edit`, row.opportunity?.title ?? "Opportunité", row.id),
    )
  }
  if (row.mission_id) {
    relatedLinks.push(buildLink("missions", `/missions?missionId=${row.mission_id}`, row.mission?.title ?? "Mission", row.id))
  }
  if (row.candidate_id) {
    relatedLinks.push(buildLink("recruitment", `/recruitment?candidateId=${row.candidate_id}`, candidatePerson ?? "Candidat", row.id))
  }
  if (row.collaborator_id) {
    relatedLinks.push(
      buildLink("consultants", `/consultants?collaboratorId=${row.collaborator_id}`, collaboratorPerson ?? "Collaborateur", row.id),
    )
  }

  return {
    id: `scheduled_event:calendar_event:${row.id}`,
    type: "scheduled_event",
    sourceType: "calendar_event",
    sourceId: row.id,
    workspaceId: row.workspace_id,
    domain: row.candidate_id || row.opportunity_candidate_id
      ? "recruitment"
      : row.mission_id || row.collaborator_id
        ? "missions"
        : "agenda",
    title: row.title,
    subtitle: row.company?.name ?? row.opportunity?.title ?? personLabel,
    description: row.description,
    sourceStatus: row.status,
    businessStatus,
    temporalState: computeAgendaTemporalState(timebox, query.now, businessStatus, query.timezone),
    priority: normalizeAgendaPriority(readMetadataString(metadata, "priority")),
    timebox,
    primaryLink: buildLink("agenda", `/agenda?eventId=${row.id}`, row.title, row.id),
    relatedLinks,
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: relatedLinks.length > 0,
      canEditFromAgenda: true,
      canCreateTask: true,
      canReschedule: true,
      canMarkDone: false,
      canHideForSession: false,
    },
    ownerId: row.organizer_id,
    ownerLabel: row.organizer?.full_name ?? null,
    companyId: row.company_id,
    companyLabel: row.company?.name ?? null,
    personId,
    personLabel,
    relatedCalendarEventId: row.id,
    relatedTaskId: readMetadataString(metadata, "task_id"),
    relationGroupId: null,
    isDerived: false,
    tags: readMetadataTags(metadata),
    metadata: {
      ...metadata,
      relatedCollaboratorId: row.collaborator_id ?? row.mission?.collaborator_id ?? readMetadataString(metadata, "collaborator_id"),
      opportunityCandidateId: row.opportunity_candidate_id,
    },
    eventType: row.event_type,
    location: row.location,
    meetingUrl: row.meeting_url,
  } satisfies ScheduledEventItem
}

async function loadRowsFromSupabase(
  supabase: AgendaSupabaseClient,
  query: AgendaQuery,
  signal?: AbortSignal,
) {
  const builder = supabase
    .from("calendar_events")
    .select(`
      id,
      workspace_id,
      title,
      event_type,
      status,
      starts_at,
      ends_at,
      all_day,
      description,
      location,
      meeting_url,
      metadata,
      organizer_id,
      company_id,
      contact_id,
      opportunity_id,
      candidate_id,
      collaborator_id,
      mission_id,
      opportunity_candidate_id,
      company:companies ( id, name ),
      contact:contacts ( id, job_title, person:persons ( id, full_name ) ),
      opportunity:opportunities ( id, title ),
      candidate:candidates ( id, person:persons ( id, full_name ) ),
      collaborator:collaborators ( id, person:persons ( id, full_name ) ),
      organizer:profiles!calendar_events_organizer_id_fkey ( id, full_name ),
      mission:missions ( id, title, collaborator_id )
    `)
    .eq("workspace_id", query.workspaceId)
    .lt("starts_at", query.to)
    .gt("ends_at", query.from)
    .order("starts_at", { ascending: true })
    .limit(query.limits.maxRowsCalendarEvents + 1)

  const { data, error } = await builder.abortSignal(signal ?? new AbortController().signal)

  if (error) throw error
  return (data ?? []) as unknown as CalendarEventRow[]
}

export async function resolveCalendarEventsSource(
  query: AgendaQuery,
  deps: CalendarEventsResolverDeps = {},
): Promise<AgendaSourceResult> {
  const startedAt = Date.now()

  try {
    const rows = deps.loadRows
      ? await deps.loadRows(query, deps.signal)
      : await loadRowsFromSupabase(deps.supabase as AgendaSupabaseClient, query, deps.signal)
    const truncated = rows.length > query.limits.maxRowsCalendarEvents
    const mapped = rows.slice(0, query.limits.maxRowsCalendarEvents).map((row) => mapCalendarEvent(row, query))

    return createAgendaSourceResult("calendar_event", {
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
    return createAgendaSourceResult("calendar_event", {
      ok: false,
      errors: [
        createAgendaError(
          "calendar_event",
          isAbort ? "SOURCE_TIMEOUT" : "SOURCE_QUERY_FAILED",
          isAbort ? "calendar_events timeout" : "calendar_events query failed",
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
