import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { FinancialReference } from "@/features/financial-modeling/data/financial-reference-presenter"
import { ClientIntelligenceDesktopView } from "./ClientIntelligenceDesktopView"
import { ClientIntelligenceMobileView } from "./ClientIntelligenceMobileView"

// Dispatcher device (ADR-0006) — écran dense → adaptive plein (Desktop/Mobile séparés).
export function ClientIntelligenceView({
  data,
  device,
  financialReference = null,
}: {
  data: ClientIntelligenceData
  device: DashboardDevice
  financialReference?: FinancialReference | null
}) {
  if (device === "mobile") {
    return <ClientIntelligenceMobileView data={data} />
  }
  return <ClientIntelligenceDesktopView data={data} financialReference={financialReference} />
}
