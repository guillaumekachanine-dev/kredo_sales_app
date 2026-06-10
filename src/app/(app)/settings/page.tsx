import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { settingsDashboardConfig } from "@/lib/dashboard/configs/settings-dashboard.config"
import { mockSettingsDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function SettingsPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={settingsDashboardConfig}
      data={mockSettingsDashboardData}
    />
  )
}
