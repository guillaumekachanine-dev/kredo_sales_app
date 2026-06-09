import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { salesDashboardConfig } from "@/lib/dashboard/configs/sales-dashboard.config"
import { mockSalesDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function SalesPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={salesDashboardConfig}
      data={mockSalesDashboardData}
    />
  )
}
