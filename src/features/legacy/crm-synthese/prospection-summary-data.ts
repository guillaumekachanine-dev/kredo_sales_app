import { cache } from "react"
import { getPortfolioIntelligenceSnapshot } from "@/features/business-intelligence/data/get-portfolio-intelligence-snapshot"
import type { ProspectionPortfolioAccount, PortfolioTrustBundle } from "@/lib/prospection/portfolio-account-metrics"

export type ProspectionSummaryData =
  | {
      state: "error"
      title: string
      message: string
    }
  | {
      state: "ready"
      generatedAt: string
      accounts: ProspectionPortfolioAccount[]
      filterOptions: {
        sectors: string[]
        lifecycles: string[]
        priorities: string[]
      }
      trust: PortfolioTrustBundle
      metrics: {
        totalAccounts: number
        accountsWithRecentActivity: number
      }
    }

export const getProspectionSummaryData = cache(async (): Promise<ProspectionSummaryData> => {
  try {
    const portfolio = await getPortfolioIntelligenceSnapshot()

    return {
      state: "ready",
      generatedAt: portfolio.generatedAt,
      accounts: portfolio.accounts,
      filterOptions: portfolio.filterOptions,
      trust: portfolio.trust,
      metrics: {
        totalAccounts: portfolio.metrics.totalAccounts,
        accountsWithRecentActivity: portfolio.metrics.accountsWithRecentActivity,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de charger la synthèse prospection."
    return {
      state: "error",
      title: "Erreur de chargement Supabase",
      message,
    }
  }
})
