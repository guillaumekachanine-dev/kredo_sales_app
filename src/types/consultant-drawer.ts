// ─── Types et utilitaires pour ConsultantDrawer ───────────────────────────────

export interface DrawerSkillRef {
  id: string
  name: string
  category: string | null
}

export interface DrawerSkill {
  id: string
  level: number | null
  years: number | null
  confidence: number | null
  source: string | null
  skill: DrawerSkillRef
}

export interface DrawerPerson {
  full_name: string | null
  first_name: string | null
  last_name: string | null
  person_skills: DrawerSkill[]
}

export interface DrawerCompensation {
  gross_annual: number
  effective_to: string | null
}

export interface DrawerActivityReport {
  period_start: string
  billable_days: number
  business_days: number
  tjm_snapshot: number
  cjm_snapshot: number | null
  activity_rate_percent: number | null
}

export interface DrawerAbsence {
  id: string
  start_date: string
  end_date: string
  duration_days: number
  absence_type: string
}

export interface DrawerMission {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  tjm: number
  cjm: number
  gross_margin_pct: number | null
  company: { name: string } | null
  activity_reports: DrawerActivityReport[]
}

export interface DrawerConsultantData {
  id: string
  entry_date: string | null
  exit_date: string | null
  status: string
  current_title: string | null
  seniority: string | null
  practice: string | null
  person: DrawerPerson | null
  compensation: DrawerCompensation[]
  missions: DrawerMission[]
  absences: DrawerAbsence[]
}

// ─── Métriques calculées ──────────────────────────────────────────────────────

export interface ConsultantMetrics {
  /** Σ(billable_days × tjm_snapshot) */
  caGenere: number
  /** caGenere / Σ(billable_days) — null si aucun jour facturé */
  tjmMoyenFacture: number | null
  totalBillableDays: number
  /** Taux d'activité moyen (depuis activity_rate_percent GENERATED) */
  avgActivityRate: number | null
  /** Salaire brut annuel de la ligne active (effective_to IS NULL) */
  activeGrossAnnual: number | null
  /** (CA - coût employeur) / CA × 100 — null si CA = 0 */
  realMarginPct: number | null
}

export function computeMetrics(
  reports: DrawerActivityReport[],
  compensation: DrawerCompensation[],
): ConsultantMetrics {
  const totalBillable = reports.reduce((s, r) => s + r.billable_days, 0)
  const caGenere = reports.reduce((s, r) => s + r.billable_days * r.tjm_snapshot, 0)
  const tjmMoyenFacture = totalBillable > 0 ? caGenere / totalBillable : null

  const rated = reports.filter((r) => r.activity_rate_percent !== null)
  const avgActivityRate =
    rated.length > 0
      ? rated.reduce((s, r) => s + (r.activity_rate_percent ?? 0), 0) / rated.length
      : null

  const activeComp = compensation.find((c) => c.effective_to === null) ?? null

  const employerCost = reports.reduce((s, r) => s + r.billable_days * (r.cjm_snapshot ?? 0), 0)
  const realMarginPct =
    caGenere > 0 ? Math.round(((caGenere - employerCost) / caGenere) * 100) : null

  return {
    caGenere,
    tjmMoyenFacture,
    totalBillableDays: totalBillable,
    avgActivityRate,
    activeGrossAnnual: activeComp?.gross_annual ?? null,
    realMarginPct,
  }
}
