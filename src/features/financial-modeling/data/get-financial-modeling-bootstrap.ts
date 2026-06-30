import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getFinancialAssumptions } from "./get-financial-assumptions"
import { getFinancialResourceCatalog } from "./get-financial-resource-catalog"
import { getFinancialPricingAnchors } from "./get-financial-pricing-anchors"
import { getRecentFinancialModels } from "./get-recent-financial-models"
import type { FinancialAssumptionsData } from "./get-financial-assumptions"
import type { FinancialResourceCatalogData } from "./get-financial-resource-catalog"
import type { FinancialPricingAnchorsData } from "./get-financial-pricing-anchors"
import type { FinancialModelRow } from "../persistence"

export type FinancialModelingBootstrapData = {
  assumptions: FinancialAssumptionsData
  catalog: FinancialResourceCatalogData
  pricing: FinancialPricingAnchorsData
  recentSimulations: FinancialModelRow[]
  companies: { id: string; name: string }[]
  opportunities: { id: string; title: string; company_id: string | null; target_daily_rate: number | null }[]
}

export async function getFinancialModelingBootstrap(): Promise<FinancialModelingBootstrapData> {
  const supabase = await createClient()

  const [
    assumptions,
    catalog,
    pricing,
    recentSimulations,
    companiesResult,
    opportunitiesResult,
  ] = await Promise.all([
    getFinancialAssumptions(),
    getFinancialResourceCatalog(),
    getFinancialPricingAnchors(),
    getRecentFinancialModels(),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("opportunities").select("id, title, company_id, target_daily_rate").order("title"),
  ])

  if (companiesResult.error) {
    throw new Error(`Failed to fetch companies for bootstrap: ${companiesResult.error.message}`)
  }

  if (opportunitiesResult.error) {
    throw new Error(`Failed to fetch opportunities for bootstrap: ${opportunitiesResult.error.message}`)
  }

  return {
    assumptions,
    catalog,
    pricing,
    recentSimulations,
    companies: companiesResult.data ?? [],
    opportunities: opportunitiesResult.data ?? [],
  }
}
