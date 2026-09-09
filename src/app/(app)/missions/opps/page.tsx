import "server-only"

import type { ReactNode } from "react"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getNeedsStaffingSharedData } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getMobileStaffingsList } from "@/app/(app)/staffing/_data/get-staffings-list"
import { NeedsStaffingWorkspace } from "@/components/needs-staffing/NeedsStaffingWorkspace"
import {
  parseOpportunitiesSection,
  searchParamsToString,
} from "@/features/opportunities/navigation/opportunities-sections"
import { OpportunitiesDesktopShell } from "@/features/opportunities/desktop/OpportunitiesDesktopShell"
import { getOpportunitiesSynthese } from "@/features/opportunities/data/get-opportunities-synthese"
import { SummaryDesktop } from "@/features/opportunities/summary/SummaryDesktop"
import { getNeedsChapterData } from "@/features/opportunities/needs/data/get-needs-chapter-data"
import { parseNeedsSelection } from "@/features/opportunities/needs/data/needs-selection"
import { NeedsDesktop } from "@/features/opportunities/needs/NeedsDesktop"
import { PresalesDesktop } from "@/features/opportunities/presales/PresalesDesktop"
import { getPlanningChapterData } from "@/features/opportunities/planning/data/get-planning-chapter-data"
import { parsePlanningSelection } from "@/features/opportunities/planning/data/planning-selection"
import { PlanningDesktop } from "@/features/opportunities/planning/PlanningDesktop"
import {
  buildOpportunitiesModuleHref,
  parseOpportunitiesModule,
} from "@/features/opportunities/modules/opportunities-modules"
import {
  OpportunitiesModulesHost,
  type OpportunitiesModuleContext,
} from "@/features/opportunities/modules/OpportunitiesModulesHost"
import { OPPORTUNITIES_CANONICAL_PATH } from "@/features/opportunities/navigation/opportunities-sections"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"

// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — orchestrateur de la route `/missions/opps`
//  (chantier docs/FEATURES/opportunities_workspace/).
//
//  Route canonique inchangée (OPP-02), hors du groupe `(tabbed)` : le shell est
//  porté par la feature (`SectionRail` V2 inline), plus par
//  `missions/(tabbed)/layout.tsx` (qui reste pour `actives` / `projets`).
//
//  Navigation inter-chapitres : `?section=` (OPP-04). État racine `synthese`
//  sans paramètre. Compat des anciennes URLs `?scope=needs|staffing` → chapitre
//  `besoins`, résolue au parsing (OPP-16).
//
//   - `synthese`    → view-model Lot 3 + `SummaryDesktop` (Lot 4) ;
//   - `besoins`     → `getNeedsChapterData` (Lot 5) + `NeedsDesktop` sur
//                     `OpportunitiesTriPanel` (Lot 6) — sélection `?opp=` ;
//   - `avant-vente` → `PresalesDesktop` — structure 3 panneaux + `EmptyState` (Lot 7) ;
//   - `planning`    → milestone planning Mois / Année (Lot 9).
//
//  Mobile INCHANGÉ : la branche `device === "mobile"` rend le Mobile legacy
//  (`NeedsStaffingWorkspace` mobile), le shell V2 n'est jamais monté sur Mobile.
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Record<string, string | string[] | undefined>

/** Contexte opportunité pour les modules contextuels (Lot 10) — jamais une requête de plus. */
function toModuleContext(
  detail: OpportunityDetailData | null | undefined,
): OpportunitiesModuleContext | null {
  if (!detail) return null
  return {
    opportunityId: detail.opportunity.id,
    opportunityTitle: detail.opportunity.title,
    companyId: detail.opportunity.company_id,
    companyName: detail.account?.name ?? null,
    salesDailyRate: detail.opportunity.target_daily_rate,
  }
}

export default async function OpportunitesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [device, resolvedSearchParams] = await Promise.all([
    getDashboardDevice(),
    searchParams,
  ])

  const activeSection = parseOpportunitiesSection(resolvedSearchParams)

  // ── Mobile : inchangé — Mobile legacy « Besoins & Staffing » ────────────────
  if (device === "mobile") {
    const [sharedData, needsRows, mobileStaffingsRows] = await Promise.all([
      getNeedsStaffingSharedData(),
      getOpportunitiesList({ onlyStaffingNeeds: true }),
      getMobileStaffingsList(),
    ])

    return (
      <NeedsStaffingWorkspace
        device={device}
        sharedData={sharedData}
        needsData={{ rows: needsRows, planningData: [] }}
        mobileStaffingRows={mobileStaffingsRows}
      />
    )
  }

  // ── Desktop : shell SHELL-0018 V2 + contenu du chapitre actif ───────────────
  const searchParamsString = searchParamsToString(resolvedSearchParams)
  const activeModule = parseOpportunitiesModule(resolvedSearchParams)

  // Contenu du chapitre + contexte opportunité pour les modules (Lot 10) — le
  // contexte est extrait du détail DÉJÀ chargé par le chapitre, jamais requêté à part.
  let chapterContent: ReactNode
  let moduleContext: OpportunitiesModuleContext | null = null

  if (activeSection === "besoins") {
    const data = await getNeedsChapterData(parseNeedsSelection(resolvedSearchParams))
    chapterContent = <NeedsDesktop data={data} searchParamsString={searchParamsString} />
    moduleContext = toModuleContext(data.selectedNeedDetail)
  } else if (activeSection === "synthese") {
    const vm = await getOpportunitiesSynthese()
    chapterContent = <SummaryDesktop vm={vm} />
  } else if (activeSection === "avant-vente") {
    chapterContent = <PresalesDesktop />
  } else {
    const planningData = await getPlanningChapterData(
      parsePlanningSelection(resolvedSearchParams),
    )
    chapterContent = <PlanningDesktop data={planningData} searchParamsString={searchParamsString} />
    moduleContext = toModuleContext(planningData.selectedOpportunityDetail)
  }

  return (
    <OpportunitiesDesktopShell activeSection={activeSection} searchParamsString={searchParamsString}>
      {chapterContent}
      {activeModule ? (
        <OpportunitiesModulesHost
          activeModule={activeModule}
          closeHref={buildOpportunitiesModuleHref(
            OPPORTUNITIES_CANONICAL_PATH,
            new URLSearchParams(searchParamsString),
            null,
          )}
          context={moduleContext}
        />
      ) : null}
    </OpportunitiesDesktopShell>
  )
}
