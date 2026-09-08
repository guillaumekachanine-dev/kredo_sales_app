// ─────────────────────────────────────────────────────────────────────────────
//  Production & Congés — Types du Data Contract (Lot 11)
//
//  Granularité canonique : 1 collaborateur × 1 mois (C-30).
//  Aucun planning journalier de production fictif (C-08).
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthlyAbsenceBreakdownItem {
  type: string
  label: string
  days: number
  estimatedRevenueImpact: number | null
}

export interface MonthlyAbsenceItem {
  id: string
  type: string
  startDate: string
  endDate: string
  durationDays: number | null
}

export interface CollaboratorMonthlyProduction {
  month: string // "YYYY-MM"

  businessDays: number
  productionDays: number
  nonBillableDays: number

  ptoDays: number
  sickDays: number
  otherAbsenceDays: number

  productivityRate: number | null
  targetRate: number | null
  gapVsTarget: number | null

  revenue: number | null
  targetRevenue: number | null
  revenueGap: number | null

  structuralCost: number | null
  margin: number | null
  targetMargin: number | null
  marginGap: number | null

  absenceBreakdown: MonthlyAbsenceBreakdownItem[]
  absences: MonthlyAbsenceItem[]
}

export interface YtdProductivity {
  productivityRate: number | null
  targetRate: number | null
  gapVsTarget: number | null
}

export interface ProductionLeaveCollaborator {
  collaboratorId: string
  personId: string
  fullName: string
  currentTitle: string | null
  practiceKey: string | null
  practiceLabel: string | null

  currentMonth: CollaboratorMonthlyProduction | null
  ytd: YtdProductivity
  history: CollaboratorMonthlyProduction[]
}

export interface ProductionLeaveViewModel {
  referenceMonth: string
  availableMonths: string[]
  collaborators: ProductionLeaveCollaborator[]
  dataNotes: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Entrées brutes pour le builder pur
// ─────────────────────────────────────────────────────────────────────────────

export interface RawActiveCollaborator {
  id: string
  status: string | null
  current_title: string | null
  practice: string | null
  job_profile_id: string | null
  person_id: string
  full_name: string
}

export interface RawActivitySummary {
  collaborator_id: string
  period_start: string // e.g. "2026-09-01" or "2026-09-07"
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
  gross_annual: number | null
}

export interface RawYtdActivity {
  collaborator_id: string
  year: number | null
  ytd_activity_rate: number | null
  taci_target: number | null
  gap_vs_target: number | null
}

export interface RawAbsence {
  id: string
  collaborator_id: string
  absence_type: string
  start_date: string
  end_date: string
  duration_days: number
  notes: string | null
}

export interface RawCompensation {
  collaborator_id: string
  gross_annual: number | null
  charges_rate: number | null
  working_days_per_year: number | null
  taci: number | null
  cjm: number | null
  variable_pay?: number | null
}

export interface BuildProductionLeaveInput {
  referenceMonth?: string | null
  collaborators: RawActiveCollaborator[]
  activitySummaries: RawActivitySummary[]
  ytdActivities: RawYtdActivity[]
  absences: RawAbsence[]
  compensations: RawCompensation[]
  offerPractices?: Array<{ id: string; slug: string; name: string }>
  jobProfiles?: Array<{ id: string; practice_id: string | null }>
  compensationReadable: boolean
}
