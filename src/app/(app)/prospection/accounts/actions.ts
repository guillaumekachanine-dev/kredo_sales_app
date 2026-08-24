"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { normalizeCompanyRelationType, normalizeCompanyTier } from "@/lib/accounts-contacts/company-constants"
import { resolveCompanyTaxonomy } from "@/lib/accounts-contacts/company-taxonomy"
import { normalizeContactRelationshipRole } from "@/lib/accounts-contacts/contact-constants"
import { createClient } from "@/lib/supabase/server"
import { getCompetitiveMapCitation } from "@/features/competitive-map/data/get-competitive-map-citation"
import { extractAccountStudySnapshot } from "@/features/competitive-map/domain/account-study-snapshot"
import { getCurrentCompanyFacts } from "@/lib/intelligence/company-facts"
import { EMPTY_CURRENT_COMPANY_FACTS } from "@/lib/intelligence/company-facts-contract"

const REVALIDATE = "/prospection/accounts"

// ─── Company ──────────────────────────────────────────────────────────────────

export type CompanyFormData = {
  name: string
  sector?: string
  sector_id?: string | null
  segment?: string
  segment_id?: string | null
  tier?: string | null
  regime_achat?: string | null
  relation_type?: string | null
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

// `sector` et `lifecycle_status` sont volontairement ABSENTS des payloads
// ci-dessous (migration 066) :
//   sector           — témoin historique figé, interdit en écriture (§12.3)
//   lifecycle_status — projection de relation_type par trg_companies_project_…
// `segment` (texte libre déprécié) n'est plus alimenté non plus : la taxonomie
// passe exclusivement par segment_id. `sector_id` n'est porté qu'à l'INSERT,
// où la contrainte NOT NULL l'exige ; le trigger de dérivation fait autorité.

export async function createCompany(data: CompanyFormData): Promise<{ error: string | null; id: string | null }> {
  const supabase = await createClient()
  const relType = data.relation_type || normalizeCompanyRelationType(data.lifecycle_status)

  const { segmentId, sectorId, error: taxonomyError } = await resolveCompanyTaxonomy(supabase, data.segment_id)
  if (!segmentId) return { error: taxonomyError, id: null }

  const { data: created, error } = await supabase
    .from("companies")
    .insert({
      name: data.name.trim(),
      segment_id: segmentId,
      sector_id: sectorId,
      tier: normalizeCompanyTier(data.tier),
      regime_achat: data.regime_achat || null,
      relation_type: relType,
      hq_location: data.hq_location?.trim() || null,
      revenue: data.revenue?.trim() || null,
      employee_count: parseOptionalInteger(data.employee_count),
      priority: data.priority || "normale",
      website: data.website?.trim() || null,
      description: data.description?.trim() || null,
      depth_level: "noted",
      origin: "manual",
    })
    .select("id")
    .single()
  if (error) return { error: error.message, id: null }
  revalidatePath(REVALIDATE)
  return { error: null, id: created.id }
}

export async function updateCompany(id: string, data: CompanyFormData) {
  const supabase = await createClient()
  const relType = data.relation_type || normalizeCompanyRelationType(data.lifecycle_status)

  const { segmentId, error: taxonomyError } = await resolveCompanyTaxonomy(supabase, data.segment_id)
  if (!segmentId) return { error: taxonomyError }

  const { error } = await supabase
    .from("companies")
    .update({
      name: data.name.trim(),
      segment_id: segmentId,
      tier: normalizeCompanyTier(data.tier),
      regime_achat: data.regime_achat || null,
      relation_type: relType,
      hq_location: data.hq_location?.trim() || null,
      revenue: data.revenue?.trim() || null,
      employee_count: parseOptionalInteger(data.employee_count),
      priority: data.priority || "normale",
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
    relationship_role: normalizeContactRelationshipRole(data.relationship_role),
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

  const cleanedMeta = { ...((currentPerson?.metadata || {}) as Record<string, unknown>) }
  delete cleanedMeta.manager_contact_id
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
        relationship_role: normalizeContactRelationshipRole(data.relationship_role),
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

    const companyResult = await supabase
      .from("companies")
      .select("id, name, legal_name, siren, naf_code, sector, segment, website, hq_location, priority, lifecycle_status, description, revenue, employee_count, size_band, health, tags, metadata, created_at, updated_at, depth_level, origin")
      .eq("id", companyId)
      .maybeSingle()

    if (companyResult.error) return { error: companyResult.error.message, data: null }
    if (!companyResult.data) return { error: "Compte introuvable", data: null }

    // ADR-0019 D-3 : un compte `mapped` (citation de cartographie) ne peut
    // porter ni contact, ni opportunité, ni mission — inutile d'interroger
    // ces tables pour le drawer minimal qui lui est réservé.
    if (companyResult.data.depth_level === "mapped") {
      return {
        error: null,
        data: {
          company: companyResult.data,
          contacts: [],
          opportunities: [],
          missions: [],
          lastInteraction: null,
          studySnapshot: extractAccountStudySnapshot(null),
          studyEntry: {
            categoryLabel: null,
            maturiteNumerique: null,
            revenueEstimateMeur: null,
            revenueExercice: null,
            revenuePerimetre: null,
            headcountFrance: null,
          },
          companyFacts: EMPTY_CURRENT_COMPANY_FACTS,
        },
      }
    }

    const [contactsResult, oppsResult, missionsResult, interactionResult, studyCitation, companyFacts] = await Promise.all([
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
      getCompetitiveMapCitation(companyId),
      getCurrentCompanyFacts(companyId),
    ])

    if (contactsResult.error) console.error("Error fetching company contacts:", contactsResult.error)
    if (oppsResult.error) console.error("Error fetching company opportunities:", oppsResult.error)
    if (missionsResult.error) console.error("Error fetching company missions:", missionsResult.error)
    if (interactionResult.error) console.error("Error fetching latest company interaction:", interactionResult.error)

    // ADR-0019 — un compte issu d'une étude sectorielle (converti depuis
    // `mapped`) garde sa fiche 05-comptes lisible tant qu'aucun autre process
    // ne l'a écrasée (`competitive_map_entries` reste la source ; pas de copie).
    const studySnapshot = extractAccountStudySnapshot(studyCitation.entry?.profileJson ?? null)
    // ADR-0019 — `account_facts` (revenue_estimate/headcount_france) est sourcé par
    // le socle E2/E5 indépendamment de `competitive_map_entries` : un compte créé
    // par l'étude (`origin='competitive_map'`) n'a pas de `companies.revenue`/
    // `employee_count` (legacy), le CA/effectif sourcé vit uniquement ici.
    const studyEntry = {
      categoryLabel: studyCitation.entry?.categoryLabel ?? null,
      maturiteNumerique: studyCitation.entry?.maturiteNumerique ?? null,
      revenueEstimateMeur: studyCitation.facts.revenueEstimateMeur,
      revenueExercice: studyCitation.facts.revenueExercice,
      revenuePerimetre: studyCitation.facts.revenuePerimetre,
      headcountFrance: studyCitation.facts.headcountFrance,
    }

    return {
      error: null,
      data: {
        company: companyResult.data,
        contacts: contactsResult.data || [],
        opportunities: oppsResult.data || [],
        missions: missionsResult.data || [],
        lastInteraction: interactionResult.data || null,
        studySnapshot,
        studyEntry,
        companyFacts,
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
    const [contactResult, interactionsResult, oppsResult2, tasksResult, calendarEventsResult] = await Promise.all([
      supabase
        .from("contacts")
        .select(`
          id, person_id, company_id, job_title, relationship_role, relationship_level,
          decision_power, department, status, is_priority, manager_contact_id, campaign_id,
          persons (id, full_name, first_name, last_name, primary_email, phone, linkedin_url, location, notes, metadata),
          companies (id, name, sector, segment, website, hq_location, priority, lifecycle_status, description, revenue, employee_count, size_band, health, metadata)
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
      supabase
        .from("calendar_events")
        .select("id, title, event_type, status, starts_at, ends_at, description, metadata")
        .eq("contact_id", contactId)
        .order("starts_at", { ascending: false }),
    ])

    if (contactResult.error) return { error: contactResult.error.message, data: null }
    const contact = contactResult.data
    if (!contact) return { error: "Contact introuvable", data: null }

    if (interactionsResult.error) console.error("Error fetching contact interactions:", interactionsResult.error)
    if (oppsResult2.error) console.error("Error fetching contact opportunities:", oppsResult2.error)
    if (tasksResult.error) console.error("Error fetching contact tasks:", tasksResult.error)
    if (calendarEventsResult.error) console.error("Error fetching contact calendar events:", calendarEventsResult.error)

    const opportunities = (oppsResult2.data || [])
      .map((oc) => {
        if (!oc.opportunities) return null
        const opp = Array.isArray(oc.opportunities) ? oc.opportunities[0] : oc.opportunities
        if (!opp) return null
        return { ...opp, contact_role: oc.role }
      })
      .filter((opp): opp is NonNullable<typeof opp> => opp !== null)

    // Siblings & Active company missions query depends on contact.company_id
    let manager = null
    let reports: Array<{ id: string; fullName: string; job_title: string | null }> = []
    let companyMissions: Array<{ id: string; title: string; status: string; tjm: number | null; start_date: string | null; end_date: string | null; practice: string | null }> = []

    if (contact.company_id) {
      const [siblingsResult, missionsResult] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, job_title, manager_contact_id, persons (full_name, first_name, last_name, primary_email, phone)")
          .eq("company_id", contact.company_id),
        supabase
          .from("missions")
          .select("id, title, status, tjm, start_date, end_date, practice")
          .eq("company_id", contact.company_id)
          .eq("status", "active"),
      ])

      const siblings = siblingsResult.data
      if (missionsResult.data) {
        companyMissions = missionsResult.data
      }

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
        calendarEvents: calendarEventsResult.data || [],
        manager,
        reports,
        companyMissions,
      },
    }
  } catch (err) {
    console.error("Unhandled exception in getContactIdentity:", err)
    return { error: "Une erreur inattendue est survenue", data: null }
  }
}

export async function updateContactRelationshipRole(
  contactId: string,
  role: string | null
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("contacts")
    .update({
      relationship_role: normalizeContactRelationshipRole(role),
    })
    .eq("id", contactId)

  if (error) return { error: error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}

export async function updateContactDecisionPower(
  contactId: string,
  decisionPower: string | null
) {
  const supabase = await createClient()
  let normalizedPower: string | null = null
  if (decisionPower) {
    const lower = decisionPower.trim().toLowerCase()
    if (lower === "faible" || lower === "moyen" || lower === "fort") {
      normalizedPower = lower
    }
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      decision_power: normalizedPower,
    })
    .eq("id", contactId)

  if (error) return { error: error.message }
  revalidatePath(REVALIDATE)
  return { error: null }
}
