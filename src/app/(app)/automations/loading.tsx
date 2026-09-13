import { MobileWorkspaceSkeleton, WorkspaceDesktopSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export default async function AutomationsLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? (
    <MobileWorkspaceSkeleton label="Chargement des automatisations" />
  ) : (
    <WorkspaceDesktopSkeleton
      title="Automatisations"
      theme="edito-bright-cockpit"
      chapters={3}
      modules={2}
      body="dashboard"
    />
  )
}
