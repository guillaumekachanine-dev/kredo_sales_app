"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type StaffingSourceType = "collaborator" | "candidate"

export interface StaffingSearchResult {
  id: string
  person_id: string
  full_name: string
  source_type: StaffingSourceType
  subtitle: string | null
}

export interface CreateOpportunityStaffingInput {
  opportunity_id: string
  source_type: StaffingSourceType
  source_id: string
}

export type StaffingActionResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

interface PersonHit {
  id: string
}

interface CandidateRow {
  id: string
  person_id: string
  seniority: string | null
  availability: string | null
  persons: {
    full_name: string | null
    first_name: string | null
    last_name: string | null
  } | {
    full_name: string | null
    first_name: string | null
    last_name: string | null
  }[] | null
}

interface CollaboratorRow {
  id: string
  person_id: string
  current_title: string | null
  practice: string | null
  persons: {
    full_name: string | null
    first_name: string | null
    last_name: string | null
  } | {
    full_name: string | null
    first_name: string | null
    last_name: string | null
  }[] | null
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function getPersonName(person: {
  full_name: string | null
  first_name: string | null
  last_name: string | null
} | null) {
  if (!person) return ""
  return person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim()
}

export async function getAllCollaboratorsForStaffing(): Promise<StaffingSearchResult[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("collaborators")
      .select("id, person_id, current_title, practice, persons(full_name, first_name, last_name)")
      .order("created_at", { ascending: true })
      .limit(60)

    if (error || !data) return []

    return ((data || []) as CollaboratorRow[]).map((item) => {
      const person = pickOne(item.persons)
      return {
        id: item.id,
        person_id: item.person_id,
        full_name: getPersonName(person),
        source_type: "collaborator" as const,
        subtitle: [item.current_title, item.practice].filter(Boolean).join(" · ") || "Collaborateur",
      }
    })
  } catch (err) {
    console.error("Erreur lors du chargement des collaborateurs:", err)
    return []
  }
}

export async function searchOpportunityStaffingProfiles(query: string, sourceType: StaffingSourceType): Promise<StaffingSearchResult[]> {
  const sanitized = query.trim()
  if (sanitized.length < 1) return []

  try {
    const supabase = await createClient()

    const { data: personHits, error: personsError } = await supabase
      .from("persons")
      .select("id")
      .or(`full_name.ilike.%${sanitized}%,first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%`)
      .limit(25)

    if (personsError) {
      console.error("Erreur lors de la recherche des personnes pour staffing:", personsError)
      return []
    }

    const personIds = (personHits as PersonHit[] | null)?.map((item) => item.id) || []
    if (personIds.length === 0) return []

    if (sourceType === "candidate") {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, person_id, seniority, availability, persons(full_name, first_name, last_name)")
        .in("person_id", personIds)
        .limit(12)

      if (error) {
        console.error("Erreur lors de la recherche des candidats:", error)
        return []
      }

      return ((data || []) as CandidateRow[]).map((item) => {
        const person = pickOne(item.persons)
        return {
          id: item.id,
          person_id: item.person_id,
          full_name: getPersonName(person),
          source_type: "candidate",
          subtitle: [item.seniority, item.availability].filter(Boolean).join(" · ") || "Candidat",
        }
      })
    }

    const { data, error } = await supabase
      .from("collaborators")
      .select("id, person_id, current_title, practice, persons(full_name, first_name, last_name)")
      .in("person_id", personIds)
      .limit(12)

    if (error) {
      console.error("Erreur lors de la recherche des collaborateurs:", error)
      return []
    }

    return ((data || []) as CollaboratorRow[]).map((item) => {
      const person = pickOne(item.persons)
      return {
        id: item.id,
        person_id: item.person_id,
        full_name: getPersonName(person),
        source_type: "collaborator",
        subtitle: [item.current_title, item.practice].filter(Boolean).join(" · ") || "Collaborateur",
      }
    })
  } catch (err) {
    console.error("Erreur inattendue pendant la recherche staffing:", err)
    return []
  }
}

export async function createOpportunityStaffing(input: CreateOpportunityStaffingInput): Promise<StaffingActionResult> {
  if (!input.opportunity_id) return { error: "Opportunité manquante." }
  if (!input.source_id) return { error: "Profil à rattacher manquant." }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  let candidateId = input.source_id

  if (input.source_type === "collaborator") {
    const { data: collaborator, error: collaboratorError } = await supabase
      .from("collaborators")
      .select("person_id, seniority")
      .eq("id", input.source_id)
      .maybeSingle()

    if (collaboratorError) {
      console.error("Erreur lors de la récupération du collaborateur:", collaboratorError)
      return { error: collaboratorError.message }
    }

    if (!collaborator) {
      return { error: "Collaborateur introuvable." }
    }

    const { data: existingCandidate, error: candidateLookupError } = await supabase
      .from("candidates")
      .select("id")
      .eq("person_id", collaborator.person_id)
      .maybeSingle()

    if (candidateLookupError) {
      console.error("Erreur lors de la recherche du candidat lié au collaborateur:", candidateLookupError)
      return { error: candidateLookupError.message }
    }

    if (existingCandidate) {
      candidateId = existingCandidate.id
    } else {
      const { data: createdCandidate, error: createCandidateError } = await supabase
        .from("candidates")
        .insert({
          person_id: collaborator.person_id,
          seniority: collaborator.seniority,
          status: "actif",
          source: "collaborateur",
        })
        .select("id")
        .single()

      if (createCandidateError || !createdCandidate) {
        console.error("Erreur lors de la création du candidat depuis le collaborateur:", createCandidateError)
        return { error: createCandidateError?.message || "Création du candidat impossible." }
      }

      candidateId = createdCandidate.id
    }
  }

  const { data: existingLink, error: existingLinkError } = await supabase
    .from("opportunity_candidates")
    .select("id")
    .eq("opportunity_id", input.opportunity_id)
    .eq("candidate_id", candidateId)
    .maybeSingle()

  if (existingLinkError) {
    console.error("Erreur lors de la vérification du staffing existant:", existingLinkError)
    return { error: existingLinkError.message }
  }

  if (existingLink) {
    return { error: "Ce profil est déjà présent dans le staffing de l'opportunité." }
  }

  const { error } = await supabase
    .from("opportunity_candidates")
    .insert({
      opportunity_id: input.opportunity_id,
      candidate_id: candidateId,
      status: "identifie",
      proposed_at: new Date().toISOString(),
    })

  if (error) {
    console.error("Erreur lors de la création du staffing:", error)
    return { error: error.message }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}
