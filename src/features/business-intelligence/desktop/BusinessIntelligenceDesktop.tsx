"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import type { BusinessIntelligenceDesktopViewModel } from "../presenters/build-business-intelligence-desktop-model"
import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import type { BusinessIntelligenceCatalogSegment, BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import type { SectorMapCatalog } from "@/features/sector-mapping/data/sector-map-catalog"
import type { CompetitiveMapWorkspace } from "@/features/competitive-map/data/competitive-map-workspace-types"
import { BusinessIntelligenceHeader } from "./BusinessIntelligenceHeader"
import { BusinessIntelligenceLocalNavigation } from "./BusinessIntelligenceLocalNavigation"
import { SegmentHomeDashboardDesktop } from "../home/SegmentHomeDashboardDesktop"
import { SegmentPickerDialogDesktop } from "../catalog/SegmentPickerDialogDesktop"
import { SegmentChangeConfirmDialog } from "../catalog/SegmentChangeConfirmDialog"
import { BusinessIntelligenceChapterState } from "../chapters/BusinessIntelligenceChapterState"
import { SectorAnalysisChapterDesktop } from "../chapters/SectorAnalysisChapterDesktop"
import { RegulatoryCalendarChapterDesktop } from "../chapters/RegulatoryCalendarChapterDesktop"
import { SectorNewsChapterDesktop } from "../chapters/SectorNewsChapter"
import { buildBusinessIntelligenceHref, resolveBiChapter, replaceBiChapterInHref, type BiChapter } from "../navigation/business-intelligence-chapters"

const SectorPlaybooksModal = dynamic(() => import("../playbooks/SectorPlaybooksModal").then((mod) => mod.SectorPlaybooksModal), { ssr: false })
const SectorStudiesModal = dynamic(() => import("../studies/SectorStudiesModal").then((mod) => mod.SectorStudiesModal), { ssr: false })
const BusinessIntelligenceSectorMapDesktop = dynamic(() => import("@/features/sector-mapping/integration/BusinessIntelligenceSectorMapDesktop").then((mod) => mod.BusinessIntelligenceSectorMapDesktop), { loading: () => <div className="min-h-64 animate-pulse rounded-xl bg-surface/30" aria-label="Chargement de la cartographie" /> })
const CompetitiveEnvironmentWorkspace = dynamic(() => import("@/features/competitive-map/components/CompetitiveEnvironmentWorkspace").then((mod) => mod.CompetitiveEnvironmentWorkspace), { loading: () => <div className="min-h-[32rem] animate-pulse bg-edito-surface" aria-label="Chargement de l’environnement concurrentiel" /> })

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

const CHAPTER_TITLES: Record<BiChapter, string> = {
  home: "Business Intelligence",
  "sector-analysis": "Analyse sectorielle",
  "competitive-environment": "Environnement concurrentiel",
  "regulatory-calendar": "Calendrier réglementaire",
  "value-chain": "Chaîne de valeur",
  "sector-news": "Actualités sectorielles",
}

interface BusinessIntelligenceDesktopProps {
  viewModel: BusinessIntelligenceDesktopViewModel
  snapshot: BusinessIntelligenceSnapshot
  sectorMapCatalog: SectorMapCatalog
  competitiveMapWorkspace: CompetitiveMapWorkspace
  workspace: LoadedWorkspace
  initialTab?: BiChapter
}

export function BusinessIntelligenceDesktop(props: BusinessIntelligenceDesktopProps) {
  return <BusinessIntelligenceWorkspaceDesktop {...props} />
}

export function BusinessIntelligenceWorkspaceDesktop({ snapshot, sectorMapCatalog, competitiveMapWorkspace, workspace, initialTab = "home" }: BusinessIntelligenceDesktopProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeChapter = resolveBiChapter(searchParams.get("tab") ?? initialTab)
  const [isPlaybooksOpen, setIsPlaybooksOpen] = useState(false)
  const [isStudiesOpen, setIsStudiesOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pendingSegment, setPendingSegment] = useState<BusinessIntelligenceCatalogSegment | null>(null)
  const [isSegmentPending, startSegmentTransition] = useTransition()

  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

  const navigateChapter = (chapter: BiChapter) => {
    const currentHref = `/intelligence?${searchParams.toString()}`
    window.history.pushState(null, "", replaceBiChapterInHref(currentHref, workspace.segment.id, chapter))
  }

  const selectSegment = (segment: BusinessIntelligenceCatalogSegment) => {
    setIsPickerOpen(false)
    setPendingSegment(segment)
  }

  const confirmSegment = () => {
    if (!pendingSegment) return
    startSegmentTransition(() => router.push(buildBusinessIntelligenceHref(pendingSegment.id, activeChapter)))
  }

  const unavailable = (title: string) => (
    <BusinessIntelligenceChapterState
      title={`${title} indisponible`}
      description="Cette ressource n’existe pas encore pour le segment actif. Le chapitre reste dans son périmètre actuel."
    />
  )

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-canvas" aria-busy={isSegmentPending || undefined}>
      <BusinessIntelligenceLocalNavigation
        active={activeChapter}
        onChange={navigateChapter}
        onStudiesClick={() => setIsStudiesOpen(true)}
        onPlaybooksClick={() => setIsPlaybooksOpen(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <BusinessIntelligenceHeader
          title={CHAPTER_TITLES[activeChapter]}
          minimal={activeChapter === "competitive-environment"}
          segmentName={workspace.segment.name}
          macroName={workspace.segment.macro?.name ?? null}
          status={workspace.segment.status}
          onChangeSegment={() => setIsPickerOpen(true)}
        />
        <main className={`min-h-0 flex-1 overflow-y-auto ${activeChapter === "competitive-environment" ? "" : "px-4 py-5 lg:px-8"}`}>
          <div className={activeChapter === "competitive-environment" ? "" : "mx-auto w-full max-w-[1600px]"}>
            {activeChapter === "home" ? (
              <SegmentHomeDashboardDesktop
                workspace={workspace}
                onNavigate={navigateChapter}
                onOpenPlaybook={() => setIsPlaybooksOpen(true)}
              />
            ) : null}
            {activeChapter === "sector-analysis" ? (
              workspace.coverage.study.available ? (
                <SectorAnalysisChapterDesktop
                  knowledge={workspace.knowledge}
                  segmentName={workspace.segment.name}
                  macroName={workspace.segment.macro?.name ?? null}
                />
              ) : unavailable("Analyse sectorielle")
            ) : null}
            {activeChapter === "competitive-environment" ? (
              workspace.coverage.competitiveMap.available ? (
                <CompetitiveEnvironmentWorkspace workspace={competitiveMapWorkspace} />
              ) : unavailable("Environnement concurrentiel")
            ) : null}
            {activeChapter === "regulatory-calendar" ? (
              workspace.coverage.regulatory.available ? (
                <RegulatoryCalendarChapterDesktop
                  regulatory={workspace.knowledge.regulatory}
                  segmentName={workspace.segment.name}
                />
              ) : unavailable("Calendrier réglementaire")
            ) : null}
            {activeChapter === "value-chain" ? (
              workspace.coverage.valueChain.available ? (
                <BusinessIntelligenceSectorMapDesktop catalog={sectorMapCatalog} />
              ) : unavailable("Chaîne de valeur")
            ) : null}
            {activeChapter === "sector-news" ? (
              workspace.coverage.news.available ? (
                <SectorNewsChapterDesktop news={workspace.news} />
              ) : unavailable("Actualités sectorielles")
            ) : null}
          </div>
        </main>
      </div>
      <SegmentPickerDialogDesktop
        open={isPickerOpen}
        currentSegmentId={workspace.segment.id}
        onOpenChange={setIsPickerOpen}
        onSelect={selectSegment}
      />
      <SegmentChangeConfirmDialog
        pendingSegment={pendingSegment}
        currentSegmentName={workspace.segment.name}
        isPending={isSegmentPending}
        onCancel={() => setPendingSegment(null)}
        onConfirm={confirmSegment}
      />
      {isPlaybooksOpen ? (
        <SectorPlaybooksModal
          open
          onClose={() => setIsPlaybooksOpen(false)}
          snapshot={snapshot}
          initialSectorId={workspace.segment.id}
          onApplySector={() => setIsPlaybooksOpen(false)}
        />
      ) : null}
      {isStudiesOpen ? (
        <SectorStudiesModal
          open
          onClose={() => setIsStudiesOpen(false)}
          snapshot={snapshot}
          initialSectorId={workspace.segment.id}
        />
      ) : null}
      {isSegmentPending ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-canvas/70" role="status">
          <div className="border border-border bg-surface px-5 py-3 text-sm font-semibold text-heading">
            Chargement du nouveau segment…
          </div>
        </div>
      ) : null}
    </div>
  )
}
