import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { prospectionDashboardConfig } from "@/lib/dashboard/configs/prospection-dashboard.config"
import { mockProspectionDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function ProspectionPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={prospectionDashboardConfig}
      data={mockProspectionDashboardData}
    />
  )
}
