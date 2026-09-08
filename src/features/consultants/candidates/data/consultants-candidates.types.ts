// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — chapitre Candidats : contrat de données (Lot 7)
//
//  Modèle de lecture **candidate-centric** (C-06) : le view-model part de
//  `candidates` et liste le vivier complet, y compris les candidats sans
//  positionnement (`opportunity_candidates`) ni process (`candidate_hiring_
//  processes`). Aucun rendu ici — types + builder pur + loader mince (C-20).
// ─────────────────────────────────────────────────────────────────────────────

import type { OfferPracticeSlug } from "@/lib/config/practices"
import type { CandidateLifecycleStatus } from "@/lib/recruitment/candidate-lifecycle"

/** Clé practice canonique (`offer_practices.slug`) ou `null` si non rattaché. */
export type CandidatePracticeKey = OfferPracticeSlug | null

/**
 * Position dans le pipeline, dérivée (jamais stockée) :
 *  - `closed`      : lifecycle terminal (`recrute`/`refuse`/`ko_manager`/`archive`) ;
 *  - `in_process`  : process de recrutement actif, ou `status = 'en_process'`,
 *                    ou positionnement commercial actif ;
 *  - `pool`        : tout le reste (vivier travaillable, sans action en cours).
 */
export type CandidatePipelineState = "in_process" | "pool" | "closed"

/**
 * Fenêtre de disponibilité, dérivée de `available_from` (date, peuplée 43/43 live)
 * — jamais du texte libre `availability` (DATA-6). Sert au tri/filtre.
 */
export type CandidateAvailabilityBucket = "immediate" | "scheduled" | "unknown"

// ── Lignes brutes (sortie du loader, entrée du builder) ──────────────────────

export interface RawCandidateRow {
  id: string
  person_id: string | null
  status: string | null
  seniority: string | null
  current_title: string | null
  practice_id: string | null
  job_profile_id: string | null
  availability: string | null
  available_from: string | null
  notice_period_days: number | null
  expected_salary: number | null
  expected_daily_rate: number | null
  source: string | null
  summary: string | null
  full_name: string | null
  location: string | null
}

export interface RawCandidateHiringProcessRow {
  id: string
  candidate_id: string | null
  status: string | null
  current_step: string | null
  started_at: string | null
  closed_at: string | null
}

/** Un jalon `prequalification/valide` daté — sert au calcul de `qualifiedThisYear` (DATA-4). */
export interface RawPrequalificationMilestoneRow {
  candidate_id: string | null
  completed_at: string | null
}

export interface RawCandidatePositioningRow {
  candidate_id: string | null
  status: string | null
  updated_at: string | null
  next_action: string | null
  opportunity_stage: string | null
}

export interface RawJobProfileRef {
  id: string
  practice_id: string | null
}

export interface RawOfferPracticeRef {
  id: string
  slug: string
  name: string
  sort_order: number | null
}

export interface BuildConsultantsCandidatesInput {
  referenceDate: Date
  candidates: RawCandidateRow[]
  hiringProcesses: RawCandidateHiringProcessRow[]
  prequalificationMilestones: RawPrequalificationMilestoneRow[]
  positionings: RawCandidatePositioningRow[]
  jobProfiles: RawJobProfileRef[]
  offerPractices: RawOfferPracticeRef[]
}

// ── View-model ──────────────────────────────────────────────────────────────

export interface CandidateHiringSnapshot {
  processId: string
  status: string | null
  currentStep: string | null
  startedAt: string | null
}

export interface ConsultantsCandidateRow {
  candidateId: string
  personId: string | null
  fullName: string
  currentTitle: string | null
  seniority: string | null
  location: string | null
  source: string | null
  summary: string | null

  practiceKey: CandidatePracticeKey
  practiceLabel: string | null

  lifecycleStatus: CandidateLifecycleStatus | null
  /** `candidates.status` brut quand hors whitelist (aucune perte d'information). */
  lifecycleStatusRaw: string | null
  lifecycleLabel: string
  isTerminalLifecycle: boolean
  pipelineState: CandidatePipelineState

  /** DATA-4 : jalon `prequalification/valide` avec `completed_at` dans l'année civile de référence. */
  qualifiedThisYear: boolean

  availabilityLabel: string | null
  availableFrom: string | null
  noticePeriodDays: number | null
  availabilityBucket: CandidateAvailabilityBucket

  expectedSalary: number | null
  expectedDailyRate: number | null

  hasActiveHiringProcess: boolean
  latestHiringProcess: CandidateHiringSnapshot | null

  hasActivePositioning: boolean
  activePositioningCount: number
  /** PRODUCT-2 (option a) : `next_action` du positionnement actif le plus récent ; `null` sinon. */
  nextAction: string | null
}

export interface ConsultantsCandidatesCounts {
  total: number
  pool: number
  inProcess: number
  closed: number
  qualifiedThisYear: number
  withoutPositioning: number
}

export interface ConsultantsCandidatesViewModel {
  generatedAt: string
  referenceYear: number
  rows: ConsultantsCandidateRow[]
  counts: ConsultantsCandidatesCounts
  dataNotes: string[]
}
