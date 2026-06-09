export type DashboardDevice = "desktop" | "mobile"

export type DashboardStatus = "success" | "warning" | "danger" | "neutral" | "pending"

export type DashboardMetric = {
  id: string
  label: string
  value: string
  description?: string
  trend?: {
    label: string
    direction: "up" | "down" | "stable"
  }
  status?: DashboardStatus
  href?: string
}

export type DashboardAlert = {
  id: string
  title: string
  description?: string
  status: DashboardStatus
  href?: string
}

export type DashboardPriority = {
  id: string
  title: string
  description?: string
  dueLabel?: string
  status?: DashboardStatus
  href?: string
}

export type DashboardInsight = {
  title: string
  summary: string
  recommendations?: string[]
}

export type DashboardAction = {
  id: string
  label: string
  href?: string
  variant?: "primary" | "secondary" | "ghost"
}

export type DashboardActivity = {
  id: string
  label: string
  description?: string
  dateLabel?: string
  href?: string
}

export type DashboardTableColumn = {
  key: string
  label: string
  align?: "left" | "right" | "center"
}

export type DashboardTableRow = {
  id: string
  href?: string
  cells: Record<string, string>
}

export type DashboardTable = {
  title: string
  description?: string
  columns: DashboardTableColumn[]
  rows: DashboardTableRow[]
}

export type DashboardMainPanel = {
  title: string
  description?: string
  type:
    | "pipeline"
    | "forecast"
    | "pnl"
    | "rag"
    | "automation"
    | "proposal"
    | "generic"
}

export type DashboardSyncStatus = {
  source: string
  lastSyncLabel?: string
  status: "ok" | "warning" | "error" | "pending"
}

export type SectionDashboardConfig = {
  sectionKey: string
  title: string
  description?: string
  primaryAction?: DashboardAction
  secondaryActions?: DashboardAction[]
  mainPanel: DashboardMainPanel
}

export type SectionDashboardData = {
  metrics: DashboardMetric[]
  alerts: DashboardAlert[]
  priorities: DashboardPriority[]
  mainInsight?: DashboardInsight
  table?: DashboardTable
  activityFeed?: DashboardActivity[]
  quickActions?: DashboardAction[]
  syncStatus?: DashboardSyncStatus
}
