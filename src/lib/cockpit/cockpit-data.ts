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

export type CockpitHealthAxis = {
  id: string
  label: string
  score: number
  detail: string
  status: CockpitStatus
}

export type CockpitFlowNode = {
  id: string
  label: string
  value: string
  detail: string
  status: CockpitStatus
}

export type CockpitTrendPoint = {
  monthLabel: string
  revenueActual: number | null
  revenueTarget: number
  marginActual: number | null
  capacityActual: number | null
}

export type CockpitAttentionItem = {
  id: string
  title: string
  subtitle: string
  detail: string
  actionLabel: string
  href: string
  status: CockpitStatus
}

export type CockpitRenewalItem = {
  id: string
  company: string
  title: string
  dueLabel: string
  marginLabel: string
  revenueLabel: string
  status: CockpitStatus
}

export type CockpitAccountItem = {
  id: string
  name: string
  sector: string
  scoreLabel: string
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
  healthAxes: CockpitHealthAxis[]
  flow: CockpitFlowNode[]
  trajectory: {
    points: CockpitTrendPoint[]
    ytdRevenueActual: number
    ytdRevenueTarget: number
    ytdMarginActual: number | null
    ytdMarginTarget: number
  }
  headline: string
  recommendation: string
  attentionItems: CockpitAttentionItem[]
  renewals: CockpitRenewalItem[]
  accounts: CockpitAccountItem[]
  financeWatch: CockpitFinanceWatchItem[]
}

function clampScore(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
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

function daysUntil(dateString: string | null | undefined, now: Date) {
  if (!dateString) return null
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / 86_400_000)
}

function formatDueLabel(dateString: string | null | undefined, now: Date) {
  if (!dateString) return "Date à confirmer"
  const days = daysUntil(dateString, now)
  if (days === null) return "Date à confirmer"
  const label = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${dateString}T00:00:00`))

  if (days < 0) return `${label} · dépassé`
  if (days === 0) return `${label} · aujourd'hui`
  if (days <= 7) return `${label} · ${days} j`
  return label
}

function getRenewalStatus(days: number | null): CockpitStatus {
  if (days === null) return "neutral"
  if (days <= 21) return "danger"
  if (days <= 45) return "warning"
  return "success"
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

  const now = new Date()
  const weightedPipe = synthese.pipeline.totalWeighted || finance.pipeTotal
  const openNeeds = staffing.openNeeds.length
  const coveredNeeds = staffing.openNeeds.filter((need) => need.candidateCount > 0).length
  const coverageRate = openNeeds > 0 ? Math.round((coveredNeeds / openNeeds) * 100) : 100
  const renewals = activeMissions
    .map((mission) => {
      const dueDate = mission.renewalDate || mission.endDate
      const days = daysUntil(dueDate, now)

      return {
        id: mission.id,
        company: mission.company.name,
        title: mission.title,
        dueLabel: formatDueLabel(dueDate, now),
        marginLabel: formatPct(mission.grossMarginPct, 0),
        revenueLabel: formatEuroCompact(mission.lastQuarterRevenue?.revenue),
        status: getRenewalStatus(days),
        days,
      }
    })
    .filter((item) => item.days === null || item.days <= 75)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
    .slice(0, 6)

  const renewals30Count = renewals.filter((item) => item.days !== null && item.days <= 30).length
  const ytdRevenuePace = trajectory.summary.ytdRevenueTarget > 0
    ? (trajectory.summary.ytdRevenueActual / trajectory.summary.ytdRevenueTarget) * 100
    : 0
  const marginPerformance = trajectory.summary.ytdMarginActual !== null
    ? (trajectory.summary.ytdMarginActual / trajectory.summary.ytdMarginTarget) * 100
    : 0
  const activationLoad = synthese.accountsToActivate.length

  const healthAxes: CockpitHealthAxis[] = [
    {
      id: "revenue-pace",
      label: "Pacing revenu",
      score: clampScore(ytdRevenuePace),
      detail: `${formatEuroCompact(trajectory.summary.ytdRevenueActual)} vs ${formatEuroCompact(trajectory.summary.ytdRevenueTarget)}`,
      status: statusFromScore(ytdRevenuePace),
    },
    {
      id: "margin-discipline",
      label: "Discipline marge",
      score: clampScore(marginPerformance),
      detail: `${formatPct(trajectory.summary.ytdMarginActual)} vs cible ${formatPct(trajectory.summary.ytdMarginTarget)}`,
      status: statusFromScore(marginPerformance),
    },
    {
      id: "staffing-readiness",
      label: "Readiness staffing",
      score: clampScore(coverageRate),
      detail: `${coveredNeeds}/${openNeeds || 0} besoins couverts`,
      status: statusFromScore(coverageRate),
    },
    {
      id: "continuity",
      label: "Continuité delivery",
      score: clampScore(100 - renewals30Count * 18),
      detail: `${renewals30Count} renouvellement(s) à cadrer sous 30 j`,
      status: statusFromScore(100 - renewals30Count * 18),
    },
    {
      id: "portfolio-activation",
      label: "Activation portefeuille",
      score: clampScore(100 - activationLoad * 12),
      detail: `${activationLoad} comptes chauds à activer`,
      status: statusFromScore(100 - activationLoad * 12),
    },
  ]

  const headline =
    coverageRate < 60
      ? "Le cockpit est tiré par le pipe, mais la couverture staffing reste le point de friction principal."
      : renewals30Count > 0
        ? "Le centre de profit reste solide, avec un risque concentré sur les renouvellements à arbitrer rapidement."
        : "Le centre de profit est globalement en ligne, avec une traction commerciale et une exécution relativement équilibrées."

  const recommendation =
    coverageRate < 60
      ? "Prioriser les besoins ouverts sans profils avant d'augmenter le volume de prospection."
      : renewals30Count > 0
        ? "Sécuriser les renouvellements critiques puis réallouer la capacité vers les comptes à activer."
        : "Conserver le rythme commercial et concentrer l'animation sur les comptes à plus fort score."

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

  const flow: CockpitFlowNode[] = [
    {
      id: "accounts",
      label: "Comptes chauds",
      value: String(synthese.accountsToActivate.length),
      detail: "à activer",
      status: synthese.accountsToActivate.length > 4 ? "warning" : "success",
    },
    {
      id: "opportunities",
      label: "Opps ouvertes",
      value: String(synthese.pipeline.openCount),
      detail: formatEuroCompact(weightedPipe),
      status: synthese.pipeline.openCount > 0 ? "success" : "warning",
    },
    {
      id: "staffing",
      label: "Besoins couverts",
      value: `${coveredNeeds}/${openNeeds || 0}`,
      detail: `${coverageRate}%`,
      status: statusFromScore(coverageRate),
    },
    {
      id: "missions",
      label: "Missions actives",
      value: String(activeMissions.length),
      detail: `${renewals30Count} à revoir`,
      status: renewals30Count > 2 ? "warning" : "success",
    },
    {
      id: "cash",
      label: "CA YTD",
      value: formatEuroCompact(trajectory.summary.ytdRevenueActual),
      detail: `${Math.round(ytdRevenuePace)}% du plan`,
      status: statusFromScore(ytdRevenuePace),
    },
  ]

  const attentionItems: CockpitAttentionItem[] = [
    ...staffing.priorities.slice(0, 3).map((item) => ({
      id: `staff-${item.id}`,
      title: item.title,
      subtitle: item.company,
      detail: item.reason,
      actionLabel: item.action,
      href: "/staffing",
      status: item.status as CockpitStatus,
    })),
    ...finance.lateBillings.slice(0, 2).map((item) => ({
      id: `billing-${item.id}`,
      title: item.clientName,
      subtitle: `${item.delayDays} jours de retard`,
      detail: `${item.bcNumber} · ${item.valueAmount}`,
      actionLabel: item.actionLabel,
      href: "/finance",
      status: (item.delayDays >= 90 ? "danger" : "warning") as CockpitStatus,
    })),
  ].slice(0, 5)

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
    healthAxes,
    flow,
    trajectory: {
      points: trajectoryPoints,
      ytdRevenueActual: trajectory.summary.ytdRevenueActual,
      ytdRevenueTarget: trajectory.summary.ytdRevenueTarget,
      ytdMarginActual: trajectory.summary.ytdMarginActual,
      ytdMarginTarget: trajectory.summary.ytdMarginTarget,
    },
    headline,
    recommendation,
    attentionItems,
    renewals: renewals.map(({ days, ...item }) => {
      void days
      return item
    }),
    accounts: synthese.accountsToActivate.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      sector: item.sector,
      scoreLabel: item.score !== null ? `${item.score}/5` : "—",
      lifecycleLabel: item.lifecycleLabel,
    })),
    financeWatch,
  }
}
