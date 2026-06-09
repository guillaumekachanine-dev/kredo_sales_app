import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { proposalDashboardConfig } from "@/lib/dashboard/configs/proposal-dashboard.config"
import { mockProposalDashboardData } from "@/lib/dashboard/mock-dashboard-data"

export default async function ProposalsPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={proposalDashboardConfig}
      data={mockProposalDashboardData}
    />
  )
}
