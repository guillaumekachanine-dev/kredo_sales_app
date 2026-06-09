import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { MissionsTabbedShell } from "@/components/missions/MissionsTabbedShell"

export default async function TabbedMissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const device = await getDashboardDevice()

  return (
    <MissionsTabbedShell isMobile={device === "mobile"}>
      {children}
    </MissionsTabbedShell>
  )
}
