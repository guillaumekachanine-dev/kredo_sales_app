import "server-only"

import { createClient } from "@/lib/supabase/server"
import { mapDbToFormState } from "../persistence"
import type { FinancialModelFormState } from "../persistence"

export async function getFinancialModel(id: string): Promise<FinancialModelFormState | null> {
  const supabase = await createClient()

  // 1. Fetch simulation record
  const { data: model, error: modelError } = await supabase
    .from("financial_models")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (modelError) {
    throw new Error(`Failed to fetch financial model ${id}: ${modelError.message}`)
  }

  if (!model) {
    return null
  }

  // 2. Fetch expenses
  const { data: expenses, error: expensesError } = await supabase
    .from("financial_model_expenses")
    .select("*")
    .eq("financial_model_id", id)

  if (expensesError) {
    throw new Error(`Failed to fetch expenses for financial model ${id}: ${expensesError.message}`)
  }

  // 3. Map to form state
  return mapDbToFormState(model, expenses ?? [])
}
