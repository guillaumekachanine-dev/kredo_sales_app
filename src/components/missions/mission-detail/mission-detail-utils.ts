import type {
  MissionActivityReport,
  MissionSummary,
  MissionCompensation,
  MissionDetailTabId,
} from "./mission-detail-types"

// ─── Seuils métier centralisés ────────────────────────────────────────────────

export const ACTIVITY_THRESHOLDS = {
  LOW: 70,
  TARGET: 85,
  NON_BILLABLE_ALERT: 5,
  SICK_ALERT: 5,
} as const

export const MARGIN_THRESHOLDS = {
  LOW: 15,
  GOOD: 25,
} as const

// ─── Labels des statuts CRA ───────────────────────────────────────────────────

export const CRA_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumis",
  validated: "Validé",
  rejected: "Rejeté",
}

export function getCraStatusLabel(status: string): string {
  return CRA_STATUS_LABELS[status.toLowerCase()] ?? status
}

// ─── Parsing dates ────────────────────────────────────────────────────────────

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getYearsSince(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const date = parseDateOnly(dateStr)
  if (!date) return null
  const today = new Date()
  let diff = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    diff--
  }
  return diff > 0 ? `${diff} ${diff > 1 ? "ans" : "an"}` : "Moins d'un an"
}

export function getMissionDurationMonths(
  startDate: string | null,
  endDate: string | null
): number | null {
  if (!startDate || !endDate) return null
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  if (!start || !end || end < start) return null
  const diffDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  )
  return Math.max(1, Math.round(diffDays / 30.44))
}

export function isEndingSoon(endDate: string | null, daysThreshold = 30): boolean {
  if (!endDate) return false
  const end = parseDateOnly(endDate)
  if (!end) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  return diffDays >= 0 && diffDays <= daysThreshold
}

// ─── Calculs financiers (depuis les CRA) ─────────────────────────────────────

/** CA réel depuis le début de la mission (billable_days × tjm_snapshot par CRA) */
export function computeTotalRevenue(reports: MissionActivityReport[]): number {
  return reports.reduce((sum, r) => sum + r.billable_days * r.tjm_snapshot, 0)
}

/** CA YTD : CRA de l'année civile en cours */
export function computeYtdRevenue(reports: MissionActivityReport[]): number {
  const year = new Date().getFullYear()
  return reports
    .filter((r) => r.period_start.startsWith(String(year)))
    .reduce((sum, r) => sum + r.billable_days * r.tjm_snapshot, 0)
}

/** Marge réelle calculée sur les snapshots des CRA (ne jamais utiliser TJM/CJM actuel) */
export function computeRealMarginPct(reports: MissionActivityReport[]): number | null {
  const totalRevenue = computeTotalRevenue(reports)
  if (totalRevenue <= 0) return null
  const totalCost = reports.reduce(
    (sum, r) => sum + r.billable_days * r.cjm_snapshot,
    0
  )
  return Math.round(((totalRevenue - totalCost) / totalRevenue) * 100 * 100) / 100
}

/** Jours facturables totaux depuis le début */
export function computeTotalBillableDays(reports: MissionActivityReport[]): number {
  return reports.reduce((sum, r) => sum + r.billable_days, 0)
}

/** Jours facturables YTD */
export function computeYtdBillableDays(reports: MissionActivityReport[]): number {
  const year = new Date().getFullYear()
  return reports
    .filter((r) => r.period_start.startsWith(String(year)))
    .reduce((sum, r) => sum + r.billable_days, 0)
}

/** Taux d'activité global (moyenne pondérée des activity_rate_percent non nuls) */
export function computeOverallActivityRate(
  reports: MissionActivityReport[]
): number | null {
  const rated = reports.filter((r) => r.activity_rate_percent !== null)
  if (rated.length === 0) return null
  return (
    rated.reduce((sum, r) => sum + (r.activity_rate_percent ?? 0), 0) /
    rated.length
  )
}

/** Taux d'activité YTD */
export function computeYtdActivityRate(
  reports: MissionActivityReport[]
): number | null {
  const year = new Date().getFullYear()
  const ytd = reports.filter(
    (r) => r.period_start.startsWith(String(year)) && r.activity_rate_percent !== null
  )
  if (ytd.length === 0) return null
  return (
    ytd.reduce((sum, r) => sum + (r.activity_rate_percent ?? 0), 0) / ytd.length
  )
}

/** Estimation de la valeur totale contractuelle — clairement marquée "estimation" */
export function computeEstimatedContractValue(
  mission: MissionSummary
): number | null {
  if (!mission.start_date) return null
  // Ne présenter une valeur que si la date de fin est connue (sinon ce n'est pas contractuel)
  if (!mission.end_date) return null
  const start = parseDateOnly(mission.start_date)
  const end = parseDateOnly(mission.end_date)
  if (!start || !end || end <= start) return null
  const diffMs = end.getTime() - start.getTime()
  const calendarDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  // Approximation : 5/7 des jours calendaires × TJM
  const workingDaysEstimate = Math.round((calendarDays * 5) / 7)
  return workingDaysEstimate * mission.tjm
}

/** Marge théorique depuis les champs courants (pour comparaison avec la marge réelle) */
export function computeTheoreticalMarginPct(mission: MissionSummary): number | null {
  if (mission.gross_margin_pct !== null) return mission.gross_margin_pct
  if (mission.tjm <= 0) return null
  return Math.round(((mission.tjm - mission.cjm) / mission.tjm) * 100 * 100) / 100
}

/** Salaire mensuel estimé (admin : gross_annual ; fallback : heuristique CJM) */
export function computeEstimatedMonthlySalary(
  cjm: number,
  compensation: MissionCompensation | null
): number {
  if (compensation?.gross_annual != null) {
    return Math.round(compensation.gross_annual / 12)
  }
  const workingDaysPerYear = compensation?.working_days_per_year ?? 218
  const chargesRate = compensation?.charges_rate ?? 0.45
  const taci = compensation?.taci ?? 0.85
  const grossAnnualFallback = (cjm * workingDaysPerYear * taci) / (1 + chargesRate)
  return Math.round(grossAnnualFallback / 12)
}

// ─── Alertes CRA ──────────────────────────────────────────────────────────────

export interface CraAlert {
  id: string
  severity: "danger" | "warning"
  message: string
}

export function buildCraAlerts(reports: MissionActivityReport[]): CraAlert[] {
  const alerts: CraAlert[] = []
  if (reports.length === 0) return alerts

  const now = new Date()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 7)

  const hasPrevMonth = reports.some((r) => r.period_start.startsWith(prevMonthStart))
  if (!hasPrevMonth) {
    alerts.push({
      id: "missing-prev-month",
      severity: "warning",
      message: `CRA du mois précédent (${prevMonthStart}) absent ou non saisi.`,
    })
  }

  const pendingReports = reports.filter((r) =>
    ["draft", "submitted", "rejected"].includes(r.status)
  )
  if (pendingReports.length > 0) {
    alerts.push({
      id: "pending-cra",
      severity: "warning",
      message: `${pendingReports.length} CRA non validé${pendingReports.length > 1 ? "s" : ""} (brouillon, soumis ou rejeté).`,
    })
  }

  const overallRate = computeOverallActivityRate(reports)
  if (overallRate !== null && overallRate < ACTIVITY_THRESHOLDS.LOW) {
    alerts.push({
      id: "low-activity",
      severity: "danger",
      message: `Taux d'activité global (${overallRate.toFixed(0)}%) inférieur au seuil de ${ACTIVITY_THRESHOLDS.LOW}%.`,
    })
  }

  const highNonBillable = reports.filter(
    (r) => r.non_billable_days >= ACTIVITY_THRESHOLDS.NON_BILLABLE_ALERT
  )
  if (highNonBillable.length > 0) {
    alerts.push({
      id: "high-non-billable",
      severity: "warning",
      message: `${highNonBillable.length} période${highNonBillable.length > 1 ? "s" : ""} avec ≥ ${ACTIVITY_THRESHOLDS.NON_BILLABLE_ALERT}j non facturables.`,
    })
  }

  const inconsistentReports = reports.filter(
    (r) =>
      r.business_days > 0 &&
      r.billable_days + r.non_billable_days + r.pto_days + r.sick_days >
        r.business_days * 1.05 // tolérance 5%
  )
  if (inconsistentReports.length > 0) {
    alerts.push({
      id: "inconsistent",
      severity: "warning",
      message: `${inconsistentReports.length} CRA avec des jours déclarés supérieurs aux jours ouvrés.`,
    })
  }

  return alerts
}

// ─── Label mois (pour affichage des CRA) ─────────────────────────────────────

export function getPeriodLabel(periodStart: string): string {
  const date = parseDateOnly(periodStart)
  if (!date) return "Période inconnue"
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// ─── Collaborateur name helper ────────────────────────────────────────────────

export function getCollaboratorName(
  person: { full_name: string | null; first_name: string | null; last_name: string | null } | null
): string {
  if (!person) return "Consultant non renseigné"
  return (
    person.full_name ||
    `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
    "Consultant non renseigné"
  )
}

// ─── Tab id guard ─────────────────────────────────────────────────────────────

const VALID_TABS: MissionDetailTabId[] = [
  "synthesis",
  "collaborator",
  "planning",
  "activity",
  "financial",
]

export function isValidTabId(value: string): value is MissionDetailTabId {
  return (VALID_TABS as string[]).includes(value)
}
