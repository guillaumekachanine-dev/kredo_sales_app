"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import type { IntelligenceIconKey } from "@/lib/intelligence/intelligence-registry"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { cn } from "@/lib/utils"
import { cockpitIconForAction } from "./cockpit-action-icons"

type PanelAction = {
  id: string
  label: string
  icon: IntelligenceIconKey
  active: boolean
  href?: string
}

const ACCOUNT_ACTIONS: PanelAction[] = [
  { id: "write_email", label: "Rédiger un email", icon: "write_email", active: true },
  { id: "review_account", label: "Revue de compte", icon: "report", active: true },
  { id: "search_news", label: "Signaux", icon: "search_news", active: false },
  { id: "sector_playbook", label: "Playbook", icon: "sector_analysis", active: false },
  { id: "deep_analysis", label: "Analyse", icon: "deep_analysis", active: false },
  { id: "build_roadmap", label: "Roadmap", icon: "build_roadmap", active: false },
  { id: "create_campaign", label: "Campagne", icon: "create_campaign", active: false },
  { id: "generate_report", label: "Fiche compte", icon: "report", active: true },
  { id: "scan_contacts", label: "Scan contacts", icon: "scan_contact", active: true },
]

interface PanelActionsGridProps {
  sectorSlug?: string | null
  onActionClick?: (actionId: string) => void
  onWriteEmailClick?: () => void
  tone?: "dark" | "light"
}

export function PanelActionsGrid({ sectorSlug, onActionClick, onWriteEmailClick, tone = "dark" }: PanelActionsGridProps) {
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
  const cardBaseDark = "kredo-action-card-dark group rounded-xl px-3 py-3 min-h-[82px] cursor-pointer overflow-hidden"
  const activeCls = isDark
    ? cn(cardBaseDark, "text-primary-fg")
    : "group relative flex min-h-[76px] flex-col justify-between overflow-hidden rounded-2xl bg-white/[0.14] px-3 py-3 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:bg-white/[0.20] active:scale-[0.97]"
  const disabledCls = isDark
    ? cn(cardBaseDark, "text-primary-fg/35 cursor-default opacity-55")
    : "group relative flex min-h-[76px] flex-col justify-between overflow-hidden rounded-2xl bg-white/[0.09] px-3 py-3 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] cursor-default opacity-55"

  function Row({ children }: { children: ReactNode }) {
    return isDark ? (
      <span className="relative z-10 flex min-h-full w-full flex-col justify-between gap-2 text-xs font-semibold">{children}</span>
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
                <span className="pointer-events-none absolute -right-6 -top-7 size-20 rounded-full bg-white/10 blur-2xl" />
                <Image
                  src={cockpitIconForAction(action.id, action.icon)}
                  alt=""
                  width={64}
                  height={64}
                  className="relative z-10 size-10 object-contain drop-shadow-[0_10px_16px_rgba(18,24,61,0.25)] transition-transform duration-200 group-hover:scale-105"
                />
                <span className="relative z-10 text-[11px] font-bold leading-tight">{action.label}</span>
              </Row>
            </a>
          )
        }

        return (
          <button
            key={action.id}
            type="button"
            disabled={isDisabled}
            onClick={action.active ? () => {
              if (action.id === "write_email") {
                if (onWriteEmailClick) {
                  onWriteEmailClick()
                  return
                }
                openCommunicationComposer({ origin: "account_panel" })
                return
              }
              onActionClick?.(action.id)
            } : undefined}
            className={isDisabled ? disabledCls : activeCls}
          >
            <Row>
              <span className="pointer-events-none absolute -right-6 -top-7 size-20 rounded-full bg-white/10 blur-2xl" />
              <Image
                src={cockpitIconForAction(action.id, action.icon)}
                alt=""
                width={64}
                height={64}
                className="relative z-10 size-10 object-contain drop-shadow-[0_10px_16px_rgba(18,24,61,0.25)] transition-transform duration-200 group-hover:scale-105"
              />
              <span className="relative z-10 text-[11px] font-bold leading-tight">{action.label}</span>
            </Row>
          </button>
        )
      })}
    </div>
  )
}
