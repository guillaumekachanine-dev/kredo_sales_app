import { DashboardDevice, SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"
import { SectionDesktopDashboard } from "./SectionDesktopDashboard"
import { SectionMobileDashboard } from "./SectionMobileDashboard"

type SectionDashboardTemplateProps = {
  config: SectionDashboardConfig
  data: SectionDashboardData
  device: DashboardDevice
}

export function SectionDashboardTemplate({ config, data, device }: SectionDashboardTemplateProps) {
  if (device === "mobile") {
    return <SectionMobileDashboard config={config} data={data} />
  }

  return <SectionDesktopDashboard config={config} data={data} />
}
