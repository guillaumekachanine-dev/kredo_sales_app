import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { getPortfolioIntelligenceSnapshot } from "./get-portfolio-intelligence-snapshot"
import type { BusinessIntelligenceSnapshot } from "./business-intelligence-types"
import { buildSectorActivationModel } from "../models/build-sector-activation-model"

type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type LooseTable = { select<T>(columns: string): LooseQuery<T> }
type LooseClient = { from(table: string): LooseTable }

type AccountSignalRow = {
  id: string
  company_id: string
  title: string
  summary: string | null
  signal_type: string
  relevance_score: number | string
  urgency_score: number | string
  detected_at: string
  recommended_action: string | null
}

export function mapAccountSignalRows(signalRows: AccountSignalRow[]) {
  return signalRows.map((signal) => ({
    id: signal.id,
    companyId: signal.company_id,
    title: signal.title,
    summary: signal.summary,
    category: signal.signal_type,
    relevanceScore: Number(signal.relevance_score),
    urgencyScore: Number(signal.urgency_score),
    detectedAt: signal.detected_at,
    recommendedAction: signal.recommended_action ?? null,
  }))
}

export function createBusinessIntelligenceSnapshotError(): BusinessIntelligenceSnapshot {
  return {
    state: "error",
    generatedAt: new Date().toISOString(),
    lastUpdatedAt: null,
    accounts: [],
    signals: [],
    scores: {},
    sectors: [],
    windows: [],
    filterOptions: { sectors: [], lifecycles: [], priorities: [], practices: [], sourceTypes: [], priorityBands: [], temporalStatuses: [], statusFilters: [] } as any,
    trust: {
      accountPotential: {} as any,
      accountReach: {} as any,
      accountMomentum: {} as any,
      priorityCalculated: {} as any,
    },
    dataQuality: {
      syntheticInteractionsCount: 0,
      realInteractionsCount: 0,
      hasDemoData: false,
      limitations: [],
    },
  }
}

function unwrapQueryResult<T>(source: string, result: Awaited<LooseQuery<T>>) {
  if (result.error) {
    throw new Error(`BI snapshot query failed for "${source}": ${result.error.message}`)
  }
  return result.data ?? []
}

export const getBusinessIntelligenceSnapshot = cache(async (): Promise<BusinessIntelligenceSnapshot> => {
  try {
    const portfolioSnapshot = await getPortfolioIntelligenceSnapshot()
    const supabase = (await createClient()) as unknown as LooseClient

    const [
      sectorsResult,
      painPointsResult,
      sectorEventsResult,
      sectorNewsResult,
      sectorRegulatoryResult,
      signalsResult,
      scoreRunsResult,
      scoreComponentsResult,
    ] = await Promise.all([
      supabase.from("sector_intelligence").select<any>("id,slug,name,description,status,attractiveness_score,market_size_eur_bn,market_growth_pct,digital_maturity,practices_fit,key_players_paca,key_players_national,avg_tjm_min,avg_tjm_max,playbook,caveats,updated_at"),

      supabase.from("sector_pain_points").select<any>("sector_id,id,title,description,frequency_count,kredo_practice,verbatim"),

      supabase.from("sector_events").select<any>("id,sector_id,title,event_type,description,event_date,source_url,commercial_opportunity,status,created_at,updated_at"),
      supabase.from("sector_news").select<any>("id,sector_id,title,source,url,summary,published_at,relevance_score,is_trigger_event,created_at"),
      supabase.from("sector_regulatory_items").select<any>("id,sector_id,name,authority,description,deadline_date,urgency,kredo_practice,commercial_angle,is_commercial_window,source_url,created_at,updated_at"),

      supabase.from("account_signals").select<AccountSignalRow>("id,company_id,title,summary,signal_type,relevance_score,urgency_score,detected_at,recommended_action"),
      supabase.from("account_score_current").select<any>("run_id,company_id,score_version,score_value,score_band,confidence_score,calculated_at,summary"),
      supabase.from("account_score_components").select<any>("score_run_id,component_key,component_label,normalized_score,weight,weighted_contribution,freshness_status"),
    ])

    const sectorRows = unwrapQueryResult("sector_intelligence", sectorsResult)
    const painPointRows = unwrapQueryResult("sector_pain_points", painPointsResult)
    const eventRows = unwrapQueryResult("sector_events", sectorEventsResult)
    const newsRows = unwrapQueryResult("sector_news", sectorNewsResult)
    const regulatoryRows = unwrapQueryResult("sector_regulatory_items", sectorRegulatoryResult)
    const signalRows = unwrapQueryResult("account_signals", signalsResult)
    const scoreRunRows = unwrapQueryResult("account_score_current", scoreRunsResult)
    const scoreComponentRows = unwrapQueryResult("account_score_components", scoreComponentsResult)

    const componentsByRunId = new Map<string, any[]>()
    for (const comp of scoreComponentRows) {
      const list = componentsByRunId.get(comp.score_run_id) ?? []
      list.push({
        key: comp.component_key,
        label: comp.component_label,
        normalizedScore: Number(comp.normalized_score),
        weight: Number(comp.weight),
        weightedContribution: Number(comp.weighted_contribution),
        freshnessStatus: comp.freshness_status,
      })
      componentsByRunId.set(comp.score_run_id, list)
    }

    const scores: Record<string, any> = {}
    for (const run of scoreRunRows) {
      scores[run.company_id] = {
        runId: run.run_id,
        scoreValue: Number(run.score_value),
        scoreBand: run.score_band,
        confidenceScore: Number(run.confidence_score),
        calculatedAt: run.calculated_at,
        scoreVersion: run.score_version,
        summary: run.summary,
        components: componentsByRunId.get(run.run_id) ?? [],
      }
    }

    const signals = mapAccountSignalRows(signalRows)

    // We still use buildSectorActivationModel internally to generate sectors, windows and filterOptions from BI snapshot.
    // Wait, the prompt says "buildSectorActivationModel(snapshot, options) Doit produire : les fenêtres triées, les secteurs à activer..."
    // We should build the snapshot state first.

    const baseSnapshot: any = {
      state: "ready",
      generatedAt: portfolioSnapshot.generatedAt,
      lastUpdatedAt: new Date().toISOString(),
      accounts: portfolioSnapshot.accounts,
      signals,
      scores,
      sectors: [], // We will compute this using buildSectorActivationModel or it's returned by the model
      windows: [],
      filterOptions: portfolioSnapshot.filterOptions,
      trust: portfolioSnapshot.trust,
      dataQuality: portfolioSnapshot.dataQuality,
      _rawSources: {
        sectorRows,
        painPointRows,
        eventRows,
        newsRows,
        regulatoryRows,
      }
    }

    // Now call the pure model to populate sectors and windows
    const activationModel = buildSectorActivationModel(baseSnapshot, { now: Date.now() })
    baseSnapshot.sectors = activationModel.sectors
    baseSnapshot.windows = activationModel.windows
    baseSnapshot.filterOptions = activationModel.filterOptions

    // Clean up internal raw sources
    delete baseSnapshot._rawSources

    return baseSnapshot as BusinessIntelligenceSnapshot
  } catch (error) {
    console.error("[BusinessIntelligenceSnapshot] load failed", {
      message: error instanceof Error ? error.message : String(error),
    })

    return createBusinessIntelligenceSnapshotError()
  }
})
