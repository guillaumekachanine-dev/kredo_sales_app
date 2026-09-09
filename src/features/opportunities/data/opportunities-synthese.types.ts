// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — contrat de données du chapitre Synthèse (Lot 3)
//
//  Chantier : docs/FEATURES/opportunities_workspace/ (§ 9).
//  Le view-model est produit par un builder PUR (`build-opportunities-synthese.ts`)
//  à partir de lignes brutes, et sera consommé tel quel par l'UI (Lot 4). Aucun
//  recalcul côté composant, aucun second loader qui recompterait un KPI.
//
//  Décisions actées à ce lot (miroir du Decision Log — doc canonique § 16) :
//   - OPP-19 — DATA-01 : « CA du pipe » = Σ ((acv ?? estimated_gain ?? 0) ×
//     conviction/100) sur les opportunités **ouvertes** (étape non terminale).
//     Option B — incumbent `OpportunitiesKpiSection.getWeightedValue`, meilleure
//     couverture (acv 31/32, fallback gain estimé, sinon 0). Réconcilie LEGACY-04.
//   - OPP-20 — DATA-02b : Top compétences **demandées** classées par
//     Σ (weight × importance) (indispensable ×3 · souhaitée ×2 · bonus ×1) ;
//     Top **vivier** classé par nombre de profils distincts portant la compétence.
//   - OPP-21 — PRODUCT-01 (volet affichage) : taxonomie explicite de progression
//     staffing `StaffingProgressionBucket` (5 buckets), **superposée** à l'étape
//     commerciale `stages.ts`, jamais fusionnée (OPP-09). Les statuts terminaux
//     négatifs (`refuse_client` · `refuse_candidat` · `abandonne`) sont hors
//     entonnoir.
//
//  KPI 1 & 2 proviennent de `getNeedsStaffingSharedData` — jamais recalculés ici.
// ─────────────────────────────────────────────────────────────────────────────

import type { OfferPracticeSlug } from "@/lib/config/practices"
import type { SalesStage } from "@/lib/opportunities/stages"

/** Clé de bucket practice : slug `offer_practices` canonique, ou `null` = « Autre / non rattaché ». */
export type OpportunitiesPracticeKey = OfferPracticeSlug | null

export interface OpportunitiesSyntheseKpis {
  /** Besoins ouverts — `NeedsStaffingSharedData.kpis.openNeedsCount` (repris tel quel). */
  openNeedsCount: number
  /** Positionnements actifs — `NeedsStaffingSharedData.kpis.activePositioningsCount` (repris tel quel). */
  activePositioningsCount: number
  /** CA du pipe — DATA-01 / OPP-19 (option B). Somme des `weightedValue` des graphiques Pipe. */
  pipeWeightedValue: number
  /** Nombre d'opportunités ouvertes entrant dans `pipeWeightedValue`. */
  openOpportunitiesCount: number
}

export interface PipeStageBucket {
  stage: SalesStage
  label: string
  weightedValue: number
  opportunityCount: number
}

export interface PipeBucket {
  /** `company_id`, slug `offer_practices`, ou sentinelle (`__unassigned__` / `__other__`). */
  key: string
  label: string
  weightedValue: number
  opportunityCount: number
}

export interface SkillDemandRow {
  skillId: string
  name: string
  /** Σ (weight × poids d'importance) sur les opportunités ouvertes (OPP-20). */
  score: number
  /** Nombre d'opportunités ouvertes distinctes exprimant la compétence. */
  opportunityCount: number
}

export interface SkillSupplyRow {
  skillId: string
  name: string
  /** Nombre de profils vivier distincts portant la compétence (OPP-20). */
  personCount: number
  /** Σ des niveaux déclarés — départage. */
  levelSum: number
}

/** Taxonomie explicite de progression staffing (OPP-21) — superposée à `stages.ts`. */
export type StaffingProgressionBucket =
  | "identifie"
  | "propose"
  | "envoye_client"
  | "entretien"
  | "retenu"

export interface StaffingFunnelStep {
  bucket: StaffingProgressionBucket
  label: string
  count: number
}

export interface OpportunityProcessRow {
  opportunityId: string
  title: string
  clientName: string | null
  /** Étape commerciale canonique (`stages.ts`) — `null` si non résolue. */
  stage: SalesStage | null
  stageLabel: string
  /** Positionnements du besoin ventilés par bucket (les 5 clés toujours présentes, 0 inclus). */
  positioningsByBucket: Record<StaffingProgressionBucket, number>
  /** Positionnements non terminaux négatifs. */
  activePositioningsCount: number
  /** Positionnements `refuse_client` / `refuse_candidat` / `abandonne` (hors entonnoir). */
  excludedPositioningsCount: number
}

export interface SyntheseDeadline {
  opportunityId: string
  opportunityTitle: string
  clientName: string | null
  /** `action` = `next_action_at` · `closing` = `target_close_date`. */
  kind: "action" | "closing"
  label: string
  /** ISO. */
  dueAt: string
}

export interface OpportunitiesSyntheseViewModel {
  generatedAt: string
  kpis: OpportunitiesSyntheseKpis
  pipeByStage: PipeStageBucket[]
  pipeByClient: PipeBucket[]
  pipeByPractice: PipeBucket[]
  skillsDemand: SkillDemandRow[]
  skillsSupply: SkillSupplyRow[]
  staffingFunnel: StaffingFunnelStep[]
  processByOpportunity: OpportunityProcessRow[]
  /** Provisoire — arbitrage canonique `OpportunityDeadline` (incl. `calendar_events`) au Lot 8 (DATA-03). */
  upcomingDeadlines: SyntheseDeadline[]
  /** Réserves méthodo à afficher discrètement (OPEN QUESTIONS non tranchées / couverture data). */
  dataNotes: string[]
}

// ── Lignes brutes attendues par le builder (forme, pas la requête) ────────────

export interface RawSyntheseOpportunity {
  id: string
  title: string
  stage: string
  conviction: number | null
  estimated_gain: number | null
  acv: number | null
  company_id: string | null
  company_name: string | null
  practice: string | null
  next_action_at: string | null
  next_action_label: string | null
  target_close_date: string | null
}

export interface RawSynthesePositioning {
  opportunity_id: string
  status: string | null
}

export interface RawSyntheseOpportunitySkill {
  opportunity_id: string
  skill_id: string
  skill_name: string | null
  importance: string | null
  weight: number | null
}

export interface RawSyntheseVivierPersonSkill {
  person_id: string
  skill_id: string
  skill_name: string | null
  level: number | null
}

export interface RawSyntheseOfferPractice {
  id: string
  slug: string
  name: string
  sort_order: number | null
}

export interface BuildOpportunitiesSyntheseInput {
  referenceDate: Date
  /** KPI 1 & 2 — repris de `getNeedsStaffingSharedData`, jamais recalculés. */
  sharedKpis: {
    openNeedsCount: number
    activePositioningsCount: number
  }
  /** Toutes les opportunités du workspace (le builder filtre les ouvertes). */
  opportunities: RawSyntheseOpportunity[]
  /** Positionnements des opportunités **ouvertes** (le loader a déjà filtré). */
  positionings: RawSynthesePositioning[]
  /** `opportunity_skills` des opportunités **ouvertes** (le loader a déjà filtré). */
  opportunitySkills: RawSyntheseOpportunitySkill[]
  /** `person_skills` des profils **vivier** uniquement (le loader a déjà filtré). */
  vivierPersonSkills: RawSyntheseVivierPersonSkill[]
  /** Nombre total de profils vivier distincts (pour une réserve méthodo). */
  vivierPersonCount: number
  offerPractices: RawSyntheseOfferPractice[]
}
