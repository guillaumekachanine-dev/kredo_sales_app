"use server"

import { createClient } from "@/lib/supabase/server"
import type { Json, Opportunity, OpportunitySkill, Contact, OpportunityEvent, SalesOutcome, SkillImportance } from "@/types/database"

export type OpportunityDetailResult =
  | {
      data: {
        opportunity: Opportunity
        account: {
          id: string
          name: string
          sector: string | null
        } | null
        skills: OpportunitySkill[]
        contacts: Array<{
          contact: Contact
          role: string | null
        }>
        events: OpportunityEvent[]
      }
      error?: never
    }
  | {
      data?: never
      error: string
    }

function isJsonRecord(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getJsonString(value: Json | null | undefined, key: string): string | null {
  if (!isJsonRecord(value)) return null
  const field = value[key]
  return typeof field === "string" ? field : null
}

type SkillRelation = {
  name: string | null
}

export async function getOpportunityDetail(opportunityId: string): Promise<OpportunityDetailResult> {
  if (!opportunityId || opportunityId.trim() === "") {
    return { error: "L'identifiant de l'opportunité est manquant." }
  }

  try {
    const supabase = await createClient()

    // 1. Récupération de l'opportunité
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", opportunityId)
      .maybeSingle()

    if (oppError) {
      console.error("Erreur lors de la récupération de l'opportunité:", oppError)
      return { error: `Erreur base de données : ${oppError.message}` }
    }

    if (!opportunity) {
      return { error: "Opportunité introuvable." }
    }

    // Mapper le format attendu par le front-end pour l'opportunité
    let outcome: SalesOutcome | null = null
    if (opportunity.stage === "gagne") outcome = "gagnee"
    else if (opportunity.stage === "perdu") outcome = "perdue"
    else if (opportunity.stage === "abandonne") outcome = "abandonnee"

    const opportunityMapped: Opportunity = {
      ...opportunity,
      account_id: opportunity.company_id, // Map company_id to account_id for compatibility
      duration: opportunity.duration_days, // Map duration_days to duration for compatibility
      client_context: getJsonString(opportunity.context, "client_context"),
      need_detail: getJsonString(opportunity.context, "need_detail"),
      engagement_notes: getJsonString(opportunity.context, "engagement_notes"),
      outcome,
    }

    // 2. Récupération du compte lié (si renseigné)
    let account: { id: string; name: string; sector: string | null } | null = null
    if (opportunity.company_id) {
      const { data: accountData, error: accountError } = await supabase
        .from("companies")
        .select("id, name, sector")
        .eq("id", opportunity.company_id)
        .maybeSingle()

      if (accountError) {
        console.error("Erreur lors de la récupération du compte CRM:", accountError)
      } else if (accountData) {
        account = accountData
      }
    }

    // 3. Récupération des compétences liées (trier par created_at asc)
    const { data: skillsData, error: skillsError } = await supabase
      .from("opportunity_skills")
      .select("*, skills(name)")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: true })

    if (skillsError) {
      console.error("Erreur lors de la récupération des compétences:", skillsError)
    }
    const skills: OpportunitySkill[] = (skillsData || []).map((s) => ({
      id: s.id,
      opportunity_id: s.opportunity_id,
      skill_name: s.skills && !Array.isArray(s.skills) ? ((s.skills as SkillRelation).name ?? "") : "",
      importance: s.importance as SkillImportance,
      min_years: s.min_years,
      created_at: s.created_at,
    }))

    // 4. Récupération des contacts liés via la table de liaison
    const { data: linkContacts, error: linkError } = await supabase
      .from("opportunity_contacts")
      .select("contact_id, role")
      .eq("opportunity_id", opportunityId)

    if (linkError) {
      console.error("Erreur lors de la récupération de la liaison contacts:", linkError)
    }

    let contacts: Array<{ contact: Contact; role: string | null }> = []
    const contactIds = linkContacts?.map((lc) => lc.contact_id) || []

    if (contactIds.length > 0) {
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("*, persons(*)")
        .in("id", contactIds)

      if (contactsError) {
        console.error("Erreur lors de la récupération des contacts CRM:", contactsError)
      } else if (contactsData && linkContacts) {
        const tempContacts: Array<{ contact: Contact; role: string | null }> = []
        for (const lc of linkContacts) {
          const contactObj = contactsData.find((c) => c.id === lc.contact_id)
          if (contactObj) {
            const personObj = contactObj.persons && !Array.isArray(contactObj.persons) ? contactObj.persons : null
            tempContacts.push({
              contact: {
                id: contactObj.id,
                account_id: contactObj.company_id,
                full_name: personObj ? (personObj.full_name || `${personObj.first_name || ""} ${personObj.last_name || ""}`.trim()) : "",
                email: personObj?.primary_email || null,
                phone: personObj?.phone || null,
                job_title: contactObj.job_title,
                notes: personObj?.notes || null,
                created_at: contactObj.created_at,
              },
              role: lc.role,
            })
          }
        }
        contacts = tempContacts
      }
    }

    // 5. Récupération des événements (trier par occurred_at desc)
    const { data: eventsData, error: eventsError } = await supabase
      .from("interactions")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("occurred_at", { ascending: false })

    if (eventsError) {
      console.error("Erreur lors de la récupération des événements:", eventsError)
    }
    const events: OpportunityEvent[] = (eventsData || []).map((item) => ({
      id: item.id,
      opportunity_id: item.opportunity_id || opportunityId,
      event_type: item.type,
      body: item.summary || getJsonString(item.details, "body"),
      occurred_at: item.occurred_at,
    }))

    return {
      data: {
        opportunity: opportunityMapped,
        account,
        skills,
        contacts,
        events,
      },
    }
  } catch (err) {
    console.error("Erreur non gérée dans getOpportunityDetail:", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}
