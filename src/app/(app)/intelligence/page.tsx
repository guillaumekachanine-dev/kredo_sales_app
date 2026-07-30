import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getBusinessIntelligenceSnapshot } from "@/features/business-intelligence/data/get-business-intelligence-snapshot"
import { buildBusinessIntelligenceDesktopModel } from "@/features/business-intelligence/presenters/build-business-intelligence-desktop-model"
import { buildBusinessIntelligenceMobileModel } from "@/features/business-intelligence/presenters/build-business-intelligence-mobile-model"
import { BusinessIntelligenceDesktop } from "@/features/business-intelligence/desktop/BusinessIntelligenceDesktop"
import { BusinessIntelligenceMobile } from "@/features/business-intelligence/mobile/BusinessIntelligenceMobile"

export default async function BusinessIntelligencePage() {
  const device = await getDashboardDevice()
  
  if (device === "mobile") {
    const snapshot = await getBusinessIntelligenceSnapshot()
    const viewModel = buildBusinessIntelligenceMobileModel(snapshot)
    return (
      <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
        <BusinessIntelligenceMobile viewModel={viewModel} snapshot={snapshot} />
      </div>
    )
  }

  // Load snapshot & build presenter model entirely on server
  const snapshot = await getBusinessIntelligenceSnapshot()
  const viewModel = buildBusinessIntelligenceDesktopModel(snapshot)

  return (
    <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
      <BusinessIntelligenceDesktop viewModel={viewModel} snapshot={snapshot} />
    </div>
  )

}
