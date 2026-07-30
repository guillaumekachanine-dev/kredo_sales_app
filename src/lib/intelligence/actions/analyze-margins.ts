"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { pickOne } from "./shared"
import {
  buildAnalyzeMargins,
  type AnalyzeMarginsRulesResult,
  type MarginActivitySummaryRow,
  type MarginMissionRow,
} from "./recruitment-margin-rules"

export type AnalyzeMarginsResult = AnalyzeMarginsRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }
type Relation<T> = T | T[] | null

type MissionRow = {
  id: string
  title: string
  status: string | null
  gross_margin_pct: number | null
  practice: string | null
  company_id: string | null
  collaborator_id: string | null
  companies: Relation<{ name: string | null }>
}

type ActivitySummaryRow = {
  collaborator_id: string
  full_name: string | null
  period_start: string | null
  real_margin_pct: number | null
  revenue: number | null
  real_margin: number | null
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getAnalyzeMargins(): Promise<AnalyzeMarginsResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return {
      generatedAt,
      summary: { activeMissions: 0, negativeMargins: 0, lowMargins: 0, unknownMargins: 0 },
      worstMargins: [],
      financeHref: "/finance",
      sourceIssues: ["Non authentifié."],
    }
  }

  const [missions, activitySummaries] = await Promise.all([
    safeRead<MissionRow>(
      "Missions actives",
      supabase
        .from("missions")
        .select("id,title,status,gross_margin_pct,practice,company_id,collaborator_id,companies(name)")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(300)
        .returns<MissionRow[]>(),
    ),
    safeRead<ActivitySummaryRow>(
      "Synthèse activité",
      supabase
        .from("v_collaborator_activity_summary")
        .select("collaborator_id,full_name,period_start,real_margin_pct,revenue,real_margin")
        .order("period_start", { ascending: false })
        .limit(1000)
        .returns<ActivitySummaryRow[]>(),
    ),
  ])

  const mapped = buildAnalyzeMargins({
    missions: missions.data.map<MarginMissionRow>((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      grossMarginPct: row.gross_margin_pct,
      practice: row.practice,
      companyName: pickOne(row.companies)?.name ?? null,
      collaboratorId: row.collaborator_id,
    })),
    activitySummaries: activitySummaries.data.map<MarginActivitySummaryRow>((row) => ({
      collaboratorId: row.collaborator_id,
      fullName: row.full_name,
      periodStart: row.period_start,
      realMarginPct: row.real_margin_pct,
      revenue: row.revenue,
      realMargin: row.real_margin,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [missions, activitySummaries]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
