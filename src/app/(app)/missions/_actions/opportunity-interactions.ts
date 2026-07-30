"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export interface CreateOpportunityInteractionInput {
  opportunity_id: string
  type: string
  details: string | null
  occurred_at: string
  contact_id: string | null
}

export type OpportunityInteractionResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

export async function createOpportunityInteraction(
  input: CreateOpportunityInteractionInput
): Promise<OpportunityInteractionResult> {
  if (!input.opportunity_id) return { error: "Opportunité manquante." }
  if (!input.type || input.type.trim() === "") return { error: "Le type d'action est requis." }
  if (!input.occurred_at || input.occurred_at.trim() === "") return { error: "La date est requise." }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("company_id")
    .eq("id", input.opportunity_id)
    .maybeSingle()

  if (opportunityError) {
    console.error("Erreur lors de la récupération de l'opportunité pour interaction:", opportunityError)
    return { error: opportunityError.message }
  }

  if (!opportunity) {
    return { error: "Opportunité introuvable." }
  }

  const details = input.details?.trim() || null

  const { error } = await supabase
    .from("interactions")
    .insert({
      opportunity_id: input.opportunity_id,
      company_id: opportunity.company_id,
      contact_id: input.contact_id || null,
      type: input.type.trim(),
      summary: details || input.type.trim(),
      details: details ? { body: details } : {},
      occurred_at: input.occurred_at,
      next_action: null,
    })

  if (error) {
    console.error("Erreur lors de la création de l'action commerciale:", error)
    return { error: error.message }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}
