import { asNumber, daysBetween, parseDate } from "./shared"

export type ActivityRecommendationStatus = "healthy" | "attention" | "action_needed"

export type ActivityRecommendation = {
  collaboratorId: string
  collaboratorName: string
  practice: string | null
  status: ActivityRecommendationStatus
  indicators: {
    activityRateYtd: number
    taciTarget: number
    gapVsTaci: number
    realMarginPct: number | null
    currentMissionEndDate: string | null
    plannedAbsenceDaysNext30: number
  }
  recommendations: string[]
  alertFlags: string[]
}

export type AnalyzeActivitySummary = {
  healthyCount: number
  attentionCount: number
  actionNeededCount: number
  avgActivityRate: number
  avgMarginPct: number
}

export type AnalyzeActivityRulesResult = {
  recommendations: ActivityRecommendation[]
  summary: AnalyzeActivitySummary
}

export type AnalyzeActivityYtdRow = {
  collaboratorId: string | null
  fullName: string | null
  activityRateYtd: number | null
  taciTarget: number | null
  gapVsTarget: number | null
  ytdRevenue: number | null
  ytdRealMargin: number | null
}

export type AnalyzeActivityAlertRow = {
  collaboratorId: string | null
  alertLowActivity: boolean | null
  alertLowMargin: boolean | null
  alertNegativeMargin: boolean | null
  alertHighSickDays: boolean | null
  alertCraNotValidated: boolean | null
}

export type AnalyzeActivityMissionRow = {
  id: string
  collaboratorId: string
  title: string
  status: string | null
  startDate: string | null
  endDate: string | null
}

export type AnalyzeActivityAbsenceRow = {
  collaboratorId: string
  startDate: string
  endDate: string
  durationDays: number
}

export type AnalyzeActivityCollaboratorRow = {
  id: string
  fullName: string | null
  practice: string | null
  status: string | null
}

export type BuildAnalyzeActivityInput = {
  now: string
  ytd: AnalyzeActivityYtdRow[]
  alerts: AnalyzeActivityAlertRow[]
  missions: AnalyzeActivityMissionRow[]
  absences: AnalyzeActivityAbsenceRow[]
  collaborators: AnalyzeActivityCollaboratorRow[]
}

const STATUS_ORDER: Record<ActivityRecommendationStatus, number> = {
  action_needed: 0,
  attention: 1,
  healthy: 2,
}

function realMarginPct(row: AnalyzeActivityYtdRow): number | null {
  const revenue = asNumber(row.ytdRevenue)
  if (revenue <= 0 || row.ytdRealMargin === null) return null
  return (row.ytdRealMargin / revenue) * 100
}

function statusAtLeast(current: ActivityRecommendationStatus, next: ActivityRecommendationStatus): ActivityRecommendationStatus {
  return STATUS_ORDER[next] < STATUS_ORDER[current] ? next : current
}

function latestAlertFlags(alerts: AnalyzeActivityAlertRow[]): string[] {
  const flags: string[] = []
  if (alerts.some((alert) => alert.alertLowActivity)) flags.push("Activité basse")
  if (alerts.some((alert) => alert.alertLowMargin)) flags.push("Marge basse")
  if (alerts.some((alert) => alert.alertNegativeMargin)) flags.push("Marge négative")
  if (alerts.some((alert) => alert.alertHighSickDays)) flags.push("Absences maladie")
  if (alerts.some((alert) => alert.alertCraNotValidated)) flags.push("CRA non validé")
  return flags
}

export function buildAnalyzeActivity(input: BuildAnalyzeActivityInput): AnalyzeActivityRulesResult {
  const now = parseDate(input.now) ?? new Date()
  const in30Days = new Date(now)
  in30Days.setUTCDate(in30Days.getUTCDate() + 30)
  const alertsByCollaborator = new Map<string, AnalyzeActivityAlertRow[]>()
  for (const alert of input.alerts) {
    if (!alert.collaboratorId) continue
    alertsByCollaborator.set(alert.collaboratorId, [...(alertsByCollaborator.get(alert.collaboratorId) ?? []), alert])
  }

  const ytdByCollaborator = new Map(input.ytd.filter((row) => row.collaboratorId).map((row) => [row.collaboratorId as string, row]))
  const recommendations = input.collaborators
    .filter((collaborator) => collaborator.status !== "inactive" && collaborator.status !== "archived")
    .map<ActivityRecommendation>((collaborator) => {
      const ytd = ytdByCollaborator.get(collaborator.id)
      const activityRateYtd = asNumber(ytd?.activityRateYtd)
      const taciTarget = asNumber(ytd?.taciTarget)
      const gapVsTaci = ytd?.gapVsTarget !== null && ytd?.gapVsTarget !== undefined
        ? Math.max(0, ytd.gapVsTarget)
        : Math.max(0, taciTarget - activityRateYtd)
      const marginPct = ytd ? realMarginPct(ytd) : null
      const activeMissions = input.missions
        .filter((mission) => mission.collaboratorId === collaborator.id && mission.status === "active")
        .sort((a, b) => (a.endDate ?? "9999-12-31").localeCompare(b.endDate ?? "9999-12-31"))
      const currentMission = activeMissions[0] ?? null
      const hasFutureMission = input.missions.some((mission) =>
        mission.collaboratorId === collaborator.id &&
        mission.status === "active" &&
        mission.startDate !== null &&
        currentMission?.endDate !== null &&
        mission.startDate > currentMission.endDate,
      )
      const plannedAbsenceDaysNext30 = input.absences
        .filter((absence) => {
          if (absence.collaboratorId !== collaborator.id) return false
          const start = parseDate(absence.startDate)
          const end = parseDate(absence.endDate)
          if (!start || !end) return false
          return start <= in30Days && end >= now
        })
        .reduce((sum, absence) => sum + asNumber(absence.durationDays), 0)
      const flags = latestAlertFlags(alertsByCollaborator.get(collaborator.id) ?? [])
      const recs: string[] = []
      let status: ActivityRecommendationStatus = "healthy"

      if (gapVsTaci > 10) {
        status = statusAtLeast(status, "action_needed")
        recs.push("Entretien RH — taux d'activité significativement sous la cible TACI")
      } else if (gapVsTaci > 5) {
        status = statusAtLeast(status, "attention")
        recs.push("Monitorer — léger écart vs objectif TACI")
      }

      const daysToMissionEnd = currentMission?.endDate ? daysBetween(now, currentMission.endDate) : Number.POSITIVE_INFINITY
      if (daysToMissionEnd < 30 && !hasFutureMission) {
        status = statusAtLeast(status, "action_needed")
        recs.push(`Activer le staffing — fin de mission dans ${Math.max(0, daysToMissionEnd)} jours`)
      }

      if (marginPct !== null && marginPct < 0) {
        status = statusAtLeast(status, "action_needed")
        recs.push("Marge négative — action corrective immédiate")
      } else if (marginPct !== null && marginPct < 15) {
        status = statusAtLeast(status, "attention")
        recs.push("Revoir le TJM ou le CJM — marge sous le seuil")
      }

      if (plannedAbsenceDaysNext30 > 5) {
        status = statusAtLeast(status, "attention")
        recs.push("Anticiper l'impact des absences sur le taux d'activité")
      }

      if (flags.includes("Absences maladie")) {
        status = statusAtLeast(status, "attention")
        recs.push("Point RH — absences maladie fréquentes")
      }

      if (recs.length === 0) recs.push("Aucune action immédiate — maintenir le suivi")

      return {
        collaboratorId: collaborator.id,
        collaboratorName: collaborator.fullName ?? ytd?.fullName ?? "Collaborateur",
        practice: collaborator.practice,
        status,
        indicators: {
          activityRateYtd,
          taciTarget,
          gapVsTaci,
          realMarginPct: marginPct,
          currentMissionEndDate: currentMission?.endDate ?? null,
          plannedAbsenceDaysNext30,
        },
        recommendations: recs,
        alertFlags: flags,
      }
    })
    .sort((a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.indicators.gapVsTaci - a.indicators.gapVsTaci ||
      a.collaboratorName.localeCompare(b.collaboratorName, "fr"),
    )
    .slice(0, 10)

  const marginValues = recommendations
    .map((item) => item.indicators.realMarginPct)
    .filter((value): value is number => value !== null && Number.isFinite(value))

  return {
    recommendations,
    summary: {
      healthyCount: recommendations.filter((item) => item.status === "healthy").length,
      attentionCount: recommendations.filter((item) => item.status === "attention").length,
      actionNeededCount: recommendations.filter((item) => item.status === "action_needed").length,
      avgActivityRate: recommendations.length > 0
        ? Math.round(recommendations.reduce((sum, item) => sum + item.indicators.activityRateYtd, 0) / recommendations.length)
        : 0,
      avgMarginPct: marginValues.length > 0
        ? Math.round(marginValues.reduce((sum, value) => sum + value, 0) / marginValues.length)
        : 0,
    },
  }
}
