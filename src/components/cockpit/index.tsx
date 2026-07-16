import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getCockpitDesktopSnapshot } from "@/lib/cockpit/cockpit-desktop-data"
import { getCockpitMobileSnapshot } from "@/lib/cockpit/mobile/get-cockpit-mobile-snapshot"
import { CockpitDesktopDashboard } from "./CockpitDesktopDashboard"
import { CockpitMobileDashboard } from "./CockpitMobileDashboard"
import { getWorkspaceDiagnostic } from "@/lib/intelligence/diagnostic/get-workspace-diagnostic"

// Server Component: selects the device branch before loading branch-specific data (ADR-0006).
export async function SyntheseCockpitSection() {
  const device = await getDashboardDevice()

  if (device === "desktop") {
    const [data, diagnostic] = await Promise.all([
      getCockpitDesktopSnapshot(),
      getWorkspaceDiagnostic(),
    ])
    return <CockpitDesktopDashboard data={data} diagnostic={diagnostic} />
  }

  const snapshot = await getCockpitMobileSnapshot()
  return <CockpitMobileDashboard snapshot={snapshot} />
}
