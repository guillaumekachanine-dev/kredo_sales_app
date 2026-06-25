"use server"

import { createClient } from "@/lib/supabase/server"

export interface DetailedProjectCompany {
  id?: string
  name: string
  website: string | null
  metadata: Record<string, unknown> | null
}

export interface DetailedProjectPhase {
  id: string
  label: string
  status: string
  start_date_planned: string | null
  end_date_planned: string | null
  consumed_days: number
  planned_days: number | null
  deliverables: string[]
  sort_order: number
}

export interface DetailedProjectTeamMember {
  id: string
  role_label: string
  seniority: string | null
  planned_days: number | null
  actual_days: number
  daily_cost: number | null
  contribution: string | null
  is_project_lead: boolean
  collaborator_id: string | null
  fullName?: string
  email?: string
}

export interface DetailedProjectData {
  id: string
  code: string | null
  title: string
  status: string
  ref_status: string
  ref_visibility: string
  ref_anonymized_label: string | null
  progress_pct: number
  contract_amount: number | null
  target_margin_pct: number | null
  actual_margin_pct: number | null
  start_date_planned: string | null
  end_date_planned: string | null
  tags: string[]
  technologies: string[]
  description: string | null
  scope: any
  deliverables: string[]
  lessons_learned: string | null
  companies: DetailedProjectCompany | DetailedProjectCompany[] | null
  project_phases: DetailedProjectPhase[] | null
  project_team_members: any[] | null
}

export async function getProjectDetail(projectId: string): Promise<{ data: DetailedProjectData | null; error?: string }> {
  if (!projectId || projectId.trim() === "") {
    return { data: null, error: "Identifiant du projet manquant." }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("projects")
      .select(`
        id, code, title, status, ref_status, ref_visibility, ref_anonymized_label,
        progress_pct, contract_amount, target_margin_pct, actual_margin_pct,
        start_date_planned, end_date_planned, tags, technologies,
        description, scope, deliverables, lessons_learned,
        companies ( name, website, metadata ),
        project_phases ( id, label, status, start_date_planned, end_date_planned, consumed_days, planned_days, deliverables, sort_order ),
        project_team_members (
          id, role_label, seniority, planned_days, actual_days, daily_cost, contribution, is_project_lead, collaborator_id,
          collaborators (
            id,
            persons (
              id,
              full_name,
              first_name,
              last_name,
              primary_email
            )
          )
        )
      `)
      .eq("id", projectId)
      .maybeSingle()

    if (error) {
      console.error("Supabase error fetching project detail:", error)
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: "Projet introuvable." }
    }

    // Process and sort team members (leads first)
    const teamMembersRaw = data.project_team_members ?? []
    const mappedTeamMembers: DetailedProjectTeamMember[] = teamMembersRaw.map((member: any) => {
      let fullName = ""
      let email = ""

      if (member.collaborators) {
        const collab = Array.isArray(member.collaborators) ? member.collaborators[0] : member.collaborators
        if (collab && collab.persons) {
          const person = Array.isArray(collab.persons) ? collab.persons[0] : collab.persons
          if (person) {
            fullName = person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim()
            email = person.primary_email || ""
          }
        }
      }

      return {
        id: member.id,
        role_label: member.role_label,
        seniority: member.seniority,
        planned_days: member.planned_days,
        actual_days: member.actual_days ?? 0,
        daily_cost: member.daily_cost,
        contribution: member.contribution,
        is_project_lead: member.is_project_lead ?? false,
        collaborator_id: member.collaborator_id,
        fullName: fullName || undefined,
        email: email || undefined,
      }
    })

    // Sort team members: is_project_lead === true first
    mappedTeamMembers.sort((a, b) => {
      if (a.is_project_lead && !b.is_project_lead) return -1
      if (!a.is_project_lead && b.is_project_lead) return 1
      return 0
    })

    // Process and sort phases
    const phasesRaw: DetailedProjectPhase[] = data.project_phases ?? []
    const sortedPhases = [...phasesRaw].sort((a, b) => a.sort_order - b.sort_order)

    const processedData: DetailedProjectData = {
      ...(data as any),
      project_phases: sortedPhases,
      project_team_members: mappedTeamMembers,
    }

    return { data: processedData }
  } catch (err: any) {
    console.error("Unhandled error in getProjectDetail:", err)
    return { data: null, error: err.message || "Une erreur inattendue est survenue." }
  }
}
