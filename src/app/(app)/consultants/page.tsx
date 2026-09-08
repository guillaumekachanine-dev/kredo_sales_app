import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getConsultantsTeam } from "@/features/consultants/data/get-consultants-team"
import { getConsultantsSynthese } from "@/features/consultants/data/get-consultants-synthese"
import { getConsultantsActivity } from "@/features/consultants/data/get-consultants-activity"
import { parseConsultantsSection } from "@/features/consultants/navigation/consultants-sections"
import { ConsultantsDesktopShell } from "@/features/consultants/desktop/ConsultantsDesktopShell"
import { ConsultantsMobileShell } from "@/features/consultants/mobile/ConsultantsMobileShell"
import { SyntheseDesktop } from "@/features/consultants/desktop/synthese/SyntheseDesktop"
import { SyntheseMobile } from "@/features/consultants/mobile/synthese/SyntheseMobile"
import { CollaboratorsDesktop } from "@/features/consultants/collaborators/CollaboratorsDesktop"
import { CollaboratorsMobile } from "@/features/consultants/collaborators/CollaboratorsMobile"
import { ActivityDashboard } from "@/features/consultants/activity/ActivityDashboard"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — orchestrateur de la route `/consultants`
//  (chantier docs/FEATURES/consultants_workspace/).
//
//  Le shell (rail secondaire `SectionRail` + header) est porté par la feature.
//  La navigation inter-chapitres passe par `?section=`. Chaque section ne charge
//  que ses propres données (ADR-0006).
//
//  Sections internalisées : `synthese` (racine), `collaborateurs`, `activite-conges`.
//  `candidats` (Lot 8) et `pool-competences` (Lot 6) restent des liens directs
//  (cf. `CONSULTANTS_SECTIONS`).
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
  const isMobile = device === "mobile"

  if (activeSection === "synthese") {
    const vm = await getConsultantsSynthese()
    return isMobile ? (
      <ConsultantsMobileShell activeSection={activeSection}>
        <SyntheseMobile vm={vm} />
      </ConsultantsMobileShell>
    ) : (
      <ConsultantsDesktopShell activeSection={activeSection}>
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <SyntheseDesktop vm={vm} />
        </div>
      </ConsultantsDesktopShell>
    )
  }

  if (activeSection === "activite-conges") {
    // Vue analytique dense unique (pas de branche Mobile dédiée — dette PRODUCT-4,
    // chevauchement avec le module Production & Congés du Lot 12). Le contenu
    // large défile horizontalement dans son propre conteneur.
    const data = await getConsultantsActivity()
    const content = (
      <div className="min-h-0 flex-1 overflow-auto bg-canvas">
        <ActivityDashboard data={data} />
      </div>
    )
    return isMobile ? (
      <ConsultantsMobileShell activeSection={activeSection}>{content}</ConsultantsMobileShell>
    ) : (
      <ConsultantsDesktopShell activeSection={activeSection}>{content}</ConsultantsDesktopShell>
    )
  }

  // ── section=collaborateurs — effectif consultant actif (Lot 4) ──
  const team = await getConsultantsTeam()
  return isMobile ? (
    <ConsultantsMobileShell activeSection={activeSection}>
      <CollaboratorsMobile data={team} />
    </ConsultantsMobileShell>
  ) : (
    <ConsultantsDesktopShell activeSection={activeSection}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <CollaboratorsDesktop data={team} />
      </div>
    </ConsultantsDesktopShell>
  )
}
