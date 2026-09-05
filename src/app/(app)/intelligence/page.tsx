import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { buildBusinessIntelligenceDesktopModel } from "@/features/business-intelligence/presenters/build-business-intelligence-desktop-model"
import { buildBusinessIntelligenceMobileModel } from "@/features/business-intelligence/presenters/build-business-intelligence-mobile-model"
import { BusinessIntelligenceDesktop } from "@/features/business-intelligence/desktop/BusinessIntelligenceDesktop"
import { BusinessIntelligenceMobile } from "@/features/business-intelligence/mobile/BusinessIntelligenceMobile"
import { getBusinessIntelligenceCatalog } from "@/features/business-intelligence/data/get-business-intelligence-catalog"
import { getBusinessIntelligenceSegmentWorkspace } from "@/features/business-intelligence/data/get-business-intelligence-segment-workspace"
import { buildBusinessIntelligenceWorkspaceAdapter } from "@/features/business-intelligence/data/build-business-intelligence-workspace-adapter"
import { resolveBusinessIntelligenceRoute } from "@/features/business-intelligence/data/resolve-business-intelligence-route"
import { SegmentCatalogLandingDesktop } from "@/features/business-intelligence/catalog/SegmentCatalogLandingDesktop"
import { SegmentCatalogLandingMobile } from "@/features/business-intelligence/catalog/SegmentCatalogLandingMobile"
import { BusinessIntelligenceEntryGate } from "@/features/business-intelligence/session/BusinessIntelligenceEntryGate"
import { BusinessIntelligenceSessionTracker } from "@/features/business-intelligence/session/BusinessIntelligenceSessionTracker"
import { BusinessIntelligenceErrorState } from "@/features/business-intelligence/states/BusinessIntelligenceErrorState"
import { BusinessIntelligenceLoadingDesktop, BusinessIntelligenceLoadingMobile } from "@/features/business-intelligence/states/BusinessIntelligenceLoading"
import { redirect } from "next/navigation"
import { buildBusinessIntelligenceHref, isCanonicalBiChapter, resolveBiChapter } from "@/features/business-intelligence/navigation/business-intelligence-chapters"
import { Suspense } from "react"

type BusinessIntelligencePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BusinessIntelligencePage({ searchParams }: BusinessIntelligencePageProps) {
  const [device, requestedSearchParams] = await Promise.all([getDashboardDevice(), searchParams])
  const mode = requestedSearchParams.segment || requestedSearchParams.competitiveSegment ? "workspace" : "catalog"
  const fallback = device === "mobile"
    ? <BusinessIntelligenceLoadingMobile mode={mode} />
    : <BusinessIntelligenceLoadingDesktop mode={mode} />
  return <Suspense fallback={fallback}><BusinessIntelligencePageContent searchParams={Promise.resolve(requestedSearchParams)} /></Suspense>
}

async function BusinessIntelligencePageContent({ searchParams }: BusinessIntelligencePageProps) {
  const route = await resolveBusinessIntelligenceRoute(await searchParams)
  if (route.kind === "legacyRedirect") redirect(route.href)

  if (route.kind === "catalog" || route.kind === "invalid") {
    const [device, catalog] = await Promise.all([getDashboardDevice(), getBusinessIntelligenceCatalog()])
    const issue = route.kind === "invalid" ? route.reason : null
    return (
      <BusinessIntelligenceEntryGate catalog={catalog} device={device} issue={issue}>
        {device === "mobile"
          ? <SegmentCatalogLandingMobile catalog={catalog} issue={issue} />
          : <SegmentCatalogLandingDesktop catalog={catalog} issue={issue} />}
      </BusinessIntelligenceEntryGate>
    )
  }

  const chapter = resolveBiChapter(route.tab)
  if (!isCanonicalBiChapter(route.tab)) redirect(buildBusinessIntelligenceHref(route.segmentId, chapter))

  const [device, workspace] = await Promise.all([
    getDashboardDevice(),
    getBusinessIntelligenceSegmentWorkspace(route.segmentId),
  ])
  if (workspace.state === "error") {
    return <BusinessIntelligenceErrorState segmentName={route.segmentName} message={workspace.error} device={device} />
  }

  const { snapshot, sectorMapCatalog, competitiveMapWorkspace } = buildBusinessIntelligenceWorkspaceAdapter(workspace)
  if (device === "mobile") {
    const viewModel = buildBusinessIntelligenceMobileModel(snapshot)
    return (
      <div data-theme="edito-bright-cockpit" className="min-h-screen bg-edito-canvas text-edito-body">
        <BusinessIntelligenceSessionTracker segmentId={workspace.segment.id} />
        <BusinessIntelligenceMobile
          viewModel={viewModel}
          snapshot={snapshot}
          sectorMapCatalog={sectorMapCatalog}
          competitiveMapWorkspace={competitiveMapWorkspace}
          workspace={workspace}
          initialSection={chapter}
        />
      </div>
    )
  }

  const viewModel = buildBusinessIntelligenceDesktopModel(snapshot)

  return (
    <div data-theme="edito-bright-cockpit" className="flex min-h-0 flex-1 bg-canvas text-body">
      <BusinessIntelligenceSessionTracker segmentId={workspace.segment.id} />
      <BusinessIntelligenceDesktop
        viewModel={viewModel}
        snapshot={snapshot}
        sectorMapCatalog={sectorMapCatalog}
        competitiveMapWorkspace={competitiveMapWorkspace}
        workspace={workspace}
        initialTab={chapter}
      />
    </div>
  )
}
