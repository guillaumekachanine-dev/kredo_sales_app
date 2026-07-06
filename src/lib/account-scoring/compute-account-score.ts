import { computeFitStrategique } from "./components/compute-c1-fit"
import { computePotentielEconomique } from "./components/compute-c2-potential"
import { computeSignauxAchat } from "./components/compute-c3-signals"
import { computeAccesRelationnel } from "./components/compute-c4-relational"
import { computeMomentumCommercial } from "./components/compute-c5-momentum"
import { computeValeurActive } from "./components/compute-c6-active-value"
import { BASE_WEIGHTS, CONFIDENCE_UNQUALIFIED_THRESHOLD, LIFECYCLE_MULTIPLIERS, SCORE_BAND_THRESHOLDS, getLifecycleBucket } from "./score-config"
import type { AccountScoreContext, AccountScoreResult, RawScoreComponent, ScoreBand, ScoreComponentResult } from "./types"

// ADR-0011 §4 — moteur déterministe pur (aucun appel LLM ici). Un compute-cX
// dit "ce que je constate" (RawScoreComponent) ; cet orchestrateur applique le
// poids et le lifecycle_multiplier, puis renormalise sur 0-100 car la masse
// pondérée totale varie selon le profil (les multiplicateurs < 1 réduisent la
// masse disponible, C6 l'augmente pour les clients actifs) — sans cette
// renormalisation, "score /100" perdrait son sens d'un profil à l'autre.
export function computeAccountScore(ctx: AccountScoreContext): AccountScoreResult {
  const bucket = getLifecycleBucket(ctx.company.lifecycleStatus)
  const multipliers = LIFECYCLE_MULTIPLIERS[bucket]

  const rawComponents: RawScoreComponent[] = [
    computeFitStrategique(ctx),
    computePotentielEconomique(ctx),
    computeSignauxAchat(ctx),
    computeAccesRelationnel(ctx),
    computeMomentumCommercial(ctx),
  ]

  if (bucket === "active") {
    const c6 = computeValeurActive(ctx)
    if (c6) rawComponents.push(c6)
  }

  const components: ScoreComponentResult[] = rawComponents.map((raw) => {
    const weight = BASE_WEIGHTS[raw.componentKey]
    const lifecycleMultiplier = multipliers[raw.componentKey]
    const weightedContribution = round2((raw.normalizedScore / 100) * weight * lifecycleMultiplier)
    return { ...raw, weight, lifecycleMultiplier, weightedContribution }
  })

  const totalWeightMass = components.reduce((sum, c) => sum + c.weight * c.lifecycleMultiplier, 0)
  const rawWeightedSum = components.reduce((sum, c) => sum + c.weightedContribution, 0)
  const scoreValue = totalWeightMass > 0 ? round2(Math.min(100, (rawWeightedSum / totalWeightMass) * 100)) : 0

  const confidenceScore =
    totalWeightMass > 0
      ? round2(components.reduce((sum, c) => sum + c.confidence * c.weight * c.lifecycleMultiplier, 0) / totalWeightMass)
      : 0

  const scoreBand = determineScoreBand(scoreValue, confidenceScore)
  const summary = buildSummary(ctx, components)

  return {
    scoreValue,
    scoreBand,
    confidenceScore,
    lifecycleContext: ctx.company.lifecycleStatus,
    components,
    summary,
  }
}

function determineScoreBand(scoreValue: number, confidenceScore: number): ScoreBand {
  if (confidenceScore < CONFIDENCE_UNQUALIFIED_THRESHOLD) return "U"
  if (scoreValue >= SCORE_BAND_THRESHOLDS.A.minScore && confidenceScore >= SCORE_BAND_THRESHOLDS.A.minConfidence) return "A"
  if (scoreValue >= SCORE_BAND_THRESHOLDS.B.minScore && confidenceScore >= SCORE_BAND_THRESHOLDS.B.minConfidence) return "B"
  if (scoreValue >= SCORE_BAND_THRESHOLDS.C.minScore) return "C"
  return "D"
}

function buildSummary(ctx: AccountScoreContext, components: ScoreComponentResult[]) {
  const sorted = [...components].sort((a, b) => b.weightedContribution - a.weightedContribution)
  const topPositiveDrivers = sorted.filter((c) => c.normalizedScore >= 60).slice(0, 3).map((c) => c.explanation)
  const topNegativeDrivers = sorted
    .filter((c) => c.normalizedScore < 40)
    .slice(-3)
    .map((c) => c.explanation)

  const caveats: string[] = []
  if (!ctx.sector) caveats.push("Aucun secteur structuré rattaché — composant Fit stratégique peu fiable.")
  if (ctx.contacts.totalCount === 0) caveats.push("Aucun contact identifié — composant Accès relationnel peu fiable.")
  if (ctx.signals.every((s) => s.relevanceScore === 0 && s.urgencyScore === 0) && ctx.signals.length > 0) {
    caveats.push("Signaux disponibles uniquement qualitatifs (import FOLIO) — aucune urgence quantifiée.")
  }

  return { topPositiveDrivers, topNegativeDrivers, caveats }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
