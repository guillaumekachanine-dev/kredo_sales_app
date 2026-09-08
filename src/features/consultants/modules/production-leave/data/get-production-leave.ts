import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { getJobProfilesCatalog } from "@/lib/reference-data/get-job-profiles-catalog"
import { buildProductionLeave } from "./build-production-leave"
import type {
  ProductionLeaveViewModel,
  RawAbsence,
  RawActiveCollaborator,
  RawActivitySummary,
  RawCompensation,
  RawYtdActivity,
} from "./production-leave.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Production & Congés — Loader Supabase (Lot 11)
//
//  Lecture serveur uniquement, RLS de l'utilisateur courant.
//  La rémunération (`collaborator_compensation`) est restreinte owner/admin :
//  un utilisateur non habilité reçoit 0 ligne et le view-model porte alors
//  des coûts et marges à null, avec note explicative (C-30 / DATA-7).
// ─────────────────────────────────────────────────────────────────────────────

type Relation<T> = T | T[] | null

function pickOne<T>(value: Relation<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getProductionLeave(
  referenceMonth?: string | null,
): Promise<ProductionLeaveViewModel> {
  const supabase = await createClient()
  const workspaceId = await resolveCurrentWorkspaceId()

  if (!workspaceId) {
    throw new Error("Workspace introuvable")
  }

  // Calcul d'une fenêtre de 12 mois pour borner les requêtes
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() + 1
  const startWindowDate = new Date(Date.UTC(currentYear - 1, currentMonth - 1, 1))
  const startWindowIso = startWindowDate.toISOString().slice(0, 10)

  const [
    offerPractices,
    jobProfiles,
    collaboratorsRes,
    activitySummariesRes,
    ytdActivitiesRes,
    absencesRes,
    compensationsRes,
  ] = await Promise.all([
    getOfferPracticesCatalog(workspaceId),
    getJobProfilesCatalog(workspaceId),
    supabase
      .from("collaborators")
      .select("id, status, current_title, practice, job_profile_id, person_id, person:persons ( full_name )")
      .neq("status", "sorti"),
    supabase
      .from("v_collaborator_activity_summary")
      .select(`
        collaborator_id,
        period_start,
        business_days,
        billable_days,
        pto_days,
        sick_days,
        non_billable_days,
        activity_rate_percent,
        cra_status,
        tjm_snapshot,
        cjm_snapshot,
        revenue,
        employer_cost,
        real_margin,
        gross_annual
      `)
      .gte("period_start", startWindowIso)
      .order("period_start", { ascending: true }),
    supabase
      .from("v_collaborator_ytd_activity")
      .select("collaborator_id, year, ytd_activity_rate, taci_target, gap_vs_target"),
    supabase
      .from("collaborator_absences")
      .select("id, collaborator_id, absence_type, start_date, end_date, duration_days, notes")
      .gte("end_date", startWindowIso)
      .order("start_date", { ascending: true }),
    supabase
      .from("collaborator_compensation")
      .select("collaborator_id, gross_annual, charges_rate, working_days_per_year, taci, cjm, variable_pay")
      .is("effective_to", null),
  ])

  type CollabRow = {
    id: string
    status: string | null
    current_title: string | null
    practice: string | null
    job_profile_id: string | null
    person_id: string | null
    person: Relation<{ full_name: string | null }>
  }

  const rawCollaborators: RawActiveCollaborator[] = (
    (collaboratorsRes.data ?? []) as unknown as CollabRow[]
  ).map((c) => ({
    id: c.id,
    status: c.status,
    current_title: c.current_title,
    practice: c.practice,
    job_profile_id: c.job_profile_id,
    person_id: c.person_id ?? "",
    full_name: pickOne(c.person)?.full_name?.trim() || "Collaborateur inconnu",
  }))

  const rawSummaries = (activitySummariesRes.data ?? []) as unknown as RawActivitySummary[]
  const rawYtd = (ytdActivitiesRes.data ?? []) as unknown as RawYtdActivity[]
  const rawAbsences = (absencesRes.data ?? []) as unknown as RawAbsence[]
  const rawCompensations = (compensationsRes.data ?? []) as unknown as RawCompensation[]

  // Confidentialité RLS : accessible si la requête retourne au moins une ligne
  const compensationReadable = rawCompensations.length > 0

  return buildProductionLeave({
    referenceMonth,
    collaborators: rawCollaborators,
    activitySummaries: rawSummaries,
    ytdActivities: rawYtd,
    absences: rawAbsences,
    compensations: rawCompensations,
    offerPractices: offerPractices.map((op) => ({
      id: op.id,
      slug: op.slug,
      name: op.name,
    })),
    jobProfiles: jobProfiles.map((jp) => ({
      id: jp.id,
      practice_id: jp.practice_id,
    })),
    compensationReadable,
  })
}
