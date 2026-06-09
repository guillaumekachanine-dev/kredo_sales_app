"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { SalesStage, SalesPriority, Opportunity } from "@/types/database"

export interface CreateOpportunityInput {
  title: string
  account_id: string | null        // null si compte inexistant ou non renseigné
  account_name_new: string         // nom brut si création inline (account_id === null)
  stage: SalesStage
  priority: SalesPriority
  conviction: number               // 0-100
  target_close_date: string        // ISO date string ou ""
  start_date: string               // ISO date string ou ""
  duration: number | null          // jours ouvrés
  estimated_gain: number | null    // €
  target_daily_rate: number | null // €/jour
}

type SuccessResult = { data: Opportunity; error?: never }
type ErrorResult = { error: string; data?: never }

export async function createOpportunity(
  input: CreateOpportunityInput
): Promise<SuccessResult | ErrorResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  // Création inline du compte si nécessaire
  let accountId: string | null = input.account_id

  if (!accountId && input.account_name_new.trim()) {
    const { data: newAccount, error: accountError } = await supabase
      .from("crm_accounts")
      .insert({ name: input.account_name_new.trim() })
      .select("id")
      .single()

    if (accountError) {
      return { error: `Erreur lors de la création du client : ${accountError.message}` }
    }
    accountId = newAccount.id
  }

  const { data, error } = await supabase
    .from("sales_opportunities")
    .insert({
      title: input.title.trim(),
      account_id: accountId,
      stage: input.stage,
      priority: input.priority,
      conviction: input.conviction,
      target_close_date: input.target_close_date || null,
      start_date: input.start_date || null,
      duration: input.duration,
      estimated_gain: input.estimated_gain,
      target_daily_rate: input.target_daily_rate,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/missions/opps")
  return { data }
}
