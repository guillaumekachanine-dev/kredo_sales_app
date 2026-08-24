import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import {
  getPortfolioPeriodMetrics,
  type ProspectionPeriod,
} from "@/lib/prospection/portfolio-account-metrics"

type AccountSignal = BusinessIntelligenceSnapshot["signals"][number]

export interface AccountPrioritizationOptions {
  period: 30 | 90 | 180
}

export interface AccountPriorityItem {
  accountId: string
  name: string
  sectorId: string | null
  reach: number
  momentum: number
  activityCount: number
  plannedCount: number
  openOpportunityCount: number
  inactivityRisk: number
  latestCommercialActivityAt: string | null
  topSignal: AccountSignal | null
  nextAction: string | null
}

function toProspectionPeriod(period: AccountPrioritizationOptions["period"]): ProspectionPeriod {
  return `${period}d` as ProspectionPeriod
}

export function buildAccountPrioritizationModel(
  snapshot: BusinessIntelligenceSnapshot,
  options: AccountPrioritizationOptions = { period: 30 },
): AccountPriorityItem[] {
  const { accounts, signals } = snapshot

  return accounts.map((account) => {
    const periodMetrics = getPortfolioPeriodMetrics(account, toProspectionPeriod(options.period))
    const accountSignals = signals.filter(sig => sig.companyId === account.id)
      .toSorted((a, b) => b.urgencyScore - a.urgencyScore || b.detectedAt.localeCompare(a.detectedAt))

    const topSignal = accountSignals[0] ?? null

    return {
      accountId: account.id,
      name: account.name,
      sectorId: account.sectorId,
      reach: account.reachScore,
      momentum: periodMetrics.momentumScore,
      activityCount: periodMetrics.activityCount,
      plannedCount: periodMetrics.plannedCount,
      openOpportunityCount: account.openOpportunityCount,
      inactivityRisk: periodMetrics.inactivityRiskScore,
      latestCommercialActivityAt: account.latestCommercialActivityAt,
      topSignal,
      nextAction: topSignal?.recommendedAction ?? account.nextDecision ?? null,
    }
  }).toSorted((left, right) => {
    const signalUrgency = (right.topSignal?.urgencyScore ?? -1) - (left.topSignal?.urgencyScore ?? -1)
    if (signalUrgency !== 0) return signalUrgency

    const leftOpportunityWithoutPlan = left.openOpportunityCount > 0 && left.plannedCount === 0
    const rightOpportunityWithoutPlan = right.openOpportunityCount > 0 && right.plannedCount === 0
    if (leftOpportunityWithoutPlan !== rightOpportunityWithoutPlan) return rightOpportunityWithoutPlan ? 1 : -1

    if (left.inactivityRisk !== right.inactivityRisk) return right.inactivityRisk - left.inactivityRisk
    const latestActivity = (left.latestCommercialActivityAt ?? "").localeCompare(right.latestCommercialActivityAt ?? "")
    if (latestActivity !== 0) return latestActivity
    return left.name.localeCompare(right.name, "fr") || left.accountId.localeCompare(right.accountId)
  })
}
