import { SENIORITY_RANK_LABEL, normalizeSeniorityRank } from "../match-config"
import type { MatchingNeed, MatchingProfile, RawMatchComponent } from "../types"

// C2 — Adéquation de séniorité. Un profil sous-qualifié est pénalisé plus
// durement qu'un profil sur-qualifié (un senior sur un besoin confirmé reste
// utilisable ; l'inverse est un risque de livraison). Non applicable si l'un des
// deux libellés de séniorité n'est pas exploitable (texte libre non mappable).
export function computeSeniorityFit(need: MatchingNeed, profile: MatchingProfile): RawMatchComponent {
  const base = {
    componentKey: "C2_seniority" as const,
    componentLabel: "Adéquation de séniorité",
    evidenceRefs: [{ table: profile.sourceType === "candidate" ? "candidates" : "collaborators", id: profile.sourceId }],
  }

  const needRank = normalizeSeniorityRank(need.seniority)
  const profileRank = normalizeSeniorityRank(profile.seniority)

  if (needRank === null || profileRank === null) {
    return {
      ...base,
      applicable: false,
      normalizedScore: 0,
      confidence: 0,
      explanation: "Séniorité non exploitable côté besoin ou profil — critère non évalué.",
      positives: [],
      negatives: [],
    }
  }

  const delta = profileRank - needRank
  let normalizedScore: number
  const positives: string[] = []
  const negatives: string[] = []

  if (delta === 0) {
    normalizedScore = 100
    positives.push(`Séniorité alignée (${SENIORITY_RANK_LABEL[profileRank]}).`)
  } else if (delta > 0) {
    normalizedScore = Math.max(70, 100 - delta * 15)
    positives.push(`Profil plus séniore que demandé (${SENIORITY_RANK_LABEL[profileRank]} vs ${SENIORITY_RANK_LABEL[needRank]}).`)
  } else {
    normalizedScore = Math.max(0, 100 + delta * 30)
    negatives.push(`Profil sous le niveau demandé (${SENIORITY_RANK_LABEL[profileRank]} vs ${SENIORITY_RANK_LABEL[needRank]}).`)
  }

  return {
    ...base,
    applicable: true,
    normalizedScore,
    confidence: 75,
    explanation: `Séniorité profil ${SENIORITY_RANK_LABEL[profileRank]} face à un besoin ${SENIORITY_RANK_LABEL[needRank]}.`,
    positives,
    negatives,
  }
}
