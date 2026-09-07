"use client"

import { useEffect, useRef } from "react"
import { MissionsEntityPanel } from "@/components/missions/MissionsEntityPanel"
import { ProjectsContent } from "@/components/missions/ProjectsContent"
import type { DBProjectResult } from "@/app/(app)/missions/_data/get-projects-list"
import type { EngagementMissionListItem } from "@/app/(app)/missions/_data/get-current-engagement-missions"
import type { EngagementsPortfolioViewModel } from "@/components/missions/dashboard/engagements-portfolio-types"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { EngagementsOverviewMobile } from "@/components/missions/dashboard/EngagementsOverviewMobile"
import { MissionsAtMobileView } from "./MissionsAtMobileView"
import { MissionsMobileEntityTabs } from "./MissionsMobileEntityTabs"

export type EngagementsMobileView = "synthese" | "missions-at" | "projets"

interface EngagementsMobileShellProps {
  view: EngagementsMobileView
  overview: EngagementsPortfolioViewModel | null
  missions: EngagementMissionListItem[]
  projects: DBProjectResult[]
}

export function EngagementsMobileShell({ view, overview, missions, projects }: EngagementsMobileShellProps) {
  const { tabs, activeTabId, setActiveTab } = useMissionsTabStore()

  // Changement de vue via le rail (Synthèse / Missions / Projets) → on revient
  // sur "home" sans fermer les onglets ouverts (même pattern que
  // MissionsTabbedShell sur changement de route).
  const prevView = useRef(view)
  useEffect(() => {
    if (prevView.current !== view) {
      prevView.current = view
      setActiveTab("home")
    }
  }, [view, setActiveTab])

  const activeTab = activeTabId === "home" ? null : tabs.find((t) => t.id === activeTabId) ?? null

  if (activeTab) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
        <div className="sticky top-0 z-10 shrink-0">
          <MissionsMobileEntityTabs onBackToList={() => setActiveTab("home")} />
        </div>
        <div
          key={activeTab.id}
          className="kredo-engagements-detail-in flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <MissionsEntityPanel tab={activeTab} isMobile />
        </div>
      </div>
    )
  }

  return (
    <div key={view} className="kredo-engagements-list-in flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      {view === "synthese" && overview ? <EngagementsOverviewMobile overview={overview} /> : null}
      {view === "missions-at" ? <MissionsAtMobileView missions={missions} /> : null}
      {view === "projets" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ProjectsContent projects={projects} />
        </div>
      ) : null}
    </div>
  )
}
