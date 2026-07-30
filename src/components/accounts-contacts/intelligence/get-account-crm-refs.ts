"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"

export type EntityRefOption = {
  id: string
  label: string
  meta?: string
}

export type EntityRefOptionsResult = {
  options: EntityRefOption[]
  error: string | null
}

async function requireAuthenticatedClient(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>> | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { supabase: null, error: "Non authentifié" }
  }
  return { supabase, error: null }
}

// Lot 7 — entité pivot "opportunité" du formulaire dynamique (command §2) :
// liste légère, pas de refonte de get-opportunities-list.ts (hors périmètre).
export async function getAccountOpportunities(companyId: string): Promise<EntityRefOptionsResult> {
  const { supabase, error } = await requireAuthenticatedClient()
  if (!supabase) return { options: [], error }

  const { data, error: queryError } = await supabase
    .from("opportunities")
    .select("id, title, stage")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(25)

  if (queryError) return { options: [], error: queryError.message }

  return {
    options: (data ?? []).map((row) => ({
      id: row.id,
      label: row.title,
      meta: row.stage ?? undefined,
    })),
    error: null,
  }
}

// Lot 7 — entité pivot "mission" (command §2, Delivery).
export async function getAccountMissions(companyId: string): Promise<EntityRefOptionsResult> {
  const { supabase, error } = await requireAuthenticatedClient()
  if (!supabase) return { options: [], error }

  const { data, error: queryError } = await supabase
    .from("missions")
    .select("id, title, status")
    .eq("company_id", companyId)
    .order("start_date", { ascending: false })
    .limit(25)

  if (queryError) return { options: [], error: queryError.message }

  return {
    options: (data ?? []).map((row) => ({
      id: row.id,
      label: row.title,
      meta: row.status ?? undefined,
    })),
    error: null,
  }
}

type CandidateRow = {
  id: string
  status: string | null
  current_title: string | null
  persons: { full_name: string | null } | { full_name: string | null }[] | null
}

function candidateLabel(row: CandidateRow): string {
  const person = Array.isArray(row.persons) ? row.persons[0] : row.persons
  return person?.full_name || row.current_title || "Candidat sans nom"
}

// Lot 7 — entité pivot "candidat ou consultant présenté" (command §2/§3).
// Positionnements réels sur les opportunités du compte en priorité (candidat
// déjà lié à ce client) ; à défaut, vivier récent du workspace — jamais un
// candidat inventé.
export async function getAccountCandidates(companyId: string): Promise<EntityRefOptionsResult> {
  const { supabase, error } = await requireAuthenticatedClient()
  if (!supabase) return { options: [], error }

  const { data: positioned, error: positionedError } = await supabase
    .from("opportunity_candidates")
    .select("candidate_id, candidates(id, status, current_title, persons(full_name)), opportunities!inner(company_id)")
    .eq("opportunities.company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(25)

  if (positionedError) return { options: [], error: positionedError.message }

  const positionedCandidates = (positioned ?? [])
    .map((row) => (Array.isArray(row.candidates) ? row.candidates[0] : row.candidates))
    .filter((candidate): candidate is CandidateRow => Boolean(candidate))

  if (positionedCandidates.length > 0) {
    return {
      options: positionedCandidates.map((row) => ({
        id: row.id,
        label: candidateLabel(row),
        meta: row.status ?? undefined,
      })),
      error: null,
    }
  }

  const { data: pool, error: poolError } = await supabase
    .from("candidates")
    .select("id, status, current_title, persons(full_name)")
    .order("created_at", { ascending: false })
    .limit(25)

  if (poolError) return { options: [], error: poolError.message }

  return {
    options: ((pool ?? []) as CandidateRow[]).map((row) => ({
      id: row.id,
      label: candidateLabel(row),
      meta: row.status ?? undefined,
    })),
    error: null,
  }
}
