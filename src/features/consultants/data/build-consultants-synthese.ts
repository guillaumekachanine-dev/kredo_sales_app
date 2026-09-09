// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — builder pur de la Synthèse (Lot 2)
//
//  Aucune dépendance Supabase : transforme des lignes brutes en view-model.
//  Testé unitairement dans `__tests__/build-consultants-synthese.test.ts`.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getPracticeByName,
  isOfferPracticeSlug,
  PRACTICE_SLUG_TO_OFFER_PRACTICE,
  type OfferPracticeSlug,
} from "@/lib/config/practices"
import {
  HIRING_KANBAN_STAGES,
  RECRUITMENT_TERMINAL_STATUSES,
} from "@/lib/recruitment/recruitment-stages"
import type {
  BuildConsultantsSyntheseInput,
  ConsultantsPracticeBucket,
  ConsultantsPracticeKey,
  ConsultantsSyntheseViewModel,
  InterContractCollaborator,
  RawCollaborator,
  RecruitmentPipelineStep,
  UpcomingMissionEnd,
} from "./consultants-synthese.types"

const SORTIE_STATUS = "sorti"
const INTERCONTRAT_STATUS = "intercontrat"
const TALENT_POOL_STATUS = "vivier"
const HIRED_STATUS = "hired"
const ACTIVE_PROCESS_STATUS = "active"
const CLOSED_NOT_HIRED_STATUSES = new Set(["rejected", "cancelled", "withdrawn"])
const TERMINAL_OPPORTUNITY_STAGES = new Set(["gagne", "perdu", "abandonne"])
const OTHER_PRACTICE_LABEL = "Autre / non rattaché"

const DAY_MS = 86_400_000

/** Minuscules sans accents ni ponctuation — pour un rapprochement tolérant de libellés. */
function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** `YYYY-MM-DD` → ms UTC minuit, ou `null`. */
function isoDateToUtcMidnight(iso: string | null): number | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function daysRemaining(referenceDate: Date, endIso: string): number {
  const end = isoDateToUtcMidnight(endIso)
  if (end === null) return 0
  return Math.max(0, Math.round((end - toUtcMidnight(referenceDate)) / DAY_MS))
}

function inCivilYear(iso: string | null, year: number): boolean {
  return typeof iso === "string" && iso.slice(0, 4) === String(year)
}

/**
 * Practice canonique d'un collaborateur :
 *  1. `job_profile_id` → `job_profiles.practice_id` → `offer_practices.slug` (autoritaire) ;
 *  2. sinon rapprochement exact du texte libre sur `offer_practices.name` (5/13 valeurs live sont verbatim) ;
 *  3. sinon heuristique par mots-clés (`getPracticeByName`) ;
 *  4. sinon `null` (bucket « Autre »).
 */
function resolveCollaboratorPracticeKey(
  collaborator: RawCollaborator,
  jobProfilePracticeById: Map<string, string | null>,
  offerPracticeSlugById: Map<string, string>,
  offerPracticeSlugByName: Map<string, string>,
): ConsultantsPracticeKey {
  if (collaborator.job_profile_id) {
    const practiceId = jobProfilePracticeById.get(collaborator.job_profile_id)
    if (practiceId) {
      const slug = offerPracticeSlugById.get(practiceId)
      if (slug && isOfferPracticeSlug(slug)) return slug
    }
  }
  if (collaborator.practice) {
    const exact = offerPracticeSlugByName.get(normalizeLabel(collaborator.practice))
    if (exact && isOfferPracticeSlug(exact)) return exact
  }
  const config = getPracticeByName(collaborator.practice)
  if (config) return PRACTICE_SLUG_TO_OFFER_PRACTICE[config.slug] ?? null
  return null
}

function resolveCandidatePracticeKey(
  practiceId: string | null,
  offerPracticeSlugById: Map<string, string>,
): ConsultantsPracticeKey {
  if (!practiceId) return null
  const slug = offerPracticeSlugById.get(practiceId)
  return slug && isOfferPracticeSlug(slug) ? slug : null
}

export function buildConsultantsSynthese(
  input: BuildConsultantsSyntheseInput,
): ConsultantsSyntheseViewModel {
  const {
    referenceDate,
    collaborators,
    collaboratorPersonId,
    missions,
    candidates,
    compensations,
    hiringProcesses,
    positionings,
    jobProfiles,
    offerPractices,
    compensationReadable,
  } = input

  const referenceYear = referenceDate.getUTCFullYear()

  // ── Référentiels ──────────────────────────────────────────────────────────
  const jobProfilePracticeById = new Map<string, string | null>(
    jobProfiles.map((jp) => [jp.id, jp.practice_id]),
  )
  const offerPracticeSlugById = new Map<string, string>(
    offerPractices.map((op) => [op.id, op.slug]),
  )
  const offerPracticeSlugByName = new Map<string, string>(
    offerPractices.map((op) => [normalizeLabel(op.name), op.slug]),
  )
  const orderedPractices = [...offerPractices].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )

  // ── Collaborateurs ────────────────────────────────────────────────────────
  const activeCollaborators = collaborators.filter((c) => c.status !== SORTIE_STATUS)
  const collaboratorPracticeKey = new Map<string, ConsultantsPracticeKey>()
  for (const c of activeCollaborators) {
    collaboratorPracticeKey.set(
      c.id,
      resolveCollaboratorPracticeKey(
        c,
        jobProfilePracticeById,
        offerPracticeSlugById,
        offerPracticeSlugByName,
      ),
    )
  }
  const unmappedCollaborators = activeCollaborators.filter(
    (c) => collaboratorPracticeKey.get(c.id) === null,
  ).length

  // ── Candidats ─────────────────────────────────────────────────────────────
  const candidatePracticeKey = candidates.map((cand) =>
    resolveCandidatePracticeKey(cand.practice_id, offerPracticeSlugById),
  )
  const candidatePracticeKeyById = new Map<string, ConsultantsPracticeKey>(
    candidates.map((candidate, index) => [candidate.id, candidatePracticeKey[index]]),
  )
  const talentPoolCandidates = candidates.filter((c) => c.status === TALENT_POOL_STATUS).length
  const candidatePersonIds = new Set(
    candidates.map((c) => c.person_id).filter((v): v is string => Boolean(v)),
  )

  // ── Répartition par practice ──────────────────────────────────────────────
  const collabCountByKey = new Map<ConsultantsPracticeKey, number>()
  for (const key of collaboratorPracticeKey.values()) {
    collabCountByKey.set(key, (collabCountByKey.get(key) ?? 0) + 1)
  }
  const candCountByKey = new Map<ConsultantsPracticeKey, number>()
  for (const key of candidatePracticeKey) {
    candCountByKey.set(key, (candCountByKey.get(key) ?? 0) + 1)
  }

  // ── Recrutements aboutis par practice ────────────────────────────────────
  // La practice du besoin (job_profile) prime sur celle du candidat : elle est
  // relationnelle et décrit le recrutement réalisé. Le candidat est le fallback.
  const hiresCountByKey = new Map<ConsultantsPracticeKey, number>()
  for (const process of hiringProcesses) {
    if (process.status !== HIRED_STATUS || !inCivilYear(process.closed_at, referenceYear)) continue

    const jobProfilePracticeId = process.job_profile_id
      ? jobProfilePracticeById.get(process.job_profile_id) ?? null
      : null
    const fromJobProfile = jobProfilePracticeId
      ? offerPracticeSlugById.get(jobProfilePracticeId) ?? null
      : null
    const key =
      (fromJobProfile && isOfferPracticeSlug(fromJobProfile) ? fromJobProfile : null) ??
      (process.candidate_id ? candidatePracticeKeyById.get(process.candidate_id) ?? null : null)

    hiresCountByKey.set(key, (hiresCountByKey.get(key) ?? 0) + 1)
  }

  const practiceBreakdown: ConsultantsPracticeBucket[] = []
  for (const op of orderedPractices) {
    if (!isOfferPracticeSlug(op.slug)) continue
    const key = op.slug as OfferPracticeSlug
    const collaboratorsCount = collabCountByKey.get(key) ?? 0
    const candidatesCount = candCountByKey.get(key) ?? 0
    const hiresCount = hiresCountByKey.get(key) ?? 0
    if (collaboratorsCount === 0 && candidatesCount === 0 && hiresCount === 0) continue
    practiceBreakdown.push({
      key,
      label: op.name,
      colorHex: op.color_hex,
      collaborators: collaboratorsCount,
      candidates: candidatesCount,
      hiresYearToDate: hiresCount,
    })
  }
  const otherCollaborators = collabCountByKey.get(null) ?? 0
  const otherCandidates = candCountByKey.get(null) ?? 0
  const otherHires = hiresCountByKey.get(null) ?? 0
  if (otherCollaborators > 0 || otherCandidates > 0 || otherHires > 0) {
    practiceBreakdown.push({
      key: null,
      label: OTHER_PRACTICE_LABEL,
      colorHex: null,
      collaborators: otherCollaborators,
      candidates: otherCandidates,
      hiresYearToDate: otherHires,
    })
  }

  // ── Prochaines fins de mission ────────────────────────────────────────────
  const collaboratorNameById = new Map<string, string | null>(
    collaborators.map((c) => [c.id, c.full_name]),
  )
  const refMidnight = toUtcMidnight(referenceDate)
  const upcomingMissionEnds: UpcomingMissionEnd[] = missions
    .filter((m) => {
      if (m.status !== "active") return false
      const end = isoDateToUtcMidnight(m.end_date)
      return end !== null && end >= refMidnight
    })
    .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? ""))
    .slice(0, 5)
    .map((m) => ({
      missionId: m.id,
      missionTitle: m.title?.trim() || "Mission sans titre",
      collaboratorName: m.collaborator_id
        ? collaboratorNameById.get(m.collaborator_id) ?? null
        : null,
      clientName: m.client_name?.trim() || null,
      endDate: (m.end_date ?? "").slice(0, 10),
      daysRemaining: daysRemaining(referenceDate, m.end_date ?? ""),
    }))

  // ── Collaborateurs en intercontrat ───────────────────────────────────────
  const compensationByCollaborator = new Map(
    compensations.map((c) => [c.collaborator_id, c]),
  )
  const lastMissionByCollaborator = new Map<string, { title: string | null; end: string | null }>()
  for (const m of missions) {
    if (!m.collaborator_id) continue
    const current = lastMissionByCollaborator.get(m.collaborator_id)
    if (!current || (m.end_date ?? "") > (current.end ?? "")) {
      lastMissionByCollaborator.set(m.collaborator_id, { title: m.title, end: m.end_date })
    }
  }

  // Positionnements non terminaux par person_id.
  const activePositioningCountByPerson = new Map<string, number>()
  for (const p of positionings) {
    if (!p.person_id) continue
    if (p.opportunity_stage && TERMINAL_OPPORTUNITY_STAGES.has(p.opportunity_stage)) continue
    if (p.status && RECRUITMENT_TERMINAL_STATUSES.has(p.status)) continue
    activePositioningCountByPerson.set(
      p.person_id,
      (activePositioningCountByPerson.get(p.person_id) ?? 0) + 1,
    )
  }

  const practiceLabelBySlug = new Map<string, string>(
    offerPractices.map((op) => [op.slug, op.name]),
  )

  const interContractCollaborators: InterContractCollaborator[] = collaborators
    .filter((c) => c.status === INTERCONTRAT_STATUS)
    .map((c) => {
      const key = collaboratorPracticeKey.get(c.id) ?? null
      const comp = compensationByCollaborator.get(c.id) ?? null
      const lastMission = lastMissionByCollaborator.get(c.id) ?? null
      const personId = collaboratorPersonId[c.id] ?? null
      const trackable = Boolean(personId) && candidatePersonIds.has(personId as string)
      return {
        collaboratorId: c.id,
        fullName: c.full_name,
        jobTitle: c.current_title,
        practiceLabel: key ? practiceLabelBySlug.get(key) ?? null : null,
        lastMissionTitle: lastMission?.title?.trim() || null,
        lastMissionEndDate: lastMission?.end ? lastMission.end.slice(0, 10) : null,
        grossAnnual: comp?.gross_annual ?? null,
        cjm: comp?.cjm ?? null,
        compensationVisible: compensationReadable,
        activePositionings: trackable
          ? activePositioningCountByPerson.get(personId as string) ?? 0
          : null,
      }
    })

  // ── Pipeline recrutement ─────────────────────────────────────────────────
  const activeProcesses = hiringProcesses.filter((p) => p.status === ACTIVE_PROCESS_STATUS)
  const activeCountByStep = new Map<string, number>()
  for (const p of activeProcesses) {
    if (!p.current_step) continue
    activeCountByStep.set(p.current_step, (activeCountByStep.get(p.current_step) ?? 0) + 1)
  }
  const byStep: RecruitmentPipelineStep[] = HIRING_KANBAN_STAGES.map((stage) => ({
    step: stage.key,
    label: stage.label,
    count: activeCountByStep.get(stage.key) ?? 0,
  }))

  const hiresYearToDate = hiringProcesses.filter(
    (p) => p.status === HIRED_STATUS && inCivilYear(p.closed_at, referenceYear),
  ).length
  const closedNotHiredYearToDate = hiringProcesses.filter(
    (p) =>
      p.status !== null &&
      CLOSED_NOT_HIRED_STATUSES.has(p.status) &&
      inCivilYear(p.closed_at, referenceYear),
  ).length

  // ── Réserves méthodo ─────────────────────────────────────────────────────
  const dataNotes: string[] = []
  dataNotes.push(
    "Vivier = candidats au statut « vivier » — définition provisoire, arrêtée au Lot 7.",
  )
  if (unmappedCollaborators > 0) {
    dataNotes.push(
      `Practice résolue par heuristique sur texte libre pour les collaborateurs sans fiche de profil — ${unmappedCollaborators} non rattaché(s).`,
    )
  }
  const untrackablePositionings = interContractCollaborators.filter(
    (c) => c.activePositionings === null,
  ).length
  if (untrackablePositionings > 0) {
    dataNotes.push(
      `Positionnements en cours non traçables pour ${untrackablePositionings} collaborateur(s) en intercontrat sans fiche candidat (affiché « — »).`,
    )
  }
  if (!compensationReadable && interContractCollaborators.length > 0) {
    dataNotes.push("Rémunération (salaire annuel, CJM) masquée : droits insuffisants.")
  }

  return {
    generatedAt: referenceDate.toISOString(),
    kpis: {
      activeCollaborators: activeCollaborators.length,
      talentPoolCandidates,
      hiresYearToDate,
      referenceYear,
    },
    practiceBreakdown,
    upcomingMissionEnds,
    interContractCollaborators,
    recruitmentPipeline: {
      byStep,
      totalActive: activeProcesses.length,
      hiresYearToDate,
      closedNotHiredYearToDate,
    },
    dataNotes,
  }
}
