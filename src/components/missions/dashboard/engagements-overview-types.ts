export type EngagementType = "mission" | "project"

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

export type MarginGapItem = {
  id: string
  type: EngagementType
  title: string
  companyName: string
  actualMarginPct: number
  targetMarginPct: number
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
  entityType: EngagementType
  entityId: string
}

export type EngagementPortfolioPoint = {
  id: string
  type: EngagementType
  title: string
  companyId: string
  companyName: string
  practice: string | null
  revenueYtd: number
  actualMarginPct: number | null
  targetMarginPct: number | null
  marginGapPct: number | null
  startDate: string | null
  endDate: string | null
  daysUntilEnd: number | null
  overdue: boolean
  endingWithin30Days: boolean
  endingWithin60Days: boolean
}

export type EngagementRunwayRow = {
  id: string
  type: EngagementType
  title: string
  companyName: string
  startDate: string | null
  endDate: string | null
  overdue: boolean
  markers: Array<{
    id: string
    date: string
    label: string
    kind: "phase" | "billing" | "event"
    overdue: boolean
  }>
}

export type ClientExposureItem = {
  companyId: string
  companyName: string
  revenue: number
  sharePct: number
  assistanceRevenue: number
  projectRevenue: number
  actualMarginPct: number | null
  endingWithin60Days: boolean
  overdue: boolean
  engagements: EngagementPortfolioPoint[]
}

export type ProductionHeatmapCell = {
  month: string
  revenue: number
  belowActivityTarget: boolean
  hasStartOrEnd: boolean
  hasOverdueItem: boolean
}

export type ProductionHeatmapRow = {
  id: string
  label: string
  monthly: ProductionHeatmapCell[]
}

export type ProjectCockpitItem = {
  id: string
  title: string
  companyName: string
  practice: string | null
  progressPct: number
  contractAmount: number | null
  invoicedAmount: number
  remainingToInvoice: number | null
  costActual: number
  actualMarginPct: number | null
  targetMarginPct: number | null
  marginGapPct: number | null
  startDate: string | null
  endDate: string | null
  teamMemberCount: number
  phases: Array<{
    id: string
    label: string
    status: string
    startDate: string | null
    endDate: string | null
    overdue: boolean
  }>
  phaseCounts: { completed: number; inProgress: number; overdue: number }
  nextMilestone: { label: string; date: string } | null
}

export type MarginBridge = {
  revenue: number
  assistanceCosts: number
  projectCosts: number
  observedContribution: number
}

export type EngagementsOverviewViewModel = {
  generatedAt: string
  year: number
  status: "complete" | "partial"
  issues: string[]
  portfolio: {
    activeMissions: number
    activeProjects: number
    points: EngagementPortfolioPoint[]
    clients: ClientExposureItem[]
    clientConcentration: { firstClientPct: number; top3ClientsPct: number }
    production: {
      clients: ProductionHeatmapRow[]
      practices: ProductionHeatmapRow[]
    }
    projects: ProjectCockpitItem[]
    marginBridge: {
      global: MarginBridge
      assistanceTechnique: MarginBridge
      projects: MarginBridge
    }
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
    marginGaps: MarginGapItem[]
  }
  milestones: {
    next30Days: EngagementMilestone[]
    overdue: EngagementMilestone[]
    endingWithin60Days: number
    runway: EngagementRunwayRow[]
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
  grossMarginPct: number | null
}

export type OverviewProjectSource = {
  id: string
  title: string
  startDate: string | null
  endDate: string | null
  companyId: string
  companyName: string
  practice: string | null
  progressPct: number
  contractAmount: number | null
  costActual: number
  actualMarginPct: number | null
  targetMarginPct: number | null
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
  cjmSnapshot: number
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

export type OverviewProjectTeamMemberSource = {
  id: string
  projectId: string
}

export type OverviewCalendarEventSource = {
  id: string
  entityType: EngagementType
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
  projectTeamMembers: OverviewProjectTeamMemberSource[]
  calendarEvents: OverviewCalendarEventSource[]
}
