export type CockpitStatus = "success" | "warning" | "danger" | "neutral"

export type CockpitAction = {
  label: string
  href: string
}

export type CockpitKpi = {
  id: "revenue-ytd" | "margin-ytd" | "weighted-pipeline" | "exposure-30d"
  label: string
  value: string
  detail?: string
  status: CockpitStatus
}

export type CockpitAccountActivation = {
  companyId: string
  companyName: string
  sector: string
  reasonType:
    | "overdue_action"
    | "advanced_opportunity"
    | "actionable_signal"
    | "urgent_issue"
    | "dormant_relationship"
  reasonLabel: string
  exposureLabel?: string
  primaryAction: CockpitAction
}

export type CockpitTrajectoryPoint = {
  monthLabel: string
  revenueActual: number | null
  revenueTarget: number
  marginActual: number | null
}

export type CockpitTrajectory = {
  points: CockpitTrajectoryPoint[]
  ytdRevenueActual: number | null
  ytdRevenueTarget: number | null
  ytdMarginActual: number | null
  ytdMarginTarget: number | null
}

export type CockpitHorizonItem = {
  id: string
  label: string
  detail: string
  dueDate?: string
  action: CockpitAction
}

export type CockpitHorizons = Array<{
  days: 30 | 60 | 90
  label: string
  items: CockpitHorizonItem[]
}>

export type CockpitTodayItem = {
  id: string
  title: string
  detail?: string
  moment?: string
  action: CockpitAction
}

export type CockpitOperationalAlert = {
  id: string
  type: "overdue_task" | "urgent_issue" | "project_risk" | "stuck_ai_run"
  title: string
  detail?: string
  status: Extract<CockpitStatus, "warning" | "danger">
  action: CockpitAction
}

export type CockpitDesktopSnapshot = {
  kpis: CockpitKpi[]
  accountsToAnimate: CockpitAccountActivation[]
  trajectory: CockpitTrajectory
  horizons: CockpitHorizons
  today: CockpitTodayItem[]
  alerts: CockpitOperationalAlert[]
}
