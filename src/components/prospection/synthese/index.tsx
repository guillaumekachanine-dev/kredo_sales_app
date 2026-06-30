import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getProspectionSummaryData } from "@/lib/prospection/prospection-summary-data"
import { SyntheseDesktopView } from "./SyntheseDesktopView"
import { SyntheseMobileView } from "./SyntheseMobileView"
import type { SyntheseDesignVariant } from "./design-variants"

export async function SyntheseSection({
  lens,
  design,
}: {
  lens?: string
  design?: SyntheseDesignVariant | null
}) {
  const device = await getDashboardDevice()
  const data = await getProspectionSummaryData()

  if (device === "desktop") {
    return <SyntheseDesktopView data={data} design={design ?? null} />
  }

  return <SyntheseMobileView data={data} lens={lens} design={design ?? null} />
}
