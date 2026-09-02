import { asNumber, daysBetween, parseDate, toDateKey } from "./shared"

// ─────────────────────────────────────────────────────────────────────────────
//  Runway des engagements — règles pures.
//
//  « Anticiper les échéances » consolide sur 90 jours ce qui va tomber et qui
//  demande une décision maintenant : fins de mission, closings attendus,
//  absences longues, fermetures de sites clients.
//
//  Deux invariants :
//   • aucun montant n'est inventé — le CA d'une fin de mission est celui du
//     dernier CRA constaté (billable_days × tjm_snapshot), et vaut `null` quand
//     aucun CRA n'existe. Un TJM × un nombre de jours supposé serait une
//     projection déguisée en fait ;
//   • les tranches ne se chevauchent pas. Un élément tombe dans exactement une
//     tranche, le cumul 90 jours est calculé, jamais additionné à la main.
// ─────────────────────────────────────────────────────────────────────────────

export type DeadlineHorizon = "overdue" | "d30" | "d60" | "d90"

export type DeadlineKind =
  | "mission_end"
  | "opportunity_close"
  | "long_absence"
  | "client_closure"

export type DeadlineSeverity = "critical" | "warning" | "info"

export type UpcomingDeadline = {
  id: string
  kind: DeadlineKind
  horizon: DeadlineHorizon
  severity: DeadlineSeverity
  date: string
  daysUntil: number
  title: string
  detail: string
  /** Montant en euros lorsqu'il est constaté, jamais projeté. */
  amountEur: number | null
  /** Jours d'indisponibilité, pour les absences et fermetures. */
  impactDays: number | null
  link: string
}

export type HorizonSummary = {
  horizon: DeadlineHorizon
  count: number
  missionsEndingCount: number
  /** CA mensuel constaté des missions qui se terminent dans la tranche. */
  revenueAtRiskEur: number
  /** Gain pondéré des opportunités attendues dans la tranche. */
  weightedPipelineEur: number
}

export type UpcomingDeadlinesRulesResult = {
  deadlines: UpcomingDeadline[]
  horizons: HorizonSummary[]
  totals: {
    count: number
    missionsEndingCount: number
    revenueAtRiskEur: number
    weightedPipelineEur: number
    unavailabilityDays: number
  }
}

export type DeadlineMissionRow = {
  id: string
  title: string
  status: string | null
  endDate: string | null
  companyId: string | null
  companyName: string | null
  collaboratorName: string | null
  /** CA mensuel constaté du dernier CRA de la mission. */
  lastMonthRevenueEur: number | null
}

export type DeadlineOpportunityRow = {
  id: string
  title: string
  stage: string | null
  targetCloseDate: string | null
  companyName: string | null
  weightedGain: number | null
}

export type DeadlineAbsenceRow = {
  id: string
  collaboratorName: string | null
  absenceType: string | null
  startDate: string | null
  durationDays: number | null
}

export type DeadlineClosureRow = {
  id: string
  label: string | null
  companyName: string | null
  startDate: string | null
  endDate: string | null
}

export type BuildUpcomingDeadlinesInput = {
  now: string
  missions: DeadlineMissionRow[]
  opportunities: DeadlineOpportunityRow[]
  absences: DeadlineAbsenceRow[]
  closures: DeadlineClosureRow[]
}

export const HORIZON_ORDER: DeadlineHorizon[] = ["overdue", "d30", "d60", "d90"]

/** Seuil au-delà duquel une absence pèse réellement sur le staffing. */
export const LONG_ABSENCE_MIN_DAYS = 5

const HORIZON_RANK: Record<DeadlineHorizon, number> = {
  overdue: 0,
  d30: 1,
  d60: 2,
  d90: 3,
}

const SEVERITY_RANK: Record<DeadlineSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

/**
 * Tranche d'un nombre de jours. `null` = hors fenêtre : soit trop loin
 * (> 90 jours), soit une date illisible. Les tranches sont disjointes.
 */
export function resolveHorizon(daysUntil: number): DeadlineHorizon | null {
  if (!Number.isFinite(daysUntil)) return null
  if (daysUntil < 0) return "overdue"
  if (daysUntil <= 30) return "d30"
  if (daysUntil <= 60) return "d60"
  if (daysUntil <= 90) return "d90"
  return null
}

function severityFor(kind: DeadlineKind, horizon: DeadlineHorizon): DeadlineSeverity {
  // Une fin de mission ou un closing en retard arrête ou compromet du CA :
  // c'est critique quel que soit le reste. Les absences et fermetures se
  // préparent, elles n'appellent pas la même urgence.
  if (kind === "mission_end" || kind === "opportunity_close") {
    if (horizon === "overdue" || horizon === "d30") return "critical"
    if (horizon === "d60") return "warning"
    return "info"
  }
  return horizon === "d30" || horizon === "overdue" ? "warning" : "info"
}

function formatEur(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} €`
}

export function buildUpcomingDeadlines(
  input: BuildUpcomingDeadlinesInput,
): UpcomingDeadlinesRulesResult {
  const now = parseDate(input.now)
  if (!now) {
    return {
      deadlines: [],
      horizons: HORIZON_ORDER.map((horizon) => emptyHorizon(horizon)),
      totals: { count: 0, missionsEndingCount: 0, revenueAtRiskEur: 0, weightedPipelineEur: 0, unavailabilityDays: 0 },
    }
  }

  const today = parseDate(toDateKey(now)) ?? now
  const deadlines: UpcomingDeadline[] = []

  for (const mission of input.missions) {
    if (mission.status && mission.status !== "active") continue
    const date = parseDate(mission.endDate)
    if (!date) continue
    const daysUntil = daysBetween(today, date)
    const horizon = resolveHorizon(daysUntil)
    if (!horizon) continue

    const revenue = mission.lastMonthRevenueEur
    deadlines.push({
      id: `mission_end:${mission.id}`,
      kind: "mission_end",
      horizon,
      severity: severityFor("mission_end", horizon),
      date: toDateKey(date),
      daysUntil,
      title: `Fin de mission — ${mission.title}`,
      detail: [
        mission.companyName,
        mission.collaboratorName,
        revenue === null ? "CA mensuel inconnu (aucun CRA)" : `${formatEur(revenue)} / mois constatés`,
      ].filter(Boolean).join(" · "),
      amountEur: revenue,
      impactDays: null,
      link: `/missions/actives`,
    })
  }

  for (const opportunity of input.opportunities) {
    const date = parseDate(opportunity.targetCloseDate)
    if (!date) continue
    const daysUntil = daysBetween(today, date)
    const horizon = resolveHorizon(daysUntil)
    if (!horizon) continue

    const weighted = opportunity.weightedGain
    deadlines.push({
      id: `opportunity_close:${opportunity.id}`,
      kind: "opportunity_close",
      horizon,
      severity: severityFor("opportunity_close", horizon),
      date: toDateKey(date),
      daysUntil,
      title: `${horizon === "overdue" ? "Closing dépassé" : "Closing attendu"} — ${opportunity.title}`,
      detail: [
        opportunity.companyName,
        weighted === null ? "Gain pondéré inconnu" : `${formatEur(weighted)} pondérés`,
      ].filter(Boolean).join(" · "),
      amountEur: weighted,
      impactDays: null,
      link: `/missions/opps/${opportunity.id}`,
    })
  }

  for (const absence of input.absences) {
    const duration = asNumber(absence.durationDays)
    if (duration < LONG_ABSENCE_MIN_DAYS) continue
    const date = parseDate(absence.startDate)
    if (!date) continue
    const daysUntil = daysBetween(today, date)
    const horizon = resolveHorizon(daysUntil)
    if (!horizon || horizon === "overdue") continue

    deadlines.push({
      id: `long_absence:${absence.id}`,
      kind: "long_absence",
      horizon,
      severity: severityFor("long_absence", horizon),
      date: toDateKey(date),
      daysUntil,
      title: `Absence longue — ${absence.collaboratorName ?? "Collaborateur"}`,
      detail: [absence.absenceType?.replaceAll("_", " "), `${duration} jours`].filter(Boolean).join(" · "),
      amountEur: null,
      impactDays: duration,
      link: "/consultants/activite-conges",
    })
  }

  for (const closure of input.closures) {
    const date = parseDate(closure.startDate)
    if (!date) continue
    const daysUntil = daysBetween(today, date)
    const horizon = resolveHorizon(daysUntil)
    if (!horizon || horizon === "overdue") continue

    const end = parseDate(closure.endDate)
    const impactDays = end ? Math.max(1, daysBetween(date, end) + 1) : null

    deadlines.push({
      id: `client_closure:${closure.id}`,
      kind: "client_closure",
      horizon,
      severity: severityFor("client_closure", horizon),
      date: toDateKey(date),
      daysUntil,
      title: `Fermeture client — ${closure.companyName ?? closure.label ?? "Site client"}`,
      detail: [closure.label, impactDays ? `${impactDays} jours non facturables` : null]
        .filter(Boolean).join(" · "),
      amountEur: null,
      impactDays,
      link: "/consultants/activite-conges",
    })
  }

  deadlines.sort((a, b) => (
    HORIZON_RANK[a.horizon] - HORIZON_RANK[b.horizon] ||
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    a.daysUntil - b.daysUntil ||
    a.title.localeCompare(b.title)
  ))

  const horizons = HORIZON_ORDER.map((horizon) => {
    const bucket = deadlines.filter((deadline) => deadline.horizon === horizon)
    return {
      horizon,
      count: bucket.length,
      missionsEndingCount: bucket.filter((deadline) => deadline.kind === "mission_end").length,
      revenueAtRiskEur: bucket
        .filter((deadline) => deadline.kind === "mission_end")
        .reduce((total, deadline) => total + asNumber(deadline.amountEur), 0),
      weightedPipelineEur: bucket
        .filter((deadline) => deadline.kind === "opportunity_close")
        .reduce((total, deadline) => total + asNumber(deadline.amountEur), 0),
    }
  })

  return {
    deadlines,
    horizons,
    totals: {
      count: deadlines.length,
      missionsEndingCount: horizons.reduce((total, horizon) => total + horizon.missionsEndingCount, 0),
      revenueAtRiskEur: horizons.reduce((total, horizon) => total + horizon.revenueAtRiskEur, 0),
      weightedPipelineEur: horizons.reduce((total, horizon) => total + horizon.weightedPipelineEur, 0),
      unavailabilityDays: deadlines.reduce((total, deadline) => total + asNumber(deadline.impactDays), 0),
    },
  }
}

function emptyHorizon(horizon: DeadlineHorizon): HorizonSummary {
  return { horizon, count: 0, missionsEndingCount: 0, revenueAtRiskEur: 0, weightedPipelineEur: 0 }
}
