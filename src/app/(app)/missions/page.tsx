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
import { EngagementsDesktopView } from "@/components/missions/engagements/EngagementsDesktopView"
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

type SearchParams = Record<string, string | string[] | undefined>

function pickParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function SynthesisError() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center p-6">
      <div className="max-w-md rounded-[var(--radius-medium)] border border-danger/25 bg-surface p-5 text-center">
        <h2 className="font-heading text-base font-bold text-heading">Synthèse indisponible</h2>
        <p className="mt-2 text-sm text-body">
          Les engagements actifs n’ont pas pu être lus. Réessayez dans quelques instants.
        </p>
      </div>
    </div>
  )
}

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const device = await getDashboardDevice()
  const resolvedSearchParams = await searchParams
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
      <div data-theme="edito-bright-engagements" className="h-full min-h-0 bg-canvas text-body">
        <EngagementsMobileShell
          view={mobileView}
          overview={overview}
          missions={missions}
          projects={projects}
        />
      </div>
    )
  }

  // ── Desktop : nouveau shell (paradigme /reports) ───────────────────────────
  //  Modules contextuels REUSE (Phase 7.3B), pilotés par `?module=` et montés en
  //  overlay au-dessus du chapitre courant. Leurs données ne sont lues que si le
  //  module est réellement demandé (ADR-0006).
  const activeModule: EngagementsContextualModule | null = parseEngagementsModule(
    resolvedSearchParams.module,
  )
  const [productionLeaveVm, portfolioOverview] = await Promise.all([
    activeModule === "production-conges"
      ? getProductionLeave().catch((error) => {
          console.error("[MissionsPage] module production-conges", error)
          return null
        })
      : Promise.resolve(null),
    activeModule === "atlas-portefeuille"
      ? getEngagementsOverview().catch((error) => {
          console.error("[MissionsPage] module atlas-portefeuille", error)
          return null
        })
      : Promise.resolve(null),
  ])
  const shellModuleProps = { activeModule, productionLeaveVm, portfolioOverview }

  if (view === "synthese") {
    let overview: Awaited<ReturnType<typeof getEngagementsOverview>> | null = null
    try {
      overview = await getEngagementsOverview()
    } catch (error) {
      console.error("[MissionsPage] synthese overview", error)
    }

    return (
      <EngagementsDesktopView activeView="synthese" {...shellModuleProps}>
        <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
          {overview ? <EngagementsOverviewDesktop overview={overview} /> : <SynthesisError />}
        </div>
      </EngagementsDesktopView>
    )
  }

  if (view === "missions-at") {
    const missions = await getCurrentEngagementMissions()
    const selectedId = pickParam(resolvedSearchParams.mission) ?? missions[0]?.id ?? null
    const detail = selectedId ? await getEngagementMissionDetail(selectedId) : null

    return (
      <EngagementsDesktopView activeView="missions-at" {...shellModuleProps}>
        {missions.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-canvas px-8 text-center">
            <div className="max-w-sm">
              <h2 className="font-heading text-lg font-bold text-heading">
                Aucune mission d’assistance technique en cours
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-muted">
                Les missions apparaîtront ici dès qu’une mission passe au statut actif.
              </p>
            </div>
          </div>
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
      </EngagementsDesktopView>
    )
  }

  if (view === "projets") {
    const projects = await getProjectsList()
    const activeProjects = projects.filter((p) => p.status === "active")
    const listProjects = activeProjects.length > 0 ? activeProjects : projects
    const selectedId = pickParam(resolvedSearchParams.projet) ?? listProjects[0]?.id ?? null
    const detail = selectedId ? (await getProjectDetail(selectedId)).data : null

    return (
      <EngagementsDesktopView activeView="projets" {...shellModuleProps}>
        {listProjects.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-canvas px-8 text-center">
            <div className="max-w-sm">
              <h2 className="font-heading text-lg font-bold text-heading">
                Aucun projet en cours
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-muted">
                Les projets apparaîtront ici dès qu’un projet passe au statut actif.
              </p>
            </div>
          </div>
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
      </EngagementsDesktopView>
    )
  }

  if (view === "activite-conges") {
    const analytics = await getEngagementsActivityAnalytics()

    return (
      <EngagementsDesktopView activeView="activite-conges" {...shellModuleProps}>
        <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
          <EngagementsActivityDesktop data={analytics} />
        </div>
      </EngagementsDesktopView>
    )
  }

  // ── Planning des engagements ───────────────────────────────────────────────
  const planningRows = await getEngagementsPlanning()

  return (
    <EngagementsDesktopView activeView="planning-at" {...shellModuleProps}>
      <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
        <EngagementsPlanningDesktop rows={planningRows} />
      </div>
    </EngagementsDesktopView>
  )
}
