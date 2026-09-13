import { MobileWorkspaceSkeleton, WorkspaceDesktopSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Anatomie de `ReportsDesktopView` : rail « Rapports & rédaction » (3 chapitres +
// 2 modules), header de chapitre, bibliothèque en trois panneaux. Le thème vient
// de `./layout.tsx`.
export default async function ReportsLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? (
    <MobileWorkspaceSkeleton label="Chargement de la bibliothèque…" />
  ) : (
    <WorkspaceDesktopSkeleton
      title="Rapports & rédaction"
      chapters={3}
      modules={2}
      body="tri-panel"
      label="Chargement de la bibliothèque…"
    />
  )
}
