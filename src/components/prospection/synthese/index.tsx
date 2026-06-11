import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getSyntheseData } from "@/lib/prospection/synthese-data"
import { SyntheseDesktopView } from "./SyntheseDesktopView"
import { SyntheseMobileView } from "./SyntheseMobileView"

// Server Component : détecte l'appareil côté serveur et distribue la vue adaptée
// (ADR-0006). Device + agrégats portefeuille récupérés en parallèle.
export async function SyntheseSection() {
  const [device, data] = await Promise.all([getDashboardDevice(), getSyntheseData()])

  return device === "desktop" ? <SyntheseDesktopView data={data} /> : <SyntheseMobileView data={data} />
}
