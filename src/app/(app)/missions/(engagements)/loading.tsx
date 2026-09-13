import { MobileWorkspaceSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { UrlAwareContentSkeleton } from "@/components/layout/loading/UrlAwareContentSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Zone de contenu seule : le rail et le header sont déjà rendus par `./layout.tsx`.
export default async function EngagementsLoading() {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return <MobileWorkspaceSkeleton label="Chargement des engagements" />
  }

  return (
    <UrlAwareContentSkeleton
      param="vue"
      variants={{ "missions-at": "tri-panel", projets: "tri-panel" }}
      label="Chargement des engagements"
    />
  )
}
