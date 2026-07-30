import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import {
  buildProspectionPortfolioAccounts,
  type PortfolioCalendarEventRow,
  type PortfolioCompanyRow,
  type PortfolioContactRow,
  type PortfolioIntelligenceSummaryRow,
  type PortfolioInteractionRow,
  type PortfolioOpportunityRow,
} from "@/lib/prospection/portfolio-account-metrics"
import type { PortfolioIntelligenceSnapshot } from "./business-intelligence-types"

type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type LooseSelectable<T> = LooseQuery<T> & {
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): LooseQuery<T>
}
type LooseTable = {
  select<T>(columns: string): LooseSelectable<T>
}
type LooseClient = {
  from(table: string): LooseTable
}

function unwrapQueryResult<T>(source: string, result: Awaited<LooseQuery<T>>) {
  if (result.error) {
    throw new Error(`Portfolio snapshot query failed for "${source}": ${result.error.message}`)
  }
  return result.data ?? []
}

export const getPortfolioIntelligenceSnapshot = cache(async (): Promise<PortfolioIntelligenceSnapshot> => {
  const supabase = (await createClient()) as unknown as LooseClient

  const [
    companiesResult,
    contactsResult,
    interactionsResult,
    calendarResult,
    opportunitiesResult,
    intelligenceResult,
  ] = await Promise.all([
    supabase.from("companies").select<PortfolioCompanyRow>("id,name,sector,sector_id,lifecycle_status,priority,legacy_folio_score,knowledge_state,health,updated_at").order("name"),
    supabase.from("contacts").select<PortfolioContactRow>("company_id,relationship_role,decision_power"),
    supabase.from("interactions").select<any>("company_id,type,occurred_at,details"),
    supabase.from("calendar_events").select<PortfolioCalendarEventRow>("company_id,event_type,starts_at,status"),
    supabase.from("opportunities").select<PortfolioOpportunityRow>("company_id,stage,weighted_gain"),
    supabase.from("v_ai_intelligence_summary").select<PortfolioIntelligenceSummaryRow>("company_id,has_client_analysis,has_sector_analysis,has_process_diagnostic,has_roadmap,has_legacy_analysis,has_legacy_sector,has_legacy_pitches,latest_run_at,latest_run_status,count_runs,count_results"),
  ])

  const companies = unwrapQueryResult("companies", companiesResult)
  const contacts = unwrapQueryResult("contacts", contactsResult)
  const interactions = unwrapQueryResult("interactions", interactionsResult)
  const calendarEvents = unwrapQueryResult("calendar_events", calendarResult)
  const opportunities = unwrapQueryResult("opportunities", opportunitiesResult)
  const intelligenceRows = unwrapQueryResult("v_ai_intelligence_summary", intelligenceResult)

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

  // Calculate Data Quality (synthetic vs real)
  let syntheticInteractionsCount = 0
  let realInteractionsCount = 0
  let hasDemoData = false

  for (const interaction of interactions) {
    const details = interaction.details as Record<string, unknown> | null
    if (details) {
      if (details.fictional === 'true' || details.synthetic === 'true' || details.dataset_batch || details.seed_key) {
        syntheticInteractionsCount++
        hasDemoData = true
      } else {
        realInteractionsCount++
      }
    } else {
      realInteractionsCount++
    }
  }

  // Same check for opportunities? The prompt mentions:
  // "Le Lot 0 a identifié des interactions explicitement marquées comme fictives ou synthétiques... détecter uniquement les marqueurs explicites existants... ajouter au snapshot un bloc dataQuality"

  return {
    accounts: portfolio.accounts,
    filterOptions: portfolio.filterOptions,
    trust: portfolio.trust,
    metrics: {
      totalAccounts: portfolio.metrics.totalAccounts,
      scoredAccounts: portfolio.metrics.scoredAccounts,
    },
    generatedAt: new Date(now).toISOString(),
    dataQuality: {
      syntheticInteractionsCount,
      realInteractionsCount,
      hasDemoData,
      limitations: hasDemoData ? ["Contient des données de démonstration fictives, à exclure des analyses réelles."] : [],
    },
    sourceRows: {
      companies,
      contacts,
      interactions,
      calendarEvents,
      opportunities,
      intelligenceRows,
    }
  }
})
