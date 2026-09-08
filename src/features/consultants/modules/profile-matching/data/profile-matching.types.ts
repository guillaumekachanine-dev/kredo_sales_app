import type { Json } from "@/types/database"
import type { MatchTier, RawMatchComponent } from "@/lib/staffing-matching/types"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — Data Contract Matching Profil (Lot 13)
//  Direction : Profil (collaborateur ou candidat) → Besoins compatibles
//  Projection en lecture des scores calculés par le moteur unique existant.
// ─────────────────────────────────────────────────────────────────────────────

export type MatchingProfileSourceType = "collaborator" | "candidate"

/** Ligne brute issue de `match_scores`. */
export interface RawMatchScoreRow {
  id: string
  opportunity_id: string
  person_id: string
  overall_score: number | null
  model_version: string | null
  scores: Json
  created_at: string
  source_run_id: string | null
}

/** Ligne brute issue de `opportunities`. */
export interface RawMatchingOpportunity {
  id: string
  title: string | null
  stage: string | null
  start_date: string | null
  target_daily_rate: number | null
  requires_staffing: boolean | null
  updated_at: string | null
  company_id: string | null
  companies?: { name: string | null } | { name: string | null }[] | null
}

/** Ligne brute collaborateur actif issue de `collaborators`. */
export interface RawMatchingCollaborator {
  id: string
  person_id: string
  status: string
  current_title: string | null
  seniority: string | null
  practice: string | null
  job_profile_id: string | null
  person: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

/** Ligne brute candidat pertinent issue de `candidates`. */
export interface RawMatchingCandidate {
  id: string
  person_id: string
  status: string
  current_title: string | null
  seniority: string | null
  practice_id: string | null
  job_profile_id: string | null
  available_from: string | null
  notice_period_days: number | null
  expected_daily_rate: number | null
  person: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

/** Match individuel entre un profil et un besoin commercial ouvert. */
export interface ProfileOpportunityMatch {
  opportunityId: string
  opportunityTitle: string
  clientName: string | null

  stage: string
  stageLabel: string
  startDate: string | null
  targetDailyRate: number | null

  overallScore: number
  confidence: number | null
  tier: MatchTier

  modelVersion: string | null
  computedAt: string | null

  components: RawMatchComponent[]
  pros: string[]
  cons: string[]
  missingData: string[]
}

/** Métriques de couverture du matching pour un profil donné et globalement. */
export interface MatchingCoverage {
  openOpportunityCount: number
  evaluatedOpportunityCount: number
  scoredOpportunityCountForProfile: number
}

/** Synthèse d'un profil dans le module matching (collaborateur ou candidat). */
export interface MatchingProfileSummary {
  personId: string
  sourceType: MatchingProfileSourceType
  sourceId: string
  fullName: string
  currentTitle: string | null
  practiceSlug: string | null
  practiceLabel: string | null
  availabilityLabel: string | null

  matches: ProfileOpportunityMatch[]
  coverage: MatchingCoverage
}

/** View-model complet retourné par le data contract Profil Matching. */
export interface ProfileMatchingViewModel {
  profiles: MatchingProfileSummary[]
  openOpportunityCount: number
  evaluatedOpportunityCount: number
  dataNotes: string[]
}
