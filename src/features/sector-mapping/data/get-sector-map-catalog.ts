import "server-only"

import { cache } from "react"
import { unstable_rethrow } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { buildSectorMapCatalog, emptySectorMapCatalog, type SectorMapActorRow } from "./sector-map-catalog"

export const getSectorMapCatalog = cache(async () => {
  try {
    const supabase = await createClient()
    const [sectorsResult, nodesResult, actorsResult, linksResult] = await Promise.all([
      supabase.from("sector_intelligence").select("id, slug, name, updated_at").order("name"),
      supabase.from("value_chain_nodes").select("id, sector_id, couche, maillon, rang, label, description, capture_valeur, capture_justification, confiance, updated_at"),
      supabase.from("value_chain_actors").select("id, node_id, company_id, nom, role, poids, source, confiance, updated_at, company:companies!value_chain_actors_company_id_fkey(lifecycle_status)"),
      supabase.from("value_chain_links").select("id, node_amont, node_aval, nature, intensite, libelle, created_at"),
    ])

    const error = sectorsResult.error ?? nodesResult.error ?? actorsResult.error ?? linksResult.error
    if (error) {
      console.error("[sector-map] catalog query failed", error)
      return emptySectorMapCatalog("error")
    }

    return buildSectorMapCatalog({
      sectors: sectorsResult.data ?? [],
      nodes: nodesResult.data ?? [],
      actors: (actorsResult.data ?? []) as SectorMapActorRow[],
      links: linksResult.data ?? [],
    })
  } catch (error) {
    unstable_rethrow(error)
    console.error("[sector-map] catalog load failed", error)
    return emptySectorMapCatalog("error")
  }
})
