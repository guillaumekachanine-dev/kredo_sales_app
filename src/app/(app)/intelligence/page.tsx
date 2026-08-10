import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getBusinessIntelligenceSnapshot } from "@/features/business-intelligence/data/get-business-intelligence-snapshot"
import { buildBusinessIntelligenceDesktopModel } from "@/features/business-intelligence/presenters/build-business-intelligence-desktop-model"
import { buildBusinessIntelligenceMobileModel } from "@/features/business-intelligence/presenters/build-business-intelligence-mobile-model"
import { BusinessIntelligenceDesktop } from "@/features/business-intelligence/desktop/BusinessIntelligenceDesktop"
import { BusinessIntelligenceMobile } from "@/features/business-intelligence/mobile/BusinessIntelligenceMobile"
import { getSectorMapCatalog } from "@/features/sector-mapping/data/get-sector-map-catalog"

export default async function BusinessIntelligencePage() {
  const [device, snapshot, sectorMapCatalog] = await Promise.all([
    getDashboardDevice(),
    getBusinessIntelligenceSnapshot(),
    getSectorMapCatalog(),
  ])
  
  if (device === "mobile") {
    const viewModel = buildBusinessIntelligenceMobileModel(snapshot)
    return (
      <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
        <BusinessIntelligenceMobile viewModel={viewModel} snapshot={snapshot} sectorMapCatalog={sectorMapCatalog} />
      </div>
    )
  }

  const viewModel = buildBusinessIntelligenceDesktopModel(snapshot)

  return (
    <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
      <BusinessIntelligenceDesktop viewModel={viewModel} snapshot={snapshot} sectorMapCatalog={sectorMapCatalog} />
    </div>
  )

}
