// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — chapitre Activités & congés (Lot 5)
//
//  Types de lignes brutes (vues + tables) et view-model consommé par
//  `ActivityDashboard`. Produit par `get-consultants-activity.ts`.
// ─────────────────────────────────────────────────────────────────────────────

export type ActivitySummaryRow = {
  collaborator_id: string
  full_name: string | null
  entry_date: string | null
  collab_status: string | null
  period_start: string
  business_days: number | null
  billable_days: number | null
  pto_days: number | null
  sick_days: number | null
  non_billable_days: number | null
  activity_rate_percent: number | null
  cra_status: string | null
  tjm_snapshot: number | null
  cjm_snapshot: number | null
  revenue: number | null
  employer_cost: number | null
  real_margin: number | null
  real_margin_pct: number | null
  theoretical_margin_pct: number | null
  daily_employer_cost: number | null
  gross_annual: number | null
}

export type YtdActivityRow = {
  collaborator_id: string
  full_name: string | null
  entry_date: string | null
  year: number | null
  months_covered: number | null
  total_business_days: number | null
  total_billable_days: number | null
  total_pto_days: number | null
  total_sick_days: number | null
  total_non_billable_days: number | null
  ytd_activity_rate: number | null
  taci_target: number | null
  gap_vs_target: number | null
  ytd_revenue: number | null
  ytd_employer_cost: number | null
  ytd_real_margin: number | null
}

export type ProfitabilityAlertRow = {
  collaborator_id: string
  full_name: string | null
  period_start: string
  activity_rate_percent: number | null
  real_margin_pct: number | null
  cra_status: string | null
  alert_low_activity: boolean | null
  alert_low_margin: boolean | null
  alert_negative_margin: boolean | null
  alert_high_sick_days: boolean | null
  alert_cra_not_validated: boolean | null
}

export type AbsenceType =
  | "conge_paye"
  | "rtt"
  | "maladie"
  | "sans_solde"
  | "contrainte_perso"
  | "formation"
  | "fermeture_client"
  | "autre"

export type AbsenceRow = {
  id: string
  collaborator_id: string
  absence_type: AbsenceType
  start_date: string
  end_date: string
  duration_days: number
  notes: string | null
  collaborator: {
    id: string
    current_title: string | null
    practice: string | null
    person: { full_name: string | null } | null
  } | null
}

export type ClientClosureRow = {
  id: string
  company_id: string
  start_date: string
  end_date: string
  label: string
  is_recurring: boolean
  notes: string | null
  company: { id: string; name: string | null } | null
}

export type CompensationRow = {
  id: string
  collaborator_id: string
  effective_from: string
  effective_to: string | null
  gross_annual: number | null
  charges_rate: number | null
  working_days_per_year: number | null
  taci: number | null
  cjm: number | null
  collaborator: {
    id: string
    current_title: string | null
    person: { full_name: string | null } | null
  } | null
}

export type ActivityDashboardData = {
  year: number
  generatedAt: string
  summaries: ActivitySummaryRow[]
  ytd: YtdActivityRow[]
  alerts: ProfitabilityAlertRow[]
  absences: AbsenceRow[]
  closures: ClientClosureRow[]
  compensations: CompensationRow[]
  sourceIssues: string[]
}
