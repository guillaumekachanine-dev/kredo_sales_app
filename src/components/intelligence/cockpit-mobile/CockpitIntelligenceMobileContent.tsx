"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import type { ResolvedPageCockpitConfig } from "@/lib/intelligence/intelligence-registry"
import { doesCockpitPatternMatch } from "@/lib/intelligence/intelligence-registry"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { IntelligenceActionCard } from "../IntelligenceActionCard"
import { MissionComposerMobile } from "@/features/intelligence-missions/components/MissionComposerMobile"
import { MISSION_COMPOSER_ACTION_CONFIGS } from "@/features/intelligence-missions/components/mission-composer-model"
import { CockpitActionCard, CockpitModuleCard } from "./CockpitIntelligenceCards"
import { CockpitIntelligenceShell, CockpitSectionHeader } from "./CockpitIntelligenceShell"
import { cockpitActionIcons } from "../cockpit-action-icons"

const FinancialModelingMobileFlow = dynamic(
  () => import("@/features/financial-modeling/components/mobile/FinancialModelingMobileFlow").then((module) => module.FinancialModelingMobileFlow),
  { ssr: false },
)

const COMMON_MOBILE_ACTIONS = [
  {
    id: "write_pitch",
    label: "Rédiger mail / pitch",
    iconSrc: cockpitActionIcons.message,
    onClick: () =>
      openCommunicationComposer({
        origin: "intelligence_common",
        selectedOutputKind: "written_message",
        startWithGeneralPicker: true,
      }),
  },
  {
    id: "report_summary",
    label: "Générer synthèse / analyse",
    iconSrc: cockpitActionIcons.generatedReport,
    onClick: () => openReportGeneration({ origin: "intelligence_common" }),
  },
] as const

export function CockpitIntelligenceMobileContent({
  pathname,
  resolved,
  onActionClick,
}: {
  pathname: string
  resolved: ResolvedPageCockpitConfig
  onActionClick: (actionId: string) => void
}) {
  const [missionActionId, setMissionActionId] = useState<string | null>(null)
  const [isFinancialModelingOpen, setIsFinancialModelingOpen] = useState(false)

  const missionConfig = missionActionId ? MISSION_COMPOSER_ACTION_CONFIGS[missionActionId] : null

  if (missionConfig) {
    return (
      <CockpitIntelligenceShell>
        <MissionComposerMobile config={missionConfig} onBack={() => setMissionActionId(null)} />
      </CockpitIntelligenceShell>
    )
  }

  return (
    <CockpitIntelligenceShell>
      <section>
        <CockpitSectionHeader label="Actions" />
        <div className="grid grid-cols-2 gap-[0.6875rem]">
          {resolved.actions.map((action) => (
            <IntelligenceActionCard
              key={action.id}
              action={action}
              tone="cockpit-mobile"
              onActionClick={(actionId) => {
                if (actionId in MISSION_COMPOSER_ACTION_CONFIGS) {
                  setMissionActionId(actionId)
                  return
                }
                onActionClick(actionId)
              }}
            />
          ))}

          {COMMON_MOBILE_ACTIONS.map((action) => (
            <CockpitActionCard
              key={action.id}
              label={action.label}
              iconSrc={action.iconSrc}
              onClick={action.onClick}
            />
          ))}
        </div>
      </section>

      <section>
        <CockpitSectionHeader label="Modules" />
        <div className="grid grid-cols-2 gap-[0.6875rem]">
          {resolved.modules.map((module) => (
            <CockpitModuleCard
              key={module.id}
              label={module.label}
              description={module.description}
              icon={module.icon}
              href={module.href}
              state={module.status}
              current={doesCockpitPatternMatch(pathname, module.href)}
              onClick={module.id === "financial_modeling" ? () => setIsFinancialModelingOpen(true) : undefined}
            />
          ))}
        </div>
      </section>

      {isFinancialModelingOpen && (
        <FinancialModelingMobileFlow
          open={isFinancialModelingOpen}
          onOpenChange={setIsFinancialModelingOpen}
        />
      )}
    </CockpitIntelligenceShell>
  )
}
