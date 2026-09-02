"use client"

import { useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import type { ResolvedPageCockpitConfig } from "@/lib/intelligence/intelligence-registry"
import { doesCockpitPatternMatch } from "@/lib/intelligence/intelligence-registry"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { IntelligenceActionCard } from "../IntelligenceActionCard"
import { MissionComposerMobile } from "@/features/intelligence-missions/components/MissionComposerMobile"
import { MATCHING_COMPOSER_ACTION_ID } from "@/lib/intelligence/matching-composer-action"
import { MISSION_COMPOSER_ACTION_CONFIGS } from "@/features/intelligence-missions/components/mission-composer-model"
import { CockpitActionCard, CockpitModuleCard } from "./CockpitIntelligenceCards"
import { CockpitIntelligenceShell, CockpitSectionHeader } from "./CockpitIntelligenceShell"
import { cockpitActionIcons } from "../cockpit-action-icons"

// ─── Modules « launcher » ────────────────────────────────────────────────────
//
//  Un module déclaré `kind: "launcher"` dans le registre ouvre un flow client au
//  lieu de naviguer. Le composant n'est chargé qu'à l'ouverture (`next/dynamic`,
//  `ssr: false`) : le panneau reste léger tant qu'on n'a rien ouvert.
//
//  Un launcher doit être AUTOPORTANT — il charge ses propres données depuis le
//  client. Un module `launcher` sans entrée ici reste inerte, ce qui est le
//  comportement voulu : son statut registre est alors `coming_soon`.

const FinancialModelingMobileFlow = dynamic(
  () => import("@/features/financial-modeling/components/mobile/FinancialModelingMobileFlow").then((module) => module.FinancialModelingMobileFlow),
  { ssr: false },
)

const MatchingComposer = dynamic(
  () => import("@/components/intelligence/matching/MatchingComposer").then((module) => module.MatchingComposer),
  { ssr: false },
)

const AutomationMetricsModal = dynamic(
  () => import("@/features/automation-metrics/AutomationMetricsModal").then((module) => module.AutomationMetricsModal),
  { ssr: false },
)

type ModuleLauncherProps = { onClose: () => void }

export const MODULE_LAUNCHERS: Record<string, (props: ModuleLauncherProps) => ReactNode> = {
  financial_modeling: ({ onClose }) => (
    <FinancialModelingMobileFlow open onOpenChange={(next) => { if (!next) onClose() }} />
  ),
  automation_metrics: ({ onClose }) => (
    <AutomationMetricsModal open onClose={onClose} displayMode="mobile" />
  ),
}

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
  const [openLauncherId, setOpenLauncherId] = useState<string | null>(null)

  const openLauncher = openLauncherId ? MODULE_LAUNCHERS[openLauncherId] : undefined

  const missionConfig = missionActionId ? MISSION_COMPOSER_ACTION_CONFIGS[missionActionId] : null

  if (missionActionId === MATCHING_COMPOSER_ACTION_ID) {
    return (
      <CockpitIntelligenceShell>
        <MatchingComposer variant="mobile" onBack={() => setMissionActionId(null)} />
      </CockpitIntelligenceShell>
    )
  }

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
                if (actionId === MATCHING_COMPOSER_ACTION_ID || actionId in MISSION_COMPOSER_ACTION_CONFIGS) {
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
              href={module.kind === "route" ? module.href : undefined}
              // Un module `launcher` sans implémentation ne peut pas se prétendre
              // actif : la carte retombe sur « à venir » plutôt que d'offrir un
              // clic sans effet. L'invariant est testé, ceci en est le filet.
              state={
                module.kind === "launcher" && !(module.id in MODULE_LAUNCHERS)
                  ? "coming_soon"
                  : module.status
              }
              // « Page courante » ne vaut que pour une navigation : un launcher
              // s'ouvre par-dessus la page, y compris sa page d'origine.
              current={module.kind === "route" && !!module.href && doesCockpitPatternMatch(pathname, module.href)}
              onClick={
                module.kind === "launcher" && module.id in MODULE_LAUNCHERS
                  ? () => setOpenLauncherId(module.id)
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {openLauncher ? openLauncher({ onClose: () => setOpenLauncherId(null) }) : null}
    </CockpitIntelligenceShell>
  )
}
