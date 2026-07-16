import { normalizePracticeFamily } from "../match-config"
import type { MatchingNeed, MatchingProfile, RawMatchComponent } from "../types"

// C6 — Cohérence de practice. Heuristique par famille (même esprit que le mapping
// CASE de get_pitch_context), car `opportunities.practice` et les practices
// profil sont du texte libre sans FK commune. Faible poids : signal contextuel,
// pas déterminant. Non applicable si l'un des deux libellés n'est pas reconnu.
export function computePracticeFit(need: MatchingNeed, profile: MatchingProfile): RawMatchComponent {
  const base = {
    componentKey: "C6_practice" as const,
    componentLabel: "Cohérence de practice",
    evidenceRefs: [{ table: profile.sourceType === "candidate" ? "candidates" : "collaborators", id: profile.sourceId }],
  }

  const needFamily = normalizePracticeFamily(need.practice)
  const profileFamily = normalizePracticeFamily(profile.practiceLabel)

  if (!needFamily || !profileFamily) {
    return {
      ...base,
      applicable: false,
      normalizedScore: 0,
      confidence: 0,
      explanation: "Practice besoin ou profil non reconnue — critère non évalué.",
      positives: [],
      negatives: [],
    }
  }

  if (needFamily === profileFamily) {
    return {
      ...base,
      applicable: true,
      normalizedScore: 100,
      confidence: 70,
      explanation: `Practice alignée (${profile.practiceLabel} ≈ ${need.practice}).`,
      positives: [`Practice cohérente avec le besoin (${profile.practiceLabel}).`],
      negatives: [],
    }
  }

  // "digital_generic" chevauche partiellement les familles digitales voisines.
  const digitalNeighbors = new Set(["digital_generic", "digital_experience", "dbs", "cloud", "mobile"])
  const isSoftOverlap =
    (needFamily === "digital_generic" && digitalNeighbors.has(profileFamily)) ||
    (profileFamily === "digital_generic" && digitalNeighbors.has(needFamily))

  if (isSoftOverlap) {
    return {
      ...base,
      applicable: true,
      normalizedScore: 55,
      confidence: 45,
      explanation: `Practices proches mais non identiques (${profile.practiceLabel} / ${need.practice}).`,
      positives: [],
      negatives: [],
    }
  }

  return {
    ...base,
    applicable: true,
    normalizedScore: 25,
    confidence: 55,
    explanation: `Practice profil (${profile.practiceLabel}) éloignée du besoin (${need.practice}).`,
    positives: [],
    negatives: [`Practice éloignée du besoin (${profile.practiceLabel} vs ${need.practice}).`],
  }
}
