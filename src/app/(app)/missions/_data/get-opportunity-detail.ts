"use server"

import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import type {
  Contact,
  Opportunity,
  OpportunityEvent,
  OpportunitySkill,
  OpportunityStandingProfile,
  SalesOutcome,
  SkillImportance,
} from "@/types/database-domain"

export type OpportunityDetailResult =
  | {
      data: {
        opportunity: Opportunity
        account: {
          id: string
          name: string
          sector: string | null
          website: string | null
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

    // 1. Opportunity + all independent relations in parallel
    const [oppResult, skillsResult, linkContactsResult, eventsResult, standingLinksResult] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*")
        .eq("id", opportunityId)
        .maybeSingle(),
      supabase
        .from("opportunity_skills")
        .select("id, opportunity_id, importance, min_years, created_at, skills(name)")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: true }),
      supabase
        .from("opportunity_contacts")
        .select("contact_id, role")
        .eq("opportunity_id", opportunityId),
      supabase
        .from("interactions")
        .select("id, opportunity_id, type, summary, details, occurred_at")
        .eq("opportunity_id", opportunityId)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("opportunity_candidates")
        .select("id, candidate_id, status, proposed_at, sent_to_client_at, comment, next_action")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: true }),
    ])

    const { data: opportunity, error: oppError } = oppResult
    if (oppError) {
      console.error("Erreur lors de la récupération de l'opportunité:", oppError)
      return { error: `Erreur base de données : ${oppError.message}` }
    }
    if (!opportunity) {
      return { error: "Opportunité introuvable." }
    }

    let outcome: SalesOutcome | null = null
    if (opportunity.stage === "gagne") outcome = "gagnee"
    else if (opportunity.stage === "perdu") outcome = "perdue"
    else if (opportunity.stage === "abandonne") outcome = "abandonnee"

    const opportunityMapped: Opportunity = {
      ...opportunity,
      account_id: opportunity.company_id,
      duration: opportunity.duration_days,
      client_context: getJsonString(opportunity.context, "client_context"),
      need_detail: getJsonString(opportunity.context, "need_detail"),
      engagement_notes: getJsonString(opportunity.context, "engagement_notes"),
      outcome,
    }

    // 2. Account (depends on opportunity.company_id)
    let account: { id: string; name: string; sector: string | null; website: string | null } | null = null
    if (opportunity.company_id) {
      const { data: accountData, error: accountError } = await supabase
        .from("companies")
        .select("id, name, sector, website")
        .eq("id", opportunity.company_id)
        .maybeSingle()
      if (accountError) {
        console.error("Erreur lors de la récupération du compte CRM:", accountError)
      } else if (accountData) {
        account = accountData
      }
    }

    // 3. Skills
    if (skillsResult.error) {
      console.error("Erreur lors de la récupération des compétences:", skillsResult.error)
    }
    const skills: OpportunitySkill[] = (skillsResult.data || []).map((s) => ({
      id: s.id,
      opportunity_id: s.opportunity_id,
      skill_name: s.skills && !Array.isArray(s.skills) ? ((s.skills as SkillRelation).name ?? "") : "",
      importance: s.importance as SkillImportance,
      min_years: s.min_years,
      created_at: s.created_at,
    }))

    // 4. Contacts — use Map for O(1) lookup instead of O(n²) find()
    if (linkContactsResult.error) {
      console.error("Erreur lors de la récupération de la liaison contacts:", linkContactsResult.error)
    }
    const linkContacts = linkContactsResult.data
    let contacts: Array<{ contact: Contact; role: string | null }> = []
    const contactIds = linkContacts?.map((lc) => lc.contact_id) || []

    if (contactIds.length > 0) {
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("id, company_id, job_title, created_at, persons(full_name, first_name, last_name, primary_email, phone, notes)")
        .in("id", contactIds)

      if (contactsError) {
        console.error("Erreur lors de la récupération des contacts CRM:", contactsError)
      } else if (contactsData && linkContacts) {
        const contactMap = new Map(contactsData.map((c) => [c.id, c]))
        contacts = linkContacts.flatMap((lc) => {
          const contactObj = contactMap.get(lc.contact_id)
          if (!contactObj) return []
          const personObj = contactObj.persons && !Array.isArray(contactObj.persons) ? contactObj.persons : null
          return [{
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
          }]
        })
      }
    }

    // 5. Events
    if (eventsResult.error) {
      console.error("Erreur lors de la récupération des événements:", eventsResult.error)
    }
    const events: OpportunityEvent[] = (eventsResult.data || []).map((item) => ({
      id: item.id,
      opportunity_id: item.opportunity_id || opportunityId,
      event_type: item.type,
      body: item.summary || getJsonString(item.details, "body"),
      occurred_at: item.occurred_at,
    }))

    // 6. Standing profiles — use Map for O(1) lookup
    if (standingLinksResult.error) {
      console.error("Erreur lors de la récupération du standing:", standingLinksResult.error)
    }
    const standingLinks = standingLinksResult.data
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
        const candidateMap = new Map(candidates.map((c) => [c.id, c]))
        standingProfiles = standingLinks.flatMap((link) => {
          const candidate = candidateMap.get(link.candidate_id)
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
