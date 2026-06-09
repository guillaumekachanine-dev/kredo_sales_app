import { SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"
import { DashboardHeader } from "./layout/DashboardHeader"
import { DashboardKpiGrid } from "./layout/DashboardKpiGrid"
import { DashboardMainPanel } from "./layout/DashboardMainPanel"
import { DashboardPriorityPanel } from "./layout/DashboardPriorityPanel"
import { DashboardTablePanel } from "./layout/DashboardTablePanel"
import { DashboardAiPanel } from "./layout/DashboardAiPanel"
import { DashboardActivityFeed } from "./layout/DashboardActivityFeed"
import { DashboardQuickActions } from "./layout/DashboardQuickActions"

interface SectionDesktopDashboardProps {
  config: SectionDashboardConfig
  data: SectionDashboardData
}

export function SectionDesktopDashboard({ config, data }: SectionDesktopDashboardProps) {
  const { title, description, primaryAction, secondaryActions, mainPanel } = config
  const { metrics, alerts, priorities, mainInsight, table, activityFeed, quickActions, syncStatus } = data

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6 bg-canvas">
      {/* Row 1: Header */}
      <DashboardHeader
        title={title}
        description={description}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        syncStatus={syncStatus}
        device="desktop"
      />

      {/* Row 2: KPI Strip */}
      <DashboardKpiGrid metrics={metrics} device="desktop" />

      {/* Row 3: Main Analysis + Priorities */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        <div className="col-span-8">
          <DashboardMainPanel mainPanel={mainPanel} />
        </div>
        <div className="col-span-4">
          <DashboardPriorityPanel priorities={priorities} alerts={alerts} />
        </div>
      </div>

      {/* Row 4: Data Table + AI Insight */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        <div className="col-span-8">
          {table ? (
            <DashboardTablePanel table={table} />
          ) : (
            <div className="h-full bg-surface border border-border p-5 rounded-lg flex items-center justify-center text-xs text-muted">
              Aucun tableau de données disponible
            </div>
          )}
        </div>
        <div className="col-span-4">
          <DashboardAiPanel insight={mainInsight} />
        </div>
      </div>

      {/* Row 5: Activity + Quick Actions */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        <div className="col-span-8">
          <DashboardActivityFeed activities={activityFeed} />
        </div>
        <div className="col-span-4">
          <DashboardQuickActions actions={quickActions} />
        </div>
      </div>
    </div>
  )
}
