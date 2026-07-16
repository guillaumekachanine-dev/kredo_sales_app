"use server"

import { createClient } from "@/lib/supabase/server"

export type PlaybookSector = {
  slug: string
  name: string
}

export type PlaybookSectorsResult = {
  sectors: PlaybookSector[]
  error: string | null
}

// Alimente le sélecteur "Consulter un playbook" du FAB Intelligence (mobile).
//
// Ne renvoie QUE les secteurs dont l'étude a réellement été produite (status 'active').
// Les autres lignes de sector_intelligence sont des conteneurs de rattachement de comptes :
// leur playbook est un squelette vide, et /ressources/playbook/[slug] y afficherait un
// pitch générique reconstruit à partir de valeurs par défaut — pire qu'une absence.
//
// Remplace une liste codée en dur qui proposait six secteurs, dont trois n'existaient
// pas en base (le clic menait à une page vide).
export async function getPlaybookSectors(): Promise<PlaybookSectorsResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { sectors: [], error: "Non authentifié" }
  }

  // RLS workspace-scopée sur sector_intelligence : pas de filtre workspace explicite ici.
  const { data, error } = await supabase
    .from("sector_intelligence")
    .select("slug, name")
    .eq("status", "active")
    .order("attractiveness_score", { ascending: false, nullsFirst: false })

  if (error) {
    console.error("Error fetching playbook sectors:", error)
    return { sectors: [], error: "Chargement des playbooks indisponible" }
  }

  return {
    sectors: (data ?? []).map((sector) => ({ slug: sector.slug, name: sector.name })),
    error: null,
  }
}
