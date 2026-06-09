"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/types/database"

type ContactRole = Database["public"]["Enums"]["crm_contact_role"]

export interface LinkContactInput {
  opportunity_id: string
  contact_id: string
  role: ContactRole | null
}

export interface UpdateContactRoleInput {
  opportunity_id: string
  contact_id: string
  role: ContactRole | null
}

export interface UnlinkContactInput {
  opportunity_id: string
  contact_id: string
}

export type ContactActionResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

export async function linkOpportunityContact(
  input: LinkContactInput
): Promise<ContactActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  // Vérification des doublons
  const { data: existingLink, error: checkError } = await supabase
    .from("sales_opportunity_contacts")
    .select("opportunity_id")
    .eq("opportunity_id", input.opportunity_id)
    .eq("contact_id", input.contact_id)
    .maybeSingle()

  if (checkError) {
    console.error("Erreur lors de la vérification du contact lié :", checkError)
  }

  if (existingLink) {
    return { error: "Ce contact est déjà lié à cette opportunité." }
  }

  const { error } = await supabase
    .from("sales_opportunity_contacts")
    .insert({
      opportunity_id: input.opportunity_id,
      contact_id: input.contact_id,
      role: input.role,
    })

  if (error) {
    console.error("Erreur lors de la liaison du contact :", error)
    return { error: `Liaison impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}

export async function updateOpportunityContactRole(
  input: UpdateContactRoleInput
): Promise<ContactActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const { error } = await supabase
    .from("sales_opportunity_contacts")
    .update({ role: input.role })
    .eq("opportunity_id", input.opportunity_id)
    .eq("contact_id", input.contact_id)

  if (error) {
    console.error("Erreur lors de la mise à jour du rôle du contact :", error)
    return { error: `Mise à jour impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}

export async function unlinkOpportunityContact(
  input: UnlinkContactInput
): Promise<ContactActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const { error } = await supabase
    .from("sales_opportunity_contacts")
    .delete()
    .eq("opportunity_id", input.opportunity_id)
    .eq("contact_id", input.contact_id)

  if (error) {
    console.error("Erreur lors de la suppression du lien contact :", error)
    return { error: `Suppression impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}
