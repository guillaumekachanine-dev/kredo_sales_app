import type { ProspectionPortfolioAccount, PortfolioTrustBundle } from "@/lib/prospection/portfolio-account-metrics"
import type { SectorActivationSector, SectorActivationWindow, SectorActivationFilterOptions } from "@/lib/prospection/sector-activation-types"

export type DataOrigin = "REAL_NATIVE" | "REAL_LEGACY" | "PROXY" | "FUTURE_DEMO"

export interface DataTrustMeta {
  id: string
  label: string
  primaryOrigin: DataOrigin
  origins: DataOrigin[]
  formula: string
  freshness: {
    latestAt: string | null
    label: string
  }
  completeness: {
    value: number
    label: string
  }
  limitations: string[]
}

export interface PortfolioIntelligenceSnapshot {
  accounts: ProspectionPortfolioAccount[]
  filterOptions: {
    sectors: string[]
    lifecycles: string[]
    priorities: string[]
  }
  trust: PortfolioTrustBundle
  metrics: {
    totalAccounts: number
    scoredAccounts: number
  }
  generatedAt: string
  // To allow downstream loaders to do what they need without refetching
  sourceRows: {
    companies: any[]
    contacts: any[]
    interactions: any[]
    calendarEvents: any[]
    opportunities: any[]
    intelligenceRows: any[]
  }
  dataQuality: {
    syntheticInteractionsCount: number
    realInteractionsCount: number
    hasDemoData: boolean
    limitations: string[]
  }
}

export interface BusinessIntelligenceSnapshot {
  state: "ready" | "error"
  generatedAt: string
  lastUpdatedAt: string | null
  accounts: ProspectionPortfolioAccount[]
  signals: {
    id: string
    companyId: string
    title: string
    summary: string | null
    category: string
    relevanceScore: number
    urgencyScore: number
    detectedAt: string
    recommendedAction: string | null
  }[]
  scores: Record<string, {
    runId: string
    scoreValue: number
    scoreBand: "A" | "B" | "C" | "D" | "U" | string
    confidenceScore: number
    calculatedAt: string
    scoreVersion: string
    summary: string | null
    components: {
      key: string
      label: string
      normalizedScore: number
      weight: number
      weightedContribution: number
      freshnessStatus: string
    }[]
  }>
  sectors: SectorActivationSector[]
  windows: SectorActivationWindow[]
  filterOptions: SectorActivationFilterOptions
  trust: {
    accountPotential: DataTrustMeta | any
    accountReach: DataTrustMeta | any
    accountMomentum: DataTrustMeta | any
    priorityCalculated: DataTrustMeta | any
  }
  dataQuality: {
    syntheticInteractionsCount: number
    realInteractionsCount: number
    hasDemoData: boolean
    limitations: string[]
  }
}
