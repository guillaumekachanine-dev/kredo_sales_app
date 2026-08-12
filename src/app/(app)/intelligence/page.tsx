import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getBusinessIntelligenceSnapshot } from "@/features/business-intelligence/data/get-business-intelligence-snapshot"
import { buildBusinessIntelligenceDesktopModel } from "@/features/business-intelligence/presenters/build-business-intelligence-desktop-model"
import { buildBusinessIntelligenceMobileModel } from "@/features/business-intelligence/presenters/build-business-intelligence-mobile-model"
import { BusinessIntelligenceDesktop } from "@/features/business-intelligence/desktop/BusinessIntelligenceDesktop"
import { BusinessIntelligenceMobile } from "@/features/business-intelligence/mobile/BusinessIntelligenceMobile"
import { getSectorMapCatalog } from "@/features/sector-mapping/data/get-sector-map-catalog"
import { getCompetitiveMapWorkspace } from "@/features/competitive-map/data/get-competitive-map-workspace"

type BusinessIntelligencePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstQueryValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export default async function BusinessIntelligencePage({ searchParams }: BusinessIntelligencePageProps) {
  const paramsPromise = searchParams.then((params) => ({
    segmentId: firstQueryValue(params.competitiveSegment),
    tab: firstQueryValue(params.tab),
  }))
  const [device, params] = await Promise.all([getDashboardDevice(), paramsPromise])
  
  if (device === "mobile") {
    const [snapshot, sectorMapCatalog, competitiveMapWorkspace] = await Promise.all([
      getBusinessIntelligenceSnapshot(),
      getSectorMapCatalog(),
      getCompetitiveMapWorkspace(params.segmentId),
    ])
    const viewModel = buildBusinessIntelligenceMobileModel(snapshot)
    return (
      <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
        <BusinessIntelligenceMobile
          viewModel={viewModel}
          snapshot={snapshot}
          sectorMapCatalog={sectorMapCatalog}
          competitiveMapWorkspace={competitiveMapWorkspace}
          initialSection={params.tab === "competitive_env" ? "competitive_env" : "priorities"}
        />
      </div>
    )
  }

  const [snapshot, sectorMapCatalog, competitiveMapWorkspace] = await Promise.all([
    getBusinessIntelligenceSnapshot(),
    getSectorMapCatalog(),
    getCompetitiveMapWorkspace(params.segmentId),
  ])

  const viewModel = buildBusinessIntelligenceDesktopModel(snapshot)

  return (
    <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
      <BusinessIntelligenceDesktop
        viewModel={viewModel}
        snapshot={snapshot}
        sectorMapCatalog={sectorMapCatalog}
        competitiveMapWorkspace={competitiveMapWorkspace}
        initialTab={params.tab === "competitive_env" ? "competitive_env" : "priorities"}
      />
    </div>
  )

}
