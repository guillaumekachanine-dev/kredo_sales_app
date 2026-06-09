"use server"

import { createClient } from "@/lib/supabase/server"

export interface UpsertAccountResult {
  data?: {
    id: string
    name: string
  }
  error?: string
}

/**
 * Searches for a CRM account with the exact name (trimmed).
 * If it exists, returns it. If not, creates it.
 */
export async function upsertAccountByName(name: string): Promise<UpsertAccountResult> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: "Le nom du client ne peut pas être vide." }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  try {
    // 1. Chercher d'abord un compte existant au même nom
    const { data: existing, error: selectError } = await supabase
      .from("crm_accounts")
      .select("id, name")
      .eq("name", trimmedName)
      .maybeSingle()

    if (selectError) {
      console.error("Erreur lors de la vérification du compte CRM existant :", selectError)
      return { error: `Vérification impossible : ${selectError.message}` }
    }

    if (existing) {
      return { data: existing }
    }

    // 2. Créer le compte s'il n'existe pas
    const { data: newAccount, error: insertError } = await supabase
      .from("crm_accounts")
      .insert({ name: trimmedName })
      .select("id, name")
      .single()

    if (insertError) {
      console.error("Erreur lors de la création du compte CRM :", insertError)
      return { error: `Création du client impossible : ${insertError.message}` }
    }

    return { data: newAccount }
  } catch (err) {
    console.error("Erreur non gérée dans upsertAccountByName:", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}
