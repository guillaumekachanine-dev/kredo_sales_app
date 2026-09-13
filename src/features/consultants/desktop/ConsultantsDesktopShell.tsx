"use client"

import type { ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry } from "@/lib/navigation/section-rail"
import {
  buildConsultantsModuleHref,
  buildConsultantsSectionHref,
  CONSULTANTS_DESKTOP_CHAPTERS,
  HEADER_TITLE_BY_SECTION,
  resolveConsultantsDesktopEntry,
  type ConsultantsContextualModule,
  type ConsultantsDesktopChapter,
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
import { PoolCompetencesDesktop } from "../modules/pool-competences/desktop/PoolCompetencesDesktop"
import type { ConsultantsSkillsData } from "../data/get-consultants-skills"

// ─────────────────────────────────────────────────────────────────────────────
//  Shell Desktop du Consultants Workspace, en trois pièces :
//   - `ConsultantsDesktopShell` — chrome pur (rail `SectionRail` + header) ;
//   - `ConsultantsDesktopFrame` — le même chrome piloté par l'URL, monté par le
//     layout (audit d'ouverture des pages, O-1) ;
//   - `ConsultantsDesktopModules` — overlays des modules, montés par la page.
//
//  SHELL-0018 V2 : chapeau navy = titre de page (« Consultants ») ; le header
//  de la zone principale affiche toujours le nom exact du chapitre actif.
//
//  Phase 7.2 : 4 chapitres Desktop (`CONSULTANTS_DESKTOP_CHAPTERS`).
//  Modules contextuels : « Pool de compétences » (ex-chapitre, Phase 7.2),
//  « Production & Congés » (Lot 12), « Matching Profil » (Lot 13).
// ─────────────────────────────────────────────────────────────────────────────

const ICON_BY_SECTION: Record<ConsultantsSection, ReactNode> = {
  synthese: <SyntheseIcon />,
  collaborateurs: <CollaborateursIcon />,
  "activite-conges": <ActiviteCongesIcon />,
  candidats: <CandidatsIcon />,
  "pool-competences": <PoolCompetencesIcon />,
}

interface ConsultantsDesktopShellProps {
  activeSection: ConsultantsDesktopChapter
  activeModule?: ConsultantsContextualModule | null
  children?: ReactNode
}

// Chrome pur (rail + header), sans aucune donnée. Rendu par `ConsultantsDesktopFrame`
// depuis le layout du module — audit d'ouverture des pages, O-1.
export function ConsultantsDesktopShell({
  activeSection,
  activeModule,
  children,
}: ConsultantsDesktopShellProps) {
  const chapters: SectionRailEntry[] = CONSULTANTS_DESKTOP_CHAPTERS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    icon: ICON_BY_SECTION[entry.key],
    href: entry.href,
    active: !entry.external && entry.key === activeSection,
  }))

  const contextualModules: SectionRailEntry[] = [
    {
      key: "pool-competences",
      label: "Pool de compétences",
      icon: <PoolCompetencesIcon />,
      href: buildConsultantsModuleHref(activeSection, "pool-competences"),
      active: activeModule === "pool-competences",
    },
    {
      key: "production-conges",
      label: "Production & Congés",
      icon: <ProductionCongesIcon />,
      href: buildConsultantsModuleHref(activeSection, "production-conges"),
      active: activeModule === "production-conges",
    },
    {
      key: "matching-profil",
      label: "Matching Profil",
      icon: <MatchingProfilIcon />,
      href: buildConsultantsModuleHref(activeSection, "matching-profil"),
      active: activeModule === "matching-profil",
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
    </div>
  )
}

// Monté par `app/(app)/consultants/layout.tsx`. L'état actif est relu dans l'URL par
// la MÊME fonction pure que la page (`resolveConsultantsDesktopEntry`) : le rail et
// le contenu ne peuvent pas diverger.
export function ConsultantsDesktopFrame({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const entry = resolveConsultantsDesktopEntry(
    searchParams.get("section"),
    searchParams.get("module"),
  )

  return (
    <ConsultantsDesktopShell activeSection={entry.chapter} activeModule={entry.module}>
      {children}
    </ConsultantsDesktopShell>
  )
}

// ─── Modules contextuels ─────────────────────────────────────────────────────
//  Rendus par la page, qui seule en charge les données. Tous sont des `<dialog>`
//  modaux : leur position dans le DOM est indifférente.

interface ConsultantsDesktopModulesProps {
  activeSection: ConsultantsDesktopChapter
  activeModule: ConsultantsContextualModule | null
  poolSkillsData?: ConsultantsSkillsData | null
  productionLeaveVm?: ProductionLeaveViewModel | null
  profileMatchingVm?: ProfileMatchingViewModel | null
  initialPersonId?: string | null
}

export function ConsultantsDesktopModules({
  activeSection,
  activeModule,
  poolSkillsData,
  productionLeaveVm,
  profileMatchingVm,
  initialPersonId,
}: ConsultantsDesktopModulesProps) {
  const closeHref = buildConsultantsSectionHref(activeSection)

  return (
    <>
      {/* Module « Pool de compétences » (Phase 7.2 — ex-chapitre) */}
      {activeModule === "pool-competences" && poolSkillsData ? (
        <PoolCompetencesDesktop data={poolSkillsData} closeHref={closeHref} />
      ) : null}

      {/* Module transverse Production & Congés (Lot 12) */}
      {activeModule === "production-conges" && productionLeaveVm ? (
        <ProductionLeaveDesktop vm={productionLeaveVm} closeHref={closeHref} />
      ) : null}

      {/* Module transverse Matching Profil (Lot 13) */}
      {activeModule === "matching-profil" && profileMatchingVm ? (
        <ProfileMatchingDesktop
          vm={profileMatchingVm}
          closeHref={closeHref}
          initialPersonId={initialPersonId}
        />
      ) : null}
    </>
  )
}
