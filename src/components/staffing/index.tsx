import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getStaffingDashboardData } from "@/lib/staffing/staffing-data"
import { StaffingDesktopDashboard } from "./StaffingDesktopDashboard"
import { StaffingMobileDashboard } from "./StaffingMobileDashboard"

// Server Component: sniffs device and loads dataset in parallel (ADR-0006)
export async function SyntheseStaffingSection() {
  const [device, data] = await Promise.all([
    getDashboardDevice(),
    getStaffingDashboardData(),
  ])

  return device === "desktop" ? (
    <StaffingDesktopDashboard data={data} />
  ) : (
    <StaffingMobileDashboard data={data} />
  )
}
