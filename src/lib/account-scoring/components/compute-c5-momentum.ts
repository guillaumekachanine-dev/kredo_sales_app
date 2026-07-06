import type { AccountScoreContext, RawScoreComponent } from "../types"

// C5 — Momentum commercial. Opportunités ouvertes + traction historique (gagné)
// + activité relationnelle récente, ajusté par la ponctualité du suivi
// (prochaine action planifiée = bonus, en retard = pénalité — le pipe existe
// mais personne ne s'en occupe est un signal négatif à part entière).
export function computeMomentumCommercial(ctx: AccountScoreContext): RawScoreComponent {
  const { openCount, wonCount, hasOverdueNextAction, hasUpcomingNextAction } = ctx.opportunities
  const { recentCount90d } = ctx.interactions

  let normalizedScore = Math.min(60, openCount * 15) + Math.min(20, wonCount * 10) + Math.min(20, recentCount90d * 4)
  if (hasUpcomingNextAction) normalizedScore += 10
  if (hasOverdueNextAction) normalizedScore -= 15
  normalizedScore = Math.min(100, Math.max(0, normalizedScore))

  const hasActivity = openCount > 0 || recentCount90d > 0
  const confidence = hasActivity ? 80 : 30

  const parts = [`${openCount} opportunité(s) ouverte(s)`, `${recentCount90d} interaction(s) récente(s) (90j)`]
  if (hasOverdueNextAction) parts.push("prochaine action en retard")
  if (hasUpcomingNextAction) parts.push("prochaine action planifiée")

  return {
    componentKey: "C5_momentum",
    componentLabel: "Momentum commercial",
    rawValueJson: { openCount, wonCount, recentCount90d, hasOverdueNextAction, hasUpcomingNextAction },
    normalizedScore,
    confidence,
    freshnessStatus: hasActivity ? "fresh" : "missing",
    explanation: `${parts.join(", ")}.`,
    evidenceRefs: [],
  }
}
