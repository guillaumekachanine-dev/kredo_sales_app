import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionNavBar } from "./SectionNavBar"

// ─────────────────────────────────────────────────────────────────────────────
//  SectionNavBarSlot — gate desktop de la barre d'onglets de section (serveur)
//
//  Les onglets sont dérivés du pathname côté client par SectionNavBar
//  (via getSectionTabsForPath). Plus besoin de passer les tabs en prop.
//
//  Sur mobile, le routing intra-module passe par le rail contextuel ancré à la
//  bottom nav (MobileNav). La barre desktop ne doit donc PAS être rendue sur
//  mobile — conforme à la règle Adaptive Design (ADR-0006).
// ─────────────────────────────────────────────────────────────────────────────

export async function SectionNavBarSlot() {
  const device = await getDashboardDevice()
  if (device !== "desktop") return null
  return <SectionNavBar />
}
