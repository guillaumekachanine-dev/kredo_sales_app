import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getProspectionSummaryData } from "@/lib/prospection/prospection-summary-data"
import { getSyntheseData } from "@/lib/prospection/synthese-data"
import { SyntheseDesktopView } from "./SyntheseDesktopView"
import { SyntheseMobileView } from "./SyntheseMobileView"

export async function SyntheseSection() {
  const device = await getDashboardDevice()

  if (device === "desktop") {
    const data = await getProspectionSummaryData()
    return <SyntheseDesktopView data={data} />
  }

  const data = await getSyntheseData()
  return <SyntheseMobileView data={data} />
}
