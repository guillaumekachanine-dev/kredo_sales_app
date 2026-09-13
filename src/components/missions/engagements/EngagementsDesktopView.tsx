"use client"

import { type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  parseEngagementsModule,
  parseEngagementsView,
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
//  Shell Desktop d'Engagements, en deux pièces :
//   - `EngagementsDesktopFrame` — chrome (thème + nav secondaire `SectionRail` +
//     header), monté par le layout, piloté par l'URL ;
//   - `EngagementsDesktopModules` — overlays des modules contextuels, montés par
//     la page qui en charge les données.
//  Le contenu du chapitre actif (Synthèse, Missions AT, Projets, Rentabilité des
//  engagements, Planning & Échéances) est composé côté serveur par la page.
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

// ─── Chrome (porté par le layout) ────────────────────────────────────────────
//  Audit d'ouverture des pages (O-1) : le chrome vit dans
//  `app/(app)/missions/(engagements)/layout.tsx`. Il ne dépend d'aucune donnée et
//  lit l'état actif dans l'URL : il est donc rendu AVANT le chapitre et reste en
//  place pendant les changements de chapitre (le `loading.tsx` ne remplace que la
//  zone de contenu).

export function EngagementsDesktopFrame({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const activeView = parseEngagementsView(searchParams.get("vue"))
  const activeModule = parseEngagementsModule(searchParams.get("module"))

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
    </div>
  )
}

// ─── Modules contextuels (rendus par la page : ils dépendent de données) ─────
//  Ce sont des `<dialog>` modaux : leur position dans le DOM est indifférente.

interface EngagementsDesktopModulesProps {
  activeView: EngagementsView
  activeModule: EngagementsContextualModule | null
  productionLeaveVm?: ProductionLeaveViewModel | null
  portfolioOverview?: EngagementsPortfolioViewModel | null
}

export function EngagementsDesktopModules({
  activeView,
  activeModule,
  productionLeaveVm = null,
  portfolioOverview = null,
}: EngagementsDesktopModulesProps) {
  const router = useRouter()
  const closeHref = buildEngagementsViewHref(activeView)

  return (
    <>
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
    </>
  )
}
