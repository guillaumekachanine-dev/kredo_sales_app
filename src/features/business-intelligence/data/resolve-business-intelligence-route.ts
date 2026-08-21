import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type BusinessIntelligenceSearchParams = Record<string, string | string[] | undefined>

export type BusinessIntelligenceRouteResolution =
  | { kind: "catalog"; tab: string | null }
  | { kind: "workspace"; segmentId: string; tab: string | null }
  | { kind: "legacyRedirect"; segmentId: string; href: string; tab: string | null }
  | {
      kind: "invalid"
      reason: "unknown_segment" | "macro_not_allowed" | "malformed_segment"
      tab: string | null
    }

type SectorRouteRow = {
  id: string
  slug: string
  name: string
  level: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function firstValue(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate?.trim() || null
}

function canonicalHref(segmentId: string, tab: string | null): string {
  const params = new URLSearchParams({ segment: segmentId })
  if (tab) params.set("tab", tab)
  return `/intelligence?${params.toString()}`
}

const findSectorById = cache(async (id: string): Promise<SectorRouteRow | null> => {
  const supabase = await createClient()
  const result = await supabase
    .from("sector_intelligence")
    .select("id,slug,name,level")
    .eq("id", id)
    .maybeSingle()

  if (result.error) throw new Error(`Unable to resolve BI segment: ${result.error.message}`)
  return result.data as SectorRouteRow | null
})

const findLegacySector = cache(async (value: string): Promise<SectorRouteRow | null> => {
  const supabase = await createClient()
  const byId = UUID_PATTERN.test(value)
  const query = supabase.from("sector_intelligence").select("id,slug,name,level")
  const result = byId
    ? await query.eq("id", value).maybeSingle()
    : await query.eq("slug", value).maybeSingle()

  if (result.error) throw new Error(`Unable to resolve legacy BI segment: ${result.error.message}`)
  return result.data as SectorRouteRow | null
})

export async function resolveBusinessIntelligenceRoute(
  searchParams: BusinessIntelligenceSearchParams,
): Promise<BusinessIntelligenceRouteResolution> {
  const segment = firstValue(searchParams.segment)
  const legacySegment = firstValue(searchParams.competitiveSegment)
  const tab = firstValue(searchParams.tab)

  if (segment) {
    if (!UUID_PATTERN.test(segment)) return { kind: "invalid", reason: "malformed_segment", tab }
    const row = await findSectorById(segment)
    if (!row) return { kind: "invalid", reason: "unknown_segment", tab }
    if (row.level !== "segment") return { kind: "invalid", reason: "macro_not_allowed", tab }
    return { kind: "workspace", segmentId: row.id, tab }
  }

  if (!legacySegment) return { kind: "catalog", tab }

  const row = await findLegacySector(legacySegment)
  if (!row) return { kind: "invalid", reason: "unknown_segment", tab }
  if (row.level !== "segment") return { kind: "invalid", reason: "macro_not_allowed", tab }
  return { kind: "legacyRedirect", segmentId: row.id, href: canonicalHref(row.id, tab), tab }
}
