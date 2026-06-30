"use client"

import { useState } from "react"
import { MissionDetailHeader } from "./MissionDetailHeader"
import { MissionDetailTabs } from "./MissionDetailTabs"
import { MissionSynthesisTab } from "./MissionSynthesisTab"
import { MissionCollaboratorTab } from "./MissionCollaboratorTab"
import { MissionPlanningTab } from "./MissionPlanningTab"
import { MissionActivityTab } from "./MissionActivityTab"
import { MissionFinancialTab } from "./MissionFinancialTab"
import { getRiskFromMetadata } from "./mission-detail-types"
import type { MissionDetailViewModel, MissionDetailTabId, RiskLevel } from "./mission-detail-types"

interface MissionDetailDesktopProps {
  vm: MissionDetailViewModel
  onRefresh: () => void
}

export function MissionDetailDesktop({ vm, onRefresh }: MissionDetailDesktopProps) {
  const [activeTab, setActiveTab] = useState<MissionDetailTabId>("synthesis")
  const initialRisk = getRiskFromMetadata(vm.mission.metadata)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(initialRisk.level)
  const [riskDescription, setRiskDescription] = useState(initialRisk.description)

  const handleRiskUpdated = (level: RiskLevel, description: string) => {
    setRiskLevel(level)
    setRiskDescription(description)
  }

  const handleTabChange = (tab: MissionDetailTabId) => {
    setActiveTab(tab)
  }

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Header */}
      <div className="px-6 pt-6">
        <MissionDetailHeader
          mission={vm.mission}
          company={vm.company}
          riskLevel={riskLevel}
          riskDescription={riskDescription}
          onRiskUpdated={handleRiskUpdated}
        />
      </div>

      {/* Tab navigation */}
      <div className="px-6 mt-5">
        <MissionDetailTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activeTab === "synthesis" && (
          <MissionSynthesisTab vm={vm} onRefresh={onRefresh} />
        )}
        {activeTab === "collaborator" && (
          <MissionCollaboratorTab vm={vm} />
        )}
        {activeTab === "planning" && (
          <MissionPlanningTab vm={vm} />
        )}
        {activeTab === "activity" && (
          <MissionActivityTab vm={vm} />
        )}
        {activeTab === "financial" && (
          <MissionFinancialTab vm={vm} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  )
}
