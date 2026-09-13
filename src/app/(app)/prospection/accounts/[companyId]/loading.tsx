import {
  AccountIntelligenceDesktopSkeleton,
  AccountIntelligenceMobileSkeleton,
} from "@/components/accounts-contacts/intelligence/AccountIntelligenceSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Squelette du cockpit Account Intelligence — source unique partagée avec
// `CrmEntityPanel` (audit d'ouverture des pages, O-3).
export default async function ClientIntelligenceLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? <AccountIntelligenceMobileSkeleton /> : <AccountIntelligenceDesktopSkeleton />
}
