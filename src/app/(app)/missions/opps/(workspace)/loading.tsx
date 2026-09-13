import { MobileWorkspaceSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { UrlAwareContentSkeleton } from "@/components/layout/loading/UrlAwareContentSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Zone de contenu seule : le rail et le header sont déjà rendus par `./layout.tsx`.
export default async function OpportunitiesLoading() {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return <MobileWorkspaceSkeleton label="Chargement des opportunités" />
  }

  return (
    <UrlAwareContentSkeleton
      param="section"
      variants={{ besoins: "tri-panel", "avant-vente": "tri-panel" }}
      label="Chargement des opportunités"
    />
  )
}
