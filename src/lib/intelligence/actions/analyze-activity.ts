"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  buildAnalyzeActivity,
  type AnalyzeActivityAbsenceRow,
  type AnalyzeActivityAlertRow,
  type AnalyzeActivityCollaboratorRow,
  type AnalyzeActivityMissionRow,
  type AnalyzeActivityRulesResult,
  type AnalyzeActivityYtdRow,
} from "./analyze-activity-rules"
import { pickOne } from "./shared"

export type AnalyzeActivityResult = AnalyzeActivityRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }
type Relation<T> = T | T[] | null

type YtdRow = {
  collaborator_id: string | null
  full_name: string | null
  ytd_activity_rate: number | null
  taci_target: number | null
  gap_vs_target: number | null
  ytd_revenue: number | null
  ytd_real_margin: number | null
}

type AlertRow = {
  collaborator_id: string | null
  alert_low_activity: boolean | null
  alert_low_margin: boolean | null
  alert_negative_margin: boolean | null
  alert_high_sick_days: boolean | null
  alert_cra_not_validated: boolean | null
}

type MissionRow = {
  id: string
  collaborator_id: string
  title: string
  status: string | null
  start_date: string | null
  end_date: string | null
}

type AbsenceRow = {
  collaborator_id: string
  start_date: string
  end_date: string
  duration_days: number
}

type CollaboratorRow = {
  id: string
  practice: string | null
  status: string | null
  persons: Relation<{ full_name: string | null }>
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getAnalyzeActivity(): Promise<AnalyzeActivityResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return { generatedAt, recommendations: [], summary: { healthyCount: 0, attentionCount: 0, actionNeededCount: 0, avgActivityRate: 0, avgMarginPct: 0 }, sourceIssues: ["Non authentifié."] }
  }

  const now = new Date(generatedAt)
  const in30Days = new Date(now)
  in30Days.setUTCDate(in30Days.getUTCDate() + 30)
  const year = now.getFullYear()
  const yearStart = `${year}-01-01`

  const [ytd, alerts, missions, absences, collaborators] = await Promise.all([
    safeRead<YtdRow>(
      "Activité YTD",
      supabase
        .from("v_collaborator_ytd_activity")
        .select("collaborator_id,full_name,ytd_activity_rate,taci_target,gap_vs_target,ytd_revenue,ytd_real_margin")
        .eq("year", year)
        .limit(200)
        .returns<YtdRow[]>(),
    ),
    safeRead<AlertRow>(
      "Alertes rentabilité",
      supabase
        .from("v_profitability_alerts")
        .select("collaborator_id,alert_low_activity,alert_low_margin,alert_negative_margin,alert_high_sick_days,alert_cra_not_validated")
        .gte("period_start", yearStart)
        .order("period_start", { ascending: false })
        .limit(300)
        .returns<AlertRow[]>(),
    ),
    safeRead<MissionRow>(
      "Missions",
      supabase
        .from("missions")
        .select("id,collaborator_id,title,status,start_date,end_date")
        .eq("status", "active")
        .limit(300)
        .returns<MissionRow[]>(),
    ),
    safeRead<AbsenceRow>(
      "Absences",
      supabase
        .from("collaborator_absences")
        .select("collaborator_id,start_date,end_date,duration_days")
        .lte("start_date", in30Days.toISOString().slice(0, 10))
        .gte("end_date", now.toISOString().slice(0, 10))
        .limit(300)
        .returns<AbsenceRow[]>(),
    ),
    safeRead<CollaboratorRow>(
      "Collaborateurs",
      supabase
        .from("collaborators")
        .select("id,practice,status,persons(full_name)")
        .limit(300)
        .returns<CollaboratorRow[]>(),
    ),
  ])

  const mapped = buildAnalyzeActivity({
    now: generatedAt,
    ytd: ytd.data.map<AnalyzeActivityYtdRow>((row) => ({
      collaboratorId: row.collaborator_id,
      fullName: row.full_name,
      activityRateYtd: row.ytd_activity_rate,
      taciTarget: row.taci_target,
      gapVsTarget: row.gap_vs_target,
      ytdRevenue: row.ytd_revenue,
      ytdRealMargin: row.ytd_real_margin,
    })),
    alerts: alerts.data.map<AnalyzeActivityAlertRow>((row) => ({
      collaboratorId: row.collaborator_id,
      alertLowActivity: row.alert_low_activity,
      alertLowMargin: row.alert_low_margin,
      alertNegativeMargin: row.alert_negative_margin,
      alertHighSickDays: row.alert_high_sick_days,
      alertCraNotValidated: row.alert_cra_not_validated,
    })),
    missions: missions.data.map<AnalyzeActivityMissionRow>((row) => ({
      id: row.id,
      collaboratorId: row.collaborator_id,
      title: row.title,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
    })),
    absences: absences.data.map<AnalyzeActivityAbsenceRow>((row) => ({
      collaboratorId: row.collaborator_id,
      startDate: row.start_date,
      endDate: row.end_date,
      durationDays: row.duration_days,
    })),
    collaborators: collaborators.data.map<AnalyzeActivityCollaboratorRow>((row) => ({
      id: row.id,
      fullName: pickOne(row.persons)?.full_name ?? null,
      practice: row.practice,
      status: row.status,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [ytd, alerts, missions, absences, collaborators]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
