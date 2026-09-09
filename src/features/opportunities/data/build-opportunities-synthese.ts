// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — builder PUR de la Synthèse (Lot 3)
//
//  Aucune dépendance Supabase : transforme des lignes brutes en view-model.
//  Testé unitairement dans `__tests__/build-opportunities-synthese.test.ts`.
//  Patron : `buildConsultantsSynthese`.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getPracticeByName,
  isOfferPracticeSlug,
  PRACTICE_SLUG_TO_OFFER_PRACTICE,
} from "@/lib/config/practices"
import { NEGATIVE_TERMINAL_POSITIONING_STATUSES } from "@/lib/needs-staffing/coverage"
import {
  getOpportunityStageLabel,
  isTerminalOpportunityStage,
  OPPORTUNITY_ACTIVE_STAGES,
  toCanonicalOpportunityStage,
  type SalesStage,
} from "@/lib/opportunities/stages"
import type {
  BuildOpportunitiesSyntheseInput,
  OpportunitiesPracticeKey,
  OpportunitiesSyntheseViewModel,
  OpportunityProcessRow,
  PipeBucket,
  PipeStageBucket,
  RawSyntheseOfferPractice,
  RawSyntheseOpportunity,
  SkillDemandRow,
  SkillSupplyRow,
  StaffingFunnelStep,
  StaffingProgressionBucket,
  SyntheseDeadline,
} from "./opportunities-synthese.types"

const OTHER_PRACTICE_LABEL = "Autre / non rattaché"
const UNASSIGNED_CLIENT_KEY = "__unassigned__"
const UNASSIGNED_CLIENT_LABEL = "Client non renseigné"
const OTHER_PRACTICE_KEY = "__other__"

/** Poids d'importance d'un besoin de compétence (OPP-20). */
const IMPORTANCE_WEIGHT: Record<string, number> = {
  indispensable: 3,
  souhaitee: 2,
  bonus: 1,
}

/** `opportunity_candidates.status` → bucket de progression (OPP-21). */
const STATUS_TO_BUCKET: Record<string, StaffingProgressionBucket> = {
  identifie: "identifie",
  propose_interne: "propose",
  preselectionne: "propose",
  envoye_client: "envoye_client",
  entretien_planifie: "entretien",
  entretien_realise: "entretien",
  retenu: "retenu",
  gagne: "retenu",
}

const STAFFING_FUNNEL_ORDER: { bucket: StaffingProgressionBucket; label: string }[] = [
  { bucket: "identifie", label: "Identifié" },
  { bucket: "propose", label: "Proposé · présélectionné" },
  { bucket: "envoye_client", label: "CV envoyé" },
  { bucket: "entretien", label: "Entretien" },
  { bucket: "retenu", label: "Retenu · gagné" },
]

function emptyBuckets(): Record<StaffingProgressionBucket, number> {
  return { identifie: 0, propose: 0, envoye_client: 0, entretien: 0, retenu: 0 }
}

/** Minuscules sans accents ni ponctuation — rapprochement tolérant de libellés. */
function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Practice canonique d'une opportunité (cascade C-17 du Consultants Workspace,
 * sans l'étage `job_profile` qui n'existe pas côté opportunité) :
 *  1. rapprochement exact du texte libre sur `offer_practices.name` (normalisé) ;
 *  2. heuristique par mots-clés (`getPracticeByName`) ;
 *  3. `null` → bucket « Autre / non rattaché ». Aucune nouvelle taxonomie.
 */
function resolveOpportunityPracticeKey(
  practice: string | null,
  offerPracticeSlugByName: Map<string, string>,
): OpportunitiesPracticeKey {
  if (practice) {
    const exact = offerPracticeSlugByName.get(normalizeLabel(practice))
    if (exact && isOfferPracticeSlug(exact)) return exact
  }
  const config = getPracticeByName(practice)
  if (config) {
    const slug = PRACTICE_SLUG_TO_OFFER_PRACTICE[config.slug]
    return slug && isOfferPracticeSlug(slug) ? slug : null
  }
  return null
}

function pipeValue(opportunity: RawSyntheseOpportunity): number {
  const base = opportunity.acv ?? opportunity.estimated_gain ?? 0
  const conviction = opportunity.conviction ?? 0
  return (base * conviction) / 100
}

function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function parseDueMs(iso: string): number | null {
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

export function buildOpportunitiesSynthese(
  input: BuildOpportunitiesSyntheseInput,
): OpportunitiesSyntheseViewModel {
  const {
    referenceDate,
    sharedKpis,
    opportunities,
    positionings,
    opportunitySkills,
    vivierPersonSkills,
    vivierPersonCount,
    offerPractices,
  } = input

  const offerPracticeSlugByName = new Map<string, string>(
    offerPractices.map((op: RawSyntheseOfferPractice) => [normalizeLabel(op.name), op.slug]),
  )
  const orderedPractices = [...offerPractices].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )

  const openOpportunities = opportunities.filter(
    (opportunity) => !isTerminalOpportunityStage(opportunity.stage),
  )
  const openOpportunityIds = new Set(openOpportunities.map((opportunity) => opportunity.id))

  // ── KPI ───────────────────────────────────────────────────────────────────
  const pipeWeightedValue = openOpportunities.reduce(
    (sum, opportunity) => sum + pipeValue(opportunity),
    0,
  )

  // ── Pipe par étape commerciale (0 inclus) ─────────────────────────────────
  const stageAgg = new Map<SalesStage, { weightedValue: number; opportunityCount: number }>()
  for (const stage of OPPORTUNITY_ACTIVE_STAGES) {
    stageAgg.set(stage.value, { weightedValue: 0, opportunityCount: 0 })
  }
  for (const opportunity of openOpportunities) {
    const canonical = toCanonicalOpportunityStage(opportunity.stage)
    if (!canonical) continue
    const entry = stageAgg.get(canonical)
    if (!entry) continue
    entry.weightedValue += pipeValue(opportunity)
    entry.opportunityCount += 1
  }
  const pipeByStage: PipeStageBucket[] = OPPORTUNITY_ACTIVE_STAGES.map((stage) => ({
    stage: stage.value,
    label: stage.label,
    weightedValue: stageAgg.get(stage.value)?.weightedValue ?? 0,
    opportunityCount: stageAgg.get(stage.value)?.opportunityCount ?? 0,
  }))

  // ── Pipe par client ──────────────────────────────────────────────────────
  const clientAgg = new Map<string, { label: string; weightedValue: number; opportunityCount: number }>()
  for (const opportunity of openOpportunities) {
    const key = opportunity.company_id ?? UNASSIGNED_CLIENT_KEY
    const label = opportunity.company_id
      ? opportunity.company_name?.trim() || UNASSIGNED_CLIENT_LABEL
      : UNASSIGNED_CLIENT_LABEL
    const entry = clientAgg.get(key) ?? { label, weightedValue: 0, opportunityCount: 0 }
    entry.weightedValue += pipeValue(opportunity)
    entry.opportunityCount += 1
    clientAgg.set(key, entry)
  }
  const pipeByClient: PipeBucket[] = [...clientAgg.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.weightedValue - a.weightedValue || a.label.localeCompare(b.label))

  // ── Pipe par practice ────────────────────────────────────────────────────
  const practiceKeyByOpportunity = new Map<string, OpportunitiesPracticeKey>()
  const practiceAgg = new Map<string, { weightedValue: number; opportunityCount: number }>()
  let openWithoutPractice = 0
  for (const opportunity of openOpportunities) {
    const practiceKey = resolveOpportunityPracticeKey(opportunity.practice, offerPracticeSlugByName)
    practiceKeyByOpportunity.set(opportunity.id, practiceKey)
    if (practiceKey === null) openWithoutPractice += 1
    const aggKey = practiceKey ?? OTHER_PRACTICE_KEY
    const entry = practiceAgg.get(aggKey) ?? { weightedValue: 0, opportunityCount: 0 }
    entry.weightedValue += pipeValue(opportunity)
    entry.opportunityCount += 1
    practiceAgg.set(aggKey, entry)
  }
  const pipeByPractice: PipeBucket[] = []
  for (const op of orderedPractices) {
    const entry = practiceAgg.get(op.slug)
    if (!entry || entry.opportunityCount === 0) continue
    pipeByPractice.push({ key: op.slug, label: op.name, ...entry })
  }
  const otherEntry = practiceAgg.get(OTHER_PRACTICE_KEY)
  if (otherEntry && otherEntry.opportunityCount > 0) {
    pipeByPractice.push({ key: OTHER_PRACTICE_KEY, label: OTHER_PRACTICE_LABEL, ...otherEntry })
  }

  // ── Top compétences demandées (opps ouvertes) — OPP-20 ────────────────────
  const demandAgg = new Map<string, { name: string; score: number; opportunities: Set<string> }>()
  for (const row of opportunitySkills) {
    if (!openOpportunityIds.has(row.opportunity_id)) continue
    const weight = row.weight ?? 0
    const multiplier = IMPORTANCE_WEIGHT[row.importance ?? ""] ?? 1
    const entry = demandAgg.get(row.skill_id) ?? {
      name: row.skill_name?.trim() || "Compétence",
      score: 0,
      opportunities: new Set<string>(),
    }
    entry.score += weight * multiplier
    entry.opportunities.add(row.opportunity_id)
    demandAgg.set(row.skill_id, entry)
  }
  const skillsDemand: SkillDemandRow[] = [...demandAgg.entries()]
    .map(([skillId, value]) => ({
      skillId,
      name: value.name,
      score: value.score,
      opportunityCount: value.opportunities.size,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.opportunityCount - a.opportunityCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 5)

  // ── Top compétences vivier — OPP-20 ──────────────────────────────────────
  const supplyAgg = new Map<string, { name: string; persons: Set<string>; levelSum: number }>()
  for (const row of vivierPersonSkills) {
    const entry = supplyAgg.get(row.skill_id) ?? {
      name: row.skill_name?.trim() || "Compétence",
      persons: new Set<string>(),
      levelSum: 0,
    }
    entry.persons.add(row.person_id)
    entry.levelSum += row.level ?? 0
    supplyAgg.set(row.skill_id, entry)
  }
  const skillsSupply: SkillSupplyRow[] = [...supplyAgg.entries()]
    .map(([skillId, value]) => ({
      skillId,
      name: value.name,
      personCount: value.persons.size,
      levelSum: value.levelSum,
    }))
    .sort(
      (a, b) =>
        b.personCount - a.personCount ||
        b.levelSum - a.levelSum ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 5)

  // ── Progression staffing par opportunité + entonnoir agrégé — OPP-21 ─────
  const positioningsByOpportunity = new Map<string, string[]>()
  for (const positioning of positionings) {
    if (!openOpportunityIds.has(positioning.opportunity_id)) continue
    const list = positioningsByOpportunity.get(positioning.opportunity_id) ?? []
    list.push(positioning.status ?? "")
    positioningsByOpportunity.set(positioning.opportunity_id, list)
  }

  const funnelTotals = emptyBuckets()
  const processByOpportunity: OpportunityProcessRow[] = openOpportunities
    .map((opportunity) => {
      const buckets = emptyBuckets()
      let excluded = 0
      let active = 0
      for (const status of positioningsByOpportunity.get(opportunity.id) ?? []) {
        if (NEGATIVE_TERMINAL_POSITIONING_STATUSES.has(status)) {
          excluded += 1
          continue
        }
        active += 1
        const bucket = STATUS_TO_BUCKET[status]
        if (bucket) {
          buckets[bucket] += 1
          funnelTotals[bucket] += 1
        }
      }
      const canonicalStage = toCanonicalOpportunityStage(opportunity.stage)
      return {
        opportunityId: opportunity.id,
        title: opportunity.title,
        clientName: opportunity.company_name?.trim() || null,
        stage: canonicalStage,
        stageLabel: getOpportunityStageLabel(opportunity.stage),
        positioningsByBucket: buckets,
        activePositioningsCount: active,
        excludedPositioningsCount: excluded,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))

  const staffingFunnel: StaffingFunnelStep[] = STAFFING_FUNNEL_ORDER.map((step) => ({
    bucket: step.bucket,
    label: step.label,
    count: funnelTotals[step.bucket],
  }))

  // ── 5 prochaines échéances (provisoire — canonique au Lot 8 / DATA-03) ────
  const refMs = toUtcMidnight(referenceDate)
  const upcomingDeadlines: SyntheseDeadline[] = openOpportunities
    .map((opportunity): SyntheseDeadline | null => {
      if (opportunity.next_action_at) {
        return {
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          clientName: opportunity.company_name?.trim() || null,
          kind: "action",
          label: opportunity.next_action_label?.trim() || "Prochaine action",
          dueAt: opportunity.next_action_at,
        }
      }
      if (opportunity.target_close_date) {
        return {
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          clientName: opportunity.company_name?.trim() || null,
          kind: "closing",
          label: "Date de closing visée",
          dueAt: opportunity.target_close_date,
        }
      }
      return null
    })
    .filter((deadline): deadline is SyntheseDeadline => {
      if (!deadline) return false
      const ms = parseDueMs(deadline.dueAt)
      return ms !== null && ms >= refMs
    })
    .sort((a, b) => (parseDueMs(a.dueAt) ?? 0) - (parseDueMs(b.dueAt) ?? 0))
    .slice(0, 5)

  // ── Réserves méthodo ─────────────────────────────────────────────────────
  const openWithoutValue = openOpportunities.filter(
    (opportunity) => opportunity.acv == null && opportunity.estimated_gain == null,
  ).length

  const dataNotes: string[] = [
    "CA du pipe = Σ ((ACV ?? gain estimé ?? 0) × conviction/100) sur les opportunités ouvertes (DATA-01, option B — OPP-19).",
    "Top compétences demandées classées par Σ (poids × importance : indispensable ×3 · souhaitée ×2 · bonus ×1) ; vivier par nombre de profils distincts (DATA-02b — OPP-20).",
    `Vivier = candidats au statut « vivier » — définition provisoire reprise du Consultants Workspace (DATA-02), à re-synchroniser au Consultants Lot 7. ${vivierPersonCount} profil(s).`,
    "Échéances Synthèse provisoires (next_action_at puis target_close_date) : le concept canonique OpportunityDeadline, incluant calendar_events, est arrêté au Lot 8 (DATA-03).",
  ]
  if (openWithoutValue > 0) {
    dataNotes.push(
      `${openWithoutValue} opportunité(s) ouverte(s) sans valeur (ni ACV ni gain estimé) comptée(s) à 0 € dans le CA du pipe.`,
    )
  }
  if (openWithoutPractice > 0) {
    dataNotes.push(
      `${openWithoutPractice} opportunité(s) ouverte(s) sans practice résolue (texte libre non normalisé) — bucket « ${OTHER_PRACTICE_LABEL} ».`,
    )
  }

  return {
    generatedAt: referenceDate.toISOString(),
    kpis: {
      openNeedsCount: sharedKpis.openNeedsCount,
      activePositioningsCount: sharedKpis.activePositioningsCount,
      pipeWeightedValue,
      openOpportunitiesCount: openOpportunities.length,
    },
    pipeByStage,
    pipeByClient,
    pipeByPractice,
    skillsDemand,
    skillsSupply,
    staffingFunnel,
    processByOpportunity,
    upcomingDeadlines,
    dataNotes,
  }
}

/** Libellés d'entonnoir staffing — exportés pour l'UI (Lot 4). */
export const STAFFING_FUNNEL_LABELS: Record<StaffingProgressionBucket, string> =
  Object.fromEntries(
    STAFFING_FUNNEL_ORDER.map((step) => [step.bucket, step.label]),
  ) as Record<StaffingProgressionBucket, string>

/** Poids d'importance exposé pour tests / réconciliation. */
export { IMPORTANCE_WEIGHT }
