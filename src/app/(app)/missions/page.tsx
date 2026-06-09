import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { missionsDashboardConfig } from "@/lib/dashboard/configs/missions-dashboard.config"
import { mockMissionsDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function MissionsPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={missionsDashboardConfig}
      data={mockMissionsDashboardData}
    />
  )
}
