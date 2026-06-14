import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getSectorData } from "@/lib/prospection/sector-data"
import { SectorDesktopView } from "./SectorDesktopView"
import { SectorMobileView } from "./SectorMobileView"

// Server Component : détecte l'appareil côté serveur et distribue la vue adaptée
// (ADR-0006). Device + données secteur chargés en parallèle.
export async function SectorSection({ slug }: { slug?: string } = {}) {
  const [device, sector] = await Promise.all([getDashboardDevice(), getSectorData(slug)])

  if (!sector) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3 text-center p-8">
        <p className="text-sm font-semibold text-heading">Aucun secteur configuré</p>
        <p className="text-xs text-muted max-w-xs">
          Ajoutez un secteur dans la base pour afficher l&apos;approche sectorielle.
          Les données sont gérées via n8n (veille) ou importation directe.
        </p>
      </div>
    )
  }

  return device === "desktop"
    ? <SectorDesktopView sector={sector} />
    : <SectorMobileView sector={sector} />
}
