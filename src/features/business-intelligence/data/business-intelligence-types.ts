import type {
  DataTrustMeta,
  PortfolioAccountMetrics,
  PortfolioCalendarEventRow,
  PortfolioCompanyRow,
  PortfolioContactRow,
  PortfolioIntelligenceSummaryRow,
  PortfolioOpportunityRow,
  ProspectionPortfolioAccount,
  PortfolioTrustBundle,
} from "@/lib/prospection/portfolio-account-metrics"
import type { SectorActivationSector, SectorActivationWindow, SectorActivationFilterOptions } from "@/lib/prospection/sector-activation-types"

export interface PortfolioInteractionSourceRow {
  company_id: string | null
  type: string
  occurred_at: string
  details: Record<string, unknown> | null
}

export interface PortfolioIntelligenceSnapshot {
  accounts: ProspectionPortfolioAccount[]
  filterOptions: {
    sectors: string[]
    lifecycles: string[]
    priorities: string[]
  }
  trust: PortfolioTrustBundle
  metrics: PortfolioAccountMetrics
  generatedAt: string
  // To allow downstream loaders to do what they need without refetching
  sourceRows: {
    companies: PortfolioCompanyRow[]
    contacts: PortfolioContactRow[]
    interactions: PortfolioInteractionSourceRow[]
    calendarEvents: PortfolioCalendarEventRow[]
    opportunities: PortfolioOpportunityRow[]
    intelligenceRows: PortfolioIntelligenceSummaryRow[]
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
  sectors: SectorActivationSector[]
  windows: SectorActivationWindow[]
  filterOptions: SectorActivationFilterOptions
  trust: {
    accountReach: DataTrustMeta
    accountMomentum: DataTrustMeta
    accountInactivityRisk: DataTrustMeta
  }
  dataQuality: {
    syntheticInteractionsCount: number
    realInteractionsCount: number
    hasDemoData: boolean
    limitations: string[]
  }
}
