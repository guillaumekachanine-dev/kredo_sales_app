"use client"

import { useEffect, type ReactNode } from "react"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry } from "@/lib/navigation/section-rail"
import {
  buildConsultantsModuleHref,
  buildConsultantsSectionHref,
  CONSULTANTS_SECTIONS,
  HEADER_TITLE_BY_SECTION,
  type ConsultantsContextualModule,
  type ConsultantsInShellSection,
  type ConsultantsSection,
} from "../navigation/consultants-sections"
import {
  ActiviteCongesIcon,
  CandidatsIcon,
  CollaborateursIcon,
  MatchingProfilIcon,
  PoolCompetencesIcon,
  ProductionCongesIcon,
  SyntheseIcon,
} from "../navigation/consultants-icons"
import { ProductionLeaveDesktop } from "../modules/production-leave/desktop/ProductionLeaveDesktop"
import type { ProductionLeaveViewModel } from "../modules/production-leave/data/production-leave.types"
import { ProfileMatchingDesktop } from "../modules/profile-matching/desktop/ProfileMatchingDesktop"
import type { ProfileMatchingViewModel } from "../modules/profile-matching/data/profile-matching.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Shell Desktop du Consultants Workspace — chrome uniquement (repli sidebar +
//  navigation secondaire verticale `SectionRail` + header). Le contenu de la
//  section active est composé côté serveur et passé en `children`.
//
//  SHELL-0018 V2 : chapeau navy = titre de page (« Consultants ») ; le header
//  de la zone principale affiche toujours le nom exact du chapitre actif.
//  Modules contextuels : « Production & Congés » (Lot 12), « Matching profil » (Lot 13).
// ─────────────────────────────────────────────────────────────────────────────

const ICON_BY_SECTION: Record<ConsultantsSection, ReactNode> = {
  synthese: <SyntheseIcon />,
  collaborateurs: <CollaborateursIcon />,
  "activite-conges": <ActiviteCongesIcon />,
  candidats: <CandidatsIcon />,
  "pool-competences": <PoolCompetencesIcon />,
}

interface ConsultantsDesktopShellProps {
  activeSection: ConsultantsInShellSection
  activeModule?: ConsultantsContextualModule | null
  productionLeaveVm?: ProductionLeaveViewModel | null
  profileMatchingVm?: ProfileMatchingViewModel | null
  initialPersonId?: string | null
  children?: ReactNode
}

export function ConsultantsDesktopShell({
  activeSection,
  activeModule,
  productionLeaveVm,
  profileMatchingVm,
  initialPersonId,
  children,
}: ConsultantsDesktopShellProps) {
  // Repli automatique de la sidebar principale (même pattern que /missions, /reports).
  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

  const chapters: SectionRailEntry[] = CONSULTANTS_SECTIONS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    icon: ICON_BY_SECTION[entry.key],
    href: entry.href,
    active: !entry.external && entry.key === activeSection,
  }))

  const isProductionCongesActive = activeModule === "production-conges"
  const isMatchingProfilActive = activeModule === "matching-profil"

  const contextualModules: SectionRailEntry[] = [
    {
      key: "production-conges",
      label: "Production & Congés",
      icon: <ProductionCongesIcon />,
      href: buildConsultantsModuleHref(activeSection, "production-conges"),
      active: isProductionCongesActive,
    },
    {
      key: "matching-profil",
      label: "Matching profil",
      icon: <MatchingProfilIcon />,
      href: buildConsultantsModuleHref(activeSection, "matching-profil"),
      active: isMatchingProfilActive,
    },
  ]

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-canvas text-body">
      <SectionRail
        ariaLabel="Navigation Consultants"
        title="Consultants"
        home={{ href: "/consultants" }}
        chapters={chapters}
        contextualModules={contextualModules}
      />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-5 border-b border-border bg-surface px-5 py-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            {HEADER_TITLE_BY_SECTION[activeSection]}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
      </section>

      {/* Module transverse Production & Congés (Lot 12) */}
      {isProductionCongesActive && productionLeaveVm ? (
        <ProductionLeaveDesktop
          vm={productionLeaveVm}
          closeHref={buildConsultantsSectionHref(activeSection)}
        />
      ) : null}

      {/* Module transverse Matching profil (Lot 13) */}
      {isMatchingProfilActive && profileMatchingVm ? (
        <ProfileMatchingDesktop
          vm={profileMatchingVm}
          closeHref={buildConsultantsSectionHref(activeSection)}
          initialPersonId={initialPersonId}
        />
      ) : null}
    </div>
  )
}
