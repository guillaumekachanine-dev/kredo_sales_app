import { IMPORTANCE_MULTIPLIER, UNKNOWN_SKILL_LEVEL_COVERAGE } from "../match-config"
import type { MatchingNeed, MatchingProfile, RawMatchComponent } from "../types"

// C1 — Couverture des compétences requises (le pilier du matching). Chaque
// compétence du besoin est pondérée par son importance (indispensable=3 /
// souhaitée=2 / bonus=1). La présence réelle d'une compétence compte même si
// son niveau n'est pas encore qualifié : on ne transforme plus une donnée
// partielle en faux 0 %. Une compétence absente, elle, reste bien à 0.
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
  let confidenceSum = 0
  let confidenceCount = 0
  let presentCount = 0
  let unknownLevelCount = 0
  let fullyCoveredIndispensable = 0
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
      continue
    }

    presentCount += 1

    const hasRequiredLevel = required.minLevel !== null && required.minLevel > 0
    const hasHeldLevel = held.level !== null && held.level > 0

    let coverage: number
    if (!hasRequiredLevel) {
      // Le besoin n'impose aucun niveau : la présence de la compétence suffit.
      coverage = 1
    } else if (hasHeldLevel) {
      coverage = Math.min(1, held.level! / required.minLevel!)
    } else {
      // Compétence réellement présente mais niveau non qualifié : couverture
      // partielle prudente, au lieu d'un faux 0 équivalent à "absente".
      coverage = UNKNOWN_SKILL_LEVEL_COVERAGE
      unknownLevelCount += 1
    }

    weightedSum += effWeight * coverage

    if (held.confidence !== null) {
      confidenceSum += held.confidence
      confidenceCount += 1
    }

    if (coverage >= 1) {
      positives.push(
        hasRequiredLevel && hasHeldLevel
          ? `${required.skillName} maîtrisée (niveau ${held.level}/5, requis ${required.minLevel}).`
          : `${required.skillName} présente sur le profil.`,
      )
      if (required.importance === "indispensable") fullyCoveredIndispensable += 1
    } else if (!hasHeldLevel && hasRequiredLevel) {
      positives.push(`${required.skillName} présente sur le profil.`)
      negatives.push(`${required.skillName} : niveau à qualifier (minimum requis ${required.minLevel}/5).`)
    } else if (required.importance === "indispensable") {
      negatives.push(`${required.skillName} sous le niveau requis (${held.level}/${required.minLevel}).`)
    }
  }

  const normalizedScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0

  // Confiance : la présence d'une compétence est comptée indépendamment de la
  // présence d'un score de confiance. Sinon un skill réellement lié au profil
  // mais sans confidence était auparavant considéré comme "non présent".
  const avgMatchedConfidence = confidenceCount > 0 ? (confidenceSum / confidenceCount) * 100 : 0
  const coverageRatio = need.skills.length > 0 ? presentCount / need.skills.length : 0
  const confidence = Math.round(Math.max(40, Math.min(90, avgMatchedConfidence * 0.6 + coverageRatio * 40 + 30)))

  const totalIndispensable = need.skills.filter((s) => s.importance === "indispensable").length
  const unknownLevelSuffix = unknownLevelCount > 0 ? ` ${unknownLevelCount} niveau${unknownLevelCount > 1 ? "x" : ""} à qualifier.` : ""

  return {
    ...base,
    applicable: true,
    normalizedScore,
    confidence,
    explanation: `${presentCount}/${need.skills.length} compétences requises présentes, ${fullyCoveredIndispensable}/${totalIndispensable} indispensables au niveau requis.${unknownLevelSuffix}`,
    positives: positives.slice(0, 4),
    negatives: negatives.slice(0, 4),
  }
}
