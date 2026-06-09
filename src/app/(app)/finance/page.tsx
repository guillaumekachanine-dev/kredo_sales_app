import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { financeDashboardConfig } from "@/lib/dashboard/configs/finance-dashboard.config"
import { mockFinanceDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function FinancePage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={financeDashboardConfig}
      data={mockFinanceDashboardData}
    />
  )
}
