import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getFinanceDashboardData } from "@/lib/finance/finance-data"
import { FinanceDesktopDashboard } from "./FinanceDesktopDashboard"
import { FinanceMobileDashboard } from "./FinanceMobileDashboard"

// Server Component: sniffs device and loads dataset in parallel (ADR-0006)
export async function SyntheseFinanceSection() {
  const [device, data] = await Promise.all([
    getDashboardDevice(),
    getFinanceDashboardData(),
  ])

  return device === "desktop" ? (
    <FinanceDesktopDashboard data={data} />
  ) : (
    <FinanceMobileDashboard data={data} />
  )
}
