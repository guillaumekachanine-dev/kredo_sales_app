import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getProposalsDashboardData } from "@/lib/proposals/proposals-data"
import { ProposalDesktopDashboard } from "./ProposalDesktopDashboard"
import { ProposalMobileDashboard } from "./ProposalMobileDashboard"

// Server Component: sniffs device and loads dataset in parallel (ADR-0006)
export async function SyntheseProposalSection() {
  const [device, data] = await Promise.all([
    getDashboardDevice(),
    getProposalsDashboardData(),
  ])

  return device === "desktop" ? (
    <ProposalDesktopDashboard data={data} />
  ) : (
    <ProposalMobileDashboard data={data} />
  )
}
