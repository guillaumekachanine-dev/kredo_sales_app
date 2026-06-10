import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { staffingDashboardConfig } from "@/lib/dashboard/configs/staffing-dashboard.config"
import { mockStaffingDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function StaffingPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={staffingDashboardConfig}
      data={mockStaffingDashboardData}
    />
  )
}
