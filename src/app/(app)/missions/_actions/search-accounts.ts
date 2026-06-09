"use server"

import { createClient } from "@/lib/supabase/server"

export interface AccountSearchResult {
  id: string
  name: string
}

type SupabaseError = { message: string }
type AccountSearchQuery = PromiseLike<{ data: AccountSearchResult[] | null; error: SupabaseError | null }> & {
  select(columns: string): AccountSearchQuery
  ilike(column: string, pattern: string): AccountSearchQuery
  order(column: string, options?: { ascending?: boolean }): AccountSearchQuery
  limit(count: number): AccountSearchQuery
}

type LooseSupabaseClient = {
  from(table: "companies"): AccountSearchQuery
}

/**
 * Recherche des comptes par nom dans la table canonique companies.
 * Utilisé par AccountCombobox pour la recherche en temps réel.
 */
export async function searchAccounts(
  query: string
): Promise<AccountSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const supabase = (await createClient()) as unknown as LooseSupabaseClient

  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", `%${trimmed}%`)
    .order("name", { ascending: true })
    .limit(8)

  if (error) return []
  return data ?? []
}
