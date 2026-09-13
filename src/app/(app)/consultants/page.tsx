import "server-only"

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getConsultantsTeam } from "@/features/consultants/data/get-consultants-team"
import { getConsultantsSynthese } from "@/features/consultants/data/get-consultants-synthese"
import { getConsultantsActivity } from "@/features/consultants/data/get-consultants-activity"
import {
  buildConsultantsSectionHref,
  parseConsultantsModule,
  parseConsultantsSection,
  resolveConsultantsDesktopEntry,
} from "@/features/consultants/navigation/consultants-sections"
import { ConsultantsDesktopModules } from "@/features/consultants/desktop/ConsultantsDesktopShell"
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
import { getProfileMatching } from "@/features/consultants/modules/profile-matching/data/get-profile-matching"
import { ProfileMatchingMobile } from "@/features/consultants/modules/profile-matching/mobile/ProfileMatchingMobile"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — orchestrateur de la route `/consultants`
//  (chantier docs/FEATURES/consultants_workspace/).
//
//  Le chrome Desktop (rail secondaire `SectionRail` + header) est porté par
//  `./layout.tsx` via `ConsultantsDesktopFrame` (audit d'ouverture des pages, O-1) :
//  il s'affiche avant les données et reste en place d'un chapitre à l'autre.
//  Cette page ne rend que le contenu de la section et les overlays de modules.
//  La navigation inter-chapitres passe par `?section=`. Chaque section ne charge
//  que ses propres données (ADR-0006).
//
//  Chapitres Desktop (Phase 7.2) : `synthese` (« Vue d'ensemble », racine),
//  `collaborateurs`, `activite-conges`, `candidats`. `pool-competences` n'est
//  plus un chapitre Desktop — c'est un Module (voir ci-dessous). Il reste une
//  section adressable pour le Mobile et la compatibilité `?section=pool-competences`.
//
//  Modules contextuels :
//  - Pool de compétences (Phase 7.2 / TRANSFORM) : Desktop contextualModule
//    (`?module=pool-competences` ou compat `?section=pool-competences`) réutilisant
//    `getConsultantsSkills` + `PoolCompetencesMap`. Mobile : vue Pool historique
//    sur `?section=pool-competences` (dette adaptative SKILLS-1 — SEPARATE IMPLEMENTATION).
//  - Production & Congés (Lot 12 / C-31) : Desktop contextualModule, Mobile sur activite-conges.
//  - Matching Profil (Lot 13 / C-32) : Desktop contextualModule, Mobile contextuel sur action profil.
//
//  Adaptive Design (ADR-0006) : distribution serveur stricte Desktop/Mobile,
//  chaque module lazy-loadé uniquement quand il est demandé.
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

  const rawPerson = resolvedSearchParams.person
  const personId = Array.isArray(rawPerson) ? rawPerson[0] : (rawPerson ?? null)
  const isMobile = device === "mobile"

  // Résolution de l'état effectif.
  //  - Desktop : fonction pure `resolveConsultantsDesktopEntry` — 4 chapitres,
  //    `?section=pool-competences` réinterprété en module Pool sur « Vue d'ensemble ».
  //    Le layout relit l'URL avec la même fonction : rail et contenu concordent.
  //  - Mobile  : navigation historique inchangée (`pool-competences` reste une
  //    section rendue directement, dette adaptative SKILLS-1).
  const desktopEntry = resolveConsultantsDesktopEntry(
    resolvedSearchParams.section,
    resolvedSearchParams.module,
  )
  const activeSection = isMobile
    ? parseConsultantsSection(resolvedSearchParams.section)
    : desktopEntry.chapter
  const activeModule = isMobile
    ? parseConsultantsModule(resolvedSearchParams.module)
    : desktopEntry.module

  // Modules transverses Desktop : chargés uniquement si demandés (ADR-0006), et
  // lancés MAINTENANT pour partir dans la même vague que la section (audit
  // d'ouverture des pages, O-8) — ils étaient auparavant attendus en série, avant.
  const poolSkillsDataPromise =
    !isMobile && activeModule === "pool-competences"
      ? getConsultantsSkills()
      : Promise.resolve(null)

  const productionLeaveVmPromise =
    !isMobile && activeModule === "production-conges"
      ? getProductionLeave()
      : Promise.resolve(null)

  const profileMatchingVmPromise =
    !isMobile && activeModule === "matching-profil"
      ? getProfileMatching()
      : Promise.resolve(null)

  const desktopModules = async () => {
    const [poolSkillsData, productionLeaveVm, profileMatchingVm] = await Promise.all([
      poolSkillsDataPromise,
      productionLeaveVmPromise,
      profileMatchingVmPromise,
    ])
    return (
      <ConsultantsDesktopModules
        activeSection={desktopEntry.chapter}
        activeModule={desktopEntry.module}
        poolSkillsData={poolSkillsData}
        productionLeaveVm={productionLeaveVm}
        profileMatchingVm={profileMatchingVm}
        initialPersonId={personId}
      />
    )
  }

  // Mobile : branche contextuelle du module Matching profil (Lot 13)
  if (isMobile && activeModule === "matching-profil") {
    const vm = await getProfileMatching()
    return (
      <ConsultantsMobileShell activeSection={activeSection}>
        <ProfileMatchingMobile
          vm={vm}
          selectedPersonId={personId}
          backHref={buildConsultantsSectionHref(activeSection)}
        />
      </ConsultantsMobileShell>
    )
  }

  if (activeSection === "synthese") {
    if (isMobile) {
      const vm = await getConsultantsSynthese()
      return (
        <ConsultantsMobileShell activeSection={activeSection}>
          <SyntheseMobile vm={vm} />
        </ConsultantsMobileShell>
      )
    }

    const [vm, modules] = await Promise.all([getConsultantsSynthese(), desktopModules()])
    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <SyntheseDesktop vm={vm} />
        </div>
        {modules}
      </>
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
    const [data, modules] = await Promise.all([getConsultantsActivity(), desktopModules()])
    return (
      <>
        <div className="min-h-0 flex-1 overflow-auto bg-canvas">
          <ActivityDashboard data={data} />
        </div>
        {modules}
      </>
    )
  }

  if (isMobile && activeSection === "pool-competences") {
    // Mobile uniquement : la cartographie practices ↔ compétences ↔ demande est
    // une scène large unique servie telle quelle (dette adaptative SKILLS-1 —
    // SEPARATE IMPLEMENTATION). Sur Desktop, `?section=pool-competences` a été
    // réinterprété en module par `resolveConsultantsDesktopEntry` : cette branche
    // n'est jamais atteinte côté Desktop.
    const { dataset, collaborators } = await getConsultantsSkills()
    return (
      <ConsultantsMobileShell activeSection={activeSection}>
        <div className="min-h-0 flex-1 overflow-auto bg-canvas">
          <PoolCompetencesMap dataset={dataset} collaborators={collaborators} />
        </div>
      </ConsultantsMobileShell>
    )
  }

  if (activeSection === "candidats") {
    // Chapitre Candidats candidate-centric (Lot 8). Distribution Desktop/Mobile
    // côté serveur (ADR-0006) : la vue non rendue n'est pas chargée.
    if (isMobile) {
      const vm = await getConsultantsCandidates()
      return (
        <ConsultantsMobileShell activeSection={activeSection}>
          <CandidatesMobile vm={vm} />
        </ConsultantsMobileShell>
      )
    }

    const [vm, modules] = await Promise.all([getConsultantsCandidates(), desktopModules()])
    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <CandidatesDesktop vm={vm} />
        </div>
        {modules}
      </>
    )
  }

  // ── section=collaborateurs — effectif consultant actif (Lot 4) ──
  if (isMobile) {
    const team = await getConsultantsTeam()
    return (
      <ConsultantsMobileShell activeSection={activeSection}>
        <CollaboratorsMobile data={team} />
      </ConsultantsMobileShell>
    )
  }

  const [team, modules] = await Promise.all([getConsultantsTeam(), desktopModules()])
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <CollaboratorsDesktop data={team} />
      </div>
      {modules}
    </>
  )
}
