import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getConsultantsTeam } from "@/features/consultants/data/get-consultants-team"
import { getConsultantsSynthese } from "@/features/consultants/data/get-consultants-synthese"
import { getConsultantsActivity } from "@/features/consultants/data/get-consultants-activity"
import {
  parseConsultantsModule,
  parseConsultantsSection,
} from "@/features/consultants/navigation/consultants-sections"
import { ConsultantsDesktopShell } from "@/features/consultants/desktop/ConsultantsDesktopShell"
import { ConsultantsMobileShell } from "@/features/consultants/mobile/ConsultantsMobileShell"
import { SyntheseDesktop } from "@/features/consultants/desktop/synthese/SyntheseDesktop"
import { SyntheseMobile } from "@/features/consultants/mobile/synthese/SyntheseMobile"
import { CollaboratorsDesktop } from "@/features/consultants/collaborators/CollaboratorsDesktop"
import { CollaboratorsMobile } from "@/features/consultants/collaborators/CollaboratorsMobile"
import { ActivityDashboard } from "@/features/consultants/activity/ActivityDashboard"
import { getConsultantsSkills } from "@/features/consultants/data/get-consultants-skills"
import { PoolCompetencesMap } from "@/features/consultants/skills/PoolCompetencesMap"
import { getConsultantsCandidates } from "@/features/consultants/candidates/data/get-consultants-candidates"
import { CandidatesDesktop } from "@/features/consultants/candidates/CandidatesDesktop"
import { CandidatesMobile } from "@/features/consultants/candidates/CandidatesMobile"
import { getProductionLeave } from "@/features/consultants/modules/production-leave/data/get-production-leave"
import { ProductionLeaveMobile } from "@/features/consultants/modules/production-leave/mobile/ProductionLeaveMobile"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — orchestrateur de la route `/consultants`
//  (chantier docs/FEATURES/consultants_workspace/).
//
//  Le shell (rail secondaire `SectionRail` + header) est porté par la feature.
//  La navigation inter-chapitres passe par `?section=`. Chaque section ne charge
//  que ses propres données (ADR-0006).
//
//  Sections internalisées : `synthese` (racine), `collaborateurs`,
//  `activite-conges`, `candidats`, `pool-competences`.
//
//  Résolution PRODUCT-4 (Lot 12 / Décision C-31) :
//  - Desktop : conserve ActivityDashboard sur activite-conges et expose
//    Production & Congés comme module transverse via `contextualModules`.
//  - Mobile : activite-conges sert la vue dédiée ProductionLeaveMobile.
//  - Module transverse Desktop : lazy-loadé uniquement sur demande (?module=).
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
  const activeModule = parseConsultantsModule(resolvedSearchParams.module)
  const isMobile = device === "mobile"

  // Lazy loading du module transverse Desktop uniquement si demandé (ADR-0006)
  const productionLeaveVm =
    !isMobile && activeModule === "production-conges"
      ? await getProductionLeave()
      : null

  if (activeSection === "synthese") {
    const vm = await getConsultantsSynthese()
    return isMobile ? (
      <ConsultantsMobileShell activeSection={activeSection}>
        <SyntheseMobile vm={vm} />
      </ConsultantsMobileShell>
    ) : (
      <ConsultantsDesktopShell
        activeSection={activeSection}
        activeModule={activeModule}
        productionLeaveVm={productionLeaveVm}
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <SyntheseDesktop vm={vm} />
        </div>
      </ConsultantsDesktopShell>
    )
  }

  if (activeSection === "activite-conges") {
    // Résolution PRODUCT-4 (C-31) :
    // Mobile sert la vue dédiée ProductionLeaveMobile (action / compréhension immédiate)
    if (isMobile) {
      const vm = await getProductionLeave()
      return (
        <ConsultantsMobileShell activeSection={activeSection}>
          <ProductionLeaveMobile vm={vm} />
        </ConsultantsMobileShell>
      )
    }

    // Desktop conserve l'ActivityDashboard analytique global existant
    const data = await getConsultantsActivity()
    const content = (
      <div className="min-h-0 flex-1 overflow-auto bg-canvas">
        <ActivityDashboard data={data} />
      </div>
    )
    return (
      <ConsultantsDesktopShell
        activeSection={activeSection}
        activeModule={activeModule}
        productionLeaveVm={productionLeaveVm}
      >
        {content}
      </ConsultantsDesktopShell>
    )
  }

  if (activeSection === "pool-competences") {
    // Cartographie practices ↔ compétences ↔ demande : scène large unique,
    // servie aux deux devices (pas de branche Mobile dédiée — dette SKILLS-1).
    // Le contenu défile dans son propre conteneur.
    const { dataset, collaborators } = await getConsultantsSkills()
    const content = (
      <div className="min-h-0 flex-1 overflow-auto bg-canvas">
        <PoolCompetencesMap dataset={dataset} collaborators={collaborators} />
      </div>
    )
    return isMobile ? (
      <ConsultantsMobileShell activeSection={activeSection}>{content}</ConsultantsMobileShell>
    ) : (
      <ConsultantsDesktopShell
        activeSection={activeSection}
        activeModule={activeModule}
        productionLeaveVm={productionLeaveVm}
      >
        {content}
      </ConsultantsDesktopShell>
    )
  }

  if (activeSection === "candidats") {
    // Chapitre Candidats candidate-centric (Lot 8). Distribution Desktop/Mobile
    // côté serveur (ADR-0006) : la vue non rendue n'est pas chargée.
    const vm = await getConsultantsCandidates()
    return isMobile ? (
      <ConsultantsMobileShell activeSection={activeSection}>
        <CandidatesMobile vm={vm} />
      </ConsultantsMobileShell>
    ) : (
      <ConsultantsDesktopShell
        activeSection={activeSection}
        activeModule={activeModule}
        productionLeaveVm={productionLeaveVm}
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <CandidatesDesktop vm={vm} />
        </div>
      </ConsultantsDesktopShell>
    )
  }

  // ── section=collaborateurs — effectif consultant actif (Lot 4) ──
  const team = await getConsultantsTeam()
  return isMobile ? (
    <ConsultantsMobileShell activeSection={activeSection}>
      <CollaboratorsMobile data={team} />
    </ConsultantsMobileShell>
  ) : (
    <ConsultantsDesktopShell
      activeSection={activeSection}
      activeModule={activeModule}
      productionLeaveVm={productionLeaveVm}
    >
      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <CollaboratorsDesktop data={team} />
      </div>
    </ConsultantsDesktopShell>
  )
}
