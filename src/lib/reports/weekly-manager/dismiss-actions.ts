"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"

export type DismissWeeklyBriefItemInput = {
  itemSourceType: string
  itemSourceId: string
  weekIso: string
}

// Écrit dans weekly_brief_dismissals (Lot 0) — signal d'apprentissage v1
// consommé par fetchDismissCounts (get-weekly-manager-brief.ts) : un item
// ignoré 3 semaines ISO distinctes de suite est déclassé par le scoring
// déterministe weekly-scoring-v1 (voir scoring.ts).
export async function dismissWeeklyBriefItem(
  input: DismissWeeklyBriefItemInput
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: "Non authentifié" }

  const { error } = await supabase.from("weekly_brief_dismissals").insert({
    owner_id: user.id,
    item_source_type: input.itemSourceType,
    item_source_id: input.itemSourceId,
    week_iso: input.weekIso,
  })

  // 23505 = violation de la contrainte UNIQUE(workspace_id, owner_id,
  // item_source_type, item_source_id, week_iso) — l'item est déjà dismiss
  // cette semaine, ce n'est pas une erreur à afficher à l'utilisateur.
  if (error && error.code !== "23505") return { error: error.message }
  return { error: null }
}
