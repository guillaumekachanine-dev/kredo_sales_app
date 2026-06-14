import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getCockpitDashboardData } from "@/lib/cockpit/cockpit-data"
import { CockpitDesktopDashboard } from "./CockpitDesktopDashboard"
import { CockpitMobileDashboard } from "./CockpitMobileDashboard"

// Server Component: sniffs device and loads dataset in parallel (ADR-0006)
export async function SyntheseCockpitSection() {
  const [device, data] = await Promise.all([
    getDashboardDevice(),
    getCockpitDashboardData(),
  ])

  return device === "desktop" ? (
    <CockpitDesktopDashboard data={data} />
  ) : (
    <CockpitMobileDashboard data={data} />
  )
}
