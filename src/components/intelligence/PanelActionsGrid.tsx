"use client"

import type { ReactNode } from "react"
import { IntelligenceIcon } from "./intelligence-icons"
import type { IntelligenceIconKey } from "@/lib/intelligence/intelligence-registry"
import { cn } from "@/lib/utils"

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
  tone?: "dark" | "light"
}

export function PanelActionsGrid({ sectorSlug, onActionClick, tone = "dark" }: PanelActionsGridProps) {
  const isDark = tone === "dark"
  const actions = ACCOUNT_ACTIONS.map((action) => {
    if (action.id === "sector_playbook" && sectorSlug) {
      return { ...action, active: true, href: `/ressources/playbook/${sectorSlug}` }
    }
    return action
  })

  // Dark tone : même carte "relief + bordure ambre + shine" que les actions
  // contextuelles du panneau registre (IntelligenceActionCard / .kredo-action-card-dark),
  // rejouée ici sur la rangée compacte au lieu de la carte pleine hauteur.
  const cardBaseDark = "kredo-action-card-dark rounded px-2.5 py-2 min-h-[40px] cursor-pointer"
  const activeCls = isDark
    ? cn(cardBaseDark, "text-primary-fg")
    : "inline-flex items-center gap-2 rounded border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-heading transition-all hover:bg-surface-hover active:scale-95 min-h-[44px]"
  const disabledCls = isDark
    ? cn(cardBaseDark, "text-primary-fg/35 cursor-default")
    : "inline-flex items-center gap-2 rounded border border-border/60 bg-canvas px-2.5 py-2 text-xs font-semibold text-muted min-h-[44px] cursor-default opacity-70"
  const iconCls = isDark ? "size-4 shrink-0 text-primary-fg/70" : "size-4 shrink-0 text-primary"
  const badgeCls = isDark
    ? "ml-auto shrink-0 rounded-full bg-primary-fg/8 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-primary-fg/40"
    : "ml-auto shrink-0 rounded-full border border-border bg-canvas px-1 py-px text-[7px] font-bold uppercase tracking-wider text-muted"

  function Row({ children }: { children: ReactNode }) {
    return isDark ? (
      <span className="relative z-10 flex w-full items-center gap-2 text-xs font-semibold">{children}</span>
    ) : (
      <>{children}</>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {actions.map((action) => {
        const isDisabled = !action.active

        if (action.href && action.active) {
          return (
            <a key={action.id} href={action.href} className={activeCls}>
              <Row>
                <IntelligenceIcon name={action.icon} className={iconCls} />
                <span className="truncate">{action.label}</span>
              </Row>
            </a>
          )
        }

        return (
          <button
            key={action.id}
            type="button"
            disabled={isDisabled}
            onClick={action.active ? () => onActionClick?.(action.id) : undefined}
            className={isDisabled ? disabledCls : activeCls}
          >
            <Row>
              <IntelligenceIcon name={action.icon} className={isDisabled ? (isDark ? "size-4 shrink-0 text-primary-fg/35" : "size-4 shrink-0 text-muted") : iconCls} />
              <span className="truncate">{action.label}</span>
              {isDisabled && <span className={badgeCls}>Bientôt</span>}
            </Row>
          </button>
        )
      })}
    </div>
  )
}
