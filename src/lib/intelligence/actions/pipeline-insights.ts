"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { pickOne } from "./shared"
import {
  buildPipelineInsights,
  type PipelineInsightsRulesResult,
  type PipelineInteractionRow,
  type PipelineOpportunityRow,
  type PipelinePnlRow,
} from "./pipeline-insights-rules"

export type PipelineInsightsResult = PipelineInsightsRulesResult & {
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
  updated_at: string | null
  companies: Relation<{ name: string | null }>
}

type InteractionRow = {
  id: string
  opportunity_id: string | null
  company_id: string | null
  occurred_at: string | null
}

type PnlRow = {
  period_month: string
  revenue_total: number
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getPipelineInsights(): Promise<PipelineInsightsResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return {
      generatedAt,
      weightedPipe: 0,
      weightedPipeDelta: null,
      weightedPipeDeltaTone: "stable",
      openOpportunitiesCount: 0,
      stageDistribution: [],
      insights: [],
      sourceIssues: ["Non authentifié."],
    }
  }

  const recentCutoff = new Date(generatedAt)
  recentCutoff.setUTCDate(recentCutoff.getUTCDate() - 90)

  const [opportunities, interactions, pnlMonths] = await Promise.all([
    safeRead<OpportunityRow>(
      "Opportunités",
      supabase
        .from("opportunities")
        .select("id,title,stage,company_id,weighted_gain,updated_at,companies(name)")
        .order("updated_at", { ascending: false })
        .limit(250)
        .returns<OpportunityRow[]>(),
    ),
    safeRead<InteractionRow>(
      "Interactions",
      supabase
        .from("interactions")
        .select("id,opportunity_id,company_id,occurred_at")
        .gte("occurred_at", recentCutoff.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(500)
        .returns<InteractionRow[]>(),
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
  ])

  const mapped = buildPipelineInsights({
    now: generatedAt,
    opportunities: opportunities.data.map<PipelineOpportunityRow>((row) => ({
      id: row.id,
      title: row.title,
      stage: row.stage,
      companyId: row.company_id,
      companyName: pickOne(row.companies)?.name ?? null,
      weightedGain: row.weighted_gain,
      updatedAt: row.updated_at,
    })),
    interactions: interactions.data.map<PipelineInteractionRow>((row) => ({
      id: row.id,
      opportunityId: row.opportunity_id,
      companyId: row.company_id,
      occurredAt: row.occurred_at,
    })),
    pnlMonths: pnlMonths.data.map<PipelinePnlRow>((row) => ({
      periodMonth: row.period_month,
      revenueTotal: row.revenue_total,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [opportunities, interactions, pnlMonths]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
