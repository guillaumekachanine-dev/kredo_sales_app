import "server-only"

import { createClient } from "@/lib/supabase/server"

export interface StaffingPlanningMilestone {
  key: string
  date: string
  label: string
  type: string
  isFuture: boolean
  status: "completed" | "scheduled" | "cancelled"
  description: string | null
}

export interface StaffingPlanningData {
  id: string
  fullName: string
  isCollaborator: boolean
  opportunityTitle: string
  clientName: string
  currentStage: string
  milestones: StaffingPlanningMilestone[]
}

export async function getStaffingsPlanning(): Promise<StaffingPlanningData[]> {
  try {
    const supabase = await createClient()

    // 1. Fetch opportunity candidates
    const { data: staffings, error: staffingsError } = await supabase
      .from("opportunity_candidates")
      .select(`
        id,
        status,
        proposed_at,
        sent_to_client_at,
        status_changed_at,
        created_at,
        comment,
        opportunity:opportunities (
          id,
          title,
          start_date,
          company:companies ( name )
        ),
        candidate:candidates (
          id,
          source,
          person:persons (
            id,
            full_name,
            first_name,
            last_name,
            collaborators (
              id,
              entry_date,
              exit_date,
              missions (
                id,
                title,
                status,
                start_date,
                end_date,
                company:companies ( name )
              )
            )
          )
        )
      `)

    if (staffingsError || !staffings) {
      console.error("Error getStaffingsPlanning (staffings):", staffingsError)
      return []
    }

    const candidateIds = staffings
      .map((s) => s.candidate?.id)
      .filter(Boolean) as string[]

    // 2. Fetch calendar events in parallel for candidate IDs
    let eventsData: any[] = []
    if (candidateIds.length > 0) {
      const { data: events, error: eventsError } = await supabase
        .from("calendar_events")
        .select("id, title, event_type, status, starts_at, description, candidate_id")
        .in("candidate_id", candidateIds)
        .order("starts_at", { ascending: true })

      if (eventsError) {
        console.error("Error getStaffingsPlanning (events):", eventsError)
      } else {
        eventsData = events || []
      }
    }

    const now = new Date()

    return staffings.map((item: any) => {
      const opportunity = item.opportunity
      const company = opportunity?.company
      const companyRecord = Array.isArray(company) ? company[0] : company
      
      const candidate = item.candidate
      const person = candidate?.person
      const fullName = person?.full_name || `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || "Profil sans nom"
      
      const collaborator = person?.collaborators?.[0]
      const isCollaborator = candidate?.source === "collaborateur" || !!collaborator

      const candidateEvents = eventsData.filter((e) => e.candidate_id === candidate?.id)

      const milestones: StaffingPlanningMilestone[] = []

      const addMilestone = (key: string, dateStr: string | null, label: string, type: string, description: string | null = null, statusOverride?: "completed" | "scheduled" | "cancelled") => {
        if (!dateStr) return
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return
        
        const isFuture = date > now
        let status: "completed" | "scheduled" | "cancelled" = isFuture ? "scheduled" : "completed"
        if (statusOverride) {
          status = statusOverride
        }

        milestones.push({
          key,
          date: dateStr,
          label,
          type,
          isFuture,
          status,
          description,
        })
      }

      addMilestone(
        `${item.id}-identification`,
        item.created_at,
        isCollaborator ? "Identification du positionnement" : "Identification du profil",
        "identification",
        item.comment,
      )

      addMilestone(
        `${item.id}-cv_sent`,
        item.sent_to_client_at || item.proposed_at,
        "Envoi du CV",
        "cv_sent",
      )

      if (isCollaborator) {
        const clientInterview = candidateEvents.find(e => 
          e.event_type === "entretien_client" || e.title.toLowerCase().includes("client")
        )
        if (clientInterview) {
          addMilestone(
            `${item.id}-client_interview`,
            clientInterview.starts_at,
            "Entretien client",
            "client_interview",
            clientInterview.description,
          )
        }
        if (opportunity?.start_date) {
          addMilestone(`${item.id}-demarrage`, opportunity.start_date, "Démarrage", "demarrage")
        }
      } else {
        const prequalEvent = candidateEvents.find(e => 
          e.event_type === "entretien_candidat" &&
          (e.title.toLowerCase().includes("qualif") || e.title.toLowerCase().includes("fit") || e.title.toLowerCase().includes("culturel"))
        )
        if (prequalEvent) {
          addMilestone(`${item.id}-prequal`, prequalEvent.starts_at, "Préqualification", "prequal", prequalEvent.description)
        }
        const clientInterview = candidateEvents.find(e => 
          e.event_type === "entretien_client" || e.title.toLowerCase().includes("client")
        )
        if (clientInterview) {
          addMilestone(
            `${item.id}-client_interview`,
            clientInterview.starts_at,
            "Entretien client",
            "client_interview",
            clientInterview.description,
          )
        }
        if (opportunity?.start_date) {
          addMilestone(`${item.id}-demarrage`, opportunity.start_date, "Démarrage", "demarrage")
        }
      }

      if (
        item.status_changed_at &&
        ["retenu", "gagne", "refuse_client", "refuse_candidat", "abandonne"].includes(item.status)
      ) {
        addMilestone(
          `${item.id}-decision`,
          item.status_changed_at,
          "Décision",
          "decision",
          item.comment,
          item.status === "abandonne" ? "cancelled" : undefined,
        )
      }

      // Sort milestones chronologically ascending
      milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return {
        id: item.id,
        fullName,
        isCollaborator,
        opportunityTitle: opportunity?.title || "Besoin sans titre",
        clientName: companyRecord?.name || "Client inconnu",
        currentStage: item.status,
        milestones,
      }
    })
  } catch (err) {
    console.error("Unhandled error in getStaffingsPlanning:", err)
    return []
  }
}
