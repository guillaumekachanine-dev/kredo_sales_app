"use client"

// Lecture directe depuis le navigateur, RLS workspace — même doctrine que
// `watch-analysis-client-queries.ts` : cette requête n'alimente que le sélecteur
// de besoin du Cockpit. Le matching lui-même reste une server action
// (`runOpportunityMatching`) qui rehydrate tout côté serveur.

import { createClient } from "@/lib/supabase/client"
import {
  selectMatchableOpportunities,
  type MatchableOpportunity,
} from "./matchable-opportunities"

export async function fetchMatchableOpportunities(): Promise<MatchableOpportunity[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, title, stage, requires_staffing, updated_at, companies(name)")
    .order("updated_at", { ascending: false })
    .limit(200)

  if (error || !data) return []

  return selectMatchableOpportunities(data)
}
