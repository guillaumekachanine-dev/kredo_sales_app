import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"

import { getPortfolioPeriodMetrics, type ProspectionPeriod } from "@/lib/prospection/portfolio-account-metrics"

export interface AccountAttackItem {
  accountId: string
  positiveDrivers: string[]
  vigilancePoints: string[]
  topSignal: any | null
  sectorContext: {
    name: string
    status: string
    activeWindowsCount: number
    topPractice: string | null
  } | null
  recommendedPractice: string | null
  approachAngle: string | null
  nextAction: string | null
  provenance: string
  confidence: number | null
}

export function buildAccountAttackModel(
  snapshot: BusinessIntelligenceSnapshot,
  accountId: string,
  options?: any
): AccountAttackItem | null {
  const { accounts, scores, signals, sectors, windows } = snapshot

  const account = accounts.find(a => a.id === accountId)
  if (!account) return null

  const periodParam = options?.period ?? 30
  const period = `${periodParam}d` as ProspectionPeriod
  const periodMetrics = getPortfolioPeriodMetrics(account, period)

  const nativeScore = scores[account.id]
  const accountSignals = signals.filter(sig => sig.companyId === account.id)
    .toSorted((a, b) => b.urgencyScore - a.urgencyScore)

  const topSignal = accountSignals[0] ?? null
  
  // Extract positive drivers & vigilance from native score components if available
  const positiveDrivers: string[] = []
  const vigilancePoints: string[] = []

  if (nativeScore && nativeScore.components) {
    for (const comp of nativeScore.components) {
      if (comp.normalizedScore >= 70) {
        positiveDrivers.push(comp.label)
      } else if (comp.normalizedScore <= 40) {
        vigilancePoints.push(comp.label)
      }
    }
  } else {
    // Fallback deterministic rules
    if (account.reachScore >= 70) positiveDrivers.push("Maturité relationnelle élevée")
    if (periodMetrics.momentumScore >= 70) positiveDrivers.push("Dynamique d'engagement forte")
    if (account.reachScore < 30) vigilancePoints.push("Couverture relationnelle faible")
  }

  const sector = sectors.find(s => s.id === account.sectorId)
  const sectorWindows = windows.filter(w => w.sectorId === account.sectorId && w.isOpenNow)

  let provenance = "PROXY"
  if (nativeScore) provenance = "REAL_NATIVE"
  else if (account.legacyFolioScore !== null) provenance = "REAL_LEGACY"

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
    nextAction: sectorWindows.length > 0 ? sectorWindows[0].suggestedAction : null,
    provenance,
    confidence: provenance === "REAL_NATIVE" ? 90 : provenance === "REAL_LEGACY" ? 50 : null,
  }
}


