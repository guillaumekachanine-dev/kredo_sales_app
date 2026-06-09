import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { automationsDashboardConfig } from "@/lib/dashboard/configs/automations-dashboard.config"
import { mockAutomationsDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function AutomationsPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={automationsDashboardConfig}
      data={mockAutomationsDashboardData}
    />
  )
}
