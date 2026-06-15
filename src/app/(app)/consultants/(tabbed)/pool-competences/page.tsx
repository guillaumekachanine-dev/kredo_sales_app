import { createClient } from "@/lib/supabase/server"
import { PoolCompetencesMap } from "@/components/consultants/pool-competences/PoolCompetencesMap"
import type { PracticeCollaborator } from "@/components/consultants/pool-competences/PoolCompetencesMap"
import {
  practices,
  skills,
} from "@/lib/consultants/pool-competences-data"

export default async function PoolCompetencesPage() {
  const supabase = await createClient()
  const { data } = await supabase
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
    `)

  return (
    <PoolCompetencesMap
      practices={practices}
      skills={skills}
      collaborators={(data ?? []) as PracticeCollaborator[]}
    />
  )
}
