import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import {
  ConsultantsActivityDashboard,
  type AbsenceRow,
  type ActivityDashboardData,
  type ActivitySummaryRow,
  type ClientClosureRow,
  type CompensationRow,
  type ProfitabilityAlertRow,
  type YtdActivityRow,
} from "@/components/consultants/activite-conges/ConsultantsActivityDashboard"

export const dynamic = "force-dynamic"

type QueryResult<T> = {
  label: string
  data: T[]
  error: string | null
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<QueryResult<T>> {
  const { data, error } = await query

  return {
    label,
    data: data ?? [],
    error: error?.message ?? null,
  }
}

function sourceIssue(result: QueryResult<unknown>): string | null {
  if (!result.error) return null
  return `${result.label}: ${result.error}.`
}

export default async function ActiviteCongesPage() {
  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const supabase = await createClient()
  const db = supabase as unknown as SupabaseClient

  const [
    summaries,
    ytd,
    alerts,
    absences,
    closures,
    compensations,
  ] = await Promise.all([
    safeRead<ActivitySummaryRow>(
      "Activite mensuelle",
      db
        .from("v_collaborator_activity_summary")
        .select(`
          collaborator_id,
          full_name,
          entry_date,
          collab_status,
          period_start,
          business_days,
          billable_days,
          pto_days,
          sick_days,
          non_billable_days,
          activity_rate_percent,
          cra_status,
          tjm_snapshot,
          cjm_snapshot,
          revenue,
          employer_cost,
          real_margin,
          real_margin_pct,
          theoretical_margin_pct,
          daily_employer_cost,
          gross_annual
        `)
        .gte("period_start", yearStart)
        .lte("period_start", yearEnd)
        .order("period_start", { ascending: true })
        .returns<ActivitySummaryRow[]>()
    ),
    safeRead<YtdActivityRow>(
      "Activite YTD",
      db
        .from("v_collaborator_ytd_activity")
        .select(`
          collaborator_id,
          full_name,
          entry_date,
          year,
          months_covered,
          total_business_days,
          total_billable_days,
          total_pto_days,
          total_sick_days,
          total_non_billable_days,
          ytd_activity_rate,
          taci_target,
          gap_vs_target,
          ytd_revenue,
          ytd_employer_cost,
          ytd_real_margin
        `)
        .eq("year", year)
        .order("ytd_activity_rate", { ascending: true })
        .returns<YtdActivityRow[]>()
    ),
    safeRead<ProfitabilityAlertRow>(
      "Alertes rentabilite",
      db
        .from("v_profitability_alerts")
        .select(`
          collaborator_id,
          full_name,
          period_start,
          activity_rate_percent,
          real_margin_pct,
          cra_status,
          alert_low_activity,
          alert_low_margin,
          alert_negative_margin,
          alert_high_sick_days,
          alert_cra_not_validated
        `)
        .gte("period_start", yearStart)
        .lte("period_start", yearEnd)
        .order("real_margin_pct", { ascending: true })
        .returns<ProfitabilityAlertRow[]>()
    ),
    safeRead<AbsenceRow>(
      "Absences",
      db
        .from("collaborator_absences")
        .select(`
          id,
          collaborator_id,
          absence_type,
          start_date,
          end_date,
          duration_days,
          notes,
          collaborator:collaborators (
            id,
            current_title,
            practice,
            person:persons ( full_name )
          )
        `)
        .lte("start_date", yearEnd)
        .gte("end_date", yearStart)
        .order("start_date", { ascending: true })
        .returns<AbsenceRow[]>()
    ),
    safeRead<ClientClosureRow>(
      "Fermetures client",
      db
        .from("client_closures")
        .select(`
          id,
          company_id,
          start_date,
          end_date,
          label,
          is_recurring,
          notes,
          company:companies ( id, name )
        `)
        .lte("start_date", yearEnd)
        .gte("end_date", yearStart)
        .order("start_date", { ascending: true })
        .returns<ClientClosureRow[]>()
    ),
    safeRead<CompensationRow>(
      "Compensation",
      db
        .from("collaborator_compensation")
        .select(`
          id,
          collaborator_id,
          effective_from,
          effective_to,
          gross_annual,
          charges_rate,
          working_days_per_year,
          taci,
          cjm,
          collaborator:collaborators (
            id,
            current_title,
            person:persons ( full_name )
          )
        `)
        .is("effective_to", null)
        .order("effective_from", { ascending: false })
        .returns<CompensationRow[]>()
    ),
  ])

  const results = [summaries, ytd, alerts, absences, closures, compensations]
  const dashboardData: ActivityDashboardData = {
    year,
    generatedAt: new Date().toISOString(),
    summaries: summaries.data,
    ytd: ytd.data,
    alerts: alerts.data,
    absences: absences.data,
    closures: closures.data,
    compensations: compensations.data,
    sourceIssues: results
      .map((result) => sourceIssue(result))
      .filter((issue): issue is string => Boolean(issue)),
  }

  return <ConsultantsActivityDashboard data={dashboardData} />
}
