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
      accountInactivityRisk: {
        id: "account-inactivity-risk",
        label: "Inactivité",
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
    // en parallèle de la requête de signaux.
    // Démontage complet des 5 requêtes brutes (sector_intelligence, sector_pain_points,
    // sector_events, sector_news, sector_regulatory_items).
    const [
      sectorKnowledgeModels,
      signalsResult,
    ] = await Promise.all([
      getSectorKnowledgeReadModels(segmentIds),
      supabase.from("v_active_account_signals").select<AccountSignalRow>("id,company_id,title,summary,signal_type,relevance_score,urgency_score,detected_at,recommended_action"),
    ])

    const signalRows = unwrapQueryResult("v_active_account_signals", signalsResult)

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
      sectors: activationModel.sectors,
      windows: activationModel.windows,
      filterOptions: activationModel.filterOptions,
      trust: {
        accountReach: portfolioSnapshot.trust.accountReach,
        accountMomentum: portfolioSnapshot.trust.accountMomentum30d,
        accountInactivityRisk: portfolioSnapshot.trust.accountInactivityRisk,
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
