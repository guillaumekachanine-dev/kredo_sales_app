import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { ProspectionIntelligenceDesktop } from "@/features/prospection-intelligence/desktop/ProspectionIntelligenceDesktop"

export default async function ProspectionIntelligencePage() {
  const device = await getDashboardDevice()
  
  if (device === "mobile") {
    return (
      <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Version Mobile</h1>
          <p className="text-muted text-sm">La page Prospection est en cours de développement pour mobile.</p>
        </div>
      </div>
    )
  }

  return (
    <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
      <ProspectionIntelligenceDesktop />
    </div>
  )
}
