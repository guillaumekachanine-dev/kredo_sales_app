import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import {
  buildProspectionPortfolioAccounts,
  type PortfolioCalendarEventRow,
  type PortfolioCompanyRow,
  type PortfolioContactRow,
  type PortfolioIntelligenceSummaryRow,
  type PortfolioOpportunityRow,
} from "@/lib/prospection/portfolio-account-metrics"
import type { PortfolioInteractionSourceRow } from "./business-intelligence-types"
import type { SegmentPortfolioSnapshot } from "./business-intelligence-workspace-types"

export const getSegmentPortfolioSnapshot = cache(async (segmentId: string): Promise<SegmentPortfolioSnapshot> => {
  const supabase = await createClient()
  const companiesResult = await supabase
    .from("companies")
    .select("id,name,sector,sector_id,segment_id,lifecycle_status,priority,knowledge_state,health,updated_at")
    .eq("segment_id", segmentId)
    .or("depth_level.is.null,depth_level.neq.mapped")
    .order("name")

  if (companiesResult.error) throw new Error(`Segment portfolio companies query failed: ${companiesResult.error.message}`)
  const companies = (companiesResult.data ?? []) as PortfolioCompanyRow[]
  const companyIds = companies.map((company) => company.id)

  let contacts: PortfolioContactRow[] = []
  let interactions: PortfolioInteractionSourceRow[] = []
  let calendarEvents: PortfolioCalendarEventRow[] = []
  let opportunities: PortfolioOpportunityRow[] = []
  let intelligenceRows: PortfolioIntelligenceSummaryRow[] = []

  if (companyIds.length > 0) {
    const [contactsResult, interactionsResult, calendarResult, opportunitiesResult, intelligenceResult] = await Promise.all([
      supabase.from("contacts").select("company_id,relationship_role,decision_power").in("company_id", companyIds),
      supabase.from("interactions").select("company_id,type,occurred_at,details").in("company_id", companyIds),
      supabase.from("calendar_events").select("company_id,event_type,starts_at,status").in("company_id", companyIds),
      supabase.from("opportunities").select("company_id,stage,weighted_gain").in("company_id", companyIds),
      supabase.from("v_ai_intelligence_summary").select("company_id,has_client_analysis,has_sector_analysis,has_process_diagnostic,has_roadmap,has_legacy_analysis,has_legacy_sector,has_legacy_pitches,latest_run_at,latest_run_status,count_runs,count_results").in("company_id", companyIds),
    ])
    const error = contactsResult.error ?? interactionsResult.error ?? calendarResult.error ?? opportunitiesResult.error ?? intelligenceResult.error
    if (error) throw new Error(`Segment portfolio dependent query failed: ${error.message}`)
    contacts = (contactsResult.data ?? []) as PortfolioContactRow[]
    interactions = (interactionsResult.data ?? []) as PortfolioInteractionSourceRow[]
    calendarEvents = (calendarResult.data ?? []) as PortfolioCalendarEventRow[]
    opportunities = (opportunitiesResult.data ?? []) as PortfolioOpportunityRow[]
    intelligenceRows = (intelligenceResult.data ?? []) as PortfolioIntelligenceSummaryRow[]
  }

  const now = Date.now()
  const portfolio = buildProspectionPortfolioAccounts({
    companies,
    contacts,
    interactions,
    calendarEvents,
    opportunities,
    intelligenceRows,
    now,
  })

  let syntheticInteractionsCount = 0
  let realInteractionsCount = 0
  for (const interaction of interactions) {
    const details = interaction.details
    if (details && (details.fictional === "true" || details.synthetic === "true" || details.dataset_batch || details.seed_key)) {
      syntheticInteractionsCount += 1
    } else {
      realInteractionsCount += 1
    }
  }
  const hasDemoData = syntheticInteractionsCount > 0

  return {
    accounts: portfolio.accounts,
    filterOptions: portfolio.filterOptions,
    trust: portfolio.trust,
    metrics: portfolio.metrics,
    generatedAt: new Date(now).toISOString(),
    sourceRows: { companies, contacts, interactions, calendarEvents, opportunities, intelligenceRows },
    dataQuality: {
      syntheticInteractionsCount,
      realInteractionsCount,
      hasDemoData,
      limitations: hasDemoData ? ["Contient des données de démonstration fictives, à exclure des analyses réelles."] : [],
    },
  }
})
