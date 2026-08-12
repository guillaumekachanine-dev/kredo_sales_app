import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { CompetitiveMapJsonValue } from "../domain/competitive-map-output"
import {
  buildCompetitiveMapCatalog,
  presentCompetitiveMapSnapshot,
  type CompetitiveMapCatalogEntryRow,
  type CompetitiveMapFactRow,
  type CompetitiveMapSectorRow,
  type CompetitiveMapWorkspaceEntryRow,
} from "../domain/present-competitive-map-workspace"
import type { CompetitiveMapWorkspace } from "./competitive-map-workspace-types"

function errorWorkspace(message: string): CompetitiveMapWorkspace {
  return { state: "error", catalog: [], selectedSegmentId: null, snapshot: null, error: message }
}

export const getCompetitiveMapWorkspace = cache(async (
  requestedSegmentId?: string | null,
): Promise<CompetitiveMapWorkspace> => {
  const supabase = await createClient()

  const [catalogEntriesResult, sectorsResult] = await Promise.all([
    supabase
      .from("competitive_map_entries")
      .select("segment_id,study_snapshot_date")
      .not("segment_id", "is", null),
    supabase
      .from("sector_intelligence")
      .select("id,slug,name,level,parent_id"),
  ])

  if (catalogEntriesResult.error || sectorsResult.error) {
    console.error("[CompetitiveMapWorkspace] catalog load failed", catalogEntriesResult.error ?? sectorsResult.error)
    return errorWorkspace("Le catalogue des cartographies est indisponible.")
  }

  const catalog = buildCompetitiveMapCatalog(
    (catalogEntriesResult.data ?? []) as CompetitiveMapCatalogEntryRow[],
    (sectorsResult.data ?? []) as CompetitiveMapSectorRow[],
  )

  if (catalog.length === 0) {
    return { state: "empty", catalog: [], selectedSegmentId: null, snapshot: null, error: null }
  }

  const catalogItem = catalog.find((item) => item.segmentId === requestedSegmentId) ?? catalog[0]
  const entriesResult = await supabase
    .from("competitive_map_entries")
    .select(
      "id,company_id,category,positioning,forces,vulnerabilite,angle_entree,appetence_score,accessibilite_score,appetence_provisoire,confiance,is_benchmark_account,profile_json,companies:companies!competitive_map_entries_company_id_fkey(id,name)",
    )
    .eq("segment_id", catalogItem.segmentId)
    .eq("study_snapshot_date", catalogItem.latestSnapshotDate)
    .order("category", { ascending: true })

  if (entriesResult.error) {
    console.error("[CompetitiveMapWorkspace] snapshot load failed", entriesResult.error)
    return { state: "error", catalog, selectedSegmentId: catalogItem.segmentId, snapshot: null, error: "La cartographie sélectionnée est indisponible." }
  }

  const entryRows = (entriesResult.data ?? []) as unknown as CompetitiveMapWorkspaceEntryRow[]
  const companyIds = [...new Set(entryRows.map((entry) => entry.company_id))]
  let factRows: CompetitiveMapFactRow[] = []

  if (companyIds.length > 0) {
    const factsResult = await supabase
      .from("account_facts")
      .select("target_id,fact_type,value_json,value_text,normalized_value")
      .eq("target_type", "company")
      .eq("is_current", true)
      .in("fact_type", ["revenue_estimate", "headcount_france"])
      .in("target_id", companyIds)

    if (factsResult.error) {
      console.error("[CompetitiveMapWorkspace] facts load failed", factsResult.error)
      return { state: "error", catalog, selectedSegmentId: catalogItem.segmentId, snapshot: null, error: "Les faits financiers de la cartographie sont indisponibles." }
    }
    factRows = (factsResult.data ?? []) as Array<Omit<CompetitiveMapFactRow, "value_json"> & { value_json: CompetitiveMapJsonValue | null }>
  }

  return {
    state: "ready",
    catalog,
    selectedSegmentId: catalogItem.segmentId,
    snapshot: presentCompetitiveMapSnapshot({ catalogItem, entryRows, factRows }),
    error: null,
  }
})
