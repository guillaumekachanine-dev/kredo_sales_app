"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const REVALIDATE = "/prospection/accounts"

// ─── Company ──────────────────────────────────────────────────────────────────

export type CompanyFormData = {
  name: string
  sector?: string
  segment?: string
  hq_location?: string
  revenue?: string
  employee_count?: string | number
  priority?: string
  lifecycle_status?: string
  website?: string
  description?: string
}

function parseOptionalInteger(value: string | number | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const trimmed = value?.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed.replace(/\s+/g, ""), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeCompanyLifecycleStatus(value: string | undefined) {
  switch (value) {
    case "client":
    case "client_actif":
    case "client_dormant":
      return "client"
    case "ancien_client":
      return "ancien_client"
    case "partenaire":
      return "partenaire"
    case "prospect":
    default:
      return "prospect"
  }
}

export async function createCompany(data: CompanyFormData) {
  const supabase = await createClient()
  const { error } = await supabase.from("companies").insert({
    name: data.name.trim(),
    sector: data.sector?.trim() || null,
    segment: data.segment?.trim() || null,
    hq_location: data.hq_location?.trim() || null,
    revenue: data.revenue?.trim() || null,
    employee_count: parseOptionalInteger(data.employee_count),
    priority: data.priority || "normale",
    lifecycle_status: normalizeCompanyLifecycleStatus(data.lifecycle_status),
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
      segment: data.segment?.trim() || null,
      hq_location: data.hq_location?.trim() || null,
      revenue: data.revenue?.trim() || null,
      employee_count: parseOptionalInteger(data.employee_count),
      priority: data.priority || "normale",
      lifecycle_status: normalizeCompanyLifecycleStatus(data.lifecycle_status),
      website: data.website?.trim() || null,
      description: data.description?.trim() || null,
    })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}

export async function toggleCompanyFavorite(id: string, isFavorite: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("companies")
    .update({ priority: isFavorite ? "haute" : "normale" })
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
  phone_2?: string
  linkedin_url?: string
  company_id?: string
  job_title?: string
  relationship_role?: string
  relationship_level?: string
  department?: string
  manager_contact_id?: string
  is_priority?: boolean
  campaign_id?: string
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
      metadata: {
        ...(data.phone_2?.trim() ? { phone_2: data.phone_2.trim() } : {}),
      },
    })
    .select("id")
    .single()

  if (personError) return { error: personError.message }

  const { error: contactError } = await supabase.from("contacts").insert({
    person_id: person.id,
    company_id: data.company_id || null,
    job_title: data.job_title?.trim() || null,
    relationship_role: data.relationship_role || null,
    relationship_level: data.relationship_level || null,
    department: data.department?.trim() || null,
    status: "actif",
    is_priority: data.is_priority ?? false,
    manager_contact_id: data.manager_contact_id || null,
    campaign_id: data.campaign_id || null,
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

  // Safely retrieve existing metadata to merge it
  const { data: currentPerson } = await supabase
    .from("persons")
    .select("metadata")
    .eq("id", personId)
    .maybeSingle()

  const currentMeta = (currentPerson?.metadata || {}) as Record<string, unknown>
  const { manager_contact_id, ...cleanedMeta } = currentMeta
  const updatedMeta = {
    ...cleanedMeta,
    phone_2: data.phone_2?.trim() || null,
  }

  const [personResult, contactResult] = await Promise.all([
    supabase
      .from("persons")
      .update({
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        primary_email: data.primary_email?.trim() || null,
        phone: data.phone?.trim() || null,
        linkedin_url: data.linkedin_url?.trim() || null,
        metadata: updatedMeta,
      })
      .eq("id", personId),
    supabase
      .from("contacts")
      .update({
        company_id: data.company_id || null,
        job_title: data.job_title?.trim() || null,
        relationship_role: data.relationship_role || null,
        relationship_level: data.relationship_level || null,
        department: data.department?.trim() || null,
        is_priority: data.is_priority ?? false,
        manager_contact_id: data.manager_contact_id || null,
        campaign_id: data.campaign_id || null,
      })
      .eq("id", contactId),
  ])

  if (personResult.error) return { error: personResult.error.message }
  if (contactResult.error) return { error: contactResult.error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}

export async function toggleContactFavorite(contactId: string, isFavorite: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("contacts")
    .update({ is_priority: isFavorite })
    .eq("id", contactId)

  if (error) return { error: error.message }
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

export async function getCompanyIdentity(companyId: string) {
  if (!companyId) return { error: "Identifiant manquant", data: null }
  
  try {
    const supabase = await createClient()

    const [companyResult, contactsResult, oppsResult, missionsResult, interactionResult] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, sector, segment, website, hq_location, priority, lifecycle_status, description, revenue, employee_count, size_band, health, legacy_folio_score, tags, metadata, created_at, updated_at")
        .eq("id", companyId)
        .maybeSingle(),
      supabase
        .from("contacts")
        .select(`
          id, person_id, job_title, relationship_role, relationship_level, status, is_priority,
          persons (id, full_name, first_name, last_name, primary_email, phone, linkedin_url)
        `)
        .eq("company_id", companyId),
      supabase
        .from("opportunities")
        .select("id, title, opportunity_type, stage, priority, conviction, source, seniority, location, remote_policy, target_daily_rate, duration_days, estimated_gain, target_close_date, acv, required_headcount, requires_staffing")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("missions")
        .select(`
          id, title, status, start_date, end_date, tjm, cjm, gross_margin_pct, collaborator_id,
          collaborators (id, persons (id, full_name, first_name, last_name))
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("interactions")
        .select("id, type, occurred_at, summary, sentiment, next_action")
        .eq("company_id", companyId)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (companyResult.error) return { error: companyResult.error.message, data: null }
    if (!companyResult.data) return { error: "Compte introuvable", data: null }

    if (contactsResult.error) console.error("Error fetching company contacts:", contactsResult.error)
    if (oppsResult.error) console.error("Error fetching company opportunities:", oppsResult.error)
    if (missionsResult.error) console.error("Error fetching company missions:", missionsResult.error)
    if (interactionResult.error) console.error("Error fetching latest company interaction:", interactionResult.error)

    return {
      error: null,
      data: {
        company: companyResult.data,
        contacts: contactsResult.data || [],
        opportunities: oppsResult.data || [],
        missions: missionsResult.data || [],
        lastInteraction: interactionResult.data || null,
      },
    }
  } catch (err) {
    console.error("Unhandled exception in getCompanyIdentity:", err)
    return { error: "Une erreur inattendue est survenue", data: null }
  }
}

export async function getContactIdentity(contactId: string) {
  if (!contactId) return { error: "Identifiant manquant", data: null }
  
  try {
    const supabase = await createClient()

    // 1. Contact + all independent relations in parallel
    const [contactResult, interactionsResult, oppsResult2, tasksResult] = await Promise.all([
      supabase
        .from("contacts")
        .select(`
          id, person_id, company_id, job_title, relationship_role, relationship_level,
          decision_power, department, status, is_priority, manager_contact_id, campaign_id,
          persons (id, full_name, first_name, last_name, primary_email, phone, linkedin_url, location, notes, metadata),
          companies (id, name, sector, segment, website, hq_location, priority, lifecycle_status, description, revenue, employee_count, size_band, health, legacy_folio_score, metadata)
        `)
        .eq("id", contactId)
        .maybeSingle(),
      supabase
        .from("interactions")
        .select("id, type, occurred_at, summary, sentiment, details, next_action")
        .eq("contact_id", contactId)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("opportunity_contacts")
        .select(`
          role,
          opportunities (id, title, opportunity_type, stage, priority, conviction, source, seniority, location, remote_policy, target_daily_rate, duration_days, estimated_gain, target_close_date, acv, required_headcount, requires_staffing)
        `)
        .eq("contact_id", contactId),
      supabase
        .from("tasks")
        .select("id, title, description, due_date, priority, status, completed_at")
        .eq("entity_id", contactId)
        .eq("entity_type", "contact")
        .order("due_date", { ascending: true, nullsFirst: false }),
    ])

    if (contactResult.error) return { error: contactResult.error.message, data: null }
    const contact = contactResult.data
    if (!contact) return { error: "Contact introuvable", data: null }

    if (interactionsResult.error) console.error("Error fetching contact interactions:", interactionsResult.error)
    if (oppsResult2.error) console.error("Error fetching contact opportunities:", oppsResult2.error)
    if (tasksResult.error) console.error("Error fetching contact tasks:", tasksResult.error)

    const opportunities = (oppsResult2.data || [])
      .map((oc) => {
        if (!oc.opportunities) return null
        const opp = Array.isArray(oc.opportunities) ? oc.opportunities[0] : oc.opportunities
        if (!opp) return null
        return { ...opp, contact_role: oc.role }
      })
      .filter((opp): opp is NonNullable<typeof opp> => opp !== null)

    // Siblings query depends on contact.company_id
    let manager = null
    let reports: Array<{ id: string; fullName: string; job_title: string | null }> = []

    if (contact.company_id) {
      const { data: siblings } = await supabase
        .from("contacts")
        .select("id, job_title, manager_contact_id, persons (full_name, first_name, last_name, primary_email, phone)")
        .eq("company_id", contact.company_id)

      if (siblings) {
        type SiblingPerson = { full_name: string | null; first_name: string | null; last_name: string | null; primary_email: string | null; phone: string | null }

        if (contact.manager_contact_id) {
          const m = siblings.find(s => s.id === contact.manager_contact_id)
          if (m) {
            const mPersonObj = (Array.isArray(m.persons) ? m.persons[0] : m.persons) as SiblingPerson | null
            manager = {
              id: m.id,
              fullName: mPersonObj?.full_name || `${mPersonObj?.first_name || ""} ${mPersonObj?.last_name || ""}`.trim(),
              job_title: m.job_title,
              email: mPersonObj?.primary_email || null,
              phone: mPersonObj?.phone || null,
            }
          }
        }

        reports = siblings
          .filter(s => s.manager_contact_id === contactId)
          .map(s => {
            const sPersonObj = (Array.isArray(s.persons) ? s.persons[0] : s.persons) as SiblingPerson | null
            return {
              id: s.id,
              fullName: sPersonObj?.full_name || `${sPersonObj?.first_name || ""} ${sPersonObj?.last_name || ""}`.trim(),
              job_title: s.job_title,
            }
          })
      }
    }

    return {
      error: null,
      data: {
        contact,
        interactions: interactionsResult.data || [],
        opportunities: opportunities || [],
        tasks: tasksResult.data || [],
        manager,
        reports,
      },
    }
  } catch (err) {
    console.error("Unhandled exception in getContactIdentity:", err)
    return { error: "Une erreur inattendue est survenue", data: null }
  }
}
