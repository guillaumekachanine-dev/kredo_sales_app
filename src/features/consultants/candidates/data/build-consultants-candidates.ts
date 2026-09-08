// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — builder pur du chapitre Candidats (Lot 7)
//
//  Aucune dépendance Supabase : transforme des lignes brutes en view-model
//  candidate-centric. Testé unitairement.
// ─────────────────────────────────────────────────────────────────────────────

import { isOfferPracticeSlug, type OfferPracticeSlug } from "@/lib/config/practices"
import { RECRUITMENT_TERMINAL_STATUSES } from "@/lib/recruitment/recruitment-stages"
import {
  getCandidateLifecycleLabel,
  isCandidateLifecycleStatus,
  isTerminalCandidateLifecycle,
} from "@/lib/recruitment/candidate-lifecycle"
import type {
  BuildConsultantsCandidatesInput,
  CandidateAvailabilityBucket,
  CandidatePipelineState,
  CandidatePracticeKey,
  ConsultantsCandidateRow,
  ConsultantsCandidatesViewModel,
  RawCandidateHiringProcessRow,
} from "./consultants-candidates.types"

const ACTIVE_PROCESS_STATUS = "active"
const IN_PROCESS_LIFECYCLE_STATUS = "en_process"
const TERMINAL_OPPORTUNITY_STAGES = new Set(["gagne", "perdu", "abandonne"])

function isoYear(iso: string | null): number | null {
  if (typeof iso !== "string" || iso.length < 4) return null
  const year = Number(iso.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

/** `YYYY-MM-DD…` → ms UTC minuit, ou `null`. */
function isoDateToUtcMidnight(iso: string | null): number | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function resolveAvailabilityBucket(
  availableFrom: string | null,
  referenceMidnight: number,
): CandidateAvailabilityBucket {
  const from = isoDateToUtcMidnight(availableFrom)
  if (from === null) return "unknown"
  return from <= referenceMidnight ? "immediate" : "scheduled"
}

/** Process actif prioritaire, sinon le plus récent par `started_at`. */
function pickLatestProcess(
  processes: RawCandidateHiringProcessRow[],
): RawCandidateHiringProcessRow | null {
  if (processes.length === 0) return null
  const active = processes.find((p) => p.status === ACTIVE_PROCESS_STATUS)
  if (active) return active
  return [...processes].sort(
    (a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""),
  )[0]
}

export function buildConsultantsCandidates(
  input: BuildConsultantsCandidatesInput,
): ConsultantsCandidatesViewModel {
  const {
    referenceDate,
    candidates,
    hiringProcesses,
    prequalificationMilestones,
    positionings,
    jobProfiles,
    offerPractices,
  } = input

  const referenceYear = referenceDate.getUTCFullYear()
  const referenceMidnight = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  )

  // ── Référentiels ──────────────────────────────────────────────────────────
  const offerPracticeSlugById = new Map<string, string>(
    offerPractices.map((op) => [op.id, op.slug]),
  )
  const offerPracticeNameBySlug = new Map<string, string>(
    offerPractices.map((op) => [op.slug, op.name]),
  )
  const jobProfilePracticeById = new Map<string, string | null>(
    jobProfiles.map((jp) => [jp.id, jp.practice_id]),
  )

  function resolvePracticeKey(
    practiceId: string | null,
    jobProfileId: string | null,
  ): CandidatePracticeKey {
    const direct = practiceId ? offerPracticeSlugById.get(practiceId) : undefined
    if (direct && isOfferPracticeSlug(direct)) return direct as OfferPracticeSlug
    if (jobProfileId) {
      const viaProfile = jobProfilePracticeById.get(jobProfileId)
      const slug = viaProfile ? offerPracticeSlugById.get(viaProfile) : undefined
      if (slug && isOfferPracticeSlug(slug)) return slug as OfferPracticeSlug
    }
    return null
  }

  // ── Index par candidat ───────────────────────────────────────────────────
  const processesByCandidate = new Map<string, RawCandidateHiringProcessRow[]>()
  for (const process of hiringProcesses) {
    if (!process.candidate_id) continue
    const list = processesByCandidate.get(process.candidate_id) ?? []
    list.push(process)
    processesByCandidate.set(process.candidate_id, list)
  }

  // Le loader ne passe que des jalons `step='prequalification'` / `result='valide'`
  // (filtre SQL) : ici on ne teste plus que l'année civile de `completed_at` (DATA-4).
  const qualifiedCandidateIds = new Set<string>()
  for (const milestone of prequalificationMilestones) {
    if (!milestone.candidate_id) continue
    if (isoYear(milestone.completed_at) === referenceYear) {
      qualifiedCandidateIds.add(milestone.candidate_id)
    }
  }

  type ActivePositioning = { updatedAt: string | null; nextAction: string | null }
  const activePositioningsByCandidate = new Map<string, ActivePositioning[]>()
  for (const positioning of positionings) {
    if (!positioning.candidate_id) continue
    if (positioning.status && RECRUITMENT_TERMINAL_STATUSES.has(positioning.status)) continue
    if (
      positioning.opportunity_stage &&
      TERMINAL_OPPORTUNITY_STAGES.has(positioning.opportunity_stage)
    ) {
      continue
    }
    const list = activePositioningsByCandidate.get(positioning.candidate_id) ?? []
    list.push({ updatedAt: positioning.updated_at, nextAction: positioning.next_action })
    activePositioningsByCandidate.set(positioning.candidate_id, list)
  }

  const candidateIdsWithAnyPositioning = new Set(
    positionings.map((p) => p.candidate_id).filter((v): v is string => Boolean(v)),
  )

  // ── Lignes ───────────────────────────────────────────────────────────────
  const rows: ConsultantsCandidateRow[] = candidates.map((candidate) => {
    const candidateProcesses = processesByCandidate.get(candidate.id) ?? []
    const latestProcess = pickLatestProcess(candidateProcesses)
    const hasActiveHiringProcess = candidateProcesses.some(
      (p) => p.status === ACTIVE_PROCESS_STATUS,
    )

    const activePositionings = activePositioningsByCandidate.get(candidate.id) ?? []
    const hasActivePositioning = activePositionings.length > 0
    const nextAction =
      [...activePositionings]
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
        .map((p) => p.nextAction)
        .find((value) => typeof value === "string" && value.trim().length > 0) ?? null

    const rawStatus = candidate.status
    const lifecycleStatus = isCandidateLifecycleStatus(rawStatus) ? rawStatus : null
    const isTerminal = isTerminalCandidateLifecycle(rawStatus)

    let pipelineState: CandidatePipelineState
    if (isTerminal) {
      pipelineState = "closed"
    } else if (
      hasActiveHiringProcess ||
      rawStatus === IN_PROCESS_LIFECYCLE_STATUS ||
      hasActivePositioning
    ) {
      pipelineState = "in_process"
    } else {
      pipelineState = "pool"
    }

    const practiceKey = resolvePracticeKey(candidate.practice_id, candidate.job_profile_id)
    const availabilityLabel = candidate.availability?.trim() || null

    return {
      candidateId: candidate.id,
      personId: candidate.person_id,
      fullName: candidate.full_name?.trim() || "Candidat non renseigné",
      currentTitle: candidate.current_title?.trim() || null,
      seniority: candidate.seniority?.trim() || null,
      location: candidate.location?.trim() || null,
      source: candidate.source,
      summary: candidate.summary?.trim() || null,

      practiceKey,
      practiceLabel: practiceKey ? offerPracticeNameBySlug.get(practiceKey) ?? null : null,

      lifecycleStatus,
      lifecycleStatusRaw: rawStatus,
      lifecycleLabel: getCandidateLifecycleLabel(rawStatus),
      isTerminalLifecycle: isTerminal,
      pipelineState,

      qualifiedThisYear: qualifiedCandidateIds.has(candidate.id),

      availabilityLabel,
      availableFrom: candidate.available_from,
      noticePeriodDays: candidate.notice_period_days,
      availabilityBucket: resolveAvailabilityBucket(candidate.available_from, referenceMidnight),

      expectedSalary: candidate.expected_salary,
      expectedDailyRate: candidate.expected_daily_rate,

      hasActiveHiringProcess,
      latestHiringProcess: latestProcess
        ? {
            processId: latestProcess.id,
            status: latestProcess.status,
            currentStep: latestProcess.current_step,
            startedAt: latestProcess.started_at,
          }
        : null,

      hasActivePositioning,
      activePositioningCount: activePositionings.length,
      nextAction,
    }
  })

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))

  // ── Compteurs ────────────────────────────────────────────────────────────
  const counts = {
    total: rows.length,
    pool: rows.filter((r) => r.pipelineState === "pool").length,
    inProcess: rows.filter((r) => r.pipelineState === "in_process").length,
    closed: rows.filter((r) => r.pipelineState === "closed").length,
    qualifiedThisYear: rows.filter((r) => r.qualifiedThisYear).length,
    withoutPositioning: rows.filter((r) => !candidateIdsWithAnyPositioning.has(r.candidateId))
      .length,
  }

  // ── Réserves méthodo ─────────────────────────────────────────────────────
  const dataNotes: string[] = [
    "Le view-model liste tous les candidats du workspace ; le filtrage par état de pipeline (pool / in_process / closed) se fait à l'affichage (Lot 8).",
    `Qualification ${referenceYear} = jalon « prequalification / valide » daté dans l'année civile (« completed_at ») — jamais « candidates.created_at ».`,
    "« Prochaine action » n'est renseignée que pour les candidats avec un positionnement commercial actif (PRODUCT-2, option a).",
  ]
  const withoutQualification = counts.total - counts.qualifiedThisYear
  if (withoutQualification > 0) {
    dataNotes.push(
      `${withoutQualification} candidat(s) sans jalon de préqualification daté cette année : backfill/fallback = dette CAND-1 (sous-lot 7.x).`,
    )
  }
  const withoutPractice = rows.filter((r) => r.practiceKey === null).length
  if (withoutPractice > 0) {
    dataNotes.push(`${withoutPractice} candidat(s) sans practice de rattachement.`)
  }

  return {
    generatedAt: referenceDate.toISOString(),
    referenceYear,
    rows,
    counts,
    dataNotes,
  }
}
