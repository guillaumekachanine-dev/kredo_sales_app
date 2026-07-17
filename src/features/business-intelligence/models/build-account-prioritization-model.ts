import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"

export function buildAccountPrioritizationModel(snapshot: BusinessIntelligenceSnapshot, options?: any) {
  const { accounts, scores, signals } = snapshot

  return accounts.map((account) => {
    const nativeScore = scores[account.id]
    
    // Determine provenance
    let provenance = "PROXY"
    if (nativeScore) {
      provenance = "REAL_NATIVE"
    } else if (account.legacyFolioScore !== null) {
      provenance = "REAL_LEGACY"
    }

    const accountSignals = signals.filter(sig => sig.companyId === account.id)
      .toSorted((a, b) => b.urgencyScore - a.urgencyScore)

    return {
      accountId: account.id,
      name: account.name,
      sectorId: account.sectorId,
      priority: account.actionPriorityScore30d,
      potential: account.potentialScore,
      reach: account.reachScore,
      momentum: account.momentumScore30d,
      nativeScore: nativeScore ? {
        value: nativeScore.scoreValue,
        band: nativeScore.scoreBand,
        confidence: nativeScore.confidenceScore,
        version: nativeScore.scoreVersion,
        calculatedAt: nativeScore.calculatedAt,
        summary: nativeScore.summary,
      } : null,
      confidence: {
        // Just proxying the account metrics trust
        primaryOrigin: provenance,
      },
      topSignal: accountSignals[0] ?? null,
      nextAction: "A définir", // Placeholder for next lots
      provenance,
    }
  }).toSorted((a, b) => b.priority - a.priority)
}
