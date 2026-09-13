import { EngagementsOverviewDesktop } from "@/components/missions/dashboard/EngagementsOverviewDesktop"
import {
  EngagementsMobileShell,
  type EngagementsMobileView,
} from "@/components/missions/engagements/mobile/EngagementsMobileShell"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getEngagementsOverview } from "@/app/(app)/missions/_data/get-engagements-overview"
import { getCurrentEngagementMissions } from "@/app/(app)/missions/_data/get-current-engagement-missions"
import { getEngagementMissionDetail } from "@/app/(app)/missions/_data/get-engagement-mission-detail"
import { getEngagementsActivityAnalytics } from "@/app/(app)/missions/_data/get-engagements-activity-analytics"
import { getEngagementsPlanning } from "@/app/(app)/missions/_data/get-active-missions-planning"
import { getProjectsList } from "@/app/(app)/missions/_data/get-projects-list"
import { getProjectDetail } from "@/app/(app)/missions/_data/get-project-detail"
import { getProductionLeave } from "@/features/consultants/modules/production-leave/data/get-production-leave"
import { EngagementsDesktopModules } from "@/components/missions/engagements/EngagementsDesktopView"
import {
  parseEngagementsModule,
  parseEngagementsView,
  type EngagementsContextualModule,
} from "@/components/missions/engagements/engagements-navigation"
import { CurrentMissionsList } from "@/components/missions/engagements/CurrentMissionsList"
import { MissionOverview } from "@/components/missions/engagements/MissionOverview"
import { MissionDetailsRail } from "@/components/missions/engagements/MissionDetailsRail"
import { CurrentProjectsList } from "@/components/missions/engagements/CurrentProjectsList"
import { ProjectOverview } from "@/components/missions/engagements/ProjectOverview"
import { ProjectDetailsRail } from "@/components/missions/engagements/ProjectDetailsRail"
import { EngagementsActivityDesktop } from "@/components/missions/engagements/EngagementsActivityDesktop"
import { EngagementsPlanningDesktop } from "@/components/missions/engagements/EngagementsPlanningDesktop"

// ─────────────────────────────────────────────────────────────────────────────
//  Engagements — contenu de la route `/missions`.
//
//  Le chrome (thème, rail `SectionRail`, header) est porté par `./layout.tsx`
//  (audit d'ouverture des pages, O-1) : cette page ne rend que le chapitre actif
//  et les overlays des modules contextuels. Son `loading.tsx` ne remplace que la
//  zone de contenu, le rail reste affiché.
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Record<string, string | string[] | undefined>

type EngagementsOverview = Awaited<ReturnType<typeof getEngagementsOverview>>

function pickParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function SynthesisError() {
  return (
    <div className="flex h-full min-h-[360px] w-full items-center justify-center p-6">
      <div className="max-w-md rounded-[var(--radius-medium)] border border-danger/25 bg-surface p-5 text-center">
        <h2 className="font-heading text-base font-bold text-heading">Synthèse indisponible</h2>
        <p className="mt-2 text-sm text-body">
          Les engagements actifs n’ont pas pu être lus. Réessayez dans quelques instants.
        </p>
      </div>
    </div>
  )
}

function EmptyEngagements({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-canvas px-8 text-center">
      <div className="max-w-sm">
        <h2 className="font-heading text-lg font-bold text-heading">{title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted">{description}</p>
      </div>
    </div>
  )
}

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [device, resolvedSearchParams] = await Promise.all([getDashboardDevice(), searchParams])
  const view = parseEngagementsView(resolvedSearchParams.vue)

  // ── Mobile : shell unifié Engagements (paradigme /reports) ─────────────────
  //  Synthèse + Missions AT livrés ; Projets réutilise ProjectsContent tel quel.
  //  Les vues Rentabilité des engagements / Planning & Échéances et les modules
  //  contextuels ne sont pas exposés sur Mobile (implémentation séparée).
  if (device === "mobile") {
    const mobileView: EngagementsMobileView =
      view === "missions-at" || view === "projets" ? view : "synthese"

    const [overview, missions, projects] = await Promise.all([
      mobileView === "synthese"
        ? getEngagementsOverview().catch((error) => {
            console.error("[MissionsPage] mobile synthese overview", error)
            return null
          })
        : Promise.resolve(null),
      mobileView === "missions-at" ? getCurrentEngagementMissions() : Promise.resolve([]),
      mobileView === "projets" ? getProjectsList() : Promise.resolve([]),
    ])

    return (
      <EngagementsMobileShell
        view={mobileView}
        overview={overview}
        missions={missions}
        projects={projects}
      />
    )
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  //  Modules contextuels REUSE (Phase 7.3B), pilotés par `?module=`. Leurs données
  //  ne sont lues que si le module est réellement demandé (ADR-0006), et dans la
  //  MÊME vague que le chapitre (audit d'ouverture des pages, O-8). La synthèse et
  //  l'Atlas partagent la même lecture du portefeuille : une seule promesse.
  const activeModule: EngagementsContextualModule | null = parseEngagementsModule(
    resolvedSearchParams.module,
  )

  let overviewPromise: Promise<EngagementsOverview | null> | null = null
  const loadOverview = (context: string) => {
    overviewPromise ??= getEngagementsOverview().catch((error) => {
      console.error(`[MissionsPage] ${context} overview`, error)
      return null
    })
    return overviewPromise
  }

  const modulesPromise = Promise.all([
    activeModule === "production-conges"
      ? getProductionLeave().catch((error) => {
          console.error("[MissionsPage] module production-conges", error)
          return null
        })
      : Promise.resolve(null),
    activeModule === "atlas-portefeuille" ? loadOverview("atlas-portefeuille") : Promise.resolve(null),
  ])

  const renderModules = async () => {
    const [productionLeaveVm, portfolioOverview] = await modulesPromise
    return (
      <EngagementsDesktopModules
        activeView={view}
        activeModule={activeModule}
        productionLeaveVm={productionLeaveVm}
        portfolioOverview={portfolioOverview}
      />
    )
  }

  if (view === "synthese") {
    const [overview, modules] = await Promise.all([loadOverview("synthese"), renderModules()])

    return (
      <>
        <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
          {overview ? <EngagementsOverviewDesktop overview={overview} /> : <SynthesisError />}
        </div>
        {modules}
      </>
    )
  }

  if (view === "missions-at") {
    // Détail lancé en parallèle de la liste quand l'URL désigne déjà la mission.
    const requestedId = pickParam(resolvedSearchParams.mission) ?? null
    const [missions, requestedDetail, modules] = await Promise.all([
      getCurrentEngagementMissions(),
      requestedId ? getEngagementMissionDetail(requestedId) : Promise.resolve(null),
      renderModules(),
    ])
    const selectedId = requestedId ?? missions[0]?.id ?? null
    const detail = requestedId
      ? requestedDetail
      : selectedId
        ? await getEngagementMissionDetail(selectedId)
        : null

    return (
      <>
        {missions.length === 0 ? (
          <EmptyEngagements
            title="Aucune mission d’assistance technique en cours"
            description="Les missions apparaîtront ici dès qu’une mission passe au statut actif."
          />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)] overflow-hidden">
            <CurrentMissionsList missions={missions} selectedMissionId={selectedId} />
            <MissionOverview detail={detail} />
            {detail ? (
              <MissionDetailsRail detail={detail} />
            ) : (
              <aside className="border-l border-border bg-surface" aria-hidden />
            )}
          </div>
        )}
        {modules}
      </>
    )
  }

  if (view === "projets") {
    const requestedId = pickParam(resolvedSearchParams.projet) ?? null
    const [projects, requestedDetail, modules] = await Promise.all([
      getProjectsList(),
      requestedId ? getProjectDetail(requestedId) : Promise.resolve(null),
      renderModules(),
    ])
    const activeProjects = projects.filter((p) => p.status === "active")
    const listProjects = activeProjects.length > 0 ? activeProjects : projects
    const selectedId = requestedId ?? listProjects[0]?.id ?? null
    const detail = requestedId
      ? (requestedDetail?.data ?? null)
      : selectedId
        ? (await getProjectDetail(selectedId)).data
        : null

    return (
      <>
        {listProjects.length === 0 ? (
          <EmptyEngagements
            title="Aucun projet en cours"
            description="Les projets apparaîtront ici dès qu’un projet passe au statut actif."
          />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)] overflow-hidden">
            <CurrentProjectsList projects={listProjects} selectedProjectId={selectedId} />
            <ProjectOverview detail={detail} />
            {detail ? (
              <ProjectDetailsRail detail={detail} />
            ) : (
              <aside className="border-l border-border bg-surface" aria-hidden />
            )}
          </div>
        )}
        {modules}
      </>
    )
  }

  if (view === "activite-conges") {
    const [analytics, modules] = await Promise.all([
      getEngagementsActivityAnalytics(),
      renderModules(),
    ])

    return (
      <>
        <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
          <EngagementsActivityDesktop data={analytics} />
        </div>
        {modules}
      </>
    )
  }

  // ── Planning des engagements ───────────────────────────────────────────────
  const [planningRows, modules] = await Promise.all([getEngagementsPlanning(), renderModules()])

  return (
    <>
      <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
        <EngagementsPlanningDesktop rows={planningRows} />
      </div>
      {modules}
    </>
  )
}
