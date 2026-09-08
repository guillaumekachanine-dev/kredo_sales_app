import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { getJobProfilesCatalog } from "@/lib/reference-data/get-job-profiles-catalog"
import { buildConsultantsCandidates } from "./build-consultants-candidates"
import type {
  ConsultantsCandidatesViewModel,
  RawCandidateHiringProcessRow,
  RawCandidatePositioningRow,
  RawCandidateRow,
  RawPrequalificationMilestoneRow,
} from "./consultants-candidates.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader unique du chapitre Candidats (Lot 7) — candidate-centric (C-06).
//
//  Part de `candidates` (le vivier complet, y compris sans positionnement), puis
//  enrichit : process de recrutement, jalons de préqualification datés (DATA-4),
//  positionnements commerciaux actifs (PRODUCT-2). Lecture serveur, RLS de
//  l'utilisateur. Toute la logique métier vit dans `buildConsultantsCandidates`.
// ─────────────────────────────────────────────────────────────────────────────

type Relation<T> = T | T[] | null

function pickOne<T>(value: Relation<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getConsultantsCandidates(
  referenceDate: Date = new Date(),
): Promise<ConsultantsCandidatesViewModel> {
  const supabase = await createClient()
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) {
    throw new Error("Workspace introuvable")
  }

  const [
    offerPractices,
    jobProfiles,
    candidatesRes,
    processesRes,
    milestonesRes,
    positioningsRes,
  ] = await Promise.all([
    getOfferPracticesCatalog(workspaceId),
    getJobProfilesCatalog(workspaceId),
    supabase
      .from("candidates")
      .select(`
        id,
        person_id,
        status,
        seniority,
        current_title,
        practice_id,
        job_profile_id,
        availability,
        available_from,
        notice_period_days,
        expected_salary,
        expected_daily_rate,
        source,
        summary,
        person:persons ( full_name, location )
      `),
    supabase
      .from("candidate_hiring_processes")
      .select("id, candidate_id, status, current_step, started_at, closed_at"),
    supabase
      .from("candidate_hiring_milestones")
      .select("completed_at, step, result, hiring_process:candidate_hiring_processes ( candidate_id )")
      .eq("step", "prequalification")
      .eq("result", "valide"),
    supabase
      .from("opportunity_candidates")
      .select(
        "candidate_id, status, updated_at, next_action, opportunity:opportunities ( stage )",
      ),
  ])

  type CandidateRelationRow = Omit<RawCandidateRow, "full_name" | "location"> & {
    person: Relation<{ full_name: string | null; location: string | null }>
  }
  type MilestoneRelationRow = {
    completed_at: string | null
    hiring_process: Relation<{ candidate_id: string | null }>
  }
  type PositioningRelationRow = {
    candidate_id: string | null
    status: string | null
    updated_at: string | null
    next_action: string | null
    opportunity: Relation<{ stage: string | null }>
  }

  const candidates: RawCandidateRow[] = (
    (candidatesRes.data ?? []) as unknown as CandidateRelationRow[]
  ).map((row) => {
    const person = pickOne(row.person)
    return {
      id: row.id,
      person_id: row.person_id,
      status: row.status,
      seniority: row.seniority,
      current_title: row.current_title,
      practice_id: row.practice_id,
      job_profile_id: row.job_profile_id,
      availability: row.availability,
      available_from: row.available_from,
      notice_period_days: row.notice_period_days,
      expected_salary: row.expected_salary,
      expected_daily_rate: row.expected_daily_rate,
      source: row.source,
      summary: row.summary,
      full_name: person?.full_name ?? null,
      location: person?.location ?? null,
    }
  })

  const hiringProcesses = (processesRes.data ?? []) as RawCandidateHiringProcessRow[]

  const prequalificationMilestones: RawPrequalificationMilestoneRow[] = (
    (milestonesRes.data ?? []) as unknown as MilestoneRelationRow[]
  ).map((row) => ({
    candidate_id: pickOne(row.hiring_process)?.candidate_id ?? null,
    completed_at: row.completed_at,
  }))

  const positionings: RawCandidatePositioningRow[] = (
    (positioningsRes.data ?? []) as unknown as PositioningRelationRow[]
  ).map((row) => ({
    candidate_id: row.candidate_id,
    status: row.status,
    updated_at: row.updated_at,
    next_action: row.next_action,
    opportunity_stage: pickOne(row.opportunity)?.stage ?? null,
  }))

  return buildConsultantsCandidates({
    referenceDate,
    candidates,
    hiringProcesses,
    prequalificationMilestones,
    positionings,
    jobProfiles: jobProfiles.map((jp) => ({ id: jp.id, practice_id: jp.practice_id })),
    offerPractices: offerPractices.map((op) => ({
      id: op.id,
      slug: op.slug,
      name: op.name,
      sort_order: op.sort_order,
    })),
  })
}
