"use server"

import { createClient } from "@/lib/supabase/server"
import type { Json, Opportunity, OpportunitySkill, Contact, OpportunityEvent, OpportunityStandingProfile, SalesOutcome, SkillImportance } from "@/types/database"

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
        standingProfiles: OpportunityStandingProfile[]
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

type CandidatePersonRelation = {
  full_name: string | null
  first_name: string | null
  last_name: string | null
}

type CandidateWithPerson = {
  id: string
  seniority: string | null
  availability: string | null
  mobility: string | null
  expected_daily_rate: number | null
  source: string | null
  summary: string | null
  internal_score: number | null
  status: string
  persons: CandidatePersonRelation | CandidatePersonRelation[] | null
}

function getPersonDisplayName(person: CandidatePersonRelation | CandidatePersonRelation[] | null): string {
  const personRecord = Array.isArray(person) ? person[0] : person
  if (!personRecord) return "Profil sans nom"
  return personRecord.full_name || `${personRecord.first_name || ""} ${personRecord.last_name || ""}`.trim() || "Profil sans nom"
}

function getStandingOrigin(source: string | null, opportunityStatus: string): "pressenti" | "ia" {
  const normalized = `${source || ""} ${opportunityStatus}`.toLowerCase()
  if (
    normalized.includes("ia") ||
    normalized.includes("ai") ||
    normalized.includes("matching") ||
    normalized.includes("auto") ||
    normalized.includes("inference")
  ) {
    return "ia"
  }
  return "pressenti"
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

    // 6. Récupération des profils pressentis / proposés pour l'opportunité
    const { data: standingLinks, error: standingLinksError } = await supabase
      .from("opportunity_candidates")
      .select("id, candidate_id, status, proposed_at, sent_to_client_at, comment, next_action")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: true })

    if (standingLinksError) {
      console.error("Erreur lors de la récupération du standing:", standingLinksError)
    }

    let standingProfiles: OpportunityStandingProfile[] = []
    const candidateIds = standingLinks?.map((link) => link.candidate_id) || []

    if (candidateIds.length > 0) {
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, seniority, availability, mobility, expected_daily_rate, source, summary, internal_score, status, persons(full_name, first_name, last_name)")
        .in("id", candidateIds)

      if (candidatesError) {
        console.error("Erreur lors de la récupération des profils candidats:", candidatesError)
      } else if (candidatesData && standingLinks) {
        const candidates = candidatesData as unknown as CandidateWithPerson[]
        standingProfiles = standingLinks.flatMap((link) => {
          const candidate = candidates.find((item) => item.id === link.candidate_id)
          if (!candidate) return []

          return [{
            id: link.id,
            candidate_id: link.candidate_id,
            full_name: getPersonDisplayName(candidate.persons),
            seniority: candidate.seniority,
            availability: candidate.availability,
            mobility: candidate.mobility,
            expected_daily_rate: candidate.expected_daily_rate,
            summary: candidate.summary,
            internal_score: candidate.internal_score,
            source: candidate.source,
            candidate_status: candidate.status,
            opportunity_status: link.status,
            proposed_at: link.proposed_at,
            sent_to_client_at: link.sent_to_client_at,
            comment: link.comment,
            next_action: link.next_action,
            origin: getStandingOrigin(candidate.source, link.status),
          }]
        })
      }
    }

    return {
      data: {
        opportunity: opportunityMapped,
        account,
        skills,
        contacts,
        events,
        standingProfiles,
      },
    }
  } catch (err) {
    console.error("Erreur non gérée dans getOpportunityDetail:", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}
