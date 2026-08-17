import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getFinanceDashboardData } from "@/lib/finance/finance-data"
import { getFinanceMobileDashboardData } from "@/lib/finance/finance-mobile-data"
import { FinanceDesktopDashboard } from "./FinanceDesktopDashboard"
import { FinanceMobileDashboard } from "./FinanceMobileDashboard"

// Server Component: le device décide du loader avant toute requête Finance.
export async function SyntheseFinanceSection() {
  const device = await getDashboardDevice()

  if (device === "desktop") {
    const data = await getFinanceDashboardData()
    return <FinanceDesktopDashboard data={data} />
  }

  const data = await getFinanceMobileDashboardData()
  return <FinanceMobileDashboard data={data} />
}
