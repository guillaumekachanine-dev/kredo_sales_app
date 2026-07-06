import { createClient } from "@/lib/supabase/server"
import { PoolCompetencesMap } from "@/components/consultants/pool-competences/PoolCompetencesMap"
import type { PracticeCollaborator } from "@/components/consultants/pool-competences/types"
import {
  buildPoolCompetencesDataset,
  type OpportunitySkillDemandRow,
  type PersonSkillRow,
} from "@/lib/consultants/pool-competences-data"

export default async function PoolCompetencesPage() {
  const supabase = await createClient()
  const [
    practicesResult,
    offersResult,
    skillsResult,
    jobProfilesResult,
    collaboratorsResult,
    personSkillsResult,
    opportunitySkillsResult,
  ] = await Promise.all([
    supabase
      .from("offer_practices")
      .select("id, workspace_id, slug, name, description, perimeter, color_hex, stack_tags, sort_order, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("offers")
      .select("id, workspace_id, practice_id, slug, name, short_description, full_description, keywords, typical_profiles, typical_deliverables, use_cases, sort_order, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("skills")
      .select("id, workspace_id, name, aliases, category, skill_description, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("job_profiles")
      .select("id, workspace_id, practice_id, title, main_mission, tech_stack, responsibilities, kpis, metadata, source, version, embedding, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("title", { ascending: true }),
    supabase
      .from("collaborators")
      .select(`
        id,
        person_id,
        status,
        current_title,
        seniority,
        practice,
        person:persons ( first_name, last_name, full_name ),
        missions (
          id,
          title,
          status,
          company:companies ( name )
        )
      `),
    supabase
      .from("person_skills")
      .select("person_id, level, years, skill:skills(id, name, aliases, category, skill_description)")
      .order("level", { ascending: false, nullsFirst: false }),
    supabase
      .from("opportunity_skills")
      .select("weight, opportunity:opportunities(practice, stage), skill:skills(id, name, aliases, category, skill_description)"),
  ])

  const collaborators = (collaboratorsResult.data ?? []) as PracticeCollaborator[]
  const collaboratorPracticeByPersonId = new Map<string, string>()
  const collaboratorTitleByPersonId = new Map<string, string>()

  for (const collaborator of collaborators) {
    if (!collaborator.person_id) continue
    collaboratorPracticeByPersonId.set(collaborator.person_id, collaborator.practice ?? "")
    collaboratorTitleByPersonId.set(collaborator.person_id, collaborator.current_title ?? "")
  }

  const dataset = buildPoolCompetencesDataset({
    practices: practicesResult.data ?? [],
    offers: offersResult.data ?? [],
    skills: skillsResult.data ?? [],
    jobProfiles: jobProfilesResult.data ?? [],
    personSkills: (personSkillsResult.data ?? []) as unknown as PersonSkillRow[],
    opportunitySkillDemand: (opportunitySkillsResult.data ?? []) as unknown as OpportunitySkillDemandRow[],
    collaboratorPracticeByPersonId,
    collaboratorTitleByPersonId,
  })

  return (
    <PoolCompetencesMap
      dataset={dataset}
      collaborators={collaborators}
    />
  )
}
