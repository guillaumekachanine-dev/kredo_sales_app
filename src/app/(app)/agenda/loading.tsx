import { AgendaDesktopSkeleton } from "@/components/agenda/AgendaDesktopSkeleton"
import { AgendaMobileSkeleton } from "@/components/agenda/AgendaMobileSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Un seul squelette par route, choisi par device (audit d'ouverture des pages, O-3).
// Auparavant : ce fichier (forme mobile) s'affichait sur les deux devices, puis
// `AgendaSection` enchaînait un second squelette (Desktop, servi aussi au mobile).
export default async function AgendaLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? <AgendaMobileSkeleton /> : <AgendaDesktopSkeleton />
}
