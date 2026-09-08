import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { buildProfileMatching } from "./build-profile-matching"
import type {
  ProfileMatchingViewModel,
  RawMatchingCandidate,
  RawMatchingCollaborator,
  RawMatchingOpportunity,
  RawMatchScoreRow,
} from "./profile-matching.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — Loader Matching Profil (Lot 13)
//  Lecture serveur exclusive, RLS de l'utilisateur.
//  Ne réalise AUCUN calcul de matching : lit exclusivement match_scores existant.
// ─────────────────────────────────────────────────────────────────────────────

type Relation<T> = T | T[] | null

function pickOne<T>(value: Relation<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getProfileMatching(): Promise<ProfileMatchingViewModel> {
  const supabase = await createClient()
  const workspaceId = await resolveCurrentWorkspaceId()

  if (!workspaceId) {
    throw new Error("Workspace introuvable")
  }

  const [
    offerPractices,
    collaboratorsRes,
    candidatesRes,
    opportunitiesRes,
    scoresRes,
  ] = await Promise.all([
    getOfferPracticesCatalog(workspaceId),
    supabase
      .from("collaborators")
      .select(`
        id,
        person_id,
        status,
        current_title,
        seniority,
        practice,
        job_profile_id,
        person:persons (
          id,
          full_name,
          first_name,
          last_name
        )
      `)
      .neq("status", "sorti"),
    supabase
      .from("candidates")
      .select(`
        id,
        person_id,
        status,
        current_title,
        seniority,
        practice_id,
        job_profile_id,
        available_from,
        notice_period_days,
        expected_daily_rate,
        person:persons (
          id,
          full_name,
          first_name,
          last_name
        )
      `),
    supabase
      .from("opportunities")
      .select(`
        id,
        title,
        stage,
        start_date,
        target_daily_rate,
        requires_staffing,
        updated_at,
        company_id,
        companies:companies (
          name
        )
      `),
    supabase
      .from("match_scores")
      .select(`
        id,
        opportunity_id,
        person_id,
        overall_score,
        model_version,
        scores,
        created_at,
        source_run_id
      `),
  ])

  if (collaboratorsRes.error) {
    throw new Error(`Échec chargement collaborateurs : ${collaboratorsRes.error.message}`)
  }
  if (candidatesRes.error) {
    throw new Error(`Échec chargement candidats : ${candidatesRes.error.message}`)
  }
  if (opportunitiesRes.error) {
    throw new Error(`Échec chargement opportunités : ${opportunitiesRes.error.message}`)
  }
  if (scoresRes.error) {
    throw new Error(`Échec chargement scores : ${scoresRes.error.message}`)
  }

  const rawCollaborators: RawMatchingCollaborator[] = (collaboratorsRes.data ?? []).map(
    (c) => ({
      id: c.id,
      person_id: c.person_id,
      status: c.status,
      current_title: c.current_title,
      seniority: c.seniority,
      practice: c.practice,
      job_profile_id: c.job_profile_id,
      person: pickOne(c.person),
    }),
  )

  const rawCandidates: RawMatchingCandidate[] = (candidatesRes.data ?? []).map((cand) => ({
    id: cand.id,
    person_id: cand.person_id,
    status: cand.status,
    current_title: cand.current_title,
    seniority: cand.seniority,
    practice_id: cand.practice_id,
    job_profile_id: cand.job_profile_id,
    available_from: cand.available_from,
    notice_period_days: cand.notice_period_days,
    expected_daily_rate: cand.expected_daily_rate,
    person: pickOne(cand.person),
  }))

  const rawOpportunities: RawMatchingOpportunity[] = (opportunitiesRes.data ?? []).map(
    (opp) => ({
      id: opp.id,
      title: opp.title,
      stage: opp.stage,
      start_date: opp.start_date,
      target_daily_rate: opp.target_daily_rate,
      requires_staffing: opp.requires_staffing,
      updated_at: opp.updated_at,
      company_id: opp.company_id,
      companies: pickOne(opp.companies),
    }),
  )

  const rawScores: RawMatchScoreRow[] = (scoresRes.data ?? []).map((s) => ({
    id: s.id,
    opportunity_id: s.opportunity_id,
    person_id: s.person_id,
    overall_score: s.overall_score,
    model_version: s.model_version,
    scores: s.scores,
    created_at: s.created_at,
    source_run_id: s.source_run_id,
  }))

  return buildProfileMatching({
    collaborators: rawCollaborators,
    candidates: rawCandidates,
    opportunities: rawOpportunities,
    scores: rawScores,
    offerPractices,
  })
}
