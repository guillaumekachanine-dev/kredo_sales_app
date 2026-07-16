import "server-only"

import type { Tables } from "@/types/database"
import { createReferenceServiceClient } from "./reference-service-client"
import { getCachedReferenceRows } from "./reference-cache"

export type JobProfileCatalogRow = Pick<
  Tables<"job_profiles">,
  "id" | "practice_id" | "title" | "main_mission" | "tech_stack" | "responsibilities" | "kpis" | "is_active"
>

// `embedding` (pgvector) est exclu à dessein : vérifié par grep, aucun
// consommateur de ce champ dans le flux pool-competences/financial-resource-
// catalog — l'inclure gonflerait chaque entrée de cache pour rien.
// is_active EST inclus malgré le filtre serveur : pool-competences-data.ts
// refait .filter(x => x.is_active) côté JS (même piège que offer_practices).
const COLUMNS = "id, practice_id, title, main_mission, tech_stack, responsibilities, kpis, is_active"

// Référentiel profils métier (65 lignes) — lu intégralement par pool-competences
// et get-financial-resource-catalog (qui n'en utilise que id+title).
export async function getJobProfilesCatalog(workspaceId: string): Promise<JobProfileCatalogRow[]> {
  return getCachedReferenceRows("job_profiles", workspaceId, async () => {
    const supabase = await createReferenceServiceClient()
    const { data, error } = await supabase
      .from("job_profiles")
      .select(COLUMNS)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("title", { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  })
}
