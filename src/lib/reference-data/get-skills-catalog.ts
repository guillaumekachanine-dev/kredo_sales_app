import "server-only"

import type { Tables } from "@/types/database"
import { createReferenceServiceClient } from "./reference-service-client"
import { getCachedReferenceRows } from "./reference-cache"

export type SkillCatalogRow = Pick<
  Tables<"skills">,
  "id" | "name" | "aliases" | "category" | "skill_description"
>

const COLUMNS = "id, name, aliases, category, skill_description"

// Référentiel compétences (130 lignes) — lu intégralement par le picker de
// compétences (opportunity-skills.ts), pool-competences et AssistanceCaseDrawer.
// Recherche/ajout d'une compétence par nom (addOpportunitySkill, ilike + insert)
// restent HORS cache : ce sont des lookups/mutations ponctuels, pas des lectures
// de catalogue.
export async function getSkillsCatalog(workspaceId: string): Promise<SkillCatalogRow[]> {
  return getCachedReferenceRows("skills", workspaceId, async () => {
    const supabase = await createReferenceServiceClient()
    const { data, error } = await supabase
      .from("skills")
      .select(COLUMNS)
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  })
}
