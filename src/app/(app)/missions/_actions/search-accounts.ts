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
  query: string,
  options?: { limit?: number },
): Promise<AccountSearchResult[]> {
  const trimmed = query.trim()
  const limit = Math.min(Math.max(options?.limit ?? 8, 1), 25)

  const supabase = (await createClient()) as unknown as LooseSupabaseClient

  let request = supabase
    .from("companies")
    .select("id, name")

  if (trimmed.length >= 2) {
    request = request.ilike("name", `%${trimmed}%`)
  } else if (trimmed.length === 1) {
    request = request.ilike("name", `${trimmed}%`)
  }

  const { data, error } = await request
    .order("name", { ascending: true })
    .limit(limit)

  if (error) return []
  return data ?? []
}
