"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const REVALIDATE = "/prospection/accounts"

// ─── Company ──────────────────────────────────────────────────────────────────

export type CompanyFormData = {
  name: string
  sector?: string
  hq_location?: string
  priority?: string
  lifecycle_status?: string
  website?: string
  description?: string
}

export async function createCompany(data: CompanyFormData) {
  const supabase = await createClient()
  const { error } = await supabase.from("companies").insert({
    name: data.name.trim(),
    sector: data.sector?.trim() || null,
    hq_location: data.hq_location?.trim() || null,
    priority: data.priority || "normale",
    lifecycle_status: data.lifecycle_status || "cible",
    website: data.website?.trim() || null,
    description: data.description?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}

export async function updateCompany(id: string, data: CompanyFormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("companies")
    .update({
      name: data.name.trim(),
      sector: data.sector?.trim() || null,
      hq_location: data.hq_location?.trim() || null,
      priority: data.priority || "normale",
      lifecycle_status: data.lifecycle_status || "cible",
      website: data.website?.trim() || null,
      description: data.description?.trim() || null,
    })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}

export async function deleteCompany(id: string) {
  const supabase = await createClient()
  // contacts.company_id → ON DELETE SET NULL : aucun risque FK
  const { error } = await supabase.from("companies").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}

// ─── Contact ──────────────────────────────────────────────────────────────────

export type ContactFormData = {
  first_name: string
  last_name: string
  primary_email?: string
  phone?: string
  linkedin_url?: string
  company_id?: string
  job_title?: string
  relationship_role?: string
}

export async function createContact(data: ContactFormData) {
  const supabase = await createClient()

  const { data: person, error: personError } = await supabase
    .from("persons")
    .insert({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      primary_email: data.primary_email?.trim() || null,
      phone: data.phone?.trim() || null,
      linkedin_url: data.linkedin_url?.trim() || null,
    })
    .select("id")
    .single()

  if (personError) return { error: personError.message }

  const { error: contactError } = await supabase.from("contacts").insert({
    person_id: person.id,
    company_id: data.company_id || null,
    job_title: data.job_title?.trim() || null,
    relationship_role: data.relationship_role || null,
    status: "actif",
  })

  if (contactError) return { error: contactError.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}

export async function updateContact(
  contactId: string,
  personId: string,
  data: ContactFormData
) {
  const supabase = await createClient()

  const [personResult, contactResult] = await Promise.all([
    supabase
      .from("persons")
      .update({
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        primary_email: data.primary_email?.trim() || null,
        phone: data.phone?.trim() || null,
        linkedin_url: data.linkedin_url?.trim() || null,
      })
      .eq("id", personId),
    supabase
      .from("contacts")
      .update({
        company_id: data.company_id || null,
        job_title: data.job_title?.trim() || null,
        relationship_role: data.relationship_role || null,
      })
      .eq("id", contactId),
  ])

  if (personResult.error) return { error: personResult.error.message }
  if (contactResult.error) return { error: contactResult.error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}

export async function deleteContact(id: string) {
  const supabase = await createClient()
  // Supprime le contact ; la persons reste intacte (peut être collaborateur/candidat)
  const { error } = await supabase.from("contacts").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}
