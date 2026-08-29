import type { MissionActivityReport } from "@/components/missions/mission-detail/mission-detail-types"
import {
  ACTIVITY_THRESHOLDS,
  computeRealMarginPct,
} from "@/components/missions/mission-detail/mission-detail-utils"
import type {
  ActivityMissionSource,
  ActivityReportSource,
  EngagementsActivityAnalytics,
  EngagementsActivitySources,
  MarginRealityItem,
  ProductivityMonthPoint,
  UnplannedAbsenceMissionImpact,
} from "./engagements-activity-types"

// ─────────────────────────────────────────────────────────────────────────────
//  Agrégation pure (testée) de la vue « Activité & congés » Engagements.
//  Aucun accès réseau : le loader server-only lui passe les sources mappées.
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
] as const

function monthIndexOf(periodStart: string): number {
  // period_start est une date `YYYY-MM-DD` : lecture directe, pas de fuseau.
  const month = Number(periodStart.slice(5, 7))
  return Number.isFinite(month) ? month - 1 : -1
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function roundEuro(value: number): number {
  return Math.round(value)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Marge théorique courante d'une mission — logique canonique de
 * `computeTheoreticalMarginPct` (mission-detail-utils) : `gross_margin_pct`
 * généré en priorité, sinon `(TJM − CJM) / TJM`. Jamais recalculée à partir des
 * CRA (c'est le rôle de la marge réelle).
 */
function theoreticalMarginPct(mission: ActivityMissionSource): number | null {
  if (mission.grossMarginPct !== null) return mission.grossMarginPct
  if (mission.tjm <= 0) return null
  return Math.round(((mission.tjm - mission.cjm) / mission.tjm) * 100 * 100) / 100
}

/** Adapte une source CRA à la forme attendue par les helpers mission-detail. */
function toActivityReport(report: ActivityReportSource): MissionActivityReport {
  return {
    id: report.id,
    period_start: report.periodStart,
    period_end: report.periodEnd,
    status: report.status,
    billable_days: report.billableDays,
    non_billable_days: report.nonBillableDays,
    business_days: report.businessDays,
    pto_days: report.ptoDays,
    sick_days: report.sickDays,
    activity_rate_percent: report.activityRatePercent,
    tjm_snapshot: report.tjmSnapshot,
    cjm_snapshot: report.cjmSnapshot,
  }
}

export function buildEngagementsActivityAnalytics(
  sources: EngagementsActivitySources,
): EngagementsActivityAnalytics {
  const { now, issues, missions, reports, closures } = sources
  const year = now.getFullYear()
  const currentMonth = now.getMonth()
  const todayIso = now.toISOString().slice(0, 10)

  const missionById = new Map(missions.map((mission) => [mission.id, mission]))
  const reportsByMission = new Map<string, ActivityReportSource[]>()
  for (const report of reports) {
    const bucket = reportsByMission.get(report.missionId)
    if (bucket) bucket.push(report)
    else reportsByMission.set(report.missionId, [report])
  }

  // ── Bloc 1 — Productivité globale ─────────────────────────────────────────
  const monthly: ProductivityMonthPoint[] = MONTH_LABELS.map((label, monthIndex) => {
    const monthReports = reports.filter(
      (report) => monthIndexOf(report.periodStart) === monthIndex,
    )
    const ratedValues = monthReports
      .map((report) => report.activityRatePercent)
      .filter((value): value is number => value !== null)

    return {
      monthIndex,
      label,
      rate: ratedValues.length ? roundOne(average(ratedValues) ?? 0) : null,
      billableDays: roundOne(
        monthReports.reduce((sum, report) => sum + report.billableDays, 0),
      ),
      ptoDays: roundOne(monthReports.reduce((sum, report) => sum + report.ptoDays, 0)),
      sickDays: roundOne(monthReports.reduce((sum, report) => sum + report.sickDays, 0)),
      nonBillableDays: roundOne(
        monthReports.reduce((sum, report) => sum + report.nonBillableDays, 0),
      ),
      craCount: monthReports.length,
      isFuture: monthIndex > currentMonth,
    }
  })

  const ytdRatedValues = reports
    .filter((report) => monthIndexOf(report.periodStart) <= currentMonth)
    .map((report) => report.activityRatePercent)
    .filter((value): value is number => value !== null)
  const ytdAverageRate = ytdRatedValues.length
    ? roundOne(average(ytdRatedValues) ?? 0)
    : null

  // ── Bloc 2 — Fermetures sites clients ────────────────────────────────────
  const closureItems = closures
    .map((closure) => ({
      id: closure.id,
      companyName: closure.companyName,
      label: closure.label,
      startDate: closure.startDate,
      endDate: closure.endDate,
      isRecurring: closure.isRecurring,
      isSingleDay: closure.startDate === closure.endDate,
      isPast: closure.endDate < todayIso,
    }))
    .sort((a, b) => {
      // Prochaines fermetures d'abord (chronologique), passées ensuite.
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1
      return a.startDate.localeCompare(b.startDate)
    })

  // ── Bloc 3 — Rentabilité théorique vs réelle ─────────────────────────────
  const marginItems: MarginRealityItem[] = missions
    .map((mission) => {
      const missionReports = reportsByMission.get(mission.id) ?? []
      if (missionReports.length === 0) return null

      const realPct = computeRealMarginPct(missionReports.map(toActivityReport))
      const theoPct = theoreticalMarginPct(mission)
      if (realPct === null || theoPct === null) return null

      const billableDays = missionReports.reduce(
        (sum, report) => sum + report.billableDays,
        0,
      )
      if (billableDays <= 0) return null

      return {
        missionId: mission.id,
        title: mission.title,
        companyName: mission.companyName,
        collaboratorName: mission.collaboratorName,
        theoreticalPct: roundOne(theoPct),
        realPct: roundOne(realPct),
        gapPoints: roundOne(realPct - theoPct),
        billableDays: roundOne(billableDays),
      }
    })
    .filter((item): item is MarginRealityItem => item !== null)
    .sort((a, b) => a.gapPoints - b.gapPoints)

  const marginReality = {
    theoreticalAvg:
      marginItems.length > 0
        ? roundOne(average(marginItems.map((item) => item.theoreticalPct)) ?? 0)
        : null,
    realAvg:
      marginItems.length > 0
        ? roundOne(average(marginItems.map((item) => item.realPct)) ?? 0)
        : null,
    gapAvg:
      marginItems.length > 0
        ? roundOne(average(marginItems.map((item) => item.gapPoints)) ?? 0)
        : null,
    items: marginItems,
  }

  // ── Bloc 4 — Impact des absences non prévues ─────────────────────────────
  //  Signal d'absence imprévue = `sick_days` du CRA (HANDOFF §8). Impact estimé
  //  à partir des snapshots du CRA concerné, jamais des taux courants :
  //    CA non réalisé estimé     = sick_days × tjm_snapshot
  //    Marge non réalisée estimée = sick_days × (tjm_snapshot − cjm_snapshot)
  const absenceMonthly = MONTH_LABELS.map((label, monthIndex) => {
    const monthReports = reports.filter(
      (report) =>
        monthIndexOf(report.periodStart) === monthIndex && report.sickDays > 0,
    )
    return {
      monthIndex,
      label,
      days: roundOne(monthReports.reduce((sum, report) => sum + report.sickDays, 0)),
      lostRevenue: roundEuro(
        monthReports.reduce(
          (sum, report) => sum + report.sickDays * report.tjmSnapshot,
          0,
        ),
      ),
      lostMargin: roundEuro(
        monthReports.reduce(
          (sum, report) =>
            sum + report.sickDays * (report.tjmSnapshot - report.cjmSnapshot),
          0,
        ),
      ),
    }
  })

  const impactByMission = new Map<string, UnplannedAbsenceMissionImpact>()
  for (const report of reports) {
    if (report.sickDays <= 0) continue
    const mission = missionById.get(report.missionId)
    if (!mission) continue
    const existing = impactByMission.get(report.missionId) ?? {
      missionId: report.missionId,
      title: mission.title,
      companyName: mission.companyName,
      days: 0,
      lostRevenue: 0,
      lostMargin: 0,
    }
    existing.days += report.sickDays
    existing.lostRevenue += report.sickDays * report.tjmSnapshot
    existing.lostMargin += report.sickDays * (report.tjmSnapshot - report.cjmSnapshot)
    impactByMission.set(report.missionId, existing)
  }

  const topMissions = Array.from(impactByMission.values())
    .map((impact) => ({
      ...impact,
      days: roundOne(impact.days),
      lostRevenue: roundEuro(impact.lostRevenue),
      lostMargin: roundEuro(impact.lostMargin),
    }))
    .sort((a, b) => b.lostMargin - a.lostMargin)
    .slice(0, 3)

  const unplannedAbsences = {
    totalDays: roundOne(absenceMonthly.reduce((sum, month) => sum + month.days, 0)),
    estimatedLostRevenue: absenceMonthly.reduce(
      (sum, month) => sum + month.lostRevenue,
      0,
    ),
    estimatedLostMargin: absenceMonthly.reduce(
      (sum, month) => sum + month.lostMargin,
      0,
    ),
    monthly: absenceMonthly,
    topMissions,
  }

  return {
    year,
    generatedAt: now.toISOString(),
    status: issues.length > 0 ? "partial" : "complete",
    issues,
    productivity: {
      ytdAverageRate,
      targetRate: ACTIVITY_THRESHOLDS.TARGET,
      monthly,
    },
    closures: closureItems,
    marginReality,
    unplannedAbsences,
  }
}
