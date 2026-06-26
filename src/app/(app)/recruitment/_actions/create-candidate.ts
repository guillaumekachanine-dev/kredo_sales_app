"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

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
  availability?: string
  expected_daily_rate?: number
  expected_salary?: number
  notes?: string
}

export async function createCandidate(input: CreateCandidateInput) {
  const supabase = await createClient()

  const { data: person, error: personError } = await supabase
    .from("persons")
    .insert({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      primary_email: input.primary_email?.trim() || null,
      phone: input.phone?.trim() || null,
      linkedin_url: input.linkedin_url?.trim() || null,
      location: input.location?.trim() || null,
    })
    .select("id")
    .single()

  if (personError || !person) {
    console.error("[recruitment] Failed to create person:", personError)
    return { error: personError?.message ?? "Erreur lors de la création du contact." }
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      person_id: person.id,
      status: "nouveau",
      current_title: input.current_title?.trim() || null,
      seniority: input.seniority || null,
      source: input.source || null,
      availability: input.availability?.trim() || null,
      expected_daily_rate: input.expected_daily_rate ?? null,
      expected_salary: input.expected_salary ?? null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single()

  if (candidateError || !candidate) {
    console.error("[recruitment] Failed to create candidate:", candidateError)
    return { error: candidateError?.message ?? "Erreur lors de la création du candidat." }
  }

  revalidatePath("/recruitment")

  return { success: true, candidateId: candidate.id }
}
