import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getCockpitDashboardData } from "@/lib/cockpit/cockpit-data"
import { getStaffingDashboardData } from "@/lib/staffing/staffing-data"
import { getSyntheseData } from "@/lib/prospection/synthese-data"
import { CockpitDesktopDashboard } from "./CockpitDesktopDashboard"
import { CockpitMobileDashboard } from "./CockpitMobileDashboard"

// Server Component: sniffs device and loads dataset in parallel (ADR-0006)
export async function SyntheseCockpitSection() {
  const [device, data] = await Promise.all([
    getDashboardDevice(),
    getCockpitDashboardData(),
  ])

  if (device === "desktop") {
    return <CockpitDesktopDashboard data={data} />
  }

  // Mobile layout loads extra contextual data
  const [staffingData, syntheseData] = await Promise.all([
    getStaffingDashboardData(),
    getSyntheseData(),
  ])

  return (
    <CockpitMobileDashboard
      data={data}
      staffingData={staffingData}
      syntheseData={syntheseData}
    />
  )
}
