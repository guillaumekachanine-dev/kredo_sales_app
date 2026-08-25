"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  computeMonthlyForecast,
  type ForecastAbsenceRow,
  type ForecastClientClosureRow,
  type ForecastCompanyRow,
  type ForecastMissionRow,
  type ForecastOpportunityRow,
  type ForecastPnlRow,
  type ForecastRevenueRulesResult,
} from "./forecast-revenue-rules"

export type ForecastRevenueResult = ForecastRevenueRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }

type MissionRow = {
  id: string
  title: string
  status: string | null
  tjm: number | null
  start_date: string | null
  end_date: string | null
  collaborator_id: string | null
  company_id: string | null
}

type OpportunityRow = {
  id: string
  title: string
  stage: string | null
  weighted_gain: number | null
  estimated_gain: number | null
  duration_days: number | null
  next_action_at: string | null
  created_at: string | null
}

type AbsenceRow = {
  collaborator_id: string
  start_date: string
  end_date: string
}

type ClientClosureRow = {
  company_id: string
  start_date: string
  end_date: string
}

type PnlRow = {
  period_month: string
  revenue_total: number
}

type CompanyRow = {
  id: string
  name: string
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

function projectionWindow(generatedAt: string) {
  const now = new Date(generatedAt)
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 4, 0))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export async function getForecastRevenue(): Promise<ForecastRevenueResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return {
      generatedAt,
      months: [],
      summary: {
        q_current_realistic: 0,
        q_next_realistic: 0,
        missionsCoveringNextQuarter: 0,
        missionsEndingNextQuarter: 0,
        pipeWeightedTotal: 0,
        trend: "stable",
      },
      clientBreakdown: [],
      sourceIssues: ["Non authentifié."],
    }
  }

  const window = projectionWindow(generatedAt)

  const [missions, opportunities, absences, clientClosures, pnlMonths, companies] = await Promise.all([
    safeRead<MissionRow>(
      "Missions",
      supabase
        .from("missions")
        .select("id,title,status,tjm,start_date,end_date,collaborator_id,company_id")
        .eq("status", "active")
        .or(`end_date.is.null,end_date.gte.${window.start}`)
        .limit(300)
        .returns<MissionRow[]>(),
    ),
    safeRead<OpportunityRow>(
      "Opportunités",
      supabase
        .from("opportunities")
        .select("id,title,stage,weighted_gain,estimated_gain,duration_days,next_action_at,created_at")
        .limit(250)
        .returns<OpportunityRow[]>(),
    ),
    safeRead<AbsenceRow>(
      "Absences",
      supabase
        .from("collaborator_absences")
        .select("collaborator_id,start_date,end_date")
        .lte("start_date", window.end)
        .gte("end_date", window.start)
        .limit(500)
        .returns<AbsenceRow[]>(),
    ),
    safeRead<ClientClosureRow>(
      "Fermetures clients",
      supabase
        .from("client_closures")
        .select("company_id,start_date,end_date")
        .lte("start_date", window.end)
        .gte("end_date", window.start)
        .limit(500)
        .returns<ClientClosureRow[]>(),
    ),
    safeRead<PnlRow>(
      "P&L mensuel",
      supabase
        .from("pnl_monthly")
        .select("period_month,revenue_total")
        .order("period_month", { ascending: false })
        .limit(6)
        .returns<PnlRow[]>(),
    ),
    safeRead<CompanyRow>(
      "Comptes",
      supabase
        .from("companies")
        .select("id,name")
        .limit(500)
        .returns<CompanyRow[]>(),
    ),
  ])

  const mapped = computeMonthlyForecast({
    now: generatedAt,
    missions: missions.data.map<ForecastMissionRow>((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      tjm: row.tjm,
      startDate: row.start_date,
      endDate: row.end_date,
      collaboratorId: row.collaborator_id,
      companyId: row.company_id,
    })),
    opportunities: opportunities.data.map<ForecastOpportunityRow>((row) => ({
      id: row.id,
      title: row.title,
      stage: row.stage,
      weightedGain: row.weighted_gain,
      estimatedGain: row.estimated_gain,
      durationDays: row.duration_days,
      nextActionAt: row.next_action_at,
      createdAt: row.created_at,
    })),
    absences: absences.data.map<ForecastAbsenceRow>((row) => ({
      collaboratorId: row.collaborator_id,
      startDate: row.start_date,
      endDate: row.end_date,
    })),
    clientClosures: clientClosures.data.map<ForecastClientClosureRow>((row) => ({
      companyId: row.company_id,
      startDate: row.start_date,
      endDate: row.end_date,
    })),
    pnlMonths: pnlMonths.data.map<ForecastPnlRow>((row) => ({
      periodMonth: row.period_month,
      revenueTotal: row.revenue_total,
    })),
    companies: companies.data.map<ForecastCompanyRow>((row) => ({
      id: row.id,
      name: row.name,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [missions, opportunities, absences, clientClosures, pnlMonths, companies]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
