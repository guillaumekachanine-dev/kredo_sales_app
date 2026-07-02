"use client"

import { IntelligenceIcon } from "./intelligence-icons"
import type { IntelligenceIconKey } from "@/lib/intelligence/intelligence-registry"

type PanelAction = {
  id: string
  label: string
  icon: IntelligenceIconKey
  active: boolean
  href?: string
}

const ACCOUNT_ACTIONS: PanelAction[] = [
  { id: "generate_pitch", label: "Pitch / mail", icon: "generate_pitch", active: true },
  { id: "search_news", label: "Signaux", icon: "search_news", active: false },
  { id: "sector_playbook", label: "Playbook", icon: "sector_analysis", active: false },
  { id: "deep_analysis", label: "Analyse", icon: "deep_analysis", active: false },
  { id: "build_roadmap", label: "Roadmap", icon: "build_roadmap", active: false },
  { id: "create_campaign", label: "Campagne", icon: "create_campaign", active: false },
  { id: "generate_report", label: "Rapport", icon: "report", active: false },
  { id: "scan_contacts", label: "Scan contacts", icon: "scan_contact", active: false },
]

interface PanelActionsGridProps {
  sectorSlug?: string | null
  onActionClick?: (actionId: string) => void
}

export function PanelActionsGrid({ sectorSlug, onActionClick }: PanelActionsGridProps) {
  const actions = ACCOUNT_ACTIONS.map((action) => {
    if (action.id === "sector_playbook" && sectorSlug) {
      return { ...action, active: true, href: `/ressources/playbook/${sectorSlug}` }
    }
    return action
  })

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {actions.map((action) => {
        const isDisabled = !action.active

        if (action.href && action.active) {
          return (
            <a
              key={action.id}
              href={action.href}
              className="inline-flex items-center gap-2 rounded border border-primary-fg/10 bg-primary-fg/[0.04] px-2.5 py-2 text-xs font-semibold text-primary-fg transition-all hover:bg-primary-fg/[0.08] active:scale-95 min-h-[40px]"
            >
              <IntelligenceIcon name={action.icon} className="size-4 shrink-0 text-primary-fg/70" />
              <span className="truncate">{action.label}</span>
            </a>
          )
        }

        return (
          <button
            key={action.id}
            type="button"
            disabled={isDisabled}
            onClick={action.active ? () => onActionClick?.(action.id) : undefined}
            className={
              isDisabled
                ? "inline-flex items-center gap-2 rounded border border-primary-fg/8 bg-primary-fg/[0.02] px-2.5 py-2 text-xs font-semibold text-primary-fg/35 min-h-[40px] cursor-default"
                : "inline-flex items-center gap-2 rounded border border-primary-fg/10 bg-primary-fg/[0.04] px-2.5 py-2 text-xs font-semibold text-primary-fg transition-all hover:bg-primary-fg/[0.08] active:scale-95 min-h-[40px] cursor-pointer"
            }
          >
            <IntelligenceIcon name={action.icon} className="size-4 shrink-0" />
            <span className="truncate">{action.label}</span>
            {isDisabled && (
              <span className="ml-auto shrink-0 rounded-full bg-primary-fg/8 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-primary-fg/40">
                Bientôt
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
