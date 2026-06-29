"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

export interface CreateCandidateInput {
  first_name: string
  last_name: string
  primary_email?: string
  phone?: string
  linkedin_url?: string
  location?: string
  current_title?: string
  seniority?: string
  source?: string
  practice_id?: string
  experience_years?: number
  highest_degree_level?: string
  sector_context?: string
  last_mission_title?: string
  last_mission_contribution?: string
  search_reason?: string
  expected_daily_rate?: number
  expected_salary?: number
  last_salary?: number
  available_from?: string
  notice_period_days?: number
  availability_notes?: string
  mobility?: string
  has_vehicle?: boolean | null
  desired_workload_pct?: number
  max_commute_minutes?: number
  remote_preference?: string
  remote_days_per_week?: number
  active_offer_status?: string
  active_offer_deadline?: string
  active_offer_notes?: string
  constraints_notes?: string
  notes?: string
}

type CandidateProfileRpcClient = {
  rpc: (
    name: "upsert_candidate_reference_profile",
    args: {
      p_candidate_id: null
      p_person: Json
      p_candidate: Json
      p_profile_skills: null
    },
  ) => Promise<{
    data: string | null
    error: { message: string } | null
  }>
}

function text(value: string | undefined) {
  return value?.trim() || null
}

export async function createCandidate(input: CreateCandidateInput) {
  if (!input.first_name.trim() || !input.last_name.trim()) {
    return { error: "Le prénom et le nom sont obligatoires." }
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
  }

  const candidatePayload: Json = {
    status: "nouveau",
    current_title: text(input.current_title),
    seniority: text(input.seniority),
    source: text(input.source),
    practice_id: text(input.practice_id),
    experience_years: input.experience_years ?? null,
    highest_degree_level: text(input.highest_degree_level),
    sector_context: text(input.sector_context),
    last_mission_title: text(input.last_mission_title),
    last_mission_contribution: text(input.last_mission_contribution),
    search_reason: text(input.search_reason),
    expected_daily_rate: input.expected_daily_rate ?? null,
    expected_salary: input.expected_salary ?? null,
    last_salary: input.last_salary ?? null,
    available_from: text(input.available_from),
    notice_period_days: input.notice_period_days ?? null,
    availability_notes: text(input.availability_notes),
    mobility: text(input.mobility),
    has_vehicle: input.has_vehicle ?? null,
    desired_workload_pct: input.desired_workload_pct ?? null,
    max_commute_minutes: input.max_commute_minutes ?? null,
    remote_preference: text(input.remote_preference),
    remote_days_per_week: input.remote_days_per_week ?? null,
    active_offer_status: text(input.active_offer_status) ?? "none",
    active_offer_deadline: text(input.active_offer_deadline),
    active_offer_notes: text(input.active_offer_notes),
    constraints_notes: text(input.constraints_notes),
    notes: text(input.notes),
  }

  const { data: candidateId, error } = await rpcClient.rpc(
    "upsert_candidate_reference_profile",
    {
      p_candidate_id: null,
      p_person: personPayload,
      p_candidate: candidatePayload,
      p_profile_skills: null,
    },
  )

  if (error || !candidateId) {
    console.error("[recruitment] Failed to create candidate profile:", error)
    return {
      error:
        error?.message ??
        "Erreur lors de la création transactionnelle du candidat.",
    }
  }

  revalidatePath("/recruitment")
  revalidatePath("/missions/opps")

  return { success: true, candidateId }
}
