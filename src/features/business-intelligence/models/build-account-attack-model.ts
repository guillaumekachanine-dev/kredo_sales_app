import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"

export function buildAccountAttackModel(snapshot: BusinessIntelligenceSnapshot, accountId: string) {
  const { accounts, scores, signals, sectors, windows } = snapshot

  const account = accounts.find(a => a.id === accountId)
  if (!account) return null

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
    if (account.momentumScore30d >= 70) positiveDrivers.push("Dynamique d'engagement forte")
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
      topPractice: sector.topPracticeLabel,
    } : null,
    recommendedPractice: sector?.topPracticeLabel ?? "Data & IA",
    approachAngle: sectorWindows.length > 0 ? sectorWindows[0].playbookSummary : "Approche directe",
    nextAction: sectorWindows.length > 0 ? sectorWindows[0].suggestedAction : "Créer une opportunité d'échange",
    provenance,
    confidence: provenance === "REAL_NATIVE" ? 90 : provenance === "REAL_LEGACY" ? 50 : 20,
  }
}
