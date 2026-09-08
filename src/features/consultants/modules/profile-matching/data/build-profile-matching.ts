import { getOpportunityStageLabel, isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { getPracticeByName } from "@/lib/config/practices"
import {
  getCandidateLifecycleLabel,
  isTerminalCandidateLifecycle,
} from "@/lib/recruitment/candidate-lifecycle"
import type { MatchTier, RawMatchComponent } from "@/lib/staffing-matching/types"
import type {
  MatchingCoverage,
  MatchingProfileSummary,
  ProfileMatchingViewModel,
  ProfileOpportunityMatch,
  RawMatchingCandidate,
  RawMatchingCollaborator,
  RawMatchingOpportunity,
  RawMatchScoreRow,
} from "./profile-matching.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — Pure Builder Matching Profil (Lot 13)
//  Direction : Profil (collaborateur ou candidat) → Besoins compatibles
//  100 % déterministe, pur, aucune I/O, aucun LLM.
// ─────────────────────────────────────────────────────────────────────────────

interface BuildProfileMatchingInput {
  collaborators: readonly RawMatchingCollaborator[]
  candidates: readonly RawMatchingCandidate[]
  opportunities: readonly RawMatchingOpportunity[]
  scores: readonly RawMatchScoreRow[]
  offerPractices?: readonly { id: string; slug: string; name: string }[]
}

const VALID_TIERS = new Set<MatchTier>([
  "strong",
  "moderate",
  "weak",
  "insufficient_data",
])

function inferTierFromScore(score: number): MatchTier {
  if (score >= 80) return "strong"
  if (score >= 60) return "moderate"
  if (score >= 40) return "weak"
  return "insufficient_data"
}

interface ParsedScoresJson {
  tier: MatchTier
  confidence: number | null
  components: RawMatchComponent[]
  pros: string[]
  cons: string[]
  missingData: string[]
  isLegacy: boolean
}

/**
 * Valide et extrait de façon défensive le contenu de match_scores.scores.
 * Gère gracieusement les seeds historiques (ex. synthetic-seed-v1) sans planter.
 */
function parseMatchScoresJson(
  rawJson: unknown,
  overallScore: number,
): ParsedScoresJson {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) {
    return {
      tier: inferTierFromScore(overallScore),
      confidence: null,
      components: [],
      pros: [],
      cons: [],
      missingData: [],
      isLegacy: true,
    }
  }

  const obj = rawJson as Record<string, unknown>

  // Détection tier
  let tier: MatchTier
  if (typeof obj.tier === "string" && VALID_TIERS.has(obj.tier as MatchTier)) {
    tier = obj.tier as MatchTier
  } else {
    tier = inferTierFromScore(overallScore)
  }

  // Confidence
  const confidence =
    typeof obj.confidence === "number" && !Number.isNaN(obj.confidence)
      ? Math.round(obj.confidence)
      : null

  // Components
  const components: RawMatchComponent[] = []
  if (Array.isArray(obj.components)) {
    for (const comp of obj.components) {
      if (comp && typeof comp === "object" && typeof comp.componentKey === "string") {
        components.push({
          componentKey: comp.componentKey,
          componentLabel:
            typeof comp.componentLabel === "string"
              ? comp.componentLabel
              : comp.componentKey,
          applicable: Boolean(comp.applicable),
          normalizedScore:
            typeof comp.normalizedScore === "number" && !Number.isNaN(comp.normalizedScore)
              ? comp.normalizedScore
              : 0,
          confidence:
            typeof comp.confidence === "number" && !Number.isNaN(comp.confidence)
              ? comp.confidence
              : 0,
          explanation:
            typeof comp.explanation === "string" ? comp.explanation : "",
          positives: Array.isArray(comp.positives)
            ? comp.positives.filter((p: unknown): p is string => typeof p === "string")
            : [],
          negatives: Array.isArray(comp.negatives)
            ? comp.negatives.filter((n: unknown): n is string => typeof n === "string")
            : [],
          evidenceRefs: Array.isArray(comp.evidenceRefs)
            ? comp.evidenceRefs.filter(
                (ref: unknown) =>
                  ref && typeof ref === "object" && "table" in ref && "id" in ref,
              )
            : [],
        })
      }
    }
  }

  // Pros & Cons
  const pros = Array.isArray(obj.pros)
    ? obj.pros.filter((p): p is string => typeof p === "string")
    : Array.isArray(obj.reasons)
      ? obj.reasons.filter((r): r is string => typeof r === "string")
      : []

  const cons = Array.isArray(obj.cons)
    ? obj.cons.filter((c): c is string => typeof c === "string")
    : Array.isArray(obj.risk_flags)
      ? obj.risk_flags.filter((rf): rf is string => typeof rf === "string")
      : []

  // Missing data
  const missingData = Array.isArray(obj.missingData)
    ? obj.missingData.filter((m): m is string => typeof m === "string")
    : []

  const isLegacy = Boolean(obj.synthetic || !obj.tier)

  return {
    tier,
    confidence,
    components,
    pros,
    cons,
    missingData,
    isLegacy,
  }
}

function resolveCompanyName(
  companies: RawMatchingOpportunity["companies"],
): string | null {
  if (!companies) return null
  if (Array.isArray(companies)) {
    return companies[0]?.name ?? null
  }
  return companies.name ?? null
}

function resolvePersonFullName(
  person:
    | { full_name: string | null; first_name: string | null; last_name: string | null }
    | null
    | undefined,
): string {
  if (!person) return "Inconnu"
  if (person.full_name?.trim()) return person.full_name.trim()
  const combined = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim()
  return combined || "Inconnu"
}

export function buildProfileMatching({
  collaborators,
  candidates,
  opportunities,
  scores,
  offerPractices = [],
}: BuildProfileMatchingInput): ProfileMatchingViewModel {
  const dataNotes: string[] = []
  let hasLegacyScores = false

  // 1. Filtrer les opportunités actives (non terminales)
  const openOpportunities = opportunities.filter((opp) => {
    if (!opp.id || !opp.title) return false
    return !isTerminalOpportunityStage(opp.stage)
  })

  const openOppMap = new Map<string, RawMatchingOpportunity>()
  for (const opp of openOpportunities) {
    openOppMap.set(opp.id, opp)
  }

  const openOpportunityCount = openOpportunities.length

  // 2. Indexer les scores par (person_id -> liste de matches sur besoins ouverts)
  // Indexer aussi les opportunités ouvertes ayant au moins un score
  const evaluatedOpenOppIds = new Set<string>()
  const scoresByPersonId = new Map<string, ProfileOpportunityMatch[]>()

  for (const row of scores) {
    const opp = openOppMap.get(row.opportunity_id)
    if (!opp) {
      // Ce score porte sur un besoin terminal ou inexistant, on l'exclut
      continue
    }

    evaluatedOpenOppIds.add(opp.id)

    const overallScore = typeof row.overall_score === "number" ? row.overall_score : 0
    const parsed = parseMatchScoresJson(row.scores, overallScore)
    if (parsed.isLegacy) {
      hasLegacyScores = true
    }

    const match: ProfileOpportunityMatch = {
      opportunityId: opp.id,
      opportunityTitle: opp.title ?? "Besoin sans titre",
      clientName: resolveCompanyName(opp.companies),
      stage: opp.stage ?? "qualification",
      stageLabel: getOpportunityStageLabel(opp.stage),
      startDate: opp.start_date ?? null,
      targetDailyRate: opp.target_daily_rate ?? null,
      overallScore,
      confidence: parsed.confidence,
      tier: parsed.tier,
      modelVersion: row.model_version ?? null,
      computedAt: row.created_at ?? null,
      components: parsed.components,
      pros: parsed.pros,
      cons: parsed.cons,
      missingData: parsed.missingData,
    }

    const existing = scoresByPersonId.get(row.person_id)
    if (existing) {
      existing.push(match)
    } else {
      scoresByPersonId.set(row.person_id, [match])
    }
  }

  const evaluatedOpportunityCount = evaluatedOpenOppIds.size

  if (hasLegacyScores) {
    dataNotes.push(
      "Certains scores proviennent d'un modèle d'évaluation antérieur ou synthétique ; leurs détails ont été adaptés défensivement.",
    )
  }

  // 3. Référentiels pour Practice
  const practiceById = new Map<string, { slug: string; name: string }>()
  const practiceBySlug = new Map<string, { slug: string; name: string }>()
  for (const p of offerPractices) {
    practiceById.set(p.id, p)
    practiceBySlug.set(p.slug, p)
  }

  // 4. Construire la population des profils
  const profiles: MatchingProfileSummary[] = []
  const seenPersonIds = new Set<string>()

  // 4.1 Collaborateurs actifs (status <> 'sorti', C-16)
  for (const collab of collaborators) {
    if (collab.status === "sorti") continue
    if (!collab.person_id) continue

    seenPersonIds.add(collab.person_id)

    // Practice collaborateur : tentative de mapping
    let practiceSlug: string | null = null
    let practiceLabel: string | null = collab.practice ?? null

    if (collab.practice) {
      const matchedPractice = getPracticeByName(collab.practice)
      if (matchedPractice) {
        practiceSlug = matchedPractice.slug
        practiceLabel = matchedPractice.name
      }
    }

    const matches = (scoresByPersonId.get(collab.person_id) ?? []).slice()
    // Tri décroissant sur overallScore
    matches.sort((a, b) => b.overallScore - a.overallScore)

    const availabilityLabel =
      collab.status === "en_mission"
        ? "En mission"
        : collab.status === "intercontrat"
          ? "Disponible (intercontrat)"
          : "Disponible"

    const coverage: MatchingCoverage = {
      openOpportunityCount,
      evaluatedOpportunityCount,
      scoredOpportunityCountForProfile: matches.length,
    }

    profiles.push({
      personId: collab.person_id,
      sourceType: "collaborator",
      sourceId: collab.id,
      fullName: resolvePersonFullName(collab.person),
      currentTitle: collab.current_title ?? null,
      practiceSlug,
      practiceLabel,
      availabilityLabel,
      matches,
      coverage,
    })
  }

  // 4.2 Candidats pertinents (non-terminaux, C-26)
  for (const cand of candidates) {
    if (!cand.person_id) continue
    if (isTerminalCandidateLifecycle(cand.status)) continue

    // Si une personne est déjà active en tant que collaborateur, elle est déjà couverte
    if (seenPersonIds.has(cand.person_id)) continue
    seenPersonIds.add(cand.person_id)

    let practiceSlug: string | null = null
    let practiceLabel: string | null = null

    if (cand.practice_id) {
      const p = practiceById.get(cand.practice_id)
      if (p) {
        practiceSlug = p.slug
        practiceLabel = p.name
      }
    }

    const matches = (scoresByPersonId.get(cand.person_id) ?? []).slice()
    matches.sort((a, b) => b.overallScore - a.overallScore)

    let availabilityLabel: string | null = null
    if (cand.available_from) {
      const d = new Date(cand.available_from)
      if (!Number.isNaN(d.getTime())) {
        availabilityLabel = `Disponible le ${d.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })}`
      }
    }
    if (!availabilityLabel && cand.notice_period_days !== null && cand.notice_period_days > 0) {
      availabilityLabel = `Préavis ${cand.notice_period_days} j`
    }
    if (!availabilityLabel) {
      availabilityLabel = getCandidateLifecycleLabel(cand.status)
    }

    const coverage: MatchingCoverage = {
      openOpportunityCount,
      evaluatedOpportunityCount,
      scoredOpportunityCountForProfile: matches.length,
    }

    profiles.push({
      personId: cand.person_id,
      sourceType: "candidate",
      sourceId: cand.id,
      fullName: resolvePersonFullName(cand.person),
      currentTitle: cand.current_title ?? null,
      practiceSlug,
      practiceLabel,
      availabilityLabel,
      matches,
      coverage,
    })
  }

  // 5. Ordonner les profils : d'abord ceux qui ont des matches (par nombre décroissant puis meilleur score), puis alphabétique
  profiles.sort((a, b) => {
    if (a.matches.length > 0 && b.matches.length === 0) return -1
    if (a.matches.length === 0 && b.matches.length > 0) return 1
    if (a.matches.length !== b.matches.length) return b.matches.length - a.matches.length
    const aTopScore = a.matches[0]?.overallScore ?? 0
    const bTopScore = b.matches[0]?.overallScore ?? 0
    if (aTopScore !== bTopScore) return bTopScore - aTopScore
    return a.fullName.localeCompare(b.fullName, "fr")
  })

  return {
    profiles,
    openOpportunityCount,
    evaluatedOpportunityCount,
    dataNotes,
  }
}
