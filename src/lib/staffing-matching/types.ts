// Matching CV — contrat exact du RPC get_matching_context (Lot 0) + types du
// moteur déterministe pur (src/lib/staffing-matching/). Direction : besoin -> profils.
// Aucun embedding, aucun LLM : les composantes pondérées SONT l'explication.

export type ProfileSourceType = "candidate" | "collaborator"

export type SkillImportance = "indispensable" | "souhaitee" | "bonus"

export type MatchComponentKey =
  | "C1_skills"
  | "C2_seniority"
  | "C3_rate"
  | "C4_availability"
  | "C5_location"
  | "C6_practice"

// Qualification globale d'un match — pilote l'affichage (jamais un score nu opaque).
export type MatchTier = "strong" | "moderate" | "weak" | "insufficient_data"

// ── Contrat RPC (get_matching_context) ───────────────────────────────────────

export interface NeedSkill {
  skillId: string
  skillName: string
  importance: SkillImportance
  minLevel: number | null
  minYears: number | null
  weight: number | null
}

export interface MatchingNeed {
  id: string
  title: string
  practice: string | null
  seniority: string | null
  location: string | null
  remotePolicy: string | null
  startDate: string | null
  durationDays: number | null
  targetDailyRate: number | null
  needSummary: string
  skills: NeedSkill[]
}

export interface ProfileSkill {
  skillId: string
  level: number | null
  years: number | null
  confidence: number | null
}

export interface MatchingProfile {
  sourceType: ProfileSourceType
  sourceId: string
  personId: string
  fullName: string
  currentTitle: string | null
  seniority: string | null
  expectedDailyRate: number | null
  availableFrom: string | null
  availabilityStatus: string
  mobility: string | null
  maxCommuteMinutes: number | null
  remotePreference: string | null
  practiceLabel: string | null
  sectorContext: string | null
  jobProfileId: string | null
  hasCandidateProfile: boolean
  skills: ProfileSkill[]
}

export interface MatchingContext {
  need: MatchingNeed
  profiles: MatchingProfile[]
  dataCutoffAt: string
}

// ── Types du moteur ───────────────────────────────────────────────────────────

export interface MatchEvidenceRef {
  table: string
  id: string
}

// Sortie d'un compute-cX : ce que la composante constate. `applicable=false`
// signifie "donnée absente / non évaluable" — la composante sort alors du
// numérateur ET du dénominateur (jamais une pénalité silencieuse), et son
// libellé remonte dans `missingData`.
export interface RawMatchComponent {
  componentKey: MatchComponentKey
  componentLabel: string
  applicable: boolean
  normalizedScore: number // 0-100, significatif seulement si applicable
  confidence: number // 0-100
  explanation: string
  positives: string[]
  negatives: string[]
  evidenceRefs: MatchEvidenceRef[]
}

export interface ProfileMatchResult {
  sourceType: ProfileSourceType
  sourceId: string
  personId: string
  fullName: string
  currentTitle: string | null
  availabilityStatus: string
  availableFrom: string | null
  hasCandidateProfile: boolean
  overallScore: number // 0-100 renormalisé sur les composantes applicables
  confidence: number // 0-100
  tier: MatchTier
  components: RawMatchComponent[]
  pros: string[]
  cons: string[]
  missingData: string[]
}

export interface MatchingResult {
  needId: string
  needTitle: string
  modelVersion: string
  dataCutoffAt: string
  poolSize: number
  rankedProfiles: ProfileMatchResult[]
}
