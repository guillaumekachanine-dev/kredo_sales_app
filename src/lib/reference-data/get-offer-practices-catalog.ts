import "server-only"

import type { Tables } from "@/types/database"
import { createReferenceServiceClient } from "./reference-service-client"
import { getCachedReferenceRows } from "./reference-cache"

export type OfferPracticeCatalogRow = Pick<
  Tables<"offer_practices">,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "perimeter"
  | "color_hex"
  | "stack_tags"
  | "sort_order"
  | "is_active"
  | "updated_at"
>

// is_active est inclus MÊME si la requête filtre déjà dessus côté serveur :
// pool-competences-data.ts refait un .filter(x => x.is_active) côté JS sur ces
// lignes — l'omettre du select ferait retomber ce champ à undefined et viderait
// silencieusement tout le dataset (piège vérifié avant écriture, pas théorique).
// updated_at sert au calcul de lastUpdatedAt (fraîcheur affichée à l'utilisateur).
const COLUMNS = "id, slug, name, description, perimeter, color_hex, stack_tags, sort_order, is_active, updated_at"

// Practices actives du catalogue offres (8 lignes en pratique) — lues telles
// quelles par 3 écrans indépendants (pool-competences, AssistanceCaseDrawer,
// NewCandidateDrawer) sans jamais varier par requête. Un seul appel DB par heure
// et par workspace au lieu d'un par ouverture d'écran.
export async function getOfferPracticesCatalog(workspaceId: string): Promise<OfferPracticeCatalogRow[]> {
  return getCachedReferenceRows("offer_practices", workspaceId, async () => {
    const supabase = await createReferenceServiceClient()
    const { data, error } = await supabase
      .from("offer_practices")
      .select(COLUMNS)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  })
}
