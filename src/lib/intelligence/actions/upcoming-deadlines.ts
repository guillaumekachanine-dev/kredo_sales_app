"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  buildUpcomingDeadlines,
  type DeadlineAbsenceRow,
  type DeadlineClosureRow,
  type DeadlineMissionRow,
  type DeadlineOpportunityRow,
  type UpcomingDeadlinesRulesResult,
} from "./upcoming-deadlines-rules"
import { asNumber, pickOne } from "./shared"

export type UpcomingDeadlinesResult = UpcomingDeadlinesRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }
type Relation<T> = T | T[] | null

type MissionRow = {
  id: string
  title: string
  status: string | null
  end_date: string | null
  company_id: string | null
  companies: Relation<{ name: string | null }>
  collaborators: Relation<{ persons: Relation<{ full_name: string | null }> }>
}

type ActivityReportRow = {
  mission_id: string
  period_start: string
  billable_days: number | null
  tjm_snapshot: number | null
}

type OpportunityRow = {
  id: string
  title: string
  stage: string | null
  target_close_date: string | null
  weighted_gain: number | null
  companies: Relation<{ name: string | null }>
}

type AbsenceRow = {
  id: string
  absence_type: string | null
  start_date: string | null
  duration_days: number | null
  collaborators: Relation<{ persons: Relation<{ full_name: string | null }> }>
}

type ClosureRow = {
  id: string
  label: string | null
  start_date: string | null
  end_date: string | null
  companies: Relation<{ name: string | null }>
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

const TERMINAL_OPPORTUNITY_STAGES = ["gagne", "perdu", "abandonne", "win", "lost", "non_traitee"]

export async function getUpcomingDeadlines(): Promise<UpcomingDeadlinesResult> {
  const generatedAt = new Date().toISOString()
  const empty: UpcomingDeadlinesResult = {
    generatedAt,
    ...buildUpcomingDeadlines({ now: generatedAt, missions: [], opportunities: [], absences: [], closures: [] }),
    sourceIssues: [],
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ...empty, sourceIssues: ["Non authentifié."] }

  const now = new Date(generatedAt)
  const horizonEnd = new Date(now)
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + 90)
  const horizonEndKey = horizonEnd.toISOString().slice(0, 10)
  const todayKey = now.toISOString().slice(0, 10)

  // Les CRA servent uniquement à constater le CA mensuel réel d'une mission qui
  // se termine. 4 mois suffisent : au-delà, le dernier CRA n'est plus une
  // référence utile pour un mois de facturation à venir.
  const craFloor = new Date(now)
  craFloor.setUTCMonth(craFloor.getUTCMonth() - 4)

  const [missions, activityReports, opportunities, absences, closures] = await Promise.all([
    safeRead<MissionRow>(
      "Missions",
      supabase
        .from("missions")
        .select("id,title,status,end_date,company_id,companies(name),collaborators(persons(full_name))")
        .eq("status", "active")
        .not("end_date", "is", null)
        .lte("end_date", horizonEndKey)
        .limit(200)
        .returns<MissionRow[]>(),
    ),
    safeRead<ActivityReportRow>(
      "CRA missions",
      supabase
        .from("mission_activity_reports")
        .select("mission_id,period_start,billable_days,tjm_snapshot")
        .gte("period_start", craFloor.toISOString().slice(0, 10))
        .order("period_start", { ascending: false })
        .limit(500)
        .returns<ActivityReportRow[]>(),
    ),
    safeRead<OpportunityRow>(
      "Opportunités",
      supabase
        .from("opportunities")
        .select("id,title,stage,target_close_date,weighted_gain,companies(name)")
        .not("target_close_date", "is", null)
        .lte("target_close_date", horizonEndKey)
        .not("stage", "in", `(${TERMINAL_OPPORTUNITY_STAGES.join(",")})`)
        .limit(200)
        .returns<OpportunityRow[]>(),
    ),
    safeRead<AbsenceRow>(
      "Absences",
      supabase
        .from("collaborator_absences")
        .select("id,absence_type,start_date,duration_days,collaborators(persons(full_name))")
        .gte("start_date", todayKey)
        .lte("start_date", horizonEndKey)
        .limit(300)
        .returns<AbsenceRow[]>(),
    ),
    safeRead<ClosureRow>(
      "Fermetures client",
      supabase
        .from("client_closures")
        .select("id,label,start_date,end_date,companies(name)")
        .gte("start_date", todayKey)
        .lte("start_date", horizonEndKey)
        .limit(200)
        .returns<ClosureRow[]>(),
    ),
  ])

  // Dernier CRA connu par mission — la requête est déjà triée par période
  // décroissante, la première occurrence est donc la bonne.
  const lastReportByMission = new Map<string, ActivityReportRow>()
  for (const report of activityReports.data) {
    if (!lastReportByMission.has(report.mission_id)) lastReportByMission.set(report.mission_id, report)
  }

  const mapped = buildUpcomingDeadlines({
    now: generatedAt,
    missions: missions.data.map<DeadlineMissionRow>((row) => {
      const report = lastReportByMission.get(row.id)
      const revenue = report && report.billable_days !== null && report.tjm_snapshot !== null
        ? asNumber(report.billable_days) * asNumber(report.tjm_snapshot)
        : null

      return {
        id: row.id,
        title: row.title,
        status: row.status,
        endDate: row.end_date,
        companyId: row.company_id,
        companyName: pickOne(row.companies)?.name ?? null,
        collaboratorName: pickOne(pickOne(row.collaborators)?.persons)?.full_name ?? null,
        lastMonthRevenueEur: revenue,
      }
    }),
    opportunities: opportunities.data.map<DeadlineOpportunityRow>((row) => ({
      id: row.id,
      title: row.title,
      stage: row.stage,
      targetCloseDate: row.target_close_date,
      companyName: pickOne(row.companies)?.name ?? null,
      weightedGain: row.weighted_gain,
    })),
    absences: absences.data.map<DeadlineAbsenceRow>((row) => ({
      id: row.id,
      collaboratorName: pickOne(pickOne(row.collaborators)?.persons)?.full_name ?? null,
      absenceType: row.absence_type,
      startDate: row.start_date,
      durationDays: row.duration_days,
    })),
    closures: closures.data.map<DeadlineClosureRow>((row) => ({
      id: row.id,
      label: row.label,
      companyName: pickOne(row.companies)?.name ?? null,
      startDate: row.start_date,
      endDate: row.end_date,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [missions, activityReports, opportunities, absences, closures]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
