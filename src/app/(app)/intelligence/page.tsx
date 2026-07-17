import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getBusinessIntelligenceSnapshot } from "@/features/business-intelligence/data/get-business-intelligence-snapshot"
import { buildBusinessIntelligenceDesktopModel } from "@/features/business-intelligence/presenters/build-business-intelligence-desktop-model"
import { BusinessIntelligenceDesktop } from "@/features/business-intelligence/desktop/BusinessIntelligenceDesktop"

export const dynamic = "force-dynamic"

export default async function BusinessIntelligencePage() {
  const device = await getDashboardDevice()
  
  if (device === "mobile") {
    // En attendant le Lot Mobile, utiliser sur Mobile uniquement un composant existant extrêmement léger indiquant que la vue est en préparation.
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[var(--color-background)]">
        <h1 className="text-xl font-bold text-[var(--color-text-main)] mb-2">Business Intelligence</h1>
        <p className="text-[var(--color-muted)] text-sm">Cette vue est en cours de préparation pour mobile.</p>
        <p className="text-[var(--color-muted)] text-xs mt-4">Veuillez consulter l'application sur Desktop pour le moment.</p>
      </div>
    )
  }

  // Load snapshot & build presenter model entirely on server
  const snapshot = await getBusinessIntelligenceSnapshot()
  const viewModel = buildBusinessIntelligenceDesktopModel(snapshot)

  return <BusinessIntelligenceDesktop viewModel={viewModel} />
}
