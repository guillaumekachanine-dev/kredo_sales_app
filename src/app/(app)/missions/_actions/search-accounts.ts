"use server"

import { createClient } from "@/lib/supabase/server"

export interface AccountSearchResult {
  id: string
  name: string
}

/**
 * Recherche des comptes CRM par nom (ilike).
 * Utilisé par AccountCombobox pour la recherche en temps réel.
 */
export async function searchAccounts(
  query: string
): Promise<AccountSearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("crm_accounts")
    .select("id, name")
    .ilike("name", `%${query.trim()}%`)
    .order("name")
    .limit(8)

  if (error) return []
  return data ?? []
}
