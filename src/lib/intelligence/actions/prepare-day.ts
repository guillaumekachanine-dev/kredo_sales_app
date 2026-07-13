"use server"

import { createClient } from "@/lib/supabase/server"
import { getTodayDateKey, startOfLocalDay } from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import { pickOne } from "./shared"
import {
  buildPrepareDay,
  type PrepareDayInteraction,
  type PrepareDayRulesResult,
  type PrepareDaySourceEvent,
  type PrepareDaySourceTask,
} from "./prepare-day-rules"

export type PrepareDayResult = PrepareDayRulesResult & {
  generatedAt: string
  timezone: typeof AGENDA_V1_TIMEZONE
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }
type Relation<T> = T | T[] | null

type EventRow = {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  event_type: string
  company_id: string | null
  candidate_id: string | null
  opportunity_id: string | null
  companies: Relation<{ name: string | null; lifecycle_status: string | null }>
  contacts: Relation<{ relationship_role: string | null; job_title: string | null; persons: Relation<{ full_name: string | null }> }>
  candidates: Relation<{ status: string | null; persons: Relation<{ full_name: string | null }> }>
  opportunities: Relation<{ title: string | null }>
}

type TaskRow = {
  id: string
  title: string
  priority: string
  status: string
  due_date: string | null
  entity_type: string | null
  entity_id: string | null
  linked_entity_type: string | null
  linked_entity_id: string | null
}

type InteractionRow = {
  company_id: string | null
  occurred_at: string
}

type HiringProcessRow = {
  candidate_id: string
  current_step: string
  status: string
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getPrepareDay(): Promise<PrepareDayResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return { generatedAt, timezone: AGENDA_V1_TIMEZONE, date: getTodayDateKey(generatedAt, AGENDA_V1_TIMEZONE), events: [], tasksDue: [], alerts: [], sourceIssues: ["Non authentifié."] }
  }

  const today = getTodayDateKey(generatedAt, AGENDA_V1_TIMEZONE)
  const from = startOfLocalDay(today, AGENDA_V1_TIMEZONE)
  const to = new Date(from)
  to.setUTCDate(to.getUTCDate() + 1)

  const [events, tasks, interactions, hiringProcesses] = await Promise.all([
    safeRead<EventRow>(
      "Événements du jour",
      supabase
        .from("calendar_events")
        .select(`
          id,
          title,
          starts_at,
          ends_at,
          event_type,
          company_id,
          candidate_id,
          opportunity_id,
          companies ( name, lifecycle_status ),
          contacts ( relationship_role, job_title, persons ( full_name ) ),
          candidates ( status, persons ( full_name ) ),
          opportunities ( title )
        `)
        .gte("starts_at", from.toISOString())
        .lt("starts_at", to.toISOString())
        .order("starts_at", { ascending: true })
        .limit(80)
        .returns<EventRow[]>(),
    ),
    safeRead<TaskRow>(
      "Tâches dues",
      supabase
        .from("tasks")
        .select("id,title,priority,status,due_date,entity_type,entity_id,linked_entity_type,linked_entity_id")
        .lte("due_date", today)
        .not("status", "eq", "done")
        .order("due_date", { ascending: true })
        .limit(80)
        .returns<TaskRow[]>(),
    ),
    safeRead<InteractionRow>(
      "Interactions",
      supabase
        .from("interactions")
        .select("company_id,occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(800)
        .returns<InteractionRow[]>(),
    ),
    safeRead<HiringProcessRow>(
      "Process candidats",
      supabase
        .from("candidate_hiring_processes")
        .select("candidate_id,current_step,status")
        .eq("status", "active")
        .limit(200)
        .returns<HiringProcessRow[]>(),
    ),
  ])

  const stepByCandidate = new Map(hiringProcesses.data.map((row) => [row.candidate_id, row.current_step]))
  const mapped = buildPrepareDay({
    now: generatedAt,
    timezone: AGENDA_V1_TIMEZONE,
    events: events.data.map<PrepareDaySourceEvent>((row) => {
      const company = pickOne(row.companies)
      const contact = pickOne(row.contacts)
      const contactPerson = pickOne(contact?.persons)
      const candidate = pickOne(row.candidates)
      const candidatePerson = pickOne(candidate?.persons)
      return {
        id: row.id,
        title: row.title,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        eventType: row.event_type,
        companyId: row.company_id,
        companyName: company?.name ?? null,
        companyLifecycle: company?.lifecycle_status ?? null,
        contactName: contactPerson?.full_name ?? null,
        contactRole: contact?.relationship_role ?? contact?.job_title ?? null,
        candidateId: row.candidate_id,
        candidateName: candidatePerson?.full_name ?? null,
        candidateStep: row.candidate_id ? stepByCandidate.get(row.candidate_id) ?? candidate?.status ?? null : null,
        opportunityId: row.opportunity_id,
        opportunityTitle: pickOne(row.opportunities)?.title ?? null,
      }
    }),
    tasks: tasks.data.map<PrepareDaySourceTask>((row) => ({
      id: row.id,
      title: row.title,
      priority: row.priority,
      status: row.status,
      dueDate: row.due_date,
      entityType: row.entity_type,
      entityId: row.entity_id,
      linkedEntityType: row.linked_entity_type,
      linkedEntityId: row.linked_entity_id,
    })),
    interactions: interactions.data.map<PrepareDayInteraction>((row) => ({
      companyId: row.company_id,
      occurredAt: row.occurred_at,
    })),
  })

  return {
    generatedAt,
    timezone: AGENDA_V1_TIMEZONE,
    ...mapped,
    sourceIssues: [events, tasks, interactions, hiringProcesses]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
