import { SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"
import { DashboardHeader } from "./layout/DashboardHeader"
import { DashboardKpiGrid } from "./layout/DashboardKpiGrid"
import { DashboardPriorityPanel } from "./layout/DashboardPriorityPanel"
import { DashboardQuickActions } from "./layout/DashboardQuickActions"
import { DashboardAiPanel } from "./layout/DashboardAiPanel"
import { DashboardActivityFeed } from "./layout/DashboardActivityFeed"

interface SectionMobileDashboardProps {
  config: SectionDashboardConfig
  data: SectionDashboardData
}

export function SectionMobileDashboard({ config, data }: SectionMobileDashboardProps) {
  const { title, description, primaryAction } = config
  const { metrics, alerts, priorities, mainInsight, activityFeed, quickActions, syncStatus } = data

  return (
    <div className="w-full px-4 py-5 flex flex-col gap-4 bg-canvas">
      {/* 1. Compact Header */}
      <DashboardHeader
        title={title}
        description={description}
        primaryAction={primaryAction}
        syncStatus={syncStatus}
        device="mobile"
      />

      {/* 2. KPI Grid (Hero KPI + Mini KPIs) */}
      <DashboardKpiGrid metrics={metrics} device="mobile" />

      {/* 3. Priorities list */}
      <DashboardPriorityPanel
        priorities={priorities}
        alerts={alerts}
        title="Priorités"
        className="shadow-sm"
      />

      {/* 4. Quick Actions */}
      {quickActions && quickActions.length > 0 && (
        <DashboardQuickActions actions={quickActions} className="shadow-sm" />
      )}

      {/* 5. AI Summary */}
      {mainInsight && (
        <DashboardAiPanel insight={mainInsight} className="shadow-sm" />
      )}

      {/* 6. Recent Activity */}
      {activityFeed && activityFeed.length > 0 && (
        <DashboardActivityFeed activities={activityFeed} className="shadow-sm" />
      )}
    </div>
  )
}
