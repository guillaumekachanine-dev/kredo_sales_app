import { computeSkillsCoverage } from "./components/compute-c1-skills"
import { computeSeniorityFit } from "./components/compute-c2-seniority"
import { computeRateFit } from "./components/compute-c3-rate"
import { computeAvailabilityFit } from "./components/compute-c4-availability"
import { computeLocationFit } from "./components/compute-c5-location"
import { computePracticeFit } from "./components/compute-c6-practice"
import {
  BASE_WEIGHTS,
  MATCH_DISPLAY_MAX_PROFILES,
  MATCH_DISPLAY_MIN_SCORE,
  MATCH_VERSION,
  MIN_APPLICABLE_WEIGHT_RATIO,
  SKILLS_GATE_FLOOR,
  tierFromScore,
} from "./match-config"
import type { MatchingContext, MatchingNeed, MatchingProfile, MatchingResult, ProfileMatchResult, RawMatchComponent } from "./types"

// Moteur déterministe pur (aucun LLM, aucun embedding). Pour chaque profil du
// pool, on calcule les 6 composantes puis on renormalise le score sur les seules
// composantes APPLICABLES : une donnée absente sort du numérateur ET du
// dénominateur (jamais une pénalité muette), et remonte dans `missingData`.
// Même doctrine anti-score-opaque que le moteur de scoring compte (ADR-0011).
export function computeMatching(ctx: MatchingContext): MatchingResult {
  const rankedProfiles = ctx.profiles
    .map((profile) => scoreProfile(ctx.need, profile))
    .sort((a, b) => b.overallScore - a.overallScore || b.confidence - a.confidence)

  return {
    needId: ctx.need.id,
    needTitle: ctx.need.title,
    modelVersion: MATCH_VERSION,
    dataCutoffAt: ctx.dataCutoffAt,
    poolSize: ctx.profiles.length,
    rankedProfiles,
  }
}

// Projection d'affichage uniquement. Le moteur et le cache match_scores gardent
// le pool complet pour l'explicabilité ; l'UI ne reçoit que les 5 meilleurs
// profils à 60/100 ou plus, avec une couverture de compétences réellement
// évaluable et au-dessus du gate minimum.
export function selectMatchingResultForDisplay(result: MatchingResult): MatchingResult {
  return {
    ...result,
    rankedProfiles: result.rankedProfiles
      .filter((profile) => {
        const skills = profile.components.find((component) => component.componentKey === "C1_skills")
        return (
          profile.overallScore >= MATCH_DISPLAY_MIN_SCORE &&
          skills?.applicable === true &&
          skills.normalizedScore >= SKILLS_GATE_FLOOR
        )
      })
      .slice(0, MATCH_DISPLAY_MAX_PROFILES),
  }
}

export function scoreProfile(need: MatchingNeed, profile: MatchingProfile): ProfileMatchResult {
  const components: RawMatchComponent[] = [
    computeSkillsCoverage(need, profile),
    computeSeniorityFit(need, profile),
    computeRateFit(need, profile),
    computeAvailabilityFit(need, profile),
    computeLocationFit(need, profile),
    computePracticeFit(need, profile),
  ]

  const applicable = components.filter((c) => c.applicable)
  const totalWeight = Object.values(BASE_WEIGHTS).reduce((sum, w) => sum + w, 0)
  const applicableWeight = applicable.reduce((sum, c) => sum + BASE_WEIGHTS[c.componentKey], 0)

  const overallScore =
    applicableWeight > 0
      ? round2(applicable.reduce((sum, c) => sum + c.normalizedScore * BASE_WEIGHTS[c.componentKey], 0) / applicableWeight)
      : 0

  const confidence =
    applicableWeight > 0
      ? round2(applicable.reduce((sum, c) => sum + c.confidence * BASE_WEIGHTS[c.componentKey], 0) / applicableWeight)
      : 0

  const applicableWeightRatio = totalWeight > 0 ? applicableWeight / totalWeight : 0

  // Gate compétences : le critère le plus important doit être évaluable. Un C1
  // absent signifie qu'on ne peut pas recommander un profil de manière fiable ;
  // un C1 sous le plancher plafonne quant à lui le tier à "weak".
  const skills = components.find((c) => c.componentKey === "C1_skills")
  const skillsGateFailed = skills?.applicable === true && skills.normalizedScore < SKILLS_GATE_FLOOR

  let tier: ProfileMatchResult["tier"]
  if (skills?.applicable !== true || applicableWeightRatio < MIN_APPLICABLE_WEIGHT_RATIO) {
    tier = "insufficient_data"
  } else {
    const naturalTier = tierFromScore(overallScore, confidence)
    tier = skillsGateFailed && naturalTier !== "insufficient_data" ? "weak" : naturalTier
  }

  // pros/cons agrégés, priorisés par le poids de la composante d'origine.
  const byWeightDesc = [...applicable].sort((a, b) => BASE_WEIGHTS[b.componentKey] - BASE_WEIGHTS[a.componentKey])
  const pros = byWeightDesc.flatMap((c) => c.positives).slice(0, 4)
  const gateCon = skillsGateFailed ? ["Couverture des compétences insuffisante — profil à écarter sauf reconversion."] : []
  const cons = [...gateCon, ...byWeightDesc.flatMap((c) => c.negatives)].slice(0, 4)
  const missingData = components.filter((c) => !c.applicable).map((c) => c.componentLabel)

  return {
    sourceType: profile.sourceType,
    sourceId: profile.sourceId,
    personId: profile.personId,
    fullName: profile.fullName,
    currentTitle: profile.currentTitle,
    availabilityStatus: profile.availabilityStatus,
    availableFrom: profile.availableFrom,
    hasCandidateProfile: profile.hasCandidateProfile,
    overallScore,
    confidence,
    tier,
    components,
    pros,
    cons,
    missingData,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
