import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getProspectionSummaryData } from "@/lib/prospection/prospection-summary-data"
import { SyntheseDesktopView } from "./SyntheseDesktopView"
import { SyntheseMobileView } from "./SyntheseMobileView"

export async function SyntheseSection({ lens }: { lens?: string }) {
  const device = await getDashboardDevice()
  const data = await getProspectionSummaryData()

  if (device === "desktop") {
    return <SyntheseDesktopView data={data} />
  }

  return <SyntheseMobileView data={data} lens={lens} />
}
