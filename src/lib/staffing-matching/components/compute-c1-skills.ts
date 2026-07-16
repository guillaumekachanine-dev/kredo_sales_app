import { IMPORTANCE_MULTIPLIER } from "../match-config"
import type { MatchingNeed, MatchingProfile, RawMatchComponent } from "../types"

// C1 — Couverture des compétences requises (le pilier du matching). Chaque
// compétence du besoin est pondérée par son importance (indispensable=3 /
// souhaitée=2 / bonus=1). Pour chacune : couverture = 1 si le profil atteint le
// niveau minimum, sinon proportionnelle. Une compétence indispensable manquante
// pèse 0 dans le numérateur mais reste au dénominateur — donc pénalise vraiment.
// Non applicable seulement si le besoin ne structure aucune compétence.
export function computeSkillsCoverage(need: MatchingNeed, profile: MatchingProfile): RawMatchComponent {
  const base: Omit<RawMatchComponent, "applicable" | "normalizedScore" | "confidence" | "explanation" | "positives" | "negatives"> = {
    componentKey: "C1_skills",
    componentLabel: "Couverture des compétences",
    evidenceRefs: [{ table: "opportunity_skills", id: need.id }],
  }

  if (need.skills.length === 0) {
    return {
      ...base,
      applicable: false,
      normalizedScore: 0,
      confidence: 0,
      explanation: "Aucune compétence structurée sur le besoin — couverture non évaluable.",
      positives: [],
      negatives: [],
    }
  }

  const profileSkillById = new Map(profile.skills.map((s) => [s.skillId, s]))

  let weightedSum = 0
  let totalWeight = 0
  let matchedConfidenceSum = 0
  let matchedCount = 0
  const positives: string[] = []
  const negatives: string[] = []

  for (const required of need.skills) {
    const effWeight = IMPORTANCE_MULTIPLIER[required.importance]
    totalWeight += effWeight

    const held = profileSkillById.get(required.skillId)
    if (!held) {
      if (required.importance === "indispensable") {
        negatives.push(`Compétence indispensable absente : ${required.skillName}.`)
      } else {
        negatives.push(`Compétence ${required.importance === "souhaitee" ? "souhaitée" : "bonus"} absente : ${required.skillName}.`)
      }
      continue // couverture 0 pour cette compétence
    }

    const heldLevel = held.level ?? 0
    const minLevel = required.minLevel ?? 3 // niveau cible par défaut si non précisé
    const coverage = minLevel > 0 ? Math.min(1, heldLevel / minLevel) : heldLevel > 0 ? 1 : 0
    weightedSum += effWeight * coverage

    if (held.confidence !== null) {
      matchedConfidenceSum += held.confidence
      matchedCount += 1
    }

    if (coverage >= 1) {
      positives.push(`${required.skillName} maîtrisée (niveau ${heldLevel}/5${required.minLevel ? `, requis ${required.minLevel}` : ""}).`)
    } else if (required.importance === "indispensable") {
      negatives.push(`${required.skillName} sous le niveau requis (${heldLevel}/${minLevel}).`)
    }
  }

  const normalizedScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0

  // Confiance : moyenne des confidences des compétences réellement appariées,
  // atténuée quand le profil couvre peu de compétences requises (peu de matière).
  const avgMatchedConfidence = matchedCount > 0 ? (matchedConfidenceSum / matchedCount) * 100 : 0
  const coverageRatio = need.skills.length > 0 ? matchedCount / need.skills.length : 0
  const confidence = Math.round(Math.max(40, Math.min(90, avgMatchedConfidence * 0.6 + coverageRatio * 40 + 30)))

  const matchedIndispensable = need.skills.filter(
    (s) => s.importance === "indispensable" && profileSkillById.has(s.skillId),
  ).length
  const totalIndispensable = need.skills.filter((s) => s.importance === "indispensable").length

  return {
    ...base,
    applicable: true,
    normalizedScore,
    confidence,
    explanation: `${matchedCount}/${need.skills.length} compétences requises présentes, ${matchedIndispensable}/${totalIndispensable} indispensables couvertes.`,
    positives: positives.slice(0, 4),
    negatives: negatives.slice(0, 4),
  }
}
