import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { StaffingTabbedShell } from "@/components/staffing/StaffingTabbedShell"

export default async function StaffingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const device = await getDashboardDevice()

  return (
    <StaffingTabbedShell isMobile={device === "mobile"}>
      {children}
    </StaffingTabbedShell>
  )
}
