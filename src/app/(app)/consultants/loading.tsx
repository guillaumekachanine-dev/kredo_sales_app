import { MobileWorkspaceSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { UrlAwareContentSkeleton } from "@/components/layout/loading/UrlAwareContentSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Zone de contenu seule : le rail et le header sont déjà rendus par `./layout.tsx`.
export default async function ConsultantsLoading() {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return <MobileWorkspaceSkeleton label="Chargement des consultants" />
  }

  return <UrlAwareContentSkeleton param="section" variants={{}} label="Chargement des consultants" />
}
