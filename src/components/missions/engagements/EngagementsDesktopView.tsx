"use client"

import { type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry } from "@/lib/navigation/section-rail"
import { ProductionLeaveDesktop } from "@/features/consultants/modules/production-leave/desktop/ProductionLeaveDesktop"
import type { ProductionLeaveViewModel } from "@/features/consultants/modules/production-leave/data/production-leave.types"
import { PortfolioAtlasDialog } from "@/components/missions/dashboard/PortfolioAtlasDialog"
import type { EngagementsPortfolioViewModel } from "@/components/missions/dashboard/engagements-portfolio-types"
import {
  buildEngagementsModuleHref,
  buildEngagementsViewHref,
  ENGAGEMENTS_MODULE_LABELS,
  ENGAGEMENTS_VIEW_LABELS,
  ENGAGEMENTS_VIEWS,
  type EngagementsContextualModule,
  type EngagementsView,
} from "./engagements-navigation"
import {
  ActivityIcon,
  BriefcaseIcon,
  CalendarRangeIcon,
  ChartBarIcon,
  LayoutGridIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from "./engagement-icons"

// ─────────────────────────────────────────────────────────────────────────────
//  Shell Desktop d'Engagements — chrome uniquement (thème + repli sidebar + nav
//  secondaire verticale `SectionRail` + header). Le contenu du chapitre actif
//  (Synthèse, Missions AT, Projets, Rentabilité des engagements, Planning &
//  Échéances) est composé côté serveur et passé en `children`.
//
//  SHELL-0018 V2 : le titre de page reste dans le chapeau ; le header de la zone
//  principale affiche toujours le nom exact du chapitre actif.
//
//  Phase 7.3B : ajout des modules contextuels REUSE (« Production & Congés »,
//  « Atlas du portefeuille »), montés en overlay et pilotés par `?module=`.
//  L'état reste entièrement reconstructible depuis l'URL.
// ─────────────────────────────────────────────────────────────────────────────

export type { EngagementsView } from "./engagements-navigation"

export interface NavEntry {
  view: EngagementsView
  label: string
  icon: ReactNode
}

const ICON_BY_VIEW: Record<EngagementsView, ReactNode> = {
  synthese: <LayoutGridIcon />,
  "missions-at": <ActivityIcon />,
  projets: <BriefcaseIcon />,
  "activite-conges": <ChartBarIcon />,
  "planning-at": <CalendarRangeIcon />,
}

export const NAV_ENTRIES: NavEntry[] = ENGAGEMENTS_VIEWS.map((view) => ({
  view,
  label: ENGAGEMENTS_VIEW_LABELS[view],
  icon: ICON_BY_VIEW[view],
}))

export const HEADER_TITLE_BY_VIEW: Record<EngagementsView, string> = ENGAGEMENTS_VIEW_LABELS

const MODULE_ICON: Record<EngagementsContextualModule, ReactNode> = {
  "production-conges": <UserRoundIcon />,
  "atlas-portefeuille": <WalletCardsIcon />,
}

interface EngagementsDesktopViewProps {
  activeView: EngagementsView
  activeModule?: EngagementsContextualModule | null
  productionLeaveVm?: ProductionLeaveViewModel | null
  portfolioOverview?: EngagementsPortfolioViewModel | null
  children: ReactNode
}

export function EngagementsDesktopView({
  activeView,
  activeModule = null,
  productionLeaveVm = null,
  portfolioOverview = null,
  children,
}: EngagementsDesktopViewProps) {
  const router = useRouter()
  const closeHref = buildEngagementsViewHref(activeView)

  const contextualModules: SectionRailEntry[] = (
    Object.keys(ENGAGEMENTS_MODULE_LABELS) as EngagementsContextualModule[]
  ).map((moduleKey) => ({
    key: moduleKey,
    label: ENGAGEMENTS_MODULE_LABELS[moduleKey],
    icon: MODULE_ICON[moduleKey],
    href: buildEngagementsModuleHref(activeView, moduleKey),
    active: activeModule === moduleKey,
  }))

  return (
    <div
      data-theme="edito-bright-engagements"
      className="flex h-full min-h-0 w-full overflow-hidden bg-canvas text-body"
    >
      <SectionRail
        ariaLabel="Navigation Engagements"
        title="Engagements"
        home={{ href: "/missions" }}
        chapters={NAV_ENTRIES.map((entry) => ({
          key: entry.view,
          label: entry.label,
          icon: entry.icon,
          href: buildEngagementsViewHref(entry.view),
          active: activeView === entry.view,
        }))}
        contextualModules={contextualModules}
      />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-5 border-b border-border bg-surface px-5 py-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            {HEADER_TITLE_BY_VIEW[activeView]}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
      </section>

      {/* Module REUSE « Production & Congés » (src/features/consultants/modules/production-leave/) */}
      {activeModule === "production-conges" && productionLeaveVm ? (
        <ProductionLeaveDesktop vm={productionLeaveVm} closeHref={closeHref} />
      ) : null}

      {/* Module REUSE « Atlas du portefeuille » (PortfolioAtlasDialog + getEngagementsOverview) */}
      {activeModule === "atlas-portefeuille" && portfolioOverview ? (
        <PortfolioAtlasDialog
          open
          onOpenChange={(next) => {
            if (!next) router.push(closeHref)
          }}
          overview={portfolioOverview}
        />
      ) : null}
    </div>
  )
}
