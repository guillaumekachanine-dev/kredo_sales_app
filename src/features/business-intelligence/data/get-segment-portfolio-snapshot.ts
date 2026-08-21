import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import {
  buildProspectionPortfolioAccounts,
  type PortfolioCalendarEventRow,
  type PortfolioCompanyRow,
  type PortfolioContactRow,
  type PortfolioIntelligenceSummaryRow,
  type PortfolioOpportunityRow,
} from "@/lib/prospection/portfolio-account-metrics"
import type { SegmentPortfolioSnapshot } from "./business-intelligence-workspace-types"

type InteractionRow = {
  company_id: string | null
  type: string
  occurred_at: string
  details: Record<string, unknown> | null
}

type ScoreRunRow = {
  run_id: string
  company_id: string
  score_version: string
  score_value: number | string
  score_band: string
  confidence_score: number | string
  calculated_at: string
  summary: unknown
}

type ScoreComponentRow = {
  score_run_id: string
  component_key: string
  component_label: string
  normalized_score: number | string
  weight: number | string
  weighted_contribution: number | string
  freshness_status: string
}

export const getSegmentPortfolioSnapshot = cache(async (segmentId: string): Promise<SegmentPortfolioSnapshot> => {
  const supabase = await createClient()
  const companiesResult = await supabase
    .from("companies")
    .select("id,name,sector,sector_id,segment_id,lifecycle_status,priority,legacy_folio_score,knowledge_state,health,updated_at")
    .eq("segment_id", segmentId)
    .or("depth_level.is.null,depth_level.neq.mapped")
    .order("name")

  if (companiesResult.error) throw new Error(`Segment portfolio companies query failed: ${companiesResult.error.message}`)
  const companies = (companiesResult.data ?? []) as PortfolioCompanyRow[]
  const companyIds = companies.map((company) => company.id)

  let contacts: PortfolioContactRow[] = []
  let interactions: InteractionRow[] = []
  let calendarEvents: PortfolioCalendarEventRow[] = []
  let opportunities: PortfolioOpportunityRow[] = []
  let intelligenceRows: PortfolioIntelligenceSummaryRow[] = []
  let scoreRuns: ScoreRunRow[] = []

  if (companyIds.length > 0) {
    const [contactsResult, interactionsResult, calendarResult, opportunitiesResult, intelligenceResult, scoreRunsResult] = await Promise.all([
      supabase.from("contacts").select("company_id,relationship_role,decision_power").in("company_id", companyIds),
      supabase.from("interactions").select("company_id,type,occurred_at,details").in("company_id", companyIds),
      supabase.from("calendar_events").select("company_id,event_type,starts_at,status").in("company_id", companyIds),
      supabase.from("opportunities").select("company_id,stage,weighted_gain").in("company_id", companyIds),
      supabase.from("v_ai_intelligence_summary").select("company_id,has_client_analysis,has_sector_analysis,has_process_diagnostic,has_roadmap,has_legacy_analysis,has_legacy_sector,has_legacy_pitches,latest_run_at,latest_run_status,count_runs,count_results").in("company_id", companyIds),
      supabase.from("account_score_current").select("run_id,company_id,score_version,score_value,score_band,confidence_score,calculated_at,summary").in("company_id", companyIds),
    ])
    const error = contactsResult.error ?? interactionsResult.error ?? calendarResult.error ?? opportunitiesResult.error ?? intelligenceResult.error ?? scoreRunsResult.error
    if (error) throw new Error(`Segment portfolio dependent query failed: ${error.message}`)
    contacts = (contactsResult.data ?? []) as PortfolioContactRow[]
    interactions = (interactionsResult.data ?? []) as InteractionRow[]
    calendarEvents = (calendarResult.data ?? []) as PortfolioCalendarEventRow[]
    opportunities = (opportunitiesResult.data ?? []) as PortfolioOpportunityRow[]
    intelligenceRows = (intelligenceResult.data ?? []) as PortfolioIntelligenceSummaryRow[]
    scoreRuns = (scoreRunsResult.data ?? []) as ScoreRunRow[]
  }

  const runIds = scoreRuns.map((run) => run.run_id)
  let scoreComponents: ScoreComponentRow[] = []
  if (runIds.length > 0) {
    const componentsResult = await supabase.from("account_score_components").select("score_run_id,component_key,component_label,normalized_score,weight,weighted_contribution,freshness_status").in("score_run_id", runIds)
    if (componentsResult.error) throw new Error(`Segment score components query failed: ${componentsResult.error.message}`)
    scoreComponents = (componentsResult.data ?? []) as ScoreComponentRow[]
  }

  const componentsByRunId = new Map<string, SegmentPortfolioSnapshot["scores"][string]["components"]>()
  for (const component of scoreComponents) {
    const current = componentsByRunId.get(component.score_run_id) ?? []
    current.push({
      key: component.component_key,
      label: component.component_label,
      normalizedScore: Number(component.normalized_score),
      weight: Number(component.weight),
      weightedContribution: Number(component.weighted_contribution),
      freshnessStatus: component.freshness_status,
    })
    componentsByRunId.set(component.score_run_id, current)
  }
  const scores: SegmentPortfolioSnapshot["scores"] = {}
  for (const run of scoreRuns) {
    scores[run.company_id] = {
      runId: run.run_id,
      scoreValue: Number(run.score_value),
      scoreBand: run.score_band,
      confidenceScore: Number(run.confidence_score),
      calculatedAt: run.calculated_at,
      scoreVersion: run.score_version,
      summary: typeof run.summary === "string" ? run.summary : null,
      components: componentsByRunId.get(run.run_id) ?? [],
    }
  }

  const now = Date.now()
  const portfolio = buildProspectionPortfolioAccounts({
    companies,
    contacts,
    interactions,
    calendarEvents,
    opportunities,
    intelligenceRows,
    now,
  })

  let syntheticInteractionsCount = 0
  let realInteractionsCount = 0
  for (const interaction of interactions) {
    const details = interaction.details
    if (details && (details.fictional === "true" || details.synthetic === "true" || details.dataset_batch || details.seed_key)) {
      syntheticInteractionsCount += 1
    } else {
      realInteractionsCount += 1
    }
  }
  const hasDemoData = syntheticInteractionsCount > 0

  return {
    accounts: portfolio.accounts,
    scores,
    filterOptions: portfolio.filterOptions,
    trust: portfolio.trust,
    metrics: {
      totalAccounts: portfolio.metrics.totalAccounts,
      scoredAccounts: portfolio.metrics.scoredAccounts,
    },
    generatedAt: new Date(now).toISOString(),
    sourceRows: { companies, contacts, interactions, calendarEvents, opportunities, intelligenceRows },
    dataQuality: {
      syntheticInteractionsCount,
      realInteractionsCount,
      hasDemoData,
      limitations: hasDemoData ? ["Contient des données de démonstration fictives, à exclure des analyses réelles."] : [],
    },
  }
})
