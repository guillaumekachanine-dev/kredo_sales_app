import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getSuiviData } from "@/lib/prospection/suivi-data"
import { SuiviDesktopView } from "./SuiviDesktopView"
import { SuiviMobileView } from "./SuiviMobileView"

// Server Component : détecte l'appareil côté serveur et distribue la vue adaptée
// (ADR-0006). Pas de chargement-puis-masquage CSS. Device + données en parallèle.
export async function SuiviSection() {
  const [device, data] = await Promise.all([getDashboardDevice(), getSuiviData()])

  return device === "desktop" ? <SuiviDesktopView data={data} /> : <SuiviMobileView data={data} />
}
