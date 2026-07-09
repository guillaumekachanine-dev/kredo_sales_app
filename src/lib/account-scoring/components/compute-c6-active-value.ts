import type { AccountScoreContext, RawScoreComponent } from "../types"

// C6 — Valeur active. Bonus additif calculé UNIQUEMENT pour les clients
// (cf. orchestrateur compute-account-score.ts). Retourne null si aucune
// mission active n'est trouvée — cas limite où lifecycle_status=client
// mais missions.status n'a pas encore été mis à jour (données incohérentes),
// le composant est alors simplement absent du run plutôt que de fabriquer une
// valeur arbitraire.
export function computeValeurActive(ctx: AccountScoreContext): RawScoreComponent | null {
  const { activeCount, avgGrossMarginPct } = ctx.missions

  if (activeCount === 0) {
    return null
  }

  const marginScore =
    avgGrossMarginPct === null ? 40 : Math.min(100, Math.max(0, Math.round((avgGrossMarginPct / 40) * 100)))
  const normalizedScore = Math.min(100, Math.round(marginScore * 0.7 + Math.min(30, activeCount * 15)))

  return {
    componentKey: "C6_active_value",
    componentLabel: "Valeur active",
    rawValueJson: { activeCount, avgGrossMarginPct },
    normalizedScore,
    confidence: 90,
    freshnessStatus: "fresh",
    explanation: `${activeCount} mission(s) active(s), marge brute moyenne ${avgGrossMarginPct !== null ? avgGrossMarginPct.toFixed(1) : "n/a"}%.`,
    evidenceRefs: [],
  }
}
