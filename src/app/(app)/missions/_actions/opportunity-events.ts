"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface AddOpportunityEventInput {
  opportunity_id: string
  event_type: string
  body?: string | null
  occurred_at?: string | null
}

export interface UpdateOpportunityEventInput {
  id: string
  event_type: string
  body?: string | null
  occurred_at?: string | null
}

export interface DeleteOpportunityEventInput {
  id: string
}

export type EventActionResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

export async function addOpportunityEvent(
  input: AddOpportunityEventInput
): Promise<EventActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const eventType = input.event_type.trim()
  if (!eventType) {
    return { error: "Le type d'événement est requis." }
  }

  const body = input.body?.trim() === "" ? null : (input.body?.trim() ?? null)
  const occurredAt = input.occurred_at && input.occurred_at.trim() !== ""
    ? new Date(input.occurred_at).toISOString()
    : new Date().toISOString()

  const { error } = await supabase
    .from("interactions")
    .insert({
      opportunity_id: input.opportunity_id,
      type: eventType,
      summary: body,
      occurred_at: occurredAt,
      details: body ? { body } : {},
    })

  if (error) {
    console.error("Erreur lors de l'ajout de l'événement :", error)
    return { error: `Ajout impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  revalidatePath("/missions")
  return { success: true }
}

export async function updateOpportunityEvent(
  input: UpdateOpportunityEventInput
): Promise<EventActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const eventType = input.event_type.trim()
  if (!eventType) {
    return { error: "Le type d'événement est requis." }
  }

  const body = input.body?.trim() === "" ? null : (input.body?.trim() ?? null)
  const occurredAt = input.occurred_at && input.occurred_at.trim() !== ""
    ? new Date(input.occurred_at).toISOString()
    : new Date().toISOString()

  const { error } = await supabase
    .from("interactions")
    .update({
      type: eventType,
      summary: body,
      occurred_at: occurredAt,
      details: body ? { body } : {},
    })
    .eq("id", input.id)

  if (error) {
    console.error("Erreur lors de la modification de l'événement :", error)
    return { error: `Mise à jour impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  revalidatePath("/missions")
  return { success: true }
}

export async function deleteOpportunityEvent(
  input: DeleteOpportunityEventInput
): Promise<EventActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const { error } = await supabase
    .from("interactions")
    .delete()
    .eq("id", input.id)

  if (error) {
    console.error("Erreur lors de la suppression de l'événement :", error)
    return { error: `Suppression impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  revalidatePath("/missions")
  return { success: true }
}
