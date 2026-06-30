import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"

type PricingAnchorRow = Tables<"v_financial_model_pricing_anchors">
type OfferPricingGridRow = Tables<"offer_pricing_grids">
type OfferPricingGridBenchmarkRow = Pick<
  OfferPricingGridRow,
  | "id"
  | "job_profile_id"
  | "profile_name"
  | "seniority_level"
  | "location"
  | "tjm_min"
  | "tjm_recommended"
  | "tjm_max"
  | "currency"
  | "valid_from"
  | "valid_to"
>

export type GetFinancialPricingAnchorsParams = {
  companyId?: string
  jobProfileId?: string
  limit?: number
}

export type FinancialPricingAnchorItem = {
  sourceType: "agreement" | "mission" | "opportunity"
  sourceId: string
  sourceLabel: string | null
  companyId: string | null
  jobProfileId: string | null
  profileName: string | null
  seniorityLevel: string | null
  location: string | null
  saleDailyRate: number | null
  validFrom: string | null
  validTo: string | null
  status: string | null
  provenance: "v_financial_model_pricing_anchors"
  missingData: string[]
  isEstimate: boolean
  lot0InputMapping: {
    salesDailyRate: number | null
  }
}

export type FinancialPricingBenchmarkItem = {
  sourceType: "benchmark"
  sourceId: string
  sourceLabel: string
  jobProfileId: string | null
  profileName: string
  seniorityLevel: string | null
  location: string | null
  saleDailyRate: number | null
  rateSource: "tjm_recommended" | "range_midpoint" | null
  tjmMin: number | null
  tjmRecommended: number | null
  tjmMax: number | null
  currency: string | null
  validFrom: string | null
  validTo: string | null
  provenance: "offer_pricing_grids"
  missingData: string[]
  isEstimate: boolean
  lot0InputMapping: {
    salesDailyRate: number | null
  }
}

export type FinancialPricingAnchorsData = {
  anchors: FinancialPricingAnchorItem[]
  benchmarks: FinancialPricingBenchmarkItem[]
  provenance: {
    anchors: "v_financial_model_pricing_anchors"
    benchmarks: "offer_pricing_grids"
  }
}

function mapPricingAnchorRow(row: PricingAnchorRow): FinancialPricingAnchorItem | null {
  if (!row.source_type || !row.source_id) {
    return null
  }

  return {
    sourceType: row.source_type as "agreement" | "mission" | "opportunity",
    sourceId: row.source_id,
    sourceLabel: row.source_label,
    companyId: row.company_id,
    jobProfileId: row.job_profile_id,
    profileName: row.profile_name,
    seniorityLevel: row.seniority_level,
    location: row.location,
    saleDailyRate: row.tjm,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    status: row.status,
    provenance: "v_financial_model_pricing_anchors",
    missingData: row.tjm === null ? ["sale_daily_rate"] : [],
    isEstimate: false,
    lot0InputMapping: {
      salesDailyRate: row.tjm,
    },
  }
}

function mapOfferPricingGridRow(
  row: OfferPricingGridBenchmarkRow,
): FinancialPricingBenchmarkItem {
  const saleDailyRate =
    row.tjm_recommended ??
    (row.tjm_min !== null && row.tjm_max !== null
      ? Number(((row.tjm_min + row.tjm_max) / 2).toFixed(2))
      : null)

  const rateSource =
    row.tjm_recommended !== null
      ? "tjm_recommended"
      : row.tjm_min !== null && row.tjm_max !== null
        ? "range_midpoint"
        : null

  return {
    sourceType: "benchmark",
    sourceId: row.id,
    sourceLabel: row.profile_name,
    jobProfileId: row.job_profile_id,
    profileName: row.profile_name,
    seniorityLevel: row.seniority_level,
    location: row.location,
    saleDailyRate,
    rateSource,
    tjmMin: row.tjm_min,
    tjmRecommended: row.tjm_recommended,
    tjmMax: row.tjm_max,
    currency: row.currency,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    provenance: "offer_pricing_grids",
    missingData: saleDailyRate === null ? ["sale_daily_rate"] : [],
    isEstimate: false,
    lot0InputMapping: {
      salesDailyRate: saleDailyRate,
    },
  }
}

export async function getFinancialPricingAnchors(
  params: GetFinancialPricingAnchorsParams = {},
): Promise<FinancialPricingAnchorsData> {
  const supabase = await createClient()
  const limit = params.limit ?? 50

  let anchorsQuery = supabase
    .from("v_financial_model_pricing_anchors")
    .select("*")
    .order("valid_from", { ascending: false })
    .limit(limit)

  if (params.companyId) {
    anchorsQuery = anchorsQuery.eq("company_id", params.companyId)
  }

  if (params.jobProfileId) {
    anchorsQuery = anchorsQuery.eq("job_profile_id", params.jobProfileId)
  }

  let benchmarksQuery = supabase
    .from("offer_pricing_grids")
    .select(
      "id, job_profile_id, profile_name, seniority_level, location, tjm_min, tjm_recommended, tjm_max, currency, valid_from, valid_to",
    )
    .order("valid_from", { ascending: false })
    .limit(limit)

  if (params.jobProfileId) {
    benchmarksQuery = benchmarksQuery.eq("job_profile_id", params.jobProfileId)
  }

  const [anchorsResult, benchmarksResult] = await Promise.all([
    anchorsQuery,
    benchmarksQuery,
  ])

  if (anchorsResult.error) {
    throw new Error(
      `Failed to read financial pricing anchors: ${anchorsResult.error.message}`,
    )
  }

  if (benchmarksResult.error) {
    throw new Error(
      `Failed to read offer pricing benchmarks: ${benchmarksResult.error.message}`,
    )
  }

  const anchors = (anchorsResult.data ?? [])
    .map(mapPricingAnchorRow)
    .filter((item): item is FinancialPricingAnchorItem => item !== null)

  const benchmarks = (benchmarksResult.data ?? []).map(mapOfferPricingGridRow)

  return {
    anchors,
    benchmarks,
    provenance: {
      anchors: "v_financial_model_pricing_anchors",
      benchmarks: "offer_pricing_grids",
    },
  }
}
