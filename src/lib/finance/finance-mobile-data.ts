import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  buildFinanceMobileDashboardData,
  type FinanceMobileActivityReportRow,
  type FinanceMobileCompanyRow,
  type FinanceMobileCriterionRow,
  type FinanceMobileDashboardData,
  type FinanceMobileEngagementTypeRow,
  type FinanceMobileMissionRow,
  type FinanceMobileOpportunityRow,
  type FinanceMobilePlanRow,
  type FinanceMobilePnlRow,
  type FinanceMobilePracticeRow,
} from "./finance-mobile-model"

type QueryResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

function requireRows<T>(source: string, result: QueryResult<T>): T[] {
  if (result.error) {
    throw new Error(`[finance-mobile-data] ${source}: ${result.error.message}`)
  }
  return result.data ?? []
}

export async function getFinanceMobileDashboardData(
  fiscalYear = new Date().getUTCFullYear(),
  asOfDate = new Date().toISOString().slice(0, 10),
): Promise<FinanceMobileDashboardData> {
  const supabase = await createClient()
  const fiscalStart = `${fiscalYear}-01-01`
  const fiscalEnd = `${fiscalYear + 1}-01-01`

  const [
    plansResult,
    criteriaResult,
    pnlResult,
    reportsResult,
    missionsResult,
    opportunitiesResult,
    companiesResult,
    practicesResult,
    engagementTypesResult,
  ] = await Promise.all([
    supabase
      .from("performance_plans")
      .select("id, fiscal_year, period_start, period_end, currency, status, updated_at")
      .eq("fiscal_year", fiscalYear)
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
    supabase
      .from("performance_criteria")
      .select("plan_id, code, target_value, performance_plans!inner(fiscal_year, status)")
      .in("code", ["billed_revenue", "gross_margin_pct"])
      .eq("performance_plans.fiscal_year", fiscalYear)
      .eq("performance_plans.status", "active"),
    supabase
      .from("pnl_monthly")
      .select("period_month, revenue_total, gross_margin_value, source")
      .gte("period_month", fiscalStart)
      .lt("period_month", fiscalEnd)
      .order("period_month", { ascending: true }),
    supabase
      .from("mission_activity_reports")
      .select("id, mission_id, period_start, billable_days, tjm_snapshot, activity_rate_percent, status")
      .eq("status", "validated")
      .gte("period_start", fiscalStart)
      .lt("period_start", fiscalEnd)
      .order("period_start", { ascending: true }),
    supabase
      .from("missions")
      .select("id, title, company_id, opportunity_id, practice, status, start_date, end_date, gross_margin_pct"),
    supabase
      .from("opportunities")
      .select("id, company_id, opportunity_type, practice, stage, estimated_gain, weighted_gain, start_date, target_close_date"),
    supabase.from("companies").select("id, name"),
    supabase
      .from("offer_practices")
      .select("slug, name, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("offer_engagement_types")
      .select("slug, name, billing_model, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ])

  const criteriaRows = requireRows(
    "performance_criteria",
    criteriaResult,
  ).map(({ plan_id, code, target_value }) => ({ plan_id, code, target_value }))

  return buildFinanceMobileDashboardData({
    fiscalYear,
    asOfDate,
    plans: requireRows<FinanceMobilePlanRow>("performance_plans", plansResult),
    criteria: criteriaRows satisfies FinanceMobileCriterionRow[],
    pnl: requireRows<FinanceMobilePnlRow>("pnl_monthly", pnlResult),
    activityReports: requireRows<FinanceMobileActivityReportRow>(
      "mission_activity_reports",
      reportsResult,
    ),
    missions: requireRows<FinanceMobileMissionRow>("missions", missionsResult),
    opportunities: requireRows<FinanceMobileOpportunityRow>(
      "opportunities",
      opportunitiesResult,
    ),
    companies: requireRows<FinanceMobileCompanyRow>("companies", companiesResult),
    practices: requireRows<FinanceMobilePracticeRow>(
      "offer_practices",
      practicesResult,
    ),
    engagementTypes: requireRows<FinanceMobileEngagementTypeRow>(
      "offer_engagement_types",
      engagementTypesResult,
    ),
  })
}
