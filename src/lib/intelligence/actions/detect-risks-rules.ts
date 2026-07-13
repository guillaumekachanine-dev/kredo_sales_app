import { asNumber, daysBetween, formatDayCount, parseDate } from "./shared"

export type RiskSeverity = "critical" | "warning" | "info"
export type RiskCategory = "margin" | "activity" | "staffing" | "billing" | "retention"

export type DetectedRisk = {
  id: string
  severity: RiskSeverity
  category: RiskCategory
  title: string
  detail: string
  entityType: "mission" | "collaborator" | "company"
  entityId: string
  entityLabel: string
  suggestedAction: string
  link: string
}

export type DetectRisksSummary = {
  criticalCount: number
  warningCount: number
  healthyMissionsCount: number
  healthyMissionsPct: number
}

export type DetectRisksRulesResult = {
  risks: DetectedRisk[]
  summary: DetectRisksSummary
}

export type DetectRiskAlertRow = {
  collaboratorId: string | null
  fullName: string | null
  periodStart: string | null
  activityRatePercent: number | null
  realMarginPct: number | null
  alertLowActivity: boolean | null
  alertLowMargin: boolean | null
  alertNegativeMargin: boolean | null
  alertHighSickDays: boolean | null
}

export type DetectRiskMissionRow = {
  id: string
  title: string
  status: string | null
  endDate: string | null
  companyId: string
  companyName: string | null
}

export type DetectRiskActivityReportRow = {
  id: string
  missionId: string
  periodStart: string
  status: string
  billableDays: number
  tjmSnapshot: number
}

export type BuildDetectRisksInput = {
  now: string
  alerts: DetectRiskAlertRow[]
  missions: DetectRiskMissionRow[]
  activityReports: DetectRiskActivityReportRow[]
}

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

function pushRisk(risks: DetectedRisk[], risk: DetectedRisk) {
  if (risks.some((existing) => existing.id === risk.id)) return
  risks.push(risk)
}

export function computeRevenueConcentration(
  reports: DetectRiskActivityReportRow[],
  missions: DetectRiskMissionRow[],
): Array<{ companyId: string; companyName: string; revenue: number; share: number }> {
  const missionById = new Map(missions.map((mission) => [mission.id, mission]))
  const revenueByCompany = new Map<string, { companyName: string; revenue: number }>()

  for (const report of reports) {
    const mission = missionById.get(report.missionId)
    if (!mission) continue
    const revenue = asNumber(report.billableDays) * asNumber(report.tjmSnapshot)
    if (revenue <= 0) continue
    const current = revenueByCompany.get(mission.companyId) ?? { companyName: mission.companyName ?? "Client", revenue: 0 }
    current.revenue += revenue
    revenueByCompany.set(mission.companyId, current)
  }

  const total = Array.from(revenueByCompany.values()).reduce((sum, row) => sum + row.revenue, 0)
  if (total <= 0) return []

  return Array.from(revenueByCompany.entries())
    .map(([companyId, row]) => ({ companyId, companyName: row.companyName, revenue: row.revenue, share: row.revenue / total }))
    .sort((a, b) => b.share - a.share)
}

export function buildDetectRisks(input: BuildDetectRisksInput): DetectRisksRulesResult {
  const now = parseDate(input.now) ?? new Date()
  const risks: DetectedRisk[] = []
  const missionRiskIds = new Set<string>()

  for (const alert of input.alerts) {
    if (!alert.collaboratorId) continue
    const label = alert.fullName ?? "Collaborateur"
    const period = alert.periodStart ? alert.periodStart.slice(0, 7) : "période courante"
    if (alert.alertNegativeMargin) {
      pushRisk(risks, {
        id: `negative-margin:${alert.collaboratorId}:${period}`,
        severity: "critical",
        category: "margin",
        title: "Marge négative",
        detail: `${label} présente une marge réelle négative sur ${period}.`,
        entityType: "collaborator",
        entityId: alert.collaboratorId,
        entityLabel: label,
        suggestedAction: "Identifier la mission contributrice et renégocier TJM ou staffing.",
        link: `/consultants/activite-conges?collaborator=${alert.collaboratorId}`,
      })
    } else if (alert.alertLowMargin) {
      pushRisk(risks, {
        id: `low-margin:${alert.collaboratorId}:${period}`,
        severity: "warning",
        category: "margin",
        title: "Marge sous 15%",
        detail: `${label} est sous le seuil de marge cible${alert.realMarginPct !== null ? ` (${alert.realMarginPct.toFixed(1)}%)` : ""}.`,
        entityType: "collaborator",
        entityId: alert.collaboratorId,
        entityLabel: label,
        suggestedAction: "Revoir TJM, charge ou affectation avant le prochain CRA.",
        link: `/consultants/activite-conges?collaborator=${alert.collaboratorId}`,
      })
    }

    if (alert.alertLowActivity) {
      pushRisk(risks, {
        id: `low-activity:${alert.collaboratorId}:${period}`,
        severity: "warning",
        category: "activity",
        title: "Activité sous 70%",
        detail: `${label} est sous le seuil d'activité${alert.activityRatePercent !== null ? ` (${alert.activityRatePercent.toFixed(1)}%)` : ""}.`,
        entityType: "collaborator",
        entityId: alert.collaboratorId,
        entityLabel: label,
        suggestedAction: "Qualifier la cause : intercontrat, absence, CRA incomplet ou sous-charge.",
        link: `/consultants/activite-conges?collaborator=${alert.collaboratorId}`,
      })
    }

    if (alert.alertHighSickDays) {
      pushRisk(risks, {
        id: `sick-days:${alert.collaboratorId}:${period}`,
        severity: "warning",
        category: "staffing",
        title: "Absences maladie élevées",
        detail: `${label} dépasse le seuil d'alerte maladie sur ${period}.`,
        entityType: "collaborator",
        entityId: alert.collaboratorId,
        entityLabel: label,
        suggestedAction: "Prévoir un point RH et sécuriser la continuité mission.",
        link: `/consultants/activite-conges?collaborator=${alert.collaboratorId}`,
      })
    }
  }

  for (const report of input.activityReports) {
    if (report.status !== "draft") continue
    const mission = input.missions.find((item) => item.id === report.missionId)
    pushRisk(risks, {
      id: `cra-draft:${report.missionId}:${report.periodStart}`,
      severity: "warning",
      category: "billing",
      title: "CRA non validé",
      detail: `Le CRA ${report.periodStart.slice(0, 7)} est encore en brouillon.`,
      entityType: "mission",
      entityId: report.missionId,
      entityLabel: mission?.title ?? "Mission",
      suggestedAction: "Relancer la soumission et validation avant facturation.",
      link: `/missions/actives/${report.missionId}`,
    })
    missionRiskIds.add(report.missionId)
  }

  for (const mission of input.missions) {
    if (mission.status !== "active") continue
    const daysToEnd = mission.endDate ? daysBetween(now, mission.endDate) : Number.POSITIVE_INFINITY
    if (daysToEnd > 60) continue
    const severity: RiskSeverity = daysToEnd <= 30 ? "critical" : "info"
    pushRisk(risks, {
      id: `mission-ending:${mission.id}`,
      severity,
      category: "retention",
      title: daysToEnd <= 30 ? "Mission finit sous 30 jours" : "Mission finit sous 60 jours",
      detail: `${mission.title} chez ${mission.companyName ?? "client"} finit ${formatDayCount(Math.max(0, daysToEnd))}.`,
      entityType: "mission",
      entityId: mission.id,
      entityLabel: mission.title,
      suggestedAction: daysToEnd <= 30 ? "Arbitrer renouvellement, extension ou sortie cette semaine." : "Préparer le point de renouvellement.",
      link: `/missions/actives/${mission.id}`,
    })
    missionRiskIds.add(mission.id)
  }

  for (const concentration of computeRevenueConcentration(input.activityReports, input.missions)) {
    if (concentration.share <= 0.4) continue
    pushRisk(risks, {
      id: `revenue-concentration:${concentration.companyId}`,
      severity: "warning",
      category: "retention",
      title: "Concentration CA client",
      detail: `${concentration.companyName} représente ${Math.round(concentration.share * 100)}% du CA observé sur les CRA récents.`,
      entityType: "company",
      entityId: concentration.companyId,
      entityLabel: concentration.companyName,
      suggestedAction: "Sécuriser le sponsor client et diversifier le portefeuille actif.",
      link: `/prospection/accounts/${concentration.companyId}`,
    })
  }

  const sorted = risks
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.title.localeCompare(b.title, "fr"))
    .slice(0, 10)
  const activeMissions = input.missions.filter((mission) => mission.status === "active")
  const healthyMissionsCount = activeMissions.filter((mission) => !missionRiskIds.has(mission.id)).length

  return {
    risks: sorted,
    summary: {
      criticalCount: sorted.filter((risk) => risk.severity === "critical").length,
      warningCount: sorted.filter((risk) => risk.severity === "warning").length,
      healthyMissionsCount,
      healthyMissionsPct: activeMissions.length > 0 ? Math.round((healthyMissionsCount / activeMissions.length) * 100) : 100,
    },
  }
}
