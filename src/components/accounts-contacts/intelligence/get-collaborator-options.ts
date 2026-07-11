"use server"

import { createClient } from "@/lib/supabase/server"

export type CollaboratorOption = {
  id: string
  displayName: string
  currentTitle: string | null
  practice: string | null
  seniority: string | null
  status: string | null
  availability: string | null
}

export type CollaboratorOptionsResult = {
  options: CollaboratorOption[]
  error: string | null
}

type CollaboratorRow = {
  id: string
  current_title: string | null
  practice: string | null
  seniority: string | null
  status: string | null
  availability: string | null
  persons: { full_name: string | null } | { full_name: string | null }[] | null
}

// Lot 8 — sélecteur de consultant (command §1) : identité/titre/practice/
// séniorité/statut/disponibilité, limité au workspace courant via RLS
// standard (session utilisateur, pas de service_role — simple liste de
// pilotage, aucune donnée confidentielle de rémunération exposée ici).
export async function getWorkspaceCollaborators(): Promise<CollaboratorOptionsResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { options: [], error: "Non authentifié" }
  }

  const { data, error } = await supabase
    .from("collaborators")
    .select("id, current_title, practice, seniority, status, availability, persons(full_name)")
    .order("created_at", { ascending: true })
    .limit(200)

  if (error) return { options: [], error: error.message }

  return {
    options: ((data ?? []) as CollaboratorRow[]).map((row) => {
      const person = Array.isArray(row.persons) ? row.persons[0] : row.persons
      return {
        id: row.id,
        displayName: person?.full_name || "Collaborateur sans nom",
        currentTitle: row.current_title,
        practice: row.practice,
        seniority: row.seniority,
        status: row.status,
        availability: row.availability,
      }
    }),
    error: null,
  }
}
