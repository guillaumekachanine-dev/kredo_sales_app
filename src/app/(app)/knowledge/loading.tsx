import { MobileWorkspaceSkeleton, WorkspaceDesktopSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Anatomie de `KnowledgeHubDesktop` : rail « Knowledge Hub », header, colonne 5xl.
export default async function KnowledgeLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? (
    <MobileWorkspaceSkeleton label="Chargement du Knowledge Hub…" />
  ) : (
    <WorkspaceDesktopSkeleton title="Knowledge Hub" chapters={4} modules={1} body="reading" />
  )
}
