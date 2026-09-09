import "server-only"

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
import { OpportunitiesChapterPlaceholder } from "@/features/opportunities/desktop/OpportunitiesChapterPlaceholder"
import { getOpportunitiesSynthese } from "@/features/opportunities/data/get-opportunities-synthese"
import { SummaryDesktop } from "@/features/opportunities/summary/SummaryDesktop"
import { getNeedsChapterData } from "@/features/opportunities/needs/data/get-needs-chapter-data"
import { parseNeedsSelection } from "@/features/opportunities/needs/data/needs-selection"
import { NeedsDesktop } from "@/features/opportunities/needs/NeedsDesktop"
import { PresalesDesktop } from "@/features/opportunities/presales/PresalesDesktop"

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
//   - `planning`    → `EmptyState` provisoire (Lot 9).
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
    const data = await getNeedsChapterData(parseNeedsSelection(resolvedSearchParams))
    return (
      <OpportunitiesDesktopShell activeSection={activeSection} searchParamsString={searchParamsString}>
        <NeedsDesktop data={data} searchParamsString={searchParamsString} />
      </OpportunitiesDesktopShell>
    )
  }

  if (activeSection === "synthese") {
    const vm = await getOpportunitiesSynthese()
    return (
      <OpportunitiesDesktopShell activeSection={activeSection} searchParamsString={searchParamsString}>
        <SummaryDesktop vm={vm} />
      </OpportunitiesDesktopShell>
    )
  }

  if (activeSection === "avant-vente") {
    return (
      <OpportunitiesDesktopShell activeSection={activeSection} searchParamsString={searchParamsString}>
        <PresalesDesktop />
      </OpportunitiesDesktopShell>
    )
  }

  // planning → EmptyState provisoire (Lot 9)
  return (
    <OpportunitiesDesktopShell activeSection={activeSection} searchParamsString={searchParamsString}>
      <OpportunitiesChapterPlaceholder section={activeSection} />
    </OpportunitiesDesktopShell>
  )
}
