import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getConsultantsTeam } from "@/features/consultants/data/get-consultants-team"
import { parseConsultantsSection } from "@/features/consultants/navigation/consultants-sections"
import { ConsultantsDesktopShell } from "@/features/consultants/desktop/ConsultantsDesktopShell"
import { ConsultantsMobileShell } from "@/features/consultants/mobile/ConsultantsMobileShell"
import { ConsultantsSyntheseDesktop } from "@/components/consultants/synthese/ConsultantsSyntheseDesktop"
import { ConsultantsSyntheseMobile } from "@/components/consultants/synthese/ConsultantsSyntheseMobile"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — orchestrateur de la route `/consultants`
//  (chantier docs/FEATURES/consultants_workspace/, Lot 1).
//
//  Le shell (rail secondaire `SectionRail` + header) est porté par la feature,
//  plus par le layout. La navigation inter-chapitres passe par `?section=`.
//
//  Lot 1 : `synthese` (racine) et `collaborateurs` rendent la même vue — le
//  tableau collaborateurs actuel. Lot 3 remplace `synthese` par le tableau de
//  bord dédié ; Lot 4 fait de `collaborateurs` le foyer canonique du tableau.
//  Les chapitres `activite-conges` / `candidats` / `pool-competences` pointent
//  encore vers leur route existante (cf. `CONSULTANTS_SECTIONS`).
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Record<string, string | string[] | undefined>

export default async function ConsultantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [device, resolvedSearchParams] = await Promise.all([
    getDashboardDevice(),
    searchParams,
  ])

  const activeSection = parseConsultantsSection(resolvedSearchParams.section)
  const team = await getConsultantsTeam()

  if (device === "mobile") {
    return (
      <ConsultantsMobileShell activeSection={activeSection}>
        <ConsultantsSyntheseMobile data={team} />
      </ConsultantsMobileShell>
    )
  }

  return (
    <ConsultantsDesktopShell activeSection={activeSection}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <ConsultantsSyntheseDesktop data={team} />
      </div>
    </ConsultantsDesktopShell>
  )
}
