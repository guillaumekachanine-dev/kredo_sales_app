import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { knowledgeDashboardConfig } from "@/lib/dashboard/configs/knowledge-dashboard.config"
import { mockKnowledgeDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function KnowledgePage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={knowledgeDashboardConfig}
      data={mockKnowledgeDashboardData}
    />
  )
}
