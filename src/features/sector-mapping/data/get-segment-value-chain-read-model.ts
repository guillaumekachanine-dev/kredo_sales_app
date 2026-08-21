import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { buildSectorMapCatalog, type SectorMapActorRow } from "./sector-map-catalog"
import type { SegmentValueChainReadModel } from "@/features/business-intelligence/data/business-intelligence-workspace-types"

type SegmentRow = {
  id: string
  parent_id: string | null
}

export const getSegmentValueChainReadModel = cache(async (segmentId: string): Promise<SegmentValueChainReadModel | null> => {
  const supabase = await createClient()
  const segmentResult = await supabase.from("sector_intelligence").select("id,parent_id").eq("id", segmentId).eq("level", "segment").maybeSingle()
  if (segmentResult.error) throw new Error(segmentResult.error.message)
  if (!segmentResult.data) return null
  const segment = segmentResult.data as SegmentRow
  const candidateIds = [segment.id, segment.parent_id].filter((id): id is string => Boolean(id))

  const nodesResult = await supabase
    .from("value_chain_nodes")
    .select("id,sector_id,couche,maillon,rang,label,description,capture_valeur,capture_justification,confiance,updated_at")
    .in("sector_id", candidateIds)
  if (nodesResult.error) throw new Error(nodesResult.error.message)

  const allNodes = nodesResult.data ?? []
  const hasChain = (sectorId: string | null) => Boolean(sectorId && allNodes.some((node) => node.sector_id === sectorId && node.couche === "chaine" && node.maillon !== null))
  const sourceSectorId = hasChain(segment.id) ? segment.id : hasChain(segment.parent_id) ? segment.parent_id : null
  if (!sourceSectorId) return null
  const selectedNodes = allNodes.filter((node) => node.sector_id === sourceSectorId)
  if (selectedNodes.length === 0) return null

  const level = sourceSectorId === segment.id ? "segment" : "macro"
  const nodeIds = selectedNodes.map((node) => node.id)
  const [sourceSectorResult, actorsResult, linksResult] = await Promise.all([
    supabase.from("sector_intelligence").select("id,slug,name,updated_at").eq("id", sourceSectorId).single(),
    supabase.from("value_chain_actors").select("id,node_id,company_id,nom,role,poids,source,confiance,updated_at,company:companies!value_chain_actors_company_id_fkey(lifecycle_status)").in("node_id", nodeIds),
    supabase.from("value_chain_links").select("id,node_amont,node_aval,nature,intensite,libelle,created_at").in("node_amont", nodeIds).in("node_aval", nodeIds),
  ])
  const error = sourceSectorResult.error ?? actorsResult.error ?? linksResult.error
  if (error) throw new Error(error.message)
  if (!sourceSectorResult.data) return null

  const catalog = buildSectorMapCatalog({
    sectors: [sourceSectorResult.data],
    nodes: selectedNodes,
    actors: (actorsResult.data ?? []) as unknown as SectorMapActorRow[],
    links: linksResult.data ?? [],
  })
  if (catalog.state !== "ready") return null

  const updatedAt = selectedNodes.reduce<string | null>((latest, node) => !latest || node.updated_at > latest ? node.updated_at : latest, null)
  return { sourceSectorId, level, catalog, updatedAt }
})
