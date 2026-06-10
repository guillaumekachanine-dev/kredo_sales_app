import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { recruitmentDashboardConfig } from "@/lib/dashboard/configs/recruitment-dashboard.config"
import { mockRecruitmentDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function RecruitmentPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={recruitmentDashboardConfig}
      data={mockRecruitmentDashboardData}
    />
  )
}
