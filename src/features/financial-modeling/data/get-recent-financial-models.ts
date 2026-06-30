import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { FinancialModelRow } from "../persistence"

export async function getRecentFinancialModels(): Promise<FinancialModelRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("financial_models")
    .select("*")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(10)

  if (error) {
    throw new Error(`Failed to fetch recent financial models: ${error.message}`)
  }

  return data ?? []
}
