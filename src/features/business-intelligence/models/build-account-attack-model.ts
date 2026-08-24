import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import { getPortfolioPeriodMetrics, type ProspectionPeriod } from "@/lib/prospection/portfolio-account-metrics"

type AccountSignal = BusinessIntelligenceSnapshot["signals"][number]


export interface AccountAttackItem {
  accountId: string
  positiveDrivers: string[]
  vigilancePoints: string[]
  topSignal: AccountSignal | null
  sectorContext: {
    name: string
    status: string
    activeWindowsCount: number
    topPractice: string | null
  } | null
  recommendedPractice: string | null
  approachAngle: string | null
  nextAction: string | null
}

export function buildAccountAttackModel(
  snapshot: BusinessIntelligenceSnapshot,
  accountId: string,
  options: { period: 30 | 90 | 180 } = { period: 30 },
): AccountAttackItem | null {
  const { accounts, signals, sectors, windows } = snapshot

  const account = accounts.find(a => a.id === accountId)
  if (!account) return null
  const periodMetrics = getPortfolioPeriodMetrics(account, `${options.period}d` as ProspectionPeriod)

  const accountSignals = signals.filter(sig => sig.companyId === account.id)
    .toSorted((a, b) => b.urgencyScore - a.urgencyScore)

  const topSignal = accountSignals[0] ?? null
  
  // Drivers remain explicit facts; they are not aggregated into an account score.
  const positiveDrivers: string[] = []
  const vigilancePoints: string[] = []

  if (account.reachScore >= 70) positiveDrivers.push("Maturité relationnelle élevée")
  if (account.openOpportunityCount > 0) positiveDrivers.push("Opportunité commerciale ouverte")
  if (account.reachScore < 30) vigilancePoints.push("Couverture relationnelle faible")
  if (account.openOpportunityCount === 0) vigilancePoints.push("Aucune opportunité ouverte")
  if (periodMetrics.inactivityRiskScore >= 70) vigilancePoints.push("Relation commerciale inactive sur la période")
  if (account.openOpportunityCount > 0 && periodMetrics.plannedCount === 0) vigilancePoints.push("Opportunité ouverte sans prochaine action planifiée")

  const sector = sectors.find(s => s.id === account.sectorId)
  const sectorWindows = windows.filter(w => w.sectorId === account.sectorId && w.isOpenNow)

  return {
    accountId: account.id,
    positiveDrivers,
    vigilancePoints,
    topSignal,
    sectorContext: sector ? {
      name: sector.name,
      status: sector.status,
      activeWindowsCount: sectorWindows.length,
      topPractice: sector.topPracticeLabel ?? null,
    } : null,
    recommendedPractice: sector?.topPracticeLabel ?? null,
    approachAngle: sectorWindows.length > 0 ? sectorWindows[0].playbookSummary : null,
    nextAction: topSignal?.recommendedAction ?? (sectorWindows.length > 0 ? sectorWindows[0].suggestedAction : account.nextDecision),
  }
}
