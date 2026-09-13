import { CockpitDesktopSkeleton } from "@/components/cockpit/CockpitDesktopSkeleton"
import { MobileWorkspaceSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export default async function CockpitLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? <MobileWorkspaceSkeleton label="Chargement du cockpit" /> : <CockpitDesktopSkeleton />
}
