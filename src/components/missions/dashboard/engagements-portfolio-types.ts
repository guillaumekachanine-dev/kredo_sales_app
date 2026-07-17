import type {
  BuildEngagementsOverviewInput as BaseBuildInput,
  EngagementsOverviewViewModel as BaseViewModel,
  OverviewActivityReportSource,
  OverviewMissionSource,
  OverviewProjectSource,
} from "./engagements-overview-types"

export type EngagementType = "mission" | "project"

export type MarginGapItem = { id: string; type: EngagementType; title: string; companyName: string; actualMarginPct: number; targetMarginPct: number; gapPoints: number }
export type EngagementPortfolioPoint = { id: string; type: EngagementType; title: string; companyId: string; companyName: string; practice: string | null; revenueYtd: number; actualMarginPct: number | null; targetMarginPct: number | null; marginGapPct: number | null; startDate: string | null; endDate: string | null; daysUntilEnd: number | null; overdue: boolean; endingWithin30Days: boolean; endingWithin60Days: boolean }
export type EngagementRunwayRow = { id: string; type: EngagementType; title: string; companyName: string; startDate: string | null; endDate: string | null; overdue: boolean; markers: Array<{ id: string; date: string; label: string; kind: "phase" | "billing" | "event"; overdue: boolean }> }
export type ClientExposureItem = { companyId: string; companyName: string; revenue: number; sharePct: number; assistanceRevenue: number; projectRevenue: number; actualMarginPct: number | null; endingWithin60Days: boolean; overdue: boolean; engagements: EngagementPortfolioPoint[] }
export type ProductionHeatmapCell = { month: string; revenue: number; belowActivityTarget: boolean; hasStartOrEnd: boolean; hasOverdueItem: boolean }
export type ProductionHeatmapRow = { id: string; label: string; monthly: ProductionHeatmapCell[] }
export type ProjectCockpitItem = { id: string; title: string; companyName: string; practice: string | null; progressPct: number; contractAmount: number | null; invoicedAmount: number; remainingToInvoice: number | null; costActual: number; actualMarginPct: number | null; targetMarginPct: number | null; marginGapPct: number | null; startDate: string | null; endDate: string | null; teamMemberCount: number; phases: Array<{ id: string; label: string; status: string; startDate: string | null; endDate: string | null; overdue: boolean }>; phaseCounts: { completed: number; inProgress: number; overdue: number }; nextMilestone: { label: string; date: string } | null }
export type MarginBridge = { revenue: number; assistanceCosts: number; projectCosts: number; observedContribution: number }

export type PortfolioMissionSource = OverviewMissionSource & { grossMarginPct: number | null }
export type PortfolioProjectSource = OverviewProjectSource & { progressPct: number; contractAmount: number | null; costActual: number; actualMarginPct: number | null; targetMarginPct: number | null }
export type PortfolioActivityReportSource = OverviewActivityReportSource & { cjmSnapshot: number }
export type PortfolioProjectTeamMemberSource = { id: string; projectId: string }

export type BuildEngagementsPortfolioInput = Omit<BaseBuildInput, "missions" | "projects" | "reports"> & {
  missions: PortfolioMissionSource[]
  projects: PortfolioProjectSource[]
  reports: PortfolioActivityReportSource[]
  projectTeamMembers: PortfolioProjectTeamMemberSource[]
}

export type EngagementsPortfolioViewModel = Omit<BaseViewModel, "portfolio" | "activity" | "milestones"> & {
  portfolio: BaseViewModel["portfolio"] & {
    points: EngagementPortfolioPoint[]
    clients: ClientExposureItem[]
    clientConcentration: { firstClientPct: number; top3ClientsPct: number }
    production: { clients: ProductionHeatmapRow[]; practices: ProductionHeatmapRow[] }
    projects: ProjectCockpitItem[]
    marginBridge: { global: MarginBridge; assistanceTechnique: MarginBridge; projects: MarginBridge }
  }
  activity: BaseViewModel["activity"] & { marginGaps: MarginGapItem[] }
  milestones: BaseViewModel["milestones"] & { runway: EngagementRunwayRow[] }
}
