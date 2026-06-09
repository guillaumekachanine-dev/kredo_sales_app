"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type SalesStage =
  | "detection"
  | "qualification"
  | "besoin_confirme"
  | "recherche_profil"
  | "cv_envoyes"
  | "entretien_client"
  | "negociation"
  | "gagne"
  | "perdu"
  | "abandonne"
  | "en_cours"
  | "cv_sent"
  | "rt"
  | "win"
  | "lost"
  | "non_traitee"

export type SalesPriority = "basse" | "normale" | "haute"

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

type CreatedCompany = {
  id: string
}

type OpportunityResult = {
  id: string
  title: string
}

type SupabaseError = { message: string }
type SingleResult<T> = { data: T | null; error: SupabaseError | null }
type InsertQuery<T> = PromiseLike<SingleResult<T>> & {
  insert(values: Record<string, unknown>): InsertQuery<T>
  select(columns?: string): InsertQuery<T>
  single(): Promise<SingleResult<T>>
}

type LooseSupabaseClient = {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string } | null }
      error: SupabaseError | null
    }>
  }
  from<T>(table: "companies" | "opportunities"): InsertQuery<T>
}

type SuccessResult = { data: OpportunityResult; error?: never }
type ErrorResult = { error: string; data?: never }

export async function createOpportunity(
  input: CreateOpportunityInput
): Promise<SuccessResult | ErrorResult> {
  const supabase = (await createClient()) as unknown as LooseSupabaseClient

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  // Création inline du compte si nécessaire dans la table canonique companies.
  let companyId: string | null = input.account_id

  if (!companyId && input.account_name_new.trim()) {
    const { data: newCompany, error: companyError } = await supabase
      .from<CreatedCompany>("companies")
      .insert({
        name: input.account_name_new.trim(),
        lifecycle_status: "prospect",
        priority: "normale",
        metadata: {
          source: "manual_opportunity_creation",
        },
      })
      .select("id")
      .single()

    if (companyError || !newCompany) {
      return { error: `Erreur lors de la création du compte : ${companyError?.message ?? "compte non retourné"}` }
    }
    companyId = newCompany.id
  }

  const { data, error } = await supabase
    .from<OpportunityResult>("opportunities")
    .insert({
      title: input.title.trim(),
      company_id: companyId,
      stage: input.stage,
      priority: input.priority,
      conviction: input.conviction,
      target_close_date: input.target_close_date || null,
      start_date: input.start_date || null,
      duration_days: input.duration,
      estimated_gain: input.estimated_gain,
      target_daily_rate: input.target_daily_rate,
      context: {
        source: "manual_drawer",
      },
    })
    .select("id, title")
    .single()

  if (error || !data) {
    return { error: error?.message ?? "Opportunité non retournée par Supabase." }
  }

  revalidatePath("/missions/opps")
  return { data }
}
