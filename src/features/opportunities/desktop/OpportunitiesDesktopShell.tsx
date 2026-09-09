"use client"

import { useEffect, type ReactNode } from "react"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry } from "@/lib/navigation/section-rail"
import {
  buildOpportunitiesSectionHref,
  HEADER_TITLE_BY_SECTION,
  OPPORTUNITIES_CANONICAL_PATH,
  OPPORTUNITIES_SECTIONS,
  type OpportunitiesSection,
} from "../navigation/opportunities-sections"
import {
  AvantVenteIcon,
  BesoinsStaffingIcon,
  PlanningIcon,
  SyntheseIcon,
} from "../navigation/opportunities-icons"

// ─────────────────────────────────────────────────────────────────────────────
//  Shell Desktop du Opportunities Workspace — chrome uniquement (repli sidebar +
//  navigation secondaire verticale `SectionRail` inline + header). Le contenu du
//  chapitre actif est composé côté serveur et passé en `children`.
//
//  SHELL-0018 V2 : chapeau navy = titre de page (« Opportunités » → racine) ; le
//  header de la zone principale affiche toujours le nom exact du chapitre actif,
//  distinct du chapeau. Navigation 100 % URL-driven (`?section=`) : le serveur
//  relit l'URL et transmet la query courante ; le rail reconstruit les `href` de
//  chapitre en préservant les query params tiers.
//
//  Lot 1 : aucun module contextuel → `contextualModules` n'est pas passé.
// ─────────────────────────────────────────────────────────────────────────────

const ICON_BY_SECTION: Record<OpportunitiesSection, ReactNode> = {
  synthese: <SyntheseIcon />,
  besoins: <BesoinsStaffingIcon />,
  "avant-vente": <AvantVenteIcon />,
  planning: <PlanningIcon />,
}

interface OpportunitiesDesktopShellProps {
  activeSection: OpportunitiesSection
  /** Query string courante (aplatie côté serveur) — sert à préserver les params tiers. */
  searchParamsString?: string
  children: ReactNode
}

export function OpportunitiesDesktopShell({
  activeSection,
  searchParamsString = "",
  children,
}: OpportunitiesDesktopShellProps) {
  // Repli automatique de la sidebar principale (même pattern que /missions, /reports, /consultants).
  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

  const currentSearchParams = new URLSearchParams(searchParamsString)

  const chapters: SectionRailEntry[] = OPPORTUNITIES_SECTIONS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    icon: ICON_BY_SECTION[entry.key],
    href: buildOpportunitiesSectionHref(
      OPPORTUNITIES_CANONICAL_PATH,
      currentSearchParams,
      entry.key,
    ),
    active: entry.key === activeSection,
  }))

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-canvas text-body">
      <SectionRail
        ariaLabel="Navigation Opportunités"
        title="Opportunités"
        home={{ href: OPPORTUNITIES_CANONICAL_PATH }}
        chapters={chapters}
      />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-5 border-b border-border bg-surface px-5 py-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            {HEADER_TITLE_BY_SECTION[activeSection]}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
      </section>
    </div>
  )
}
