"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  buildDetectRisks,
  type DetectRiskActivityReportRow,
  type DetectRiskAlertRow,
  type DetectRiskMissionRow,
  type DetectRisksRulesResult,
} from "./detect-risks-rules"
import { pickOne } from "./shared"

export type DetectRisksResult = DetectRisksRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }
type Relation<T> = T | T[] | null

type AlertRow = {
  collaborator_id: string | null
  full_name: string | null
  period_start: string | null
  activity_rate_percent: number | null
  real_margin_pct: number | null
  alert_low_activity: boolean | null
  alert_low_margin: boolean | null
  alert_negative_margin: boolean | null
  alert_high_sick_days: boolean | null
}

type MissionRow = {
  id: string
  title: string
  status: string | null
  end_date: string | null
  company_id: string
  companies: Relation<{ name: string | null }>
}

type ActivityReportRow = {
  id: string
  mission_id: string
  period_start: string
  status: string
  billable_days: number
  tjm_snapshot: number
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getDetectRisks(): Promise<DetectRisksResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return { generatedAt, risks: [], summary: { criticalCount: 0, warningCount: 0, healthyMissionsCount: 0, healthyMissionsPct: 100 }, sourceIssues: ["Non authentifié."] }
  }

  const now = new Date(generatedAt)
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6)

  const [alerts, missions, activityReports] = await Promise.all([
    safeRead<AlertRow>(
      "Alertes rentabilité",
      supabase
        .from("v_profitability_alerts")
        .select("collaborator_id,full_name,period_start,activity_rate_percent,real_margin_pct,alert_low_activity,alert_low_margin,alert_negative_margin,alert_high_sick_days")
        .order("period_start", { ascending: false })
        .limit(200)
        .returns<AlertRow[]>(),
    ),
    safeRead<MissionRow>(
      "Missions",
      supabase
        .from("missions")
        .select("id,title,status,end_date,company_id,companies(name)")
        .eq("status", "active")
        .limit(200)
        .returns<MissionRow[]>(),
    ),
    safeRead<ActivityReportRow>(
      "CRA missions",
      supabase
        .from("mission_activity_reports")
        .select("id,mission_id,period_start,status,billable_days,tjm_snapshot")
        .gte("period_start", sixMonthsAgo.toISOString().slice(0, 10))
        .order("period_start", { ascending: false })
        .limit(500)
        .returns<ActivityReportRow[]>(),
    ),
  ])

  const mapped = buildDetectRisks({
    now: generatedAt,
    alerts: alerts.data.map<DetectRiskAlertRow>((row) => ({
      collaboratorId: row.collaborator_id,
      fullName: row.full_name,
      periodStart: row.period_start,
      activityRatePercent: row.activity_rate_percent,
      realMarginPct: row.real_margin_pct,
      alertLowActivity: row.alert_low_activity,
      alertLowMargin: row.alert_low_margin,
      alertNegativeMargin: row.alert_negative_margin,
      alertHighSickDays: row.alert_high_sick_days,
    })),
    missions: missions.data.map<DetectRiskMissionRow>((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      endDate: row.end_date,
      companyId: row.company_id,
      companyName: pickOne(row.companies)?.name ?? null,
    })),
    activityReports: activityReports.data.map<DetectRiskActivityReportRow>((row) => ({
      id: row.id,
      missionId: row.mission_id,
      periodStart: row.period_start,
      status: row.status,
      billableDays: row.billable_days,
      tjmSnapshot: row.tjm_snapshot,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [alerts, missions, activityReports]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
