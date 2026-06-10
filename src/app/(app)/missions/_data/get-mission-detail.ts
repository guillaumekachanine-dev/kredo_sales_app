"use server"

import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

export interface MissionDetail {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  role_title: string | null
  practice: string | null
  seniority: string | null
  tjm: number
  taci: number
  gross_margin_pct: number | null
  metadata: Json
  opportunity_id: string | null
  collaborator_id: string
  company_id: string
}

export type MissionDetailResult =
  | {
      data: {
        mission: MissionDetail
        company: {
          id: string
          name: string
          description: string | null
          sector: string | null
        } | null
        collaborator: {
          id: string
          person: {
            id: string
            full_name: string | null
            first_name: string | null
            last_name: string | null
            primary_email: string | null
            phone: string | null
          } | null
        } | null
        contacts: Array<{
          id: string
          fullName: string
          role: string | null
          email: string | null
          phone: string | null
        }>
        activityReports: Array<{
          id: string
          billable_days: number
          non_billable_days: number
          period_start: string
          period_end: string
          status: string
        }>
        interactions: Array<{
          id: string
          type: string
          summary: string | null
          details: Json
          occurred_at: string
          next_action: string | null
        }>
      }
      error?: never
    }
  | {
      data?: never
      error: string
    }

interface DBPerson {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  primary_email: string | null
  phone: string | null
}

interface DBCollaborator {
  id: string
  person_id: string
  persons: DBPerson | DBPerson[] | null
}

interface DBContact {
  id: string
  relationship_role: string | null
  persons: DBPerson | DBPerson[] | null
}

interface DBOpportunityContact {
  role: string | null
  contacts: DBContact | DBContact[] | null
}

export async function getMissionDetail(missionId: string): Promise<MissionDetailResult> {
  if (!missionId || missionId.trim() === "") {
    return { error: "L'identifiant de la mission est manquant." }
  }

  try {
    const supabase = await createClient()

    // 1. Récupération de la mission
    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .select(`
        id,
        title,
        status,
        start_date,
        end_date,
        role_title,
        practice,
        seniority,
        tjm,
        taci,
        gross_margin_pct,
        metadata,
        opportunity_id,
        collaborator_id,
        company_id
      `)
      .eq("id", missionId)
      .maybeSingle()

    if (missionError) {
      console.error("Erreur lors de la récupération de la mission:", missionError)
      return { error: `Erreur base de données : ${missionError.message}` }
    }

    if (!mission) {
      return { error: "Mission introuvable." }
    }

    // 2. Récupération du compte lié
    let company: { id: string; name: string; description: string | null; sector: string | null } | null = null
    if (mission.company_id) {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, name, description, sector")
        .eq("id", mission.company_id)
        .maybeSingle()

      if (companyError) {
        console.error("Erreur lors de la récupération de la compagnie:", companyError)
      } else if (companyData) {
        company = companyData
      }
    }

    // 3. Récupération du collaborateur
    let collaboratorData: { id: string; person: DBPerson | null } | null = null
    if (mission.collaborator_id) {
      const { data: collab, error: collabError } = await supabase
        .from("collaborators")
        .select(`
          id,
          person_id,
          persons (
            id,
            full_name,
            first_name,
            last_name,
            primary_email,
            phone
          )
        `)
        .eq("id", mission.collaborator_id)
        .maybeSingle()

      if (collabError) {
        console.error("Erreur lors de la récupération du collaborateur:", collabError)
      } else if (collab) {
        const rawCollab = collab as unknown as DBCollaborator
        const personObj = Array.isArray(rawCollab.persons) ? rawCollab.persons[0] : rawCollab.persons
        collaboratorData = {
          id: rawCollab.id,
          person: personObj ? {
            id: personObj.id,
            full_name: personObj.full_name,
            first_name: personObj.first_name,
            last_name: personObj.last_name,
            primary_email: personObj.primary_email,
            phone: personObj.phone,
          } : null,
        }
      }
    }

    // 4. Récupération des contacts
    const contacts: Array<{ id: string; fullName: string; role: string | null; email: string | null; phone: string | null }> = []

    if (mission.opportunity_id) {
      const { data: opportunityContacts, error: oppContactsError } = await supabase
        .from("opportunity_contacts")
        .select(`
          role,
          contacts (
            id,
            relationship_role,
            persons (
              id,
              full_name,
              first_name,
              last_name,
              primary_email,
              phone
            )
          )
        `)
        .eq("opportunity_id", mission.opportunity_id)

      if (oppContactsError) {
        console.error("Erreur lors de la récupération des contacts de l'opportunité:", oppContactsError)
      } else if (opportunityContacts) {
        const rawOppContacts = opportunityContacts as unknown as DBOpportunityContact[]
        rawOppContacts.forEach((oc) => {
          const contactObj = Array.isArray(oc.contacts) ? oc.contacts[0] : oc.contacts
          if (contactObj) {
            const personObj = Array.isArray(contactObj.persons) ? contactObj.persons[0] : contactObj.persons
            if (personObj) {
              contacts.push({
                id: contactObj.id,
                fullName: personObj.full_name || `${personObj.first_name || ""} ${personObj.last_name || ""}`.trim(),
                role: oc.role || contactObj.relationship_role || "Contact opportunité",
                email: personObj.primary_email,
                phone: personObj.phone,
              })
            }
          }
        })
      }
    }

    // Si aucun contact lié à l'opportunité (ou pas d'opportunité), récupérer ceux de l'entreprise
    if (contacts.length === 0 && mission.company_id) {
      const { data: companyContacts, error: compContactsError } = await supabase
        .from("contacts")
        .select(`
          id,
          relationship_role,
          persons (
            id,
            full_name,
            first_name,
            last_name,
            primary_email,
            phone
          )
        `)
        .eq("company_id", mission.company_id)

      if (compContactsError) {
        console.error("Erreur lors de la récupération des contacts de la compagnie:", compContactsError)
      } else if (companyContacts) {
        const rawCompContacts = companyContacts as unknown as DBContact[]
        rawCompContacts.forEach((cc) => {
          const personObj = Array.isArray(cc.persons) ? cc.persons[0] : cc.persons
          if (personObj) {
            contacts.push({
              id: cc.id,
              fullName: personObj.full_name || `${personObj.first_name || ""} ${personObj.last_name || ""}`.trim(),
              role: cc.relationship_role || "Contact entreprise",
              email: personObj.primary_email,
              phone: personObj.phone,
            })
          }
        })
      }
    }

    // 5. Récupération des rapports d'activité (CRA)
    let activityReports: Array<{
      id: string
      billable_days: number
      non_billable_days: number
      period_start: string
      period_end: string
      status: string
    }> = []
    if (mission.id) {
      const { data: reports, error: reportsError } = await supabase
        .from("mission_activity_reports")
        .select("id, billable_days, non_billable_days, period_start, period_end, status")
        .eq("mission_id", mission.id)
        .order("period_start", { ascending: false })

      if (reportsError) {
        console.error("Erreur lors de la récupération des rapports d'activité:", reportsError)
      } else {
        activityReports = (reports || []).map((r) => ({
          id: r.id,
          billable_days: r.billable_days,
          non_billable_days: r.non_billable_days,
          period_start: r.period_start,
          period_end: r.period_end,
          status: r.status,
        }))
      }
    }

    // 6. Récupération de l'historique d'interactions
    let interactions: Array<{
      id: string
      type: string
      summary: string | null
      details: Json
      occurred_at: string
      next_action: string | null
    }> = []
    if (mission.opportunity_id) {
      const { data: oppInteractions, error: oppIntError } = await supabase
        .from("interactions")
        .select("id, type, summary, details, occurred_at, next_action")
        .eq("opportunity_id", mission.opportunity_id)
        .order("occurred_at", { ascending: false })

      if (oppIntError) {
        console.error("Erreur lors de la récupération des interactions opportunité:", oppIntError)
      } else if (oppInteractions && oppInteractions.length > 0) {
        interactions = oppInteractions
      }
    }

    if (interactions.length === 0 && mission.company_id) {
      const { data: compInteractions, error: compIntError } = await supabase
        .from("interactions")
        .select("id, type, summary, details, occurred_at, next_action")
        .eq("company_id", mission.company_id)
        .order("occurred_at", { ascending: false })

      if (compIntError) {
        console.error("Erreur lors de la récupération des interactions compagnie:", compIntError)
      } else if (compInteractions) {
        interactions = compInteractions
      }
    }

    return {
      data: {
        mission: mission as unknown as MissionDetail,
        company,
        collaborator: collaboratorData,
        contacts,
        activityReports,
        interactions,
      },
    }
  } catch (err) {
    console.error("Erreur non gérée dans getMissionDetail:", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}
