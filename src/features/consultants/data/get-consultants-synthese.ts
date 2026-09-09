import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId, resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { getJobProfilesCatalog } from "@/lib/reference-data/get-job-profiles-catalog"
import { buildConsultantsSynthese } from "./build-consultants-synthese"
import type {
  ConsultantsSyntheseViewModel,
  RawCandidate,
  RawCollaborator,
  RawCompensation,
  RawHiringProcess,
  RawMission,
  RawPositioning,
} from "./consultants-synthese.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader unique de la Synthèse Consultants (Lot 2).
//
//  Lecture serveur uniquement, RLS de l'utilisateur courant. La rémunération
//  (`collaborator_compensation`) est en RLS confidentielle owner/admin — un
//  rôle non habilité reçoit 0 ligne, le view-model porte alors
//  `compensationVisible: false` (DATA-7).
//
//  Toute la logique métier vit dans `buildConsultantsSynthese` (pur, testé).
// ─────────────────────────────────────────────────────────────────────────────

type Relation<T> = T | T[] | null

function pickOne<T>(value: Relation<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getConsultantsSynthese(
  referenceDate: Date = new Date(),
): Promise<ConsultantsSyntheseViewModel> {
  const supabase = await createClient()
  const [workspaceId, userId] = await Promise.all([
    resolveCurrentWorkspaceId(),
    getCurrentUserId(),
  ])
  if (!workspaceId) {
    throw new Error("Workspace introuvable")
  }

  const [
    offerPractices,
    jobProfiles,
    collaboratorsRes,
    missionsRes,
    candidatesRes,
    compensationsRes,
    hiringRes,
    positioningsRes,
    profileRes,
  ] = await Promise.all([
    getOfferPracticesCatalog(workspaceId),
    getJobProfilesCatalog(workspaceId),
    supabase
      .from("collaborators")
      .select("id, status, current_title, practice, job_profile_id, person_id, person:persons ( full_name )"),
    supabase
      .from("missions")
      .select("id, title, status, end_date, collaborator_id, company:companies ( name )"),
    supabase.from("candidates").select("id, status, practice_id, person_id"),
    supabase
      .from("collaborator_compensation")
      .select("collaborator_id, gross_annual, cjm")
      .is("effective_to", null),
    supabase
      .from("candidate_hiring_processes")
      .select("id, status, current_step, closed_at, candidate_id, job_profile_id"),
    supabase
      .from("opportunity_candidates")
      .select("status, candidate:candidates ( person_id ), opportunity:opportunities ( stage )"),
    userId
      ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  type CollaboratorRow = {
    id: string
    status: string | null
    current_title: string | null
    practice: string | null
    job_profile_id: string | null
    person_id: string | null
    person: Relation<{ full_name: string | null }>
  }
  type MissionRow = {
    id: string
    title: string | null
    status: string | null
    end_date: string | null
    collaborator_id: string | null
    company: Relation<{ name: string | null }>
  }
  type PositioningRow = {
    status: string | null
    candidate: Relation<{ person_id: string | null }>
    opportunity: Relation<{ stage: string | null }>
  }

  const collaboratorRows = (collaboratorsRes.data ?? []) as CollaboratorRow[]
  const missionRows = (missionsRes.data ?? []) as MissionRow[]
  const positioningRows = (positioningsRes.data ?? []) as PositioningRow[]

  const collaborators: RawCollaborator[] = collaboratorRows.map((c) => ({
    id: c.id,
    status: c.status,
    current_title: c.current_title,
    practice: c.practice,
    job_profile_id: c.job_profile_id,
    full_name: pickOne(c.person)?.full_name ?? null,
  }))

  const collaboratorPersonId: Record<string, string | null> = {}
  for (const c of collaboratorRows) {
    collaboratorPersonId[c.id] = c.person_id
  }

  const missions: RawMission[] = missionRows.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    end_date: m.end_date,
    collaborator_id: m.collaborator_id,
    client_name: pickOne(m.company)?.name ?? null,
  }))

  const candidates = (candidatesRes.data ?? []) as RawCandidate[]
  const compensations = (compensationsRes.data ?? []) as RawCompensation[]
  const hiringProcesses = (hiringRes.data ?? []) as RawHiringProcess[]

  const positionings: RawPositioning[] = positioningRows.map((p) => ({
    status: p.status,
    person_id: pickOne(p.candidate)?.person_id ?? null,
    opportunity_stage: pickOne(p.opportunity)?.stage ?? null,
  }))

  const role = (profileRes.data as { role?: string | null } | null)?.role ?? null
  const compensationReadable = role === "owner" || role === "admin"

  return buildConsultantsSynthese({
    referenceDate,
    collaborators,
    collaboratorPersonId,
    missions,
    candidates,
    compensations,
    hiringProcesses,
    positionings,
    jobProfiles: jobProfiles.map((jp) => ({ id: jp.id, practice_id: jp.practice_id })),
    offerPractices: offerPractices.map((op) => ({
      id: op.id,
      slug: op.slug,
      name: op.name,
      color_hex: op.color_hex,
      sort_order: op.sort_order,
    })),
    compensationReadable,
  })
}
