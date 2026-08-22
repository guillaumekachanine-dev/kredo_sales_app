"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import type { BusinessIntelligenceCatalogSegment, BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import type { BusinessIntelligenceMobileViewModel } from "../presenters/build-business-intelligence-mobile-model"
import type { SectorMapCatalog } from "@/features/sector-mapping/data/sector-map-catalog"
import type { CompetitiveMapWorkspace } from "@/features/competitive-map/data/competitive-map-workspace-types"
import { cn } from "@/lib/utils"
import { BusinessIntelligenceMobileHeader } from "./BusinessIntelligenceMobileHeader"
import { SegmentHomeDashboardMobile } from "../home/SegmentHomeDashboardMobile"
import { SegmentPickerDrawerMobile } from "../catalog/SegmentPickerDrawerMobile"
import { SegmentChangeConfirmDialog } from "../catalog/SegmentChangeConfirmDialog"
import { BusinessIntelligenceChapterState } from "../chapters/BusinessIntelligenceChapterState"
import { SectorAnalysisChapterMobile } from "../chapters/SectorAnalysisChapterMobile"
import { RegulatoryCalendarChapterMobile } from "../chapters/RegulatoryCalendarChapterMobile"
import { SectorNewsChapterMobile } from "../chapters/SectorNewsChapter"
import { BI_CHAPTERS, buildBusinessIntelligenceHref, replaceBiChapterInHref, resolveBiChapter, type BiChapter } from "../navigation/business-intelligence-chapters"

const SectorStudiesModal = dynamic(() => import("../studies/SectorStudiesModal").then((module) => module.SectorStudiesModal), { ssr: false })
const SectorPlaybooksModal = dynamic(() => import("../playbooks/SectorPlaybooksModal").then((module) => module.SectorPlaybooksModal), { ssr: false })
const BusinessIntelligenceSectorMapMobile = dynamic(() => import("@/features/sector-mapping/integration/BusinessIntelligenceSectorMapMobile").then((module) => module.BusinessIntelligenceSectorMapMobile), { loading: () => <div className="mx-4 mt-4 min-h-64 animate-pulse rounded-xl bg-surface/35" aria-label="Chargement de la cartographie" /> })
const CompetitiveEnvironmentMobile = dynamic(() => import("@/features/competitive-map/components/mobile/CompetitiveEnvironmentMobile").then((module) => module.CompetitiveEnvironmentMobile), { loading: () => <div className="mx-4 mt-4 min-h-72 animate-pulse rounded-xl bg-surface/35" aria-label="Chargement de l’environnement concurrentiel" /> })

export type MobileSection = BiChapter
type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

interface BusinessIntelligenceMobileProps {
  viewModel: BusinessIntelligenceMobileViewModel
  snapshot: BusinessIntelligenceSnapshot
  sectorMapCatalog: SectorMapCatalog
  competitiveMapWorkspace: CompetitiveMapWorkspace
  workspace: LoadedWorkspace
  initialSection?: BiChapter
}

export function BusinessIntelligenceMobile(props: BusinessIntelligenceMobileProps) {
  return <BusinessIntelligenceWorkspaceMobile {...props} />
}

export function BusinessIntelligenceWorkspaceMobile({ sectorMapCatalog, competitiveMapWorkspace, workspace, initialSection = "home" }: BusinessIntelligenceMobileProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeChapter = resolveBiChapter(searchParams.get("tab") ?? initialSection)
  const [isStudiesOpen, setIsStudiesOpen] = useState(false)
  const [isPlaybooksOpen, setIsPlaybooksOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pendingSegment, setPendingSegment] = useState<BusinessIntelligenceCatalogSegment | null>(null)
  const [isSegmentPending, startSegmentTransition] = useTransition()

  const navigateChapter = (chapter: BiChapter) => {
    const currentHref = `/intelligence?${searchParams.toString()}`
    window.history.pushState(null, "", replaceBiChapterInHref(currentHref, workspace.segment.id, chapter))
  }
  const confirmSegment = () => {
    if (!pendingSegment) return
    startSegmentTransition(() => router.push(buildBusinessIntelligenceHref(pendingSegment.id, activeChapter)))
  }
  const unavailable = (title: string) => <BusinessIntelligenceChapterState title={`${title} indisponible`} description="Cette ressource n’existe pas encore pour le segment actif." />

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-canvas pb-[max(1rem,env(safe-area-inset-bottom))] text-body" aria-busy={isSegmentPending || undefined}>
      <BusinessIntelligenceMobileHeader segmentName={workspace.segment.name} onChangeSegment={() => setIsPickerOpen(true)} />
      <nav aria-label="Chapitres Business Intelligence" className="sticky top-0 z-20 flex overflow-x-auto border-y border-border bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BI_CHAPTERS.map((chapter) => {
          const selected = activeChapter === chapter.id
          return (
            <button
              key={chapter.id}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => navigateChapter(chapter.id)}
              className={cn(
                "relative min-h-12 shrink-0 px-4 text-xs font-semibold text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                selected && "text-heading after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-brand-brass",
              )}
            >
              {chapter.mobileLabel}
            </button>
          )
        })}
      </nav>
      <div>
        {activeChapter === "home" ? <SegmentHomeDashboardMobile workspace={workspace} onNavigate={navigateChapter} onOpenPlaybook={() => setIsPlaybooksOpen(true)} /> : null}
        {activeChapter === "sector-analysis" ? (
          workspace.coverage.study.available ? (
            <SectorAnalysisChapterMobile
              competitiveMap={workspace.competitiveMap}
              knowledge={workspace.knowledge}
              segmentName={workspace.segment.name}
              macroName={workspace.segment.macro?.name ?? null}
              corpusMetadata={workspace.corpusMetadata}
              sourceResolution={workspace.sourceResolution}
              valueChain={workspace.valueChain}
              onOpenValueChain={() => navigateChapter("value-chain")}
            />
          ) : unavailable("Analyse sectorielle")
        ) : null}
        {activeChapter === "competitive-environment" ? (
          workspace.coverage.competitiveMap.available ? (
            <CompetitiveEnvironmentMobile workspace={competitiveMapWorkspace} />
          ) : unavailable("Environnement concurrentiel")
        ) : null}
        {activeChapter === "regulatory-calendar" ? (
          workspace.coverage.regulatory.available ? (
            <RegulatoryCalendarChapterMobile
              regulatory={workspace.knowledge.regulatory}
              segmentName={workspace.segment.name}
            />
          ) : unavailable("Calendrier réglementaire")
        ) : null}
        {activeChapter === "value-chain" ? (
          workspace.coverage.valueChain.available ? (
            <BusinessIntelligenceSectorMapMobile catalog={sectorMapCatalog} />
          ) : unavailable("Chaîne de valeur")
        ) : null}
        {activeChapter === "sector-news" ? (
          workspace.coverage.news.available ? (
            <SectorNewsChapterMobile news={workspace.news} />
          ) : unavailable("Actualités sectorielles")
        ) : null}
      </div>
      <SegmentPickerDrawerMobile
        open={isPickerOpen}
        currentSegmentId={workspace.segment.id}
        onOpenChange={setIsPickerOpen}
        onSelect={(segment) => { setIsPickerOpen(false); setPendingSegment(segment) }}
      />
      <SegmentChangeConfirmDialog
        pendingSegment={pendingSegment}
        currentSegmentName={workspace.segment.name}
        isPending={isSegmentPending}
        onCancel={() => setPendingSegment(null)}
        onConfirm={confirmSegment}
      />
      {isStudiesOpen ? (
        <SectorStudiesModal
          open
          onClose={() => setIsStudiesOpen(false)}
          knowledge={workspace.knowledge}
          segmentName={workspace.segment.name}
          macroName={workspace.segment.macro?.name ?? null}
          isMobile
        />
      ) : null}
      {isPlaybooksOpen ? (
        <SectorPlaybooksModal
          open
          onClose={() => setIsPlaybooksOpen(false)}
          knowledge={workspace.knowledge}
          segmentName={workspace.segment.name}
          macroName={workspace.segment.macro?.name ?? null}
          competitiveActors={workspace.competitiveMap?.actors ?? []}
          priorityAccounts={workspace.portfolio.accounts}
          isMobile
        />
      ) : null}
      {isSegmentPending ? <div className="absolute inset-0 z-50 flex items-center justify-center bg-canvas/75" role="status"><div className="border border-border bg-surface px-4 py-3 text-sm font-semibold text-heading">Chargement du nouveau segment…</div></div> : null}
    </main>
  )
}
