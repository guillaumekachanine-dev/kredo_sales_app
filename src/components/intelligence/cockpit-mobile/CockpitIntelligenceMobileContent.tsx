"use client"

import { useState } from "react"
import type { ResolvedPageCockpitConfig } from "@/lib/intelligence/intelligence-registry"
import { doesCockpitPatternMatch } from "@/lib/intelligence/intelligence-registry"
import { IntelligenceActionCard } from "../IntelligenceActionCard"
import { MissionComposerMobile } from "@/features/intelligence-missions/components/MissionComposerMobile"
import { MISSION_COMPOSER_ACTION_CONFIGS } from "@/features/intelligence-missions/components/mission-composer-model"
import {
  CockpitModuleCard,
  CockpitShortcutCard,
  type CockpitShortcutKind,
} from "./CockpitIntelligenceCards"
import { CockpitIntelligenceShell, CockpitSectionHeader } from "./CockpitIntelligenceShell"

const COCKPIT_SHORTCUTS: Array<{
  label: string
  href: string
  kind: CockpitShortcutKind
}> = [
  { label: "Documents", href: "/reports", kind: "documents" },
  { label: "KB", href: "/knowledge", kind: "knowledge" },
  { label: "Workflows", href: "/automations", kind: "workflows" },
  { label: "Paramètres", href: "/settings", kind: "settings" },
]

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
        {resolved.actions.length > 0 ? (
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
          </div>
        ) : (
          <p className="rounded-[0.875rem] border border-dashed border-cockpit-action-border bg-surface px-4 py-5 text-center text-[11px] font-medium text-body">
            Aucune action disponible sur cette page.
          </p>
        )}
      </section>

      <section>
        <CockpitSectionHeader label="Modules" />
        {resolved.modules.length > 0 ? (
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
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[0.875rem] border border-dashed border-cockpit-action-border bg-surface px-4 py-4 text-center text-[11px] font-medium text-body">
            Aucun module disponible sur cette page.
          </p>
        )}
      </section>

      <section>
        <CockpitSectionHeader label="Raccourcis" />
        <nav aria-label="Raccourcis du Cockpit Intelligence" className="grid grid-cols-4 gap-[0.5625rem]">
          {COCKPIT_SHORTCUTS.map((shortcut) => (
            <CockpitShortcutCard
              key={shortcut.href}
              {...shortcut}
              current={doesCockpitPatternMatch(pathname, shortcut.href)}
            />
          ))}
        </nav>
      </section>
    </CockpitIntelligenceShell>
  )
}
