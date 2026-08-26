import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { AccountIntelligenceHomeFinancials } from "@/lib/intelligence/account-intelligence-home-contract"
import type { FinancialReference } from "@/features/financial-modeling/data/financial-reference-presenter"
import { AccountIntelligenceHomeRuntimeProvider } from "./home/AccountIntelligenceHomeRuntimeContext"
import { ClientIntelligenceDesktopView } from "./ClientIntelligenceDesktopView"
import { ClientIntelligenceMobileView } from "./ClientIntelligenceMobileView"

// Dispatcher device (ADR-0006) — écran dense → adaptive plein (Desktop/Mobile séparés).
export function ClientIntelligenceView({
  data,
  device,
  financialReference = null,
  homeFinancials = null,
  playbookSlug = null,
}: {
  data: ClientIntelligenceData
  device: DashboardDevice
  financialReference?: FinancialReference | null
  homeFinancials?: AccountIntelligenceHomeFinancials | null
  playbookSlug?: string | null
}) {
  if (device === "mobile") {
    return <ClientIntelligenceMobileView data={data} />
  }

  return (
    <AccountIntelligenceHomeRuntimeProvider
      financials={homeFinancials}
      playbookSlug={playbookSlug}
    >
      <ClientIntelligenceDesktopView
        data={data}
        financialReference={financialReference}
      />
    </AccountIntelligenceHomeRuntimeProvider>
  )
}
