import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getNeedsStaffingSharedData } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getOpportunitiesPlanning } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { getStaffingsList, getMobileStaffingsList } from "@/app/(app)/staffing/_data/get-staffings-list"
import { getStaffingsPlanning } from "@/app/(app)/staffing/_data/get-staffings-planning"
import { NeedsStaffingWorkspace } from "@/components/needs-staffing/NeedsStaffingWorkspace"
import {
  parseOpportunitiesSection,
  searchParamsToString,
} from "@/features/opportunities/navigation/opportunities-sections"
import { OpportunitiesDesktopShell } from "@/features/opportunities/desktop/OpportunitiesDesktopShell"
import { OpportunitiesChapterPlaceholder } from "@/features/opportunities/desktop/OpportunitiesChapterPlaceholder"

// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — orchestrateur de la route `/missions/opps`
//  (chantier docs/FEATURES/opportunities_workspace/ — Lot 1).
//
//  Route canonique inchangée (OPP-02), mais SORTIE du groupe `(tabbed)` : le
//  shell est désormais porté par la feature (`SectionRail` V2 inline), plus par
//  `missions/(tabbed)/layout.tsx` (qui reste pour `actives` / `projets`).
//
//  Navigation inter-chapitres : `?section=` (OPP-04). État racine `synthese`
//  sans paramètre. Compat des anciennes URLs `?scope=needs|staffing` → chapitre
//  `besoins`, résolue au parsing (OPP-16).
//
//  Lot 1 — aucun contenu métier refait :
//   - `besoins`     → `NeedsStaffingWorkspace` legacy monté TEL QUEL (parité) ;
//   - `synthese` / `avant-vente` / `planning` → `EmptyState` provisoire.
//
//  Mobile INCHANGÉ : la branche `device === "mobile"` rend le Mobile legacy
//  (`NeedsStaffingWorkspace` mobile), le shell V2 n'est jamais monté sur Mobile.
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Record<string, string | string[] | undefined>

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
  //  Dataset mobile léger, comme l'ancienne route `(tabbed)/opps/page.tsx`.
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

  if (activeSection === "besoins") {
    // Parité : mêmes loaders desktop, mêmes props que l'ancienne route.
    const [sharedData, needsRows, needsPlanning, staffingsRows, staffingsPlanning] =
      await Promise.all([
        getNeedsStaffingSharedData(),
        getOpportunitiesList({ onlyStaffingNeeds: true }),
        getOpportunitiesPlanning({ onlyStaffingNeeds: true }),
        getStaffingsList(),
        getStaffingsPlanning(),
      ])

    return (
      <OpportunitiesDesktopShell
        activeSection={activeSection}
        searchParamsString={searchParamsString}
      >
        <NeedsStaffingWorkspace
          device={device}
          sharedData={sharedData}
          needsData={{ rows: needsRows, planningData: needsPlanning }}
          staffingData={{ rows: staffingsRows, planningData: staffingsPlanning }}
        />
      </OpportunitiesDesktopShell>
    )
  }

  // synthese · avant-vente · planning → EmptyState provisoire (Lots 4 / 7 / 9)
  return (
    <OpportunitiesDesktopShell
      activeSection={activeSection}
      searchParamsString={searchParamsString}
    >
      <OpportunitiesChapterPlaceholder section={activeSection} />
    </OpportunitiesDesktopShell>
  )
}
