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

    // 1. Fetch company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle()

    if (companyError) return { error: companyError.message, data: null }
    if (!company) return { error: "Compte introuvable", data: null }

    // 2. Fetch contacts with person details
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select(`
        id,
        person_id,
        job_title,
        relationship_role,
        relationship_level,
        status,
        is_priority,
        persons (
          id,
          full_name,
          first_name,
          last_name,
          primary_email,
          phone,
          linkedin_url
        )
      `)
      .eq("company_id", companyId)

    if (contactsError) {
      console.error("Error fetching company contacts:", contactsError)
    }

    // 3. Fetch opportunities linked to the company
    const { data: opportunities, error: oppsError } = await supabase
      .from("opportunities")
      .select(`
        id,
        title,
        opportunity_type,
        stage,
        priority,
        conviction,
        target_daily_rate,
        duration_days,
        estimated_gain,
        target_close_date,
        acv
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (oppsError) {
      console.error("Error fetching company opportunities:", oppsError)
    }

    // 4. Fetch missions linked to the company
    const { data: missions, error: missionsError } = await supabase
      .from("missions")
      .select(`
        id,
        title,
        status,
        start_date,
        end_date,
        tjm,
        taci,
        gross_margin_pct,
        collaborator_id,
        collaborators (
          id,
          persons (
            id,
            full_name,
            first_name,
            last_name
          )
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (missionsError) {
      console.error("Error fetching company missions:", missionsError)
    }

    // Fetch latest interaction
    const { data: lastInteraction, error: interactionError } = await supabase
      .from("interactions")
      .select("id, type, occurred_at, summary, sentiment, next_action")
      .eq("company_id", companyId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (interactionError) {
      console.error("Error fetching latest company interaction:", interactionError)
    }

    return {
      error: null,
      data: {
        company,
        contacts: contacts || [],
        opportunities: opportunities || [],
        missions: missions || [],
        lastInteraction: lastInteraction || null,
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

    // 1. Fetch contact details (with person and company)
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select(`
        id,
        person_id,
        company_id,
        job_title,
        relationship_role,
        relationship_level,
        decision_power,
        department,
        status,
        is_priority,
        manager_contact_id,
        campaign_id,
        persons (
          id,
          full_name,
          first_name,
          last_name,
          primary_email,
          phone,
          linkedin_url,
          location,
          notes,
          metadata
        ),
        companies (
          id,
          name,
          sector,
          segment,
          website,
          hq_location,
          priority,
          lifecycle_status,
          description,
          revenue,
          employee_count,
          size_band,
          health,
          ai_score
        )
      `)
      .eq("id", contactId)
      .maybeSingle()

    if (contactError) return { error: contactError.message, data: null }
    if (!contact) return { error: "Contact introuvable", data: null }

    // 2. Fetch interactions linked to this contact
    const { data: interactions, error: interactionsError } = await supabase
      .from("interactions")
      .select(`
        id,
        type,
        occurred_at,
        summary,
        sentiment,
        details,
        next_action
      `)
      .eq("contact_id", contactId)
      .order("occurred_at", { ascending: false })

    if (interactionsError) {
      console.error("Error fetching contact interactions:", interactionsError)
    }

    // 3. Fetch opportunities linked to this contact via opportunity_contacts
    const { data: opportunityContacts, error: oppsError } = await supabase
      .from("opportunity_contacts")
      .select(`
        role,
        opportunities (
          id,
          title,
          opportunity_type,
          stage,
          priority,
          conviction,
          target_daily_rate,
          duration_days,
          estimated_gain,
          target_close_date,
          acv
        )
      `)
      .eq("contact_id", contactId)

    if (oppsError) {
      console.error("Error fetching contact opportunities:", oppsError)
    }

    // Extract flat opportunity list with their role in opportunity_contacts
    const opportunities = (opportunityContacts || [])
      .map((oc) => {
        if (!oc.opportunities) return null
        const opp = Array.isArray(oc.opportunities) ? oc.opportunities[0] : oc.opportunities
        if (!opp) return null
        return {
          ...opp,
          contact_role: oc.role,
        }
      })
      .filter((opp): opp is NonNullable<typeof opp> => opp !== null)

    // 4. Fetch tasks linked to the contact
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        due_date,
        priority,
        status,
        completed_at
      `)
      .eq("entity_id", contactId)
      .eq("entity_type", "contact")
      .order("due_date", { ascending: true, nullsFirst: false })

    if (tasksError) {
      console.error("Error fetching contact tasks:", tasksError)
    }

    // Fetch sibling contacts in the same company to identify hierarchy (N+1 / N-1)
    let manager = null
    let reports: Array<{ id: string; fullName: string; job_title: string | null }> = []

    if (contact.company_id) {
      const { data: siblings } = await supabase
        .from("contacts")
        .select(`
          id,
          job_title,
          manager_contact_id,
          persons (
            id,
            full_name,
            first_name,
            last_name
          )
        `)
        .eq("company_id", contact.company_id)

      if (siblings) {
        const managerContactId = contact.manager_contact_id

        if (managerContactId) {
          const m = siblings.find(s => s.id === managerContactId)
          if (m) {
            const mPersonObj = Array.isArray(m.persons) ? m.persons[0] : m.persons
            manager = {
              id: m.id,
              fullName: (mPersonObj as any)?.full_name || `${(mPersonObj as any)?.first_name || ""} ${(mPersonObj as any)?.last_name || ""}`.trim(),
              job_title: m.job_title
            }
          }
        }

        reports = siblings
          .filter(s => s.manager_contact_id === contactId)
          .map(s => {
            const sPersonObj = Array.isArray(s.persons) ? s.persons[0] : s.persons
            return {
              id: s.id,
              fullName: (sPersonObj as any)?.full_name || `${(sPersonObj as any)?.first_name || ""} ${(sPersonObj as any)?.last_name || ""}`.trim(),
              job_title: s.job_title
            }
          })
      }
    }

    return {
      error: null,
      data: {
        contact,
        interactions: interactions || [],
        opportunities: opportunities || [],
        tasks: tasks || [],
        manager,
        reports,
      },
    }
  } catch (err) {
    console.error("Unhandled exception in getContactIdentity:", err)
    return { error: "Une erreur inattendue est survenue", data: null }
  }
}
