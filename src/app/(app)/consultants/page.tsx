import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getConsultantsTeam } from "@/features/consultants/data/get-consultants-team"
import { getConsultantsSynthese } from "@/features/consultants/data/get-consultants-synthese"
import { parseConsultantsSection } from "@/features/consultants/navigation/consultants-sections"
import { ConsultantsDesktopShell } from "@/features/consultants/desktop/ConsultantsDesktopShell"
import { ConsultantsMobileShell } from "@/features/consultants/mobile/ConsultantsMobileShell"
import { SyntheseDesktop } from "@/features/consultants/desktop/synthese/SyntheseDesktop"
import { SyntheseMobile } from "@/features/consultants/mobile/synthese/SyntheseMobile"
import { ConsultantsSyntheseDesktop } from "@/components/consultants/synthese/ConsultantsSyntheseDesktop"
import { ConsultantsSyntheseMobile } from "@/components/consultants/synthese/ConsultantsSyntheseMobile"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — orchestrateur de la route `/consultants`
//  (chantier docs/FEATURES/consultants_workspace/).
//
//  Le shell (rail secondaire `SectionRail` + header) est porté par la feature.
//  La navigation inter-chapitres passe par `?section=`. Chaque section ne charge
//  que ses propres données (ADR-0006).
//
//  Lot 3 : `synthese` (racine) rend le tableau de bord dédié
//  (`getConsultantsSynthese`) ; `collaborateurs` garde le tableau collaborateurs
//  actuel (Lot 4 le formalise). Les chapitres `activite-conges` / `candidats` /
//  `pool-competences` restent des liens directs (cf. `CONSULTANTS_SECTIONS`).
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

  if (activeSection === "synthese") {
    const vm = await getConsultantsSynthese()
    if (device === "mobile") {
      return (
        <ConsultantsMobileShell activeSection={activeSection}>
          <SyntheseMobile vm={vm} />
        </ConsultantsMobileShell>
      )
    }
    return (
      <ConsultantsDesktopShell activeSection={activeSection}>
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <SyntheseDesktop vm={vm} />
        </div>
      </ConsultantsDesktopShell>
    )
  }

  // ── section=collaborateurs — tableau collaborateurs actuel (Lot 4 le déplace) ──
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
