"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import type { CandidateProfileFormValues } from "@/types/candidate-profile-form"

type CandidateProfileRpcClient = {
  rpc: (
    name: "save_candidate_reference_profile",
    args: {
      p_candidate_id: string
      p_person: Json
      p_candidate: Json
      p_skills: Json
    },
  ) => Promise<{
    data: string | null
    error: { message: string } | null
  }>
}

function text(value: string) {
  return value.trim() || null
}

function finiteNumber(value: number | null) {
  return value !== null && Number.isFinite(value) ? value : null
}

export async function updateCandidateProfile(
  candidateId: string,
  input: CandidateProfileFormValues,
) {
  if (!candidateId) {
    return { error: "Le candidat à modifier est obligatoire." }
  }

  if (!input.first_name.trim() || !input.last_name.trim()) {
    return { error: "Le prénom et le nom sont obligatoires." }
  }

  const invalidNewSkill = input.skills.find(
    (skill) => !skill.skill_id && (!skill.name.trim() || !skill.category),
  )

  if (invalidNewSkill) {
    return {
      error: "Toute nouvelle compétence doit avoir un nom et une catégorie.",
    }
  }

  const rankedSkills = input.skills.filter(
    (skill) => skill.profile_rank !== null,
  )
  const ranks = rankedSkills.map((skill) => skill.profile_rank)

  if (new Set(ranks).size !== ranks.length) {
    return { error: "Chaque rang du top 3 ne peut être attribué qu’une fois." }
  }

  const supabase = await createClient()
  const rpcClient = supabase as unknown as CandidateProfileRpcClient

  const personPayload: Json = {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    primary_email: text(input.primary_email),
    phone: text(input.phone),
    linkedin_url: text(input.linkedin_url),
    location: text(input.location),
    notes: text(input.person_notes),
  }

  const candidatePayload: Json = {
    status: input.status,
    current_title: text(input.current_title),
    seniority: text(input.seniority),
    source: text(input.source),
    practice_id: text(input.practice_id),
    experience_years: finiteNumber(input.experience_years),
    highest_degree_level: text(input.highest_degree_level),
    sector_context: text(input.sector_context),
    last_mission_title: text(input.last_mission_title),
    last_mission_contribution: text(input.last_mission_contribution),
    search_reason: text(input.search_reason),
    expected_daily_rate: finiteNumber(input.expected_daily_rate),
    expected_salary: finiteNumber(input.expected_salary),
    last_salary: finiteNumber(input.last_salary),
    available_from: text(input.available_from),
    notice_period_days: finiteNumber(input.notice_period_days),
    availability_notes: text(input.availability_notes),
    mobility: text(input.mobility),
    has_vehicle: input.has_vehicle,
    desired_workload_pct: finiteNumber(input.desired_workload_pct),
    max_commute_minutes: finiteNumber(input.max_commute_minutes),
    remote_preference: text(input.remote_preference),
    remote_days_per_week: finiteNumber(input.remote_days_per_week),
    active_offer_status: text(input.active_offer_status) ?? "none",
    active_offer_deadline: text(input.active_offer_deadline),
    active_offer_notes: text(input.active_offer_notes),
    constraints_notes: text(input.constraints_notes),
    notes: text(input.notes),
  }

  const skillsPayload: Json = input.skills.map((skill) => ({
    skill_id: skill.skill_id,
    name: skill.skill_id ? null : skill.name.trim(),
    category: skill.category,
    level: finiteNumber(skill.level),
    years: finiteNumber(skill.years),
    last_used_year: finiteNumber(skill.last_used_year),
    source: skill.source ?? "manuel",
    confidence: finiteNumber(skill.confidence),
    comment: skill.comment?.trim() || null,
    profile_rank: finiteNumber(skill.profile_rank),
  }))

  const { data, error } = await rpcClient.rpc(
    "save_candidate_reference_profile",
    {
      p_candidate_id: candidateId,
      p_person: personPayload,
      p_candidate: candidatePayload,
      p_skills: skillsPayload,
    },
  )

  if (error || !data) {
    console.error("[recruitment] Failed to update candidate profile:", error)
    return {
      error:
        error?.message ?? "Erreur lors de la mise à jour du dossier candidat.",
    }
  }

  revalidatePath("/recruitment")
  revalidatePath("/missions/opps")

  return { success: true, candidateId: data }
}
