import type { MatchingNeed, MatchingProfile, RawMatchComponent } from "../types"

// C3 — Compatibilité tarifaire. Compare le TJM attendu du candidat à la cible du
// besoin. Non applicable pour les collaborateurs (coût interne confidentiel,
// jamais exposé par la RPC) ni si l'une des deux valeurs manque — jamais un faux
// score. Sous la cible = 100 (marge préservée) ; au-dessus = dégradation.
export function computeRateFit(need: MatchingNeed, profile: MatchingProfile): RawMatchComponent {
  const base = {
    componentKey: "C3_rate" as const,
    componentLabel: "Compatibilité tarifaire",
    evidenceRefs: [{ table: "candidates", id: profile.sourceId }],
  }

  const target = need.targetDailyRate
  const expected = profile.expectedDailyRate

  if (target === null || expected === null) {
    const reason =
      profile.sourceType === "collaborator"
        ? "TJM cible ou coût interne non comparable (donnée collaborateur confidentielle)."
        : "TJM attendu du candidat ou cible du besoin non renseigné — critère non évalué."
    return {
      ...base,
      applicable: false,
      normalizedScore: 0,
      confidence: 0,
      explanation: reason,
      positives: [],
      negatives: [],
    }
  }

  const fmt = (v: number) => `${Math.round(v)} €/j`

  if (expected <= target) {
    return {
      ...base,
      applicable: true,
      normalizedScore: 100,
      confidence: 80,
      explanation: `TJM attendu ${fmt(expected)} dans la cible ${fmt(target)}.`,
      positives: [`TJM attendu ${fmt(expected)} ≤ cible ${fmt(target)}.`],
      negatives: [],
    }
  }

  const overPct = (expected - target) / target
  const normalizedScore = Math.max(0, Math.round(100 - overPct * 200))
  return {
    ...base,
    applicable: true,
    normalizedScore,
    confidence: 80,
    explanation: `TJM attendu ${fmt(expected)} au-dessus de la cible ${fmt(target)} (+${Math.round(overPct * 100)} %).`,
    positives: [],
    negatives: [`TJM attendu dépasse la cible de ${Math.round(overPct * 100)} %.`],
  }
}
