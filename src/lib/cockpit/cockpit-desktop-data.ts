import "server-only"

import { getTrajectory2026 } from "@/app/(app)/missions/_data/get-trajectory-2026"
import { createClient } from "@/lib/supabase/server"
import { buildCockpitDesktopSnapshot, type CockpitDesktopSources } from "./cockpit-desktop-view-model"
import type { CockpitDesktopSnapshot } from "./cockpit-desktop-types"

type QueryResult<T> = { data: T[] | null; error: { message: string } | null }

async function read<T>(label: string, query: PromiseLike<QueryResult<T>>): Promise<T[]> {
  const { data, error } = await query
  if (error) console.error(`[cockpit-desktop] ${label}: ${error.message}`)
  return data ?? []
}

export async function getCockpitDesktopSnapshot(): Promise<CockpitDesktopSnapshot> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [
    companies,
    scores,
    signals,
    issues,
    opportunities,
    interactions,
    missions,
    projects,
    tasks,
    calendarEvents,
    aiRuns,
    trajectory,
  ] = await Promise.all([
    read<CockpitDesktopSources["companies"][number]>(
      "companies",
      supabase.from("companies").select("id,name,sector,next_action_at,next_action_label").returns<Array<{ id: string; name: string; sector: string | null; next_action_at: string | null; next_action_label: string | null }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, name: row.name, sector: row.sector, nextActionAt: row.next_action_at, nextActionLabel: row.next_action_label })) ?? null, error })),
    ),
    read<CockpitDesktopSources["scores"][number]>(
      "account scores",
      supabase.from("account_score_current").select("company_id,score_value,confidence_score").returns<Array<{ company_id: string; score_value: number | null; confidence_score: number | null }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ companyId: row.company_id, scoreValue: row.score_value, confidenceScore: row.confidence_score })) ?? null, error })),
    ),
    read<CockpitDesktopSources["signals"][number]>(
      "account signals",
      supabase.from("account_signals").select("id,company_id,title,recommended_action,status,expires_at,urgency_score,detected_at").returns<Array<{ id: string; company_id: string; title: string; recommended_action: string | null; status: string; expires_at: string | null; urgency_score: number | null; detected_at: string }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, companyId: row.company_id, title: row.title, recommendedAction: row.recommended_action, status: row.status, expiresAt: row.expires_at, urgencyScore: row.urgency_score, detectedAt: row.detected_at })) ?? null, error })),
    ),
    read<CockpitDesktopSources["issues"][number]>(
      "account issues",
      supabase.from("account_issues").select("id,company_id,title,urgency,status").returns<Array<{ id: string; company_id: string; title: string; urgency: number; status: string }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, companyId: row.company_id, title: row.title, urgency: row.urgency, status: row.status })) ?? null, error })),
    ),
    read<CockpitDesktopSources["opportunities"][number]>(
      "opportunities",
      supabase.from("opportunities").select("id,company_id,title,stage,weighted_gain,next_action_at,next_action_label,updated_at").returns<Array<{ id: string; company_id: string | null; title: string; stage: string | null; weighted_gain: number | null; next_action_at: string | null; next_action_label: string | null; updated_at: string }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, companyId: row.company_id, title: row.title, stage: row.stage, weightedGain: row.weighted_gain, nextActionAt: row.next_action_at, nextActionLabel: row.next_action_label, updatedAt: row.updated_at })) ?? null, error })),
    ),
    read<CockpitDesktopSources["interactions"][number]>(
      "interactions",
      supabase.from("interactions").select("company_id,occurred_at").returns<Array<{ company_id: string | null; occurred_at: string }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ companyId: row.company_id, occurredAt: row.occurred_at })) ?? null, error })),
    ),
    read<CockpitDesktopSources["missions"][number]>(
      "missions",
      supabase.from("missions").select("id,title,company_id,end_date,status").returns<Array<{ id: string; title: string; company_id: string; end_date: string | null; status: string }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, title: row.title, companyId: row.company_id, endDate: row.end_date, status: row.status })) ?? null, error })),
    ),
    read<CockpitDesktopSources["projects"][number]>(
      "projects",
      supabase.from("projects").select("id,title,end_date_planned,status,project_phases(status)").returns<Array<{ id: string; title: string; end_date_planned: string | null; status: string; project_phases: Array<{ status: string }> | null }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, title: row.title, endDate: row.end_date_planned, status: row.status, hasBlockedPhase: row.project_phases?.some((phase) => phase.status === "blocked") ?? false })) ?? null, error })),
    ),
    read<CockpitDesktopSources["tasks"][number]>(
      "tasks",
      supabase.from("tasks").select("id,title,due_date,priority,status,entity_type,entity_id").returns<Array<{ id: string; title: string; due_date: string | null; priority: string; status: string; entity_type: string | null; entity_id: string | null }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, title: row.title, dueDate: row.due_date, priority: row.priority, status: row.status, entityType: row.entity_type, entityId: row.entity_id })) ?? null, error })),
    ),
    read<CockpitDesktopSources["calendarEvents"][number]>(
      "calendar events",
      supabase.from("calendar_events").select("id,title,starts_at,company_id,opportunity_id").returns<Array<{ id: string; title: string; starts_at: string; company_id: string | null; opportunity_id: string | null }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, title: row.title, startsAt: row.starts_at, companyId: row.company_id, opportunityId: row.opportunity_id })) ?? null, error })),
    ),
    read<CockpitDesktopSources["aiRuns"][number]>(
      "AI runs",
      supabase.from("ai_intelligence_runs").select("id,company_id,run_type,status,started_at,created_at").eq("status", "running").returns<Array<{ id: string; company_id: string; run_type: string; status: string; started_at: string | null; created_at: string }>>().then(({ data, error }) => ({ data: data?.map((row) => ({ id: row.id, companyId: row.company_id, runType: row.run_type, status: row.status, startedAt: row.started_at, createdAt: row.created_at })) ?? null, error })),
    ),
    getTrajectory2026(),
  ])

  return buildCockpitDesktopSnapshot({
    now,
    companies,
    scores,
    signals,
    issues,
    opportunities,
    interactions,
    missions,
    projects,
    tasks,
    calendarEvents,
    aiRuns,
    trajectory: {
      points: trajectory.points.map((point) => ({
        monthLabel: point.monthLabel,
        revenueActual: point.revenueActual,
        revenueTarget: point.revenueTarget,
        marginActual: point.marginActual,
      })),
      ytdMarginTarget: trajectory.summary.ytdMarginTarget,
    },
  })
}
