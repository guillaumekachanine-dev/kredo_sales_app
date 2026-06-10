import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { consultantsDashboardConfig } from "@/lib/dashboard/configs/consultants-dashboard.config"
import { mockConsultantsDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function ConsultantsPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={consultantsDashboardConfig}
      data={mockConsultantsDashboardData}
    />
  )
}
