import { getFinanceDashboardData } from "@/lib/finance/finance-data"
import { getStaffingDashboardData } from "@/lib/staffing/staffing-data"
import { getSyntheseData } from "@/lib/prospection/synthese-data"
import { getTrajectory2026 } from "@/app/(app)/missions/_data/get-trajectory-2026"
import { getActiveMissionsPlanning } from "@/app/(app)/missions/_data/get-active-missions-planning"
import { formatEuroCompact, formatPct } from "@/lib/formatters"

export type CockpitStatus = "success" | "warning" | "danger" | "neutral"

export type CockpitKpi = {
  id: string
  label: string
  value: string
  detail?: string
  trendBadge?: string
  trendDirection?: "up" | "down"
  status: CockpitStatus
}

export type CockpitTimelineMonth = {
  month: string
  pipelineStages: number
  predictiveAvailability: number
  consultantAvailability: number
}

export type BottleneckStage = {
  stageName: string
  qualifDays: number
  propDays: number
  negoDays: number
  gagneDays: number
}

export type CriticalStaffingAlert = {
  id: string
  anomaly: string
  statusText: string
  actionLabel: string
}

export type LowScoreProposal = {
  id: string
  consultantName: string
  practiceName: string
  finMission: string
  valueAmount: string
  iaScore: number
}

export type CockpitTrendPoint = {
  monthLabel: string
  revenueActual: number | null
  revenueTarget: number
  marginActual: number | null
  capacityActual: number | null
}

export type CockpitAccountItem = {
  id: string
  name: string
  sector: string
  lifecycleLabel: string
}

export type CockpitFinanceWatchItem = {
  id: string
  clientName: string
  detail: string
  valueLabel: string
  status: CockpitStatus
}

export type CockpitDashboardData = {
  kpis: CockpitKpi[]
  timeline: CockpitTimelineMonth[]
  bottlenecks: BottleneckStage[]
  staffingAlerts: CriticalStaffingAlert[]
  lowScoreProposals: LowScoreProposal[]
  trajectory: {
    points: CockpitTrendPoint[]
    ytdRevenueActual: number
    ytdRevenueTarget: number
    ytdMarginActual: number | null
    ytdMarginTarget: number
  }
  accounts: CockpitAccountItem[]
  financeWatch: CockpitFinanceWatchItem[]
}

function statusFromScore(score: number): CockpitStatus {
  if (score >= 78) return "success"
  if (score >= 55) return "warning"
  return "danger"
}


function formatDeltaPoints(actual: number | null, target: number) {
  if (actual === null || !Number.isFinite(actual)) return undefined
  const delta = actual - target
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta.toFixed(1)} pts`
}

export async function getCockpitDashboardData(): Promise<CockpitDashboardData> {
  const [finance, staffing, synthese, trajectory, activeMissions] =
    await Promise.all([
      getFinanceDashboardData(),
      getStaffingDashboardData(),
      getSyntheseData(),
      getTrajectory2026(),
      getActiveMissionsPlanning(),
    ])

  const weightedPipe = synthese.pipeline.totalWeighted || finance.pipeTotal
  const openNeeds = staffing.openNeeds.length
  const coveredNeeds = staffing.openNeeds.filter((need) => need.candidateCount > 0).length
  const coverageRate = openNeeds > 0 ? Math.round((coveredNeeds / openNeeds) * 100) : 100
  const now = new Date()
  const renewals30Count = activeMissions.filter((mission) => {
    const dueDate = mission.renewalDate || mission.endDate
    if (!dueDate) return false
    const dueTime = new Date(`${dueDate}T00:00:00`).getTime()
    return Number.isFinite(dueTime) && Math.ceil((dueTime - now.getTime()) / 86_400_000) <= 30
  }).length
  const ytdRevenuePace = trajectory.summary.ytdRevenueTarget > 0
    ? (trajectory.summary.ytdRevenueActual / trajectory.summary.ytdRevenueTarget) * 100
    : 0
  const marginPerformance = trajectory.summary.ytdMarginActual !== null
    ? (trajectory.summary.ytdMarginActual / trajectory.summary.ytdMarginTarget) * 100
    : 0
  const kpis: CockpitKpi[] = [
    {
      id: "c-weighted-pipe",
      label: "Pipe pondéré",
      value: formatEuroCompact(weightedPipe),
      detail: `${synthese.pipeline.openCount} opp. ouvertes`,
      trendBadge: `${Math.round(ytdRevenuePace)}% du pacing`,
      trendDirection: ytdRevenuePace >= 100 ? "up" : "down",
      status: statusFromScore(ytdRevenuePace),
    },
    {
      id: "c-project-margin",
      label: "Marge YTD",
      value: formatPct(trajectory.summary.ytdMarginActual),
      detail: `cible ${formatPct(trajectory.summary.ytdMarginTarget)}`,
      trendBadge: formatDeltaPoints(
        trajectory.summary.ytdMarginActual,
        trajectory.summary.ytdMarginTarget,
      ),
      trendDirection:
        trajectory.summary.ytdMarginActual !== null &&
        trajectory.summary.ytdMarginActual >= trajectory.summary.ytdMarginTarget
          ? "up"
          : "down",
      status: statusFromScore(marginPerformance),
    },
    {
      id: "c-bench-rate",
      label: "Couverture staffing",
      value: `${coveredNeeds}/${openNeeds || 0}`,
      detail: `${coverageRate}% des besoins couverts`,
      trendBadge: openNeeds > 0 ? `${openNeeds - coveredNeeds} à sécuriser` : "RAS",
      trendDirection: coverageRate >= 75 ? "up" : "down",
      status: statusFromScore(coverageRate),
    },
    {
      id: "c-match-accuracy",
      label: "Renouvellements 30 j",
      value: String(renewals30Count),
      detail: `${activeMissions.length} missions actives`,
      trendBadge: renewals30Count === 0 ? "horizon dégagé" : "à cadrer",
      trendDirection: renewals30Count === 0 ? "up" : "down",
      status: renewals30Count === 0 ? "success" : renewals30Count <= 2 ? "warning" : "danger",
    },
  ]

  const financeWatch: CockpitFinanceWatchItem[] = finance.lateBillings
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      clientName: item.clientName,
      detail: `${item.delayDays} jours · ${item.bcNumber}`,
      valueLabel: item.valueAmount,
      status: item.delayDays >= 90 ? "danger" : "warning",
    }))

  const trajectoryPoints: CockpitTrendPoint[] = trajectory.points.map((point) => ({
    monthLabel: point.monthLabel,
    revenueActual: point.revenueActual,
    revenueTarget: point.revenueTarget,
    marginActual: point.marginActual,
    capacityActual: point.capacityActual,
  }))

  const timeline: CockpitTimelineMonth[] = trajectory.points.map((point) => ({
    month: point.monthLabel,
    pipelineStages: point.revenueActual ?? 0,
    predictiveAvailability: point.revenueTarget,
    consultantAvailability: (point.capacityActual ?? 0) * 100_000,
  }))

  const stageByKey = new Map(
    staffing.stageDistribution.map((stage) => [stage.key, stage.count]),
  )
  const bottlenecks: BottleneckStage[] = [
    {
      stageName: "Qualification",
      qualifDays: stageByKey.get("identifie") ?? 0,
      propDays: stageByKey.get("preselectionne") ?? 0,
      negoDays: stageByKey.get("propose_interne") ?? 0,
      gagneDays: stageByKey.get("retenu") ?? 0,
    },
    {
      stageName: "Conversion",
      qualifDays: stageByKey.get("envoye_client") ?? 0,
      propDays: stageByKey.get("entretien_planifie") ?? 0,
      negoDays: stageByKey.get("entretien_realise") ?? 0,
      gagneDays: stageByKey.get("retenu") ?? 0,
    },
  ]

  const staffingAlerts: CriticalStaffingAlert[] = staffing.priorities.slice(0, 3).map((item) => ({
    id: item.id,
    anomaly: item.title,
    statusText: item.reason,
    actionLabel: item.action,
  }))

  const lowScoreProposals: LowScoreProposal[] = finance.anomalies.slice(0, 3).map((item, index) => ({
    id: item.id,
    consultantName: item.consultantName,
    practiceName: item.anomalyText,
    finMission: index === 0 ? "Immédiat" : "Cette semaine",
    valueAmount: item.tjm,
    iaScore: item.badgeText ? 78 : 86,
  }))

  return {
    kpis,
    timeline,
    bottlenecks,
    staffingAlerts,
    lowScoreProposals,
    trajectory: {
      points: trajectoryPoints,
      ytdRevenueActual: trajectory.summary.ytdRevenueActual,
      ytdRevenueTarget: trajectory.summary.ytdRevenueTarget,
      ytdMarginActual: trajectory.summary.ytdMarginActual,
      ytdMarginTarget: trajectory.summary.ytdMarginTarget,
    },
    accounts: synthese.accountsToActivate.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      sector: item.sector,
      lifecycleLabel: item.lifecycleLabel,
    })),
    financeWatch,
  }
}
