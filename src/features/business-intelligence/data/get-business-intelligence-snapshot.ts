import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { getPortfolioIntelligenceSnapshot } from "./get-portfolio-intelligence-snapshot"
import type { BusinessIntelligenceSnapshot } from "./business-intelligence-types"
import { buildSectorActivationModel } from "../models/build-sector-activation-model"
import { getSectorKnowledgeReadModels } from "@/features/master-study/data/get-sector-knowledge-read-model"

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

type AccountScoreCurrentRow = {
  run_id: string
  company_id: string
  score_version: string
  score_value: number | string
  score_band: string
  confidence_score: number | string
  calculated_at: string
  summary: string | null
}

type AccountScoreComponentRow = {
  score_run_id: string
  component_key: string
  component_label: string
  normalized_score: number | string
  weight: number | string
  weighted_contribution: number | string
  freshness_status: string
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
    filterOptions: {
      sectors: [],
      practices: [],
      sourceTypes: [],
      priorityBands: [],
      temporalStatuses: [],
      statusFilters: [],
    },
    trust: {
      accountPotential: {
        id: "account-potential",
        label: "Potentiel",
        primaryOrigin: "PROXY",
        origins: ["PROXY"],
        formula: "",
        freshness: { latestAt: null, label: "Indisponible" },
        completeness: { value: 0, label: "0%" },
        limitations: [],
      },
      accountReach: {
        id: "account-reach",
        label: "Couverture",
        primaryOrigin: "PROXY",
        origins: ["PROXY"],
        formula: "",
        freshness: { latestAt: null, label: "Indisponible" },
        completeness: { value: 0, label: "0%" },
        limitations: [],
      },
      accountMomentum: {
        id: "account-momentum",
        label: "Dynamique",
        primaryOrigin: "PROXY",
        origins: ["PROXY"],
        formula: "",
        freshness: { latestAt: null, label: "Indisponible" },
        completeness: { value: 0, label: "0%" },
        limitations: [],
      },
      priorityCalculated: {
        id: "priority-calculated",
        label: "Priorité calculée",
        primaryOrigin: "PROXY",
        origins: ["PROXY"],
        formula: "",
        freshness: { latestAt: null, label: "Indisponible" },
        completeness: { value: 0, label: "0%" },
        limitations: [],
      },
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

    // Dériver la liste dédupliquée des segmentIds réellement présents dans le portefeuille
    const segmentIds = Array.from(
      new Set(
        portfolioSnapshot.accounts
          .map((account) => account.segmentId)
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
      ),
    )

    // Un seul appel getSectorKnowledgeReadModels pour tous les segments demandés,
    // en parallèle des requêtes de signaux et scores.
    // Démontage complet des 5 requêtes brutes (sector_intelligence, sector_pain_points,
    // sector_events, sector_news, sector_regulatory_items).
    const [
      sectorKnowledgeModels,
      signalsResult,
      scoreRunsResult,
      scoreComponentsResult,
    ] = await Promise.all([
      getSectorKnowledgeReadModels(segmentIds),
      supabase.from("account_signals").select<AccountSignalRow>("id,company_id,title,summary,signal_type,relevance_score,urgency_score,detected_at,recommended_action"),
      supabase.from("account_score_current").select<AccountScoreCurrentRow>("run_id,company_id,score_version,score_value,score_band,confidence_score,calculated_at,summary"),
      supabase.from("account_score_components").select<AccountScoreComponentRow>("score_run_id,component_key,component_label,normalized_score,weight,weighted_contribution,freshness_status"),
    ])

    const signalRows = unwrapQueryResult("account_signals", signalsResult)
    const scoreRunRows = unwrapQueryResult("account_score_current", scoreRunsResult)
    const scoreComponentRows = unwrapQueryResult("account_score_components", scoreComponentsResult)

    const componentsByRunId = new Map<string, Array<{
      key: string
      label: string
      normalizedScore: number
      weight: number
      weightedContribution: number
      freshnessStatus: string
    }>>()
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

    const scores: BusinessIntelligenceSnapshot["scores"] = {}
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

    // Modèle d'activation alimenté directement par le read model
    const activationModel = buildSectorActivationModel(
      {
        accounts: portfolioSnapshot.accounts,
        sectorKnowledgeModels,
      },
      { now: Date.now() },
    )

    const baseSnapshot: BusinessIntelligenceSnapshot = {
      state: "ready",
      generatedAt: portfolioSnapshot.generatedAt,
      lastUpdatedAt: new Date().toISOString(),
      accounts: portfolioSnapshot.accounts,
      signals,
      scores,
      sectors: activationModel.sectors,
      windows: activationModel.windows,
      filterOptions: activationModel.filterOptions,
      trust: {
        accountPotential: portfolioSnapshot.trust.accountPotential,
        accountReach: portfolioSnapshot.trust.accountReach,
        accountMomentum: portfolioSnapshot.trust.accountMomentum30d,
        priorityCalculated: portfolioSnapshot.trust.commandCenterPriority,
      },
      dataQuality: portfolioSnapshot.dataQuality,
    }

    return baseSnapshot
  } catch (error) {
    console.error("[BusinessIntelligenceSnapshot] load failed", {
      message: error instanceof Error ? error.message : String(error),
    })

    return createBusinessIntelligenceSnapshotError()
  }
})
