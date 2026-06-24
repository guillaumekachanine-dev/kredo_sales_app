import { createClient } from "@/lib/supabase/server"
import { PoolCompetencesMap } from "@/components/consultants/pool-competences/PoolCompetencesMap"
import type { PracticeCollaborator } from "@/components/consultants/pool-competences/types"
import {
  practices,
  skills,
} from "@/lib/consultants/pool-competences-data"

export default async function PoolCompetencesPage() {
  const supabase = await createClient()
  const [collaboratorsResult, skillsResult] = await Promise.all([
    supabase
      .from("collaborators")
      .select(`
        id,
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
      .from("skills")
      .select("name, skill_description")
      .in("name", skills.map((skill) => skill.name)),
  ])

  const liveDescriptions = new Map(
    (skillsResult.data ?? []).map((skill) => [skill.name, skill.skill_description])
  )

  const hydratedSkills = skills.map((skill) => ({
    ...skill,
    skillDescription: liveDescriptions.get(skill.name) ?? null,
  }))

  return (
    <PoolCompetencesMap
      practices={practices}
      skills={hydratedSkills}
      collaborators={(collaboratorsResult.data ?? []) as PracticeCollaborator[]}
    />
  )
}
