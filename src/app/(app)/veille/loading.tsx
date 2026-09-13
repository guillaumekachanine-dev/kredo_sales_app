import { MobileWorkspaceSkeleton, WorkspaceDesktopSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Anatomie de `VeilleActualitesDesktop` : rail « Veille & actualités » (4 chapitres
// + 4 modules), header, digest en lecture. Le thème vient de `./layout.tsx`.
export default async function VeilleLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? (
    <MobileWorkspaceSkeleton label="Chargement de la veille…" />
  ) : (
    <WorkspaceDesktopSkeleton
      title="Veille & actualités"
      chapters={4}
      modules={4}
      body="reading"
      label="Chargement de la veille…"
    />
  )
}
