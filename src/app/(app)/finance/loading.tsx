import { MobileWorkspaceSkeleton, WorkspaceDesktopSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export default async function FinanceLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? (
    <MobileWorkspaceSkeleton label="Chargement de la finance" />
  ) : (
    <WorkspaceDesktopSkeleton title="Finance" chapters={3} modules={2} body="dashboard" />
  )
}
