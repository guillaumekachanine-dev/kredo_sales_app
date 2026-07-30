import "server-only"

import { createClient } from "@/lib/supabase/server"

export interface ProjectCompanyInfo {
  name: string
  website: string | null
  metadata: Record<string, unknown> | null
}

export interface ProjectPhaseInfo {
  id: string
  label: string
  status: string
}

export interface ProjectTeamMemberInfo {
  id: string
  role_label: string
  is_project_lead: boolean
}

export interface DBProjectResult {
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
  companies: ProjectCompanyInfo | ProjectCompanyInfo[] | null
  project_phases: ProjectPhaseInfo[] | null
  project_team_members: ProjectTeamMemberInfo[] | null
}

export async function getProjectsList(): Promise<DBProjectResult[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("projects")
      .select(`
        id, code, title, status, ref_status, ref_visibility, ref_anonymized_label,
        progress_pct, contract_amount, target_margin_pct, actual_margin_pct,
        start_date_planned, end_date_planned, tags, technologies,
        companies ( name, website, metadata ),
        project_phases ( id, label, status ),
        project_team_members ( id, role_label, is_project_lead )
      `)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Supabase error fetching projects list:", error)
      return []
    }

    return (data as unknown as DBProjectResult[]) ?? []
  } catch (error) {
    console.error("Error in getProjectsList:", error)
    return []
  }
}
