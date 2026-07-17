"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TaskCreateModal } from "@/components/tasks/TaskCreateModal"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { OpportunityDetailHeader } from "./OpportunityDetailHeader"
import { OpportunityDetailTabs, type OpportunityDetailTabId } from "./OpportunityDetailTabs"
import { OpportunityFinanceTab } from "./OpportunityFinanceTab"
import { OpportunityOverviewTab } from "./OpportunityOverviewTab"
import { OpportunityPipeline } from "./OpportunityPipeline"
import { OpportunityStaffingTab } from "./OpportunityStaffingTab"
import { OpportunityTimelineTab } from "./OpportunityTimelineTab"

interface OpportunityDetailViewProps {
  data: OpportunityDetailData
  device: DashboardDevice
}

export function OpportunityDetailView({ data, device }: OpportunityDetailViewProps) {
  const router = useRouter()
  const isMobile = device === "mobile"
  const [activeTab, setActiveTab] = useState<OpportunityDetailTabId>("overview")
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const openOpportunityDrawer = useStaffingDrawerStore((state) => state.openOpportunityDrawer)

  const refresh = () => router.refresh()
  const positionProfile = () => openOpportunityDrawer(data.opportunity.id, "staffing")

  return (
    <>
      <main className={isMobile ? "mx-auto min-h-dvh w-full max-w-[390px] bg-canvas px-4 pb-10 pt-4" : "w-full px-6 py-7 lg:px-10"}>
        <div className={isMobile ? "w-full" : "mx-auto w-full max-w-[1440px]"}>
          <OpportunityDetailHeader
            opportunity={data.opportunity}
            account={data.account}
            isMobile={isMobile}
            onBack={() => router.back()}
            onCreateEvent={() => setActiveTab("timeline")}
            onCreateTask={() => setTaskModalOpen(true)}
            onPositionProfile={positionProfile}
          />

          {!isMobile ? (
            <OpportunityPipeline stage={data.opportunity.stage} updatedAt={data.opportunity.updated_at} />
          ) : null}

          <OpportunityDetailTabs activeTab={activeTab} isMobile={isMobile} onTabChange={setActiveTab} />

          <div
            id={`opportunity-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`opportunity-tab-${activeTab}`}
            className={isMobile ? "pt-5" : "pt-8"}
          >
            {activeTab === "overview" ? (
              <OpportunityOverviewTab data={data} isMobile={isMobile} onRefresh={refresh} />
            ) : null}
            {activeTab === "staffing" ? (
              <OpportunityStaffingTab data={data} isMobile={isMobile} onPositionProfile={positionProfile} />
            ) : null}
            {activeTab === "timeline" ? (
              <OpportunityTimelineTab data={data} isMobile={isMobile} onRefresh={refresh} onCreateTask={() => setTaskModalOpen(true)} />
            ) : null}
            {activeTab === "finance" ? (
              <OpportunityFinanceTab data={data} isMobile={isMobile} />
            ) : null}
          </div>
        </div>
      </main>

      <TaskCreateModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        entityType="opportunity"
        entityId={data.opportunity.id}
        onCreated={refresh}
      />
    </>
  )
}
