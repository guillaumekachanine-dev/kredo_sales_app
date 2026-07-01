import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import {
  computeAgendaTemporalState,
  normalizeAgendaPriority,
} from "./agenda-temporal"
import type { AgendaDeepLink, AgendaItem, AgendaQuery, AgendaSourceResult, DeadlineItem } from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

type AgendaSupabaseClient = SupabaseClient<Database>

type RecruitmentMilestoneRow = {
  id: string
  workspace_id: string
  step: string
  result: string
  scheduled_at: string | null
  completed_at: string | null
  calendar_event_id: string | null
  notes: string | null
  process:
    | {
        id: string
        status: string
        current_step: string
        recruiter_id: string | null
        candidate_id: string
        candidate: { id: string; person: { id: string; full_name: string | null } | null } | null
        opportunity_candidate_id: string | null
        opportunity_candidate:
          | {
              id: string
              opportunity_id: string
              opportunity: { id: string; title: string; company_id: string | null; company: { id: string; name: string } | null } | null
            }
          | null
      }
    | null
}

export type RecruitmentResolverDeps = {
  supabase?: AgendaSupabaseClient
  signal?: AbortSignal
  loadRows?: (query: AgendaQuery, signal?: AbortSignal) => Promise<RecruitmentMilestoneRow[]>
}

function buildLinks(row: RecruitmentMilestoneRow): AgendaDeepLink[] {
  const links: AgendaDeepLink[] = []
  const candidateId = row.process?.candidate_id
  const candidateName = row.process?.candidate?.person?.full_name ?? "Candidat"
  if (candidateId) {
    links.push({
      module: "recruitment",
      href: `/recruitment?candidateId=${candidateId}`,
      label: candidateName,
      sourceType: "candidate_hiring_milestone",
      sourceId: row.id,
    })
  }
  const opportunity = row.process?.opportunity_candidate?.opportunity
  if (opportunity?.id) {
    links.push({
      module: "missions",
      href: `/missions/opps/${opportunity.id}/edit`,
      label: opportunity.title,
      sourceType: "candidate_hiring_milestone",
      sourceId: row.id,
    })
  }
  if (opportunity?.company_id && opportunity.company?.name) {
    links.push({
      module: "commerce",
      href: `/prospection/accounts/${opportunity.company_id}`,
      label: opportunity.company.name,
      sourceType: "candidate_hiring_milestone",
      sourceId: row.id,
    })
  }
  return links
}

function mapMilestone(row: RecruitmentMilestoneRow, query: AgendaQuery): AgendaItem {
  const businessStatus = row.completed_at
    ? "completed"
    : ["cancelled", "annule", "refuse"].includes(row.result)
      ? "cancelled"
      : "pending"
  const timebox: DeadlineItem["timebox"] = {
    kind: "milestone",
    at: row.scheduled_at as string,
    timezone: query.timezone,
    allDay: false,
  }
  const links = buildLinks(row)
  const candidateName = row.process?.candidate?.person?.full_name ?? "Candidat"

  return {
    id: `deadline:recruitment:${row.id}:recruitment_milestone`,
    type: "deadline",
    sourceType: "candidate_hiring_milestone",
    sourceId: row.id,
    workspaceId: row.workspace_id,
    domain: "recruitment",
    title: `${row.step.replaceAll("_", " ")} · ${candidateName}`,
    subtitle: row.process?.opportunity_candidate?.opportunity?.title ?? null,
    description: row.notes,
    sourceStatus: row.result,
    businessStatus,
    temporalState: computeAgendaTemporalState(timebox, query.now, businessStatus, query.timezone),
    priority: normalizeAgendaPriority(row.process?.current_step === row.step ? "high" : "normal"),
    timebox,
    primaryLink: links[0] ?? {
      module: "recruitment",
      href: `/recruitment`,
      label: candidateName,
      sourceType: "candidate_hiring_milestone",
      sourceId: row.id,
    },
    relatedLinks: links.slice(1),
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: links.length > 1,
      canEditFromAgenda: false,
      canCreateTask: true,
      canReschedule: false,
      canMarkDone: false,
      canHideForSession: false,
    },
    ownerId: row.process?.recruiter_id ?? null,
    ownerLabel: null,
    companyId: row.process?.opportunity_candidate?.opportunity?.company_id ?? null,
    companyLabel: row.process?.opportunity_candidate?.opportunity?.company?.name ?? null,
    personId: row.process?.candidate_id ?? null,
    personLabel: candidateName,
    relatedCalendarEventId: row.calendar_event_id,
    relatedTaskId: null,
    relationGroupId: null,
    isDerived: false,
    tags: [],
    metadata: {
      step: row.step,
      result: row.result,
    },
    deadlineKind: "recruitment_milestone",
  } satisfies DeadlineItem
}

async function loadRowsFromSupabase(
  supabase: AgendaSupabaseClient,
  query: AgendaQuery,
  signal?: AbortSignal,
) {
  const builder = supabase
    .from("candidate_hiring_milestones")
    .select(`
      id,
      workspace_id,
      step,
      result,
      scheduled_at,
      completed_at,
      calendar_event_id,
      notes,
      process:candidate_hiring_processes!candidate_hiring_milestones_process_workspace_fkey (
        id,
        status,
        current_step,
        recruiter_id,
        candidate_id,
        candidate:candidates ( id, person:persons ( id, full_name ) ),
        opportunity_candidate_id,
        opportunity_candidate:opportunity_candidates (
          id,
          opportunity_id,
          opportunity:opportunities ( id, title, company_id, company:companies ( id, name ) )
        )
      )
    `)
    .eq("workspace_id", query.workspaceId)
    .not("scheduled_at", "is", null)
    .lt("scheduled_at", query.to)
    .gte("scheduled_at", query.from)
    .limit(query.limits.maxRowsPerOtherSource + 1)

  const { data, error } = await builder.abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return (data ?? []) as unknown as RecruitmentMilestoneRow[]
}

export async function resolveRecruitmentMilestonesSource(
  query: AgendaQuery,
  deps: RecruitmentResolverDeps = {},
): Promise<AgendaSourceResult> {
  const startedAt = Date.now()

  try {
    const rows = deps.loadRows
      ? await deps.loadRows(query, deps.signal)
      : await loadRowsFromSupabase(deps.supabase as AgendaSupabaseClient, query, deps.signal)
    const items = rows
      .slice(0, query.limits.maxRowsPerOtherSource)
      .filter((row) => row.scheduled_at && !row.calendar_event_id)
      .map((row) => mapMilestone(row, query))

    return createAgendaSourceResult("candidate_hiring_milestone", {
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
    return createAgendaSourceResult("candidate_hiring_milestone", {
      ok: false,
      errors: [
        createAgendaError(
          "candidate_hiring_milestone",
          isAbort ? "SOURCE_TIMEOUT" : "SOURCE_QUERY_FAILED",
          isAbort ? "candidate_hiring_milestones timeout" : "candidate_hiring_milestones query failed",
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
