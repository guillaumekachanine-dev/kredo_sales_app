"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ContactRole } from "@/types/database-domain"

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
    .from("opportunity_contacts")
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
    .from("opportunity_contacts")
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
    .from("opportunity_contacts")
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
    .from("opportunity_contacts")
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

export interface CreateAndLinkContactInput {
  opportunity_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  role: ContactRole | null
}

export async function createAndLinkOpportunityContact(
  input: CreateAndLinkContactInput
): Promise<ContactActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  // 1. Récupérer l'opportunité pour obtenir son company_id
  const { data: opportunity, error: oppError } = await supabase
    .from("opportunities")
    .select("company_id")
    .eq("id", input.opportunity_id)
    .maybeSingle()

  if (oppError) {
    console.error("Erreur lors de la récupération de l'opportunité :", oppError)
    return { error: `Impossible de récupérer l'opportunité : ${oppError.message}` }
  }

  if (!opportunity) {
    return { error: "Opportunité introuvable." }
  }

  const companyId = opportunity.company_id
  if (!companyId) {
    return { error: "L'opportunité doit être associée à un client pour y lier un contact." }
  }

  // 2. Étape 1 : Création de la personne
  const { data: person, error: personError } = await supabase
    .from("persons")
    .insert({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      primary_email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .select("id")
    .single()

  if (personError) {
    console.error("Erreur lors de la création de la personne :", personError)
    return { error: `Erreur création profil personne : ${personError.message}` }
  }

  // 3. Étape 2 : Création du contact lié au client
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      person_id: person.id,
      company_id: companyId,
      job_title: input.job_title?.trim() || null,
    })
    .select("id")
    .single()

  if (contactError) {
    console.error("Erreur lors de la création du contact :", contactError)
    return { error: `Erreur création contact : ${contactError.message}` }
  }

  // 4. Étape 3 : Liaison du contact à l'opportunité
  const { error: linkError } = await supabase
    .from("opportunity_contacts")
    .insert({
      opportunity_id: input.opportunity_id,
      contact_id: contact.id,
      role: input.role,
    })

  if (linkError) {
    console.error("Erreur lors de la liaison du nouveau contact :", linkError)
    return { error: `Liaison à l'opportunité impossible : ${linkError.message}` }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}
