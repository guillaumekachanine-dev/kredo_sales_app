import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { cockpitDashboardConfig } from "@/lib/dashboard/configs/cockpit-dashboard.config"
import { mockCockpitDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function CockpitPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={cockpitDashboardConfig}
      data={mockCockpitDashboardData}
    />
  )
}
