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
  type PortfolioTrustBundle,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"

type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type LooseSelectable<T> = LooseQuery<T> & {
  order(column: string, options?: { ascending?: boolean }): LooseQuery<T>
}
type LooseTable = {
  select<T>(columns: string): LooseSelectable<T>
}
type LooseClient = {
  from(table: string): LooseTable
}

export type ProspectionSummaryData =
  | {
      state: "error"
      title: string
      message: string
    }
  | {
      state: "ready"
      generatedAt: string
      accounts: ProspectionPortfolioAccount[]
      filterOptions: {
        sectors: string[]
        lifecycles: string[]
        priorities: string[]
      }
      trust: PortfolioTrustBundle
      metrics: {
        totalAccounts: number
        scoredAccounts: number
      }
    }

function unwrapQueryResult<T>(source: string, result: Awaited<LooseQuery<T>>) {
  if (result.error) {
    throw new Error(`Prospection summary query failed for "${source}": ${result.error.message}`)
  }
  return result.data ?? []
}

export const getProspectionSummaryData = cache(async (): Promise<ProspectionSummaryData> => {
  try {
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
      supabase.from("interactions").select<PortfolioInteractionRow>("company_id,type,occurred_at"),
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

    const portfolio = buildProspectionPortfolioAccounts({
      companies,
      contacts,
      interactions,
      calendarEvents,
      opportunities,
      intelligenceRows,
    })

    return {
      state: "ready",
      generatedAt: new Date().toISOString(),
      accounts: portfolio.accounts,
      filterOptions: portfolio.filterOptions,
      trust: portfolio.trust,
      metrics: {
        totalAccounts: portfolio.metrics.totalAccounts,
        scoredAccounts: portfolio.metrics.scoredAccounts,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de charger la synthèse prospection."
    return {
      state: "error",
      title: "Erreur de chargement Supabase",
      message,
    }
  }
})
