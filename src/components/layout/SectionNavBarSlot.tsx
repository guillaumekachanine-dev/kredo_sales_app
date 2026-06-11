import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionTab } from "@/lib/navigation/main-menu.config"
import { SectionNavBar } from "./SectionNavBar"

// ─────────────────────────────────────────────────────────────────────────────
//  SectionNavBarSlot — gate desktop de la barre d'onglets de section (serveur)
//
//  Sur mobile, le routing intra-module passe par le rail contextuel ancré à la
//  bottom nav (MobileNav). La barre desktop ne doit donc PAS être rendue sur
//  mobile — pas « chargée puis cachée en CSS », mais absente de l'arbre, conforme
//  à la règle Adaptive Design (ADR-0006).
//
//  getDashboardDevice() est mémoïsé par requête (cache) : ce second appel après
//  le layout racine est gratuit.
// ─────────────────────────────────────────────────────────────────────────────

export async function SectionNavBarSlot({ tabs }: { tabs: SectionTab[] }) {
  const device = await getDashboardDevice()
  if (device !== "desktop") return null
  return <SectionNavBar tabs={tabs} />
}
