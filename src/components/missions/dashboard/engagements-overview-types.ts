export type RevenueBreakdownItem = {
  id: string
  label: string
  value: number
  percentage: number
}

export type MonthlyRevenueItem = {
  month: string
  label: string
  assistanceTechnique: number
  projects: number
  isFuture: boolean
}

export type ActivityWatchItem = {
  collaboratorId: string
  name: string
  companyName: string
  rate: number
  targetRate: number
  gapPoints: number
}

export type EngagementMilestoneSourceType =
  | "mission_start"
  | "mission_end"
  | "project_start"
  | "project_end"
  | "project_phase"
  | "billing_milestone"
  | "calendar_event"

export type EngagementMilestone = {
  id: string
  sourceType: EngagementMilestoneSourceType
  date: string
  title: string
  companyName: string
  detail?: string
  urgency: "normal" | "soon" | "overdue"
  entityType: "mission" | "project"
  entityId: string
}

export type EngagementsOverviewViewModel = {
  generatedAt: string
  year: number
  status: "complete" | "partial"
  issues: string[]
  portfolio: {
    activeMissions: number
    activeProjects: number
  }
  revenue: {
    total: number
    assistanceTechnique: number
    projects: number
    monthly: MonthlyRevenueItem[]
    byPractice: RevenueBreakdownItem[]
    byClient: RevenueBreakdownItem[]
  }
  activity: {
    weightedYtdRate: number | null
    monthlyTrend: Array<{
      month: string
      label: string
      rate: number | null
      isFuture: boolean
    }>
    latestValidatedMonth: string | null
    watchlist: ActivityWatchItem[]
  }
  milestones: {
    next30Days: EngagementMilestone[]
    overdue: EngagementMilestone[]
    endingWithin60Days: number
  }
}

export type OverviewBillingMilestone = {
  label: string
  amount: number | null
  dueDate: string | null
  invoicedAt: string | null
}

export type OverviewMissionSource = {
  id: string
  title: string
  startDate: string | null
  endDate: string | null
  practice: string | null
  companyId: string
  companyName: string
  collaboratorId: string
}

export type OverviewProjectSource = {
  id: string
  title: string
  startDate: string | null
  endDate: string | null
  companyId: string
  companyName: string
  practice: string | null
  billingMilestones: OverviewBillingMilestone[]
}

export type OverviewActivityReportSource = {
  id: string
  missionId: string
  collaboratorId: string
  status: string
  periodStart: string
  periodEnd: string
  billableDays: number
  businessDays: number
  tjmSnapshot: number
}

export type OverviewCollaboratorSource = {
  id: string
  name: string
}

export type OverviewCompensationSource = {
  collaboratorId: string
  taci: number
  effectiveFrom: string
  effectiveTo: string | null
}

export type OverviewProjectPhaseSource = {
  id: string
  projectId: string
  label: string
  status: string
  startDate: string | null
  endDate: string | null
}

export type OverviewCalendarEventSource = {
  id: string
  entityType: "mission" | "project"
  entityId: string
  title: string
  eventType: string
  status: string
  startsAt: string
}

export type BuildEngagementsOverviewInput = {
  now: Date
  issues?: string[]
  missions: OverviewMissionSource[]
  projects: OverviewProjectSource[]
  reports: OverviewActivityReportSource[]
  collaborators: OverviewCollaboratorSource[]
  compensations: OverviewCompensationSource[]
  projectPhases: OverviewProjectPhaseSource[]
  calendarEvents: OverviewCalendarEventSource[]
}
