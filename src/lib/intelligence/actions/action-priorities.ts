"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { endOfLocalDayInclusive, getTodayDateKey, startOfLocalDay } from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import { pickOne } from "./shared"
import {
  buildActionPriorities,
  type ActionPrioritiesRulesResult,
  type ActionPriorityAlert,
  type ActionPriorityCalendarEvent,
  type ActionPriorityInteraction,
  type ActionPriorityMission,
  type ActionPriorityOpportunity,
} from "./action-priorities-rules"

export type ActionPrioritiesResult = ActionPrioritiesRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }
type Relation<T> = T | T[] | null

type OpportunityRow = {
  id: string
  title: string
  stage: string | null
  company_id: string | null
  weighted_gain: number | null
  estimated_gain: number | null
  next_action_at: string | null
  target_close_date: string | null
  updated_at: string
  companies: Relation<{ name: string | null }>
}

type MissionRow = {
  id: string
  title: string
  end_date: string | null
  status: string | null
  opportunity_id: string | null
  companies: Relation<{ name: string | null }>
}

type AlertRow = {
  collaborator_id: string | null
  full_name: string | null
  period_start: string | null
  alert_cra_not_validated: boolean | null
  alert_low_activity: boolean | null
  alert_low_margin: boolean | null
  alert_negative_margin: boolean | null
}

type InteractionRow = {
  company_id: string | null
  opportunity_id: string | null
  occurred_at: string
}

type CalendarEventRow = {
  id: string
  title: string
  starts_at: string
  companies: Relation<{ name: string | null }>
}

type TaskCalendarLinkRow = {
  calendar_event_id: string | null
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getActionPriorities(): Promise<ActionPrioritiesResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return { generatedAt, items: [], meta: { accountsWithoutRecentAction: 0, oppsStagnating: 0, missionsEndingSoon: 0, craNotValidated: 0 }, sourceIssues: ["Non authentifié."] }
  }

  const today = getTodayDateKey(generatedAt, AGENDA_V1_TIMEZONE)
  const weekEnd = new Date(startOfLocalDay(today, AGENDA_V1_TIMEZONE))
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const [
    opportunities,
    missions,
    alerts,
    interactions,
    calendarEvents,
    taskLinks,
  ] = await Promise.all([
    safeRead<OpportunityRow>(
      "Opportunités",
      supabase
        .from("opportunities")
        .select("id,title,stage,company_id,weighted_gain,estimated_gain,next_action_at,target_close_date,updated_at,companies(name)")
        .not("stage", "in", "(gagne,perdu,abandonne,win,lost)")
        .limit(150)
        .returns<OpportunityRow[]>(),
    ),
    safeRead<MissionRow>(
      "Missions",
      supabase
        .from("missions")
        .select("id,title,end_date,status,opportunity_id,companies(name)")
        .eq("status", "active")
        .lte("end_date", weekEnd.toISOString().slice(0, 10))
        .limit(150)
        .returns<MissionRow[]>(),
    ),
    safeRead<AlertRow>(
      "Alertes rentabilité",
      supabase
        .from("v_profitability_alerts")
        .select("collaborator_id,full_name,period_start,alert_cra_not_validated,alert_low_activity,alert_low_margin,alert_negative_margin")
        .order("period_start", { ascending: false })
        .limit(200)
        .returns<AlertRow[]>(),
    ),
    safeRead<InteractionRow>(
      "Interactions",
      supabase
        .from("interactions")
        .select("company_id,opportunity_id,occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(1000)
        .returns<InteractionRow[]>(),
    ),
    safeRead<CalendarEventRow>(
      "Événements agenda",
      supabase
        .from("calendar_events")
        .select("id,title,starts_at,companies(name)")
        .gte("starts_at", startOfLocalDay(today, AGENDA_V1_TIMEZONE).toISOString())
        .lte("starts_at", weekEnd.toISOString())
        .limit(100)
        .returns<CalendarEventRow[]>(),
    ),
    safeRead<TaskCalendarLinkRow>(
      "Tâches préparatoires",
      supabase
        .from("tasks")
        .select("calendar_event_id")
        .not("calendar_event_id", "is", null)
        .limit(200)
        .returns<TaskCalendarLinkRow[]>(),
    ),
  ])

  const taskEventIds = new Set(taskLinks.data.map((task) => task.calendar_event_id).filter(Boolean))
  const mapped = buildActionPriorities({
    now: generatedAt,
    opportunities: opportunities.data.map<ActionPriorityOpportunity>((row) => ({
      id: row.id,
      title: row.title,
      stage: row.stage,
      companyId: row.company_id,
      companyName: pickOne(row.companies)?.name ?? null,
      weightedGain: row.weighted_gain,
      estimatedGain: row.estimated_gain,
      nextActionAt: row.next_action_at,
      targetCloseDate: row.target_close_date,
      updatedAt: row.updated_at,
    })),
    missions: missions.data.map<ActionPriorityMission>((row) => ({
      id: row.id,
      title: row.title,
      companyName: pickOne(row.companies)?.name ?? null,
      endDate: row.end_date,
      status: row.status,
      opportunityId: row.opportunity_id,
    })),
    alerts: alerts.data.map<ActionPriorityAlert>((row) => ({
      collaboratorId: row.collaborator_id,
      fullName: row.full_name,
      periodStart: row.period_start,
      alertCraNotValidated: row.alert_cra_not_validated,
      alertLowActivity: row.alert_low_activity,
      alertLowMargin: row.alert_low_margin,
      alertNegativeMargin: row.alert_negative_margin,
    })),
    interactions: interactions.data.map<ActionPriorityInteraction>((row) => ({
      companyId: row.company_id,
      opportunityId: row.opportunity_id,
      occurredAt: row.occurred_at,
    })),
    calendarEvents: calendarEvents.data.map<ActionPriorityCalendarEvent>((row) => ({
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      companyName: pickOne(row.companies)?.name ?? null,
      hasPreparatoryTask: taskEventIds.has(row.id),
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [opportunities, missions, alerts, interactions, calendarEvents, taskLinks]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
