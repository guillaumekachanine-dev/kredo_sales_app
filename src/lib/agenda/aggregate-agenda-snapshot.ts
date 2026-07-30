import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { resolveAbsencesSource } from "./absences-resolver"
import { AGENDA_V1_INCLUDE, AGENDA_V1_LIMITS, AGENDA_V1_TIMEZONE } from "./agenda-thresholds"
import { resolveCalendarEventsSource } from "./calendar-events-resolver"
import { resolveClientClosuresSource } from "./client-closures-resolver"
import { resolveDerivedAlertsSource } from "./derived-alerts"
import { resolveMissionBoundariesSource } from "./missions-resolver"
import { resolveOpportunityDeadlinesSource } from "./opportunities-resolver"
import { resolveRecruitmentMilestonesSource } from "./recruitment-resolver"
import { filterAgendaItems, buildAgendaRelationGroups } from "./agenda-selectors"
import { resolveTasksSource } from "./tasks-resolver"
import { compareAgendaItems, isAgendaActionable, isAgendaAllDayLaneItem } from "./agenda-temporal"
import type { AgendaQuery, AgendaSnapshot, AgendaSourceResult } from "./agenda-types"
import { createAgendaError, createAgendaSourceResult } from "./agenda-types"

type AgendaSupabaseClient = SupabaseClient<Database>

type SourceResolver = (
  query: AgendaQuery,
  deps: { supabase?: AgendaSupabaseClient; signal?: AbortSignal },
) => Promise<AgendaSourceResult>

type ResolverKey =
  | "scheduledEvents"
  | "tasks"
  | "missionBoundaries"
  | "opportunityDeadlines"
  | "recruitmentMilestones"
  | "absences"
  | "clientClosures"

type AggregateAgendaSnapshotDeps = {
  supabase?: AgendaSupabaseClient
  resolvers?: Partial<Record<ResolverKey, SourceResolver>>
}

type BuildAgendaQueryInput = {
  workspaceId: string
  from: string
  to: string
  now?: string
  timezone?: string
  include?: Partial<AgendaQuery["include"]>
  limits?: Partial<AgendaQuery["limits"]>
  filters?: AgendaQuery["filters"]
}

const SOURCE_RESOLVERS: Record<ResolverKey, SourceResolver> = {
  scheduledEvents: resolveCalendarEventsSource,
  tasks: resolveTasksSource,
  missionBoundaries: resolveMissionBoundariesSource,
  opportunityDeadlines: resolveOpportunityDeadlinesSource,
  recruitmentMilestones: resolveRecruitmentMilestonesSource,
  absences: resolveAbsencesSource,
  clientClosures: resolveClientClosuresSource,
}

const SOURCE_NAME_BY_KEY = {
  scheduledEvents: "calendar_event",
  tasks: "task",
  missionBoundaries: "mission",
  opportunityDeadlines: "opportunity",
  recruitmentMilestones: "candidate_hiring_milestone",
  absences: "collaborator_absence",
  clientClosures: "client_closure",
} as const

function assertValidQuery(query: AgendaQuery) {
  const from = new Date(query.from)
  const to = new Date(query.to)
  const diffDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)

  if (!(from < to)) {
    throw new Error("AgendaQuery invalid window: from must be before to")
  }
  if (diffDays > query.limits.maxWindowDays) {
    throw new Error(`AgendaQuery window exceeds ${query.limits.maxWindowDays} days`)
  }
}

export function buildAgendaQuery(input: BuildAgendaQueryInput): AgendaQuery {
  const query: AgendaQuery = {
    workspaceId: input.workspaceId,
    from: input.from,
    to: input.to,
    now: input.now ?? new Date().toISOString(),
    timezone: input.timezone ?? AGENDA_V1_TIMEZONE,
    include: { ...AGENDA_V1_INCLUDE, ...input.include },
    limits: { ...AGENDA_V1_LIMITS, ...input.limits },
    filters: input.filters ?? {},
  }

  assertValidQuery(query)
  return query
}

async function runWithConcurrencyLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  const queue = [...items]
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift()
      if (!next) return
      await worker(next)
    }
  })

  await Promise.all(runners)
}

async function runSourceWithTimeout(
  key: ResolverKey,
  resolver: SourceResolver,
  query: AgendaQuery,
  supabase: AgendaSupabaseClient | undefined,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), query.limits.sourceTimeoutMs)

  try {
    return await resolver(query, { supabase, signal: controller.signal })
  } catch (error) {
    const source = SOURCE_NAME_BY_KEY[key]
    const isAbort = error instanceof Error && error.name === "AbortError"

    return createAgendaSourceResult(source, {
      ok: false,
      errors: [
        createAgendaError(
          source,
          isAbort ? "SOURCE_TIMEOUT" : "SOURCE_QUERY_FAILED",
          isAbort ? `${source} timeout` : `${source} resolver failed`,
          { reason: error instanceof Error ? error.message : String(error) },
        ),
      ],
      meta: {
        fetchedAt: new Date().toISOString(),
        rowCount: 0,
        truncated: false,
        timedOut: isAbort,
        durationMs: query.limits.sourceTimeoutMs,
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

function summarize(snapshot: Omit<AgendaSnapshot, "summary">): AgendaSnapshot["summary"] {
  return {
    totalItems: snapshot.items.length,
    totalActionable: snapshot.items.filter(isAgendaActionable).length,
    totalOverdue: snapshot.items.filter((item) => item.temporalState === "overdue").length,
    totalToday: snapshot.items.filter((item) => item.temporalState === "today" || item.temporalState === "ongoing").length,
    totalConflicts: snapshot.items.filter((item) => item.type === "alert" && item.alertKind === "schedule_conflict").length,
    hasWeekTension: snapshot.items.some((item) => item.type === "alert" && item.alertKind === "week_tension"),
    allDayLaneCount: snapshot.items.filter((item) => isAgendaAllDayLaneItem(item, snapshot.query.timezone)).length,
  }
}

export async function aggregateAgendaSnapshot(
  query: AgendaQuery,
  deps: AggregateAgendaSnapshotDeps = {},
): Promise<AgendaSnapshot> {
  assertValidQuery(query)

  const enabledSources = ([
    query.include.scheduledEvents ? { key: "scheduledEvents" as const } : null,
    query.include.tasks ? { key: "tasks" as const } : null,
    query.include.missionBoundaries ? { key: "missionBoundaries" as const } : null,
    query.include.opportunityDeadlines ? { key: "opportunityDeadlines" as const } : null,
    query.include.recruitmentMilestones ? { key: "recruitmentMilestones" as const } : null,
    query.include.absences ? { key: "absences" as const } : null,
    query.include.clientClosures ? { key: "clientClosures" as const } : null,
  ].filter(Boolean)) as Array<{ key: ResolverKey }>

  const results: AgendaSourceResult[] = []
  const supabase = deps.supabase

  await runWithConcurrencyLimit(enabledSources, query.limits.maxParallelQueries, async ({ key }) => {
    const resolver = deps.resolvers?.[key] ?? SOURCE_RESOLVERS[key]
    const result = await runSourceWithTimeout(key, resolver, query, supabase)
    results.push(result)
  })

  const orderedResults = results.sort((left, right) => left.source.localeCompare(right.source))
  const baseItems = orderedResults.flatMap((result) => result.items)
  const filteredBaseItems = filterAgendaItems(baseItems, query.filters).sort(compareAgendaItems)
  const derivedResult = query.include.derivedAlerts
    ? resolveDerivedAlertsSource(filteredBaseItems, query)
    : createAgendaSourceResult("derived")
  const finalItems = filterAgendaItems([...filteredBaseItems, ...derivedResult.items], query.filters).sort(compareAgendaItems)
  const relationData = buildAgendaRelationGroups(finalItems)
  const sourceResults = query.include.derivedAlerts ? [...orderedResults, derivedResult] : orderedResults
  const errors = sourceResults.flatMap((result) => result.errors)

  const snapshotBase = {
    query,
    items: relationData.items,
    relationGroups: relationData.relationGroups,
    sourceResults,
    partial: sourceResults.some((result) => !result.ok),
    errors,
    generatedAt: new Date().toISOString(),
  }

  return {
    ...snapshotBase,
    summary: summarize(snapshotBase),
  }
}

// Délègue au résolveur partagé (mémoïsé par requête, JWT vérifié en local) au
// lieu de refaire getUser() + profiles. Ne prend plus de client en argument :
// il n'en avait besoin que pour cette résolution.
async function resolveServerAgendaContext() {
  const { resolveCurrentWorkspaceId } = await import("@/lib/supabase/workspace")
  const workspaceId = await resolveCurrentWorkspaceId()

  if (!workspaceId) {
    throw new Error("Agenda snapshot requires an authenticated user with a workspace")
  }

  return { workspaceId }
}

export async function loadAgendaSnapshot(
  input: Omit<BuildAgendaQueryInput, "workspaceId">,
  deps: Omit<AggregateAgendaSnapshotDeps, "supabase"> = {},
) {
  const { createClient } = await import("@/lib/supabase/server")
  const [supabase, context] = await Promise.all([
    createClient(),
    resolveServerAgendaContext(),
  ])
  const query = buildAgendaQuery({
    ...input,
    workspaceId: context.workspaceId,
  })

  return aggregateAgendaSnapshot(query, {
    ...deps,
    supabase,
  })
}
