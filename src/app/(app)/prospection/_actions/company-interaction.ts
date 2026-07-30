"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_TYPES = new Set([
  "appel", "email", "rdv", "rdv_client", "linkedin", "dejeuner",
  "evenement", "relance", "negociation", "envoi_offre", "reunion",
  "autre", "changement_etape", "note", "envoi_cv", "entretien_client",
  "proposition", "signature", "perte",
])

export type CreateCompanyInteractionInput = {
  company_id: string
  type: string
  summary: string
  occurred_at: string
  contact_id?: string | null
}

export type CompanyInteractionResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

export async function createCompanyInteraction(
  input: CreateCompanyInteractionInput,
): Promise<CompanyInteractionResult> {
  if (!input.company_id) return { error: "Compte manquant." }

  const trimmedType = input.type?.trim()
  if (!trimmedType) return { error: "Le type est requis." }
  if (!ALLOWED_TYPES.has(trimmedType)) return { error: `Type d'interaction non autorisé : ${trimmedType}` }

  const trimmedSummary = input.summary?.trim()
  if (!trimmedSummary) return { error: "Le résumé est requis." }

  if (!input.occurred_at) return { error: "La date est requise." }
  const parsedDate = new Date(input.occurred_at)
  if (isNaN(parsedDate.getTime())) return { error: "Date invalide." }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const { error } = await supabase.from("interactions").insert({
    company_id: input.company_id,
    opportunity_id: null,
    contact_id: input.contact_id || null,
    type: trimmedType,
    summary: trimmedSummary,
    details: {},
    occurred_at: input.occurred_at,
  })

  if (error) {
    console.error("Erreur création interaction compte:", error)
    return { error: error.message }
  }

  revalidatePath("/prospection")
  return { success: true }
}
