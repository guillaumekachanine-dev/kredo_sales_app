import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { CompetitiveMapJsonValue } from "../domain/competitive-map-output"
import {
  presentCompetitiveMapSnapshot,
  type CompetitiveMapFactRow,
  type CompetitiveMapWorkspaceEntryRow,
} from "../domain/present-competitive-map-workspace"
import type { CompetitiveMapCatalogItem, CompetitiveMapSnapshot } from "./competitive-map-workspace-types"

type SegmentRow = {
  id: string
  slug: string
  name: string
  level: string
  parent_id: string | null
}

export const getCompetitiveMapSnapshot = cache(async (segmentId: string): Promise<CompetitiveMapSnapshot | null> => {
  const supabase = await createClient()
  const [segmentResult, latestResult] = await Promise.all([
    supabase
      .from("sector_intelligence")
      .select("id,slug,name,level,parent_id")
      .eq("id", segmentId)
      .maybeSingle(),
    supabase
      .from("competitive_map_entries")
      .select("study_snapshot_date")
      .eq("segment_id", segmentId)
      .order("study_snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (segmentResult.error || latestResult.error) throw new Error((segmentResult.error ?? latestResult.error)?.message)
  if (!segmentResult.data || segmentResult.data.level !== "segment" || !latestResult.data) return null

  const segment = segmentResult.data as unknown as SegmentRow
  const snapshotDate = latestResult.data.study_snapshot_date
  const [entriesResult, parentResult] = await Promise.all([
    supabase
      .from("competitive_map_entries")
      .select("id,company_id,category,positioning,forces,vulnerabilite,angle_entree,appetence_score,accessibilite_score,appetence_provisoire,confiance,is_benchmark_account,empreinte_metier,maturite_numerique,profile_json,companies:companies!competitive_map_entries_company_id_fkey(id,name,lifecycle_status,relation_type)")
      .eq("segment_id", segmentId)
      .eq("study_snapshot_date", snapshotDate)
      .order("category", { ascending: true }),
    segment.parent_id
      ? supabase.from("sector_intelligence").select("name").eq("id", segment.parent_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (entriesResult.error || parentResult.error) throw new Error((entriesResult.error ?? parentResult.error)?.message)
  const entryRows = (entriesResult.data ?? []) as unknown as CompetitiveMapWorkspaceEntryRow[]
  if (entryRows.length === 0) return null

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
    if (factsResult.error) throw new Error(factsResult.error.message)
    factRows = (factsResult.data ?? []) as Array<Omit<CompetitiveMapFactRow, "value_json"> & { value_json: CompetitiveMapJsonValue | null }>
  }

  const macroName = parentResult.data?.name ?? ""
  const catalogItem: CompetitiveMapCatalogItem = {
    segmentId,
    segmentSlug: segment.slug,
    segmentName: segment.name,
    macroName,
    label: macroName ? `${macroName} › ${segment.name}` : segment.name,
    latestSnapshotDate: snapshotDate,
    actorCount: entryRows.length,
  }
  return presentCompetitiveMapSnapshot({ catalogItem, entryRows, factRows })
})
