// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — contrat de données de la Synthèse (Lot 2)
//
//  Chantier : docs/FEATURES/consultants_workspace/
//  Le view-model est produit par un builder pur (`build-consultants-synthese.ts`)
//  à partir de lignes brutes, et consommé tel quel par l'UI (Lot 3). Aucun
//  recalcul côté composant.
// ─────────────────────────────────────────────────────────────────────────────

import type { OfferPracticeSlug } from "@/lib/config/practices"

/** Clé de bucket practice : slug `offer_practices` canonique, ou `null` = « Autre / non mappé ». */
export type ConsultantsPracticeKey = OfferPracticeSlug | null

export interface ConsultantsSyntheseKpis {
  /** Effectif interne actif — `collaborators.status <> 'sorti'` (DATA-1, résolu Lot 2). */
  activeCollaborators: number
  /** Vivier candidats — `candidates.status = 'vivier'` (définition **provisoire**, DATA-4 → Lot 7). */
  talentPoolCandidates: number
  /** Recrutements aboutis sur l'année civile courante — `candidate_hiring_processes.status = 'hired'` + `closed_at` dans l'année. */
  hiresYearToDate: number
  /** Année civile de référence utilisée pour `hiresYearToDate`. */
  referenceYear: number
}

export interface ConsultantsPracticeBucket {
  key: ConsultantsPracticeKey
  label: string
  colorHex: string | null
  collaborators: number
  candidates: number
}

export interface UpcomingMissionEnd {
  missionId: string
  missionTitle: string
  collaboratorName: string | null
  clientName: string | null
  /** Date de fin (ISO `YYYY-MM-DD`). */
  endDate: string
  /** Jours restants — dérivé (`endDate − referenceDate`), jamais une colonne DB. */
  daysRemaining: number
}

export interface InterContractCollaborator {
  collaboratorId: string
  fullName: string | null
  jobTitle: string | null
  practiceLabel: string | null
  lastMissionTitle: string | null
  lastMissionEndDate: string | null
  /** `null` si la ligne de rémunération est masquée par la RLS (rôle non owner/admin) ou absente. */
  grossAnnual: number | null
  /** `null` — même règle que `grossAnnual`. */
  cjm: number | null
  /** `false` quand la rémunération est masquée par la RLS confidentielle (DATA-7). */
  compensationVisible: boolean
  /**
   * Positionnements commerciaux en cours (DATA-3) — `opportunity_candidates`
   * rattachés à la même `person_id`, sur une opportunité et un statut non
   * terminaux. `null` = **non traçable** : le collaborateur n'a pas de fiche
   * `candidates` miroir, on ne peut pas distinguer « 0 » de « inconnu ».
   * `match_scores` (matching potentiel) n'est **jamais** utilisé ici.
   */
  activePositionings: number | null
}

export interface RecruitmentPipelineStep {
  step: string
  label: string
  count: number
}

export interface RecruitmentPipeline {
  /** Répartition des process **actifs** (`status = 'active'`) par `current_step`. */
  byStep: RecruitmentPipelineStep[]
  totalActive: number
  hiresYearToDate: number
  /** Process clos sans embauche sur l'année civile (`rejected` / `cancelled` / `withdrawn`). */
  closedNotHiredYearToDate: number
}

export interface ConsultantsSyntheseViewModel {
  generatedAt: string
  kpis: ConsultantsSyntheseKpis
  practiceBreakdown: ConsultantsPracticeBucket[]
  upcomingMissionEnds: UpcomingMissionEnd[]
  interContractCollaborators: InterContractCollaborator[]
  recruitmentPipeline: RecruitmentPipeline
  /** Réserves méthodo à afficher discrètement (OPEN QUESTIONS non tranchées). */
  dataNotes: string[]
}

// ── Lignes brutes attendues par le builder (forme, pas la requête) ────────────

export interface RawCollaborator {
  id: string
  status: string | null
  current_title: string | null
  practice: string | null
  job_profile_id: string | null
  full_name: string | null
}

export interface RawMission {
  id: string
  title: string | null
  status: string | null
  end_date: string | null
  collaborator_id: string | null
  client_name: string | null
}

export interface RawCandidate {
  id: string
  status: string | null
  practice_id: string | null
  person_id: string | null
}

export interface RawCompensation {
  collaborator_id: string
  gross_annual: number | null
  cjm: number | null
}

export interface RawHiringProcess {
  id: string
  status: string | null
  current_step: string | null
  closed_at: string | null
}

export interface RawPositioning {
  status: string | null
  person_id: string | null
  opportunity_stage: string | null
}

export interface RawJobProfile {
  id: string
  practice_id: string | null
}

export interface RawOfferPractice {
  id: string
  slug: string
  name: string
  color_hex: string | null
  sort_order: number | null
}

export interface BuildConsultantsSyntheseInput {
  referenceDate: Date
  collaborators: RawCollaborator[]
  /** `person_id` par `collaborator.id` — sert au rattachement des positionnements. */
  collaboratorPersonId: Record<string, string | null>
  missions: RawMission[]
  candidates: RawCandidate[]
  compensations: RawCompensation[]
  hiringProcesses: RawHiringProcess[]
  positionings: RawPositioning[]
  jobProfiles: RawJobProfile[]
  offerPractices: RawOfferPractice[]
  /** `true` si la table `collaborator_compensation` a renvoyé au moins une ligne (proxy « rôle habilité »). */
  compensationReadable: boolean
}
