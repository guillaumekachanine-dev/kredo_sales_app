import "server-only"

import type { Tables } from "@/types/database"
import { createReferenceServiceClient } from "./reference-service-client"
import { getCachedReferenceRows } from "./reference-cache"

export type OfferCatalogRow = Pick<
  Tables<"offers">,
  | "id"
  | "practice_id"
  | "slug"
  | "name"
  | "short_description"
  | "full_description"
  | "keywords"
  | "typical_profiles"
  | "typical_deliverables"
  | "use_cases"
  | "sort_order"
  | "is_active"
>

// is_active inclus malgré le filtre serveur : pool-competences-data.ts refait
// .filter(x => x.is_active) côté JS (même piège que offer_practices/job_profiles,
// vérifié avant écriture). slug consommé par OfferNode côté pool-competences.
const COLUMNS =
  "id, practice_id, slug, name, short_description, full_description, keywords, typical_profiles, typical_deliverables, use_cases, sort_order, is_active"

// Catalogue d'offres actives (41 lignes) — lu intégralement par pool-competences,
// get-suggested-offers (pitch), intelligence-data (stratégie) et agenda-actions
// (formulaire événement). Chaque appelant ne consomme qu'un sous-ensemble de
// colonnes et son propre tri (sort_order ou name) — trivial à faire en JS sur un
// tableau de 41 lignes déjà en mémoire, donc pas de variante de requête par appelant.
// Le rattachement à la practice se fait via practice_id : les appelants qui
// avaient un embed PostgREST offer_practices(...) le remplacent par un Map
// construit depuis getOfferPracticesCatalog, pour ne pas dupliquer les données
// de practice dans chaque entrée de cache offers.
export async function getOffersCatalog(workspaceId: string): Promise<OfferCatalogRow[]> {
  return getCachedReferenceRows("offers", workspaceId, async () => {
    const supabase = await createReferenceServiceClient()
    const { data, error } = await supabase
      .from("offers")
      .select(COLUMNS)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  })
}
